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
import { TIPO_PRODUCTO, COBRO, IVA_PRECIO, MONEDA, precioParaCotizar, canonizar, textosDelProducto, type Menu } from './menus.ts';
import {
  prepararLineas, productoDe, esDiaPublico, arriendoDelDia, arriendoDe as arriendoDelCatalogo, showDe, personasParaMinimos, lineaDeProducto,
  type ReglaShow, type ReglaArriendo
} from './cotizar.ts';
import {
  cuentasDe, otrasEmpresas, IVA, ESTADO_PRESUPUESTO, totalDe, lineasDe, folioDe, estadoNormal,
  type LineaEntrante, type LineaPresupuesto, type Cuentas, type Presupuesto
} from './presupuestos.ts';
import { vigenciaHasta } from './condiciones.ts';
import { detalleDe } from './detalle.ts';
import type { Cliente } from './clientes.ts';
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
  arriendo: 'Arriendo',
  /**
   * **Si su bloque muestra el cotizador** (2026-11-23, lo pidió el cliente:
   * *"en la promoción tengo que poder elegir si aparece el cotizador o no"*).
   * En blanco es sí. Con no, el bloque queda como antes: solo WhatsApp.
   */
  cotizador: 'Cotizador',
  /**
   * **Los tramos de la condición, después del primero** (2026-11-24, lo
   * pidió el cliente: *"necesitamos poder agregar otro tramo de condición o
   * otros tramos de condición con un más"*): `50:15 | 80:20` es 15% desde 50
   * personas y 20% desde 80. El primer tramo sigue en `Mínimo de personas` y
   * `Descuento`, así una fila de antes se lee igual.
   */
  tramos: 'Más tramos',
  /**
   * **Si sale en la lista de la página** (2026-11-24, lo pidió el cliente:
   * *"en producción solo se muestran si yo doy un chequeo mostrar en el sitio
   * en la configuración de la promoción. Con la idea que si tengo el link con
   * el hashtag, lo puedo ver igual"*, y eligió el modo estricto). Marcada, su
   * bloque sale en las pastillas y las flechas de `promociones.html`; sin
   * marcar, solo se ve con su link (`linkDeCampana()`). **En blanco es sí**:
   * las promociones de antes de esta columna no desaparecen solas. Una nueva
   * nace sin marcar (`nuevaPromocion()`).
   */
  mostrar: 'Mostrar en el sitio',
  /**
   * **Con cuántos días de anticipación se cotiza** (2026-11-24, lo pidió el
   * cliente: *"para ciertas actividades extras como taller de queso,
   * karting… estos no se pueden gestionar y organizar sin tiempo… cuántos
   * días de anticipación tiene que tener la cotización con esta
   * promoción"*). En blanco o 0, sin plazo: el sitio cotiza desde mañana, como
   * siempre. Vale en el sitio y cuando un vendedor la aplica
   * (`faltaAnticipacion()`).
   */
  anticipacion: 'Días de anticipación'
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

/** La dirección del sitio, como `SITIO` en `tools/traducir.py`. */
export const SITIO_PUBLICO = 'https://brasasdelopirque.cl';

/**
 * **El link de campaña de una promoción** (2026-11-23, lo pidió el cliente:
 * *"un identificador para que cuando se hace una campaña en Instagram… me
 * muestre el gran premio dentro de las promociones"*): la página de
 * promociones con esa ya elegida. En inglés y portugués, su carpeta.
 */
export function linkDeCampana(clave: string, idioma: 'es' | 'en' | 'pt' = 'es'): string {
  return `${SITIO_PUBLICO}/${idioma === 'es' ? '' : idioma + '/'}promociones.html#${clave}`;
}

/**
 * **Cómo sale cada bloque de `promociones.html`** (2026-11-24, el modo
 * estricto que eligió el cliente): `lista`, en las pastillas y las flechas;
 * `link`, solo con su link. **Un bloque que no está, no sale**: no tiene
 * promoción en el panel, o la suya está apagada. Lo lee `cotizador.js` en
 * las direcciones reales; en una versión de prueba se ven los seis, con una
 * marca en los que no salen.
 */
export type ComoSale = 'lista' | 'link';
export function bloquesDelSitio(promos: Pick<Promocion, 'sitio' | 'activa' | 'mostrar'>[]): Record<string, ComoSale> {
  const salida: Record<string, ComoSale> = {};
  for (const p of promos) {
    if (!p.activa || !sitioDe(p.sitio)) continue;
    salida[p.sitio] = p.mostrar ? 'lista' : 'link';
  }
  return salida;
}

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

/** Un tramo de la condición: desde cuántas personas, cuánto descuento. */
export interface Tramo { desde: number; descuento: number }

export interface Promocion {
  id: string;
  nombre: string;
  sitio: string;
  activa: boolean;
  menus: string[];
  /**
   * **Los menús de niños** (desde el 2026-11-24, varios: lo pidió el cliente,
   * *"menú niños y menú pequeños a la vez, como en los otros menús de
   * adultos"*). Una fila de antes, con uno solo, se lee como lista de uno.
   */
  ninos: string[];
  incluye: string[];
  suma: string[];
  minimo: number;
  descuento: number;
  arriendo: ArriendoPromo;
  cotizador: boolean;
  /** Los tramos después del primero (`minimo` y `descuento`), de menos a más gente. */
  tramos: Tramo[];
  /** Si sale en la lista de la página. Ver `COL_PROMOCIONES.mostrar`. */
  mostrar: boolean;
  /** Los días de anticipación que pide; 0 es sin plazo. Ver `COL_PROMOCIONES.anticipacion`. */
  anticipacion: number;
}

