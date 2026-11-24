/**
 * **Traer los datos de producción a la versión de prueba** (2026-11-24, lo
 * pidió el cliente: *"necesito una función para sincronizar la base de datos
 * de prueba con la base de datos de producción, que de vez en cuando tiene
 * sentido que la base de prueba se resincroniza con la base de datos de
 * producción para poder seguir probando a base de lo que hay hoy en día en la
 * realidad. Puede ser un botón más en configuración"*).
 *
 * **Va en un solo sentido: de producción a la prueba.** Lo que se aprieta en
 * Configuración → Mantención de una versión de prueba lee la planilla real y
 * reemplaza con ella la copia *Pruebas*. Nunca al revés, y las guardas son
 * tres, porque un error acá borraría lo real:
 *
 * - **Se aprieta en una versión de prueba, nunca en producción**
 *   (`bloqueoDe()`, con `VERCEL_ENV`). En producción la planilla del panel
 *   ya es la real: no hay a dónde traerla.
 * - **La planilla real solo se lee.** Su id llega por una variable que va
 *   solo en Preview (`GOOGLE_SHEET_ID_PRODUCCION`), y lo único que la recibe
 *   es `leerOtraPlanilla()`, que no escribe. Lo que se escribe va siempre a
 *   la planilla del panel (`idPlanilla()`), como todo lo demás.
 * - **No se escribe en una planilla que se llama como la de producción**
 *   (`pareceProduccion()`): si alguien cruzara las dos variables en Vercel,
 *   la de destino sería la real, y ahí se frena.
 *
 * **Qué se copia**: las pestañas del panel, las mismas que conoce *Dejar la
 * base en cero* (`SE_VACIAN` y `SE_CONSERVAN`), con sus valores tal cual —un
 * número sigue siendo número, una fecha escrita como texto sigue siendo
 * texto—, así que la prueba lee exactamente lo que lee producción.
 *
 * - **Las cuentas también**, en Lo Pirque: las cotizaciones y los vendedores
 *   se cruzan con ellas por nombre, y sin las de producción la mitad saldría
 *   *sin cuenta*. Quien entra a la prueba entra con su clave de producción.
 *   En otra empresa no se copian: la lista de cuentas vive en la de Lo Pirque.
 * - **Se conserva la carpeta de comprobantes de la prueba**
 *   (`CONSERVA_DE_LA_PRUEBA`): sin eso, una foto subida probando iría a la
 *   carpeta de los comprobantes reales.
 * - **No se tocan** las pestañas de paso del importador, los comentarios
 *   (viven en otra planilla) ni ninguna pestaña que el panel no conozca.
 * - Una pestaña que producción no tiene, en la prueba queda con su
 *   encabezado y sin datos.
 *
 * Puro: lo usan la ruta (`/api/mantencion/traer-produccion`) y las pruebas.
 */
import { SE_VACIAN, SE_CONSERVAN, type PestanaProduccion } from './produccion.ts';
import { HOJA_USUARIOS } from './usuarios.ts';
import { HOJA_CONFIG, COL_CONFIG, CLAVES } from './config.ts';
import { normalizar, indices, HOJA_RESERVAS } from './columnas.ts';

/** Lo que trae una celda leída sin formato: el texto, el número o el sí/no tal cual. */
export type Valor = string | number | boolean;

/**
 * Las pestañas que se traen, en el orden en que se leen en la ventana: primero
 * lo del día a día, después la configuración. Las cuentas, solo en la casa.
 */
export function pestanasACopiar(esLaCasa: boolean): PestanaProduccion[] {
  return [...SE_VACIAN, ...SE_CONSERVAN]
    .filter((p) => esLaCasa || p.hoja !== HOJA_USUARIOS)
    // *"Reservas, y sus eventos en Google Calendar"* es lo que borra la base
    // en cero; acá el calendario no se toca.
    .map((p) => (p.hoja === HOJA_RESERVAS ? { ...p, que: 'Reservas' } : p));
}

/** Las claves de `Config` que se quedan como estaban en la prueba. */
export const CONSERVA_DE_LA_PRUEBA: { clave: string; que: string }[] = [
  { clave: CLAVES.driveComprobantes, que: 'La carpeta de los comprobantes (la de la prueba)' }
];

export type Bloqueo = '' | 'produccion' | 'sinVariable' | 'misma' | 'destinoProduccion';

/**
 * **Si se puede traer**, antes de leer nada: no en producción, con la
 * variable puesta, y con dos planillas distintas.
 */
export function bloqueoDe(a: { entorno: string; origen: string; destino: string }): Bloqueo {
  if (a.entorno === 'produccion') return 'produccion';
  const origen = String(a.origen ?? '').trim();
  if (!origen) return 'sinVariable';
  if (origen === String(a.destino ?? '').trim()) return 'misma';
  return '';
}

/**
 * **Si el nombre de la planilla dice producción** (*BBDD Produccion*, *AyC
 * BBDD Producción*). Es la tercera guarda: no se escribe en una planilla que
 * se llama así, aunque las variables digan otra cosa.
 */
export function pareceProduccion(nombre: string): boolean {
  return /produc/.test(normalizar(nombre ?? ''));
}

/** Lo que se le dice a quien aprieta, por cada bloqueo. */
export function textoDelBloqueo(b: Bloqueo, nombreDestino = ''): string {
  switch (b) {
    case 'produccion':
      return 'Esto se aprieta en una versión de prueba: es la que recibe los datos. En producción la planilla ya es la real.';
    case 'sinVariable':
      return 'Falta decirle al panel cuál es la planilla de producción: la variable GOOGLE_SHEET_ID_PRODUCCION, solo en Preview.';
    case 'misma':
      return 'La planilla de producción y la de esta versión son la misma: no hay nada que traer.';
    case 'destinoProduccion':
      return `La planilla de esta versión se llama «${nombreDestino}»: parece la de producción, y ahí no se escribe. Revisa GOOGLE_SHEET_ID en Preview.`;
    default:
      return '';
  }
}

