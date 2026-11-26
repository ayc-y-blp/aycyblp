'use client';

/**
 * **✉ ¿La mandaste?, fuera de la cotización** (2026-11-25, lo pidió el
 * cliente: *"hay que reforzar el proceso de que tiene que confirmar si envió
 * la cotización, con popups y aviso dentro del sistema cuando uno pasa por
 * esta cotización por vendedor"*). Ver `lib/envio.ts`.
 *
 * - `PastillaEnvio`: la marca de una cotización lista y sin confirmar, en la
 *   fila de la Lista, del día del calendario y de *Sin fecha*, en la Agenda y
 *   en Clientes. Abre la cotización en el paso 4 con la pregunta (desde el
 *   2026-11-26; ver abajo).
 * - `marcarMandada()`: el *✓ Sí, la mandé* de la ventana al entrar
 *   (`seguimiento: 'enviada'`, la misma llamada de la cotización; la fecha la
 *   pone el servidor).
 */
import { Pastilla } from './Pastilla';

/** *✓ Sí, la mandé*: pasa a Enviada. Devuelve el error, o `''` si quedó. */
export async function marcarMandada(id: string): Promise<string> {
  try {
    const r = await fetch('/api/presupuestos', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, seguimiento: 'enviada' })
    });
    const d = await r.json().catch(() => ({}));
    return !r.ok || d.error ? (d.error || 'No se pudo marcar. Prueba de nuevo.') : '';
  } catch {
    return 'No se pudo marcar. Revisa la conexión y prueba de nuevo.';
  }
}

/** La frase de lo que pasa al confirmar, la misma en todas partes. */
export const AL_CONFIRMAR = <>Pasa a <strong>Enviada</strong>: desde hoy corre su vigencia y aparece como posible
  en el calendario de reservas.</>;

/**
 * **La marca: abre la cotización en el paso 4 y pregunta al tiro**
 * (2026-11-26, lo pidió el cliente: *"el botón sin confirmar el envío debería
 * terminar en paso 4 envío, no en productos. Y luego cuando yo aprieto, debe
 * preguntarme al tiro si quiero confirmar el envío"*). Hasta ese día, a su
 * vendedor le abría una ventanita suelta, y a la gerencia era un aviso que no
 * se apretaba: al apretarlo se abría la fila, en Productos.
 *
 * - **Quien puede tocar la cotización** (su vendedor; la gerencia, pagos y el
 *   administrador) la aprieta: `onAbrir` (en Cotizaciones) o `href` (desde
 *   otra pantalla, `linkACotizacion()`). A su vendedor dice *¿La mandaste?*; a
 *   los demás, *sin confirmar el envío*.
 * - **Quien solo la mira**, un aviso que no se aprieta.
 */
export function PastillaEnvio({ cliente, suya, onAbrir, href, className = '' }: {
  cliente: string;
  /** Si esta cuenta es la que la mandó: la pregunta es *¿La mandaste?*. */
  suya: boolean;
  onAbrir?: () => void;
  href?: string;
  className?: string;
}) {
  if (!onAbrir && !href) {
    return (
      <Pastilla tipo="alerta" className={className} title="Está lista y su vendedor todavía no confirma que la mandó">
        <span aria-hidden>✉</span>sin confirmar el envío
      </Pastilla>
    );
  }
  const clase = `tecla relative z-10 inline-flex min-h-[36px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full
                 border-2 border-ambar-fuerte bg-panel px-3 text-[13px] font-semibold text-ambar-texto
                 hover:bg-ambar/10 ${className}`;
  const texto = <><span aria-hidden>✉</span>{suya ? '¿La mandaste?' : 'sin confirmar el envío'}</>;
  const nombre = `${suya ? '¿Le mandaste' : '¿Ya se le mandó'} la cotización a ${cliente || 'tu cliente'}? Abre su paso Envío`;
  const titulo = 'Está lista y todavía no figura como mandada. Abre el paso Envío y pregunta.';
  return href
    ? <a href={href} aria-label={nombre} title={titulo} className={clase}>{texto}</a>
    : <button type="button" onClick={onAbrir} aria-label={nombre} title={titulo} className={clase}>{texto}</button>;
}
