/**
 * **Los comentarios del equipo** (2026-11-12): errores, dudas, ideas y lo que
 * le falta a cada uno para su trabajo, mandados desde el botón 💬 Comentar
 * de cualquier pantalla.
 *
 * **Desde el 2026-11-26 van a la planilla del panel**, pestaña `Comentarios`
 * (lo decidió el cliente: *"hagámoslo"*, sobre traerlos a la base del panel
 * para verlos, contestarlos y pasarlos a tarea ahí mismo). Hasta ese día iban a
 * *Gran Testeo - Panel* (`COMENTARIOS_SHEET_ID`, solo en producción), donde los
 * trabajaba un Apps Script. Las **once columnas de siempre van primero y en el
 * mismo orden** —así se leen igual que allá—, y al final cuatro nuevas: `ID`,
 * `Respondido por`, `Respuesta vista` y `Tarea`. Los de *Gran Testeo* se traen
 * una vez desde Configuración → Mantención (`/api/comentarios/traer`).
 *
 * Al estar en la planilla del panel, **la versión de prueba tiene los suyos**
 * en *BBDD Prueba*, como todo lo demás.
 *
 * **Quién, con qué rol y desde qué pantalla no lo escribe la persona**: lo
 * pone el servidor desde la sesión. Son menos campos y datos exactos.
 *
 * Puro, para probarlo sin red.
 */
import { indices } from './columnas.ts';
import { ROL } from './auth.ts';

/** Las cuatro clases, con el mismo texto que usa la planilla para contarlas. */
export const TIPOS_COMENTARIO = ['🧩 Me falta', '🐞 Algo falla', '🤔 No se entiende', '💡 Idea'] as const;
export type TipoComentario = (typeof TIPOS_COMENTARIO)[number];

/** La pestaña y sus columnas: las once del testeo, en su orden, y las del panel al final. */
export const HOJA_COMENTARIOS = 'Comentarios';
export const COLUMNAS_COMENTARIOS = ['Fecha', 'Rol', 'Nombre', 'Tipo', 'Dónde', 'Qué pasó / qué necesita',
  'Para qué lo necesita', 'Estado', 'Prioridad', 'Respuesta / qué se hizo', 'Fecha resuelto'] as const;

export const COL_COMENTARIOS = {
  fecha: 'Fecha', rol: 'Rol', nombre: 'Nombre', tipo: 'Tipo', donde: 'Dónde', texto: 'Qué pasó / qué necesita',
  para: 'Para qué lo necesita', estado: 'Estado', prioridad: 'Prioridad', respuesta: 'Respuesta / qué se hizo',
  resuelto: 'Fecha resuelto',
  id: 'ID',
  /** El nombre de la cuenta que contestó. */
  respondidoPor: 'Respondido por',
  /** Cuándo vio la respuesta quien comentó: en blanco, su aviso sigue. */
  vista: 'Respuesta vista',
  /** El ID de la tarea que salió de este comentario. */
  tarea: 'Tarea'
} as const;
export const ENCABEZADO_COMENTARIOS: string[] = Object.values(COL_COMENTARIOS);

/** Los estados, con el texto que usaba el testeo (*Nuevo* es lo pendiente). */
export const ESTADOS_COMENTARIO = ['Nuevo', 'En curso', 'Resuelto', 'No se hará'] as const;
export const PRIORIDADES = ['Alta', 'Media', 'Baja'] as const;

export const LARGO_TEXTO = 2000;
export const LARGO_PARA = 1000;

export interface Comentario {
  tipo: TipoComentario;
  texto: string;
  para: string;
  pantalla: string;
}

/** Lo que llega del navegador, limpio; o el error en palabras. */
export function limpiarComentario(cuerpo: unknown): { comentario: Comentario } | { error: string } {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  const t = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
  const tipo = TIPOS_COMENTARIO.find((x) => x === c.tipo);
  if (!tipo) return { error: 'Elige qué es: me falta, algo falla, no se entiende o una idea.' };
  const texto = t(c.texto, LARGO_TEXTO);
  if (!texto) return { error: 'Escribe qué pasó o qué necesitas.' };
  return { comentario: { tipo, texto, para: t(c.para, LARGO_PARA), pantalla: t(c.pantalla, 80) } };
}

/**
 * La fila tal como va a la planilla. El estado nace en *Nuevo*, que es lo que
 * el Panel del cliente cuenta como pendiente; prioridad, respuesta y fecha
 * resuelto quedan para quien los trabaja.
 */
export function filaComentario(c: Comentario, quien: { nombre: string; rol: string }, fecha: string, id = ''): string[] {
  return [fecha, quien.rol, quien.nombre, c.tipo, c.pantalla, c.texto, c.para, 'Nuevo', '', '', '', id, '', '', ''];
}

