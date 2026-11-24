/**
 * **Las promociones del sitio** (2026-11-23, lo pidió el cliente: *"en cada
 * página de promociones debe haber un cotizador… en productos una
 * subcategoría promociones para no rellenar más, para mantenerlo ordenado…
 * y luego conectarlos al cotizador de la cierta promoción en la landing
 * page"*).
 *
 * **Una promoción es una receta de productos del catálogo**, no un producto
 * más: qué menú lleva (uno fijo, o varios para elegir), un menú de niños si
 * aplica, lo que incluye siempre, lo que se puede sumar (el karting), desde
 * cuántas personas y su condición especial (un descuento, y si se cobra el
 * arriendo). El precio sale de los productos: **un solo lugar donde se
 * edita**, y el sitio no puede decir otro.
 *
 * **Se cotiza con las reglas del vendedor** (`cotizarPromocion()`): las
 * líneas pasan por `prepararLineas()` con el show y el arriendo mínimo del
 * día, igual que en la ventana de cotizar. La usan el cálculo que ve el
 * cliente en el sitio y la cotización que se guarda: lo que ve es lo que
 * queda.
 *
 * **En el sitio**, cada promoción se conecta a uno de los bloques de
 * `promociones.html` (`EN_EL_SITIO`). Los textos del bloque —a quién le
 * habla, qué incluye, la foto— siguen en la página, en sus tres idiomas;
 * de acá salen el cotizador y sus precios.
 */
import { normalizar, indices, ESTADO_DIA } from './columnas.ts';
import { TIPO_PRODUCTO, COBRO, IVA_PRECIO, MONEDA, precioParaCotizar, canonizar, type Menu } from './menus.ts';
import {
  prepararLineas, productoDe, esDiaPublico, arriendoDelDia, personasParaMinimos,
  type ReglaShow, type ReglaArriendo
} from './cotizar.ts';
import { cuentasDe, otrasEmpresas, IVA, type LineaEntrante, type LineaPresupuesto, type Cuentas } from './presupuestos.ts';
import { diaSemana, sumarDias } from './fechas.ts';
import type { FechaHabil } from './tipos.ts';

export const HOJA_PROMOCIONES = 'Promociones';

/** Una fila por promoción. Por nombre de columna: las nuevas van al final. */
export const COL_PROMOCIONES = {
  id: 'ID',
  nombre: 'Nombre',
  /** A qué bloque de `promociones.html` se conecta (`EN_EL_SITIO`), o en blanco. */
  sitio: 'En el sitio',
  activa: 'Activa',
  /** Los menús, separados por `|`. Uno solo queda fijo; varios, el cliente elige. */
  menus: 'Menús',
  /** El menú de niños, si la promoción lo lleva. */
  ninos: 'Menú de niños',
  /** Lo que va siempre, separado por `|`. */
  incluye: 'Incluye',
  /** Lo que el cliente puede sumar, separado por `|`. */
  suma: 'Se puede sumar',
  minimo: 'Mínimo de personas',
  /** La condición especial: un descuento sobre el total, en %. */
  descuento: 'Descuento',
  /** Si se cobra el arriendo mínimo (`ARRIENDO_PROMO`). */
  arriendo: 'Arriendo'
} as const;

export const ENCABEZADO_PROMOCIONES: string[] = Object.values(COL_PROMOCIONES);

/**
 * **Los bloques de `promociones.html`**, con la clave que lleva cada uno en
 * `data-promo`. Son fijos porque los textos y las fotos viven en la página:
 * una promoción nueva en el sitio es un bloque nuevo en el HTML, y su clave
 * se agrega acá en el mismo PR.
 */
