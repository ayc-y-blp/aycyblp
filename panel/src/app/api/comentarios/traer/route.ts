import { NextResponse } from 'next/server';
import { conLecturas, leerOtraPlanilla } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { conEmpresa, laCasa } from '@/lib/empresa';
import { HOJA_COMENTARIOS, leerComentariosDe, comentariosPorTraer } from '@/lib/comentarios';
import { leerComentarios, agregarComentarios, anotar } from '@/lib/datos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * **Traer los comentarios de *Gran Testeo*** (2026-11-26): los comentarios
 * pasaron de esa planilla (`COMENTARIOS_SHEET_ID`) a la del panel. Esto copia
 * una vez los que allá están y acá no (`comentariosPorTraer()`: por fecha,
 * nombre y texto), así que apretarlo de nuevo no duplica nada.
 *
 * - `GET`: cuántos hay allá y cuántos faltan acá. Sin la variable, lo dice.
 * - `POST`: los copia, con su estado, prioridad y respuesta de allá.
 *
 * **Solo el administrador** (`mantencion`). *Gran Testeo* **solo se lee**.
 * Lecturas de Google: dos (la planilla de allá y la pestaña de acá).
 */
async function plan() {
  const id = process.env.COMENTARIOS_SHEET_ID?.trim();
  if (!id) return { sinVariable: true as const };
  // *Gran Testeo* está compartida con la cuenta de la casa.
  const alla = await conEmpresa(laCasa(), () => leerOtraPlanilla(id, [HOJA_COMENTARIOS]));
  const filas = (alla.hojas.get(HOJA_COMENTARIOS) ?? []).map((f) => f.map((c) => String(c ?? '')));
  const deAlla = leerComentariosDe(filas);
  const faltan = comentariosPorTraer(deAlla, await leerComentarios());
  return { sinVariable: false as const, nombre: alla.nombre, total: deAlla.length, faltan };
}

export const GET = conLecturas([HOJA_COMENTARIOS], async function GET(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  try {
    const p = await plan();
    if (p.sinVariable) return NextResponse.json({ sinVariable: true });
    return NextResponse.json({ nombre: p.nombre, total: p.total, faltan: p.faltan.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas([HOJA_COMENTARIOS], async function POST(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  try {
    const p = await plan();
    if (p.sinVariable) return NextResponse.json({ error: 'No hay de dónde traerlos: falta COMENTARIOS_SHEET_ID.' }, { status: 400 });
    const n = await agregarComentarios(p.faltan.map(({ fila: _f, ...c }) => ({ ...c, id: '' })));
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Trajo los comentarios de Gran Testeo', detalle: `${n} de ${p.total} · desde ${p.nombre}` });
    return NextResponse.json({ ok: true, traidos: n, total: p.total });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
