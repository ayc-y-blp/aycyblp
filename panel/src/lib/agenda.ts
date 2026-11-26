/**
 * **La agenda del vendedor** (2026-11-23, lo pidió el cliente: *"cómo
 * organiza sus recontactos para un posible cliente… poder elegir en qué
 * fecha recontactar al cliente… y que muestra las cotizaciones que se
 * deberían redactar y su fecha límite"*). Decidido con él el mismo día:
 * **Esperando respuesta se fusiona acá** (era la misma pregunta: ¿a quién
 * tengo que volver a hablarle?) y **el plazo para redactar lo elige el
 * vendedor**, sin un valor por defecto.
 *
 * Dos listas, una fila por grupo de alternativas:
 *
 * - **📞 Contactar**: el día que el vendedor eligió al anotar
 *   (`Recontactar el`) o, si no eligió, el recordatorio de siempre de una
 *   cotización mandada (`seguimientoDe()`: sin respuesta a los N días, el
 *   evento cerca sin ganar, el contrato que no vuelve firmado).
 * - **✍ Por redactar**: los candidatos y borradores, con el día para el que
 *   se prometió la cotización (`Redactar antes del`). Se cumple al mandarla.
 *
 * Puro y con pruebas.
 */
import {
  seguimientoDe, estadoNormal, estaMandada, pasoElEvento, ESTADO_PRESUPUESTO, type Presupuesto
} from './presupuestos.ts';
import { grupoDe, enCarrera } from './cotizar.ts';
import { esFecha, sumarDias, enCorto, type Fecha } from './fechas.ts';

/** Cuántos días hacia adelante mira la agenda. */
export const HORIZONTE = 7;

export type MotivoContacto = 'elegida' | 'eventoCerca' | 'sinRespuesta' | 'contratoSinFirmar';

export interface Contacto {
  fecha: Fecha;
  motivo: MotivoContacto;
  /** Lo que dice `seguimientoDe()` (días sin respuesta, días al evento…). En `elegida`, 0. */
  dias: number;
}

type Cfg = { seguimientoDias: number; avisoEvento: number };

const CERRADAS: string[] = [ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida, ESTADO_PRESUPUESTO.cancelada];

/** Días de `desde` a `hasta`, con signo, contando fechas de texto. */
export function diasEntre(desde: Fecha, hasta: Fecha): number {
  if (!esFecha(desde) || !esFecha(hasta) || desde === hasta) return 0;
  const signo = hasta > desde ? 1 : -1;
  let n = 0;
  let f = desde;
  while (f !== hasta && Math.abs(n) < 4000) { f = sumarDias(f, signo); n += signo; }
  return n;
}

/**
 * **Cuándo toca hablarle a este cliente**, por esta cotización, o `null`.
 *
 * - **Lo que el vendedor eligió manda**: si anotó *"lo llamo el jueves"*, el
 *   jueves. Una ganada cuyo evento ya pasó no se recuerda.
 * - **Si no eligió**, el recordatorio de siempre de una mandada: el primer
 *   día, de hoy a `HORIZONTE` días, en que `seguimientoDe()` pregunta. Si
 *   ya pregunta hoy, es hoy.
 * - Una perdida, no elegida o cancelada, nunca.
 */
export function proximoContacto(p: Presupuesto, hoy: Fecha, cfg: Cfg): Contacto | null {
  if (CERRADAS.includes(estadoNormal(p.estado))) return null;
  // Pasado su evento se cayó sola (2026-11-26): no hay a quién contactar.
  if (pasoElEvento(p, hoy)) return null;
  if (esFecha(p.recontactar)) {
    const elegida = recontactoDe(p, hoy);
    return elegida ? { fecha: elegida, motivo: 'elegida', dias: 0 } : null;
  }
  for (let i = 0; i <= HORIZONTE; i++) {
    const d = sumarDias(hoy, i);
    const s = seguimientoDe(p, d, cfg);
    if (s) return { fecha: d, motivo: s.motivo, dias: s.dias };
  }
  return null;
}

/**
 * **El día que el vendedor quedó en volver a contactarlo** (`Recontactar el`),
 * si sigue valiendo, o `''`. Es lo que muestra la pastilla *📞* en la Lista,
 * en la ficha del cliente y en la tarjeta *📞 Recontactar* (2026-11-25): no el
 * recordatorio automático, solo el día elegido. Una perdida, no elegida o
 * cancelada no lo tiene, ni una cuyo evento ya pasó: la ganada ya se hizo, y
 * la que no se ganó se cayó sola (2026-11-26).
 */