export const EN_EL_SITIO = [
  { clave: 'fin-de-ano', nombre: 'Fin de año (la del 11%)', corto: 'Fin de año' },
  { clave: 'combate', nombre: 'Combate de Parrillas', corto: 'Combate' },
  { clave: 'gran-premio', nombre: 'Gran Premio de Fin de Año', corto: 'Gran Premio' },
  { clave: 'dia-de-campo', nombre: 'Día de Campo en Familia', corto: 'Día de Campo' },
  { clave: 'ia', nombre: 'IA a las Brasas', corto: 'IA a las Brasas' },
  { clave: 'directorio', nombre: 'Mesa de Directorio', corto: 'Directorio' }
] as const;

export const nombreEnElSitio = (clave: string) =>
  EN_EL_SITIO.find((s) => s.clave === clave)?.nombre ?? '';

/**
 * **El arriendo de la promoción.** *Como siempre* corre la regla de
 * Configuración (un día no abierto al público con poca gente lleva
 * arriendo). Las otras dos son una condición especial, como la de fin de
 * año: *sin costo de arriendo, solo de lunes a viernes*.
 */
export const ARRIENDO_PROMO = {
  siempre: 'Como siempre',
  semana: 'Sin arriendo de lunes a viernes',
  nunca: 'Sin arriendo'
} as const;
export type ArriendoPromo = (typeof ARRIENDO_PROMO)[keyof typeof ARRIENDO_PROMO];

export interface Promocion {
  id: string;
  nombre: string;
  sitio: string;
  activa: boolean;
  menus: string[];
  ninos: string;
  incluye: string[];
  suma: string[];
  minimo: number;
  descuento: number;
  arriendo: ArriendoPromo;
}

export function nuevaPromocion(p: Partial<Promocion> & { id: string }): Promocion {
  // El ID primero, para que se lea —y se compare— igual que una leída de la planilla.
  const { id, ...resto } = p;
  return {
    id, nombre: '', sitio: '', activa: true, menus: [], ninos: '', incluye: [], suma: [],
    minimo: 0, descuento: 0, arriendo: ARRIENDO_PROMO.siempre, ...resto
  };
}

const lista = (v: unknown) => [...new Set(String(v ?? '').split('|').map((x) => x.trim()).filter(Boolean))];
const entero = (v: unknown, max: number) => {
  const n = Math.round(Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0);
  return Math.min(max, Math.max(0, n));
};
const esSi = (v: unknown) => ['si', 'sí', 'x', 'true', '1'].includes(String(v ?? '').trim().toLowerCase());
const arriendoDe = (v: unknown): ArriendoPromo =>
  Object.values(ARRIENDO_PROMO).find((a) => normalizar(a) === normalizar(String(v ?? ''))) ?? ARRIENDO_PROMO.siempre;
const sitioDe = (v: unknown) => {
  const c = String(v ?? '').trim();
  return EN_EL_SITIO.some((s) => s.clave === c) ? c : '';
};

export function leerPromocionesDe(filas: string[][]): Promocion[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_PROMOCIONES);
  if (i.id === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));
  const salida: Promocion[] = [];
  const vistos = new Set<string>();
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n] ?? [];
    const id = en(f, i.id).trim();
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    salida.push({
      id,
      nombre: en(f, i.nombre).trim(),
      sitio: sitioDe(en(f, i.sitio)),
      // En blanco es sí: una fila escrita a mano sin esa columna sigue viva.
      activa: en(f, i.activa).trim() === '' ? true : esSi(en(f, i.activa)),
      menus: lista(en(f, i.menus)),
      ninos: en(f, i.ninos).trim(),
      incluye: lista(en(f, i.incluye)),
      suma: lista(en(f, i.suma)),
      minimo: entero(en(f, i.minimo), 10000),
      descuento: entero(en(f, i.descuento), 100),
      arriendo: arriendoDe(en(f, i.arriendo))
    });
  }
  return salida;
}

export function aFilasPromociones(promos: Promocion[]): string[][] {
  return [ENCABEZADO_PROMOCIONES, ...promos.map((p) => [
    p.id, p.nombre, p.sitio, p.activa ? 'sí' : 'no', p.menus.join(' | '), p.ninos,
    p.incluye.join(' | '), p.suma.join(' | '), p.minimo ? String(p.minimo) : '',
    p.descuento ? String(p.descuento) : '', p.arriendo
  ])];
}

