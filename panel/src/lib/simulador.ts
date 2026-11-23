/**
 * **El simulador de evento** (2026-11-23, Fase 5).
 *
 * Lo pidió el cliente al hablar de la ampliación a Calicanto: *"crear un
 * simulador, me tinca… piensa en la lógica primero, después se rellena"*.
 * Contesta, antes de mandar una cotización, **cuánto cuesta este evento y
 * cuánto se gana**, y si no alcanza, cuánto habría que cobrar.
 *
 * Lo cobrado (en neto, sin IVA) menos cuatro tipos de costo:
 *
 * 1. **Lo que se sirve**: el costo de cada producto de la cotización
 *    (`Costo` en *Productos*), por su cantidad —por persona o una vez, como
 *    se cobra—.
 * 2. **El equipo**: la regla *uno cada N personas* de cada puesto dice
 *    cuánta gente hace falta, y lo que se le paga por jornada a quienes
 *    trabajan en ese puesto, cuánto cuesta.
 * 3. **Los gastos del evento**: la lista de Configuración, cada uno fijo o
 *    por persona (hielo, transporte, calefacción).
 * 4. **La comisión**, si se la pasan ya calculada.
 *
 * **No inventa números.** Un producto sin costo o un puesto sin jornada se
 * nombran en `faltan`, y mientras falte algo la señal es *sin datos*: un
 * margen calculado con un costo en cero se vería mejor de lo que es.
 *
 * Pura y con pruebas: la usan la ruta `/api/simulador` y, a través de ella,
 * la ventana.
 */
import { cuentasDe } from './presupuestos.ts';
import { normalizar } from './columnas.ts';
import { esContratado, type Puesto, type Trabajador } from './equipo.ts';
import { TIPO_PRODUCTO, type Menu } from './menus.ts';

export interface GastoEvento { nombre: string; monto: number; porPersona: boolean }

/**
 * La lista de gastos como se escribe en Configuración: uno por `;` o por
 * renglón, *Nombre: monto*, y `pp` al final si es por persona.
 * *"Hielo: 15000; Transporte: 800 pp"*.
 */
export function aGastos(texto: unknown): GastoEvento[] {
  const salida: GastoEvento[] = [];
  for (const parte of String(texto ?? '').split(/[;\n]/)) {
    const m = parte.match(/^\s*([^:=]+?)\s*[:=]\s*\$?\s*([\d.\s]+)\s*(pp|por persona|c\/u)?\s*$/i);
    if (!m) continue;
    const monto = Math.round(Number(m[2].replace(/[.\s]/g, '')));
    if (!m[1].trim() || !Number.isFinite(monto) || monto <= 0) continue;
    salida.push({ nombre: m[1].trim(), monto, porPersona: !!m[3] });
  }
  return salida;
}

/** La lista de vuelta a texto, como se guarda. */
export function deGastos(gastos: GastoEvento[]): string {
  return gastos.map((g) => `${g.nombre}: ${g.monto}${g.porPersona ? ' pp' : ''}`).join('; ');
}

/**
 * Cuánto cuesta una jornada en cada puesto: **el promedio de lo que se le
 * paga por jornada a quienes lo tienen de puesto habitual**, activos y por
 * turno. Un contratado no suma: su sueldo no depende del evento. Un puesto
 * sin nadie con jornada puesta no aparece, y el simulador lo nombra.
 */
export function jornadaPorPuesto(
  trabajadores: Pick<Trabajador, 'puesto' | 'activo' | 'pagoJornada' | 'modalidad'>[]
): Record<string, number> {
  const suma = new Map<string, { total: number; n: number }>();
  for (const t of trabajadores) {
    if (t.activo === false || esContratado(t.modalidad) || !(t.pagoJornada > 0)) continue;
    const k = normalizar(t.puesto);
    if (!k) continue;
    const x = suma.get(k) ?? { total: 0, n: 0 };
    x.total += t.pagoJornada; x.n += 1;
    suma.set(k, x);
  }
  return Object.fromEntries([...suma].map(([k, x]) => [k, Math.round(x.total / x.n)]));
}

export interface Renglon {
  nombre: string;
  /** Cómo salió: *"40 × $9.000"*, *"2 personas × $35.000"*. */
  detalle: string;
  monto: number;
  /** Falta el dato para calcularlo: el monto va en cero y no cuenta como "barato". */
  falta?: boolean;
}

export interface Grupo { que: 'productos' | 'equipo' | 'gastos' | 'comision'; titulo: string; renglones: Renglon[]; total: number }

export const SENAL = { conviene: 'conviene', justo: 'justo', noConviene: 'noConviene', sinDatos: 'sinDatos' } as const;
export type Senal = (typeof SENAL)[keyof typeof SENAL];

export interface Simulacion {
  invitados: number;
  /** Lo cobrado, sin IVA y con los descuentos aplicados. */
  ingreso: number;
  grupos: Grupo[];
  costo: number;
  margen: number;
  /** El margen como porcentaje de lo cobrado. `null` si no se cobra nada. */
  pct: number | null;
  minimoPct: number;
  senal: Senal;
  /** Lo que falta cargar para que el número sea de verdad. */
  faltan: string[];
  /** Lo que habría que cobrar en neto para llegar al margen mínimo; `null` si faltan datos. */
  netoNecesario: number | null;
  /** Lo mismo, por invitado. */
  netoNecesarioPorPersona: number | null;
}

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

