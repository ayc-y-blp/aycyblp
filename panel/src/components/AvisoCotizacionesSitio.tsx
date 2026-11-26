'use client';

/**
 * **La ventana que avisa al vendedor de las cotizaciones del sitio**
 * (2026-11-23, lo pidió el cliente: *"al vendedor hay que avisar con un
 * popup (cuando se mete la próxima vez al panel) que le entraron cotizaciones
 * desde el sitio"*).
 *
 * Sale al entrar —en la portada y en Cotizaciones, que ya leen las
 * cotizaciones: ninguna lectura más— con las del sitio que esta cuenta no ha
 * visto. ***✓ Entendido*** las marca vistas y no vuelve a salir; *Abrir* las
 * marca y abre esa cotización; *Después* la cierra y vuelve a salir la
 * próxima vez.
 *
 * **Y las listas sin confirmar el envío** (2026-11-25, lo pidió el cliente:
 * *"reforzar el proceso de que tiene que confirmar si envió la cotización,
 * con popups"*): un segundo grupo, ámbar, con las cotizaciones listas que
 * esta cuenta no ha confirmado como mandadas (`avisosSinConfirmar()`), cada
 * una con *✓ Sí, la mandé* y *Abrir →*. Sale cada vez que entra, hasta
 * confirmarlas: no hay *Entendido* para ellas, porque lo que las saca es
 * confirmar. Se muestran cinco; las demás están en la Agenda y en la Lista.
 */
import { PASO, linkACotizacion } from '@/lib/pasos';
import { useState } from 'react';
import Dialogo from './Dialogo';
import FechaDia from './FechaDia';
import { TITULO_GRUPO, marcoGrupo, marcoTarjeta } from './TarjetaLista';
import { enPesos } from '@/lib/ocupacion';
import type { AvisoSitio } from '@/lib/promociones';
import type { AvisoSinConfirmar } from '@/lib/envio';
import EmpresaCliente from './EmpresaCliente';
import { AL_CONFIRMAR, marcarMandada } from './ConfirmarEnvio';

async function marcar(ids: string[]) {
  await fetch('/api/presupuestos/sitio-visto', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids })
  }).catch(() => {});
}

/** Cuántas listas sin confirmar se muestran: el resto está en la Agenda y en la Lista. */
const MOSTRAR = 5;

