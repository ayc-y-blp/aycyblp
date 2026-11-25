'use client';
/**
 * **¿Se cayó?** (2026-11-22, lo pidió el cliente: *"cuando llega la llamada
 * del cliente 'no vamos', que en cualquier momento el vendedor puede decir,
 * ok, se cayó… con reconfirmación, se cayó y darle una razón, pero hacerlo
 * muy fácil"*). La ventanita que se abre desde *Se cayó…*: en la ventana de
 * cotizar, en cualquier paso, y en cada fila de la lista.
 *
 * - **Pide el motivo** con los botones de siempre (`MOTIVOS_PERDIDA`) o
 *   escrito, y no deja seguir sin él: queda en la cotización y en la
 *   bitácora.
 * - **Dice qué pasa** antes del botón: pasa a *Perdidas*, sale de la lista y
 *   del calendario, se puede volver a abrir. Si tiene alternativas en
 *   carrera, que se caen con ella.
 * - **Lo comprueba el servidor** (`/api/presupuestos/perdida`): quién puede
 *   tocarla y que no sea una ganada, que se cancela con *Cancelar evento*.
 *
 * **La misma ventanita para una reserva** (2026-11-25, `lib/caida.ts`): con
 * `motivos`, `titulo`, `queDice` y `mandar`, la usa *✕ Se cayó…* de la página
 * del día. Es la misma pieza para el mismo dato: algo que se cae, con su
 * motivo y su confirmación.
 */
import { useState, type ReactNode } from 'react';
import Dialogo from './Dialogo';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { avisar } from './AvisoFlotante';
import { MOTIVOS_PERDIDA } from '@/lib/cotizar';

export default function SeCayo({ id, cliente, alternativas = 1, antes, onCerrar, onListo,
  titulo, motivos = MOTIVOS_PERDIDA, queDice, mandar, listoDice }: {
  id: string;
  cliente: string;
  /** Cuántas cotizaciones del grupo siguen en carrera, ella incluida. */
  alternativas?: number;
  /** Lo que hay que hacer antes de escribir: en la ventana de cotizar, mandar lo pendiente. */
  antes?: () => Promise<void>;
  onCerrar: () => void;
  onListo: () => void;
  /** Para otra cosa que se cae (una reserva): su título, sus motivos, qué pasa y cómo se manda. */
  titulo?: string;
  motivos?: string[];
  queDice?: ReactNode;
  /** Manda el motivo; devuelve el error, o `null` si salió bien. */
  mandar?: (motivo: string) => Promise<string | null>;
  listoDice?: string;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const listo = motivo.trim().length >= 2;

  async function confirmar() {
    if (!listo) return;
    setGuardando(true);
    try {
      if (antes) await antes();
      if (mandar) {
        const error = await mandar(motivo.trim());
        if (error) { avisar(error, 'atencion'); return; }
        avisar(listoDice || 'Listo');
        onListo();
        return;
      }
      const r = await fetch('/api/presupuestos/perdida', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, motivo: motivo.trim() })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(`Se cayó: ${cliente || 'la cotización'} pasa a Perdidas`);
      onListo();
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={titulo || `¿Se cayó la cotización de ${cliente || 'este cliente'}?`} onCerrar={onCerrar} ancho="max-w-lg">
      <div className={`${marcoGrupo('rosa')} p-3`}>
        <p className={TITULO_GRUPO}>Por qué</p>
        <div role="radiogroup" aria-label="Motivo" className="mt-2 flex flex-wrap gap-2">
          {motivos.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={o === motivo}
              onClick={() => setMotivo(o === motivo ? '' : o)}
              className={`boton min-h-[40px] !border-2 ${o === motivo ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
              {o}
            </button>
          ))}
        </div>
        <input value={motivos.includes(motivo) ? '' : motivo} onChange={(e) => setMotivo(e.target.value)}
          placeholder="u otro motivo" aria-label="Otro motivo"
          className="mt-2 w-full rounded border-2 border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none" />
      </div>
      {queDice ?? (
        <p className="mt-3 text-[15px]">
          Pasa a <b>Perdidas</b>{alternativas > 1 ? <>, con sus {alternativas - 1} {alternativas === 2 ? 'alternativa' : 'alternativas'}</> : null}:
          sale de la lista y del calendario. Se puede volver a abrir.
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="boton min-h-[44px] !border-2" onClick={onCerrar}>No, volver</button>
        <button type="button" disabled={!listo || guardando} onClick={() => void confirmar()}
          className="boton min-h-[44px] !border-rojo-fuerte bg-rojo-fuerte !text-[15px] !font-bold text-tinta disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Sí, se cayó'}
        </button>
      </div>
    </Dialogo>
  );
}