export interface EntradaSimulador {
  lineas: { concepto: string; cantidad: number; precio: number; descuento?: number; ivaIncluido?: boolean }[];
  descuentoTotal?: number;
  invitados: number;
  catalogo: (Pick<Menu, 'nombre' | 'costo'> & { tipo?: string })[];
  puestos: Puesto[];
  /** De `jornadaPorPuesto()`. */
  jornadas: Record<string, number>;
  gastos: GastoEvento[];
  /** La comisión ya calculada, si se quiere restar. */
  comision?: number;
  /** El margen que se busca, en puntos. En cero, basta con no perder. */
  minimoPct: number;
}

export function simular(e: EntradaSimulador): Simulacion {
  const invitados = Math.max(0, Math.round(Number(e.invitados) || 0));
  const lineas = e.lineas.filter((l) => String(l.concepto ?? '').trim() && Number(l.cantidad) > 0);
  const ingreso = cuentasDe(lineas, e.descuentoTotal ?? 0).neto;
  const faltan: string[] = [];

  // 1. Lo que se sirve.
  const porNombre = new Map(e.catalogo.map((m) => [normalizar(m.nombre), m]));
  const productos: Renglon[] = lineas.map((l) => {
    const producto = porNombre.get(normalizar(l.concepto));
    const costo = Number(producto?.costo) || 0;
    // **El arriendo del propio recinto no cuesta**: sin costo puesto, va en
    // cero y no se pide. Si el recinto se le arrienda a otro, se le pone.
    if (!(costo > 0) && producto?.tipo === TIPO_PRODUCTO.arriendo) {
      return { nombre: l.concepto, detalle: 'recinto propio, sin costo', monto: 0 };
    }
    if (!(costo > 0)) {
      faltan.push(`el costo de ${l.concepto}`);
      return { nombre: l.concepto, detalle: 'falta su costo en Productos', monto: 0, falta: true };
    }
    return { nombre: l.concepto, detalle: l.cantidad === 1 ? pesos(costo) : `${l.cantidad} × ${pesos(costo)}`, monto: Math.round(costo * l.cantidad) };
  });

  // 2. El equipo que piden las reglas de cada puesto.
  const equipo: Renglon[] = [];
  for (const p of e.puestos) {
    if (!(p.cadaCuantas > 0) || invitados === 0) continue;
    const n = Math.ceil(invitados / p.cadaCuantas);
    const jornada = Number(e.jornadas[normalizar(p.nombre)]) || 0;
    if (!(jornada > 0)) {
      faltan.push(`el pago por jornada de ${p.nombre}`);
      equipo.push({ nombre: p.nombre, detalle: `${n} ${n === 1 ? 'persona' : 'personas'} · falta el pago por jornada`, monto: 0, falta: true });
      continue;
    }
    equipo.push({ nombre: p.nombre, detalle: `${n} ${n === 1 ? 'persona' : 'personas'} × ${pesos(jornada)}`, monto: n * jornada });
  }
  if (invitados > 0 && e.puestos.length > 0 && equipo.length === 0) faltan.push('la regla de cuánta gente hace falta por puesto');

  // 3. Los gastos del evento.
  const gastos: Renglon[] = e.gastos.map((g) => ({
    nombre: g.nombre,
    detalle: g.porPersona ? `${invitados} × ${pesos(g.monto)}` : pesos(g.monto),
    monto: g.porPersona ? g.monto * invitados : g.monto
  }));

  const suma = (r: Renglon[]) => r.reduce((n, x) => n + x.monto, 0);
  const grupos: Grupo[] = [
    { que: 'productos', titulo: 'Lo que se sirve', renglones: productos, total: suma(productos) },
    { que: 'equipo', titulo: 'El equipo', renglones: equipo, total: suma(equipo) },
    { que: 'gastos', titulo: 'Gastos del evento', renglones: gastos, total: suma(gastos) }
  ];
  const comision = Math.max(0, Math.round(Number(e.comision) || 0));
  if (comision > 0) {
    grupos.push({ que: 'comision', titulo: 'Comisión', renglones: [{ nombre: 'Vendedor y socio', detalle: pesos(comision), monto: comision }], total: comision });
  }

  const costo = grupos.reduce((n, g) => n + g.total, 0);
  const margen = ingreso - costo;
  const pct = ingreso > 0 ? Math.round((margen / ingreso) * 1000) / 10 : null;
  const minimoPct = Math.min(95, Math.max(0, Number(e.minimoPct) || 0));

  let senal: Senal;
  if (faltan.length > 0 || pct === null) senal = SENAL.sinDatos;
  else if (margen <= 0) senal = SENAL.noConviene;
  else if (pct >= minimoPct) senal = SENAL.conviene;
  else if (pct >= minimoPct / 2) senal = SENAL.justo;
  else senal = SENAL.noConviene;

  // Lo que habría que cobrar para llegar al mínimo, con estos costos.
  const netoNecesario = faltan.length > 0 ? null : Math.ceil(costo / (1 - minimoPct / 100));
  return {
    invitados, ingreso, grupos, costo, margen, pct, minimoPct, senal, faltan,
    netoNecesario,
    netoNecesarioPorPersona: netoNecesario !== null && invitados > 0 ? Math.ceil(netoNecesario / invitados) : null
  };
}

/** Lo que ve quien no ve los costos: solo si conviene. */
export function soloLaSenal(s: Simulacion): { senal: Senal } {
  return { senal: s.senal };
}