/** Cuántas filas con algo tiene una pestaña leída, sin el encabezado. */
export function filasConAlgo(filas: unknown[][] | null | undefined): number | null {
  if (!filas) return null;
  return filas.slice(1).filter((f) => (f ?? []).some((c) => String(c ?? '').trim() !== '')).length;
}

/**
 * **La configuración de producción con lo de la prueba que se conserva**: la
 * fila de esa clave toma el valor de la prueba, o se agrega si producción no
 * la tiene. Si la prueba no tenía esa clave (o la tenía vacía), queda la de
 * producción.
 */
export function conConfigDeLaPrueba(produccion: Valor[][], prueba: string[][] | null): Valor[][] {
  if (!prueba?.length || !produccion.length) return produccion;
  const ip = indices(prueba[0].map(String), COL_CONFIG);
  const io = indices(produccion[0].map(String), COL_CONFIG);
  if (ip.clave < 0 || ip.valor < 0 || io.clave < 0 || io.valor < 0) return produccion;
  const salida = produccion.map((f) => [...f]);
  for (const { clave } of CONSERVA_DE_LA_PRUEBA) {
    const deLaPrueba = prueba.slice(1).find((f) => normalizar(String(f[ip.clave] ?? '')) === normalizar(clave));
    const valor = String(deLaPrueba?.[ip.valor] ?? '').trim();
    if (!valor) continue;
    const fila = salida.findIndex((f, k) => k > 0 && normalizar(String(f[io.clave] ?? '')) === normalizar(clave));
    if (fila > 0) {
      while (salida[fila].length <= io.valor) salida[fila].push('');
      salida[fila][io.valor] = valor;
    } else {
      const nueva: Valor[] = [];
      nueva[io.clave] = clave; nueva[io.valor] = valor;
      salida.push(Array.from(nueva, (c) => c ?? ''));
    }
  }
  return salida;
}

export interface Plan {
  /** Las pestañas que se reemplazan enteras con lo de producción. */
  copiar: { hoja: string; filas: Valor[][] }[];
  /** Las que producción no tiene y la prueba sí: quedan con su encabezado y sin datos. */
  vaciar: string[];
}

/**
 * **Qué se escribe en la prueba.** `produccion` trae cada pestaña leída (o
 * `null` si no existe allá); `enLaPrueba`, las que la prueba ya tiene.
 */
export function planDeCopia(
  hojas: string[], produccion: Map<string, Valor[][] | null>,
  enLaPrueba: Set<string>, configDeLaPrueba: string[][] | null
): Plan {
  const plan: Plan = { copiar: [], vaciar: [] };
  for (const hoja of hojas) {
    const filas = produccion.get(hoja) ?? null;
    if (filas) {
      plan.copiar.push({ hoja, filas: hoja === HOJA_CONFIG ? conConfigDeLaPrueba(filas, configDeLaPrueba) : filas });
    } else if (enLaPrueba.has(hoja)) {
      plan.vaciar.push(hoja);
    }
  }
  return plan;
}

/** Cuántas filas y columnas ocupa una pestaña: para que la planilla tenga dónde. */
export function tamanoDe(filas: unknown[][]): { filas: number; columnas: number } {
  return { filas: filas.length, columnas: filas.reduce((m, f) => Math.max(m, f?.length ?? 0), 0) };
}

/** Un pedazo de lo que se escribe: una pestaña desde una fila. */
export interface Trozo { hoja: string; desde: number; filas: Valor[][] }

/**
 * **Lo que se escribe, en pedidos que Google acepta.** Una pestaña larga (la
 * bitácora) va en pedazos de hasta `filasPorTrozo` filas, y los pedazos se
 * juntan en pedidos de hasta `maxBytes` de largo: en la mayoría de los casos
 * es un solo pedido para todo.
 */
export function enPedidos(
  copiar: { hoja: string; filas: Valor[][] }[], maxBytes = 4_000_000, filasPorTrozo = 2000
): Trozo[][] {
  const trozos: Trozo[] = [];
  for (const c of copiar) {
    for (let i = 0; i < c.filas.length; i += filasPorTrozo) {
      trozos.push({ hoja: c.hoja, desde: i + 1, filas: c.filas.slice(i, i + filasPorTrozo) });
    }
  }
  const pedidos: Trozo[][] = [];
  let actual: Trozo[] = [], largo = 0;
  for (const t of trozos) {
    const n = JSON.stringify(t.filas).length;
    if (actual.length && largo + n > maxBytes) { pedidos.push(actual); actual = []; largo = 0; }
    actual.push(t); largo += n;
  }
  if (actual.length) pedidos.push(actual);
  return pedidos;
}

/** La línea de la bitácora: desde dónde y cuántas filas de cada pestaña. */
export function detalleDeLaCopia(origen: string, plan: Plan): string {
  const partes = plan.copiar
    .map((c) => ({ hoja: c.hoja, n: filasConAlgo(c.filas) ?? 0 }))
    .filter((c) => c.n > 0)
    .map((c) => `${c.hoja} ${c.n}`);
  return `desde «${origen || 'la planilla de producción'}»`
    + (partes.length ? ` · ${partes.join(' · ')}` : ' · no había datos')
    + (plan.vaciar.length ? ` · vacías: ${plan.vaciar.join(', ')}` : '');
}
