/**
 * **Cada dato abre la cotización en su paso** (2026-11-26, lo pidió el
 * cliente: *"el botón sin confirmar el envío debería terminar en paso 4 envío,
 * no en productos… así se debe revisar todo el sitio si existen más casos
 * (según yo sí, uno siempre solo termina en productos) en vez de terminar en
 * el paso correspondiente a la info donde apreté"*).
 *
 * Los cinco pasos de la ventana de cotizar, con su número, y en qué paso vive
 * cada dato que se muestra fuera de ella. **Abrir la cotización sin un dato
 * en particular** —su nombre, el N°— sigue en Productos.
 */
import { ESTADO_PRESUPUESTO } from './presupuestos.ts';

export const PASO = {
  cliente: 1,
  /** La fecha, los invitados, el tipo de evento, lo prometido. */
  evento: 2,
  /** Los menús, los extras, el total. */
  productos: 3,
  /** Mandarla, el pago y los cobros, la vigencia, el seguimiento. */
  envio: 4,
  /** El contrato. */
  contrato: 5
} as const;

/**
 * **La pastilla del estado**: lo que hay que hacer en ese estado. Una que se
 * está armando, a Productos; una mandada, vencida, ganada o cancelada, al
 * Envío (el seguimiento, la vigencia, los cobros, la devolución); una perdida
 * o no elegida, sin paso (se abre como siempre).
 */
export function pasoDelEstado(estado: string): number | undefined {
  switch (estado) {
    case ESTADO_PRESUPUESTO.candidato:
    case ESTADO_PRESUPUESTO.borrador:
      return PASO.productos;
    case ESTADO_PRESUPUESTO.enviado:
    case ESTADO_PRESUPUESTO.negociacion:
    case ESTADO_PRESUPUESTO.aceptado:
    case ESTADO_PRESUPUESTO.cancelada:
    case 'Vencida':
      return PASO.envio;
    default:
      return undefined;
  }
}

/** Un número de paso que vino en la dirección (`?paso=4`), o nada si no es uno. */
export function pasoDeTexto(t: string | null | undefined): number | undefined {
  const n = Number(String(t ?? '').trim());
  return Number.isInteger(n) && n >= PASO.cliente && n <= PASO.contrato ? n : undefined;
}

/**
 * **El link que abre una cotización desde otra pantalla**:
 * `/presupuestos?abrir=<id>&paso=4&preguntar=1`. `preguntar` abre además la
 * pregunta *¿La mandaste?*.
 */
export function linkACotizacion(id: string, paso?: number, preguntar = false): string {
  const q = new URLSearchParams({ abrir: id });
  if (paso) q.set('paso', String(paso));
  if (preguntar) q.set('preguntar', '1');
  return `/presupuestos?${q}`;
}
