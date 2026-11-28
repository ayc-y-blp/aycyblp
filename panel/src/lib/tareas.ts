/**
 * **Las tareas internas** (2026-11-26, lo pidió el cliente: *"que yo puedo
 * enviarles también mensajes a su panel con tareas pendientes… y eso tiene que
 * ser también posible entre ellos como usuarios, que Juan Manuel puede enviar
 * un mensaje a Isma, una tarea. Simplemente no es para hablar como en
 * WhatsApp, sino es como para realmente gestionar tareas pendientes de forma
 * más eficiente y centralizada"*).
 *
 * Una fila por tarea, en la pestaña `Tareas` de la planilla de la empresa:
 * quién la manda, para quién —una cuenta o **un rol entero**—, qué hay que
 * hacer, para cuándo (opcional) y con qué tiene que ver (una cotización, una
 * reserva o un día, opcional).
 *
 * **No es un chat**: una tarea tiene un ida y vuelta corto. Quien la recibe la
 * marca **✓ Hecha** (con una nota, si quiere) o **❓ Pregunta** algo; la
 * pregunta vuelve a quien la mandó, que contesta y la tarea sigue pendiente.
 * Todo queda en `Conversación`, un renglón por mensaje, con hora y nombre.
 *
 * **Para un rol, la cierra el primero**: *"Encargados de turno: revisar las
 * parrillas"* la marca hecha uno de ellos, y queda a su nombre.
 *
 * **Quién ve qué** (lo decidió el cliente: *"cada uno las suyas"*): cada uno
 * ve las que recibió —a su nombre o a su rol— y las que mandó. **La gerencia
 * general y el administrador ven todas**, con un filtro por persona.
 *
 * Puro y con pruebas: no toca la red.
 */
import { indices } from './columnas.ts';
import { esFecha, type Fecha } from './fechas.ts';
import { ROL } from './auth.ts';

export const HOJA_TAREAS = 'Tareas';

export const COL_TAREAS = {
  id: 'ID',
  /** `AAAA-MM-DD HH:MM`, hora de Chile. Lo pone el servidor. */
  creada: 'Creada',
  /** El nombre de la cuenta que la manda (lo que guarda la sesión, como en las notas). */
  de: 'De',
  /** El nombre de la cuenta que la recibe, o `rol:<rol>` para un rol entero. */
  para: 'Para',
  que: 'Qué hacer',
  /** `AAAA-MM-DD`, o en blanco: sin plazo. */
  plazo: 'Plazo',
  /** Con qué tiene que ver: `cotizacion:<id>`, `reserva:<id>` o `dia:<fecha>`. */
  enlace: 'Enlace',
  estado: 'Estado',
  /** Un renglón por mensaje: `AAAA-MM-DD HH:MM · usuario · tipo · texto`. */
  conversacion: 'Conversación',
  /** Quién la cerró (hecha o anulada), y cuándo. */
  cerradaPor: 'Cerrada por',
  cerrada: 'Cerrada'
} as const;

export const ENCABEZADO_TAREAS: string[] = Object.values(COL_TAREAS);

export const ESTADO_TAREA = {
  pendiente: 'Pendiente',
  /** Quien la recibió preguntó algo: le toca contestar a quien la mandó. */
  pregunta: 'Pregunta',
  hecha: 'Hecha',
  /** Quien la mandó la retiró. */
  anulada: 'Anulada'
} as const;
export type EstadoTarea = (typeof ESTADO_TAREA)[keyof typeof ESTADO_TAREA];

const ESTADOS: string[] = Object.values(ESTADO_TAREA);

/** Lo más largo que se guarda en una tarea o en un mensaje. */
export const LARGO_TAREA = 1000;

/** Los roles que ven todas las tareas, con su filtro por persona. */
export const VEN_TODAS: string[] = [ROL.gerencia, ROL.admin];

/** Los roles a los que se le puede mandar una tarea entera (los que entran al panel). */
export const ROLES_CON_TAREAS: string[] = [ROL.admin, ROL.gerencia, ROL.operaciones, ROL.pagos, ROL.encargado,
  ROL.vendedor];

