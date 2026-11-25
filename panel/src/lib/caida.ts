/**
 * **Una reserva que se cayó** (2026-11-25, lo pidió el cliente: *"ayer borré
 * esta reserva (con borrar) y hoy reapareció… ¿no sería mejor tener solo el
 * botón se cayó, borrar no?"*).
 *
 * Hasta ese día había dos caminos, y en una reserva de Shopify ninguno
 * duraba:
 *
 * - **Borrar** sacaba la fila de la planilla, pero el pedido seguía vivo en
 *   Shopify, y la revisión de la mañana lo volvía a anotar.
 * - **La reserva se cayó…** cambiaba el estado del pago a *cancelada*, y esa
 *   misma revisión lo devolvía a *por pagar*.
 *
 * Ahora *✕ Se cayó…* escribe su propia columna (`Se cayó`), con el motivo,
 * quién y cuándo. La tienda no la toca (`camposDeShopify()`) y
 * `ocupaLugar()` la respeta: la reserva deja de ocupar su lugar, pasa al
 * grupo *Se cayeron* del día y queda el rastro. *No, sí viene* la devuelve.
 * **Borrar queda solo para el administrador**, para una reserva anotada dos
 * veces por error (lo decidió el cliente).
 *
 * Pura: la usan la pantalla y el servidor.
 */
import type { Reserva } from './tipos.ts';

/** Los motivos de siempre; uno distinto se escribe. */
export const MOTIVOS_CAIDA = ['El cliente avisó que no viene', 'No pagó ni confirmó', 'Anotada por error'];

/**
 * **Anotada por error no es una cancelación**: no cuenta en las
 * estadísticas de las que se cayeron (`estadisticas.ts`), para que una
 * reserva escrita dos veces no suba el porcentaje de cancelaciones.
 */
export const POR_ERROR = 'Anotada por error';

/** La marca: *"2026-11-25 10:31 · Fernanda · El cliente avisó que no viene"*, como `Se cayó por cupo`. */
export function marcaCaida(cuando: string, quien: string, motivo: string): string {
  const m = motivo.replace(/\s+/g, ' ').trim();
  return [cuando, quien || 'alguien', m].filter(Boolean).join(' · ');
}

/** Las partes de la marca. Una marca sin el formato se lee entera como motivo. */
export function partesCaida(marca: string | null | undefined): { cuando: string; quien: string; motivo: string } | null {
  const s = String(marca ?? '').trim();
  if (!s) return null;
  const p = s.split(' · ');
  if (p.length < 3) return { cuando: '', quien: '', motivo: s };
  return { cuando: p[0], quien: p[1], motivo: p.slice(2).join(' · ') };
}

/** Si se marcó como anotada por error. */
export function anotadaPorError(r: Pick<Reserva, 'cayo'>): boolean {
  return partesCaida(r.cayo)?.motivo === POR_ERROR;
}

/** El motivo limpio, o `null` si no sirve (muy corto o muy largo). */
export function motivoValido(motivo: unknown): string | null {
  const m = String(motivo ?? '').replace(/\s+/g, ' ').trim();
  return m.length >= 2 && m.length <= 200 ? m : null;
}
