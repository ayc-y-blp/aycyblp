/**
 * **Qué cambió al corregir un día cerrado, dicho con palabras** (2026-11-21).
 *
 * Lo pidió el cliente con una foto de la ventana: *"sobra este motivo de la
 * corrección… el que entra con su cuenta y cambia algo —pone un adelanto y
 * pone la marca adelanto— ya se puede ver después por qué se hizo. En vez de
 * escribir, haz una casilla, confirmar, y luego la lista de los cambios que
 * aplicaste. Y luego guardar."*
 *
 * Hasta ese día, corregir un día cerrado pedía escribir un motivo, y ese
 * texto libre era lo que quedaba en la bitácora. Pero cada cambio ya trae su
 * porqué —un ajuste lleva su motivo y cómo se pagó; *de No vino a Vino* se
 * explica solo—, así que el motivo era escribir de nuevo lo que la pantalla
 * ya sabía. Ahora **la lista de cambios la arma el panel**, se muestra antes
 * de guardar con una casilla para confirmarla, y **esa lista es lo que queda
 * en la bitácora**, a nombre de quien corrigió.
 *
 * Es pura y tiene pruebas: compara el día como estaba con el día como queda.
 * La usan la ventana del equipo y la de las actividades extras.
 */
import { VINO, type Ajuste, type Turno } from './equipo.ts';
import { ajustesDe, type Extra } from './extras.ts';
import { enPalabras } from './fechas.ts';
import { pagoEnEspanol } from './pagos.ts';

const pesos = (n: number) => '$' + Math.abs(Math.round(n)).toLocaleString('es-CL');
const llano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
/** Cómo se dice una asistencia: la del equipo, la de un extra y la de una reserva. */
export const asistenciaEnPalabras = (v: string) => (v === VINO.si ? 'Vino' : v === VINO.no ? 'No vino' : 'sin marcar');

/** Un ajuste, como se lee en su línea: *un descuento de $4.000 (Adelanto · Transferencia)*. */
const ajusteEnPalabras = (a: Ajuste) =>
  `${a.monto < 0 ? 'un descuento' : 'una suma'} de ${pesos(a.monto)}${a.motivo.trim() ? ` (${a.motivo.trim()})` : ''}`;

/**
 * Los ajustes que se agregaron y los que se quitaron. Se comparan por monto
 * y motivo: uno al que se le cambió el monto sale como uno quitado y otro
 * agregado, que es lo que pasó.
 */
function cambiosDeAjustes(antes: Ajuste[], despues: Ajuste[]): string[] {
  const llave = (a: Ajuste) => `${Math.round(a.monto)}|${a.motivo.trim()}`;
  const vale = (a: Ajuste) => !!a.monto || !!a.motivo.trim();
  const quedan = antes.filter(vale).map(llave);
  const nuevos: Ajuste[] = [];
  for (const a of despues.filter(vale)) {
    const i = quedan.indexOf(llave(a));
    if (i === -1) nuevos.push(a); else quedan.splice(i, 1);
  }
  const quitados = antes.filter(vale).filter((a) => {
    const i = quedan.indexOf(llave(a));
    if (i === -1) return false;
    quedan.splice(i, 1);
    return true;
  });
  return [
    ...nuevos.map((a) => `se agregó ${ajusteEnPalabras(a)}`),
    ...quitados.map((a) => `se quitó ${ajusteEnPalabras(a)}`)
  ];
}

type TurnoDelDia = Pick<Turno, 'trabajador' | 'puesto' | 'asistencia' | 'pagoJornada' | 'horasExtra' | 'valorHora' | 'ajustes'>;

/**
 * Los cambios en el equipo de un día: quién entró o salió, la asistencia, el
 * puesto, la jornada, las horas extra, los ajustes y la propina del día.
 *
 * La propina se compara por el total del día, que es lo que se escribe: la
 * parte de cada uno es una consecuencia y listarla repetiría el mismo cambio
 * una vez por persona.
 */
