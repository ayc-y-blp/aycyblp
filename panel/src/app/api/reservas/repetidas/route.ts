/**
 * **Limpiar la fila de más de un pedido repetido** (2026-11-25, lo pidió el
 * cliente con la foto del aviso *"Este pedido está 2 veces en la planilla"*).
 *
 * `POST { id }` borra todas las filas con ese `ID Orden` menos la primera
 * (`filasDeMas()`), que es la que el panel lee, edita y cuenta. **No borra la
 * reserva**: queda una, con todo lo que se le anotó. Por eso lo puede hacer
 * quien edita reservas (`reservas`), y no solo el administrador.
 *
 * Las filas se buscan acá, al momento, y no llegan desde la pantalla: un
 * número de fila viejo no puede borrar otra cosa.
 */
import { NextResponse } from 'next/server';
import { conLecturas, leerHoja, borrarFilas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { anotar } from '@/lib/datos';
import { HOJA_RESERVAS } from '@/lib/columnas';
import { filasDeMas } from '@/lib/filas';

export const dynamic = 'force-dynamic';

export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const id = String(cuerpo.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'Falta el pedido.' }, { status: 400 });
    const filas = await leerHoja(HOJA_RESERVAS, true);
    const deMas = filasDeMas(filas, id);
    if (!deMas.length) return NextResponse.json({ ok: true, borradas: 0 });
    await borrarFilas(HOJA_RESERVAS, deMas);
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Limpió un pedido repetido en la planilla',
      detalle: `pedido ${id} · ${deMas.length} ${deMas.length === 1 ? 'fila de más' : 'filas de más'}` });
    return NextResponse.json({ ok: true, borradas: deMas.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