/** El próximo ID libre: `PR-01`, `PR-02`… */
export function nuevoIdPromocion(promos: Pick<Promocion, 'id'>[]): string {
  const n = promos.reduce((m, p) => Math.max(m, Number(/^PR-(\d+)$/.exec(p.id)?.[1] ?? 0)), 0);
  return `PR-${String(n + 1).padStart(2, '0')}`;
}

/** Lo que se ofrece como menú de una promoción: los menús que se cotizan, en pesos. */
export const menusParaPromo = (catalogo: Menu[]) => catalogo.filter((m) =>
  m.activo && m.cotizacion && m.tipo === TIPO_PRODUCTO.menu && m.moneda !== MONEDA.uf);
/** Lo que puede ir incluido o sumarse: los extras y el show que se cotizan, en pesos. */
export const extrasParaPromo = (catalogo: Menu[]) => catalogo.filter((m) =>
  m.activo && m.cotizacion && (m.tipo === TIPO_PRODUCTO.extra || m.tipo === TIPO_PRODUCTO.show)
  && m.moneda !== MONEDA.uf);

/**
 * Lo que llega del navegador, convertido en una promoción válida. Los
 * productos se escriben como están en el catálogo (`canonizar()`) y uno que
 * no existe se descarta; **una clave del sitio solo la puede tener una**: si
 * otra ya la tiene, ésta queda sin conectar y quien llama lo dice.
 */
export function limpiarPromocion(x: Partial<Record<keyof Promocion, unknown>>, catalogo: Menu[]): Promocion {
  const enCatalogo = (nombres: unknown) => (Array.isArray(nombres) ? nombres : lista(nombres))
    .map((n) => productoDe(String(n), catalogo)?.nombre ?? '')
    .filter((n, i, a) => n && a.indexOf(n) === i);
  const ninos = productoDe(String(x?.ninos ?? ''), catalogo);
  return {
    id: String(x?.id ?? '').trim(),
    nombre: String(x?.nombre ?? '').trim().slice(0, 80),
    sitio: sitioDe(x?.sitio),
    activa: typeof x?.activa === 'boolean' ? x.activa : true,
    menus: enCatalogo(x?.menus),
    ninos: ninos ? canonizar(ninos.nombre, catalogo) : '',
    incluye: enCatalogo(x?.incluye),
    suma: enCatalogo(x?.suma),
    minimo: entero(x?.minimo, 10000),
    descuento: entero(x?.descuento, 100),
    arriendo: arriendoDe(x?.arriendo)
  };
}

/* ---------- cotizar ---------- */

/** Lo que eligió el cliente en el sitio. */
export interface Eleccion {
  /** Los adultos, o todos si la promoción no tiene menú de niños. */
  adultos: number;
  ninos: number;
  /** El menú elegido; con uno solo, se ignora. */
  menu: string;
  /** Lo que sumó, de `suma`. */
  suma: string[];
  /** `AAAA-MM-DD`. */
  fecha: string;
}

export interface ContextoCotizar {
  catalogo: Menu[];
  fechas: Pick<FechaHabil, 'fecha' | 'estado'>[];
  diasAbiertos: number[];
  reglaShow: ReglaShow | null;
  reglaArriendo: ReglaArriendo | null;
  /** Cuántas reservas ya ocupan lugar ese día: con otras, el arriendo ya está pagado. */
  reservasDelDia: (fecha: string) => number;
  /** `AAAA-MM-DD` en Chile. Se cotiza desde mañana. */
  hoy: string;
}

/**
 * Por qué no se puede cotizar. **Un código, no una frase**: el sitio lo dice
 * en el idioma de la página. `minimo` trae desde cuántas personas.
 */
export type NoSeCotiza =
  | { ok: false; codigo: 'promocion' | 'menu' | 'fecha' | 'tomado' | 'sinPrecio'; minimo?: number }
  | { ok: false; codigo: 'minimo'; minimo: number };

