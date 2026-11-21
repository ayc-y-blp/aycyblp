/**
 * **Importar del CRM viejo** (2026-11-21). Qué entra y cómo calzan las
 * etapas vive en `lib/importar.ts`; acá solo se lee la planilla, se arma el
 * plan y, con la confirmación, se escribe.
 *
 * - `GET` es la **vista previa**: cuántas fichas y cotizaciones entran,
 *   cuáles ya estaban, qué cuenta calzó con cada vendedor, qué filas no
 *   entran y **cómo queda el cupo de cada día que toma una ganada**. **No
 *   devuelve datos de clientes**: solo cuentas, días y números de fila. Una
 *   tanda de lecturas.
 * - `POST` importa. **Vuelve a armar el plan desde la planilla**: lo que
 *   manda el navegador es solo la confirmación, nunca las filas. Escribe
 *   en este orden: fichas, líneas, cotizaciones —las ganadas, como
 *   borrador—, reservas, días, y al final gana las ganadas
 *   (`ganarImportadas()`). Si alguna no se alcanza a ganar, lo dice.
 *
 * Solo el permiso `mantencion` (el administrador).
 */
import { NextResponse } from 'next/server';
import { conLecturas, leerHoja, idPlanilla, esPestanaQueNoExiste, nombreDeLaPlanilla } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import {
  anotar, leerClientes, leerPresupuestos, leerUsuarios, leerMenus, leerFechas, leerReservas, leerConfig,
  agregarImportados, agregarReservas, abrirDiasSiHaceFalta, ganarImportadas
} from '@/lib/datos';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_FECHAS, HOJA_RESERVAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { nuevoToken } from '@/lib/equipo';
import { entornoDe } from '@/lib/produccion';
import {
  HOJA_IMPORTAR_CLIENTES, HOJA_IMPORTAR_COTIZACIONES, HOJA_IMPORTAR_RESERVAS, planDeImportacion, detalleDeLaImportacion
} from '@/lib/importar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PESTANAS = [HOJA_IMPORTAR_CLIENTES, HOJA_IMPORTAR_COTIZACIONES, HOJA_IMPORTAR_RESERVAS, HOJA_CLIENTES, HOJA_PRESUPUESTOS,
  HOJA_USUARIOS, HOJA_MENUS, HOJA_FECHAS, HOJA_RESERVAS, HOJA_CONFIG];

/** Una pestaña de paso: vacía si todavía no se sube. */
async function leerDePaso(hoja: string): Promise<{ filas: string[][]; esta: boolean }> {
  try { return { filas: await leerHoja(hoja), esta: true }; }
  catch (e) { if (esPestanaQueNoExiste(e)) return { filas: [], esta: false }; throw e; }
}

async function armar(quien: string) {
  const [c, q, r, clientes, presupuestos, usuarios, menus, fechas, reservas, cfg] = await Promise.all([
    leerDePaso(HOJA_IMPORTAR_CLIENTES), leerDePaso(HOJA_IMPORTAR_COTIZACIONES), leerDePaso(HOJA_IMPORTAR_RESERVAS),
    leerClientes(), leerPresupuestos(), leerUsuarios(), leerMenus(), leerFechas(), leerReservas(), leerConfig()
  ]);
  const plan = planDeImportacion({
    filasClientes: c.filas, filasCotizaciones: q.filas, filasReservas: r.filas,
    clientes, presupuestos, usuarios, menus, fechas, reservas, cfg,
    quien, hoy: hoy(), cuando: ahoraEnChile(), ahora: Date.now(), nuevoToken
  });
  return { plan, estan: { clientes: c.esta, cotizaciones: q.esta, reservas: r.esta } };
}

export const GET = conLecturas(PESTANAS, async function GET(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  try {
    const { plan, estan } = await armar((await quienEs(req)).usuario);
    return NextResponse.json({
      estan,
      fichas: plan.fichas.length, fichasQueYaEstaban: plan.fichasQueYaEstaban,
      candidatos: plan.candidatos, borradores: plan.borradores, cotizacionesQueYaEstaban: plan.cotizacionesQueYaEstaban,
      // De las ganadas y de las reservas, solo cuántas son y cómo queda cada día: nada de clientes.
      ganadas: plan.ganadas.length, reservas: plan.reservas.length, reservasQueYaEstaban: plan.reservasQueYaEstaban,
      reservasPagadas: plan.reservas.filter((x) => x.pagoAnotado).length,
      dias: plan.dias,
      vendedores: plan.vendedores, problemas: plan.problemas, sinCatalogo: plan.sinCatalogo,
      pestanas: { clientes: HOJA_IMPORTAR_CLIENTES, cotizaciones: HOJA_IMPORTAR_COTIZACIONES, reservas: HOJA_IMPORTAR_RESERVAS },
      nombrePlanilla: await nombreDeLaPlanilla().catch(() => ''),
      entorno: entornoDe(process.env.VERCEL_ENV),
      planilla: `https://docs.google.com/spreadsheets/d/${idPlanilla()}`
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas(PESTANAS, async function POST(req: Request) {
  const no = await exigir(req, 'mantencion');
  if (no) return no;
  const quien = await quienEs(req);
  let cuerpo: { confirmado?: unknown } | null = null;
  try { cuerpo = await req.json(); } catch { /* sin cuerpo: no confirma */ }
  if (cuerpo?.confirmado !== true) {
    return NextResponse.json({ error: 'Para importar hay que marcar que revisaste lo que entra.' }, { status: 400 });
  }
  try {
    const { plan } = await armar(quien.usuario);
    if (!plan.fichas.length && !plan.cotizaciones.length && !plan.reservas.length) {
      return NextResponse.json({ error: 'No hay nada nuevo que importar: todo lo de las pestañas ya está en el panel.' }, { status: 409 });
    }
    await agregarImportados(plan.fichas, plan.cotizaciones, plan.lineas);
    // Todas las reservas de una vez: las del sitio viejo y, al final, las de
    // las ganadas, en su orden. Después los días, y recién ahí el vínculo.
    const ids = await agregarReservas([...plan.reservas, ...plan.ganadas.map((g) => g.reserva)]);
    const idsGanadas = ids.slice(plan.reservas.length);
    const dias = await abrirDiasSiHaceFalta(plan.dias.map((d) => d.fecha));
    // Si esto último se corta, las ganadas quedan como borrador con su
    // reserva ya anotada: se dice, y *Marcar ganada* las termina.
    let ganadas = 0;
    try {
      ganadas = await ganarImportadas(plan.ganadas.map((g, i) => ({
        p: plan.cotizaciones.find((x) => x.id === g.id)!, idReserva: idsGanadas[i], diaAbierto: dias[g.fecha] ?? ''
      })));
    } catch (e) {
      console.error('[importar] ganar las importadas', e);
    }
    const sinGanar = plan.ganadas.length - ganadas;
    await anotar({ ...quien, accion: 'Importó del CRM',
      detalle: detalleDeLaImportacion({ ...plan, ganadas: plan.ganadas.slice(0, ganadas) })
        + (plan.dias.length ? ` · días que tomaron cupo: ${plan.dias.map((d) => `${d.fecha} (${d.personas})`).join(', ')}` : '')
        + (sinGanar ? ` · ${sinGanar} quedaron como borrador, sin ganar` : '')
        + (plan.problemas.length ? ` · ${plan.problemas.length} avisos` : '') });
    return NextResponse.json({
      ok: true, fichas: plan.fichas.length, candidatos: plan.candidatos, borradores: plan.borradores,
      ganadas, sinGanar, reservas: plan.reservas.length, avisos: plan.problemas.length
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
