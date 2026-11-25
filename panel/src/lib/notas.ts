/**
 * **Las notas del vendedor** (2026-11-23, lo pidió el cliente: *"cómo dejar
 * sus notas y cómo organiza sus recontactos para un posible cliente.
 * Diariamente las notas se ingresan en un formulario intuitivo y luego se
 * ordena automáticamente por fecha, lo que se comentó el vendedor"*).
 *
 * Una fila por nota, en la pestaña `Notas`: de qué cotización (su grupo de
 * alternativas, que es una sola conversación), de qué cliente, cuándo, quién,
 * por qué medio y qué se conversó. **No se borran**: son la historia con ese
 * cliente. Su autor la puede corregir el mismo día.
 *
 * **Quién las lee** (lo decidió el cliente: *"solo ve el vendedor y la
 * gerencia"*): el vendedor de esa cotización, la gerencia general y el
 * administrador. Pagos, operaciones y los demás vendedores no ven el texto.
 * Lo recorta el servidor (`notasVisibles()`); la pantalla solo deja de
 * dibujar el botón.
 *
 * Puro y con pruebas: no toca la red.
 */
import { indices } from './columnas.ts';
import { esFecha, type Fecha } from './fechas.ts';
import { esSuya, ROL } from './auth.ts';

export const HOJA_NOTAS = 'Notas';

export const COL_NOTAS = {
  id: 'ID',
  /** El grupo de alternativas: la A y la B son la misma conversación. */
  presupuesto: 'ID Presupuesto',
  cliente: 'ID Cliente',
  /** `AAAA-MM-DD HH:MM`, hora de Chile. Lo pone el servidor. */
  cuando: 'Cuándo',
  quien: 'Quién',
  medio: 'Medio',
  nota: 'Nota'
} as const;

export const ENCABEZADO_NOTAS: string[] = Object.values(COL_NOTAS);

/** Por dónde se habló. En blanco, no se dijo. */
export const MEDIOS = [
  { clave: 'Llamada', icono: '📞' },
  { clave: 'WhatsApp', icono: '💬' },
  { clave: 'Correo', icono: '✉' },
  { clave: 'Reunión', icono: '🤝' }
] as const;

export const iconoDeMedio = (m: string) => MEDIOS.find((x) => x.clave === m)?.icono ?? '🗒';

/** Lo que se acepta como medio: uno de la lista, o nada. */
export function medioDe(v: unknown): string {
  const s = String(v ?? '').trim().toLowerCase();
  return MEDIOS.find((m) => m.clave.toLowerCase() === s)?.clave ?? '';
}

/** Lo más largo que se guarda en una nota: una planilla no es un libro. */
export const LARGO_NOTA = 2000;

export interface Nota {
  id: string;
  presupuesto: string;
  cliente: string;
  cuando: string;
  quien: string;
  medio: string;
  nota: string;
  fila: number;
}

/** La pestaña, por nombre de columna. Una fila sin cotización ni texto no cuenta. */
export function leerNotasDe(filas: string[][]): Nota[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_NOTAS);
  if (i.presupuesto === -1 || i.nota === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());
  const salida: Nota[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const presupuesto = en(f, i.presupuesto);
    const nota = en(f, i.nota);
    if (!presupuesto || !nota) continue;
    salida.push({ id: en(f, i.id) || `fila-${n + 1}`, presupuesto, cliente: en(f, i.cliente),
      cuando: en(f, i.cuando), quien: en(f, i.quien), medio: medioDe(en(f, i.medio)), nota, fila: n + 1 });
  }
  return salida;
}

