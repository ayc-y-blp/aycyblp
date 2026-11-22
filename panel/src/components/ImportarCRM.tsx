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
 *
 * **El Excel se sube acá mismo** (lo pidió el cliente al ensayarlo: *"cuando
 * aprieto pide acceso a Google Drive. No deja subir el Excel"*). La primera
 * versión mandaba a la planilla de Google a importar el archivo, y quien
 * importa no siempre está en el navegador con la cuenta de Google de esa
 * planilla. Ahora el navegador lee el archivo (`lib/xlsx.ts`), el panel lo
 * copia a las pestañas de paso y se ve la vista previa. Nada se importa
 * todavía: eso sigue pidiendo su casilla.
 */
import { useRef, useState } from 'react';
import Dialogo from './Dialogo';
import CualBase from './CualBase';
import AyudaCorta from './AyudaCorta';
import { usarPuede } from './SesionCliente';
import { enCorto, type Fecha } from '@/lib/fechas';
import { normalizar } from '@/lib/columnas';
import { leerXlsx } from '@/lib/xlsx';

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
  equivalencias: { de: string; a: string; veces: number }[];
  pestanas: { clientes: string; cotizaciones: string; reservas: string };
  nombrePlanilla?: string; entorno?: 'produccion' | 'prueba' | '';
  planilla: string;
  /** Solo en la respuesta de una subida: cuántas filas se copiaron a cada pestaña. */
  subido?: Record<string, number>;
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
  const [subiendo, setSubiendo] = useState(false);
  const [subido, setSubido] = useState<Record<string, number> | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  if (!puede) return null;

  /**
   * Lee el Excel en el navegador y lo manda a copiar a las pestañas de paso.
   * Solo las tres hojas del importador: de un archivo equivocado no sale nada.
   */
  async function subir(excel: File) {
    if (!vista) return;
    setSubiendo(true); setError(''); setSubido(null); setRevisado(false);
    try {
      const nombres = Object.values(vista.pestanas).map(normalizar);
      const hojas = await leerXlsx(await excel.arrayBuffer(), (nombre) => nombres.includes(normalizar(nombre)));
      if (!Object.keys(hojas).length) {
        setError(`Ese Excel no trae las pestañas para importar (${Object.values(vista.pestanas).join(', ')}). El que se sube es «Importar-al-panel.xlsx».`);
        return;
      }
      const r = await fetch('/api/mantencion/importar', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hojas })
      });
      const d = await r.json();
      if (!r.ok || d.error) { setError(d.error || 'No se pudo subir el Excel.'); return; }
      setVista(d); setSubido(d.subido ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSubiendo(false); }
  }

  async function mirar() {
    setVista(null); setError(''); setRevisado(false); setHecho(null); setSubido(null);
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
  // Qué quedó en la planilla después de subir: cuántas filas de cada pestaña.
  const queEs: Record<string, [string, string]> = vista ? {
    [vista.pestanas.clientes]: ['cliente', 'clientes'],
    [vista.pestanas.cotizaciones]: ['cotización', 'cotizaciones'],
    [vista.pestanas.reservas]: ['reserva', 'reservas']
  } : {};
  const avisoSubido = subido && !hecho && !subiendo ? (
    <p className="text-[14px] font-semibold text-verde-texto" role="status">
      ✓ Excel subido a la planilla: {Object.entries(subido).map(([hoja, c]) => n(c, ...(queEs[hoja] ?? ['fila', 'filas']))).join(' · ')}
    </p>
  ) : null;
  const sinCuenta = vista ? vista.vendedores.filter((v) => !v.usuario) : [];

  return (
    <div className="mt-6 border-t border-hueso/10 pt-4">
      {/* En el computador, el botón va a la derecha de su explicación
          (2026-11-22, la regla del espacio). */}
      <div className="lg:flex lg:items-center lg:gap-4">
        <div className="min-w-0">
      <p className="text-[16px] font-bold">📥 Importar del CRM</p>
      <p className="mt-1 max-w-2xl text-[14px] text-hueso/75">
        Trae las fichas de los clientes y lo que viene a futuro —candidatos, cotizados y ganados—, y
        las reservas del sitio viejo, desde el Excel para importar. Antes de escribir nada muestra qué entra.
      </p>
        </div>
      <button type="button" onClick={() => { setAbierta(true); void mirar(); }} className="boton mt-3 min-h-[44px] shrink-0 lg:mt-0">
        📥 Ver qué entra…
      </button>
      </div>

      {abierta && (
        <Dialogo titulo="Importar del CRM" ancho="max-w-2xl lg:max-w-6xl" onCerrar={() => setAbierta(false)}
          alLado={cualBase && <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{cualBase}{avisoSubido}</div>}>
          {!vista && !error && <p className="mt-3 text-[15px] text-hueso/70">Leyendo las pestañas de la planilla…</p>}
          {/* En el celular, la misma línea debajo del título. */}
          {cualBase && <div className="mt-3 lg:hidden">{cualBase}</div>}
          {/* El archivo se elige con un botón de verdad; este campo no se ve. */}
          <input ref={archivo} type="file" className="hidden" aria-label="El Excel para importar"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void subir(f); }} />
          {subiendo && <p className="mt-3 text-[15px] text-hueso/70" role="status">Leyendo el Excel y copiándolo a la planilla…</p>}
          {/* En el celular, bajo el título; en el computador va en su misma línea. */}
          {avisoSubido && <div className="mt-2 lg:hidden">{avisoSubido}</div>}

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
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold">Sube el Excel para importar</p>
                <AyudaCorta titulo="Sube el Excel para importar">
                  El archivo es «Importar-al-panel.xlsx». Al subirlo, el panel copia sus tres hojas a la planilla, en
                  pestañas con el mismo nombre ({Object.values(vista.pestanas).join(', ')}), y muestra qué entra. Todavía
                  no importa nada. Si corriges algo en el Excel, súbelo de nuevo: reemplaza lo anterior. Quien tiene la
                  planilla abierta también puede importarlo ahí (Archivo → Importar → Insertar hojas nuevas) y apretar
                  «Volver a mirar»: es lo mismo.
                </AyudaCorta>
              </div>
              <p className="mt-1 text-[14px]">
                Elige «Importar-al-panel.xlsx». Se copia a la planilla y acá ves qué entra, antes de importar nada.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={subiendo} onClick={() => archivo.current?.click()}
                  className="boton boton-relleno min-h-[48px] disabled:opacity-60">
                  {subiendo ? 'Subiendo…' : '⬆ Subir el Excel…'}
                </button>
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

                {(vista.sinCatalogo.length > 0 || vista.equivalencias.length > 0) && (
                  <div className="mt-3 rounded-xl border-2 border-hueso/30 p-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold">Productos de las cotizaciones</p>
                      <AyudaCorta titulo="Productos de las cotizaciones">
                        Un producto del CRM entra como el producto del catálogo que se llama igual. Si allá se llama un
                        poco distinto, el panel lo reconoce cuando calza con uno solo —«Desayuno de campo» con «Desayuno»,
                        o cualquier arriendo con el único producto de tipo Arriendo— y acá dice cuál eligió: revísalo.
                        Los que no calzan con ninguno entran igual, como una línea escrita a mano: con su precio, pero sin
                        sumar personas ni seguir las reglas del producto. Para cambiar cualquiera, escribe en la columna
                        Productos de la planilla el nombre exacto del producto, o agrégalo en Productos, y vuelve a mirar.
                      </AyudaCorta>
                    </div>
                    {vista.equivalencias.length > 0 && (
                      <p className="mt-1 text-[14px]">
                        <span className="text-hueso/70">Calzan con otro nombre: </span>
                        {vista.equivalencias.slice(0, 6).map((q, i) => (
                          <span key={`${q.de}-${q.a}`}>{i > 0 && ' · '}{q.de} → <strong>{q.a}</strong> ({q.veces})</span>
                        ))}
                        {vista.equivalencias.length > 6 && ` · y ${vista.equivalencias.length - 6} más`}
                      </p>
                    )}
                    {vista.sinCatalogo.length > 0 && (
                      <p className="mt-1 text-[14px]">
                        <span className="text-hueso/70">No están en Productos: </span>
                        {vista.sinCatalogo.slice(0, 6).map((x) => `${x.concepto} (${x.veces})`).join(' · ')}
                        {vista.sinCatalogo.length > 6 && ` · y ${vista.sinCatalogo.length - 6} más`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}

          {vista && !hecho && !faltanPestanas && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {/* A la izquierda, lo de preparar: cambiar el archivo o volver a leer la planilla. */}
              <div className="mr-auto flex flex-wrap items-center gap-2">
                <button type="button" disabled={subiendo} className="boton min-h-[44px]" onClick={() => archivo.current?.click()}>
                  {subiendo ? 'Subiendo…' : '⬆ Subir otro Excel'}
                </button>
                <button type="button" className="boton min-h-[44px]" onClick={() => void mirar()}>↻ Volver a mirar</button>
                <a href={vista.planilla} target="_blank" rel="noreferrer" className="boton min-h-[44px]">Planilla ↗</a>
                {!hayAlgo && <p className="text-[14px] text-hueso/75">No hay nada nuevo que importar.</p>}
              </div>
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
