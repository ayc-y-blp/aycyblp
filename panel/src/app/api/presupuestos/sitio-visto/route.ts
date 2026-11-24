import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, guardarPresupuesto } from '@/lib/datos';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { esDelSitio, marcaVisto } from '@/lib/promociones';
import { normalizar } from '@/lib/columnas';
import { puede, type Rol } from '@/lib/auth';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * **Marca vistas las cotizaciones del sitio** (2026-11-23): lo que hace
 * *✓ Entendido* en la ventana que avisa al entrar. Solo las de esta cuenta,
 * o las sin vendedor para quien puede asignarlas; una ya vista no se toca.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { ids } = await req.json();
    const pedidos = new Set((Array.isArray(ids) ? ids : []).map(String));
    const quien = await quienEs(req);
    const asigna = puede(quien.rol as Rol, 'asignarVendedor');
    const ahora = ahoraEnChile();
    let marcadas = 0;
    for (const p of await leerPresupuestos()) {
      if (!pedidos.has(p.id) || !esDelSitio(p) || String(p.avisoVisto ?? '').trim()) continue;
      const suya = p.creadoPor ? normalizar(p.creadoPor) === normalizar(quien.usuario) : asigna;
      if (!suya) continue;
      const { fila: _f, ...resto } = p;
      await guardarPresupuesto({ ...resto, avisoVisto: marcaVisto(quien.usuario, ahora) });
      marcadas++;
    }
    return NextResponse.json({ marcadas });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