/** Una nota como fila, cada valor en su columna según el encabezado. */
export function filaNota(encabezado: string[], n: Omit<Nota, 'fila'>): string[] {
  const i = indices(encabezado, COL_NOTAS);
  const fila = new Array(Math.max(encabezado.length, ENCABEZADO_NOTAS.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i.id, n.id);
  poner(i.presupuesto, n.presupuesto);
  poner(i.cliente, n.cliente);
  poner(i.cuando, n.cuando);
  poner(i.quien, n.quien);
  poner(i.medio, n.medio);
  poner(i.nota, n.nota);
  return fila;
}

/** Roles que leen todas las notas: la gerencia general y el administrador. */
export const LEEN_TODAS: string[] = [ROL.gerencia, ROL.admin];

/**
 * **Quién lee las notas de una cotización** (lo decidió el cliente): su
 * vendedor —quien la creó o a quien se la pasaron— y la gerencia. El
 * administrador también, porque es la cuenta que lo puede todo.
 */
export function puedeVerNotas(rol: string, usuario: string, creadoPor: string): boolean {
  return LEEN_TODAS.includes(rol) || esSuya(usuario, creadoPor);
}

/**
 * Las notas que una cuenta puede leer, de las cotizaciones que conoce. Las de
 * un grupo valen si alguna alternativa del grupo es suya.
 */
export function notasVisibles(
  notas: Nota[], presupuestos: { id: string; grupo?: string; creadoPor: string }[],
  rol: string, usuario: string
): Nota[] {
  if (LEEN_TODAS.includes(rol)) return notas;
  const suyos = new Set(presupuestos.filter((p) => esSuya(usuario, p.creadoPor))
    .flatMap((p) => [p.id, p.grupo || p.id]));
  return notas.filter((n) => suyos.has(n.presupuesto));
}

/**
 * **De la más nueva a la más vieja, y con la misma hora, la anotada después
 * primero** (2026-11-25, lo marcó el cliente con una foto: *hallo* y *hallo 2*,
 * las dos a las 16:20, y arriba salía *hallo*). `Cuándo` llega al minuto: dos
 * notas del mismo minuto empataban, y el orden de la pestaña —la vieja
 * primero— decidía. Ahora el empate lo gana la que viene después en la
 * lista, que es la que se anotó después (la pestaña se lee en orden y las
 * notas se agregan al final). Va con `T` porque a la pantalla las notas
 * llegan sin `fila`.
 */
export function ordenarNotas<T extends Pick<Nota, 'cuando'>>(notas: T[]): T[] {
  return notas.map((n, i) => ({ n, i }))
    .sort((a, b) => b.n.cuando.localeCompare(a.n.cuando) || b.i - a.i)
    .map((x) => x.n);
}

/** Las del grupo, de la más nueva a la más vieja. */
export function notasDelGrupo<T extends Pick<Nota, 'cuando' | 'presupuesto'>>(notas: T[], grupo: string): T[] {
  return ordenarNotas(notas.filter((n) => n.presupuesto === grupo));
}

/** La última nota del grupo, o `undefined`: la que se muestra en todas partes. */
export function ultimaNota<T extends Pick<Nota, 'cuando' | 'presupuesto'>>(notas: T[], grupo: string): T | undefined {
  return notasDelGrupo(notas, grupo)[0];
}

/** Por día, el más nuevo primero: `[fecha, notas del día]`. */
export function notasPorDia<T extends Pick<Nota, 'cuando'>>(notas: T[]): [Fecha, T[]][] {
  const m = new Map<Fecha, T[]>();
  for (const n of ordenarNotas(notas)) {
    const f = n.cuando.slice(0, 10);
    const dia = esFecha(f) ? f : '';
    if (!m.has(dia)) m.set(dia, []);
    m.get(dia)!.push(n);
  }
  return [...m];
}

/** Quién firma la nota que vino del CRM antiguo. */
export const QUIEN_CRM = 'CRM antiguo';

/** El encabezado que el importador puso en *Notas internas*: *"Del CRM (20-11-2026): "*. */
const DEL_CRM = /^Del CRM \((\d{1,2})-(\d{1,2})-(\d{4})\):\s*/;

/**
 * **Lo que vino del CRM antiguo, como la primera nota** (2026-11-25, lo pidió
 * el cliente: *"agrega el comentario que viene del CRM antiguo como primer
 * comentario"*). Las cotizaciones importadas traen su historia en *Notas
 * internas* (`Notas` de `Presupuestos`), con el encabezado *Del CRM
 * (20-11-2026):*, y no en la pestaña `Notas`: por eso no salía en *Lo
 * conversado*.
 *
 * **No se escribe nada**: se arma al leer, una por grupo de alternativas,
 * con la fecha del encabezado (sin hora) y firmada *CRM antiguo*. Como es
 * del día de la exportación, queda siempre como la más vieja. No se corrige
 * —no es de nadie— y sigue a *Notas internas*: si alguien la cambia ahí,
 * cambia acá. Sin la marca del importador al final, que es para él.
 */
export function notasDelCrm(
  presupuestos: { id: string; grupo?: string; idCliente?: string; notas?: string }[]
): Nota[] {
  const vistos = new Set<string>();
  const salida: Nota[] = [];
  for (const p of presupuestos) {
    const grupo = p.grupo || p.id;
    if (vistos.has(grupo)) continue;
    const texto = String(p.notas ?? '').trim();
    const m = DEL_CRM.exec(texto);
    if (!m) continue;
    vistos.add(grupo);
    const cuando = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const nota = texto.slice(m[0].length).replace(/\s*\(CRM-[\w-]+\)\s*$/, '').trim();
    salida.push({ id: `CRM-${grupo}`, presupuesto: grupo, cliente: p.idCliente ?? '',
      cuando: esFecha(cuando) ? cuando : '', quien: QUIEN_CRM, medio: '', nota: nota || texto, fila: 0 });
  }
  return salida;
}

/** Su autor la corrige el mismo día; después es historia. */
export function sePuedeCorregir(n: Pick<Nota, 'quien' | 'cuando'>, quien: string, hoy: Fecha): boolean {
  return !!quien && n.quien === quien && n.cuando.slice(0, 10) === hoy;
}

/** Un id corto y único para una nota nueva. */
export function nuevoIdNota(): string {
  return `N-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}
