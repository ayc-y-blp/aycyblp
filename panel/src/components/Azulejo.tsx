/**
 * Un azulejo: el número grande arriba y qué es debajo.
 *
 * **Es la misma forma para las filas de un resumen** —los menús que hay que
 * preparar, cómo viene el pago, las mesas— y eso es a propósito: son los
 * datos por los que se abre la página de un día un sábado en la mañana, y
 * repetir la forma es lo que los deja leerse de un vistazo sin aprender dos
 * diseños distintos.
 *
 * **Una sola pieza desde el 2026-11-21.** Estaba copiada en la página del día
 * y en la cara de reservas de la ventana del equipo; al tener que achicarla
 * en el computador pasó a este archivo (regla *un cambio de diseño se lleva a
 * sus parecidos*).
 *
 * **En el computador es un poco más chico** (lo pidió el cliente con una foto
 * del encabezado del día: *"todo puedes dejarlo en una línea, solo tienes que
 * achicar todo un poco"*): menos relleno y el número a 26px en vez de 30. Y
 * **se angosta antes de bajar de línea**: si la fila no cabe, la nota se dobla
 * en dos renglones (*1 reserva · / liberaron su lugar*) en vez de mandar la
 * fila entera abajo. La letra no baja de 13px. En el celular no cambia nada.
 *
 * **Qué se dobla primero.** La nota se parte en su punto medio (` · `): lo de
 * antes —*1 reserva*, la cuenta— nunca se corta, porque *1 / reserva* en dos
 * renglones no se lee; lo de después —la explicación— sí puede doblarse. Y el
 * azulejo que tiene explicación cede ocho veces más ancho que los demás
 * (`shrink`), así que se dobla esa nota antes que el título de su vecino.
 *
 * `compacto` es el relleno chico también en el celular: lo usa la ventana del
 * equipo, que ya lo tenía así.
 */
/**
 * Una palabra de hasta tres letras no queda sola al doblarse: *A Brasas
 * abiertas* se parte en *A Brasas / abiertas*, no en *A / Brasas / abiertas*.
 */
const sinHuerfanas = (t: string) => t.replace(/(^|\s)(\S{1,3})\s(?=\S)/g, '$1$2\u00a0');

export default function Azulejo({ n, titulo, nota, color, borde, compacto = false }: {
  n: number | string;
  titulo: string;
  nota?: string;
  color?: string;
  borde?: string;
  compacto?: boolean;
}) {
  const [cuenta, ...resto] = (nota ?? '').split(' · ');
  const explica = resto.join(' · ');
  return (
    <div className={`rounded border ${borde ?? 'border-hueso/15'} bg-panel ${
      compacto ? 'px-3 py-2' : 'px-4 py-2.5 lg:px-2.5 lg:py-2'} ${explica ? 'lg:shrink-[8]' : ''}`}>
      <div className={`text-3xl font-bold leading-none tabular-nums lg:text-[26px] ${color ?? 'text-oro'}`}>
        {n}
      </div>
      <div className="mt-1.5 text-sm font-medium leading-tight">{sinHuerfanas(titulo)}</div>
      {nota && (
        <div className="mt-0.5 text-[13px] text-hueso/60 lg:leading-tight">
          <span className="whitespace-nowrap">{cuenta}</span>{explica && <> · {explica}</>}
        </div>
      )}
    </div>
  );
}
