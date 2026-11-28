import { NextResponse } from 'next/server';
import { conLecturas, leerHoja, escribirCeldas } from '@/lib/sheets';
import { HOJA_TURNOS, HOJA_TRABAJADORES, cambioDeModalidad, esContratado } from '@/lib/equipo';
import { HOJA_PAGOS } from '@/lib/remuneraciones';
import { leerTrabajadores, leerPagosEquipo, anotar } from '@/lib/datos';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { esPestanaQueNoExiste } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

/**
 * **¿Desde cuándo?** (2026-11-28, lo pidió el cliente: Felipe pasó a
 * contratado *"ya todo el noviembre"* y su turno del 16 seguía sumando la
 * jornada). Pasa los turnos de una persona, desde una fecha, a la modalidad
 * que dice su ficha (`cambioDeModalidad()`).
 *
 * Sin `confirmar`, solo dice qué días cambian y cuánto: no escribe. Un día
 * con un pago de sueldo que lo cubre no se toca. Lo cambia quien fija los
 * sueldos (`sueldos`), y queda en la bitácora con cada día: también los días
 * cerrados, como una corrección.
 */
export const POST = conLecturas([HOJA_TURNOS, HOJA_PAGOS, HOJA_TRABAJADORES], async function POST(req: Request) {
  const no = await exigir(req, 'sueldos');
  if (no) return no;
  try {
    const b = await req.json();
    const nombre = String(b?.trabajador ?? '').trim();
    const desde = String(b?.desde ?? '').slice(0, 10);
    if (!nombre || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      return NextResponse.json({ error: 'Falta la persona o la fecha.' }, { status: 400 });
    }
    const ficha = (await leerTrabajadores()).find((t) => normalizar(t.nombre) === normalizar(nombre));
    if (!ficha) return NextResponse.json({ error: 'No está en el equipo.' }, { status: 404 });
    const tabla = await leerHoja(HOJA_TURNOS, Boolean(b?.confirmar)).catch((e) => {
      if (esPestanaQueNoExiste(e)) return [] as string[][];
      throw e;
    });
    const pagos = await leerPagosEquipo();
    // La modalidad viene en el cuerpo: la ficha puede no haberse guardado todavía
    // (se guarda sola, con un respiro). Sin ella, la de la ficha.
    const modalidad = b?.modalidad === undefined ? ficha.modalidad
      : (esContratado(b.modalidad) ? 'Contratado' : 'Por turno');
    const { dias, celdas } = cambioDeModalidad(tabla, ficha.nombre, desde, modalidad, ficha.pagoJornada, pagos);
    if (!b?.confirmar || !celdas.length) {
      return NextResponse.json({ modalidad, dias, cambian: celdas.length > 0 });
    }
    await escribirCeldas(celdas);
    const cambiados = dias.filter((d) => !d.pagado);
    await anotar({ ...(await quienEs(req)),
      accion: 'Cambió la modalidad de turnos',
      detalle: `${ficha.nombre} · ${esContratado(modalidad) ? 'contratado' : 'por turno'} desde ${desde} · `
        + cambiados.map((d) => `${d.fecha}: ${d.antes} → ${d.despues}`).join(', ') });
    return NextResponse.json({ modalidad, dias, cambiados: cambiados.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
