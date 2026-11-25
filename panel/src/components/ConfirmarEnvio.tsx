'use client';

/**
 * **✉ ¿La mandaste?, fuera de la cotización** (2026-11-25, lo pidió el
 * cliente: *"hay que reforzar el proceso de que tiene que confirmar si envió
 * la cotización, con popups y aviso dentro del sistema cuando uno pasa por
 * esta cotización por vendedor"*). Ver `lib/envio.ts`.
 *
 * - `PastillaEnvio`: la marca de una cotización lista y sin confirmar, en la
 *   fila de la Lista, del día del calendario y de *Sin fecha*, en la Agenda y
 *   en Clientes. **A su vendedor se le aprieta** y pregunta, sin abrir la
 *   cotización; a la gerencia, pagos y el administrador se les muestra como
 *   aviso (la pregunta es de quien la mandó).
 * - `PreguntaEnvio`: la ventanita, igual a la que sale dentro de la
 *   cotización (mismo marco rosado, mismas palabras).
 * - `marcarMandada()`: el *✓ Sí, la mandé* (`seguimiento: 'enviada'`, la
 *   misma llamada de la cotización; la fecha la pone el servidor).
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { Pastilla } from './Pastilla';
import { TITULO_GRUPO, marcoGrupo } from './TarjetaLista';

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

export function PreguntaEnvio({ id, cliente, onCerrar, onListo }: {
  id: string; cliente: string; onCerrar: () => void;
  /** Ya quedó Enviada: para recargar lo de atrás. */
  onListo: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const si = async () => {
    setGuardando(true);
    const e = await marcarMandada(id);
    setGuardando(false);
    if (e) return setError(e);
    onListo();
  };
  return (
    <Dialogo titulo="¿La mandaste?" onCerrar={onCerrar}>
      <div className={`mt-3 ${marcoGrupo('rosa')} p-3`}>
        <p className={TITULO_GRUPO}>¿Le mandaste la cotización a {cliente || 'tu cliente'}?</p>
        <p className="mt-1 text-[14px] text-hueso/75">Está lista y todavía no figura como mandada.</p>
        <p className="mt-2 text-[14px] text-hueso/75">{AL_CONFIRMAR}</p>
      </div>
      {error && <p className="mt-3 text-[14px] font-semibold text-rojo-texto">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" className="boton min-h-[48px]" onClick={onCerrar}>Todavía no</button>
        <button type="button" autoFocus disabled={guardando} onClick={() => void si()}
          className="boton boton-relleno min-h-[52px] px-6 text-[16px]">
          {guardando ? 'Marcando…' : '✓ Sí, la mandé'}
        </button>
      </div>
    </Dialogo>
  );
}

/**
 * La marca: un botón ámbar de 36px para su vendedor (abre `PreguntaEnvio`),
 * o una pastilla de aviso para quien solo la mira.
 */
export function PastillaEnvio({ id, cliente, pregunta, onListo, className = '' }: {
  id: string; cliente: string;
  /** Si esta cuenta es la que la mandó: entonces se aprieta. */
  pregunta: boolean;
  onListo: () => void;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  if (!pregunta) {
    return (
      <Pastilla tipo="alerta" className={className} title="Está lista y su vendedor todavía no confirma que la mandó">
        <span aria-hidden>✉</span>sin confirmar el envío
      </Pastilla>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} aria-label={`¿Le mandaste la cotización a ${cliente || 'tu cliente'}?`}
        title="Está lista y todavía no figura como mandada"
        className={`tecla relative z-10 inline-flex min-h-[36px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full
                    border-2 border-ambar-fuerte bg-panel px-3 text-[13px] font-semibold text-ambar-texto
                    hover:bg-ambar/10 ${className}`}>
        <span aria-hidden>✉</span>¿La mandaste?
      </button>
      {abierta && (
        <PreguntaEnvio id={id} cliente={cliente} onCerrar={() => setAbierta(false)}
          onListo={() => { setAbierta(false); onListo(); }} />
      )}
    </>
  );
}
