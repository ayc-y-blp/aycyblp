'use client';
/**
 * **El periodo, en una sola pieza** (2026-11-22, lo pidió el cliente mirando
 * Cotizaciones → *Lista*: *"el mes debería estar abajo de estos botones de
 * mes, donde pertenecen juntos como unidad de parámetro… juntar la
 * información que pertenece junto, ahorrar espacio"*, y *"llévalo también a
 * Estadísticas"*). En un mismo marco dorado:
 *
 * 1. **los modos** —*Mes · Semana · Todo*, o *Mes · Semana · Día ·
 *    Personalizado*—, con el elegido relleno;
 * 2. **el mes o la semana con sus flechas** (◀ Noviembre 2026 ▶), o lo que
 *    lo reemplace (las fechas *desde* y *hasta* de *Personalizado*);
 * 3. **por qué fecha se cuenta** —la del evento o la de la cotización, la de
 *    la visita o la de la reserva—.
 *
 * Antes el mes iba en otra fila, lejos de su botón, y una frase *Mostrando…*
 * repetía lo que ya decían los botones. **En el celular** cada parte ocupa
 * una fila entera, con los botones parejos: sin huecos a la derecha.
 *
 * La usan la Lista de cotizaciones (`ListaCotizaciones`), Estadísticas
 * (`Estadisticas`) y Vendedores (`ResumenVendedor`): un cambio llega a las
 * tres.
 */
import type { ReactNode } from 'react';

const ELEGIDO = '!border-oro bg-oro/15 font-semibold text-oro';

export type ModoPeriodo = { clave: string; rotulo: string };
/** Por qué fecha: el ícono, la palabra larga del computador y la corta del celular. */
export type FechaPeriodo = { clave: string; icono: string; largo: string; corto: string };

export default function ElegirPeriodo({ modos, modo, onModo, titulo, onMover, enLugarDeFlechas, fechas, fecha, onFecha }: {
  modos: ModoPeriodo[];
  modo: string;
  onModo: (clave: string) => void;
  /** *Noviembre 2026*, *9 – 15 de noviembre*. Sin título no hay flechas (*Todo*). */
  titulo?: string;
  onMover?: (n: -1 | 1) => void;
  /** Lo que va en lugar de las flechas: las fechas de *Personalizado*. */
  enLugarDeFlechas?: ReactNode;
  fechas?: FechaPeriodo[];
  fecha?: string;
  onFecha?: (clave: string) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 rounded-xl border-2 border-oro/40 bg-oro/[0.05] p-1 lg:w-auto">
      <div className="flex w-full gap-1 lg:w-auto" role="group" aria-label="Periodo">
        {modos.map((m) => (
          <button key={m.clave} type="button" aria-pressed={modo === m.clave} onClick={() => onModo(m.clave)}
            className={`boton min-h-[40px] flex-1 lg:flex-none ${modo === m.clave ? ELEGIDO : 'bg-panel'}`}>{m.rotulo}</button>
        ))}
      </div>
      {enLugarDeFlechas ?? (titulo && onMover && (
        <div className="flex w-full items-center gap-1 lg:w-auto">
          <button type="button" aria-label="Periodo anterior" className="boton h-10 w-10 shrink-0 bg-panel !p-0 text-[16px]"
            onClick={() => onMover(-1)}>◀</button>
          <span className="min-w-[9.5rem] flex-1 text-center text-[16px] font-bold first-letter:uppercase lg:flex-none">{titulo}</span>
          <button type="button" aria-label="Periodo siguiente" className="boton h-10 w-10 shrink-0 bg-panel !p-0 text-[16px]"
            onClick={() => onMover(1)}>▶</button>
        </div>
      ))}
      {fechas && onFecha && (
        <div className="flex w-full gap-1 lg:w-auto" role="group" aria-label="Por qué fecha">
          {fechas.map((f) => (
            <button key={f.clave} type="button" aria-pressed={fecha === f.clave} onClick={() => onFecha(f.clave)}
              aria-label={f.largo}
              className={`boton min-h-[40px] flex-1 lg:flex-none ${fecha === f.clave ? ELEGIDO : 'bg-panel'}`}>
              {f.icono} <span className="sm:hidden">{f.corto}</span><span className="hidden sm:inline">{f.largo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