export default function AvisoCotizacionesSitio({ avisos, sinConfirmar = [], onAbrir, onCambio }: {
  avisos: AvisoSitio[];
  /**
   * **Las listas que esta cuenta no ha confirmado como mandadas**
   * (2026-11-25, `avisosSinConfirmar()`): el segundo grupo, con *✓ Sí, la
   * mandé* en cada una. Sale cada vez que entra, hasta que las confirme.
   */
  sinConfirmar?: AvisoSinConfirmar[];
  /** Abre una cotización en la misma pantalla; sin esto, va a Cotizaciones. */
  onAbrir?: (id: string) => void;
  /** Se confirmó alguna: para recargar lo de atrás al cerrar. */
  onCambio?: () => void;
}) {
  const [cerrado, setCerrado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [mandadas, setMandadas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState('');
  const [error, setError] = useState('');
  if (cerrado || (!avisos.length && !sinConfirmar.length)) return null;
  const una = avisos.length === 1;

  const cerrar = () => {
    setCerrado(true);
    if (mandadas.size) onCambio?.();
  };
  const entendido = async () => {
    setMarcando(true);
    await marcar(avisos.map((a) => a.id));
    cerrar();
  };
  const abrir = async (id: string, delSitio: boolean) => {
    if (delSitio) await marcar([id]);
    cerrar();
    // En el Envío: el seguimiento o confirmar que se mandó (2026-11-26, `lib/pasos.ts`).
    if (onAbrir) onAbrir(id);
    else window.location.href = linkACotizacion(id, PASO.envio);
  };
  const siLaMande = async (id: string) => {
    setConfirmando(id); setError('');
    const e = await marcarMandada(id);
    setConfirmando('');
    if (e) return setError(e);
    setMandadas((m) => new Set(m).add(id));
  };
  const visibles = sinConfirmar.slice(0, MOSTRAR);
  const faltan = sinConfirmar.length - visibles.length;
  const titulo = avisos.length
    ? (una ? '🌐 Te llegó una cotización del sitio' : `🌐 Te llegaron ${avisos.length} cotizaciones del sitio`)
    : (sinConfirmar.length === 1 ? '✉ ¿La mandaste?' : '✉ ¿Las mandaste?');

  return (
    <Dialogo titulo={titulo} onCerrar={cerrar} ancho="max-w-2xl">
      {avisos.length > 0 && (
        <>
          <div className={`${marcoGrupo('rosa')} p-3`}>
            <p className={`${TITULO_GRUPO} mb-2`}>Desde la página de promociones</p>
            <ul className="space-y-2">
              {avisos.map((a) => (
                <li key={a.id} className={`${marcoTarjeta(false, 'normal', false, true)} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">{a.cliente || 'Cliente del sitio'}
                      <EmpresaCliente nombre={a.cliente} empresa={a.empresa} className="ml-2" />
                      <span className="ml-2 text-[14px] font-normal text-hueso/70">N° {a.folio}</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-hueso/80">
                      {a.promo} · {a.fecha && <FechaDia fecha={a.fecha} tamano="aviso" conMes />} · {a.invitados} personas
                      · <strong className="text-hueso">{enPesos(a.total)}</strong>
                    </p>
                  </div>
                  <button type="button" className="boton min-h-[40px]" onClick={() => void abrir(a.id, true)}>Abrir →</button>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-[14px] text-hueso/80">
            {una ? 'Ya le llegó al cliente con su total, y está en tu agenda para contactarlo hoy.'
              : 'Ya les llegaron a los clientes con su total, y están en tu agenda para contactarlos hoy.'}
          </p>
        </>
      )}
      {sinConfirmar.length > 0 && (
        <div className={`${avisos.length ? 'mt-4' : ''} ${marcoGrupo('ambar')} p-3`}>
          <p className={`${TITULO_GRUPO} mb-1`}>
            {avisos.length ? '✉ ¿Las mandaste? ' : ''}Listas que no figuran como mandadas
          </p>
          <p className="mb-2 text-[14px] text-hueso/75">{AL_CONFIRMAR}</p>
          <ul className="space-y-2">
            {visibles.map((a) => (
              <li key={a.id} className={`${marcoTarjeta(false, 'normal', false, true)} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{a.cliente || 'Sin cliente'}
                    <EmpresaCliente nombre={a.cliente} empresa={a.empresa} className="ml-2" />
                    <span className="ml-2 text-[14px] font-normal text-hueso/70">N° {a.folio}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-hueso/80">
                    {a.fecha ? <FechaDia fecha={a.fecha} tamano="aviso" conMes /> : a.periodo || 'Sin fecha'}
                    {a.invitados > 0 && <> · {a.invitados} personas</>}
                    · <strong className="text-hueso">{enPesos(a.total)}</strong>
                  </p>
                </div>
                {mandadas.has(a.id) ? (
                  <span className="text-[14px] font-semibold text-verde-texto">✓ Enviada: ya cuenta en el calendario</span>
                ) : (
                  <>
                    <button type="button" className="boton min-h-[40px] !border-verde-fuerte font-semibold text-verde-texto"
                      disabled={!!confirmando} onClick={() => void siLaMande(a.id)}>
                      {confirmando === a.id ? 'Marcando…' : '✓ Sí, la mandé'}
                    </button>
                    <button type="button" className="boton min-h-[40px]" onClick={() => void abrir(a.id, false)}>Abrir →</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {faltan > 0 && (
            <p className="mt-2 text-[14px] text-hueso/75">
              Y {faltan} más: están en tu agenda y en la Lista, con <strong>✉ ¿La mandaste?</strong>
            </p>
          )}
          {error && <p className="mt-2 text-[14px] font-semibold text-rojo-texto">{error}</p>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="boton min-h-[44px]" onClick={cerrar}>
          {!avisos.length && visibles.every((a) => mandadas.has(a.id)) ? 'Listo' : 'Después'}
        </button>
        {avisos.length > 0 && (
          <button type="button" className="boton boton-relleno min-h-[44px] !px-5" disabled={marcando} onClick={entendido}>
            {marcando ? 'Marcando…' : '✓ Entendido'}
          </button>
        )}
      </div>
    </Dialogo>
  );
}
