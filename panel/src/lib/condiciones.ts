/**
 * **Lo que un vendedor puede prometer, y los plazos contra la fecha de hoy**
 * (2026-11-23, lo pidió el cliente: *"revises toda la lógica dentro de
 * cotizaciones y el contrato de las fechas límites que se pueden configurar y
 * compararlo a la fecha actual para que el vendedor no puede hacer ciertas
 * promesas de devolución de dinero… si ya está muy encima de la fecha"*). Dos
 * reglas:
 *
 * **Regla A — el vendedor ofrece igual o menos que Configuración, nunca
 * más** (*"aplica regla A tal cual, pero deja la opción… de solicitar otro
 * monto… y ahí tiene que confirmar la gerencia o el encargado de pagos"*).
 * Cada condición tiene un tope (`topesDe()`) y un sentido: el anticipo y los
 * días del saldo no bajan; los cambios de fecha, la devolución y el descuento
 * no suben; la cancelación no se ofrece con menos aviso. Lo que se pasa se
 * lleva a su tope al guardar (`aplicarTopes()`), y lo más generoso se **pide**
 * (`Condiciones pedidas`) y lo **aprueba** quien puede pasar por encima de los
 * mínimos —la gerencia general, el encargado de pagos y el administrador—.
 * Lo aprobado pasa a ser el tope de esa cotización (`aprobadasDe()`).
 *
 * **Regla B — lo que el calendario ya no permite**: la vigencia no pasa del
 * día antes del evento (`vigenciaHasta()`), y el contrato se lee con la fecha
 * en que se firmó o, si todavía no, con la de hoy (`fechaDelContrato()`): un
 * saldo que vencía antes se paga al firmar, y una cancelación o un cambio de
 * fecha cuyo plazo ya pasó no se ofrecen. Eso lo dice `contrato.ts`.
 *
 * Puro, sin red ni planilla: se prueba en `prueba.ts`.
 */
import { esFecha, sumarDias, type Fecha } from './fechas.ts';
import { diasEntre } from './cobros.ts';
import { marcaExclusividad, exclusividadDe } from './exclusivo.ts';
import type { Config } from './config.ts';

export type CampoCondicion = 'anticipo' | 'saldoDias' | 'cambiosFecha' | 'cancelacionDias' | 'reembolso' | 'descuento';

export const CAMPOS_CONDICION: CampoCondicion[] = ['anticipo', 'saldoDias', 'cambiosFecha', 'cancelacionDias', 'reembolso', 'descuento'];

/** Cómo se dice cada condición, para la ventana, la bandeja y la bitácora. */
export const NOMBRE_CONDICION: Record<CampoCondicion, string> = {
  anticipo: 'Anticipo',
  saldoDias: 'Saldo',
  cambiosFecha: 'Cambios de fecha',
  cancelacionDias: 'Cancelación',
  reembolso: 'Devolución al cancelar',
  descuento: 'Descuento'
};

/** Un valor con su unidad: *30%*, *3 días antes*, *2 veces*. */
export function valorCondicion(campo: CampoCondicion, n: number): string {
  if (campo === 'anticipo' || campo === 'reembolso' || campo === 'descuento') return `${n}%`;
  if (campo === 'cambiosFecha') return n === 0 ? 'ninguno' : n === 1 ? '1 vez' : `${n} veces`;
  const dias = n === 1 ? '1 día' : `${n} días`;
  if (campo === 'cancelacionDias') return n === 0 ? 'no se ofrece' : `hasta ${dias} antes`;
  return `${dias} antes`;
}

/** El tope de cada condición para el vendedor. */
export type Topes = Record<CampoCondicion, number>;

type ConfigCondiciones = Pick<Config, 'anticipoPct' | 'saldoDias' | 'cambiosFecha' | 'cancelacionDias' | 'reembolsoPct' | 'descuentos'>;

/**
 * **Los topes**: lo de Configuración, o lo aprobado para esta cotización donde
 * se aprobó algo más generoso. El descuento es el mayor de los que ofrece
 * Configuración (los botones de la cotización).
 */
export function topesDe(cfg: ConfigCondiciones, aprobadas: Partial<Topes> = {}): Topes {
  const base: Topes = {
    anticipo: cfg.anticipoPct,
    saldoDias: cfg.saldoDias,
    cambiosFecha: cfg.cambiosFecha,
    cancelacionDias: cfg.cancelacionDias,
    reembolso: cfg.reembolsoPct,
    descuento: Math.max(0, ...cfg.descuentos)
  };
  return topesConAprobadas(base, aprobadas);
}

