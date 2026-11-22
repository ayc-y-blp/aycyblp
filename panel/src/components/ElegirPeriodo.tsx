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
 * (`Estadisticas`), Vendedores (`ResumenVendedor`) y el Informe
 * (`InformeEquipo`): un cambio llega a las cuatro.
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
          {/* **Un título largo se dobla, el marco no** (desde 1280px, tope de
              12,5rem): *26 de octubre – 1 de noviembre 2026* va en dos
              renglones y el marco sigue en una línea, con lo de al lado en su
              fila. */}
          <span className="min-w-[9.5rem] flex-1 text-balance text-center text-[16px] font-bold leading-tight first-letter:uppercase lg:flex-none xl:max-w-[12.5rem]">{titulo}</span>
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

/**
 * **Las dos fechas de *Personalizado***, para `enLugarDeFlechas`: *Desde* y
 * *Hasta* con su campo, y una nota al final (cuántos días). Los nombres miden
 * lo mismo (regla *los formularios van alineados*): en el celular, uno bajo
 * el otro, los dos campos parten en la misma vertical. La usan Estadísticas
 * y el Informe.
 */
export function DesdeHasta({ desde, hasta, onCambio, nota }: {
  desde: string;
  hasta: string;
  onCambio: (cual: 'desde' | 'hasta', fecha: string) => void;
  nota?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 lg:w-auto">
      {(['desde', 'hasta'] as const).map((k) => (
        <label key={k} className="flex items-center gap-1.5 text-[13px] font-semibold text-hueso/70">
          <span className="w-11">{k === 'desde' ? 'Desde' : 'Hasta'}</span>
          <input type="date" value={k === 'desde' ? desde : hasta} aria-label={k === 'desde' ? 'Desde' : 'Hasta'}
            onChange={(e) => e.target.value && onCambio(k, e.target.value)}
            className="min-h-[40px] rounded border-2 border-hueso/20 bg-panel px-2 text-[15px] text-hueso focus:border-oro focus:outline-none" />
        </label>
      ))}
      {nota && <span className="text-[14px] text-hueso/70">{nota}</span>}
    </div>
  );
}
