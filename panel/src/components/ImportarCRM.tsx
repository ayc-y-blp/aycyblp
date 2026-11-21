'use client';

/**
 * **Importar del CRM viejo** (2026-11-21), en Configuración → Mantención.
 * Solo el administrador (`mantencion`).
 *
 * Qué entra y cómo calzan las etapas vive en `lib/importar.ts`. Esta ventana
 * es el control que pidió el cliente (*"controlarlo, claro"*): **muestra lo
 * que va a entrar antes de escribir nada** —cuántas fichas, cuántos
 * candidatos, borradores y ganadas, cuántas reservas del sitio viejo, qué
 * cuenta calzó con cada vendedor, qué filas quedan afuera y cómo queda el
 * cupo de cada día que toma una ganada o una reserva— y no importa sin que
 * alguien marque que lo revisó.
 *
 * **No muestra datos de clientes**: cuentas, días y números de fila. Los
 * nombres están en la planilla, que es donde se corrigen.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import CualBase from './CualBase';
import AyudaCorta from './AyudaCorta';
import { usarPuede } from './SesionCliente';
import { enCorto, type Fecha } from '@/lib/fechas';

interface Dia {
  fecha: string; reservas: number; ganadas: number; personas: number;
  capacidad: number; libres: number; sobre: number; dia: 'crea' | 'reabre' | '';
}
interface Vista {
  estan: { clientes: boolean; cotizaciones: boolean; reservas: boolean };
  fichas: number; fichasQueYaEstaban: number;
  candidatos: number; borradores: number; cotizacionesQueYaEstaban: number;
  ganadas: number;
  reservas: number; reservasQueYaEstaban: number; reservasPagadas: number;
  dias: Dia[];
  vendedores: { nombre: string; usuario: string; fichas: number; cotizaciones: number }[];
  problemas: string[];
  sinCatalogo: { concepto: string; veces: number }[];
  pestanas: { clientes: string; cotizaciones: string; reservas: string };
  nombrePlanilla?: string; entorno?: 'produccion' | 'prueba' | '';
  planilla: string;
}
interface Hecho { fichas: number; candidatos: number; borradores: number; ganadas: number; sinGanar: number; reservas: number; avisos: number }

const n = (c: number, uno: string, varios: string) => `${c.toLocaleString('es-CL')} ${c === 1 ? uno : varios}`;
/** Cuántos avisos se listan: con más, la ventana dejaría de caber en la pantalla. */
const A_LA_VISTA = 4;

/** Cómo queda un día que toma cupo, en una frase corta: cabe en un renglón con su fecha. */
function comoQueda(g: Dia): { texto: string; aviso: boolean } {
  const dia = g.dia === 'crea' ? 'se abre privado' : g.dia === 'reabre' ? 'se reabre privado' : '';
  if (g.sobre > 0) {
    return { aviso: true, texto: (dia ? `${dia} · ` : '') + `⚠ ${g.sobre} sobre el cupo de ${g.capacidad}` };
  }
  return { aviso: false, texto: (dia ? `${dia} · ` : '') + `quedan ${g.libres - g.personas}` };
}