/** Los topes de Configuración con lo aprobado encima (la pantalla ya trae los de Configuración). */
export function topesConAprobadas(base: Topes, aprobadas: Partial<Topes> = {}): Topes {
  const t: Topes = { ...base };
  for (const c of CAMPOS_CONDICION) {
    const v = aprobadas[c];
    if (typeof v === 'number' && Number.isFinite(v) && masGeneroso(c, v, base)) t[c] = v;
  }
  return t;
}

/** Si un valor es más generoso para el cliente que su tope. */
export function masGeneroso(campo: CampoCondicion, valor: number, topes: Topes): boolean {
  const t = topes[campo];
  switch (campo) {
    case 'anticipo': case 'saldoDias': return valor < t;
    case 'cancelacionDias': return valor > 0 && (t === 0 || valor < t);
    default: return valor > t;
  }
}

/** El valor llevado a su tope; si no se pasa, el mismo. */
export function alTope(campo: CampoCondicion, valor: number, topes: Topes): number {
  if (!masGeneroso(campo, valor, topes)) return valor;
  return campo === 'cancelacionDias' && topes.cancelacionDias === 0 ? 0 : topes[campo];
}

/** Las condiciones de una cotización que mira esta regla. `null` es *la de Configuración*. */
export interface CondicionesCotizacion {
  anticipo: number | null;
  anticipoMonto?: number | null;
  saldoDias: number | null;
  cambiosFecha: number | null;
  cancelacionDias: number | null;
  reembolso: number | null;
  descuento: number;
}

/** Lo que se llevó a su tope al guardar. */
export interface Recorte {
  campo: CampoCondicion;
  pedido: number;
  queda: number;
}

/**
 * **Lleva cada condición a su tope** (la regla A, en el servidor y en la
 * pantalla). Lo que está en blanco rige de Configuración y no se toca. Un
 * anticipo en pesos no puede ser menos que el % del tope sobre el total. El
 * descuento de cada línea tampoco pasa el tope.
 */
export function aplicarTopes<L extends { descuento?: number; concepto?: string }>(
  p: CondicionesCotizacion, lineas: L[], total: number, topes: Topes,
  /**
   * **Al editar, solo lo que cambia** (2026-11-23). Con `antes`, un campo o
   * una línea que quedó igual no se toca: una cotización que el cliente ya
   * vio no cambia sola porque después se puso un tope. Lo que se escribe
   * ahora, sí pasa por él.
   */
  antes?: { p: CondicionesCotizacion; lineas: L[] }
): { p: CondicionesCotizacion; lineas: L[]; recortes: Recorte[] } {
  const recortes: Recorte[] = [];
  const q: CondicionesCotizacion = { ...p };
  const igual = (c: keyof CondicionesCotizacion) => !!antes && (antes.p[c] ?? null) === (p[c] ?? null);
  const uno = (campo: Exclude<CampoCondicion, 'descuento'>) => {
    const v = q[campo];
    if (v === null || v === undefined || igual(campo)) return;
    const t = alTope(campo, v, topes);
    if (t !== v) { recortes.push({ campo, pedido: v, queda: t }); q[campo] = t; }
  };
  uno('anticipo');
  uno('saldoDias');
  uno('cambiosFecha');
  uno('cancelacionDias');
  uno('reembolso');
  if (q.anticipoMonto && q.anticipoMonto > 0 && total > 0 && !igual('anticipoMonto')) {
    const minimo = Math.round((total * topes.anticipo) / 100);
    if (q.anticipoMonto < minimo) {
      recortes.push({ campo: 'anticipo', pedido: Math.max(1, Math.round((q.anticipoMonto * 100) / total)), queda: topes.anticipo });
      q.anticipoMonto = minimo;
    }
  }
  if (masGeneroso('descuento', q.descuento, topes) && !igual('descuento')) {
    recortes.push({ campo: 'descuento', pedido: q.descuento, queda: topes.descuento });
    q.descuento = topes.descuento;
  }
  let lineaRecortada = 0;
  const ls = lineas.map((l) => {
    if (!masGeneroso('descuento', Number(l.descuento) || 0, topes)) return l;
    const previa = antes?.lineas.find((x) => x.concepto === l.concepto);
    if (previa && (Number(previa.descuento) || 0) === (Number(l.descuento) || 0)) return l;
    lineaRecortada = Math.max(lineaRecortada, Number(l.descuento) || 0);
    return { ...l, descuento: topes.descuento };
  });
  if (lineaRecortada && !recortes.some((r) => r.campo === 'descuento')) {
    recortes.push({ campo: 'descuento', pedido: lineaRecortada, queda: topes.descuento });
  }
  return { p: q, lineas: ls, recortes };
}

