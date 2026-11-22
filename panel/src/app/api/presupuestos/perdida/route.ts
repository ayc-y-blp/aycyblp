import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, guardarPresupuesto, anotar } from '@/lib/datos';
import { seCayo } from '@/lib/cotizar';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { hoy } from '@/lib/fechas';

/**
 * **Se cayó** (2026-11-22): `POST { id, motivo }` deja la cotización
 * —y las alternativas de su grupo que siguen en carrera— como *Perdida*,
 * con su motivo. Es el botón *Se cayó…* de la ventana de cotizar, en
 * cualquier paso, y de cada fila de la lista.
 *
 * - **Lo puede quien puede tocar esa cotización** (`puedeTocarPresupuesto`):
 *   el vendedor la suya; la gerencia y el administrador, cualquiera.
 * - **Una ganada no**: esa se cancela con *Cancelar evento*, que libera el
 *   cupo y calcula la devolución (`seCayo()` lo rechaza).
 * - **Lecturas de Google**: una tanda (`Presupuestos`). Escribe una fila por
 *   alternativa que se cae.
 * - Queda en la bitácora con el N° y el motivo, sin datos del cliente.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const id = String(cuerpo.id ?? '').trim();
    const lista = await leerPresupuestos();
    const previo = lista.find((x) => x.id === id);
    if (!previo) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, previo.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${previo.creadoPor || 'otra persona'}, así que no es tuya para cambiarla.`,
        permiso: true
      }, { status: 403 });
    }
    const r = seCayo(previo, lista, String(cuerpo.motivo ?? ''), hoy());
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 409 });
    for (const c of r.cambios) {
      const fila = lista.find((x) => x.id === c.id);
      if (!fila) continue;
      const { fila: _f, ...o } = fila;
      await guardarPresupuesto({ ...o, estado: c.estado, motivo: c.motivo, ultimoSeguimiento: c.ultimoSeguimiento });
    }
    const motivo = r.cambios[0]?.motivo ?? '';
    await anotar({ ...quien, accion: 'Marcó perdida una cotización',
      detalle: `${folioDe(previo)} · motivo: ${motivo}`
        + (r.cambios.length > 1 ? ` · con ${r.cambios.length - 1} ${r.cambios.length === 2 ? 'alternativa' : 'alternativas'}` : '') });
    return NextResponse.json({ ok: true, cayeron: r.cambios.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