export interface Cotizada {
  ok: true;
  lineas: Omit<LineaPresupuesto, 'fila'>[];
  invitados: number;
  descuento: number;
  cuentas: Cuentas;
  /** Lo que cobra otra empresa, aparte del total (el karting). */
  otras: ReturnType<typeof otrasEmpresas>;
  /** El total con IVA por persona, redondeado. */
  porPersona: number;
  /** Si ese día abrimos al público: ahí el show va incluido y no hay arriendo. */
  publico: boolean;
  /** El arriendo mínimo que corrió (neto), o 0. */
  arriendo: number;
}

const neto = (m: Menu) => {
  const p = precioParaCotizar(m);
  return m.iva === IVA_PRECIO.mas ? p : p / (1 + IVA);
};

/**
 * **Cotiza una promoción con lo que eligió el cliente**, con las reglas de
 * una cotización hecha por un vendedor —ninguna de las que solo puede pasar
 * por encima la gerencia—:
 *
 * - el menú elegido para los adultos, el de niños para los niños;
 * - lo incluido y lo sumado: por persona para todos, o una vez si es un
 *   monto fijo;
 * - **el show** va incluido en un día público y con su mínimo en uno privado
 *   con poca gente (`prepararLineas()`);
 * - **el arriendo mínimo** de un día no abierto al público, salvo que la
 *   promoción lo perdone (`ARRIENDO_PROMO`);
 * - el descuento de la promoción, sobre el total.
 *
 * No se cotiza antes de mañana, ni un día arrendado en exclusiva a otro,
 * ni bajo el mínimo de personas, ni con un producto sin precio.
 */
export function cotizarPromocion(promo: Promocion | undefined, e: Eleccion, ctx: ContextoCotizar): Cotizada | NoSeCotiza {
  if (!promo || !promo.activa) return { ok: false, codigo: 'promocion' };
  const adultos = entero(e.adultos, 2000);
  const ninos = promo.ninos ? entero(e.ninos, 2000) : 0;
  const invitados = adultos + ninos;
  if (invitados < Math.max(1, promo.minimo)) return { ok: false, codigo: 'minimo', minimo: Math.max(1, promo.minimo) };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha) || e.fecha <= ctx.hoy || e.fecha > sumarDias(ctx.hoy, 730)) {
    return { ok: false, codigo: 'fecha' };
  }
  if (ctx.fechas.some((d) => d.fecha === e.fecha && normalizar(d.estado) === normalizar(ESTADO_DIA.exclusiva))) {
    return { ok: false, codigo: 'tomado' };
  }
  const elegido = promo.menus.length === 1 ? promo.menus[0]
    : promo.menus.find((m) => normalizar(m) === normalizar(e.menu));
  const menu = elegido ? productoDe(elegido, ctx.catalogo) : undefined;
  if (!menu) return { ok: false, codigo: 'menu' };

  const productos: [Menu | undefined, number][] = [[menu, adultos]];
  if (ninos > 0) productos.push([productoDe(promo.ninos, ctx.catalogo), ninos]);
  for (const n of promo.incluye) productos.push([productoDe(n, ctx.catalogo), invitados]);
  const sumados = promo.suma.filter((n) => (e.suma ?? []).some((s) => normalizar(s) === normalizar(n)));
  for (const n of sumados) productos.push([productoDe(n, ctx.catalogo), invitados]);
  if (productos.some(([p]) => !p || p.moneda === MONEDA.uf || !(precioParaCotizar(p) > 0))) {
    return { ok: false, codigo: 'sinPrecio' };
  }
  const entrantes: LineaEntrante[] = productos.map(([p, cantidad]) => ({
    presupuesto: '', concepto: p!.nombre, cantidad: p!.cobro === COBRO.fijo ? 1 : cantidad,
    precio: precioParaCotizar(p), personas: 0, ivaIncluido: p!.iva !== IVA_PRECIO.mas
  }));

  const publico = esDiaPublico(e.fecha, ctx.fechas);
  const sinArriendo = promo.arriendo === ARRIENDO_PROMO.nunca
    || (promo.arriendo === ARRIENDO_PROMO.semana && [1, 2, 3, 4, 5].includes(diaSemana(e.fecha)));
  const arriendo = sinArriendo ? null : arriendoDelDia(ctx.reglaArriendo, e.fecha, ctx.fechas,
    ctx.diasAbiertos, false, ctx.reservasDelDia(e.fecha));
  const lineas = prepararLineas(entrantes, ctx.catalogo, invitados, publico, 0, ctx.reglaShow, arriendo);
  const minimo = arriendo ? arriendo(personasParaMinimos(lineas, invitados)) : null;
  const cuentas = cuentasDe(lineas, promo.descuento);
  return {
    ok: true, lineas, invitados, descuento: promo.descuento, cuentas,
    otras: otrasEmpresas(lineas),
    porPersona: invitados > 0 ? Math.round(cuentas.total / invitados) : 0,
    publico, arriendo: minimo?.minimo ?? 0
  };
}

