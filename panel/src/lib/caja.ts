/**
 * **La caja chica** (2026-11-23, lo pidió el cliente: *"ese efectivo tiene que
 * entrar a la caja chica que la encargada de turno la administra. Ella tiene
 * el efectivo y luego tiene que tener la posibilidad de entregar este dinero
 * a Cristóbal, al encargado de operaciones. Él lo recoge y él lo lleva al
 * banco o decide si se hacen compras con este efectivo… ellos necesitan este
 * registro también dentro de sus roles"*). Parte con $7.000 (lo dijo el
 * cliente), que se anota una vez como *Saldo inicial*.
 *
 * **Una sola caja**, con un movimiento por fila (`Caja chica`):
 *
 * | Tipo | Quién | Qué hace |
 * |---|---|---|
 * | Saldo inicial | quien tiene la caja | con cuánto parte, una vez |
 * | Cobro | sale solo del cobro de una mesa en efectivo (`cobroLocal.ts`) | entra a la caja |
 * | Gasto | quien tiene la caja, con la foto de la boleta | sale de la caja |
 * | Entrega | quien tiene la caja, a una persona | sale de la caja y queda **por recibir** hasta que esa persona aprieta *✓ Recibí* |
 * | Depósito · Compra | quien recibió, con la foto del comprobante o la boleta | sale de lo que tiene en la mano |
 *
 * - **Lo que se entrega no se pierde de vista**: queda *por recibir*, y si se
 *   recibe otro monto se marca para pagos (*recibió $X de $Y*).
 * - **Pagos revisa** cada movimiento (`✓ Revisado`), sin frenar a nadie: es la
 *   regla de la plata (`plata.ts`).
 * - **Nada se edita**: lo anotado por error se borra mientras pagos no lo
 *   haya revisado, y queda en la bitácora.
 *
 * Puro, sin red ni planilla.
 */
import { indices } from './columnas.ts';
import { esFecha, type Fecha } from './fechas.ts';
import { marcaPlata, partesMarca } from './plata.ts';
import { ROL } from './auth.ts';

export const HOJA_CAJA = 'Caja chica';

export const COL_CAJA = {
  id: 'ID',
  fecha: 'Fecha',
  cuando: 'Cuándo',
  tipo: 'Tipo',
  /** Siempre positivo: el tipo dice si entra o sale. */
  monto: 'Monto',
  detalle: 'Detalle',
  /** El nombre de la cuenta que lo anotó. */
  quien: 'Quién',
  /** A quién se le entregó: el nombre de su cuenta. Solo en una entrega. */
  para: 'Para',
  /** *"2026-11-23 19:02 · Cristóbal · 120000"*: quién recibió, cuándo y cuánto. */
  recibido: 'Recibido',
  /** El id del archivo en Google Drive: la boleta o el comprobante. */
  comprobante: 'Comprobante',
  /** El `ID Orden` de la reserva, en un cobro de una mesa. */
  reserva: 'Reserva',
  /** *"2026-11-24 10:15 · Verónica"*: quién de pagos lo revisó. */
  revisado: 'Revisado'
} as const;
export const ENCABEZADO_CAJA: string[] = Object.values(COL_CAJA);

export const TIPO_CAJA = {
  inicial: 'Saldo inicial',
  cobro: 'Cobro',
  gasto: 'Gasto',
  entrega: 'Entrega',
  deposito: 'Depósito',
  compra: 'Compra'
} as const;
export type TipoCaja = (typeof TIPO_CAJA)[keyof typeof TIPO_CAJA];
const TIPOS = Object.values(TIPO_CAJA) as TipoCaja[];

export const ICONO_CAJA: Record<TipoCaja, string> = {
  'Saldo inicial': '🏁', Cobro: '💵', Gasto: '🧾', Entrega: '📤', 'Depósito': '🏦', Compra: '🛒'
};

/** Un movimiento sobre esto es un cero de más. */
export const MAXIMO_CAJA = 20_000_000;

export interface Movimiento {
  id: string;
  fecha: Fecha;
  cuando: string;
  tipo: TipoCaja;
  monto: number;
  detalle: string;
  quien: string;
  para: string;
  recibido: string;
  comprobante: string;
  reserva: string;
  revisado: string;
  fila: number;
}

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/* ---------- la planilla ---------- */

