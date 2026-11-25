/**
 * **✕ Se cayó… y No, sí viene** (2026-11-25, `lib/caida.ts`).
 *
 * `POST { fila, id, motivo }` marca la reserva como caída en su propia
 * columna (`Se cayó`), que la tienda no reescribe: deja de ocupar su lugar y
 * no vuelve en la revisión de la mañana. `POST { fila, id, deshacer: true }`
 * la devuelve.
 *
 * - **Quién**: el permiso `reservas`, y un vendedor solo las que anotó
 *   (`puedeTocarReserva()`), como al editarla.
 * - **Una de una cotización** se cae desde su cotización (*Cancelar evento*),
 *   que calcula la devolución: acá responde 409.
 * - **En un día cerrado es corregirlo** (`guardaDelDia()`): pide `corregir`, y
 *   la línea de lo que cambió queda en la bitácora.
 * - **Una de Shopify** borra su evento del calendario, y lo vuelve a poner al
 *   deshacer. El pedido sigue vivo en la tienda: eso lo dice la ventana.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { puedeTocarReserva, type Rol } from '@/lib/auth';
import { editarReserva, anotar, leerReservas, reservasDeCotizaciones, leerConfig } from '@/lib/datos';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { HOJA_RESERVAS, ESTADO_PAGO } from '@/lib/columnas';
import { ocupaLugar } from '@/lib/ocupacion';
import { liberaCupo } from '@/lib/pagos';
import { reservaDeLaFila } from '@/lib/filas';
import { marcaCaida, motivoValido } from '@/lib/caida';
import { empujarDias } from '@/lib/crm-escribir';
import { guardaDelDia } from '@/lib/guardaCierre';
import { ahoraEnChile } from '@/lib/bitacora';
import { eventoDe, idDeEvento } from '@/lib/calendario';
import { guardarEvento, borrarEvento, hayCalendario } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

const deShopify = (id: string) => /^\d+$/.test(String(id ?? '').trim());

export const POST = conLecturas([HOJA_RESERVAS, HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fila = Number(cuerpo.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    const r = reservaDeLaFila(await leerReservas(), fila, cuerpo.id);
    if (!r) return NextResponse.json({ error: 'Esa reserva ya no está en la planilla: recarga la página.' }, { status: 404 });

    const quien = await quienEs(req);
    if (!puedeTocarReserva(quien.rol as Rol, quien.usuario, r.anotadaPor)) {
      return NextResponse.json({
        error: r.anotadaPor
          ? `Esa reserva la anotó ${r.anotadaPor}: pídele a esa persona o al encargado.`
          : 'Esa reserva no la anotaste tú: pídeselo al encargado.',
        permiso: true
      }, { status: 403 });
    }
    const deCotizacion = (await reservasDeCotizaciones()).get(r.id);
    if (deCotizacion) {
      return NextResponse.json({
        error: `Esta reserva viene de la cotización N° ${folioDe({ id: deCotizacion })}: `
          + 'si se cae, cancela el evento desde la cotización, que calcula la devolución.',
        cotizacion: deCotizacion
      }, { status: 409 });
    }

    const deshacer = cuerpo.deshacer === true;
    const motivo = deshacer ? '' : motivoValido(cuerpo.motivo);
    if (!deshacer && !motivo) {
      return NextResponse.json({ error: 'Elige o escribe por qué se cayó: queda en la reserva y en la bitácora.' }, { status: 400 });
    }

    const quienEsElla = r.nombre || 'sin nombre';
    let cambios: { cayo: string; estadoPago?: string };
    if (deshacer) {
      // Lo que la devuelve: su marca, o —en una anotada a mano de antes de
      // esta columna— el estado que la daba por caída. Una que Shopify
      // canceló o devolvió no vuelve desde acá: lo manda la tienda.
      if (!String(r.cayo ?? '').trim()) {
        if (!liberaCupo(r.estadoPago) || deShopify(r.id)) {
          return NextResponse.json({
            error: deShopify(r.id) && liberaCupo(r.estadoPago)
              ? 'Ese pedido se canceló o se devolvió en Shopify: no vuelve desde el panel.'
              : 'Esa reserva no está marcada como caída.'
          }, { status: 409 });
        }
        cambios = { cayo: '', estadoPago: ESTADO_PAGO.pendiente };
      } else {
        cambios = { cayo: '' };
      }
    } else {
      if (!ocupaLugar(r)) {
        return NextResponse.json({ error: 'Esa reserva ya no ocupa lugar: ya está entre las que se cayeron.' }, { status: 409 });
      }
      cambios = { cayo: marcaCaida(ahoraEnChile(), quien.usuario, motivo as string) };
    }

    // En un día cerrado es corregirlo, con la línea de lo que cambia.
    const linea = deshacer ? `Reserva de ${quienEsElla}: vuelve (no se cayó)`
      : `Reserva de ${quienEsElla}: se cayó (${motivo})`;
    const guarda = await guardaDelDia(req, [r.fecha], cuerpo.correccion ?? { motivo: linea });
    if ('error' in guarda) return guarda.error;

    await editarReserva(r.fila, cambios);
    await empujarDias([r.fecha]);

    // El calendario, solo para las de Shopify (las únicas que lo tienen).
    if (deShopify(r.id) && hayCalendario()) {
      try {
        const final = { ...r, ...cambios };
        if (ocupaLugar(final)) {
          const cfg = await leerConfig();
          await guardarEvento(eventoDe(final, cfg.horaApertura, cfg.horaCierre));
        } else {
          await borrarEvento(idDeEvento(r.id));
        }
      } catch (e) {
        console.error('[cayo] calendario', r.id, e);
      }
    }

    await anotar({ ...quien,
      accion: deshacer ? 'Volvió a poner una reserva que se había caído' : 'Dio por caída una reserva',
      detalle: `${quienEsElla} · ${r.fecha} · ${r.personas} personas`
        + (deshacer ? '' : ` · motivo: ${motivo}`)
        + (guarda.motivo ? ' · en un día cerrado' : '') });
    return NextResponse.json({ ok: true, fila: r.fila });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