export function nuevaPromocion(p: Partial<Promocion> & { id: string }): Promocion {
  // El ID primero, para que se lea —y se compare— igual que una leída de la planilla.
  const { id, ...resto } = p;
  return {
    id, nombre: '', sitio: '', activa: true, menus: [], ninos: [], incluye: [], suma: [],
    minimo: 0, descuento: 0, arriendo: ARRIENDO_PROMO.siempre, cotizador: true, tramos: [],
    // Una nueva no sale en la lista hasta que se marque (el modo estricto).
    mostrar: false, anticipacion: 0, ...resto
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
/**
 * Los tramos, limpios: solo los que parten **sobre el primero** (`minimo`),
 * con un descuento de 0 a 100, de menos a más gente, sin dos desde el mismo
 * número y a lo más cinco. Llegan como `50:15 | 80:20` o como lista.
 */
export function tramosDe(v: unknown, minimo: number): Tramo[] {
  const crudos = Array.isArray(v) ? v
    : String(v ?? '').split('|').map((t) => { const [d, x] = t.split(':'); return { desde: d, descuento: x }; });
  const vistos = new Set<number>();
  return crudos
    .map((t) => ({ desde: entero((t as Tramo)?.desde, 10000), descuento: entero((t as Tramo)?.descuento, 100) }))
    .filter((t) => t.desde > Math.max(0, minimo) && !vistos.has(t.desde) && vistos.add(t.desde))
    .sort((a, b) => a.desde - b.desde)
    .slice(0, 5);
}

/**
 * **El descuento que le toca a un grupo**: el del tramo más alto que alcanza.
 * Con 60 personas y tramos desde 22 (10%) y 50 (15%), el 15%.
 */
export function descuentoPara(p: Pick<Promocion, 'minimo' | 'descuento' | 'tramos'>, personas: number): number {
  let d = p.descuento;
  for (const t of p.tramos ?? []) if (personas >= t.desde) d = t.descuento;
  return d;
}

/**
 * **Un menú de niños** (2026-11-24): *Niños*, *Pequeños*… En la promoción
 * van en su fila, y los de adulto en la suya: con la misma lista en las dos,
 * cada menú aparecía dos veces.
 */
export const esMenuDeNinos = (nombre: string) => /\b(nino|ninos|pequeno|pequenos|infantil|guagua)\b/.test(normalizar(nombre));

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
      ninos: lista(en(f, i.ninos)),
      incluye: lista(en(f, i.incluye)),
      suma: lista(en(f, i.suma)),
      minimo: entero(en(f, i.minimo), 10000),
      descuento: entero(en(f, i.descuento), 100),
      arriendo: arriendoDe(en(f, i.arriendo)),
      cotizador: en(f, i.cotizador).trim() === '' ? true : esSi(en(f, i.cotizador)),
      tramos: tramosDe(en(f, i.tramos), entero(en(f, i.minimo), 10000)),
      // En blanco es sí: una promoción de antes de la columna sigue saliendo.
      mostrar: en(f, i.mostrar).trim() === '' ? true : esSi(en(f, i.mostrar)),
      anticipacion: entero(en(f, i.anticipacion), 365)
    });
  }
  return salida;
}

