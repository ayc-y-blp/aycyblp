import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, guardarPresupuesto, anotar } from '@/lib/datos';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { ahoraEnChile } from '@/lib/bitacora';
import { huellaDe, marcaAcuerdos } from '@/lib/acuerdos';

export const dynamic = 'force-dynamic';

/**
 * **✓ Visto: los acuerdos adicionales de una cotización** (2026-11-23,
 * `lib/acuerdos.ts`). Con el permiso `pagar`: quedan revisados a su nombre.
 *
 * Se marca **el texto que se vio** (`huella`): si el vendedor lo cambió
 * mientras tanto, responde 409 para que se vuelva a mirar. Y un cambio
 * posterior lo devuelve a la bandeja solo, porque la huella ya no calza.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const quien = await quienEs(req);
    const p = (await leerPresupuestos()).find((x) => x.id === String(b.id ?? '').trim());
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    if (!String(p.acuerdos ?? '').trim()) {
      return NextResponse.json({ error: 'Esa cotización ya no tiene acuerdos adicionales.' }, { status: 409 });
    }
    if (String(b.huella ?? '') !== huellaDe(p.acuerdos)) {
      return NextResponse.json({ error: 'Los acuerdos cambiaron mientras los mirabas: vuelve a leerlos.' }, { status: 409 });
    }
    const { fila: _f, ...resto } = p;
    await guardarPresupuesto({ ...resto, acuerdosRevisados: marcaAcuerdos(quien.usuario, ahoraEnChile(), p.acuerdos) });
    await anotar({ ...quien, accion: 'Revisó los acuerdos adicionales', detalle: `${folioDe(p)} · ${p.fecha || p.periodo}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