/** Lo que una cotización ofrece por sobre Configuración (lo que haría falta pedir). */
export function sobreElTope(p: CondicionesCotizacion, lineas: { descuento?: number }[], topes: Topes): Partial<Topes> {
  const fuera: Partial<Topes> = {};
  for (const c of ['anticipo', 'saldoDias', 'cambiosFecha', 'cancelacionDias', 'reembolso'] as const) {
    const v = p[c];
    if (v !== null && v !== undefined && masGeneroso(c, v, topes)) fuera[c] = v;
  }
  const d = Math.max(Number(p.descuento) || 0, ...lineas.map((l) => Number(l.descuento) || 0));
  if (masGeneroso('descuento', d, topes)) fuera.descuento = d;
  return fuera;
}

/* ---------- el pedido y su marca ---------- */

/**
 * **Lo que se pide además de los topes** (2026-11-23, lo decidió el cliente:
 * *"de acuerdo"* con pedir con el mismo botón una excepción a los mínimos y
 * la segunda renovación de la vigencia):
 *
 * - `show` y `arriendo`: un monto menor que el mínimo de esa cotización,
 *   neto (+ IVA). Aprobado, pasa a ser su mínimo (`conMinimoShow()` y
 *   `conMinimoArriendo()` de `cotizar.ts`).
 * - `renovar`: renovar la vigencia cuando ya se renovó una vez. Aprobado, se
 *   renueva en el acto (`/api/presupuestos/condiciones`).
 */
export type ExtraPedido = 'show' | 'arriendo' | 'renovar';
export const EXTRAS_PEDIDO: ExtraPedido[] = ['show', 'arriendo', 'renovar'];
export type Pedido = Partial<Topes> & Partial<Record<ExtraPedido, number>>;

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/** Un extra pedido en palabras: *Show ecuestre a $50.000 + IVA*, *Renovar la vigencia*. */
function fraseExtra(k: ExtraPedido, n: number): string {
  if (k === 'renovar') return 'Renovar la vigencia';
  return `${k === 'show' ? 'Show ecuestre' : 'Arriendo'} a ${pesos(n)} + IVA`;
}

/** `Condiciones pedidas`: *"reembolso=40|cancelacionDias=30|show=50000"*. */
export function escribirPedido(pedido: Pedido): string {
  return [...CAMPOS_CONDICION, ...EXTRAS_PEDIDO].filter((c) => typeof pedido[c] === 'number')
    .map((c) => `${c}=${Math.round(pedido[c] as number)}`).join('|');
}

/** Lee `Condiciones pedidas`. Lo que no se entiende se ignora. */
export function leerPedido(texto: string | undefined): Pedido {
  const salida: Pedido = {};
  const conocidos: string[] = [...CAMPOS_CONDICION, ...EXTRAS_PEDIDO];
  for (const par of String(texto ?? '').split('|')) {
    const [k, v] = par.split('=').map((x) => x.trim());
    const n = Number(v);
    if (conocidos.includes(k) && v !== '' && Number.isFinite(n) && n >= 0) {
      salida[k as CampoCondicion | ExtraPedido] = Math.round(n);
    }
  }
  return salida;
}

/** Los límites de lo que se puede pedir: los mismos que acepta el servidor para cada campo. */
export const MAXIMO_CONDICION: Record<CampoCondicion, number> = {
  anticipo: 100, saldoDias: 365, cambiosFecha: 10, cancelacionDias: 365, reembolso: 100, descuento: 100
};

/** `Condiciones especiales`: *"Pedida · Jorge · 2026-11-23 10:05 · el cliente es recurrente"*. */
export const marcaCondiciones = marcaExclusividad;
export const condicionesEspecialesDe = exclusividadDe;

/** Lo aprobado para esta cotización en los topes: el pedido, si su marca dice *Aprobada*. */
export function aprobadasDe(p: { condicionesEspeciales?: string; condicionesPedidas?: string }): Partial<Topes> {
  if (condicionesEspecialesDe(p.condicionesEspeciales).estado !== 'aprobada') return {};
  const pedido = leerPedido(p.condicionesPedidas);
  const topes: Partial<Topes> = {};
  for (const c of CAMPOS_CONDICION) if (typeof pedido[c] === 'number') topes[c] = pedido[c];
  return topes;
}