export function aFilasPromociones(promos: Promocion[]): string[][] {
  return [ENCABEZADO_PROMOCIONES, ...promos.map((p) => [
    p.id, p.nombre, p.sitio, p.activa ? 'sí' : 'no', p.menus.join(' | '), p.ninos.join(' | '),
    p.incluye.join(' | '), p.suma.join(' | '), p.minimo ? String(p.minimo) : '',
    p.descuento ? String(p.descuento) : '', p.arriendo, p.cotizador ? 'sí' : 'no',
    (p.tramos ?? []).map((t) => `${t.desde}:${t.descuento}`).join(' | '),
    p.mostrar ? 'sí' : 'no',
    p.anticipacion ? String(p.anticipacion) : ''
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
/** Los menús de adulto, para la fila *Menú*. */
export const menusAdultoParaPromo = (catalogo: Menu[]) => menusParaPromo(catalogo).filter((m) => !esMenuDeNinos(m.nombre));
/** Los de niños, para la fila *Menú de niños*. */
export const menusNinosParaPromo = (catalogo: Menu[]) => menusParaPromo(catalogo).filter((m) => esMenuDeNinos(m.nombre));
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
  const minimo = entero(x?.minimo, 10000);
  // Lo incluido no se puede además sumar: cada extra va una vez.
  const incluye = enCatalogo(x?.incluye);
  return {
    id: String(x?.id ?? '').trim(),
    nombre: String(x?.nombre ?? '').trim().slice(0, 80),
    sitio: sitioDe(x?.sitio),
    activa: typeof x?.activa === 'boolean' ? x.activa : true,
    menus: enCatalogo(x?.menus),
    ninos: enCatalogo(x?.ninos).map((n) => canonizar(n, catalogo)),
    incluye,
    suma: enCatalogo(x?.suma).filter((n) => !incluye.includes(n)),
    minimo,
    descuento: entero(x?.descuento, 100),
    arriendo: arriendoDe(x?.arriendo),
    cotizador: typeof x?.cotizador === 'boolean' ? x.cotizador : true,
    tramos: tramosDe(x?.tramos, minimo),
    // Sin el dato (una pantalla de antes), sí: guardar no la saca de la lista.
    mostrar: typeof x?.mostrar === 'boolean' ? x.mostrar : true,
    anticipacion: entero(x?.anticipacion, 365)
  };
}

/* ---------- aplicarla en la cotización de un vendedor (2026-11-24) ---------- */

/**
 * **Si la promoción perdona el arriendo ese día**: *Sin arriendo* siempre, y
 * *Sin arriendo de lunes a viernes* en un día de semana. Lo usan el sitio, la
 * ventana de cotizar, el servidor al guardar y al ganar: la misma respuesta en
 * los cuatro.
 */
export function perdonaArriendo(promo: Pick<Promocion, 'arriendo'> | undefined, fecha: string): boolean {
  if (!promo) return false;
  if (promo.arriendo === ARRIENDO_PROMO.nunca) return true;
  return promo.arriendo === ARRIENDO_PROMO.semana && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    && [1, 2, 3, 4, 5].includes(diaSemana(fecha));
}

/**
 * **Los días de anticipación que faltan** (2026-11-24): si el evento es antes
 * de `hoy` + los días que pide la promoción, devuelve esos días; si alcanza,
 * no pide plazo o todavía no hay día exacto, 0. Lo usan el sitio
 * (`cotizarPromocion()`) y el servidor cuando un vendedor la aplica o le
 * cambia el día. **Se mira al aplicarla, no después**: una promoción bien
 * aplicada no deja de valer porque pasen los días.
 */
export function faltaAnticipacion(promo: Pick<Promocion, 'anticipacion'> | undefined, fecha: string, hoy: string): number {
  const dias = Math.max(0, Math.round(promo?.anticipacion ?? 0));
  if (!dias || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 0;
  return fecha < sumarDias(hoy, dias) ? dias : 0;
}

/** Si la promoción rige para ese grupo: desde su mínimo de personas. */
export const rigePromocion = (promo: Pick<Promocion, 'minimo'> | undefined, invitados: number) =>
  !!promo && invitados >= Math.max(1, promo.minimo);

/**
 * **Lo que la promoción le da a una cotización de un vendedor** (2026-11-24):
 * su descuento —el del tramo que alcanza el grupo, que vale aunque pase el
 * tope del vendedor (lo decidió el cliente: *"que valga el descuento de la
 * promoción"*)— y si perdona el arriendo ese día. Bajo su mínimo de personas
 * no da nada: la promoción no rige.
 */
export function beneficioDePromocion(
  promo: Pick<Promocion, 'minimo' | 'descuento' | 'tramos' | 'arriendo'> | undefined, invitados: number, fecha: string
): { descuento: number; sinArriendo: boolean } {
  if (!promo || !rigePromocion(promo, invitados)) return { descuento: 0, sinArriendo: false };
  return { descuento: descuentoPara(promo, invitados), sinArriendo: perdonaArriendo(promo, fecha) };
}

/** La promoción aplicada a una cotización (`Promoción`), si sigue existiendo. */
export const promocionDe = (promos: Promocion[], id: string | undefined) =>
  id ? promos.find((p) => p.id === id) : undefined;

/**
 * **Las líneas de una promoción, para la cotización de un vendedor**: el menú
 * elegido con los invitados que todavía no están en un menú, el de niños en 0
 * —como un segundo menú: se le escribe cuántos y baja al primero—, y lo que
 * incluye siempre. **Lo que ya está en la cotización se queda** y no se
 * repite. Lo que *se suma* no entra: el vendedor lo agrega si el cliente lo
 * quiere. Los precios son los de cotización del catálogo; después se editan
 * como cualquier línea.
 */
export function lineasDeLaPromocion(
  promo: Promocion, menu: string, invitados: number, presupuesto: string, catalogo: Menu[],
  yaEstan: { concepto: string; personas: number }[] = []
) {
  const nuevas: ReturnType<typeof lineaDeProducto>[] = [];
  const clave = (n: string) => normalizar(canonizar(n));
  const esta = (n: string) => [...yaEstan, ...nuevas].some((l) => clave(l.concepto) === clave(n));
  let enMenus = yaEstan.reduce((n, l) => n + (Number(l.personas) || 0), 0);
  const sumar = (nombre: string) => {
    const m = nombre ? productoDe(nombre, catalogo) : undefined;
    if (!m || esta(m.nombre)) return;
    const l = lineaDeProducto(m, presupuesto, invitados, m.moneda === MONEDA.uf ? 0 : Math.round(precioParaCotizar(m)), enMenus);
    enMenus += l.personas;
    nuevas.push(l);
  };
  sumar(promo.menus.length === 1 ? promo.menus[0] : menu);
  for (const n of promo.ninos) sumar(n);
  for (const n of promo.incluye) sumar(n);
  return nuevas;
}

/**
 * **Aplicar la promoción a las líneas de una cotización** (2026-11-24): un
 * menú de adulto que no es el elegido de la promoción **se reemplaza** —su
 * gente pasa a ese menú—, porque una promoción es un paquete con su menú;
 * lo demás (los niños, los extras, el arriendo) se queda. Después se suman
 * los productos de la promoción que faltan (`lineasDeLaPromocion()`).
 */
export function aplicarALineas<L extends { concepto: string; personas: number }>(
  promo: Promocion, menu: string, invitados: number, presupuesto: string, catalogo: Menu[], lineas: L[]
) {
  // El menú elegido de la promoción: los demás de adulto, aunque la promoción
  // también los ofrezca, son otro menú (la promoción lleva uno).
  const elegido = normalizar(canonizar(promo.menus.length === 1 ? promo.menus[0] : menu));
  const sale = (l: L) => {
    const m = productoDe(l.concepto, catalogo);
    return !!m && m.tipo === TIPO_PRODUCTO.menu && !esMenuDeNinos(m.nombre)
      && normalizar(canonizar(m.nombre)) !== elegido;
  };
  const reemplazadas = lineas.filter(sale);
  const quedan = lineas.filter((l) => !sale(l));
  const agregadas = lineasDeLaPromocion(promo, menu, invitados, presupuesto, catalogo, quedan);
  // El menú de la promoción toma el lugar del primero que reemplaza; lo demás va al final.
  const suMenu = reemplazadas.length ? agregadas.find((l) => normalizar(canonizar(l.concepto)) === elegido) : undefined;
  const resto = agregadas.filter((l) => l !== suMenu);
  const enOrden: (L | (typeof agregadas)[number])[] = [];
  for (const l of lineas) {
    if (!sale(l)) enOrden.push(l);
    else if (suMenu && l === reemplazadas[0]) enOrden.push(suMenu);
  }
  return { lineas: [...enOrden, ...resto], agregadas, reemplazadas };
}

/* ---------- cotizar ---------- */

/** Lo que eligió el cliente en el sitio. */
export interface Eleccion {
  /** Los adultos, o todos si la promoción no tiene menú de niños. */
  adultos: number;
  /**
   * Los niños de cada menú de niños, en el orden de la promoción (2026-11-24:
   * *Niños* y *Pequeños* a la vez). Un número solo es el primero, como antes.
   */
  ninos: number | number[];
  /** El menú elegido; con uno solo, se ignora. */
  menu: string;
  /** Lo que sumó, de `suma`. */
  suma: string[];
  /**
   * **Para cuántos va cada uno de `suma`**, en el mismo orden (2026-11-24:
   * *"de los 22 que piden menú, solo 15 quieren andar en go-kart"*). Un 0, o
   * sin el dato —un `cotizador.js` de antes—, es para todo el grupo. Va
   * aparte de `suma` a propósito: un panel de antes lo ignora y cobra para
   * todos, en vez de no reconocer el extra.
   */
  cuantos?: number[];
  /**
   * **Quiere el lugar exclusivo** (2026-11-25, lo pidió el cliente: *"en el
   * cotizador debe haber la posibilidad también de tener el botón quiero el
   * lugar exclusivo… y desde ahí calcule el precio de arriendo del recinto"*).
   * Suma el arriendo del recinto **a su precio estándar**, sin el descuento de
   * la promoción: lo que se negocie después lo hace el vendedor. Un
   * `cotizador.js` de antes no lo manda y cotiza como siempre.
   */
  exclusivo?: boolean;
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
  /** Los días que no se arriendan en exclusiva (Configuración): el sitio tampoco los ofrece. */
  fechasSinExclusivo?: string[];
  /** El arriendo estándar de lunes a viernes de Configuración; 0 o sin dato, el del catálogo. */
  arriendoSemana?: number;
  /** El arriendo estándar de un día público (fin de semana, feriado abierto); 0 o sin dato, el del catálogo. */
  arriendoFinde?: number;
}

/**
 * Por qué no se puede cotizar. **Un código, no una frase**: el sitio lo dice
 * en el idioma de la página. `minimo` trae desde cuántas personas.
 */
export type NoSeCotiza =
  | { ok: false; codigo: 'promocion' | 'menu' | 'fecha' | 'tomado' | 'sinPrecio' | 'sinExclusivo'; minimo?: number }
  | { ok: false; codigo: 'minimo'; minimo: number }
  /** El día está dentro del plazo de anticipación: `dias` es lo que pide. */
  | { ok: false; codigo: 'anticipacion'; dias: number };

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
  /** Si el cliente pidió el lugar exclusivo y se sumó su arriendo (a precio estándar). */
  exclusivo: boolean;
  /** Si lo pidió y la promoción se lo perdona ese día (*sin arriendo de lunes a viernes*). */
  exclusivoGratis: boolean;
  /**
   * Si el descuento de la promoción va **línea por línea** y no sobre el total
   * (2026-11-25): con el lugar exclusivo, el arriendo no lleva descuento, y un
   * descuento sobre el total lo alcanzaría. La cuenta es la misma; lo que
   * cambia es que el arriendo queda a su precio estándar.
   */
  descuentoEnLineas: boolean;
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
 * - **el lugar exclusivo**, si lo pidió (`exclusivo`): el arriendo del recinto
 *   a su precio estándar, sin el descuento de la promoción (que entonces va
 *   línea por línea, dejándolo afuera);
 * - el descuento de la promoción, sobre el total: el del tramo más alto que
 *   alcanza el grupo (`descuentoPara()`).
 *
 * No se cotiza antes de mañana, ni un día arrendado en exclusiva a otro,
 * ni bajo el mínimo de personas, ni con un producto sin precio.
 */
export function cotizarPromocion(promo: Promocion | undefined, e: Eleccion, ctx: ContextoCotizar): Cotizada | NoSeCotiza {
  if (!promo || !promo.activa || !promo.cotizador) return { ok: false, codigo: 'promocion' };
  const adultos = entero(e.adultos, 2000);
  // Uno por cada menú de niños de la promoción; lo que sobra se ignora.
  const porMenuNinos = promo.ninos.map((_, k) => entero((Array.isArray(e.ninos) ? e.ninos : [e.ninos])[k], 2000));
  const invitados = adultos + porMenuNinos.reduce((n, x) => n + x, 0);
  if (invitados < Math.max(1, promo.minimo)) return { ok: false, codigo: 'minimo', minimo: Math.max(1, promo.minimo) };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha) || e.fecha <= ctx.hoy || e.fecha > sumarDias(ctx.hoy, 730)) {
    return { ok: false, codigo: 'fecha' };
  }
  const falta = faltaAnticipacion(promo, e.fecha, ctx.hoy);
  if (falta) return { ok: false, codigo: 'anticipacion', dias: falta };
  if (ctx.fechas.some((d) => d.fecha === e.fecha && normalizar(d.estado) === normalizar(ESTADO_DIA.exclusiva))) {
    return { ok: false, codigo: 'tomado' };
  }
  // El lugar exclusivo no se ofrece los días que Configuración no arrienda así.
  if (e.exclusivo && ctx.fechasSinExclusivo?.includes(e.fecha)) return { ok: false, codigo: 'sinExclusivo' };
  const elegido = promo.menus.length === 1 ? promo.menus[0]
    : promo.menus.find((m) => normalizar(m) === normalizar(e.menu));
  const menu = elegido ? productoDe(elegido, ctx.catalogo) : undefined;
  if (!menu) return { ok: false, codigo: 'menu' };

  const productos: [Menu | undefined, number][] = [[menu, adultos]];
  promo.ninos.forEach((n, k) => { if (porMenuNinos[k] > 0) productos.push([productoDe(n, ctx.catalogo), porMenuNinos[k]]); });
  for (const n of promo.incluye) productos.push([productoDe(n, ctx.catalogo), invitados]);
  // Lo sumado, para cuántos lo pidió el cliente: nunca más que el grupo.
  for (const n of promo.suma) {
    const k = (e.suma ?? []).findIndex((s) => normalizar(s) === normalizar(n));
    if (k === -1) continue;
    const pedidos = entero(e.cuantos?.[k], 2000);
    productos.push([productoDe(n, ctx.catalogo), pedidos > 0 ? Math.min(invitados, pedidos) : invitados]);
  }
  if (productos.some(([p]) => !p || p.moneda === MONEDA.uf || !(precioParaCotizar(p) > 0))) {
    return { ok: false, codigo: 'sinPrecio' };
  }
  const entrantes: LineaEntrante[] = productos.map(([p, cantidad]) => ({
    presupuesto: '', concepto: p!.nombre, cantidad: p!.cobro === COBRO.fijo ? 1 : cantidad,
    precio: precioParaCotizar(p), personas: 0, ivaIncluido: p!.iva !== IVA_PRECIO.mas,
    // Lo que incluye, el del producto (2026-11-24): queda escrito en la cotización.
    ...textosDelProducto(p)
  }));

  const publico = esDiaPublico(e.fecha, ctx.fechas);
  const sinArriendo = perdonaArriendo(promo, e.fecha);
  // **El lugar exclusivo** (2026-11-25): suma el arriendo del recinto a su
  // precio estándar, el del catálogo. Si la promoción perdona el arriendo ese
  // día —la de fin de año, de lunes a viernes—, no se cobra y se dice.
  const quiereExclusivo = e.exclusivo === true;
  const exclusivo = quiereExclusivo && !sinArriendo;
  if (exclusivo) {
    const a = arriendoDelCatalogo(ctx.catalogo);
    if (!a || a.moneda === MONEDA.uf || !(precioParaCotizar(a) > 0)) return { ok: false, codigo: 'sinPrecio' };
    entrantes.push({
      presupuesto: '', concepto: a.nombre, cantidad: 1, personas: 0,
      precio: precioArriendoEstandar(a, e.fecha, { semana: ctx.arriendoSemana, finde: ctx.arriendoFinde }, publico),
      ivaIncluido: a.iva !== IVA_PRECIO.mas, ...textosDelProducto(a)
    });
  }
  // **Con el lugar exclusivo, el día deja de ser público para ese grupo** (2026-11-25: *"revisa esta
  // misma lógica para el show… cobras el nominal"*): el show ya no va incluido, se cobra a su precio
  // del catálogo, igual que el arriendo cobra el suyo. Sin lugar exclusivo, todo como siempre.
  const publicoParaElGrupo = publico && !quiereExclusivo;
  if (quiereExclusivo && publico) {
    const sh = showDe(ctx.catalogo);
    if (sh && sh.moneda !== MONEDA.uf && precioParaCotizar(sh) > 0
        && !entrantes.some((x) => normalizar(x.concepto) === normalizar(sh.nombre))) {
      entrantes.push({
        presupuesto: '', concepto: sh.nombre, cantidad: 1, precio: precioParaCotizar(sh), personas: 0,
        ivaIncluido: sh.iva !== IVA_PRECIO.mas, ...textosDelProducto(sh)
      });
    }
  }
  const arriendo = sinArriendo ? null : arriendoDelDia(ctx.reglaArriendo, e.fecha, ctx.fechas,
    ctx.diasAbiertos, quiereExclusivo, ctx.reservasDelDia(e.fecha));
  const lineas = prepararLineas(entrantes, ctx.catalogo, invitados, publicoParaElGrupo, 0, ctx.reglaShow, arriendo);
  const minimo = arriendo ? arriendo(personasParaMinimos(lineas, invitados)) : null;
  // El descuento del tramo que alcanza el grupo (2026-11-24).
  const descuento = descuentoPara(promo, invitados);
  // **Con el lugar exclusivo, el descuento va línea por línea** y deja afuera
  // el arriendo (2026-11-25: *"el arriendo… usa el valor estándar, no con el
  // descuento aplicado… después se puede negociar el vendedor"*). Tampoco
  // toca el show ni lo que cobra otra empresa: un descuento sobre el total
  // no los habría alcanzado distinto. Sin exclusivo, como siempre.
  const descuentoEnLineas = exclusivo && descuento > 0;
  const lineasFinales = descuentoEnLineas
    ? lineas.map((l) => {
      const t = productoDe(l.concepto, ctx.catalogo)?.tipo;
      return t === TIPO_PRODUCTO.arriendo || t === TIPO_PRODUCTO.show || l.loCobra ? l : { ...l, descuento };
    })
    : lineas;
  const reales = cuentasDe(lineasFinales, descuentoEnLineas ? 0 : descuento);
  // Con el descuento en las líneas, el sitio lo sigue viendo como una fila
  // aparte: el neto de la lista, lo que baja y lo que queda.
  const cuentas: Cuentas = descuentoEnLineas
    ? (() => {
      const lista = cuentasDe(lineas, 0);
      return { subtotal: lista.subtotal, descuento: lista.subtotal - reales.neto, neto: reales.neto, iva: reales.iva, total: reales.total };
    })()
    : reales;
  return {
    ok: true, lineas: lineasFinales, invitados, descuento, cuentas,
    otras: otrasEmpresas(lineasFinales),
    porPersona: invitados > 0 ? Math.round(cuentas.total / invitados) : 0,
    publico: publicoParaElGrupo, arriendo: minimo?.minimo ?? 0,
    exclusivo, exclusivoGratis: quiereExclusivo && sinArriendo, descuentoEnLineas
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
  /** Los menús de niños, uno o varios (2026-11-24): el sitio dibuja un contador por cada uno. */
  ninos: ProductoSitio[];
  incluye: string[];
  suma: ProductoSitio[];
  /** Desde cuánto por persona, neto (+ IVA), con el menú más barato y el descuento. */
  desde: number;
  /** Los días de anticipación que pide; 0 es sin plazo (desde mañana). */
  anticipacion: number;
  /**
   * **El arriendo del recinto a su precio estándar** (2026-11-25), para el
   * botón *Quiero el lugar exclusivo*; `null` si el catálogo no tiene uno con
   * precio. Es el del catálogo, el mismo con que se cotiza.
   */
  arriendo: ProductoSitio | null;
  /** El precio estándar de lunes a viernes (Configuración); 0, el de `arriendo`. */
  arriendoSemana: number;
  /** El precio estándar de un día público, sábado o domingo (Configuración); 0, el de `arriendo`. */
  arriendoFinde: number;
  /** Si la promoción nunca cobra arriendo (*Sin arriendo*): el lugar exclusivo va incluido. */
  arriendoIncluido: boolean;
  /**
   * **Lo que el cliente escribió en *Productos* para cada producto**
   * (2026-11-25), por nombre: el texto del `?` del cotizador, con la misma
   * regla de la cotización (`detalleDe()`). Solo los que tienen *Qué incluye*
   * o *Bebestibles*: en blanco, el sitio usa su texto, ya traducido. `casa`
   * dice si va con el menú de la casa arriba.
   */
  detalles: Record<string, { detalle: string; casa: boolean }>;
}

/**
 * **El precio estándar del arriendo ese día** (2026-11-25, lo pidió el cliente: *"si elijo un día
 * público… el arriendo es 2,5 millones; de lunes a viernes, 1,5 millones"*): el de un día público
 * —sábado, domingo o un feriado abierto— y el de lunes a viernes salen de Configuración; con el
 * número en 0, el del catálogo. Es la misma cuenta del cotizador y del sitio.
 */
export function precioArriendoEstandar(a: Menu, fecha: string, p: { semana?: number; finde?: number } = {}, publico = false): number {
  const d = new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10))).getDay();
  const n = publico || d === 0 || d === 6 ? p.finde : p.semana;
  return n && n > 0 ? Math.round(n) : precioParaCotizar(a);
}

