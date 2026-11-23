/**
 * **Los acuerdos adicionales, a la vista de pagos** (2026-11-23, lo decidió el
 * cliente: *"de acuerdo"* con que, si una cotización tiene acuerdos
 * adicionales, le aparezcan al encargado de pagos para revisar, sin frenar al
 * vendedor).
 *
 * Los acuerdos son texto libre que va al contrato como la última cláusula: ahí
 * se puede escribir cualquier promesa. No se frenan —ya rigen, como un pago
 * anotado—: le llegan a quien tiene `pagar` en la bandeja de lo que revisa, y
 * **✓ Visto** los deja a su nombre (`Acuerdos revisados`). La marca guarda la
 * huella del texto que se vio: **si el vendedor lo cambia, vuelve a aparecer**.
 *
 * Puro, sin red ni planilla: se prueba en `prueba.ts`.
 */

/** Una huella corta del texto, sin importar los espacios: para saber si cambió. */
export function huellaDe(texto: string | undefined): string {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 33) ^ t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** `Acuerdos revisados`: *"Visto · Verónica Lagos · 2026-11-23 10:05 · 1x2y3z"*. */
export function marcaAcuerdos(quien: string, cuando: string, texto: string): string {
  return ['Visto', quien || 'alguien', cuando, huellaDe(texto)].join(' · ');
}

/** Quién vio estos acuerdos, si la marca es de este mismo texto; si cambió, `null`. */
export function acuerdosVistos(marca: string | undefined, texto: string | undefined): { quien: string; cuando: string } | null {
  const partes = String(marca ?? '').split(' · ').map((x) => x.trim());
  if (partes[0] !== 'Visto' || partes.length < 4) return null;
  return partes[partes.length - 1] === huellaDe(texto) ? { quien: partes[1], cuando: partes[2] } : null;
}

/** Si una cotización tiene acuerdos que todavía nadie de pagos miró. */
export function acuerdosPorRevisar(p: { acuerdos?: string; acuerdosRevisados?: string }): boolean {
  return !!String(p.acuerdos ?? '').trim() && !acuerdosVistos(p.acuerdosRevisados, p.acuerdos);
}
