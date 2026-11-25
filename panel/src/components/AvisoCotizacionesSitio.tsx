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
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import FechaDia from './FechaDia';
import { TITULO_GRUPO, marcoGrupo, marcoTarjeta } from './TarjetaLista';
import { enPesos } from '@/lib/ocupacion';
import type { AvisoSitio } from '@/lib/promociones';
import EmpresaCliente from './EmpresaCliente';

async function marcar(ids: string[]) {
  await fetch('/api/presupuestos/sitio-visto', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids })
  }).catch(() => {});
}

export default function AvisoCotizacionesSitio({ avisos, onAbrir }: {
  avisos: AvisoSitio[];
  /** Abre una cotización en la misma pantalla; sin esto, va a Cotizaciones. */
  onAbrir?: (id: string) => void;
}) {
  const [cerrado, setCerrado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  if (cerrado || !avisos.length) return null;
  const una = avisos.length === 1;

  const entendido = async () => {
    setMarcando(true);
    await marcar(avisos.map((a) => a.id));
    setCerrado(true);
  };
  const abrir = async (id: string) => {
    await marcar([id]);
    setCerrado(true);
    if (onAbrir) onAbrir(id);
    else window.location.href = `/presupuestos?abrir=${encodeURIComponent(id)}`;
  };

  return (
    <Dialogo titulo={una ? '🌐 Te llegó una cotización del sitio' : `🌐 Te llegaron ${avisos.length} cotizaciones del sitio`}
      onCerrar={() => setCerrado(true)} ancho="max-w-2xl">
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
              <button type="button" className="boton min-h-[40px]" onClick={() => abrir(a.id)}>Abrir →</button>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 text-[14px] text-hueso/80">
        {una ? 'Ya le llegó al cliente con su total, y está en tu agenda para contactarlo hoy.'
          : 'Ya les llegaron a los clientes con su total, y están en tu agenda para contactarlos hoy.'}
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className="boton min-h-[44px]" onClick={() => setCerrado(true)}>Después</button>
        <button type="button" className="boton boton-relleno min-h-[44px] !px-5" disabled={marcando} onClick={entendido}>
          {marcando ? 'Marcando…' : '✓ Entendido'}
        </button>
      </div>
    </Dialogo>
  );
}