export interface Mensaje {
  cuando: string;
  quien: string;
  /** `nota` al marcarla hecha, `pregunta`, `respuesta`, `anulada` o `reabierta`. */
  tipo: string;
  texto: string;
}

export interface Tarea {
  id: string;
  creada: string;
  de: string;
  para: string;
  que: string;
  plazo: Fecha | '';
  enlace: string;
  estado: EstadoTarea;
  conversacion: Mensaje[];
  cerradaPor: string;
  cerrada: string;
  fila: number;
}

/* ---------- La conversación, en una celda ---------- */

/** Un mensaje como renglón. El texto no puede traer saltos de línea: son el separador. */
export function renglonDe(m: Mensaje): string {
  const texto = m.texto.replace(/\s*\n+\s*/g, ' ').trim();
  return [m.cuando, m.quien, m.tipo, texto].join(' · ');
}

export function leerConversacion(celda: string): Mensaje[] {
  return String(celda ?? '').split('\n').map((r) => r.trim()).filter(Boolean).map((r) => {
    const [cuando = '', quien = '', tipo = '', ...resto] = r.split(' · ');
    return { cuando, quien, tipo, texto: resto.join(' · ') };
  });
}

/* ---------- La pestaña ---------- */

export function leerTareasDe(filas: string[][]): Tarea[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_TAREAS);
  if (i.para === -1 || i.que === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());
  const salida: Tarea[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const para = en(f, i.para);
    const que = en(f, i.que);
    if (!para || !que) continue;
    const estado = en(f, i.estado);
    const plazo = en(f, i.plazo);
    salida.push({
      id: en(f, i.id) || `fila-${n + 1}`, creada: en(f, i.creada), de: en(f, i.de), para, que,
      plazo: esFecha(plazo) ? plazo : '', enlace: en(f, i.enlace),
      estado: (ESTADOS.includes(estado) ? estado : ESTADO_TAREA.pendiente) as EstadoTarea,
      conversacion: leerConversacion(k(f, i.conversacion)), cerradaPor: en(f, i.cerradaPor), cerrada: en(f, i.cerrada),
      fila: n + 1
    });
  }
  return salida;
  // La conversación conserva sus saltos de línea: no se recorta por dentro.
  function k(f: string[], idx: number) { return idx === -1 ? '' : String(f[idx] ?? ''); }
}

