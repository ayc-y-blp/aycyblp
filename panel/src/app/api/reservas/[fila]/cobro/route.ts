import { NextResponse } from 'next/server';
import { reservaDeLaFila } from '@/lib/filas';
import { conLecturas } from '@/lib/sheets';
import { HOJA_FECHAS, HOJA_RESERVAS, ESTADO_PAGO } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, folioDe } from '@/lib/presupuestos';
import { HOJA_COBROS } from '@/lib/cobros';
import { HOJA_CIERRES, estaCerrado, yaAbrio } from '@/lib/cierres';
import { HOJA_CAJA, TIPO_CAJA } from '@/lib/caja';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { puede, type Rol } from '@/lib/auth';
import {
  leerReservas, leerFechas, leerConfig, leerCierres, reservasDeCotizaciones, editarReserva, anotar,
  anotarCobro, borrarCobro, leerCobros, actualizarPagoDeReserva, congelarComision,
  agregarMovimientos, borrarMovimientos, leerCaja
} from '@/lib/datos';
import { nuevoIdCobro, CONCEPTO_COBRO, problemaConArchivo } from '@/lib/cobros';
import {
  limpiarCobro, faltaPorCobrar, escribirCobroLocal, efectivoDe, llevaTransferencia, marcaCobro,
  partesMarcaCobro, leerCobroLocal, NOTA_COBRO_MESA, MEDIO_LOCAL, type PagoLocal
} from '@/lib/cobroLocal';
import { marcaPlata, firmaPago, partesMarca } from '@/lib/plata';
import { subirComprobante, leerComprobante, errorDeDrive } from '@/lib/drive';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy } from '@/lib/fechas';
import type { Reserva } from '@/lib/tipos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * **El cobro en el local, al cerrar la mesa** (2026-11-23, `lib/cobroLocal.ts`).
 *
 * - `POST`: *✓ Pagó todo*. Llega como formulario: `cobro` (la lista de medios
 *   y montos, en JSON) y, si hubo transferencia, `archivo` (la foto del
 *   comprobante). La lista tiene que sumar justo lo que falta.
 * - `DELETE`: deshacer un cobro anotado por error, mientras pagos no lo haya
 *   revisado (después, solo pagos).
 * - `GET`: ver el comprobante de la transferencia, a través del panel.
 *
 * Con el permiso `caja`, desde la hora de apertura del día. **El efectivo
 * entra a la caja chica** en el mismo acto.
 */

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
const sinIconos = (lista: PagoLocal[]) => lista.map((p) => `${p.medio} ${pesos(p.monto)}`).join(' · ');

/** La reserva, si esta cuenta la puede cobrar ahora. */
async function laMesa(req: Request, fila: number):
  Promise<{ error: NextResponse } | { r: Reserva; deCotizacion: string | undefined; quien: Awaited<ReturnType<typeof quienEs>>; cerrado: boolean }> {
  const quien = await quienEs(req);
  if (!(fila > 1)) return { error: NextResponse.json({ error: 'Fila inválida.' }, { status: 400 }) };
  const [reservas, fechas, cfg, cierres, deCot] = await Promise.all([
    leerReservas(), leerFechas(), leerConfig(), leerCierres(), reservasDeCotizaciones()
  ]);
  // Con el `id` de la dirección (2026-11-25, `reservaDeLaFila()`): si la fila
  // se movió, se cobra la mesa que se estaba mirando.
  const r = reservaDeLaFila(reservas, fila, new URL(req.url).searchParams.get('id'));
  if (!r) return { error: NextResponse.json({ error: 'Esa reserva ya no está: recarga la página.' }, { status: 404 }) };
  const apertura = fechas.find((f) => f.fecha === r.fecha)?.apertura || cfg.horaApertura;
  if (!yaAbrio(r.fecha, apertura, ahoraEnChile())) {
    return { error: NextResponse.json({
      error: `Una mesa se cobra desde la apertura de su día${r.fecha === hoy() ? `, a las ${apertura}` : ''}.`
    }, { status: 400 }) };
  }
  // **Un día cerrado se corrige**: lo puede quien corrige —desde el
  // 2026-11-23, también el encargado de turno—, y queda en la bitácora.
  const cerrado = estaCerrado(cierres, r.fecha);
  if (cerrado && !puede(quien.rol as Rol, 'corregir')) {
    return { error: NextResponse.json({ error: 'Ese día ya se cerró: pídele la corrección a quien corrige el día.', permiso: true },
      { status: 403 }) };
  }
  return { r, deCotizacion: deCot.get(r.id), quien, cerrado };
}