export function cambiosDelEquipo(
  antes: TurnoDelDia[], despues: TurnoDelDia[], propinaAntes = 0, propinaDespues = 0
): string[] {
  const cambios: string[] = [];
  const era = new Map(antes.map((t) => [llano(t.trabajador), t]));
  const es = new Map(despues.map((t) => [llano(t.trabajador), t]));
  for (const t of despues) {
    const a = era.get(llano(t.trabajador));
    if (!a) {
      cambios.push(`${t.trabajador}: se agregó al día, en ${t.puesto || 'sin puesto'}`
        + (t.asistencia ? ` (${asistenciaEnPalabras(t.asistencia)})` : ''));
      for (const c of cambiosDeAjustes([], t.ajustes ?? [])) cambios.push(`${t.trabajador}: ${c}`);
      continue;
    }
    const de: string[] = [];
    if (a.asistencia !== t.asistencia) {
      de.push(`de ${asistenciaEnPalabras(a.asistencia)} a ${asistenciaEnPalabras(t.asistencia)}`);
    }
    if (llano(a.puesto) !== llano(t.puesto)) de.push(`de ${a.puesto || 'sin puesto'} a ${t.puesto || 'sin puesto'}`);
    if ((a.pagoJornada || 0) !== (t.pagoJornada || 0)) {
      de.push(`jornada de ${pesos(a.pagoJornada || 0)} a ${pesos(t.pagoJornada || 0)}`);
    }
    if ((a.horasExtra || 0) !== (t.horasExtra || 0)) de.push(`horas extra de ${a.horasExtra || 0} a ${t.horasExtra || 0}`);
    // El valor de la hora solo importa si hay horas: si no, no cambia nada que se pague.
    if ((a.valorHora || 0) !== (t.valorHora || 0) && (t.horasExtra || 0) > 0) {
      de.push(`valor de la hora extra de ${pesos(a.valorHora || 0)} a ${pesos(t.valorHora || 0)}`);
    }
    de.push(...cambiosDeAjustes(a.ajustes ?? [], t.ajustes ?? []));
    for (const c of de) cambios.push(`${t.trabajador}: ${c}`);
  }
  for (const a of antes) if (!es.has(llano(a.trabajador))) cambios.push(`${a.trabajador}: se sacó del día`);
  if (Math.round(propinaAntes) !== Math.round(propinaDespues)) {
    cambios.push(`Propina del día: de ${pesos(propinaAntes)} a ${pesos(propinaDespues)}`);
  }
  return cambios;
}

type ExtraDelDia = Pick<Extra, 'colaborador' | 'actividad' | 'estado' | 'monto' | 'ajuste' | 'motivo'> & { ajustes?: Ajuste[] };

/** Los cambios en las actividades extras de un día. */
export function cambiosDeExtras(antes: ExtraDelDia[], despues: ExtraDelDia[]): string[] {
  const cambios: string[] = [];
  const era = new Map(antes.map((e) => [llano(e.colaborador), e]));
  const es = new Map(despues.map((e) => [llano(e.colaborador), e]));
  for (const e of despues) {
    const a = era.get(llano(e.colaborador));
    if (!a) {
      cambios.push(`${e.colaborador}: se agregó al día${e.actividad ? `, con ${e.actividad}` : ''}`
        + (e.estado ? ` (${asistenciaEnPalabras(e.estado)})` : ''));
      for (const c of cambiosDeAjustes([], ajustesDe(e))) cambios.push(`${e.colaborador}: ${c}`);
      continue;
    }
    const de: string[] = [];
    if (a.estado !== e.estado) de.push(`de ${asistenciaEnPalabras(a.estado)} a ${asistenciaEnPalabras(e.estado)}`);
    if (llano(a.actividad) !== llano(e.actividad)) de.push(`actividad de ${a.actividad || 'sin actividad'} a ${e.actividad || 'sin actividad'}`);
    if ((a.monto || 0) !== (e.monto || 0)) de.push(`monto de ${pesos(a.monto || 0)} a ${pesos(e.monto || 0)}`);
    de.push(...cambiosDeAjustes(ajustesDe(a), ajustesDe(e)));
    for (const c of de) cambios.push(`${e.colaborador}: ${c}`);
  }
  for (const a of antes) if (!es.has(llano(a.colaborador))) cambios.push(`${a.colaborador}: se sacó del día`);
  return cambios;
}

/** La asistencia de una reserva que se cambió durante la corrección. */
export const cambioDeReserva = (quien: string, antes: string, despues: string) =>
  `Reserva de ${quien || 'sin nombre'}: de ${asistenciaEnPalabras(antes)} a ${asistenciaEnPalabras(despues)}`;

/**
 * **Una reserva de un día cerrado, antes y después** (2026-11-21, lo decidió
 * el cliente: lo mismo que la corrección del equipo, también al editar y al
 * borrar una reserva). Lo que el formulario de una reserva puede cambiar.
 *
 * `menu` viene ya compuesto (*"2 × Tradiciones + 1 × Niños"*) de la misma
 * forma en los dos lados: el formulario lo arma con `componerMenu()`.
 */
export type ReservaEnCorreccion = {
  fecha: string; nombre: string; menu: string; personas: number; monto: number | null;
  estadoPago: string; abonado?: number | null; notaPago?: string;
  telefono?: string; email?: string;
};