const paraSitio = (m: Menu): ProductoSitio => ({
  nombre: m.nombre, precio: precioParaCotizar(m), masIva: m.iva === IVA_PRECIO.mas,
  fijo: m.cobro === COBRO.fijo, loCobra: m.loCobra
});

/** El `?` de cada producto con texto propio en *Productos* (ver `PromocionSitio.detalles`). */
function detallesPropios(productos: Menu[]): Record<string, { detalle: string; casa: boolean }> {
  const salida: Record<string, { detalle: string; casa: boolean }> = {};
  for (const m of productos) {
    if (!String(m.descripcion ?? '').trim() && !String(m.bebestibles ?? '').trim()) continue;
    const d = detalleDe(m.nombre, { descripcion: m.descripcion, bebestibles: m.bebestibles });
    if (d) salida[m.nombre] = d;
  }
  return salida;
}

/**
 * Las promociones activas, conectadas y **con el cotizador encendido**, como
 * las ve el sitio. **Una con un producto que falta o sin precio no sale**:
 * su bloque se queda con el botón de WhatsApp, en vez de un cotizador que no
 * puede cotizar.
 */
export function promocionesParaElSitio(promos: Promocion[], catalogo: Menu[], arriendo: { semana?: number; finde?: number } = {}): PromocionSitio[] {
  const salida: PromocionSitio[] = [];
  for (const p of promos) {
    if (!p.activa || !p.sitio || !p.cotizador) continue;
    const buscar = (n: string) => productoDe(n, catalogo);
    const menus = p.menus.map(buscar);
    const ninos = p.ninos.map(buscar);
    const incluye = p.incluye.map(buscar);
    const suma = p.suma.map(buscar);
    const todos = [...menus, ...incluye, ...suma, ...ninos];
    const arriendoCat = arriendoDelCatalogo(catalogo);
    if (!menus.length || todos.some((m) => !m || !m.activo || m.moneda === MONEDA.uf || !(precioParaCotizar(m) > 0))) continue;
    const porPersona = (incluye as Menu[]).filter((m) => m.cobro !== COBRO.fijo).reduce((n, m) => n + neto(m), 0);
    const masBarato = Math.min(...(menus as Menu[]).map(neto));
    salida.push({
      sitio: p.sitio, nombre: p.nombre, minimo: Math.max(1, p.minimo), descuento: p.descuento,
      menus: (menus as Menu[]).map(paraSitio),
      ninos: (ninos as Menu[]).map(paraSitio),
      incluye: (incluye as Menu[]).map((m) => m.nombre),
      suma: (suma as Menu[]).map(paraSitio),
      desde: Math.round((masBarato + porPersona) * (1 - p.descuento / 100)),
      anticipacion: p.anticipacion,
      arriendo: arriendoCat && arriendoCat.moneda !== MONEDA.uf && precioParaCotizar(arriendoCat) > 0
        ? paraSitio(arriendoCat) : null,
      arriendoSemana: arriendoCat && (arriendo.semana ?? 0) > 0 ? Math.round(arriendo.semana!) : 0,
      arriendoFinde: arriendoCat && (arriendo.finde ?? 0) > 0 ? Math.round(arriendo.finde!) : 0,
      arriendoIncluido: p.arriendo === ARRIENDO_PROMO.nunca,
      detalles: detallesPropios(todos as Menu[])
    });
  }
  return salida;
}

