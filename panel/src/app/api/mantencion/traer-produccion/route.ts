/**
 * **Traer los datos de producción a la versión de prueba** (2026-11-24). Qué
 * se copia, qué se conserva y las guardas viven en `lib/sincronizar.ts`.
 *
 * - `GET` es la **vista previa**: de qué planilla a cuál, y cuántas filas
 *   tiene cada pestaña en las dos. **No devuelve datos**, solo nombres y
 *   números. En producción no lee nada: dice que esto va en una versión de
 *   prueba. Tres lecturas del límite de Google (la lista de pestañas de
 *   producción, sus pestañas juntas y las de la prueba juntas).
 * - `POST` trae. **Vuelve a leer producción**: lo que manda el navegador es
 *   solo la confirmación. Reemplaza las pestañas del panel en la prueba
 *   (`reemplazarPestanas()`) y anota en la bitácora —la que acaba de llegar
 *   de producción— quién lo hizo y desde dónde.
 *
 * Solo el permiso `mantencion` (el administrador). **La planilla de
 * producción solo se lee**: su id va únicamente a `leerOtraPlanilla()`.
 */
import { NextResponse } from 'next/server';
import {
  conLecturas, leerHoja, idPlanilla, esPestanaQueNoExiste, nombreDeLaPlanilla, leerOtraPlanilla, reemplazarPestanas
} from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { anotar } from '@/lib/datos';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { entornoDe } from '@/lib/produccion';
import { empresaActual } from '@/lib/empresa';
import { CASA } from '@/lib/empresas';
import {
  pestanasACopiar, bloqueoDe, pareceProduccion, textoDelBloqueo, filasConAlgo, planDeCopia, enPedidos,
  detalleDeLaCopia, CONSERVA_DE_LA_PRUEBA, type Bloqueo
} from '@/lib/sincronizar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const enlace = (id: string) => `https://docs.google.com/spreadsheets/d/${id}`;

/** Lo que dice cada pestaña de la prueba: sus filas, o `null` si no existe. */
async function leerLaPrueba(hojas: string[]): Promise<Map<string, string[][] | null>> {
  const salida = new Map<string, string[][] | null>();
  await Promise.all(hojas.map(async (h) => {
    try { salida.set(h, await leerHoja(h)); }
    catch (e) { if (!esPestanaQueNoExiste(e)) throw e; salida.set(h, null); }
  }));
  return salida;
}

/** Lo de antes de leer: la empresa, las dos planillas y si se puede. */
function situacion() {
  const empresa = empresaActual();
  const entorno = entornoDe(process.env.VERCEL_ENV);
  const origen = empresa.planillaProduccion.trim();
  const destino = empresa.planilla.trim();
  return {
    empresa, entorno, origen, destino,
    hojas: pestanasACopiar(empresa.id === CASA),
    bloqueo: bloqueoDe({ entorno, origen, destino }) as Bloqueo
  };
}

/** Un error de Google al abrir la planilla de producción, dicho en español. */
function textoDelError(e: unknown): string {
  const x = e as { code?: number; status?: number; message?: string };
  const codigo = Number(x?.code ?? x?.status ?? 0);
  if (codigo === 403 || codigo === 404) {
    return 'No se pudo abrir la planilla de producción: revisa que GOOGLE_SHEET_ID_PRODUCCION sea su id '
      + 'y que la cuenta del panel la pueda ver (es la misma de producción).';
  }
  return String(x?.message ?? e);
}

export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  const s = situacion();
  if (s.bloqueo) {
    return NextResponse.json({ entorno: s.entorno, empresa: s.empresa.nombre, bloqueo: s.bloqueo, texto: textoDelBloqueo(s.bloqueo) });
  }
  try {
    const nombres = s.hojas.map((p) => p.hoja);
    const [prod, prueba, nombreDestino] = await Promise.all([
      leerOtraPlanilla(s.origen, nombres), leerLaPrueba(nombres), nombreDeLaPlanilla().catch(() => '')
    ]);
    if (pareceProduccion(nombreDestino)) {
      return NextResponse.json({
        entorno: s.entorno, empresa: s.empresa.nombre, bloqueo: 'destinoProduccion',
        texto: textoDelBloqueo('destinoProduccion', nombreDestino)
      });
    }
    return NextResponse.json({
      entorno: s.entorno,
      empresa: s.empresa.nombre,
      origen: { nombre: prod.nombre, enlace: enlace(s.origen) },
      destino: { nombre: nombreDestino, enlace: enlace(s.destino) },
      pestanas: s.hojas.map((p) => ({
        hoja: p.hoja, que: p.que,
        produccion: filasConAlgo(prod.hojas.get(p.hoja)),
        prueba: filasConAlgo(prueba.get(p.hoja))
      })),
      conserva: CONSERVA_DE_LA_PRUEBA.map((c) => c.que),
      cuentas: s.hojas.some((p) => p.hoja === HOJA_USUARIOS)
    });
  } catch (e) {
    return NextResponse.json({ error: textoDelError(e) }, { status: 500 });
  }
});

export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  const quien = await quienEs(req);

  let cuerpo: { entiendo?: unknown } = {};
  try { cuerpo = await req.json(); } catch { /* cuerpo vacío: no confirma */ }
  if (cuerpo.entiendo !== true) {
    return NextResponse.json({ error: 'Para traer los datos hay que marcar que se reemplaza lo de la prueba.' }, { status: 400 });
  }

  const s = situacion();
  if (s.bloqueo) return NextResponse.json({ error: textoDelBloqueo(s.bloqueo) }, { status: 409 });

  try {
    const nombres = s.hojas.map((p) => p.hoja);
    const [prod, prueba, nombreDestino] = await Promise.all([
      leerOtraPlanilla(s.origen, nombres), leerLaPrueba(nombres), nombreDeLaPlanilla().catch(() => '')
    ]);
    // La tercera guarda, otra vez justo antes de escribir.
    if (pareceProduccion(nombreDestino) || idPlanilla().trim() === s.origen) {
      return NextResponse.json({ error: textoDelBloqueo('destinoProduccion', nombreDestino) }, { status: 409 });
    }
    const enLaPrueba = new Set(nombres.filter((h) => prueba.get(h)));
    const plan = planDeCopia(nombres, prod.hojas, enLaPrueba, prueba.get(HOJA_CONFIG) ?? null);
    await reemplazarPestanas(plan.copiar, plan.vaciar, (c) => enPedidos(c));

    // La bitácora ya es la de producción: esta línea queda al final.
    await anotar({ ...quien, accion: 'Trajo los datos de producción', detalle: detalleDeLaCopia(prod.nombre, plan) });

    return NextResponse.json({
      ok: true,
      origen: prod.nombre,
      pestanas: plan.copiar.length,
      vaciadas: plan.vaciar,
      filas: plan.copiar.reduce((a, c) => a + (filasConAlgo(c.filas) ?? 0), 0)
    });
  } catch (e) {
    return NextResponse.json({ error: textoDelError(e) }, { status: 500 });
  }
});
