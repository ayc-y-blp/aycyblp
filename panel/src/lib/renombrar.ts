/**
 * **Renombrar arrastra lo guardado** (2026-11-24, lo pidió el cliente).
 *
 * Los turnos, los pagos, las boletas y los ajustes apuntan a una persona y a
 * un puesto **por su nombre escrito**: no hay un número de ficha detrás. Hasta
 * ese día, cambiar un nombre cambiaba solo la ficha o la lista de puestos, y
 * lo guardado seguía con el nombre de antes. El cliente lo encontró dos veces
 * el mismo día:
 *
 * - *"Cambié jefe de turno a encargado de turno / caja y luego ya no aparece
 *   en el turno"*: el puesto nuevo salía vacío, con *Falta 1*, y la persona
 *   quedaba en un recuadro aparte con el nombre viejo.
 * - *"En equipo sale correcto con Christopher Acevedo pero en los turnos me
 *   aparece como Christipher Acevedo"*: la ficha se corrigió y los turnos no.
 *
 * Ahora un cambio de nombre **reescribe las celdas que dicen el nombre de
 * antes**, en todas las pestañas donde vive (`DONDE`), en una sola escritura.
 * Y lo que ya quedó suelto —un nombre corregido directo en la planilla, o un
 * cambio de antes de este arreglo— se reengancha con *Es…* / *Pasar a…*.
 *
 * Se eligió esto y no un número de ficha en cada fila porque el nombre ya es
 * la identidad en todo el panel y en la planilla que el cliente lee: cambiar
 * eso es una migración de cinco pestañas. Arrastrar el nombre cuesta una
 * lectura y una escritura, y solo cuando alguien renombra.
 *
 * Pura y con pruebas: la usan las rutas y `lib/prueba.ts`.
 */
import { normalizar } from './columnas.ts';
import { HOJA_TURNOS, HOJA_TRABAJADORES, HOJA_AJUSTES_SUELTOS,
         COL_TURNOS, COL_TRABAJADORES, COL_AJUSTES_SUELTOS } from './equipo.ts';
import { HOJA_ACTIVIDADES, COL_ACTIVIDADES } from './extras.ts';
import { HOJA_PAGOS, HOJA_BOLETAS, COL_PAGOS, COL_BOLETAS } from './remuneraciones.ts';
import { HOJA_MENUS, COL_MENUS } from './menus.ts';
import { HOJA_LINEAS, COL_LINEAS } from './presupuestos.ts';

/** Un nombre que pasa a ser otro. */
export interface Renombre { de: string; a: string }

/** Una columna de una pestaña donde vive un nombre. */
export interface Donde { hoja: string; columna: string; que: string }

export type QueSeRenombra = 'trabajador' | 'colaborador' | 'puesto' | 'empresa';

/**
 * **Dónde vive cada nombre.** Lo que no está acá no se arrastra: una columna
 * nueva que guarde el nombre de una persona o de un puesto se agrega a esta
 * lista en el mismo cambio.
 *
 * - Los pagos y las boletas son de trabajadores y de colaboradores a la vez
 *   (la misma columna `Trabajador`), así que van en los dos.
 * - El puesto vive en cada turno y en el puesto habitual de cada ficha.
 */
export const DONDE: Record<QueSeRenombra, Donde[]> = {
  trabajador: [
    { hoja: HOJA_TURNOS, columna: COL_TURNOS.trabajador, que: 'turnos' },
    { hoja: HOJA_AJUSTES_SUELTOS, columna: COL_AJUSTES_SUELTOS.trabajador, que: 'ajustes' },
    { hoja: HOJA_PAGOS, columna: COL_PAGOS.quien, que: 'pagos' },
    { hoja: HOJA_BOLETAS, columna: COL_BOLETAS.quien, que: 'boletas' }
  ],
  colaborador: [
    { hoja: HOJA_ACTIVIDADES, columna: COL_ACTIVIDADES.colaborador, que: 'días' },
    { hoja: HOJA_PAGOS, columna: COL_PAGOS.quien, que: 'pagos' },
    { hoja: HOJA_BOLETAS, columna: COL_BOLETAS.quien, que: 'boletas' }
  ],
  puesto: [
    { hoja: HOJA_TURNOS, columna: COL_TURNOS.puesto, que: 'turnos' },
    { hoja: HOJA_TRABAJADORES, columna: COL_TRABAJADORES.puesto, que: 'fichas' }
  ],
  // **Otra empresa** (2026-11-24): el producto que cobra y las líneas de las
  // cotizaciones guardan su nombre escrito (`Lo cobra`).
  empresa: [
    { hoja: HOJA_MENUS, columna: COL_MENUS.loCobra, que: 'productos' },
    { hoja: HOJA_LINEAS, columna: COL_LINEAS.loCobra, que: 'líneas' }
  ]
};