export function filaTarea(encabezado: string[], t: Omit<Tarea, 'fila'>): string[] {
  const i = indices(encabezado, COL_TAREAS);
  const fila = new Array(Math.max(encabezado.length, ENCABEZADO_TAREAS.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i.id, t.id);
  poner(i.creada, t.creada);
  poner(i.de, t.de);
  poner(i.para, t.para);
  poner(i.que, t.que);
  poner(i.plazo, t.plazo);
  poner(i.enlace, t.enlace);
  poner(i.estado, t.estado);
  poner(i.conversacion, t.conversacion.map(renglonDe).join('\n'));
  poner(i.cerradaPor, t.cerradaPor);
  poner(i.cerrada, t.cerrada);
  return fila;
}

export function nuevoIdTarea(): string {
  return `T-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

/* ---------- Para quién ---------- */

const llano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const mismo = (a: string, b: string) => !!a && !!b && llano(a) === llano(b);

/**
 * **Una tarea puede ir a varios a la vez** (2026-11-27, lo pidió el cliente:
 * *"debo poder elegir dos roles a la vez"*, eligió **una sola tarea**, y *"sí
 * mezclar personas y rol"*). Los destinos van en la columna `Para` separados
 * con `|`: un nombre de cuenta o `rol:<rol>` cada uno
 * (`Carmen|rol:pagos`). Le llega a todos y **la cierra el primero**.
 */
export const destinosDe = (para: string): string[] =>
  para.split('|').map((x) => x.trim()).filter(Boolean);
/** Los roles de una tarea: `Carmen|rol:pagos` → `['pagos']`. */
export const rolesDelDestino = (para: string): string[] =>
  destinosDe(para).filter((x) => x.startsWith('rol:')).map((x) => x.slice(4));
/** Las personas de una tarea: `Carmen|rol:pagos` → `['Carmen']`. */
export const personasDelDestino = (para: string): string[] =>
  destinosDe(para).filter((x) => !x.startsWith('rol:'));
/** El primer rol, o `''` si no va a ningún rol. */
export const rolDelDestino = (para: string) => rolesDelDestino(para)[0] ?? '';

export interface Cuenta { usuario: string; rol: string }

/** La recibió: va a su nombre o a su rol. */
export function esParaMi(t: Pick<Tarea, 'para'>, yo: Cuenta): boolean {
  return rolesDelDestino(t.para).includes(yo.rol) || personasDelDestino(t.para).some((p) => mismo(p, yo.usuario));
}

export const laMande = (t: Pick<Tarea, 'de'>, yo: Cuenta) => mismo(t.de, yo.usuario);

/** Las que una cuenta puede ver: las suyas, o todas si es gerencia o administrador. */
export function tareasVisibles<T extends Pick<Tarea, 'para' | 'de'>>(tareas: T[], yo: Cuenta): T[] {
  if (VEN_TODAS.includes(yo.rol)) return tareas;
  return tareas.filter((t) => esParaMi(t, yo) || laMande(t, yo));
}

/** Las de una persona, para el filtro de la gerencia: las que recibió o mandó. */
export function tareasDePersona<T extends Pick<Tarea, 'para' | 'de'>>(tareas: T[], persona: Cuenta): T[] {
  return tareas.filter((t) => esParaMi(t, persona) || laMande(t, persona));
}

/* ---------- Cómo va ---------- */

export const estaAbierta = (t: Pick<Tarea, 'estado'>) =>
  t.estado === ESTADO_TAREA.pendiente || t.estado === ESTADO_TAREA.pregunta;

/** Abierta y con el plazo ya pasado: el día del plazo todavía no está atrasada. */
export const estaAtrasada = (t: Pick<Tarea, 'estado' | 'plazo'>, hoy: Fecha) =>
  estaAbierta(t) && !!t.plazo && t.plazo < hoy;

/**
 * **A quién le toca ahora**: una pendiente, a quien la recibió; una con
 * pregunta, a quien la mandó. Una cerrada, a nadie.
 */
export function leToca(t: Pick<Tarea, 'estado' | 'para' | 'de'>, yo: Cuenta): boolean {
  if (t.estado === ESTADO_TAREA.pendiente) return esParaMi(t, yo);
  if (t.estado === ESTADO_TAREA.pregunta) return laMande(t, yo);
  return false;
}

/**
 * **El orden de la lista**: las abiertas primero —las atrasadas arriba, después
 * por plazo (sin plazo al final) y por la más nueva—, y abajo las cerradas, la
 * más reciente primero.
 */
export function ordenarTareas<T extends Pick<Tarea, 'estado' | 'plazo' | 'creada' | 'cerrada'>>(tareas: T[], hoy: Fecha): T[] {
  const peso = (t: T) => (!estaAbierta(t) ? 2 : estaAtrasada(t, hoy) ? 0 : 1);
  return [...tareas].sort((a, b) => peso(a) - peso(b) ||
    (peso(a) === 2 ? b.cerrada.localeCompare(a.cerrada)
      : (a.plazo || '9999').localeCompare(b.plazo || '9999') || b.creada.localeCompare(a.creada)));
}

/** Lo que dice el contador del menú: las que te tocan ahora. */
export function cuantasMeTocan(tareas: Pick<Tarea, 'estado' | 'para' | 'de' | 'plazo'>[], yo: Cuenta, hoy: Fecha) {
  const mias = tareas.filter((t) => leToca(t, yo));
  return { total: mias.length, atrasadas: mias.filter((t) => estaAtrasada(t, hoy)).length };
}

/* ---------- Crear y responder ---------- */

const ENLACE = /^(cotizacion|reserva):[\w.-]{1,60}$|^dia:\d{4}-\d{2}-\d{2}$/;

/** Un enlace aceptado, o en blanco. */
export function enlaceDe(v: unknown): string {
  const s = String(v ?? '').trim();
  return ENLACE.test(s) ? s : '';
}

/** A dónde lleva un enlace en el panel, y cómo se dice. */
export function destinoDelEnlace(enlace: string): { href: string; texto: string } | null {
  const [tipo, valor] = [enlace.split(':')[0], enlace.slice(enlace.indexOf(':') + 1)];
  if (!valor || !ENLACE.test(enlace)) return null;
  if (tipo === 'dia') return { href: `/dia/${valor}`, texto: `📅 Día ${valor.slice(8, 10)}-${valor.slice(5, 7)}` };
  if (tipo === 'cotizacion') return { href: `/presupuestos?abrir=${encodeURIComponent(valor)}`, texto: `💼 Cotización ${valor}` };
  if (tipo === 'reserva') return { href: `/dia/?reserva=${encodeURIComponent(valor)}`, texto: `🎟 Reserva ${valor}` };
  return null;
}

/**
 * Lo que llega del formulario, revisado: el destinatario tiene que ser una
 * cuenta activa o un rol del panel; el texto no queda vacío; el plazo, de hoy
 * en adelante.
 */
export function limpiarTareaNueva(
  cuerpo: Record<string, unknown>,
  ctx: { cuentas: { usuario: string; activo: boolean }[]; hoy: Fecha }
): { para: string; que: string; plazo: Fecha | ''; enlace: string } | { error: string } {
  const que = String(cuerpo.que ?? '').trim().slice(0, LARGO_TAREA);
  if (!que) return { error: 'Escribe qué hay que hacer.' };
  const brutos = Array.isArray(cuerpo.para) ? cuerpo.para.map(String) : destinosDe(String(cuerpo.para ?? ''));
  const roles = [...new Set(brutos.filter((x) => x.startsWith('rol:')).map((x) => x.slice(4)))];
  if (roles.some((r) => !ROLES_CON_TAREAS.includes(r))) return { error: 'Ese rol no existe en el panel.' };
  const personas: string[] = [];
  for (const b of brutos.filter((x) => !x.startsWith('rol:'))) {
    const c = ctx.cuentas.find((x) => x.activo && mismo(x.usuario, b));
    if (!c) return { error: 'Elige a quién se la mandas.' };
    if (!personas.some((p) => mismo(p, c.usuario))) personas.push(c.usuario);
  }
  if (!personas.length && !roles.length) return { error: 'Elige a quién se la mandas.' };
  // Primero las personas, después los roles en el orden del panel: una sola tarea para todos.
  const para = [...personas, ...ROLES_CON_TAREAS.filter((r) => roles.includes(r)).map((r) => `rol:${r}`)].join('|');
  const plazoBruto = String(cuerpo.plazo ?? '').trim();
  if (plazoBruto && !esFecha(plazoBruto)) return { error: 'El plazo no es una fecha.' };
  if (plazoBruto && plazoBruto < ctx.hoy) return { error: 'El plazo tiene que ser de hoy en adelante.' };
  return { para, que, plazo: (plazoBruto || '') as Fecha | '', enlace: enlaceDe(cuerpo.enlace) };
}

export type AccionTarea = 'hecha' | 'preguntar' | 'responder' | 'anular' | 'reabrir';

/**
 * Qué puede hacer una cuenta con una tarea. **Sobre la suya**, nada más: la
 * gerencia la ve, pero no la marca hecha por otro.
 *
 * - **✓ Hecha** y **❓ Preguntar**: quien la recibió, mientras esté pendiente.
 * - **Responder**: quien la mandó, cuando le preguntaron.
 * - **Anular**: quien la mandó, mientras esté abierta.
 * - **Reabrir**: quien la mandó, si está hecha o anulada (algo quedó a medias).
 */
export function puedeHacer(t: Pick<Tarea, 'estado' | 'para' | 'de'>, yo: Cuenta, accion: AccionTarea): boolean {
  switch (accion) {
    // **Quien la mandó también la da por resuelta** (2026-11-28, lo pidió el
    // cliente: *"debo poder dejar resuelta la tarea que envié… cuando quien
    // tenía la tarea me entregó lo esperado"*): queda hecha, a su nombre.
    case 'hecha': return (esParaMi(t, yo) || laMande(t, yo)) && estaAbierta(t);
    case 'preguntar': return esParaMi(t, yo) && t.estado === ESTADO_TAREA.pendiente;
    case 'responder': return laMande(t, yo) && t.estado === ESTADO_TAREA.pregunta;
    case 'anular': return laMande(t, yo) && estaAbierta(t);
    case 'reabrir': return laMande(t, yo) && !estaAbierta(t);
  }
}

/** La tarea después de la acción, o un error. No escribe nada. */
export function aplicarAccion<T extends Omit<Tarea, 'fila'>>(
  t: T, accion: AccionTarea, texto: string, yo: Cuenta, cuando: string
): T | { error: string } {
  if (!puedeHacer(t, yo, accion)) return { error: 'Esa tarea ya no está para eso: recarga la página.' };
  const limpio = texto.trim().slice(0, LARGO_TAREA);
  if ((accion === 'preguntar' || accion === 'responder') && !limpio) {
    return { error: accion === 'preguntar' ? 'Escribe qué quieres preguntar.' : 'Escribe la respuesta.' };
  }
  const tipo = { hecha: 'nota', preguntar: 'pregunta', responder: 'respuesta', anular: 'anulada', reabrir: 'reabierta' }[accion];
  const conversacion = limpio || accion === 'anular' || accion === 'reabrir' || accion === 'hecha'
    ? [...t.conversacion, { cuando, quien: yo.usuario, tipo, texto: limpio }] : t.conversacion;
  const estado: EstadoTarea = accion === 'hecha' ? ESTADO_TAREA.hecha : accion === 'preguntar' ? ESTADO_TAREA.pregunta
    : accion === 'anular' ? ESTADO_TAREA.anulada : ESTADO_TAREA.pendiente;
  const cierra = accion === 'hecha' || accion === 'anular';
  return { ...t, estado, conversacion, cerradaPor: cierra ? yo.usuario : '', cerrada: cierra ? cuando : '' };
}

/**
 * **✎ Editar** (2026-11-27, lo pidió el cliente: *"no puedo editar la
 * tarea"*): quien la mandó, mientras esté abierta. Quien la recibe ya tiene
 * ❓ Preguntar.
 */
export const puedeEditar = (t: Pick<Tarea, 'estado' | 'de'>, yo: Cuenta) => laMande(t, yo) && estaAbierta(t);

/**
 * La tarea con lo nuevo (ya revisado con `limpiarTareaNueva()`), y en la
 * conversación una línea *cambió la tarea* con qué cambió, para que quien la
 * recibió lo vea. Si no cambió nada, la misma tarea.
 */
export function editarTarea<T extends Omit<Tarea, 'fila'>>(
  t: T, nuevo: { para: string; que: string; plazo: Fecha | ''; enlace: string }, yo: Cuenta, cuando: string
): T | { error: string } {
  if (!puedeEditar(t, yo)) return { error: 'Esa tarea ya no se puede editar: recarga la página.' };
  const cambios = [
    nuevo.que !== t.que ? 'qué hacer' : '',
    nuevo.para !== t.para ? 'para quién' : '',
    nuevo.plazo !== t.plazo ? (nuevo.plazo ? `el plazo (${nuevo.plazo.slice(8, 10)}-${nuevo.plazo.slice(5, 7)})` : 'el plazo (sin plazo)') : '',
    nuevo.enlace !== t.enlace ? 'el día' : ''
  ].filter(Boolean);
  if (!cambios.length) return t;
  return { ...t, ...nuevo, conversacion: [...t.conversacion, { cuando, quien: yo.usuario, tipo: 'cambio', texto: cambios.join(', ') }] };
}