/* ---------- lo que manda el sitio ---------- */

/** El contacto que deja el cliente en el sitio. */
export interface ContactoSitio { nombre: string; empresa: string; telefono: string; correo: string }

const digitos = (t: string) => String(t ?? '').replace(/\D/g, '');

/**
 * El contacto del formulario, limpio, o el código de lo que falta. **El
 * teléfono es obligatorio**: es por donde el vendedor lo llama, y frena el
 * envío que no es de una persona. El correo es opcional.
 */
export function limpiarContactoSitio(x: Partial<Record<keyof ContactoSitio, unknown>>):
  ContactoSitio | { codigo: 'nombre' | 'telefono' | 'correo' } {
  const nombre = String(x?.nombre ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const empresa = String(x?.empresa ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const telefono = String(x?.telefono ?? '').replace(/[^\d+ ]/g, '').trim().slice(0, 20);
  const correo = String(x?.correo ?? '').trim().toLowerCase().slice(0, 120);
  if (nombre.length < 2) return { codigo: 'nombre' };
  if (digitos(telefono).length < 8) return { codigo: 'telefono' };
  if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return { codigo: 'correo' };
  return { nombre, empresa, telefono, correo };
}

/**
 * **La ficha que ya existe para este contacto**: el mismo teléfono (los
 * últimos 9 dígitos, sin importar el +56 ni los espacios) o el mismo correo.
 * Así un cliente que cotiza dos veces no queda con dos fichas.
 */
export function fichaDelContacto(c: Pick<ContactoSitio, 'telefono' | 'correo'>, clientes: Cliente[]): Cliente | undefined {
  const tel = digitos(c.telefono).slice(-9);
  return clientes.find((x) => (tel.length >= 8 && digitos(x.telefono).slice(-9) === tel)
    || (!!c.correo && x.correo.trim().toLowerCase() === c.correo));
}

/** Cuántas cotizaciones del sitio puede mandar un mismo cliente en un día. */
export const TOPE_SITIO_DIA = 3;

/** Las que este cliente ya mandó hoy desde el sitio: para el tope. */
export const delSitioHoy = (presupuestos: Pick<Presupuesto, 'idCliente' | 'origen' | 'creado'>[], idCliente: string, hoy: string) =>
  presupuestos.filter((p) => p.idCliente === idCliente && /^sitio/i.test(p.origen ?? '')
    && String(p.creado ?? '').startsWith(hoy)).length;

/** La marca de origen de una cotización del sitio. */
export const ORIGEN_SITIO = 'Sitio';
export const esDelSitio = (p: Pick<Presupuesto, 'origen'>) => /^sitio/i.test(p.origen ?? '');

/**
 * **La cotización que nace del sitio** (2026-11-23). La decidió el cliente:
 * *enviada de inmediato* —el cliente ya vio el total, así que corre la
 * vigencia y cuenta como gente posible—, a nombre de la cuenta de
 * Configuración, con el próximo contacto hoy para que su vendedor lo llame.
 * El descuento es el de la promoción; el resto de las condiciones, las de
 * Configuración, como en toda cotización.
 */
export function cotizacionDelSitio(a: {
  id: string; token: string; idCliente: string; promo: Promocion; cotizada: Cotizada;
  fecha: string; empresa: string; vendedor: string; hoy: string; ahora: string; vigenciaDias: number;
}): Omit<Presupuesto, 'fila'> {
  return {
    id: a.id, fecha: a.fecha as Presupuesto['fecha'], periodo: '',
    cliente: '', email: '', telefono: '', idCliente: a.idCliente,
    estado: ESTADO_PRESUPUESTO.enviado,
    validoHasta: vigenciaHasta(a.hoy, a.vigenciaDias, a.fecha), token: a.token,
    notas: `Cotizada por el cliente en el sitio: ${a.promo.nombre}${a.empresa ? ` · ${a.empresa}` : ''}.`
      + (a.cotizada.exclusivo ? ' Pidió el lugar exclusivo, con el arriendo a su precio estándar.' : ''),
    idReserva: '', invitados: a.cotizada.invitados, tipoEvento: 'Empresa', grupo: '',
    // Pidió el lugar exclusivo: el vendedor lo ve marcado y lo conversa.
    exclusivo: a.cotizada.exclusivo ? 'sí' : '',
    // Con el lugar exclusivo el descuento ya va en cada línea (menos el arriendo):
    // sobre el total, el arriendo lo habría alcanzado.
    descuento: a.cotizada.descuentoEnLineas ? 0 : a.cotizada.descuento, motivo: '', documento: '',
    anticipo: null, anticipoMonto: null, saldoDias: null, uf: 0, fechaUF: '',
    horario: '', ley20393: false, acuerdos: '', contrato: '', contratoSubidoPor: '', contratoSubido: '',
    cambiosFecha: null, cancelacionDias: null, reembolso: null,
    devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '',
    enviada: a.ahora, ultimoSeguimiento: '', contratoEnviado: '', seguimientoDias: null, avisoEvento: null,
    recontactar: a.hoy, origen: `${ORIGEN_SITIO} · ${a.promo.nombre}`, avisoVisto: '',
    // La promoción queda aplicada (2026-11-24): el vendedor la sigue editando
    // con su descuento y su arriendo, como si la hubiera elegido él.
    promocion: a.promo.id,
    creadoPor: a.vendedor, creado: a.ahora
  };
}

/* ---------- el aviso al vendedor ---------- */

/** Una cotización del sitio que su vendedor todavía no vio. */
export interface AvisoSitio {
  id: string;
  folio: string;
  cliente: string;
  promo: string;
  fecha: string;
  invitados: number;
  total: number;
}

const SIGUE = new Set<string>([ESTADO_PRESUPUESTO.candidato, ESTADO_PRESUPUESTO.borrador,
  ESTADO_PRESUPUESTO.enviado, ESTADO_PRESUPUESTO.negociacion]);

/**
 * **Las cotizaciones del sitio que esta cuenta tiene que ver** (2026-11-23,
 * lo pidió el cliente: *"al vendedor hay que avisar con un popup cuando se
 * mete la próxima vez al panel que le entraron cotizaciones desde el
 * sitio"*): las suyas que todavía no marcó vistas y siguen en carrera. Las
 * que llegaron **sin vendedor** las ve quien puede asignarlas (la gerencia,
 * pagos y el administrador), para que alguien se haga cargo.
 */
export function avisosDelSitio(
  presupuestos: (Pick<Presupuesto, 'id' | 'origen' | 'avisoVisto' | 'estado' | 'creadoPor' | 'fecha' | 'invitados' | 'descuento'>
    & { cliente?: string })[],
  lineas: LineaPresupuesto[],
  cuenta: { usuario: string; asigna: boolean }
): AvisoSitio[] {
  const yo = normalizar(cuenta.usuario);
  return presupuestos
    .filter((p) => esDelSitio(p) && !String(p.avisoVisto ?? '').trim() && SIGUE.has(estadoNormal(p.estado))
      && (p.creadoPor ? !!yo && normalizar(p.creadoPor) === yo : cuenta.asigna))
    .map((p) => ({
      id: p.id, folio: folioDe(p), cliente: p.cliente ?? '',
      promo: String(p.origen ?? '').replace(/^sitio\s*·\s*/i, ''),
      fecha: String(p.fecha ?? ''), invitados: p.invitados,
      total: totalDe(lineasDe(lineas, p.id), p.descuento)
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** La marca de visto: *quién · cuándo*. */
export const marcaVisto = (usuario: string, cuando: string) => `${usuario} · ${cuando}`;