export function leerCajaDe(filas: string[][]): Movimiento[] {
  const enc = filas[0] ?? [];
  const i = indices(enc, COL_CAJA);
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f?.[k] ?? '').trim());
  const salida: Movimiento[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n] ?? [];
    const id = en(f, i.id);
    const tipo = TIPOS.find((t) => t.toLowerCase() === en(f, i.tipo).toLowerCase());
    const monto = Math.round(Number(en(f, i.monto).replace(/[^\d-]/g, '')));
    if (!id || !tipo || !(monto > 0)) continue;
    const fecha = en(f, i.fecha);
    salida.push({
      id, fecha: esFecha(fecha) ? fecha : en(f, i.cuando).slice(0, 10), cuando: en(f, i.cuando), tipo, monto,
      detalle: en(f, i.detalle), quien: en(f, i.quien), para: en(f, i.para), recibido: en(f, i.recibido),
      comprobante: en(f, i.comprobante), reserva: en(f, i.reserva), revisado: en(f, i.revisado), fila: n + 1
    });
  }
  return salida;
}

export function filaCaja(enc: string[], m: Partial<Movimiento>, previa?: string[]): unknown[] {
  const i = indices(enc, COL_CAJA);
  const fila = previa ? [...previa] : new Array(enc.length).fill('');
  while (fila.length < enc.length) fila.push('');
  const poner = (k: number, v: unknown) => { if (k !== -1 && v !== undefined) fila[k] = v ?? ''; };
  poner(i.id, m.id); poner(i.fecha, m.fecha); poner(i.cuando, m.cuando); poner(i.tipo, m.tipo);
  poner(i.monto, m.monto); poner(i.detalle, m.detalle); poner(i.quien, m.quien); poner(i.para, m.para);
  poner(i.recibido, m.recibido); poner(i.comprobante, m.comprobante); poner(i.reserva, m.reserva);
  poner(i.revisado, m.revisado);
  return fila;
}

export function nuevoIdCaja(ahora = Date.now()): string {
  return 'K-' + ahora.toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
}

/* ---------- quién es quién ---------- */

const igual = (a: string, b: string) =>
  a.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  === b.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Si esta cuenta es la persona nombrada: por su nombre o por su usuario. */
export function esLaPersona(nombre: string, cuenta: { usuario: string; nombre?: string }): boolean {
  if (!String(nombre ?? '').trim()) return false;
  return igual(nombre, cuenta.nombre ?? '') || igual(nombre, cuenta.usuario);
}

/** Lo recibido de una entrega: quién, cuándo y cuánto. `null` si sigue por recibir. */
export function partesRecibido(m: Pick<Movimiento, 'recibido' | 'monto'>):
  { cuando: string; quien: string; monto: number } | null {
  const p = partesMarca(m.recibido);
  if (!p) return null;
  const n = Math.round(Number(p.firma));
  return { cuando: p.cuando, quien: p.quien, monto: Number.isFinite(n) && n >= 0 && p.firma !== '' ? n : m.monto };
}

export const marcaRecibido = (cuando: string, quien: string, monto: number) =>
  marcaPlata(cuando, quien, String(Math.round(monto)));

/* ---------- los saldos ---------- */

export interface Saldos {
  /** Lo que tiene la caja: lo que entró menos los gastos y las entregas. */
  enCaja: number;
  /** Lo entregado que nadie ha confirmado todavía. */
  porRecibir: number;
  /** Lo que tiene en la mano cada persona que recibió: lo recibido menos lo depositado o comprado. */
  enManos: { persona: string; monto: number }[];
  /** Las entregas en que se recibió otro monto. */
  diferencias: { id: string; entregado: number; recibido: number; para: string }[];
}

export function saldosDeCaja(movs: Movimiento[]): Saldos {
  let enCaja = 0;
  let porRecibir = 0;
  const manos = new Map<string, { persona: string; monto: number }>();
  const mano = (persona: string) => {
    const k = persona.trim().toLowerCase();
    if (!manos.has(k)) manos.set(k, { persona: persona.trim(), monto: 0 });
    return manos.get(k)!;
  };
  const diferencias: Saldos['diferencias'] = [];
  for (const m of movs) {
    switch (m.tipo) {
      case TIPO_CAJA.inicial: case TIPO_CAJA.cobro: enCaja += m.monto; break;
      case TIPO_CAJA.gasto: enCaja -= m.monto; break;
      case TIPO_CAJA.entrega: {
        enCaja -= m.monto;
        const r = partesRecibido(m);
        if (!r) { porRecibir += m.monto; break; }
        mano(m.para || r.quien).monto += r.monto;
        if (r.monto !== m.monto) diferencias.push({ id: m.id, entregado: m.monto, recibido: r.monto, para: m.para || r.quien });
        break;
      }
      case TIPO_CAJA.deposito: case TIPO_CAJA.compra: mano(m.quien).monto -= m.monto; break;
    }
  }
  return {
    enCaja, porRecibir,
    enManos: [...manos.values()].filter((x) => x.monto !== 0).sort((a, b) => b.monto - a.monto),
    diferencias
  };
}