const quienDe = (r: { nombre: string }) => r.nombre.trim() || 'sin nombre';
const montoEnPalabras = (n: number | null | undefined) => (n ? pesos(n) : 'sin monto');
const gente = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`;
/** *4 personas · 2 × Tradiciones + 2 × Niños · $126.000 · Por pagar*. */
const reservaEnPalabras = (r: ReservaEnCorreccion) => [
  gente(r.personas), r.menu.trim(), r.monto ? pesos(r.monto) : '', pagoEnEspanol(r.estadoPago)
].filter(Boolean).join(' · ');

/**
 * Qué cambia al guardar el formulario de una reserva en un día cerrado. Sin
 * `antes`, la reserva es nueva y es un solo cambio.
 *
 * **El teléfono y el correo se nombran sin su valor**: la lista queda en la
 * bitácora, y el contacto de un cliente no lo ve cualquier cuenta
 * (`privacidad.ts`).
 */
export function cambiosDeLaReserva(antes: ReservaEnCorreccion | null, despues: ReservaEnCorreccion): string[] {
  if (!antes) return [`Se agrega la reserva de ${quienDe(despues)}: ${reservaEnPalabras(despues)}`];
  const c: string[] = [];
  const igual = (a?: string, b?: string) => (a ?? '').trim() === (b ?? '').trim();
  if (!igual(antes.nombre, despues.nombre)) c.push(`el nombre pasa a ${quienDe(despues)}`);
  if (antes.fecha !== despues.fecha) c.push(`se mueve del ${enPalabras(antes.fecha)} al ${enPalabras(despues.fecha)}`);
  if (!igual(antes.menu, despues.menu)) {
    c.push(`menús de ${antes.menu.trim() || 'ninguno'} a ${despues.menu.trim() || 'ninguno'}`
         + (antes.personas !== despues.personas ? ` (de ${gente(antes.personas)} a ${gente(despues.personas)})` : ''));
  } else if (antes.personas !== despues.personas) c.push(`de ${gente(antes.personas)} a ${gente(despues.personas)}`);
  if ((antes.monto ?? 0) !== (despues.monto ?? 0)) {
    c.push(`monto de ${montoEnPalabras(antes.monto)} a ${montoEnPalabras(despues.monto)}`);
  }
  if (!igual(antes.estadoPago, despues.estadoPago)) {
    c.push(`pago de ${pagoEnEspanol(antes.estadoPago)} a ${pagoEnEspanol(despues.estadoPago)}`);
  }
  if ((antes.abonado ?? 0) !== (despues.abonado ?? 0)) {
    c.push(`abono de ${montoEnPalabras(antes.abonado)} a ${montoEnPalabras(despues.abonado)}`);
  }
  if (!igual(antes.notaPago, despues.notaPago)) {
    c.push(despues.notaPago?.trim() ? `nota de pago: ${despues.notaPago.trim()}` : 'se borró la nota de pago');
  }
  if (!igual(antes.telefono, despues.telefono)) c.push('cambió el teléfono');
  if (!igual(antes.email, despues.email)) c.push('cambió el correo');
  return c.map((x) => `Reserva de ${quienDe(antes)}: ${x}`);
}

/** Borrar una reserva de un día cerrado: un solo cambio, con lo que era. */
export const cambioDeBorrarReserva = (r: ReservaEnCorreccion) =>
  `Se borra la reserva de ${quienDe(r)}: ${reservaEnPalabras(r)}`;

/**
 * **Una cotización ganada cuya reserva está en un día cerrado** (2026-11-21,
 * lo decidió el cliente: *"sí, también debería poder corregirse"*). Guardarla
 * reescribe su reserva, así que es corregir ese día: la misma lista con su
 * casilla. Hasta ese día el servidor la rechazaba y la ventana de cotizar no
 * tenía dónde confirmar nada.
 *
 * Lo que se compara es lo que la ventana manda al guardar:
 *
 * - `cliente`, `fecha`, `invitados`, `total` y `lineas` van con su valor: son
 *   lo que cambia la reserva (quién, qué día, cuánta gente y cuánto).
 * - `datos` son datos cortos que se dicen con su valor —*documento de Boleta
 *   a Factura*—: el rótulo y el valor en palabras.
 * - `otros` se nombran **sin su valor** —*cambiaron las notas*—: son textos
 *   largos o datos de la ficha del cliente (RUT, domicilio), que no van a la
 *   bitácora. Cada uno es la frase que se dice si cambió y una huella para
 *   compararlo.
 */
export type LineaEnCorreccion = {
  concepto: string; cantidad: number; precio: number; descuento: number;
  /** Qué incluye y sus bebestibles, juntos (2026-11-24): se nombra sin su valor, como las notas. */
  texto?: string;
};
export type CotizacionEnCorreccion = {
  cliente: string; fecha: string; invitados: number; total: number;
  lineas: LineaEnCorreccion[];
  datos: [rotulo: string, valor: string][];
  otros: [frase: string, huella: string][];
};

/** *36 × $49.000*; lo que va incluido —el show en un día público— es *sin costo*. */
const lineaEnPalabras = (l: LineaEnCorreccion) => (!l.precio
  ? (l.cantidad > 1 ? `${l.cantidad}, sin costo` : 'sin costo')
  : `${l.cantidad} × ${pesos(l.precio)}${l.descuento ? ` con ${l.descuento}% de descuento` : ''}`);

/** Qué cambia al guardar una cotización ganada. Vacío si no cambió nada. */
export function cambiosDeLaCotizacion(antes: CotizacionEnCorreccion, despues: CotizacionEnCorreccion): string[] {
  const c: string[] = [];
  if (llano(antes.cliente) !== llano(despues.cliente)) c.push(`el cliente pasa a ${quienDe({ nombre: despues.cliente })}`);
  if (antes.fecha !== despues.fecha) c.push(`se mueve del ${enPalabras(antes.fecha)} al ${enPalabras(despues.fecha)}`);
  if (antes.invitados !== despues.invitados) c.push(`de ${antes.invitados} invitados a ${despues.invitados}`);

  // Las líneas, por producto: un producto va una sola vez en una cotización.
  const era = new Map(antes.lineas.map((l) => [llano(l.concepto), l]));
  const es = new Set(despues.lineas.map((l) => llano(l.concepto)));
  for (const l of despues.lineas) {
    const a = era.get(llano(l.concepto));
    if (!a) { c.push(`se agregó ${l.concepto}: ${lineaEnPalabras(l)}`); continue; }
    const de: string[] = [];
    if (a.cantidad !== l.cantidad) de.push(`cantidad de ${a.cantidad} a ${l.cantidad}`);
    if (Math.round(a.precio) !== Math.round(l.precio)) de.push(`precio de ${pesos(a.precio)} a ${pesos(l.precio)}`);
    if ((a.descuento || 0) !== (l.descuento || 0)) de.push(`descuento de ${a.descuento || 0}% a ${l.descuento || 0}%`);
    if ((a.texto ?? '').trim() !== (l.texto ?? '').trim()) de.push('cambió qué incluye');
    if (de.length) c.push(`${l.concepto}: ${de.join(', ')}`);
  }
  for (const a of antes.lineas) if (!es.has(llano(a.concepto))) c.push(`se quitó ${a.concepto} (${lineaEnPalabras(a)})`);

  const valorDe = (lista: [string, string][], k: string) => lista.find(([r]) => r === k)?.[1] ?? '';
  const dicho = (v: string) => v.trim() || 'sin definir';
  for (const [rotulo, valor] of despues.datos) {
    const previo = valorDe(antes.datos, rotulo);
    if (previo.trim() !== valor.trim()) c.push(`${rotulo} de ${dicho(previo)} a ${dicho(valor)}`);
  }
  if (Math.round(antes.total) !== Math.round(despues.total)) {
    c.push(`total de ${pesos(antes.total)} a ${pesos(despues.total)}`);
  }
  for (const [frase, huella] of despues.otros) {
    if (valorDe(antes.otros, frase) !== huella) c.push(frase);
  }
  // **Sin "Cotización de…" delante de cada renglón**: la ventana ya dice de
  // quién es y la bitácora lleva su número. Con el nombre repetido, *Cotización
  // de X: Tradiciones: cantidad de 36 a 39* se leía peor que el cambio solo.
  return c.map((x) => x.charAt(0).toUpperCase() + x.slice(1));
}

/** Hasta cuánto texto de cambios se manda y se guarda en la bitácora. */
export const LARGO_MAXIMO_CAMBIOS = 900;

/**
 * La lista, en un solo texto para la bitácora. Si es muy larga se corta en
 * un cambio entero y dice cuántos más hubo: una celda de la planilla no es
 * lugar para un día reescrito completo.
 */
export function textoDeCambios(cambios: string[]): string {
  const partes: string[] = [];
  let largo = 0;
  for (const c of cambios) {
    if (partes.length && largo + c.length + 2 > LARGO_MAXIMO_CAMBIOS) break;
    partes.push(c);
    largo += c.length + 2;
  }
  const faltan = cambios.length - partes.length;
  return partes.join('; ') + (faltan > 0 ? `; y ${faltan} ${faltan === 1 ? 'cambio' : 'cambios'} más` : '');
}