/**
 * Dónde se mira si alguien quedó dos veces el mismo día al reenganchar: los
 * turnos de una persona, los días de un colaborador. Un puesto puede tener a
 * varios el mismo día, así que no se mira.
 */
export const DONDE_FECHA: Record<QueSeRenombra, { hoja: string; fecha: string; nombre: string } | null> = {
  trabajador: { hoja: HOJA_TURNOS, fecha: COL_TURNOS.fecha, nombre: COL_TURNOS.trabajador },
  colaborador: { hoja: HOJA_ACTIVIDADES, fecha: COL_ACTIVIDADES.fecha, nombre: COL_ACTIVIDADES.colaborador },
  puesto: null,
  empresa: null
};

/** Las pestañas que hay que leer para renombrar algo de ese tipo. */
export const hojasDe = (tipo: QueSeRenombra): string[] => [...new Set(DONDE[tipo].map((d) => d.hoja))];

/**
 * **Qué puestos cambiaron de nombre**, a partir de la lista que se guarda.
 * Cada fila trae `antes`: el nombre con que se cargó. Una fila nueva no lo
 * trae, y una que no cambió lo trae igual.
 *
 * Se aplican **todos a la vez** (ver `celdasARenombrar()`), así que cambiar
 * *A → B* y *B → C* en la misma pasada deja lo de A en B y lo de B en C, no
 * todo en C. Y si el nombre nuevo ya era de otro puesto, sus turnos se juntan
 * con los de ese: es lo que se pidió al escribirlo.
 */
export function renombresDeLista(filas: { nombre?: unknown; antes?: unknown }[]): Renombre[] {
  const salida: Renombre[] = [];
  const vistos = new Set<string>();
  for (const f of filas) {
    const de = String(f?.antes ?? '').trim();
    const a = String(f?.nombre ?? '').trim();
    if (!de || !a || de === a) continue;
    if (vistos.has(normalizar(de))) continue;
    vistos.add(normalizar(de));
    salida.push({ de, a });
  }
  return salida;
}

/**
 * Una celda que cambia: fila de la planilla (1 = encabezado) y columna desde
 * 0. `de` es el nombre de antes que calzó, para contar cuánto arrastró cada
 * cambio cuando van varios juntos.
 */
export interface CeldaNueva { hoja: string; fila: number; col: number; valor: string; que: string; de: string }

/**
 * Las celdas de una pestaña que dicen un nombre de antes, con el nuevo.
 *
 * Calza **sin mayúsculas ni tildes**, como el resto del panel: *Jefe de
 * Turno* y *jefe de turno* son el mismo puesto. Una celda que ya dice el
 * nombre nuevo tal cual no se reescribe.
 */
export function celdasARenombrar(tabla: string[][], donde: Donde, renombres: Renombre[]): CeldaNueva[] {
  if (!tabla.length || !renombres.length) return [];
  const col = (tabla[0] ?? []).map((c) => normalizar(String(c ?? ''))).indexOf(normalizar(donde.columna));
  if (col < 0) return [];
  const mapa = new Map(renombres.map((r) => [normalizar(r.de), r]));
  const salida: CeldaNueva[] = [];
  for (let i = 1; i < tabla.length; i++) {
    const actual = String(tabla[i]?.[col] ?? '');
    if (!actual.trim()) continue;
    const r = mapa.get(normalizar(actual));
    if (r === undefined || actual === r.a) continue;
    salida.push({ hoja: donde.hoja, fila: i + 1, col, valor: r.a, que: donde.que, de: r.de });
  }
  return salida;
}

