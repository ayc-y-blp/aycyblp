/**
 * **El cobro en el local, al cerrar la mesa** (2026-11-23, lo pidió el
 * cliente para la encargada de turno: *"al cerrar la reserva, pone el monto
 * total de Fudo. Ahí hay que agregar también monto en efectivo… puede decir
 * ya, él me hizo una transferencia con el resto y paga… o si el cliente pagó
 * en efectivo… o también si pagó la diferencia con tarjeta. Y ahí solo una
 * opción de tarjeta"*).
 *
 * Con el valor final de la mesa anotado, la mesa dice **cuánto ya se pagó**
 * (en línea, un abono, los cobros de su cotización) y **cuánto falta**. Quien
 * cobra elige cómo se pagó el resto —💵 Efectivo, 🏦 Transferencia (con la foto
 * del comprobante) o 💳 Tarjeta, o varios— y ***✓ Pagó todo*** deja la reserva
 * pagada:
 *
 * - **Una anotada a mano o de Shopify** queda *Pagada* en el panel. **A
 *   Shopify no se le toca nada**: el pedido sigue *por pagar* allá, y la
 *   sincronización no la devuelve a *por pagar* mientras tenga su cobro
 *   (`estadoConCobroLocal()`).
 * - **Una de una cotización** suma sus cobros en la cotización —el saldo, con
 *   su medio y su comprobante—, que es donde se lleva lo pagado y de donde
 *   sale la comisión del vendedor.
 * - **El efectivo entra a la caja chica** (`lib/caja.ts`).
 * - **Pagos lo revisa** en su bandeja, como cualquier pago anotado
 *   (`plata.ts`); no frena a nadie.
 *
 * Puro, sin red ni planilla.
 */
import { ESTADO_PAGO } from './columnas.ts';
import { marcaPlata, partesMarca } from './plata.ts';

export const MEDIO_LOCAL = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta'
} as const;
export type MedioLocal = (typeof MEDIO_LOCAL)[keyof typeof MEDIO_LOCAL];

/** En este orden se muestran y se guardan. */
export const MEDIOS_LOCAL: MedioLocal[] = [MEDIO_LOCAL.efectivo, MEDIO_LOCAL.transferencia, MEDIO_LOCAL.tarjeta];

export const ICONO_MEDIO: Record<MedioLocal, string> = {
  Efectivo: '💵', Transferencia: '🏦', Tarjeta: '💳'
};

export interface PagoLocal { medio: MedioLocal; monto: number }

/** Una cuenta de mesa sobre esto es un cero de más. */
export const MAXIMO_COBRO = 50_000_000;

const medioDe = (t: string): MedioLocal | null =>
  MEDIOS_LOCAL.find((m) => m.toLowerCase() === t.trim().toLowerCase()) ?? null;