/** Los mínimos aprobados para esta cotización: el show y el arriendo, si se pidieron y se aprobaron. */
export function minimosAprobados(p: { condicionesEspeciales?: string; condicionesPedidas?: string }): { show?: number; arriendo?: number } {
  if (condicionesEspecialesDe(p.condicionesEspeciales).estado !== 'aprobada') return {};
  const pedido = leerPedido(p.condicionesPedidas);
  return {
    ...(typeof pedido.show === 'number' ? { show: pedido.show } : {}),
    ...(typeof pedido.arriendo === 'number' ? { arriendo: pedido.arriendo } : {})
  };
}

/** Lo pedido o aprobado, sin los topes: *Devolución al cancelar 40% · Cancelación hasta 30 días antes*. */
export function fraseCondiciones(pedido: Pedido): string {
  return [
    ...CAMPOS_CONDICION.filter((c) => typeof pedido[c] === 'number')
      .map((c) => `${NOMBRE_CONDICION[c]} ${valorCondicion(c, pedido[c] as number)}`),
    ...EXTRAS_PEDIDO.filter((k) => typeof pedido[k] === 'number').map((k) => fraseExtra(k, pedido[k] as number))
  ].join(' · ');
}

/** El pedido en una frase: *Devolución al cancelar 40% (en Configuración 20%) · Show ecuestre a $50.000 + IVA (bajo el mínimo)*. */
export function frasePedido(pedido: Pedido, topes: Topes): string {
  return [
    ...CAMPOS_CONDICION.filter((c) => typeof pedido[c] === 'number')
      .map((c) => `${NOMBRE_CONDICION[c]} ${valorCondicion(c, pedido[c] as number)} (en Configuración ${valorCondicion(c, topes[c])})`),
    ...EXTRAS_PEDIDO.filter((k) => typeof pedido[k] === 'number')
      .map((k) => fraseExtra(k, pedido[k] as number) + (k === 'renovar' ? ' (ya se renovó una vez)' : ' (bajo el mínimo)'))
  ].join(' · ');
}

/* ---------- la regla B: contra la fecha de hoy ---------- */

/** Días desde `ref` hasta el evento, o `null` sin fecha. */
export function diasAlEvento(fecha: string, ref: Fecha): number | null {
  return esFecha(fecha) && esFecha(ref) ? diasEntre(ref, fecha) : null;
}

/**
 * **La fecha con que se lee el contrato**: la del día en que se subió firmado
 * —lo que se firmó no cambia con los días— o, mientras no esté firmado, hoy.
 */
export function fechaDelContrato(p: { contratoSubido?: string }, hoy: Fecha): Fecha {
  const f = String(p.contratoSubido ?? '').slice(0, 10);
  return esFecha(f) ? f : hoy;
}

/**
 * **Hasta cuándo vale una cotización**: los días de vigencia desde que se
 * manda, pero nunca después del día antes del evento. En 0 no vence (como
 * siempre).
 */
export function vigenciaHasta(desde: Fecha, dias: number, fechaEvento: string): string {
  if (!esFecha(desde) || !Number.isFinite(dias) || dias <= 0) return '';
  const hasta = sumarDias(desde, Math.round(dias));
  if (!esFecha(fechaEvento)) return hasta;
  const tope = sumarDias(fechaEvento, -1);
  if (tope >= hasta) return hasta;
  return tope < desde ? desde : tope;
}

/**
 * **Lo que el calendario ya no permite**, para avisarlo en la cotización y
 * escribirlo así en el contrato. Sin fecha, nada.
 */
export function plazosVencidos(
  fecha: string, ref: Fecha,
  t: { cambiosFecha: number; cancelacionDias: number; avisoCambio?: number },
  saldoHasta: string
): { saldoAlFirmar: boolean; sinCancelacion: boolean; sinCambios: boolean; dias: number | null } {
  const dias = diasAlEvento(fecha, ref);
  if (dias === null) return { saldoAlFirmar: false, sinCancelacion: false, sinCambios: false, dias };
  return {
    dias,
    saldoAlFirmar: esFecha(saldoHasta) && saldoHasta < ref,
    sinCancelacion: t.cancelacionDias > 0 && dias < t.cancelacionDias,
    sinCambios: t.cambiosFecha > 0 && (t.avisoCambio ?? 0) > 0 && dias < (t.avisoCambio ?? 0)
  };
}
