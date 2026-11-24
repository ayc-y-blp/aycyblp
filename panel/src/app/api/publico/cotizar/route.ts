import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import {
  leerMenus, leerPromociones, leerConfig, leerFechas, leerReservas, leerPresupuestos, leerClientes,
  leerUsuarios, crearCliente, guardarPresupuesto, guardarLineas, anotar
} from '@/lib/datos';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_FECHAS, HOJA_RESERVAS, normalizar } from '@/lib/columnas';
import { HOJA_PRESUPUESTOS, nuevoId, folioDe } from '@/lib/presupuestos';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { reglaShowDe, reglaArriendoDe } from '@/lib/cotizar';
import { ocupaLugar } from '@/lib/ocupacion';
import { nuevoToken } from '@/lib/equipo';
import { puede, type Rol } from '@/lib/auth';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import {
  HOJA_PROMOCIONES, cotizarPromocion, limpiarContactoSitio, fichaDelContacto, delSitioHoy, TOPE_SITIO_DIA,
  cotizacionDelSitio, type Eleccion, type ContextoCotizar, type Cotizada
} from '@/lib/promociones';

export const dynamic = 'force-dynamic';

/**
 * **El cotizador de la página de promociones** (2026-11-23).
 *
 * - `GET` cotiza lo que el cliente va eligiendo —personas, día, menú, lo que
 *   suma— con `cotizarPromocion()`, las mismas reglas de un vendedor. **No
 *   escribe nada** y se guarda 5 minutos en la red de Vercel: la misma
 *   pregunta no vuelve a leer la planilla.
 * - `POST` lo manda: crea la ficha del cliente (o usa la que ya tiene ese
 *   teléfono o correo) y la cotización **enviada**, a nombre de la cuenta de
 *   Configuración, con el próximo contacto hoy. Se calcula de nuevo, con la
 *   planilla del momento.
 *
 * **Lo que la protege** —es pública y escribe en la planilla—: un campo
 * trampa que una persona no ve (si llega lleno, se responde como si nada y
 * no se escribe), el teléfono obligatorio y un tope de envíos por cliente al
 * día. **Una versión de prueba del sitio manda `prueba: true`** y acá se
 * calcula todo sin escribir: el sitio de un PR no toca lo real, igual que
 * con la tienda.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type'
};
const SIN_CACHE = { ...CORS, 'Cache-Control': 'no-store' };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const TANDA = [HOJA_PROMOCIONES, HOJA_MENUS, HOJA_CONFIG, HOJA_FECHAS, HOJA_RESERVAS];

/** Lo elegido, desde la dirección o desde el cuerpo. */
function eleccionDe(x: Record<string, unknown>): Eleccion & { promo: string } {
  const suma = Array.isArray(x.suma) ? x.suma.map(String) : String(x.suma ?? '').split('|');
  return {
    promo: String(x.promo ?? '').trim(),
    adultos: Number(x.adultos) || 0, ninos: Number(x.ninos) || 0,
    menu: String(x.menu ?? '').trim().slice(0, 80),
    suma: suma.map((s) => s.trim()).filter(Boolean).slice(0, 20),
    fecha: String(x.fecha ?? '').trim().slice(0, 10)
  };
}

/** Cotiza con la planilla de este momento. */
async function cotizar(e: Eleccion & { promo: string }) {
  const [promos, menus, cfg, fechas, reservas] = await Promise.all([
    leerPromociones(), leerMenus(), leerConfig(), leerFechas(), leerReservas().catch(() => [])
  ]);
  const promo = promos.find((p) => p.sitio === e.promo && p.activa);
  const ctx: ContextoCotizar = {
    catalogo: menus, fechas, diasAbiertos: cfg.diasAbiertos, hoy: hoy(),
    reglaShow: reglaShowDe(cfg), reglaArriendo: reglaArriendoDe(cfg),
    reservasDelDia: (f) => reservas.filter((r) => r.fecha === f && ocupaLugar(r)).length
  };
  return { promo, cfg, r: cotizarPromocion(promo, e, ctx) };
}

/** Lo que vuelve al sitio: las líneas en neto, las cuentas y lo aparte. Nada interno. */
function respuesta(r: Cotizada) {
  return {
    ok: true,
    lineas: r.lineas.filter((l) => !l.loCobra).map((l) => ({
      concepto: l.concepto, cantidad: l.cantidad,
      neto: Math.round(l.cantidad * l.precio * (1 - (l.descuento || 0) / 100) / (l.ivaIncluido === false ? 1 : 1.19)),
      incluido: l.precio === 0
    })),
    cuentas: r.cuentas, otras: r.otras, porPersona: r.porPersona, invitados: r.invitados,
    publico: r.publico, arriendo: r.arriendo, descuento: r.descuento
  };
}