export function recontactoDe(
  p: Pick<Presupuesto, 'estado' | 'recontactar' | 'idReserva' | 'fecha'>, hoy: Fecha
): Fecha | '' {
  if (CERRADAS.includes(estadoNormal(p.estado))) return '';
  if (!esFecha(p.recontactar)) return '';
  if (esFecha(p.fecha) && p.fecha < hoy) return '';
  return p.recontactar as Fecha;
}

/**
 * **Lo que dice la pastilla 📞** (2026-11-25): atrasado en rojo, hoy en ámbar
 * y un día que viene en gris. Pura, para que la Lista, Clientes y la ventana
 * digan lo mismo.
 */
export function textoContacto(fecha: Fecha, hoy: Fecha): { texto: string; cuando: Exclude<Cuando, 'sinPlazo'> } {
  const cuando = cuandoEs(fecha, hoy);
  if (cuando === 'atrasado') {
    const n = -diasEntre(hoy, fecha);
    return { texto: `Contactar: atrasado ${n} ${n === 1 ? 'día' : 'días'}`, cuando };
  }
  if (cuando === 'hoy') return { texto: 'Contactar hoy', cuando };
  return { texto: `Contactar el ${enCorto(fecha)}`, cuando: 'proximo' };
}

/** Atrasado, hoy, en los próximos días, o sin plazo (un borrador sin fecha prometida). */
export type Cuando = 'atrasado' | 'hoy' | 'proximo' | 'sinPlazo';

export function cuandoEs(fecha: Fecha | '', hoy: Fecha): Cuando {
  if (!esFecha(fecha)) return 'sinPlazo';
  return fecha < hoy ? 'atrasado' : fecha === hoy ? 'hoy' : 'proximo';
}

export interface ItemAgenda {
  /** La cotización del grupo que manda en esta fila. */
  p: Presupuesto;
  tipo: 'contactar' | 'redactar';
  /** El día; vacío en un borrador sin plazo. */
  fecha: Fecha | '';
  cuando: Cuando;
  motivo?: MotivoContacto;
  dias: number;
}

/** Si el grupo todavía no se mandó: candidatos y borradores en carrera, ninguna mandada ni ganada. */
function porMandar(grupo: Presupuesto[], hoy: Fecha): Presupuesto[] {
  if (grupo.some((x) => x.idReserva || estaMandada(x.estado))) return [];
  return grupo.filter((x) => enCarrera(x, hoy));
}

/**
 * **La agenda de una lista de cotizaciones**: una fila por grupo en cada
 * lista, lo atrasado primero. Contactar mira hasta `HORIZONTE` días; por
 * redactar trae todos los que esperan, los sin plazo al final.
 */
export function agendaDe(lista: Presupuesto[], hoy: Fecha, cfg: Cfg): { contactar: ItemAgenda[]; redactar: ItemAgenda[] } {
  const grupos = new Map<string, Presupuesto[]>();
  for (const p of lista) {
    const g = grupoDe(p);
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g)!.push(p);
  }
  const hasta = sumarDias(hoy, HORIZONTE);
  const contactar: ItemAgenda[] = [];
  const redactar: ItemAgenda[] = [];
  for (const grupo of grupos.values()) {
    let mejor: ItemAgenda | null = null;
    for (const p of grupo) {
      const c = proximoContacto(p, hoy, cfg);
      if (!c || c.fecha > hasta) continue;
      if (!mejor || c.fecha < mejor.fecha) {
        mejor = { p, tipo: 'contactar', fecha: c.fecha, cuando: cuandoEs(c.fecha, hoy), motivo: c.motivo, dias: c.dias };
      }
    }
    if (mejor) contactar.push(mejor);
    const abiertas = porMandar(grupo, hoy);
    if (abiertas.length) {
      const plazos = abiertas.map((x) => x.redactarAntes ?? '').filter(esFecha).sort();
      const fecha = plazos[0] ?? '';
      const p = abiertas.find((x) => (x.redactarAntes ?? '') === fecha) ?? abiertas[0];
      redactar.push({ p, tipo: 'redactar', fecha, cuando: cuandoEs(fecha, hoy), dias: 0 });
    }
  }
  const urgencia = (m?: MotivoContacto) => (m === 'eventoCerca' ? 0 : m === 'contratoSinFirmar' ? 1 : 2);
  const porNombre = (a: ItemAgenda, b: ItemAgenda) =>
    String(a.p.cliente ?? '').localeCompare(String(b.p.cliente ?? ''), 'es', { sensitivity: 'base' });
  contactar.sort((a, b) => a.fecha.localeCompare(b.fecha) || urgencia(a.motivo) - urgencia(b.motivo) || porNombre(a, b));
  redactar.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || porNombre(a, b));
  return { contactar, redactar };
}

/** Lo que toca hoy (o ya se atrasó), de las dos listas. */
export const paraHoy = (x: ItemAgenda) => x.cuando === 'atrasado' || x.cuando === 'hoy';

