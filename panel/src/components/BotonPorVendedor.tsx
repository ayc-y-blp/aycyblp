'use client';

/**
 * **👤 Por vendedor…**: el filtro de *De quién*, la misma pieza en el
 * calendario de Cotizaciones, la Lista y Clientes (2026-11-26, lo pidió el
 * cliente: *"el orden, estructura de diseño, columnas y filas debe ser
 * coherente en todos los elementos del sitio"*). Sin elegir, abre el buscador
 * (`BuscarEnLista`, que dibuja quien lo usa); elegido, *👤 Nombre ✕* lo suelta,
 * en dorado. Lo ve quien ve al equipo: la gerencia, pagos y el administrador.
 */
export default function BotonPorVendedor({ vendedor, nombre, cuantos, abierto, onAbrir, onSoltar }: {
  /** El elegido (su usuario o nombre), o `''`. */
  vendedor: string;
  /** Cómo se llama, si el id no es el nombre. */
  nombre?: string;
  /** Cuántos quedan con el filtro puesto, si se quiere decir. */
  cuantos?: number;
  abierto: boolean;
  onAbrir: () => void;
  onSoltar: () => void;
}) {
  if (vendedor) {
    return (
      <button type="button" onClick={onSoltar} title="Quitar el filtro"
        className="boton min-h-[44px] border-oro bg-oro/15 !font-semibold text-oro">
        👤 {nombre || vendedor}{cuantos !== undefined && <span className="ml-1 tabular-nums">{cuantos}</span>} ✕
      </button>
    );
  }
  return (
    <button type="button" onClick={onAbrir} aria-expanded={abierto} aria-haspopup="listbox"
      className="boton min-h-[44px]">👤 Por vendedor…</button>
  );
}
