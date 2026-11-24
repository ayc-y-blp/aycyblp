'use client';
/**
 * **🎁 Aplicar promoción** (2026-11-24, lo pidió el cliente: *"el vendedor
 * manualmente también tiene que poder elegir las promociones. Y con toda la
 * posibilidad de editarlo dentro de la cotización según las reglas que
 * permite la configuración"*). La ventanita que se abre desde el paso
 * Productos de la cotización, al lado del descuento sobre el total.
 *
 * - **Las promociones activas, a la vista**: son pocas y fijas (las de
 *   *Productos → 🎁 Promociones*), así que van como botones, no con buscador.
 * - **Dice qué pasa** antes de aplicar: qué menú de adulto se reemplaza,
 *   qué productos se agregan, qué descuento queda y si perdona el arriendo
 *   ese día. Lo demás de la cotización se queda (`aplicarALineas()`).
 * - **Bajo su mínimo de personas no rige** (`rigePromocion()`): se puede
 *   aplicar igual —el grupo puede crecer—, y lo dice.
 * - Después todo se edita como siempre: cantidades, precios, quitar o sumar
 *   productos. **Su descuento vale aunque pase el tope del vendedor**
 *   (lo decidió el cliente: *"que valga el descuento de la promoción"*); lo
 *   comprueba el servidor (`conTopes()` en `/api/presupuestos`).
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { marcoGrupo, marcoTarjeta, TITULO_GRUPO } from './TarjetaLista';
import {
  ARRIENDO_PROMO, beneficioDePromocion, rigePromocion, aplicarALineas, type Promocion
} from '@/lib/promociones';
import type { Menu } from '@/lib/menus';

/** *−10% · −15% desde 50*: el descuento de la promoción con sus tramos. */
export const textoDescuentoPromo = (p: Pick<Promocion, 'descuento' | 'tramos'>) =>
  [p.descuento ? `−${p.descuento}%` : 'sin descuento', ...p.tramos.map((t) => `−${t.descuento}% desde ${t.desde}`)].join(' · ');

export default function AplicarPromocion({ promociones, catalogo, invitados, fecha, yaEstan, onCerrar, onAplicar }: {
  promociones: Promocion[];
  catalogo: Menu[];
  invitados: number;
  fecha: string;
  /** Las líneas que ya tiene la cotización: lo que ya está no se repite. */
  yaEstan: { concepto: string; personas: number }[];
  onCerrar: () => void;
  onAplicar: (promo: Promocion, menu: string) => void;
}) {
  const activas = promociones.filter((p) => p.activa);
  const [elegida, setElegida] = useState<Promocion | null>(activas.length === 1 ? activas[0] : null);
  const [menu, setMenu] = useState('');
  const faltaMenu = !!elegida && elegida.menus.length > 1 && !menu;
  const resultado = elegida && !faltaMenu
    ? aplicarALineas(elegida, menu, invitados, '', catalogo, yaEstan) : null;
  const menuElegido = elegida ? (elegida.menus.length === 1 ? elegida.menus[0] : menu) : '';
  // Si un menú pasa al de la promoción, eso ya se dice arriba: no se repite en *Se agrega*.
  const nuevas = (resultado?.agregadas ?? []).filter((l) => !(resultado?.reemplazadas.length && l.concepto === menuElegido));
  const beneficio = elegida ? beneficioDePromocion(elegida, invitados, fecha) : null;

  return (
    <Dialogo titulo="🎁 Aplicar una promoción" onCerrar={onCerrar} ancho="max-w-2xl">
      {activas.length === 0 ? (
        <p className="text-[15px]">
          No hay promociones activas. Se arman en <b>Productos → 🎁 Promociones</b>.
        </p>
      ) : (
        <div className={`${marcoGrupo('oro')} p-3`}>
          <p className={TITULO_GRUPO}>Promociones activas</p>
          <div role="radiogroup" aria-label="Promoción" className="mt-2 grid gap-2 lg:grid-cols-2">
            {activas.map((p) => {
              const es = elegida?.id === p.id;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={es}
                  onClick={() => { setElegida(p); setMenu(''); }}
                  className={`${marcoTarjeta(es, 'normal', false, true)} block min-h-[44px] w-full px-3 py-2 text-left`}>
                  <span className="block text-[15px] font-semibold">{p.nombre}</span>
                  <span className="block text-[13px] text-hueso/75">
                    Desde {Math.max(1, p.minimo)} personas · {textoDescuentoPromo(p)}
                    {p.arriendo !== ARRIENDO_PROMO.siempre ? ` · ${p.arriendo.toLowerCase()}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {elegida && elegida.menus.length > 1 && (
        <div className={`${marcoGrupo(false)} mt-3 p-3`}>
          <p className={TITULO_GRUPO}>¿Qué menú?</p>
          <div role="radiogroup" aria-label="Menú" className="mt-2 flex flex-wrap gap-2">
            {elegida.menus.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={m === menu} onClick={() => setMenu(m)}
                className={`boton min-h-[40px] !border-2 ${m === menu ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {elegida && beneficio && !faltaMenu && (
        <div className="mt-3 space-y-1 text-[15px]">
          <p>
            {resultado?.reemplazadas.length ? (
              <>{resultado.reemplazadas.map((l) => `${l.concepto} (${l.personas})`).join(' y ')} pasa a <b>{menuElegido}</b>. </>
            ) : null}
            {nuevas.length
              ? <>Se agrega {nuevas.map((l) => l.personas > 0 ? `${l.concepto} (${l.personas})` : l.concepto).join(', ')}. </>
              : resultado?.reemplazadas.length ? null : <>Sus productos ya están en la cotización. </>}
            Lo demás se queda.
          </p>
          {rigePromocion(elegida, invitados) ? (
            <p>
              Con {invitados} personas, <b>−{beneficio.descuento}% sobre el total</b>
              {beneficio.sinArriendo ? <>, y <b>sin arriendo</b> ese día</> : null}.
            </p>
          ) : (
            <p className="text-ambar-texto">
              ⚠ Pide desde {Math.max(1, elegida.minimo)} personas: con {invitados} no rige su descuento
              {elegida.arriendo !== ARRIENDO_PROMO.siempre ? ' ni su arriendo' : ''}, hasta que lleguen.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="boton min-h-[44px] !border-2" onClick={onCerrar}>Volver</button>
        <button type="button" disabled={!elegida || faltaMenu}
          onClick={() => elegida && onAplicar(elegida, menu)}
          className="boton boton-relleno min-h-[44px] disabled:opacity-50">
          Aplicar la promoción
        </button>
      </div>
    </Dialogo>
  );
}
