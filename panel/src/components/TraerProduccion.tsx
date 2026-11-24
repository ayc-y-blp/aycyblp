'use client';

/**
 * **Traer los datos de producción a la prueba** (2026-11-24), en
 * Configuración → Mantención. Solo el administrador (`mantencion`).
 *
 * Lo pidió el cliente para seguir probando *"a base de lo que hay hoy en día
 * en la realidad"*. Se aprieta en una versión de prueba: lee la planilla de
 * producción y reemplaza con ella la de la prueba (`lib/sincronizar.ts`).
 *
 * - **Dice de dónde y a dónde**, con el nombre de cada planilla, en la misma
 *   pastilla de *Dejar la base en cero* (`CualBase`), y cuántas filas trae de
 *   cada pestaña al lado de las que la prueba tiene hoy.
 * - **Pregunta una vez**: *Entiendo: lo de la prueba se reemplaza*. Es la
 *   copia de pruebas, y apretar de nuevo la vuelve a dejar igual; no pide la
 *   palabra ni la copia de la planilla que pide borrar producción.
 * - **En producción, o sin la variable**, lo dice en vez de los números.
 * - Al terminar, *Recargar*: lo que estaba abierto en la pantalla es de antes.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import CualBase from './CualBase';
import AyudaCorta from './AyudaCorta';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { usarPuede } from './SesionCliente';

interface Pestana { hoja: string; que: string; produccion: number | null; prueba: number | null }
interface Vista {
  entorno?: 'produccion' | 'prueba' | '';
  empresa?: string;
  bloqueo?: string; texto?: string;
  origen?: { nombre: string; enlace: string };
  destino?: { nombre: string; enlace: string };
  pestanas?: Pestana[];
  conserva?: string[];
  cuentas?: boolean;
}

const miles = (n: number) => n.toLocaleString('es-CL');

export default function TraerProduccion() {
  const puede = usarPuede('mantencion');
  const [abierta, setAbierta] = useState(false);
  const [vista, setVista] = useState<Vista | null>(null);
  const [error, setError] = useState('');
  const [entiendo, setEntiendo] = useState(false);
  const [trayendo, setTrayendo] = useState(false);
  const [listo, setListo] = useState('');

  if (!puede) return null;

  async function abrir() {
    setAbierta(true); setVista(null); setError(''); setEntiendo(false); setListo('');
    try {
      const r = await fetch('/api/mantencion/traer-produccion');
      const d = await r.json();
      if (!r.ok || d.error) setError(d.error || 'No se pudo leer las planillas.');
      else setVista(d);
    } catch (e) { setError(String(e)); }
  }

  async function traer() {
    setTrayendo(true); setError('');
    try {
      const r = await fetch('/api/mantencion/traer-produccion', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entiendo })
      });
      const d = await r.json();
      if (!r.ok || d.error) { setError(d.error || 'No se pudo traer.'); return; }
      setListo(`Se trajeron ${miles(Number(d.filas))} filas de ${d.pestanas} pestañas desde «${d.origen}».`
        + (d.vaciadas?.length ? ` Quedaron vacías, como en producción: ${d.vaciadas.join(', ')}.` : ''));
    } catch (e) { setError(String(e)); }
    finally { setTrayendo(false); }
  }

  const pestanas = vista?.pestanas ?? [];
  const total = pestanas.reduce((a, p) => a + (p.produccion ?? 0), 0);
  const hoy = pestanas.reduce((a, p) => a + (p.prueba ?? 0), 0);
  const listaParaTraer = !!vista && !vista.bloqueo && !!vista.origen;

  return (
    <div className="mt-6 border-t border-hueso/10 pt-4">
      {/* En el computador, el botón va a la derecha de su explicación (la regla del espacio). */}
      <div className="lg:flex lg:items-center lg:gap-4">
        <div className="min-w-0">
          <p className="text-[16px] font-bold">🔄 Traer los datos de producción a la prueba</p>
          <p className="mt-1 max-w-2xl text-[14px] text-hueso/75">
            Deja la planilla de esta versión de prueba igual a la de producción, para probar con lo que hay
            hoy. Producción no se toca: solo se lee.
          </p>
        </div>
        <button type="button" onClick={() => void abrir()} className="boton mt-3 min-h-[44px] shrink-0 lg:mt-0">
          🔄 Ver qué se trae…
        </button>
      </div>

      {abierta && (
        <Dialogo titulo="Traer los datos de producción" ancho="max-w-2xl lg:max-w-4xl" onCerrar={() => setAbierta(false)}>
          {!vista && !error && <p className="mt-3 text-[15px] text-hueso/70">Leyendo las dos planillas…</p>}

          {vista?.bloqueo && (
            <div className="mt-3 rounded-xl border-2 border-ambar-fuerte bg-ambar/10 p-3" role="status">
              <p className="text-[15px] font-bold text-ambar-texto">
                {vista.bloqueo === 'produccion' ? '🧪 Esto va en una versión de prueba' : '⚠ Todavía no se puede'}
              </p>
              <p className="mt-1 text-[15px]">{vista.texto}</p>
              {vista.bloqueo === 'sinVariable' && (
                <p className="mt-2 text-[14px] text-hueso/80">
                  En Vercel → <b>landing-pirque</b> → Settings → Environment Variables, agrega{' '}
                  <code>GOOGLE_SHEET_ID_PRODUCCION</code> <b>solo en Preview</b>, con el id de la planilla de
                  producción (lo que va entre <code>/d/</code> y <code>/edit</code> en su link). Después,{' '}
                  <b>Redeploy</b> de esta versión.
                </p>
              )}
            </div>
          )}

          {listo ? (
            <div className="mt-3 rounded-xl border-2 border-verde-fuerte bg-verde/10 p-3" role="status">
              <p className="text-[16px] font-bold text-verde-texto">✓ La prueba quedó igual a producción</p>
              <p className="mt-1 text-[15px]">{listo}</p>
              <p className="mt-1 text-[14px] text-hueso/75">
                La bitácora es la de producción, con esta línea al final, a tu nombre.
              </p>
              <div className="mt-3 flex justify-end">
                <button type="button" className="boton boton-relleno min-h-[48px]" onClick={() => window.location.reload()}>
                  ↻ Recargar el panel
                </button>
              </div>
            </div>
          ) : listaParaTraer && vista && (
            <>
              {/* De dónde y a dónde: los nombres en su columna, las pastillas en la otra. */}
              <div className="mt-3 space-y-2">
                <div className="fila-ficha sm:items-center">
                  <p className="rotulo-ficha">Desde</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CualBase entorno="produccion" nombre={vista.origen?.nombre} />
                    <span className="text-[14px] text-hueso/70">solo se lee</span>
                  </div>
                </div>
                <div className="fila-ficha sm:items-center">
                  <p className="rotulo-ficha">A</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CualBase entorno={vista.entorno === 'prueba' ? 'prueba' : ''} nombre={vista.destino?.nombre} />
                    <span className="text-[14px] text-hueso/70">se reemplaza</span>
                  </div>
                </div>
              </div>

              <div className={`${marcoGrupo(false)} mt-3 p-3`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className={TITULO_GRUPO}>Lo que se trae</p>
                  {/* En el celular, el `?` va pegado al título y la explicación de las cifras debajo. */}
                  <span className="sm:order-last"><AyudaCorta titulo="Lo que se trae">
                    Se copian las pestañas del panel tal cual están en producción: las reservas, las cotizaciones, el
                    equipo, la configuración y la bitácora.{vista.cuentas ? ' También las cuentas: en la prueba se entra con la clave de producción.' : ''}
                    {' '}Se conserva de la prueba: {(vista.conserva ?? []).join(', ').toLowerCase()}, para que una foto
                    subida probando no vaya a la carpeta real. No se tocan los comentarios ni las pestañas de importar.
                    Una pestaña que producción no tiene queda vacía. Se puede apretar las veces que haga falta.
                  </AyudaCorta></span>
                  <span className="basis-full text-[14px] text-hueso/75 sm:basis-auto">
                    filas en producción · <span className="text-hueso/60">hoy en la prueba</span>
                  </span>
                </div>
                <ul className="mt-2 gap-x-8 text-[14px] sm:columns-2">
                  {pestanas.map((p) => (
                    <li key={p.hoja} className="flex break-inside-avoid items-baseline justify-between gap-3 py-0.5">
                      <span className="min-w-0">{p.que}</span>
                      <span className="shrink-0 tabular-nums">
                        <b className={p.produccion ? '' : 'font-normal text-hueso/55'}>
                          {p.produccion === null ? 'no existe' : miles(p.produccion)}
                        </b>
                        {/* Lo que cambia se nota: la cifra de hoy en ámbar y en negrita. */}
                        <span className={`ml-2 ${(p.prueba ?? 0) !== (p.produccion ?? 0) ? 'font-semibold text-ambar-texto' : 'text-hueso/60'}`}>
                          · {p.prueba === null ? '—' : miles(p.prueba)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {error && <p role="alert" className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}

          {!listo && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="boton min-h-[48px]" onClick={() => setAbierta(false)}>Volver</button>
              {listaParaTraer && (
                <>
                  <button type="button" aria-pressed={entiendo} onClick={() => setEntiendo(!entiendo)}
                    className={`boton min-h-[48px] ${entiendo ? 'border-verde-fuerte bg-verde/15 font-semibold text-verde-texto' : ''}`}>
                    {entiendo ? '✓ Entiendo: lo de la prueba se reemplaza' : 'Entiendo: lo de la prueba se reemplaza'}
                  </button>
                  <button type="button" disabled={trayendo || !entiendo} onClick={() => void traer()}
                    title={`Hoy la prueba tiene ${miles(hoy)} filas`}
                    className="boton boton-hito boton-relleno w-full whitespace-normal sm:w-auto sm:whitespace-nowrap
                               disabled:border-hueso/20 disabled:bg-hueso/15 disabled:text-hueso/60">
                    {trayendo ? 'Trayendo…' : `🔄 Traer ${miles(total)} filas de producción`}
                  </button>
                </>
              )}
            </div>
          )}
        </Dialogo>
      )}
    </div>
  );
}
