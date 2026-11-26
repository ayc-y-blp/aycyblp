import type { MouseEvent } from 'react';

/**
 * **El paso del dato que quedó bajo el dedo** (2026-11-26, lo pidió el
 * cliente: *"en vez de terminar en el paso correspondiente a la info donde
 * apreté"*). Una fila de cotización es un solo botón o enlace; lo que hay
 * debajo dice su paso con `data-paso` (`lib/pasos.ts`). Con el teclado, o en
 * algo sin paso (el nombre, el N°), nada: se abre como siempre.
 *
 * `contenedor` es la fila: lo que está fuera de ella no cuenta.
 */
export function pasoDelClic(e: MouseEvent<HTMLElement>, contenedor: Element | null = e.currentTarget): number | undefined {
  if (!e.detail || typeof document === 'undefined') return undefined;
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (contenedor && !contenedor.contains(el)) break;
    const n = Number((el as HTMLElement).dataset?.paso);
    if (n) return n;
  }
  return undefined;
}