/** Lo que tiene en la mano esta persona. */
export function enManosDe(movs: Movimiento[], cuenta: { usuario: string; nombre?: string }): number {
  return saldosDeCaja(movs).enManos.filter((x) => esLaPersona(x.persona, cuenta)).reduce((s, x) => s + x.monto, 0);
}

/* ---------- lo que se puede anotar ---------- */

export type Nuevo = { tipo: TipoCaja; monto: number; detalle: string; para?: string };

/**
 * **Lo que llega del navegador, limpio, y si se puede.** `tieneComprobante`:
 * si viene la foto. `puedeRecibir`: si la cuenta recibe entregas (anota
 * depósitos y compras). Un cobro no se anota acá: sale solo de la mesa.
 */
export function limpiarMovimiento(cuerpo: Record<string, unknown>, o: {
  movs: Movimiento[]; cuenta: { usuario: string; nombre?: string }; puedeRecibir: boolean;
  tieneComprobante: boolean; destinos: string[];
}): { nuevo: Nuevo } | { error: string } {
  const tipo = TIPOS.find((t) => t.toLowerCase() === String(cuerpo.tipo ?? '').trim().toLowerCase());
  if (!tipo || tipo === TIPO_CAJA.cobro) return { error: 'Ese movimiento no se anota acá.' };
  const monto = Math.round(Number(String(cuerpo.monto ?? '').replace(/[$.\s]/g, '')));
  if (!Number.isFinite(monto) || monto <= 0) return { error: 'Escribe el monto.' };
  if (monto > MAXIMO_CAJA) return { error: 'Ese monto no parece de una caja chica.' };
  const detalle = String(cuerpo.detalle ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const s = saldosDeCaja(o.movs);
  switch (tipo) {
    case TIPO_CAJA.inicial:
      if (o.movs.some((m) => m.tipo === TIPO_CAJA.inicial)) return { error: 'La caja ya tiene su saldo inicial.' };
      return { nuevo: { tipo, monto, detalle: detalle || 'Con lo que partió la caja' } };
    case TIPO_CAJA.gasto:
      if (!detalle) return { error: 'Escribe en qué se gastó.' };
      if (!o.tieneComprobante) return { error: 'Falta la foto de la boleta.' };
      if (monto > s.enCaja) return { error: `En la caja hay ${pesos(s.enCaja)}.` };
      return { nuevo: { tipo, monto, detalle } };
    case TIPO_CAJA.entrega: {
      const para = o.destinos.find((d) => igual(d, String(cuerpo.para ?? '')));
      if (!para) return { error: 'Elige a quién se la entregas.' };
      if (esLaPersona(para, o.cuenta)) return { error: 'No te la puedes entregar a ti.' };
      if (monto > s.enCaja) return { error: `En la caja hay ${pesos(s.enCaja)}.` };
      return { nuevo: { tipo, monto, detalle, para } };
    }
    case TIPO_CAJA.deposito: case TIPO_CAJA.compra: {
      if (!o.puedeRecibir) return { error: 'Eso lo anota quien recibió la plata.' };
      if (tipo === TIPO_CAJA.compra && !detalle) return { error: 'Escribe qué se compró.' };
      if (!o.tieneComprobante) {
        return { error: tipo === TIPO_CAJA.deposito ? 'Falta la foto del comprobante del depósito.' : 'Falta la foto de la boleta.' };
      }
      const tengo = enManosDe(o.movs, o.cuenta);
      if (monto > tengo) return { error: `Tienes ${pesos(tengo)} de la caja en la mano.` };
      return { nuevo: { tipo, monto, detalle } };
    }
  }
  return { error: 'Ese movimiento no se anota acá.' };
}

/** Si este movimiento lleva foto: la boleta o el comprobante. */
export const llevaFoto = (t: TipoCaja) =>
  t === TIPO_CAJA.gasto || t === TIPO_CAJA.deposito || t === TIPO_CAJA.compra;

/* ---------- lo pendiente ---------- */

/** Las entregas a esta cuenta que todavía no confirma. */
export function porRecibirDe(movs: Movimiento[], cuenta: { usuario: string; nombre?: string }): Movimiento[] {
  return movs.filter((m) => m.tipo === TIPO_CAJA.entrega && !partesRecibido(m) && esLaPersona(m.para, cuenta));
}

/**
 * **Lo que pagos todavía no revisó.** No los cobros —se revisan con el pago
 * de su reserva— ni una entrega en camino: se revisa cuando ya se recibió.
 */
export function porRevisarCaja(movs: Movimiento[]): Movimiento[] {
  return movs.filter((m) => !m.revisado && m.tipo !== TIPO_CAJA.cobro
    && !(m.tipo === TIPO_CAJA.entrega && !partesRecibido(m)));
}

/** Si quien lo pide puede borrar este movimiento: su autor, o pagos, mientras no esté revisado y nadie lo haya recibido. */
export function sePuedeBorrar(m: Movimiento, cuenta: { usuario: string; nombre?: string }, esPagos: boolean): string {
  if (m.tipo === TIPO_CAJA.cobro) return 'Un cobro se deshace desde la mesa de su reserva.';
  if (m.revisado && !esPagos) return 'Ya lo revisó pagos: para deshacerlo, pídeselo.';
  if (m.tipo === TIPO_CAJA.entrega && partesRecibido(m) && !esPagos) return 'Ya se recibió: para deshacerlo, pídeselo a pagos.';
  if (!esPagos && !esLaPersona(m.quien, cuenta)) return `Lo anotó ${m.quien || 'otra persona'}.`;
  return '';
}

/** El efectivo que se cobró en las mesas de un día. */
export const efectivoDelDia = (movs: Movimiento[], fecha: string) =>
  movs.filter((m) => m.tipo === TIPO_CAJA.cobro && m.fecha === fecha).reduce((s, m) => s + m.monto, 0);

/** *"📤 Entrega a Cristóbal · $120.000"*, para la bitácora y los avisos. */
export function fraseMovimiento(m: Pick<Movimiento, 'tipo' | 'monto' | 'detalle' | 'para'>): string {
  const que = m.tipo === TIPO_CAJA.entrega ? `Entrega a ${m.para}` : m.tipo;
  return `${ICONO_CAJA[m.tipo]} ${que} · ${pesos(m.monto)}${m.detalle ? ` · ${m.detalle}` : ''}`;
}

/* ---------- A quién se le entrega la caja (2026-11-24) ---------- */

/**
 * **Quién recibe la plata de la caja: el encargado de operaciones y los
 * gerentes** (2026-11-24, lo pidió el cliente dos veces el mismo día: *"tiene
 * que ser el encargado de operaciones y la gerencia que puede recibir plata.
 * Y eso de la forma más simple posible y elegible sin enredar al usuario"*, y
 * *"tienen que estar el encargado de operaciones y los tres gerentes… todos
 * estos nombres tengo que poder elegir en este formulario"*). Hasta ese día se
 * veía uno solo y los demás quedaban detrás de *Otra persona…*, con un
 * buscador.
 *
 * **Entran operaciones, gerencia y pagos**: un gerente puede tener la cuenta
 * con el rol de pagos, y quedarse fuera por el nombre del rol es justo lo que
 * el cliente no quiere. **El administrador no**: es la cuenta general del
 * panel, no una persona a la que se le pasa la plata.
 *
 * **El permiso `recibirCaja` no cambió.** Esta lista es la de quienes lo
 * tienen, menos el administrador; el servidor valida contra ella.
 */
export const RECIBEN_CAJA: readonly string[] = [ROL.operaciones, ROL.gerencia, ROL.pagos];

export interface Destino { usuario: string; nombre: string; rol: string }

/**
 * Las cuentas a las que se puede entregar la caja, **sin la propia**: activas,
 * de operaciones, gerencia o pagos, **primero operaciones** —es el habitual,
 * *"entregar este dinero a Cristóbal"*—, después la gerencia y pagos, y por
 * nombre dentro de cada rol. Se nombran por su nombre,
 * que es lo que queda en *Para* y lo que trae la sesión de quien recibe.
 */
export function quienesRecibenCaja(
  cuentas: { usuario: string; nombre: string; rol: string; activo: boolean }[], yo: string
): Destino[] {
  const nombre = (c: { nombre: string; usuario: string }) => c.nombre || c.usuario;
  const orden = (rol: string) => RECIBEN_CAJA.indexOf(rol);
  return cuentas
    .filter((c) => c.activo && orden(c.rol) >= 0 && nombre(c) !== yo && c.usuario !== yo)
    .map((c) => ({ usuario: nombre(c), nombre: nombre(c), rol: c.rol }))
    .sort((a, b) => orden(a.rol) - orden(b.rol) || a.nombre.localeCompare(b.nombre, 'es'));
}
