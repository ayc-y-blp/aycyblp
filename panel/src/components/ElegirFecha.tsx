'use client';

/**
 * **Elegir un día con botones rápidos** (2026-11-23, la agenda del
 * vendedor): *Mañana · En 3 días · En una semana · 📅 Elegir… · Sin fecha*.
 * Es la misma pieza para el próximo contacto (en las notas) y para el plazo
 * prometido de una cotización (en el paso Evento): el mismo dato, la misma
 * forma.
 *
 * Los botones a la vista, como pide la regla PlayStation: el calendario del
 * navegador queda detrás de *📅 Elegir…*, para el día que no está en los
 * atajos. El elegido va en dorado y con borde, y dice el día.
 */
import { RAPIDAS, fechaRapida } from '@/lib/agenda';
import { enCorto, esFecha, type Fecha } from '@/lib/fechas';

export default function ElegirFecha({ valor, onCambio, hoy, hasta, etiqueta, sinFecha = 'Sin fecha' }: {
  /** `AAAA-MM-DD`, o vacío. */
  valor: string;
  onCambio: (v: string) => void;
  hoy: Fecha;
  /** El último día que se puede elegir (el día antes del evento), si hay. */
  hasta?: string;
  /** Para el lector de pantalla: *Volver a contactarlo*, *Mandarla antes del*. */
  etiqueta: string;
  /** Cómo se dice el botón de no elegir ninguno. */
  sinFecha?: string;
}) {
  const rapidas = RAPIDAS.map((r) => ({ ...r, fecha: fechaRapida(r.dias, hoy) }))
    .filter((r) => !hasta || r.fecha <= hasta);
  const esRapida = rapidas.some((r) => r.fecha === valor);
  const BOTON = 'boton min-h-[40px] px-3 !text-[14px] lg:min-h-[36px]';
  const ELEGIDO = 'border-oro bg-oro/15 !font-semibold';
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={etiqueta}>
      {rapidas.map((r) => (
        <button key={r.clave} type="button" aria-pressed={valor === r.fecha}
          onClick={() => onCambio(r.fecha)} className={`${BOTON} ${valor === r.fecha ? ELEGIDO : ''}`}>
          {r.rotulo}
          {valor === r.fecha && <span className="ml-1 font-normal text-hueso/70">· {enCorto(r.fecha)}</span>}
        </button>
      ))}
      {/* El día que no está en los atajos: el calendario del navegador. */}
      <label className={`${BOTON} relative cursor-pointer ${esFecha(valor) && !esRapida ? ELEGIDO : ''}`}>
        📅 {esFecha(valor) && !esRapida ? enCorto(valor) : 'Elegir…'}
        <input type="date" value={esFecha(valor) ? valor : ''} min={hoy} max={hasta || undefined}
          aria-label={`${etiqueta}: elegir el día`}
          onChange={(e) => onCambio(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <button type="button" aria-pressed={!valor} onClick={() => onCambio('')}
        className={`${BOTON} ${!valor ? ELEGIDO : ''}`}>{sinFecha}</button>
    </div>
  );
}
