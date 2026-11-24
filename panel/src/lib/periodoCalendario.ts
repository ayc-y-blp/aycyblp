/**
 * **Lo que muestra un calendario de semanas** (2026-11-24): *Lo que viene*
 * —desde la semana en curso, como siempre—, una *Semana* o un *Mes*, con
 * ◀ ▶ hacia atrás y hacia adelante. Lo pidió el cliente para Reservas
 * (*"igual se tiene que poder revisar las reservas del pasado"*) y el mismo
 * día para Cotizaciones (*"aplícalo para cotizaciones también"*). La pieza
 * que lo dibuja es `ElegirPeriodo`; esto es la cuenta, pura y con pruebas,
 * para que los dos calendarios se muevan igual.
 */
import { semanaDe, sumarDias, sumarMeses, diasDelMes, mesDe, rangoEnPalabras, mesEnPalabras } from './fechas.ts';

export type ModoCalendario = 'viene' | 'semana' | 'mes';
/** `en` es el lunes de la semana (`AAAA-MM-DD`) o el mes (`AAAA-MM`); en *Lo que viene*, vacío. */
export interface PeriodoCalendario { modo: ModoCalendario; en: string }

export const LO_QUE_VIENE: PeriodoCalendario = { modo: 'viene', en: '' };
export const MODOS_CALENDARIO = [
  { clave: 'viene', rotulo: 'Lo que viene' }, { clave: 'semana', rotulo: 'Semana' }, { clave: 'mes', rotulo: 'Mes' }
];

/** Las fechas de una semana o un mes; *Lo que viene*, ninguna: cada calendario usa su ventana de siempre. */
export function rangoDelPeriodo(p: PeriodoCalendario): { desde: string; hasta: string } | null {
  if (p.modo === 'semana') return { desde: p.en, hasta: sumarDias(p.en, 6) };
  if (p.modo === 'mes') { const d = diasDelMes(p.en); return { desde: d[0], hasta: d[d.length - 1] }; }
  return null;
}

/**
 * **Pasar a otro modo**: *Semana* parte en la semana en curso, o en la primera
 * del mes que se miraba si no es el de hoy; *Mes*, en el mes en curso, o en el
 * de la semana que se miraba.
 */
export function cambiarModo(p: PeriodoCalendario, clave: string, hoy: string): PeriodoCalendario {
  if (clave === 'semana') {
    return { modo: 'semana', en: p.modo === 'mes' && p.en !== mesDe(hoy) ? semanaDe(`${p.en}-01`) : semanaDe(hoy) };
  }
  if (clave === 'mes') return { modo: 'mes', en: p.modo === 'semana' ? mesDe(p.en) : mesDe(hoy) };
  return LO_QUE_VIENE;
}

/** ◀ ▶: una semana o un mes. En *Lo que viene* no hay flechas. */
export function moverPeriodo(p: PeriodoCalendario, n: -1 | 1): PeriodoCalendario {
  if (p.modo === 'semana') return { modo: 'semana', en: sumarDias(p.en, 7 * n) };
  if (p.modo === 'mes') return { modo: 'mes', en: sumarMeses(p.en, n) };
  return p;
}

/** *17 – 23 de noviembre*, *Octubre 2026*; sin título no hay flechas. */
export function tituloDelPeriodo(p: PeriodoCalendario): string | undefined {
  if (p.modo === 'semana') return rangoEnPalabras([p.en, sumarDias(p.en, 6)]);
  if (p.modo === 'mes') return mesEnPalabras(p.en);
  return undefined;
}

/** Los lunes de las semanas que tocan un periodo de semana o mes, en orden. */
export function lunesDelPeriodo(p: PeriodoCalendario): string[] {
  const r = rangoDelPeriodo(p);
  if (!r) return [];
  const salida: string[] = [];
  for (let l = semanaDe(r.desde); l <= r.hasta; l = sumarDias(l, 7)) salida.push(l);
  return salida;
}