/** *"Efectivo 50000|Tarjeta 26500"* → la lista. Lo que no se entiende se salta. */
export function leerCobroLocal(texto: unknown): PagoLocal[] {
  const salida: PagoLocal[] = [];
  for (const parte of String(texto ?? '').split('|')) {
    const m = /^\s*([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d+)\s*$/.exec(parte);
    if (!m) continue;
    const medio = medioDe(m[1]);
    const monto = Number(m[2]);
    if (!medio || !(monto > 0)) continue;
    const ya = salida.find((x) => x.medio === medio);
    if (ya) ya.monto += monto;
    else salida.push({ medio, monto });
  }
  return MEDIOS_LOCAL.flatMap((m) => salida.filter((x) => x.medio === m));
}

/** La lista → el texto que se guarda, un medio una vez y en su orden. */
export function escribirCobroLocal(lista: PagoLocal[]): string {
  return leerCobroLocal(lista.map((p) => `${p.medio} ${Math.round(p.monto)}`).join('|'))
    .map((p) => `${p.medio} ${p.monto}`).join('|');
}

export const sumaCobro = (lista: PagoLocal[]) => lista.reduce((s, p) => s + p.monto, 0);

/** Cuánto de lo cobrado fue en efectivo: lo que entra a la caja chica. */
export const efectivoDe = (lista: PagoLocal[]) =>
  lista.filter((p) => p.medio === MEDIO_LOCAL.efectivo).reduce((s, p) => s + p.monto, 0);

export const llevaTransferencia = (lista: PagoLocal[]) => lista.some((p) => p.medio === MEDIO_LOCAL.transferencia);

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/** *"💵 Efectivo $50.000 · 🏦 Transferencia $20.000"*. */
export function fraseCobro(lista: PagoLocal[]): string {
  return lista.map((p) => `${ICONO_MEDIO[p.medio]} ${p.medio} ${pesos(p.monto)}`).join(' · ');
}

type ConPago = { estadoPago: string; monto: number | null; abonado?: number | null };

/**
 * **Cuánto ya entró antes de la mesa**: todo, si está pagada; lo abonado, si
 * está abonada; nada, si está por pagar. Vale para las tres: Shopify, a mano y
 * de una cotización (su abono sale de sus cobros).
 */
export function yaPagado(r: ConPago): number {
  const e = String(r.estadoPago ?? '').trim().toLowerCase();
  if (e === ESTADO_PAGO.pagado) return Math.max(0, Number(r.monto) || 0);
  if (e === ESTADO_PAGO.abonado) return Math.max(0, Number(r.abonado) || 0);
  return 0;
}

/**
 * **La cuenta de la mesa**: el valor final de Fudo, que ya trae lo pagado
 * (lo decidió el cliente el 2026-11-17). Sin valor final, el monto de la
 * reserva. `0` si no hay ninguno de los dos: no hay contra qué cobrar.
 */
export function cuentaDeLaMesa(r: ConPago & { valorFinal?: number | null }): number {
  if (r.valorFinal != null) return Math.max(0, Number(r.valorFinal) || 0);
  return Math.max(0, Number(r.monto) || 0);
}

/**
 * **Cuánto falta por cobrar en la mesa.** Si la cuenta es menor que lo ya
 * pagado (pagó en línea y no se sumó nada), no falta nada: lo que sobra no se
 * devuelve desde acá.
 */
export function faltaPorCobrar(r: ConPago & { valorFinal?: number | null; cobroCerrado?: string }): number {
  if (String(r.cobroCerrado ?? '').trim()) return 0;
  return Math.max(0, cuentaDeLaMesa(r) - yaPagado(r));
}

/**
 * **Lo que llega del navegador, limpio.** La lista tiene que sumar justo lo
 * que falta: ni un peso menos —*Pagó todo* es lo que se está diciendo— ni uno
 * más —lo que sobra es propina, y va en la propina del día—.
 */
export function limpiarCobro(valor: unknown, falta: number): { lista: PagoLocal[] } | { error: string } {
  const crudo = Array.isArray(valor) ? valor : [];
  const lista: PagoLocal[] = [];
  for (const x of crudo) {
    const medio = medioDe(String((x as PagoLocal)?.medio ?? ''));
    const monto = Math.round(Number((x as PagoLocal)?.monto));
    if (!medio) return { error: 'Ese medio de pago no se entiende: es efectivo, transferencia o tarjeta.' };
    if (!Number.isFinite(monto) || monto < 0 || monto > MAXIMO_COBRO) return { error: 'Un monto no se entiende.' };
    if (monto > 0) lista.push({ medio, monto });
  }
  const limpia = leerCobroLocal(escribirCobroLocal(lista));
  if (!limpia.length) return { error: 'Elige cómo pagó.' };
  if (!(falta > 0)) return { error: 'A esta mesa no le falta nada por cobrar.' };
  const suma = sumaCobro(limpia);
  if (suma < falta) return { error: `Lo cobrado suma ${pesos(suma)} y faltan ${pesos(falta)}: faltan ${pesos(falta - suma)}.` };
  if (suma > falta) return { error: `Lo cobrado suma ${pesos(suma)} y faltaban ${pesos(falta)}. Si lo que sobra es propina, va en la propina del día.` };
  return { lista: limpia };
}

/**
 * **La marca del cobro**: cuándo, quién y cómo estaba el pago antes, para
 * poder deshacerlo sin preguntarle a Shopify. *"2026-11-23 18:40 · Fernanda ·
 * antes pending/"*.
 */
export function marcaCobro(cuando: string, quien: string, antes: { estadoPago: string; abonado?: number | null }): string {
  return marcaPlata(cuando, quien, `antes ${antes.estadoPago || ''}/${antes.abonado ?? ''}`);
}

export function partesMarcaCobro(marca: string | undefined):
  { cuando: string; quien: string; estadoAntes: string; abonadoAntes: number | null } | null {
  const m = partesMarca(marca);
  if (!m) return null;
  const a = /^antes\s+([^/]*)\/(\d*)$/.exec(m.firma.trim());
  return {
    cuando: m.cuando, quien: m.quien,
    estadoAntes: a ? a[1].trim() : '',
    abonadoAntes: a && a[2] ? Number(a[2]) : null
  };
}

/**
 * **Lo que la sincronización con Shopify deja en el estado del pago** de una
 * reserva que ya existe. Si se cobró en el local y Shopify todavía dice *por
 * pagar* o *abonada*, manda el cobro: la tienda no sabe lo que pasó en la
 * mesa. Si Shopify dice algo que libera el lugar —devuelta, anulada—, manda
 * Shopify: eso lo decidió alguien allá.
 */
export function estadoConCobroLocal(estadoShopify: string, cobroCerrado: string | undefined): string {
  if (!String(cobroCerrado ?? '').trim()) return estadoShopify;
  const e = String(estadoShopify ?? '').trim().toLowerCase();
  return e === ESTADO_PAGO.pendiente || e === ESTADO_PAGO.abonado || e === '' ? ESTADO_PAGO.pagado : estadoShopify;
}

/** La nota de los cobros que la mesa anota en una cotización: así se encuentran para deshacerlos. */
export const NOTA_COBRO_MESA = 'Cobrado en la mesa';