/** Cuántas filas tocan hoy y cuántas de ellas están atrasadas. */
export function cuentasDeHoy(a: { contactar: ItemAgenda[]; redactar: ItemAgenda[] }): { hoy: number; atrasadas: number; semana: number } {
  const todas = [...a.contactar, ...a.redactar];
  return {
    hoy: todas.filter(paraHoy).length,
    atrasadas: todas.filter((x) => x.cuando === 'atrasado').length,
    semana: a.contactar.filter((x) => x.cuando === 'proximo').length
      + a.redactar.filter((x) => x.cuando === 'proximo').length
  };
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * **La frase de cada fila**, corta y con su tono: lo que hay que hacer y
 * desde cuándo. Las de un recordatorio automático dicen lo mismo que decía
 * *Esperando respuesta*.
 */
export function fraseDe(x: ItemAgenda, hoy: Fecha): { texto: string; tono: 'rojo' | 'ambar' | 'neutro' } {
  // **El día elegido para recontactarlo, como la pastilla 📞** (2026-11-25, lo
  // decidió el cliente: *"sí, rojo desde el día"*): ámbar hasta ese día y rojo
  // desde ese día. Lo demás —lo prometido, los recordatorios— sigue igual:
  // ámbar hoy, rojo atrasado.
  const tono = x.motivo === 'elegida' && x.cuando !== 'sinPlazo'
    ? (x.cuando === 'proximo' ? 'ambar' : 'rojo')
    : x.cuando === 'atrasado' ? 'rojo' : x.cuando === 'hoy' ? 'ambar' : 'neutro';
  if (x.tipo === 'redactar') {
    if (x.cuando === 'sinPlazo') return { texto: 'Sin plazo para mandarla', tono: 'neutro' };
    if (x.cuando === 'atrasado') {
      return { texto: `Prometiste mandarla el ${enCorto(x.fecha as Fecha)} (hace ${plural(-diasEntre(hoy, x.fecha as Fecha), 'día', 'días')})`, tono };
    }
    return { texto: x.cuando === 'hoy' ? 'Prometiste mandarla hoy' : `Mandarla antes del ${enCorto(x.fecha as Fecha)}`, tono };
  }
  if (x.cuando === 'proximo') {
    const dia = enCorto(x.fecha as Fecha);
    if (x.motivo === 'elegida') return { texto: `Contactar el ${dia}`, tono };
    if (x.motivo === 'eventoCerca') return { texto: `El ${dia} te pregunto si se ganó: el evento se acerca`, tono };
    if (x.motivo === 'contratoSinFirmar') return { texto: `El ${dia} te pregunto por el contrato firmado`, tono };
    return { texto: `El ${dia} te pregunto si respondió`, tono };
  }
  if (x.motivo === 'elegida') {
    return { texto: x.cuando === 'hoy' ? 'Quedaste en contactarlo hoy'
      : `Quedaste en contactarlo el ${enCorto(x.fecha as Fecha)} (hace ${plural(-diasEntre(hoy, x.fecha as Fecha), 'día', 'días')})`, tono };
  }
  if (x.motivo === 'eventoCerca') {
    return { texto: x.dias === 0 ? 'El evento es hoy: ¿se ganó o se perdió?'
      : `Faltan ${plural(x.dias, 'día', 'días')} para el evento: ¿se ganó o se perdió?`, tono: 'rojo' };
  }
  if (x.motivo === 'contratoSinFirmar') {
    return { texto: `Le mandaste el contrato hace ${plural(x.dias, 'día', 'días')}: ¿te lo devolvió firmado?`, tono };
  }
  return { texto: `Mandada hace ${plural(x.dias, 'día', 'días')} sin respuesta`, tono };
}

/**
 * **Los botones rápidos de una fecha**: mañana, en 3 días, en una semana.
 * Un día que no sea antes de hoy y, si hay evento, no después de él.
 */
export const RAPIDAS = [
  { clave: 'manana', rotulo: 'Mañana', dias: 1 },
  { clave: 'tres', rotulo: 'En 3 días', dias: 3 },
  { clave: 'semana', rotulo: 'En una semana', dias: 7 }
] as const;

export function fechaRapida(dias: number, hoy: Fecha): Fecha {
  return sumarDias(hoy, dias);
}

/**
 * Lo que se acepta como fecha de la agenda: una fecha de hoy en adelante, o
 * nada. El servidor la vuelve a mirar: el navegador puede tener otro día.
 */
export function fechaDeAgenda(v: unknown, hoy: Fecha): Fecha | '' | null {
  const s = String(v ?? '').trim().slice(0, 10);
  if (!s) return '';
  if (!esFecha(s) || s < hoy) return null;
  return s;
}
