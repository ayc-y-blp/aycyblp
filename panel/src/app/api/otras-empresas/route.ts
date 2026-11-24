import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { leerMenus, leerOtrasEmpresas, guardarOtrasEmpresas, renombrarEnPlanilla, anotar } from '@/lib/datos';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_OTRAS_EMPRESAS, limpiarOtraEmpresa, sinFicha, type OtraEmpresa } from '@/lib/otrasEmpresas';
import { renombresDeLista, cuentaDeCambios, fraseDeCambios } from '@/lib/renombrar';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * **Las otras empresas** (2026-11-24, `lib/otrasEmpresas.ts`), en *Productos →
 * 🤝 Otras empresas*. Las ve y las cambia quien cambia el catálogo
 * (`configurar`). Además de la lista, los nombres que un producto ya usa y no
 * están en ella (`sinFicha`), para completarlos.
 */
export const GET = conLecturas([HOJA_OTRAS_EMPRESAS, HOJA_MENUS], async function GET(req: Request) {
  const no = await exigirVer(req, 'configurar');
  if (no) return no;
  try {
    const [empresas, menus] = await Promise.all([leerOtrasEmpresas(), leerMenus()]);
    return NextResponse.json({ empresas, sinFicha: sinFicha(menus.map((m) => m.loCobra), empresas) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Guarda la lista entera. Cada fila puede traer `antes`, el nombre con que se
 * cargó: **cambiar el nombre arrastra** los productos y las líneas de las
 * cotizaciones que lo usan (`DONDE.empresa`), en una lectura y una escritura.
 * Una sin nombre no se guarda; dos con el mismo nombre, la segunda no.
 */
export const PUT = conLecturas([HOJA_OTRAS_EMPRESAS, HOJA_MENUS], async function PUT(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    const { empresas } = await req.json();
    if (!Array.isArray(empresas)) {
      return NextResponse.json({ error: 'Falta la lista de empresas.' }, { status: 400 });
    }
    const limpia: OtraEmpresa[] = [];
    const vistas = new Set<string>();
    for (const x of empresas) {
      const e = limpiarOtraEmpresa(x ?? {});
      if (!e.nombre || vistas.has(normalizar(e.nombre))) continue;
      vistas.add(normalizar(e.nombre));
      limpia.push(e);
    }
    const renombres = renombresDeLista(empresas as { nombre?: unknown; antes?: unknown }[]);
    await guardarOtrasEmpresas(limpia);
    const { celdas } = await renombrarEnPlanilla('empresa', renombres);
    const frase = fraseDeCambios(cuentaDeCambios(celdas));
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Cambió las otras empresas',
      detalle: limpia.map((e) => e.nombre + (e.activa ? '' : ' (apagada)')).join(' · ') || 'sin empresas' });
    for (const r of renombres) {
      await anotar({ ...quien, accion: 'Renombró otra empresa',
        detalle: `${r.de} → ${r.a}${frase ? ` · pasaron ${frase}` : ''}` });
    }
    // Los productos se leyeron antes de renombrar: se les aplica el nombre nuevo acá.
    const nuevo = (n: string) => renombres.find((r) => normalizar(r.de) === normalizar(n))?.a ?? n;
    const menus = await leerMenus();
    return NextResponse.json({ empresas: limpia, frase, sinFicha: sinFicha(menus.map((m) => nuevo(m.loCobra)), limpia) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