export const GET = conLecturas(TANDA, async function GET(req: Request) {
  try {
    const q = Object.fromEntries(new URL(req.url).searchParams);
    const { r } = await cotizar(eleccionDe(q));
    return NextResponse.json(r.ok ? respuesta(r) : r, {
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (e) {
    console.error('[publico/cotizar GET]', e);
    return NextResponse.json({ ok: false, codigo: 'error' }, { status: 500, headers: SIN_CACHE });
  }
});

export const POST = conLecturas([...TANDA, HOJA_PRESUPUESTOS, HOJA_CLIENTES, HOJA_USUARIOS], async function POST(req: Request) {
  try {
    const cuerpo = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    // El campo trampa: una persona no lo ve, un robot lo llena.
    if (String(cuerpo.web ?? '').trim()) {
      return NextResponse.json({ ok: true, numero: '' }, { headers: SIN_CACHE });
    }
    const contacto = limpiarContactoSitio(cuerpo);
    if ('codigo' in contacto) {
      return NextResponse.json({ ok: false, codigo: contacto.codigo }, { status: 400, headers: SIN_CACHE });
    }
    const eleccion = eleccionDe(cuerpo);
    const { promo, cfg, r } = await cotizar(eleccion);
    if (!r.ok || !promo) {
      return NextResponse.json(r.ok ? { ok: false, codigo: 'promocion' } : r, { status: 400, headers: SIN_CACHE });
    }
    if (cuerpo.prueba === true) {
      return NextResponse.json({ ...respuesta(r), prueba: true, numero: 'PRUEBA' }, { headers: SIN_CACHE });
    }

    const [clientes, presupuestos, cuentas] = await Promise.all([
      leerClientes(), leerPresupuestos(), leerUsuarios().catch(() => [])
    ]);
    // La cuenta de Configuración, si existe, está activa y cotiza. Si no, sin
    // vendedor: la ven la gerencia y el administrador.
    const cuenta = cuentas.find((u) => u.activo && normalizar(u.nombre) === normalizar(cfg.vendedorSitio)
      && puede(u.rol as Rol, 'presupuestos'));
    const vendedor = cuenta?.nombre ?? '';
    const ahora = ahoraEnChile();
    const ya = fichaDelContacto(contacto, clientes);
    if (ya && delSitioHoy(presupuestos, ya.id, hoy()) >= TOPE_SITIO_DIA) {
      return NextResponse.json({ ok: false, codigo: 'tope' }, { status: 429, headers: SIN_CACHE });
    }
    const idCliente = ya?.id ?? await crearCliente({
      nombre: contacto.nombre, empresa: contacto.empresa, rut: '', domicilio: '', giro: '',
      telefono: contacto.telefono, correo: contacto.correo,
      notas: 'Llegó por el cotizador del sitio.', creadoPor: vendedor, creado: ahora
    });
    const id = nuevoId();
    const p = cotizacionDelSitio({
      id, token: nuevoToken(), idCliente, promo, cotizada: r, fecha: eleccion.fecha, empresa: contacto.empresa,
      vendedor, hoy: hoy(), ahora, vigenciaDias: cfg.vigenciaPresupuesto
    });
    // Las líneas antes que la cotización: si se corta entremedio, quedan
    // líneas que nadie ve, en vez de una cotización sin productos.
    await guardarLineas(id, r.lineas.map((l) => ({ ...l, presupuesto: id })));
    await guardarPresupuesto(p);
    await anotar({ usuario: 'Sitio', rol: '', accion: 'Llegó una cotización del sitio',
      detalle: `${folioDe(p)} · ${promo.nombre} · ${eleccion.fecha} · ${r.invitados} personas · para ${vendedor || 'sin vendedor'}` });
    return NextResponse.json({
      ...respuesta(r), numero: folioDe(p),
      link: `${new URL(req.url).origin}/presupuesto/${p.token}`
    }, { headers: SIN_CACHE });
  } catch (e) {
    console.error('[publico/cotizar POST]', e);
    return NextResponse.json({ ok: false, codigo: 'error' }, { status: 500, headers: SIN_CACHE });
  }
});