/* ---------- lo que ve el sitio ---------- */

/** Un producto como lo dibuja el cotizador: su nombre y su precio, como se cobra. */
export interface ProductoSitio {
  nombre: string;
  /** El precio por persona o el monto fijo, neto si `masIva`. */
  precio: number;
  masIva: boolean;
  fijo: boolean;
  /** La empresa que lo cobra, si no somos nosotros. */
  loCobra: string;
}

/** Una promoción conectada, para dibujar su cotizador. Sin costos ni nada interno. */
export interface PromocionSitio {
  sitio: string;
  nombre: string;
  minimo: number;
  descuento: number;
  menus: ProductoSitio[];
  ninos: ProductoSitio | null;
  incluye: string[];
  suma: ProductoSitio[];
  /** Desde cuánto por persona, neto (+ IVA), con el menú más barato y el descuento. */
  desde: number;
}

const paraSitio = (m: Menu): ProductoSitio => ({
  nombre: m.nombre, precio: precioParaCotizar(m), masIva: m.iva === IVA_PRECIO.mas,
  fijo: m.cobro === COBRO.fijo, loCobra: m.loCobra
});

/**
 * Las promociones activas y conectadas, como las ve el sitio. **Una con un
 * producto que falta o sin precio no sale**: su bloque se queda con el botón
 * de WhatsApp, en vez de un cotizador que no puede cotizar.
 */
export function promocionesParaElSitio(promos: Promocion[], catalogo: Menu[]): PromocionSitio[] {
  const salida: PromocionSitio[] = [];
  for (const p of promos) {
    if (!p.activa || !p.sitio) continue;
    const buscar = (n: string) => productoDe(n, catalogo);
    const menus = p.menus.map(buscar);
    const ninos = p.ninos ? buscar(p.ninos) : undefined;
    const incluye = p.incluye.map(buscar);
    const suma = p.suma.map(buscar);
    const todos = [...menus, ...incluye, ...suma, ...(p.ninos ? [ninos] : [])];
    if (!menus.length || todos.some((m) => !m || !m.activo || m.moneda === MONEDA.uf || !(precioParaCotizar(m) > 0))) continue;
    const porPersona = (incluye as Menu[]).filter((m) => m.cobro !== COBRO.fijo).reduce((n, m) => n + neto(m), 0);
    const masBarato = Math.min(...(menus as Menu[]).map(neto));
    salida.push({
      sitio: p.sitio, nombre: p.nombre, minimo: Math.max(1, p.minimo), descuento: p.descuento,
      menus: (menus as Menu[]).map(paraSitio),
      ninos: ninos ? paraSitio(ninos) : null,
      incluye: (incluye as Menu[]).map((m) => m.nombre),
      suma: (suma as Menu[]).map(paraSitio),
      desde: Math.round((masBarato + porPersona) * (1 - p.descuento / 100))
    });
  }
  return salida;
}