/** Todas las celdas que cambian, pestaña por pestaña. */
export function cambiosDeRenombre(
  tablas: Record<string, string[][]>, tipo: QueSeRenombra, renombres: Renombre[]
): CeldaNueva[] {
  return DONDE[tipo].flatMap((d) => celdasARenombrar(tablas[d.hoja] ?? [], d, renombres));
}

/**
 * Cuántas cambian de cada cosa: `{ turnos: 6, pagos: 2 }`. Con `de`, solo las
 * que arrastró ese nombre.
 */
export function cuentaDeCambios(celdas: CeldaNueva[], de?: string): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const c of celdas) {
    if (de !== undefined && normalizar(c.de) !== normalizar(de)) continue;
    salida[c.que] = (salida[c.que] ?? 0) + 1;
  }
  return salida;
}

/**
 * **Los días en que una persona queda dos veces** después de reenganchar: si
 * alguien sumó la ficha nueva a un día que ya tenía el nombre viejo, al
 * juntarlos ese día la tiene repetida. Se avisa con la fecha para sacarla de
 * uno en la ventana del día; no se borra solo, porque cada fila puede traer
 * su asistencia o un ajuste.
 */
export function repetidosDespues(
  tabla: string[][], colFecha: string, colNombre: string, celdas: CeldaNueva[]
): string[] {
  if (!tabla.length) return [];
  const enc = (tabla[0] ?? []).map((c) => normalizar(String(c ?? '')));
  const f = enc.indexOf(normalizar(colFecha));
  const n = enc.indexOf(normalizar(colNombre));
  if (f < 0 || n < 0) return [];
  const nuevo = new Map(celdas.filter((c) => c.col === n).map((c) => [c.fila, c.valor]));
  if (!nuevo.size) return [];
  const vistos = new Map<string, number>();
  const tocadas = new Set<string>();
  for (let i = 1; i < tabla.length; i++) {
    const nombre = nuevo.get(i + 1) ?? String(tabla[i]?.[n] ?? '');
    if (!nombre.trim()) continue;
    const clave = `${String(tabla[i]?.[f] ?? '')}\n${normalizar(nombre)}`;
    vistos.set(clave, (vistos.get(clave) ?? 0) + 1);
    if (nuevo.has(i + 1)) tocadas.add(clave);
  }
  return [...new Set([...tocadas].filter((k) => (vistos.get(k) ?? 0) > 1).map((k) => k.split('\n')[0]))].sort();
}

/**
 * La frase de lo que se arrastró, para la bitácora y el aviso:
 * *"6 turnos, 2 pagos y 1 boleta"*. Vacía si no cambió nada.
 */
export function fraseDeCambios(cuenta: Record<string, number>): string {
  const UNO: Record<string, string> = { turnos: 'turno', pagos: 'pago', boletas: 'boleta',
    ajustes: 'ajuste', fichas: 'ficha', 'días': 'día', productos: 'producto', 'líneas': 'línea' };
  const partes = Object.entries(cuenta).filter(([, n]) => n > 0)
    .map(([que, n]) => `${n} ${n === 1 ? (UNO[que] ?? que) : que}`);
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * **Los nombres sueltos**: los que aparecen en lo guardado y no en la lista,
 * con cuántas veces. Es lo que se reengancha a mano. Generaliza `sinFicha()`
 * a los puestos y a los colaboradores, y cuenta, para que la pantalla diga
 * *Christipher Acevedo · 6 turnos*.
 */
export function sueltos(
  filas: { nombre: string }[], conocidos: string[]
): { nombre: string; veces: number }[] {
  const lista = new Set(conocidos.map(normalizar));
  const salida = new Map<string, { nombre: string; veces: number }>();
  for (const f of filas) {
    const clave = normalizar(f.nombre ?? '');
    if (!clave || lista.has(clave)) continue;
    const ya = salida.get(clave);
    if (ya) ya.veces++; else salida.set(clave, { nombre: f.nombre.trim(), veces: 1 });
  }
  return [...salida.values()];
}
