/**
 * **En qué mesa se sentó, en su propia columna** (2026-11-28, lo pidió el
 * cliente: *"en reservas agregar asignado a mesa 11 si la anfitriona asignó
 * una mesa"*). Va a la izquierda del ícono del pago, en la página del día y en
 * la Recepción: la misma pieza en las dos.
 *
 * - **En el computador, columna**: cada fila deja su lugar aunque no tenga
 *   mesa (regla *el mismo dato va en la misma columna*), así la pastilla queda
 *   en la misma vertical en todas.
 * - **En el celular, bajo el nombre** (`enLinea`): como columna le quitaba el
 *   ancho al menú, que se partía letra a letra.
 */
const PASTILLA = 'inline-block break-words rounded-full border-2 border-hueso/30 px-2 py-0.5 text-center text-[13px] font-bold leading-tight';

export default function PastillaMesa({ mesa, enLinea = false }: { mesa?: string; enLinea?: boolean }) {
  const m = String(mesa ?? '').trim();
  if (enLinea) {
    return m ? <span className="mt-1 block lg:hidden"><span className={PASTILLA}>Mesa {m}</span></span> : null;
  }
  return (
    <span className="hidden w-[5.5rem] shrink-0 justify-center lg:flex" data-columna="mesa">
      {m && <span title={`Asignada a la mesa ${m}`} className={PASTILLA}>Mesa {m}</span>}
    </span>
  );
}
