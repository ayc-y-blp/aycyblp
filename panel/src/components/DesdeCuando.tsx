'use client';

/**
 * **¿Desde cuándo?** (2026-11-28, lo pidió el cliente: Felipe pasó a
 * contratado *"ya todo el noviembre"*, y su turno del 16 seguía sumando la
 * jornada en el Informe).
 *
 * Cada turno guarda la modalidad de ese día, a propósito: cambiar la ficha no
 * reescribe la historia sola. Esta ventana sale después de cambiar la
 * modalidad y pregunta desde qué día rige: *Desde hoy*, *Desde el 1 de este
 * mes* o un día elegido. Antes de cambiar nada dice qué días cambian y
 * cuánto, y **un día que ya se le pagó no se toca** (`cambioDeModalidad()`).
 * Se confirma a mano: corrige días, a veces cerrados, y mueve lo que se le
 * debe a alguien.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import AyudaCorta from './AyudaCorta';
import { enPesos } from '@/lib/ocupacion';
import { enCorto, hoy } from '@/lib/fechas';
import { esContratado, type DiaQueCambia } from '@/lib/equipo';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function DesdeCuando({ nombre, modalidad, onCerrar }: {
  nombre: string;
  /** La modalidad nueva. */
  modalidad: string;
  onCerrar: (cambiados?: number) => void;
}) {
  const hoyEs = hoy();
  const primeroDelMes = hoyEs.slice(0, 8) + '01';
  const [desde, setDesde] = useState('');
  const [eligiendo, setEligiendo] = useState(false);
  const [dias, setDias] = useState<DiaQueCambia[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const contratado = esContratado(modalidad);
  const palabra = contratado ? 'contratado' : 'por turno';

  async function pedir(fecha: string, confirmar = false) {
    setCargando(true); setError('');
    try {
      const r = await fetch('/api/equipo/modalidad', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trabajador: nombre, desde: fecha, modalidad, confirmar })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      if (confirmar) return onCerrar(d.cambiados ?? 0);
      setDesde(fecha);
      setDias(d.dias ?? []);
    } catch (e) {
      setError(String(e));
    } finally { setCargando(false); }
  }

  const cambian = (dias ?? []).filter((d) => !d.pagado);
  const pagados = (dias ?? []).filter((d) => d.pagado);
  const diferencia = cambian.reduce((s, d) => s + d.despues - d.antes, 0);
  const opcion = 'boton !min-h-[44px] !text-[15px]';

  return (
    <Dialogo titulo={`${nombre} pasa a ${palabra}: ¿desde cuándo?`} onCerrar={() => onCerrar()} ancho="max-w-xl">
      <p className="mt-2 flex items-center gap-1.5 text-[14px] text-hueso/75">
        Sus turnos desde ese día pasan a {palabra}.
        <AyudaCorta tema="desdeCuando" />
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Desde cuándo">
        <button type="button" disabled={cargando} onClick={() => void pedir(hoyEs)}
          className={`${opcion} ${desde === hoyEs ? '!border-oro bg-oro/15 font-bold' : ''}`}>
          Desde hoy
        </button>
        <button type="button" disabled={cargando} onClick={() => void pedir(primeroDelMes)}
          className={`${opcion} ${desde === primeroDelMes ? '!border-oro bg-oro/15 font-bold' : ''}`}>
          Desde el 1 de {MESES[Number(hoyEs.slice(5, 7)) - 1]}
        </button>
        {eligiendo ? (
          <input type="date" aria-label="Desde qué día" max={hoyEs}
            className="min-h-[44px] rounded-lg border-2 border-hueso/25 bg-tinta px-2 text-[15px]"
            onChange={(e) => e.target.value && void pedir(e.target.value)} />
        ) : (
          <button type="button" disabled={cargando} onClick={() => setEligiendo(true)} className={opcion}>
            📅 Elegir día…
          </button>
        )}
      </div>

      {cargando && <p className="mt-3 text-[14px] text-hueso/70">Mirando sus turnos…</p>}
      {error && <p className="mt-3 text-[14px] text-rojo-texto">{error}</p>}

      {dias && !cargando && (
        <div className="mt-3 rounded-xl border-2 border-hueso/20 p-3">
          {dias.length === 0 ? (
            <p className="text-[14px]">Desde el {enCorto(desde)} no tiene turnos que cambien.</p>
          ) : (
            <>
              <ul className="space-y-1 text-[14px]">
                {dias.map((d) => (
                  <li key={d.fecha} className="flex items-baseline justify-between gap-3">
                    <span>{enCorto(d.fecha)}</span>
                    {d.pagado
                      ? <span className="font-semibold text-ambar-texto">ya pagado: no se cambia</span>
                      : !d.vino && d.antes === d.despues
                        ? <span className="text-hueso/70">sin marcar todavía</span>
                        : <span className="tabular-nums">{enPesos(d.antes)} → <b>{enPesos(d.despues)}</b></span>}
                  </li>
                ))}
              </ul>
              {pagados.length > 0 && (
                <p className="mt-2 text-[13px] text-ambar-texto">
                  {pagados.length === 1 ? 'Ese día ya tiene' : 'Esos días ya tienen'} un pago de sueldo: se deja como está.
                  Si hay que devolver o descontar, se anota con un ajuste.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {cambian.length > 0 && (
          <button type="button" disabled={cargando} onClick={() => void pedir(desde, true)}
            className="boton boton-relleno !min-h-[44px] !text-[15px]">
            Cambiar {cambian.length} {cambian.length === 1 ? 'día' : 'días'}
          </button>
        )}
        <button type="button" onClick={() => onCerrar()} className="boton !min-h-[44px] !text-[15px]">
          {cambian.length > 0 ? 'No, dejar los turnos como están' : 'Listo'}
        </button>
        {cambian.length > 0 && (
          <span className="text-[14px] text-hueso/70">
            {diferencia < 0 ? `Baja ${enPesos(-diferencia)}` : diferencia > 0 ? `Sube ${enPesos(diferencia)}` : 'No cambia el monto'}
            {' '}lo que se le debe por turnos.
          </span>
        )}
      </div>
    </Dialogo>
  );
}
