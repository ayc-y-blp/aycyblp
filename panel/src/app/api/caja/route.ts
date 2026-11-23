import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import {
  HOJA_CAJA, saldosDeCaja, limpiarMovimiento, llevaFoto, sePuedeBorrar, fraseMovimiento, porRecibirDe,
  type Movimiento
} from '@/lib/caja';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { puede, type Rol } from '@/lib/auth';
import { leerCaja, leerUsuarios, leerConfig, agregarMovimientos, borrarMovimientos, anotar } from '@/lib/datos';
import { problemaConArchivo } from '@/lib/cobros';
import { subirComprobante, errorDeDrive } from '@/lib/drive';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy } from '@/lib/fechas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * **La caja chica** (2026-11-23, `lib/caja.ts`): los movimientos, los saldos y
 * a quién se le puede entregar. Ver con `caja`; anotar un gasto o una entrega
 * con `caja`; un depósito o una compra, con `recibirCaja`. Lo revisa pagos
 * (`/api/caja/revisar`) y lo recibe quien corresponde (`/api/caja/recibir`).
 */

/**
 * Las cuentas que pueden recibir la caja, sin la propia. **Se nombran por su
 * nombre**, que es lo que trae la sesión (`/api/sesion`) y lo que queda en
 * *Quién* y *Para*: así quien recibe se reconoce en su entrega.
 */
async function destinos(yo: string) {
  const cuentas = await leerUsuarios();
  const nombre = (c: { nombre: string; usuario: string }) => c.nombre || c.usuario;
  return {
    nombres: Object.fromEntries(cuentas.flatMap((c) => [[c.usuario, nombre(c)], [nombre(c), nombre(c)]])),
    destinos: cuentas.filter((c) => c.activo && puede(c.rol as Rol, 'recibirCaja') && nombre(c) !== yo && c.usuario !== yo)
      .map((c) => ({ usuario: nombre(c), nombre: nombre(c), rol: c.rol }))
  };
}

export const GET = conLecturas([HOJA_CAJA, HOJA_USUARIOS], async function GET(req: Request) {
  const no = await exigirVer(req, 'caja');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const movs = await leerCaja();
    const { nombres, destinos: lista } = await destinos(quien.usuario);
    return NextResponse.json({
      movimientos: [...movs].sort((a, b) => b.cuando.localeCompare(a.cuando)),
      saldos: saldosDeCaja(movs),
      porRecibir: porRecibirDe(movs, { usuario: quien.usuario }),
      nombres, destinos: lista, yo: quien.usuario, hoy: hoy(),
      puede: {
        anotar: puede(quien.rol as Rol, 'caja'),
        recibir: puede(quien.rol as Rol, 'recibirCaja'),
        revisar: puede(quien.rol as Rol, 'pagar')
      }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas([HOJA_CAJA, HOJA_USUARIOS, HOJA_CONFIG], async function POST(req: Request) {
  const no = await exigir(req, 'caja');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const form = await req.formData();
    const cuerpo = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
    const archivo = form.get('archivo');
    const movs = await leerCaja();
    const { destinos: lista } = await destinos(quien.usuario);
    const limpio = limpiarMovimiento(cuerpo, {
      movs, cuenta: { usuario: quien.usuario }, puedeRecibir: puede(quien.rol as Rol, 'recibirCaja'),
      tieneComprobante: archivo instanceof File && archivo.size > 0,
      destinos: lista.map((d) => d.usuario)
    });
    if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
    const n = limpio.nuevo;

    let comprobante = '';
    if (llevaFoto(n.tipo) && archivo instanceof File) {
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
          unidad: cfg.driveComprobantes, carpeta: `Caja chica ${hoy().slice(0, 7)}`,
          nombre: `${hoy()} ${n.tipo} ${n.monto}${n.detalle ? ` ${n.detalle.slice(0, 40)}` : ''}.${extension}`,
          tipo: archivo.type, datos: Buffer.from(await archivo.arrayBuffer())
        });
      } catch (e) {
        console.error('[caja:subir]', e);
        return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
      }
    }
    const cuando = ahoraEnChile();
    const esPagos = puede(quien.rol as Rol, 'pagar');
    const [m] = await agregarMovimientos([{
      fecha: hoy(), cuando, tipo: n.tipo, monto: n.monto, detalle: n.detalle, quien: quien.usuario,
      para: n.para ?? '', recibido: '', comprobante, reserva: '',
      // Lo que anota pagos queda revisado: lo vio al escribirlo. Una entrega
      // no, porque falta que la reciban.
      revisado: esPagos && n.tipo !== 'Entrega' ? `${cuando} · ${quien.usuario}` : ''
    }]);
    await anotar({ ...quien, accion: 'Anotó en la caja chica', detalle: fraseMovimiento(m) });
    return NextResponse.json({ ok: true, movimiento: m });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/** Borra un movimiento anotado por error. Queda en la bitácora. */
export const DELETE = conLecturas([HOJA_CAJA], async function DELETE(req: Request) {
  const no = await exigir(req, 'caja');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const m = (await leerCaja()).find((x) => x.id === String(cuerpo.id ?? '')) as Movimiento | undefined;
    if (!m) return NextResponse.json({ error: 'Ese movimiento ya no está.' }, { status: 404 });
    const motivo = sePuedeBorrar(m, { usuario: quien.usuario }, puede(quien.rol as Rol, 'pagar'));
    if (motivo) return NextResponse.json({ error: motivo, permiso: true }, { status: 403 });
    await borrarMovimientos([m.id]);
    await anotar({ ...quien, accion: 'Borró un movimiento de la caja chica', detalle: fraseMovimiento(m) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
