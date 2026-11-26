'use client';
/**
 * **Pedir condiciones especiales** (2026-11-23, lo pidió el cliente: *"deja
 * la opción de solicitar otro monto para esta regla. Y ahí tiene que
 * confirmar la gerencia o el encargado de pagos"*). Ver `lib/condiciones.ts`.
 *
 * La ventanita que se abre desde la cotización cuando el cliente pide algo
 * más generoso que Configuración: más devolución, menos anticipo, cancelar
 * con menos aviso, más descuento. El vendedor escribe solo lo que pide y por
 * qué; le llega a la bandeja de quien aprueba (`/api/presupuestos/condiciones`)
 * y, aprobado, pasa a ser el tope de esa cotización.
 *
 * Los nombres van en una columna y los valores en otra (regla *los
 * formularios van alineados*), con el tope de hoy al lado de cada uno.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { avisar } from './AvisoFlotante';
import AyudaCorta from './AyudaCorta';
import { masGeneroso, valorCondicion, type CampoCondicion, type Topes, type Pedido } from '@/lib/condiciones';

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const CAMPOS: { campo: CampoCondicion; nombre: string; unidad: string; max: number }[] = [
  { campo: 'anticipo', nombre: 'Anticipo', unidad: '%', max: 100 },
  { campo: 'saldoDias', nombre: 'Saldo', unidad: 'días antes', max: 365 },
  { campo: 'descuento', nombre: 'Descuento', unidad: '%', max: 100 },
  { campo: 'cambiosFecha', nombre: 'Cambios de fecha', unidad: 'veces', max: 10 },
  { campo: 'cancelacionDias', nombre: 'Cancela hasta', unidad: 'días antes', max: 365 },
  { campo: 'reembolso', nombre: 'Devuelve', unidad: '% de lo pagado', max: 100 }
];

const CAJA = 'rounded border-2 border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none';
const ENTRADA = `w-full ${CAJA}`;

export default function PedirCondiciones({ id, cliente, topes, extras = {}, antes, onCerrar, onListo }: {
  id: string;
  cliente: string;
  /** Los topes de hoy para esta cotización: Configuración, o lo ya aprobado. */
  topes: Topes;
  /**
   * **Lo que también se pide con este botón** (2026-11-23): el mínimo del show
   * y del arriendo de esta cotización —si rige; `null` si no— y si se puede
   * pedir renovar la vigencia (ya se renovó una vez). Solo se dibuja lo que
   * aplica.
   */
  extras?: { show?: number | null; arriendo?: number | null; renovar?: boolean };
  /** Lo que hay que hacer antes de escribir: mandar lo pendiente del autoguardado. */
  antes?: () => Promise<void>;
  onCerrar: () => void;
  onListo: (marca: { condicionesPedidas: string; condicionesEspeciales: string }) => void;
}) {
  const [valores, setValores] = useState<Partial<Record<CampoCondicion, string>>>({});
  const [montos, setMontos] = useState<{ show?: string; arriendo?: string }>({});
  const [renovar, setRenovar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Solo lo escrito y más generoso que el tope: lo demás no hace falta pedirlo.
  const pedido: Pedido = {};
  for (const { campo } of CAMPOS) {
    const t = (valores[campo] ?? '').trim();
    if (!t) continue;
    const n = Math.round(Number(t));
    if (Number.isFinite(n) && masGeneroso(campo, n, topes)) pedido[campo] = n;
  }
  // Un monto del show o del arriendo, solo si es menos que su mínimo.
  for (const k of ['show', 'arriendo'] as const) {
    const minimo = extras[k];
    const t = (montos[k] ?? '').trim();
    const n = Math.round(Number(t));
    if (typeof minimo === 'number' && t && Number.isFinite(n) && n >= 0 && n < minimo) pedido[k] = n;
  }
  if (extras.renovar && renovar) pedido.renovar = 1;
  const listo = Object.keys(pedido).length > 0 && motivo.trim().length >= 5;

  async function pedir() {
    if (!listo) return;
    setGuardando(true);
    try {
      if (antes) await antes();
      const r = await fetch('/api/presupuestos/condiciones', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, accion: 'pedir', pedido, motivo: motivo.trim() })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { avisar(d.error || 'No se pudo pedir.', 'atencion'); return; }
      avisar('Pedido: le llega a la gerencia, al encargado de pagos y al administrador');
      onListo({ condicionesPedidas: d.condicionesPedidas ?? '', condicionesEspeciales: d.condicionesEspeciales ?? '' });
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={`Condiciones especiales para ${cliente || 'este cliente'}`} onCerrar={onCerrar} ancho="max-w-xl lg:max-w-4xl">
      <div className={`${marcoGrupo('ambar')} p-3`}>
        <p className={`flex items-center gap-1 ${TITULO_GRUPO}`}><span className="flex-1">Lo que pides</span><AyudaCorta tema="condicionesEspeciales" /></p>
        {/* En el teléfono, dos columnas —el nombre y el campo— y lo de hoy
            bajo el campo; desde 640px, lo de hoy en su propia columna. */}
        {/* En el computador, dos campos por fila (2026-11-23): con el show y el
            arriendo, en una columna la ventana pasaba de una pantalla. */}
        <div className="mt-2 grid grid-cols-[8.5rem_1fr] items-center gap-x-3 gap-y-2 sm:grid-cols-[8.5rem_7rem_1fr]
                        lg:grid-cols-[8.5rem_7rem_1fr_8.5rem_7rem_1fr]">
          {CAMPOS.map(({ campo, nombre, unidad, max }) => {
            const t = (valores[campo] ?? '').trim();
            const n = Math.round(Number(t));
            const yaCabe = t !== '' && Number.isFinite(n) && !masGeneroso(campo, n, topes);
            const hoy = (
              <span className={yaCabe ? 'font-semibold text-ambar-texto' : ''}>
                {yaCabe ? 'ya cabe: no hace falta pedirlo' : `hoy ${valorCondicion(campo, topes[campo])}`}
              </span>
            );
            return (
              <div key={campo} className="contents">
                <label htmlFor={`pedir-${campo}`} className="text-[15px] font-semibold">{nombre}</label>
                <div className="min-w-0">
                  <input id={`pedir-${campo}`} type="number" min={0} max={max} inputMode="numeric"
                    value={valores[campo] ?? ''} className={`${CAJA} w-[7rem]`}
                    onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))} />
                  <span className="mt-1 block text-[14px] leading-snug text-hueso/70 sm:hidden">{unidad} · {hoy}</span>
                </div>
                <span className="hidden text-[14px] leading-snug text-hueso/70 sm:block">{unidad} · {hoy}</span>
              </div>
            );
          })}
          {(['show', 'arriendo'] as const).map((k) => {
            const minimo = extras[k];
            if (typeof minimo !== 'number') return null;
            const t = (montos[k] ?? '').trim();
            const n = Math.round(Number(t));
            const yaCabe = t !== '' && Number.isFinite(n) && n >= minimo;
            const hoy = (
              <span className={yaCabe ? 'font-semibold text-ambar-texto' : ''}>
                {yaCabe ? 'ya cabe: no hace falta pedirlo' : `mínimo ${pesos(minimo)}`}
              </span>
            );
            return (
              <div key={k} className="contents">
                <label htmlFor={`pedir-${k}`} className="text-[15px] font-semibold">{k === 'show' ? 'Show ecuestre' : 'Arriendo'}</label>
                <div className="min-w-0">
                  <input id={`pedir-${k}`} type="number" min={0} inputMode="numeric"
                    value={montos[k] ?? ''} className={`${CAJA} w-[7rem]`}
                    onChange={(e) => setMontos((v) => ({ ...v, [k]: e.target.value }))} />
                  <span className="mt-1 block text-[14px] leading-snug text-hueso/70 sm:hidden">+ IVA · {hoy}</span>
                </div>
                <span className="hidden text-[14px] leading-snug text-hueso/70 sm:block">+ IVA · {hoy}</span>
              </div>
            );
          })}
          {extras.renovar && (
            <div className="contents">
              <span className="text-[15px] font-semibold">Vigencia</span>
              <button type="button" aria-pressed={renovar} onClick={() => setRenovar(!renovar)}
                className={`boton min-h-[40px] sm:col-span-2 sm:justify-self-start lg:col-span-2 ${renovar ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
                {renovar ? '✓ ' : ''}Renovarla · ya se renovó una vez
              </button>
            </div>
          )}
          <label htmlFor="pedir-motivo" className="self-start pt-2 text-[15px] font-semibold lg:col-start-1">Por qué</label>
          <textarea id="pedir-motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: cliente de todos los años, cierra hoy si le damos esto"
            className={`${ENTRADA} sm:col-span-2 lg:col-span-5`} />
        </div>
      </div>
      <p className="mt-3 text-[15px]">
        Le llega a la <b>gerencia general</b>, al <b>encargado de pagos</b> y al <b>administrador</b>. Si lo
        aprueban, pasa a ser el tope de esta cotización y queda escrito en ella.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="boton min-h-[44px] !border-2" onClick={onCerrar}>Volver</button>
        <button type="button" disabled={!listo || guardando} onClick={() => void pedir()}
          className="boton boton-relleno min-h-[44px] !px-5 !text-[15px] !font-bold disabled:opacity-50">
          {guardando ? 'Pidiendo…' : 'Pedir la aprobación'}
        </button>
      </div>
    </Dialogo>
  );
}