export const GET = conLecturas([HOJA_RESERVAS], async function GET(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigirVer(req, 'caja');
  if (no) return no;
  const r = (await leerReservas()).find((x) => x.fila === Number(params.fila));
  if (!r?.comprobanteCobro) return NextResponse.json({ error: 'Ese cobro no tiene comprobante.' }, { status: 404 });
  try {
    const a = await leerComprobante(r.comprobanteCobro);
    return new NextResponse(new Uint8Array(a.datos), {
      headers: {
        'content-type': a.tipo,
        'content-disposition': `inline; filename="${a.nombre.replace(/"/g, '')}"`,
        'cache-control': 'private, no-store'
      }
    });
  } catch (e) {
    console.error('[cobro:comprobante]', e);
    return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
  }
});

export const POST = conLecturas([HOJA_RESERVAS, HOJA_FECHAS, HOJA_CONFIG, HOJA_CIERRES, HOJA_PRESUPUESTOS, HOJA_LINEAS,
  HOJA_COBROS, HOJA_CAJA], async function POST(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'caja');
  if (no) return no;
  try {
    const form = await req.formData();
    const m = await laMesa(req, Number(params.fila));
    if ('error' in m) return m.error;
    const { r, deCotizacion, quien, cerrado } = m;
    if (String(r.cobroCerrado ?? '').trim()) {
      return NextResponse.json({ error: 'Esa mesa ya está cobrada.' }, { status: 409 });
    }
    const falta = faltaPorCobrar(r);
    let crudo: unknown = [];
    try { crudo = JSON.parse(String(form.get('cobro') ?? '[]')); } catch { /* lo dice limpiarCobro */ }
    const limpio = limpiarCobro(crudo, falta);
    if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
    const lista = limpio.lista;

    // **La transferencia va con su comprobante**: es lo que pagos revisa.
    let comprobante = '';
    if (llevaTransferencia(lista)) {
      const archivo = form.get('archivo');
      if (!(archivo instanceof File)) {
        return NextResponse.json({ error: 'Falta la foto del comprobante de la transferencia.' }, { status: 400 });
      }
      const problema = problemaConArchivo(archivo.type, archivo.size);
      if (problema) return NextResponse.json({ error: problema }, { status: 400 });
      const cfg = await leerConfig();
      if (!cfg.driveComprobantes) {
        return NextResponse.json({ error: 'Falta la carpeta de comprobantes en Configuración.' }, { status: 400 });
      }
      const extension = archivo.type === 'application/pdf' ? 'pdf'
        : (archivo.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
      try {
        comprobante = await subirComprobante({
          unidad: cfg.driveComprobantes,
          carpeta: `Cobros en el local ${r.fecha.slice(0, 7)}`,
          nombre: `${r.fecha} ${r.nombre || 'mesa'} transferencia ${lista.find((p) => p.medio === MEDIO_LOCAL.transferencia)?.monto ?? ''}.${extension}`,
          tipo: archivo.type,
          datos: Buffer.from(await archivo.arrayBuffer())
        });
      } catch (e) {
        console.error('[cobro:subir]', e);
        return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
      }
    }

    const cuando = ahoraEnChile();
    const esPagos = puede(quien.rol as Rol, 'pagar');
    const marca = marcaCobro(cuando, quien.usuario, r);
    const texto = escribirCobroLocal(lista);

    if (deCotizacion) {
      // **De una cotización: el saldo entra como cobros de la cotización**,
      // uno por medio, con el comprobante en la transferencia. De ahí sale el
      // estado de su reserva y la comisión del vendedor.
      for (const p of lista) {
        await anotarCobro({
          id: nuevoIdCobro(), presupuesto: deCotizacion, fecha: r.fecha, concepto: CONCEPTO_COBRO.saldo,
          monto: p.monto, medio: p.medio, nota: NOTA_COBRO_MESA, registradoPor: quien.usuario, cuando,
          comprobante: p.medio === MEDIO_LOCAL.transferencia ? comprobante : '',
          revisadoPor: esPagos ? quien.usuario : '', revisado: esPagos ? cuando : ''
        });
      }
      await editarReserva(r.fila, { cobroLocal: texto, comprobanteCobro: comprobante, cobroCerrado: marca });
      await actualizarPagoDeReserva(deCotizacion);
      await congelarComision(deCotizacion);
    } else {
      // **A mano o de Shopify: queda Pagada en el panel.** A Shopify no se le
      // toca nada; la sincronización respeta el cobro (`estadoConCobroLocal()`).
      const final = { ...r, estadoPago: ESTADO_PAGO.pagado, abonado: null, cobroLocal: texto };
      await editarReserva(r.fila, {
        cobroLocal: texto, comprobanteCobro: comprobante, cobroCerrado: marca,
        estadoPago: ESTADO_PAGO.pagado, abonado: null,
        pagoAnotado: marcaPlata(cuando, quien.usuario),
        ...(esPagos ? { pagoRevisado: marcaPlata(cuando, quien.usuario, firmaPago(final)) } : {})
      });
    }

    // **El efectivo, a la caja chica**, en el mismo acto.
    const efectivo = efectivoDe(lista);
    if (efectivo > 0) {
      await agregarMovimientos([{
        fecha: r.fecha, cuando, tipo: TIPO_CAJA.cobro, monto: efectivo, detalle: `Mesa de ${r.nombre || 'sin nombre'}`,
        quien: quien.usuario, para: '', recibido: '', comprobante: '', reserva: r.id, revisado: ''
      }]);
    }
    await anotar({ ...quien, accion: cerrado ? 'Cobró una mesa en un día cerrado' : 'Cobró una mesa',
      detalle: [r.nombre || `fila ${r.fila}`, r.fecha, deCotizacion ? `cotización N° ${folioDe({ id: deCotizacion })}` : '',
        sinIconos(lista)].filter(Boolean).join(' · ') });
    return NextResponse.json({ ok: true, cobro: texto, efectivo });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const DELETE = conLecturas([HOJA_RESERVAS, HOJA_FECHAS, HOJA_CONFIG, HOJA_CIERRES, HOJA_PRESUPUESTOS, HOJA_LINEAS,
  HOJA_COBROS, HOJA_CAJA], async function DELETE(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'caja');
  if (no) return no;
  try {
    const m = await laMesa(req, Number(params.fila));
    if ('error' in m) return m.error;
    const { r, deCotizacion, quien, cerrado } = m;
    const marca = partesMarcaCobro(r.cobroCerrado);
    if (!marca) return NextResponse.json({ error: 'Esa mesa no tiene un cobro anotado.' }, { status: 404 });
    const esPagos = puede(quien.rol as Rol, 'pagar');
    const deLaMesa = deCotizacion
      ? (await leerCobros()).filter((c) => c.presupuesto === deCotizacion && c.nota === NOTA_COBRO_MESA && c.cuando === marca.cuando)
      : [];
    // **Revisado, solo lo deshace pagos**: lo comprobó alguien más.
    const revisado = deCotizacion ? deLaMesa.some((c) => !!c.revisadoPor)
      : partesMarca(r.pagoRevisado)?.firma === firmaPago(r);
    if (revisado && !esPagos) {
      return NextResponse.json({ error: 'Ese cobro ya lo revisó pagos: para deshacerlo, pídeselo.', permiso: true }, { status: 403 });
    }
    if (deCotizacion) {
      for (const c of deLaMesa) await borrarCobro(c.id);
      await editarReserva(r.fila, { cobroLocal: '', comprobanteCobro: '', cobroCerrado: '' });
      await actualizarPagoDeReserva(deCotizacion);
    } else {
      // Vuelve a como estaba antes de cobrar.
      const antes = marca.estadoAntes || ESTADO_PAGO.pendiente;
      await editarReserva(r.fila, {
        cobroLocal: '', comprobanteCobro: '', cobroCerrado: '',
        estadoPago: antes, abonado: antes === ESTADO_PAGO.abonado ? marca.abonadoAntes : null
      });
    }
    // Y el efectivo sale de la caja.
    const caja = (await leerCaja()).filter((x) => x.tipo === TIPO_CAJA.cobro && x.reserva === r.id && x.cuando === marca.cuando);
    await borrarMovimientos(caja.map((x) => x.id));
    await anotar({ ...quien, accion: cerrado ? 'Deshizo el cobro de una mesa de un día cerrado' : 'Deshizo el cobro de una mesa',
      detalle: [r.nombre || `fila ${r.fila}`, r.fecha, sinIconos(leerCobroLocal(r.cobroLocal))].filter(Boolean).join(' · ') });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