export function nuevoIdComentario(): string {
  return `C-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/** Un comentario guardado, leído por nombre de columna. */
export interface ComentarioGuardado {
  id: string; fecha: string; rol: string; nombre: string; tipo: string; donde: string; texto: string; para: string;
  estado: string; prioridad: string; respuesta: string; resuelto: string; respondidoPor: string; vista: string;
  tarea: string; fila: number;
}

export function leerComentariosDe(filas: string[][]): ComentarioGuardado[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_COMENTARIOS);
  if (i.texto === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());
  const salida: ComentarioGuardado[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const texto = en(f, i.texto);
    if (!texto) continue;
    salida.push({ id: en(f, i.id) || `fila-${n + 1}`, fecha: en(f, i.fecha), rol: en(f, i.rol), nombre: en(f, i.nombre),
      tipo: en(f, i.tipo), donde: en(f, i.donde), texto, para: en(f, i.para), estado: en(f, i.estado) || 'Nuevo',
      prioridad: en(f, i.prioridad), respuesta: en(f, i.respuesta), resuelto: en(f, i.resuelto),
      respondidoPor: en(f, i.respondidoPor), vista: en(f, i.vista), tarea: en(f, i.tarea), fila: n + 1 });
  }
  return salida;
}

/** Un comentario como fila, cada valor en su columna según el encabezado. */
export function filaDeComentario(encabezado: string[], c: Omit<ComentarioGuardado, 'fila'>): string[] {
  const i = indices(encabezado, COL_COMENTARIOS);
  const fila = new Array(Math.max(encabezado.length, ENCABEZADO_COMENTARIOS.length)).fill('');
  (Object.keys(COL_COMENTARIOS) as (keyof typeof COL_COMENTARIOS)[]).forEach((k) => {
    if (i[k] !== -1) fila[i[k]] = c[k];
  });
  return fila;
}

/**
 * **Solo el administrador ve y contesta todos** (2026-11-26, lo decidió el
 * cliente: *"la gerencia no tiene que ver los coméntame, eso solo admin,
 * gerencia ve lo que se envía por interno"*). La gerencia ve todas las
 * tareas (`VEN_TODAS` de `tareas.ts`), y de los comentarios, solo los suyos.
 */
export const LEEN_TODOS: string[] = [ROL.admin];

const llano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Es suyo: lo escribió esa cuenta (el nombre, como lo guarda la sesión). */
export const esSuyo = (c: Pick<ComentarioGuardado, 'nombre'>, quien: string) => !!quien && llano(c.nombre) === llano(quien);

/** Los que una cuenta ve: todos la gerencia y el administrador; los demás, los suyos. */
export function comentariosVisibles<T extends Pick<ComentarioGuardado, 'nombre'>>(lista: T[], rol: string, quien: string): T[] {
  return LEEN_TODOS.includes(rol) ? lista : lista.filter((c) => esSuyo(c, quien));
}

/** Respondido y sin ver: el aviso de *Te contestaron* de quien comentó. */
export const respuestaSinVer = (c: Pick<ComentarioGuardado, 'respuesta' | 'vista'>) => !!c.respuesta && !c.vista;

/** Lo que cuenta la portada: para quien los trabaja, los nuevos; para cada uno, sus respuestas sin ver. */
export function avisosDeComentarios(lista: ComentarioGuardado[], rol: string, quien: string) {
  return {
    nuevos: LEEN_TODOS.includes(rol) ? lista.filter((c) => c.estado === 'Nuevo').length : 0,
    respuestas: lista.filter((c) => esSuyo(c, quien) && respuestaSinVer(c)).length
  };
}

/**
 * **El orden de la lista**: los nuevos primero, después en curso, y abajo
 * resueltos y descartados; dentro de cada uno, el más nuevo arriba.
 */
export function ordenarComentarios<T extends Pick<ComentarioGuardado, 'estado' | 'fecha' | 'fila'>>(lista: T[]): T[] {
  const peso = (e: string) => (e === 'Nuevo' ? 0 : e === 'En curso' ? 1 : 2);
  return [...lista].sort((a, b) => peso(a.estado) - peso(b.estado) || b.fecha.localeCompare(a.fecha) || b.fila - a.fila);
}

/**
 * **Traer los de *Gran Testeo*** (2026-11-26): las filas de allá que todavía
 * no están acá, con un ID nuevo. Se reconocen por fecha, nombre y texto, así
 * que apretarlo dos veces no los duplica.
 */
export function comentariosPorTraer(deAlla: ComentarioGuardado[], deAca: ComentarioGuardado[]): ComentarioGuardado[] {
  const firma = (c: ComentarioGuardado) => [c.fecha, llano(c.nombre), c.texto.trim()].join('|');
  const ya = new Set(deAca.map(firma));
  return deAlla.filter((c) => !ya.has(firma(c)));
}
