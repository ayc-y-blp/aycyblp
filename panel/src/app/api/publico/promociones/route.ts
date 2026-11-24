import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { leerMenus, leerPromociones } from '@/lib/datos';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_PROMOCIONES, promocionesParaElSitio, bloquesDelSitio } from '@/lib/promociones';

export const dynamic = 'force-dynamic';

/**
 * **Las promociones que dibuja el cotizador del sitio** (2026-11-23): las
 * activas, conectadas a un bloque de `promociones.html` y con el cotizador
 * encendido, con sus menús, lo que incluyen, lo que se puede sumar y sus
 * precios de cotización. **Sin costos ni nada interno**: es lo mismo que el
 * cotizador muestra.
 *
 * **Se guarda 5 minutos en la red de Vercel** (`s-maxage`): la llama cada
 * visita a la página de promociones, y las lecturas de Google son 60 por
 * minuto para todo el panel. Un precio que cambia en *Productos* tarda hasta
 * cinco minutos en verse en el sitio; la cotización que se guarda se calcula
 * de nuevo, sin esa espera.
 *
 * **`bloques` dice cuáles salen en la página** (2026-11-24, `bloquesDelSitio()`):
 * `lista` los marcados con *Mostrar en el sitio*, `link` los que solo se ven
 * con su link. Marcar o desmarcar también tarda hasta cinco minutos.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export const GET = conLecturas([HOJA_PROMOCIONES, HOJA_MENUS], async function GET() {
  try {
    const [promos, menus] = await Promise.all([leerPromociones(), leerMenus()]);
    return NextResponse.json({
      promociones: promocionesParaElSitio(promos, menus), bloques: bloquesDelSitio(promos)
    }, { headers: CORS });
  } catch (e) {
    console.error('[publico/promociones]', e);
    return NextResponse.json({ error: 'No pudimos cargar las promociones.' },
      { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } });
  }
});
