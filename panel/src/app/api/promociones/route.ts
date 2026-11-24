import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { leerMenus, leerPromociones, guardarPromociones, anotar } from '@/lib/datos';
import { HOJA_MENUS } from '@/lib/menus';
import {
  HOJA_PROMOCIONES, limpiarPromocion, nuevoIdPromocion, nombreEnElSitio, promocionesParaElSitio,
  type Promocion
} from '@/lib/promociones';

export const dynamic = 'force-dynamic';

/**
 * **Las promociones del sitio** (2026-11-23), en *Productos → 🎁
 * Promociones*. Las ve y las cambia quien ve y cambia el catálogo
 * (`configurar`): una promoción es una receta de sus productos.
 *
 * Además de la lista, cuáles **salen en el sitio** (`enElSitio`): una
 * conectada con un producto sin precio no sale, y la pantalla lo dice.
 */
export const GET = conLecturas([HOJA_PROMOCIONES, HOJA_MENUS], async function GET(req: Request) {
  const no = await exigirVer(req, 'configurar');
  if (no) return no;
  try {
    const [promociones, menus] = await Promise.all([leerPromociones(), leerMenus()]);
    return NextResponse.json({
      promociones,
      enElSitio: promocionesParaElSitio(promociones, menus).map((p) => p.sitio)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Guarda la lista entera. Se limpia contra el catálogo —un producto que no
 * existe se descarta— y **una clave del sitio solo la tiene una**: la
 * segunda que la pide queda sin conectar y se dice en `avisos`. Una sin
 * nombre no se guarda.
 */
export const PUT = conLecturas([HOJA_PROMOCIONES, HOJA_MENUS], async function PUT(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    const { promociones } = await req.json();
    if (!Array.isArray(promociones)) {
      return NextResponse.json({ error: 'Falta la lista de promociones.' }, { status: 400 });
    }
    const menus = await leerMenus();
    const limpia: Promocion[] = [];
    const avisos: string[] = [];
    const ids = new Set<string>();
    // Los IDs que ya trae la lista: uno nuevo no puede chocar con uno de más abajo.
    const traidos = promociones.map((x: { id?: unknown }) => ({ id: String(x?.id ?? '') }));
    const sitios = new Set<string>();
    for (const x of promociones) {
      const p = limpiarPromocion(x ?? {}, menus);
      if (!p.nombre) continue;
      if (!p.id || ids.has(p.id)) p.id = nuevoIdPromocion([...traidos, ...[...ids].map((id) => ({ id }))]);
      ids.add(p.id);
      if (p.sitio && sitios.has(p.sitio)) {
        avisos.push(`${p.nombre} quedó sin conectar: ${nombreEnElSitio(p.sitio)} ya tiene otra promoción.`);
        p.sitio = '';
      }
      if (p.sitio) sitios.add(p.sitio);
      limpia.push(p);
    }
    await guardarPromociones(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió las promociones',
      detalle: limpia.map((p) => `${p.nombre}${p.sitio ? ` → ${nombreEnElSitio(p.sitio)}` : ''}`
        + (p.activa ? '' : ' (apagada)')).join(' · ') || 'sin promociones' });
    return NextResponse.json({
      promociones: limpia, avisos,
      enElSitio: promocionesParaElSitio(limpia, menus).map((p) => p.sitio)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