export default function ImportarCRM() {
  const puede = usarPuede('mantencion');
  const [abierta, setAbierta] = useState(false);
  const [vista, setVista] = useState<Vista | null>(null);
  const [error, setError] = useState('');
  const [revisado, setRevisado] = useState(false);
  const [importando, setImportando] = useState(false);
  const [hecho, setHecho] = useState<Hecho | null>(null);

  if (!puede) return null;

  async function mirar() {
    setVista(null); setError(''); setRevisado(false); setHecho(null);
    try {
      const r = await fetch('/api/mantencion/importar');
      const d = await r.json();
      if (!r.ok || d.error) setError(d.error || 'No se pudo leer la planilla.');
      else setVista(d);
    } catch (e) { setError(String(e)); }
  }

  async function importar() {
    setImportando(true); setError('');
    try {
      const r = await fetch('/api/mantencion/importar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmado: revisado })
      });
      const d = await r.json();
      if (!r.ok || d.error) { setError(d.error || 'No se pudo importar.'); return; }
      setHecho(d);
    } catch (e) { setError(String(e)); }
    finally { setImportando(false); }
  }

  // Con una sola de las tres pestañas ya hay qué mirar: la de reservas es opcional
  // y se puede importar sola. Las dos del CRM van juntas.
  const faltanPestanas = !!vista && !vista.estan.clientes && !vista.estan.cotizaciones && !vista.estan.reservas;
  const faltaUnaDelCRM = !!vista && vista.estan.clientes !== vista.estan.cotizaciones;
  const cotizaciones = vista ? vista.candidatos + vista.borradores + vista.ganadas : 0;
  const hayAlgo = !!vista && (vista.fichas > 0 || cotizaciones > 0 || vista.reservas > 0);
  const queImporta = vista ? [
    ...(vista.fichas ? [n(vista.fichas, 'ficha', 'fichas')] : []),
    ...(cotizaciones ? [n(cotizaciones, 'cotización', 'cotizaciones')] : []),
    ...(vista.reservas ? [n(vista.reservas, 'reserva', 'reservas')] : [])
  ] : [];
  const cualBase = vista && !hecho ? <CualBase entorno={vista.entorno} nombre={vista.nombrePlanilla} /> : null;
  const sinCuenta = vista ? vista.vendedores.filter((v) => !v.usuario) : [];

  return (
    <div className="mt-6 border-t border-hueso/10 pt-4">
      <p className="text-[16px] font-bold">📥 Importar del CRM</p>
      <p className="mt-1 max-w-2xl text-[14px] text-hueso/75">
        Trae las fichas de los clientes y lo que viene a futuro —candidatos, cotizados y ganados—, y
        las reservas del sitio viejo, desde pestañas de la planilla. Antes de escribir nada muestra qué entra.
      </p>
      <button type="button" onClick={() => { setAbierta(true); void mirar(); }} className="boton mt-3 min-h-[44px]">
        📥 Ver qué entra…
      </button>

      {abierta && (
        <Dialogo titulo="Importar del CRM" ancho="max-w-2xl lg:max-w-6xl" onCerrar={() => setAbierta(false)} alLado={cualBase}>
          {!vista && !error && <p className="mt-3 text-[15px] text-hueso/70">Leyendo las pestañas de la planilla…</p>}
          {/* En el celular, la misma línea debajo del título. */}
          {cualBase && <div className="mt-3 lg:hidden">{cualBase}</div>}

          {hecho ? (
            <div className="mt-3 rounded-xl border-2 border-verde-fuerte bg-verde/10 p-3" role="status">
              <p className="text-[16px] font-bold text-verde-texto">✓ Importado</p>
              <p className="mt-1 text-[15px]">
                Entraron {n(hecho.fichas, 'ficha', 'fichas')}, {n(hecho.candidatos, 'candidato', 'candidatos')},{' '}
                {n(hecho.borradores, 'borrador', 'borradores')}, {n(hecho.ganadas, 'ganada', 'ganadas')} y{' '}
                {n(hecho.reservas, 'reserva del sitio viejo', 'reservas del sitio viejo')}.
              </p>
              {hecho.ganadas > 0 && (
                <p className="mt-2 text-[15px] font-semibold text-ambar-texto">
                  ⚠ Las ganadas ya están en el calendario, por pagar. Anota el anticipo de cada una en su
                  cotización, con su comprobante: hasta entonces el sitio sigue ofreciendo ese día a quien paga ahora.
                </p>
              )}
              {hecho.sinGanar > 0 && (
                <p className="mt-2 text-[15px] font-semibold text-ambar-texto">
                  ⚠ {n(hecho.sinGanar, 'ganada quedó', 'ganadas quedaron')} como borrador. Su reserva ya está anotada:
                  termínala con «Marcar ganada», desde Cotizaciones.
                </p>
              )}
              <p className="mt-2 text-[14px] text-hueso/75">
                Queda en la bitácora, a tu nombre. Las pestañas de importar ya no hacen falta: puedes borrarlas de la planilla.
              </p>
              <div className="mt-3 flex justify-end">
                <button type="button" className="boton min-h-[48px]" onClick={() => setAbierta(false)}>Cerrar</button>
              </div>
            </div>
          ) : vista && faltanPestanas ? (
            <div className="mt-3 rounded-xl border-2 border-oro/50 p-3">
              <p className="text-[15px] font-bold">Falta subir las pestañas a la planilla</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px]">
                <li>Abre la planilla.</li>
                <li><strong>Archivo → Importar → Subir</strong>, y elige el Excel para importar.</li>
                <li>En <em>Ubicación de importación</em>, elige <strong>Insertar hojas nuevas</strong>.</li>
                <li>
                  Del CRM quedan dos pestañas, <strong>{vista.pestanas.clientes}</strong> y{' '}
                  <strong>{vista.pestanas.cotizaciones}</strong>; de los pedidos del sitio viejo, <strong>{vista.pestanas.reservas}</strong>.
                </li>
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={vista.planilla} target="_blank" rel="noreferrer" className="boton min-h-[44px]">Abrir la planilla ↗</a>
                <button type="button" className="boton min-h-[44px]" onClick={() => void mirar()}>↻ Volver a mirar</button>
              </div>
            </div>
          ) : vista && (
            <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-x-5">
              <div>
                <div className="mt-3 rounded-xl border-2 border-verde-fuerte/70 p-3">
                  <p className="text-[15px] font-bold text-verde-texto">📥 Entra</p>
                  <ul className="mt-2 space-y-1 text-[14px]">
                    {([
                      ['Fichas de clientes', vista.fichas],
                      ['Candidatos: preguntaron, sin cotizar', vista.candidatos],
                      ['Borradores: cotizados en el CRM', vista.borradores],
                      ['Ganadas: con su reserva', vista.ganadas],
                      ...(vista.estan.reservas ? [['Reservas del sitio viejo', vista.reservas]] : [])
                    ] as [string, number][]).map(([que, c]) => (
                      <li key={que} className="flex justify-between gap-3">
                        <span>{que}</span>
                        <span className={`shrink-0 tabular-nums ${c ? 'font-semibold' : 'text-hueso/55'}`}>{c.toLocaleString('es-CL')}</span>
                      </li>
                    ))}
                  </ul>
                  {vista.reservasPagadas > 0 && (
                    <p className="mt-2 border-t border-hueso/10 pt-2 text-[14px] text-hueso/70">
                      {n(vista.reservasPagadas, 'reserva entra pagada: le llega', 'reservas entran pagadas: le llegan')} a pagos para revisar.
                    </p>
                  )}
                  {(vista.fichasQueYaEstaban > 0 || vista.cotizacionesQueYaEstaban > 0 || vista.reservasQueYaEstaban > 0) && (
                    <p className="mt-2 border-t border-hueso/10 pt-2 text-[14px] text-hueso/70">
                      Ya estaban, y no se duplican: {[
                        ...(vista.fichasQueYaEstaban ? [n(vista.fichasQueYaEstaban, 'ficha', 'fichas')] : []),
                        ...(vista.cotizacionesQueYaEstaban ? [n(vista.cotizacionesQueYaEstaban, 'cotización', 'cotizaciones')] : []),
                        ...(vista.reservasQueYaEstaban ? [n(vista.reservasQueYaEstaban, 'reserva', 'reservas')] : [])
                      ].join(' · ')}.
                    </p>
                  )}
                  {(faltaUnaDelCRM || !vista.estan.reservas) && (
                    <p className="mt-2 border-t border-hueso/10 pt-2 text-[14px] text-hueso/70">
                      No {faltaUnaDelCRM && !vista.estan.reservas ? 'están' : 'está'} en la planilla:{' '}
                      {[...(faltaUnaDelCRM ? [vista.estan.clientes ? vista.pestanas.cotizaciones : vista.pestanas.clientes] : []),
                        ...(!vista.estan.reservas ? [vista.pestanas.reservas] : [])].map((x) => `«${x}»`).join(' ni ')}.
                    </p>
                  )}
                </div>

                {vista.vendedores.length > 0 && (
                  <div className="mt-3 rounded-xl border-2 border-hueso/30 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold">A nombre de quién queda</p>
                      <AyudaCorta titulo="A nombre de quién queda">
                        Cada ficha y cada cotización queda a nombre de la cuenta del panel que calza con su vendedor
                        del CRM: así él las ve como suyas y las puede editar. Si un vendedor sale «sin cuenta», lo
                        suyo queda sin dueño: lo ven la gerencia y la administración. Para arreglarlo, crea su cuenta
                        en Cuentas, o escribe en la columna Vendedor de la planilla el nombre de su cuenta, y vuelve a mirar.
                      </AyudaCorta>
                    </div>
                    <ul className="mt-2 space-y-1 text-[14px]">
                      {vista.vendedores.map((v) => (
                        <li key={v.nombre} className="flex flex-wrap justify-between gap-x-3">
                          <span>{v.nombre} → {v.usuario
                            ? <strong>{v.usuario}</strong>
                            : <strong className="text-ambar-texto">sin cuenta</strong>}</span>
                          <span className="shrink-0 tabular-nums text-hueso/70">
                            {n(v.fichas, 'ficha', 'fichas')} · {n(v.cotizaciones, 'cotización', 'cotizaciones')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                {vista.dias.length > 0 && (
                  <div className={`mt-3 rounded-xl border-2 p-3 ${vista.dias.some((g) => g.sobre > 0) ? 'border-ambar-fuerte bg-ambar/10' : 'border-hueso/30'}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold">Días que toman cupo</p>
                      <AyudaCorta titulo="Días que toman cupo">
                        Una cotización ganada en el CRM entra ganada acá: nace su reserva y ocupa su lugar en el día.
                        Entra por pagar, porque el CRM no dice qué pagó cada cliente: el anticipo se anota en la
                        cotización, con su comprobante, y ahí pasa a abonada. Las reservas del sitio viejo entran como
                        anotadas a mano, pagadas o por pagar según el pedido. Si un día queda sobre su cupo, el panel lo
                        muestra como sobrecupo y en la página del día se amplía. Un día que no estaba en el calendario se
                        abre privado: el sitio no lo ofrece; si quieres seguir vendiéndolo, pásalo a público desde el
                        calendario. Si una fecha o la gente no son las correctas, corrígelas en la planilla antes de importar.
                      </AyudaCorta>
                    </div>
                    <ul className="mt-2 space-y-1 text-[14px]">
                      {vista.dias.map((g) => {
                        const q = comoQueda(g);
                        const que = [...(g.reservas ? [n(g.reservas, 'reserva', 'reservas')] : []),
                          ...(g.ganadas ? [n(g.ganadas, 'ganada', 'ganadas')] : [])].join(' y ');
                        return (
                          <li key={g.fecha} className="flex flex-wrap justify-between gap-x-3">
                            <span>
                              {enCorto(g.fecha as Fecha)} · <strong>{n(g.personas, 'persona', 'personas')}</strong> · {que}
                            </span>
                            <span className={q.aviso ? 'font-semibold text-ambar-texto' : 'text-hueso/75'}>{q.texto}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {vista.ganadas > 0 && (
                      // Es un aviso de estado, no una explicación: por eso va a la vista.
                      <p className="mt-2 border-t border-hueso/10 pt-2 text-[14px] font-semibold text-ambar-texto">
                        ⚠ Las ganadas entran por pagar. Hasta anotar su anticipo en la cotización, el sitio sigue
                        ofreciendo ese día a quien paga ahora.
                      </p>
                    )}
                  </div>
                )}

                {vista.problemas.length > 0 && (
                  <div className="mt-3 rounded-xl border-2 border-ambar-fuerte/80 p-3">
                    <p className="text-[15px] font-bold text-ambar-texto">⚠ {n(vista.problemas.length, 'aviso', 'avisos')}</p>
                    <ul className="mt-2 space-y-1 text-[14px]">
                      {vista.problemas.slice(0, A_LA_VISTA).map((p) => <li key={p}>{p}</li>)}
                    </ul>
                    {vista.problemas.length > A_LA_VISTA && (
                      <p className="mt-1 text-[14px] text-hueso/70">
                        Y {vista.problemas.length - A_LA_VISTA} más. Corrígelos en la planilla y vuelve a mirar: aparecen los que siguen.
                      </p>
                    )}
                  </div>
                )}

                {vista.sinCatalogo.length > 0 && (
                  <div className="mt-3 rounded-xl border-2 border-hueso/30 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold">No están en Productos</p>
                      <AyudaCorta titulo="No están en Productos">
                        Estos nombres de las cotizaciones no calzan con ningún producto del catálogo. Entran igual,
                        como una línea escrita a mano: con su precio, pero sin sumar personas ni seguir las reglas del
                        producto. Si es un producto que existe con otro nombre, corrige el nombre en la columna
                        Productos de la planilla; si falta, agrégalo en Productos. Después, vuelve a mirar.
                      </AyudaCorta>
                    </div>
                    <p className="mt-1 text-[14px]">
                      {vista.sinCatalogo.slice(0, 6).map((s) => `${s.concepto} (${s.veces})`).join(' · ')}
                      {vista.sinCatalogo.length > 6 && ` · y ${vista.sinCatalogo.length - 6} más`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}

          {vista && !hecho && !faltanPestanas && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {!hayAlgo && <p className="mr-auto text-[14px] text-hueso/75">No hay nada nuevo que importar.</p>}
              <a href={vista.planilla} target="_blank" rel="noreferrer" className="boton min-h-[44px]">Abrir la planilla ↗</a>
              <button type="button" className="boton min-h-[44px]" onClick={() => void mirar()}>↻ Volver a mirar</button>
              {hayAlgo && (
                <button type="button" aria-pressed={revisado} onClick={() => setRevisado(!revisado)}
                  className={`boton min-h-[44px] ${revisado ? 'border-verde-fuerte bg-verde/15 font-semibold text-verde-texto' : ''}`}>
                  {revisado ? '✓ Revisé lo que entra' : 'Revisé lo que entra'}
                </button>
              )}
              {hayAlgo && <button type="button" disabled={importando || !revisado} onClick={() => void importar()}
                // En el celular el botón ocupa el ancho y su texto se dobla: en una línea se salía de la ventana.
                className="boton boton-hito boton-relleno w-full whitespace-normal sm:w-auto sm:whitespace-nowrap
                           disabled:border-hueso/20 disabled:bg-hueso/15 disabled:text-hueso/60">
                {importando ? 'Importando…' : `📥 Importar ${queImporta.join(' · ')}`}
              </button>}
            </div>
          )}
        </Dialogo>
      )}
    </div>
  );
}
