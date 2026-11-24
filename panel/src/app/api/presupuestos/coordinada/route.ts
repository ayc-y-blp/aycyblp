import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, leerLineasPresupuesto, guardarPresupuesto, anotar } from '@/lib/datos';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, lineasDe, otrasEmpresas, marcarCoordinada, folioDe } from '@/lib/presupuestos';
import { normalizar } from '@/lib/columnas';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * **Marca lo coordinado con otra empresa** (2026-11-23): *✓ Ya lo coordiné*
 * con el karting o el taller de queso, para que la vendedora no lo vuelva a
 * ver como pendiente. Lo marca quien puede tocar la cotización; queda a su
 * nombre y en la bitácora. `hecho: false` lo deshace.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_LINEAS], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { id, empresa, hecho } = await req.json();
    const p = (await leerPresupuestos()).find((x) => x.id === String(id ?? ''));
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
      return NextResponse.json({ error: 'Esa cotización no es tuya para cambiarla.', permiso: true }, { status: 403 });
    }
    const de = otrasEmpresas(lineasDe(await leerLineasPresupuesto(), p.id))
      .find((o) => normalizar(o.empresa) === normalizar(String(empresa ?? '')));
    if (!de) return NextResponse.json({ error: 'Esa empresa no está en la cotización.' }, { status: 400 });
    const coordinadas = marcarCoordinada(p.coordinadas, de.empresa, quien.usuario, ahoraEnChile(), hecho !== false);
    const { fila: _f, ...resto } = p;
    await guardarPresupuesto({ ...resto, coordinadas });
    await anotar({ ...quien, accion: hecho !== false ? 'Coordinó con otra empresa' : 'Deshizo lo coordinado con otra empresa',
      detalle: `${folioDe(p)} · ${de.empresa} · ${de.conceptos.join(', ')}` });
    return NextResponse.json({ coordinadas });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
