'use client';

/**
 * **Productos → 🎁 Promociones** (2026-11-23, lo pidió el cliente: *"en
 * productos una subcategoría promociones para no rellenar más, para
 * mantenerlo ordenado y un poco separado… yo puedo crear estas promociones y
 * luego conectarlos al cotizador"*).
 *
 * Una tarjeta por promoción, como el catálogo (`TarjetaLista`): cerrada dice
 * a qué bloque del sitio va y desde cuánto; abierta, su receta en filas
 * alineadas (`fila-ficha`). Los productos se eligen con botones: son pocos y
 * se ven sus precios. **Se guarda con su botón**, no solo: cambia lo que ve
 * el sitio público, como la Configuración.
 */
import { useEffect, useMemo, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import BotonGuardar from './BotonGuardar';
import { Aviso } from './CalendarView';
import { avisar, copiarConAviso } from './AvisoFlotante';
import { CUERPO_ABIERTO, LISTA_TARJETAS, PieCerrar, SignoAbrir, marcoTarjeta } from './TarjetaLista';
import { enPesos } from '@/lib/ocupacion';
import { IVA_PRECIO, COBRO, precioParaCotizar, type Menu } from '@/lib/menus';
import {
  EN_EL_SITIO, ARRIENDO_PROMO, nombreEnElSitio, menusParaPromo, extrasParaPromo, nuevaPromocion,
  nuevoIdPromocion, promocionesParaElSitio, linkDeCampana, type Promocion
} from '@/lib/promociones';

/** Los botones de la ficha: 40px en el celular, 36 en el computador para que la tarjeta quepa. */
const BOTON = 'boton min-h-[40px] lg:min-h-[36px] lg:py-1';
const ELEGIDO = 'border-oro bg-oro/15 font-semibold text-hueso';

const ENTRADA = 'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none';

/** El precio de un producto como se lee en un botón: *$70.000 + IVA* o *$300.000 fijo*. */
function precioCorto(m: Menu): string {
  const p = precioParaCotizar(m);
  if (!p) return 'sin precio';
  return `${enPesos(p)}${m.iva === IVA_PRECIO.mas ? ' + IVA' : ''}${m.cobro === COBRO.fijo ? ' fijo' : ''}`;
}

/** Botones que se encienden y apagan, para elegir productos. */
function Elegir({ opciones, elegidos, onCambio, etiqueta, uno = false }: {
  opciones: Menu[]; elegidos: string[]; onCambio: (v: string[]) => void; etiqueta: string;
  /** Elige uno solo (o ninguno), como el menú de niños. */
  uno?: boolean;
}) {
  if (!opciones.length) {
    return <p className="text-[14px] text-hueso/60">No hay productos para elegir: márcalos “Se puede cotizar” en el catálogo.</p>;
  }
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((m) => {
        const si = elegidos.includes(m.nombre);
        return (
          <button key={m.nombre} type="button" aria-pressed={si}
            onClick={() => onCambio(si ? elegidos.filter((x) => x !== m.nombre) : uno ? [m.nombre] : [...elegidos, m.nombre])}
            className={`${BOTON} text-left ${si ? ELEGIDO : ''}`}>
            {si ? '✓ ' : ''}{m.nombre}
            <span className="ml-1.5 text-[13px] font-normal text-hueso/70">{precioCorto(m)}</span>
            {m.loCobra && <span className="ml-1.5 text-[13px] font-semibold text-ambar-texto">· lo cobra {m.loCobra}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Una fila de la ficha: el nombre a la izquierda, en su columna, y lo suyo a la derecha. */
function Fila({ rotulo, ayuda, children }: { rotulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="fila-ficha sm:items-center">
      <p className="rotulo-ficha flex items-center">{rotulo}{ayuda && <AyudaCorta tema={ayuda} />}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function PromocionesEditor({ catalogo, soloMira }: { catalogo: Menu[]; soloMira: boolean }) {
  const [promos, setPromos] = useState<Promocion[] | null>(null);
  const [enElSitio, setEnElSitio] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/promociones').then((r) => r.json()).then((d) => {
      if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
      setPromos(d.promociones); setEnElSitio(d.enElSitio ?? []);
    }).catch((e) => setError(String(e)));
  }, []);

  const menus = useMemo(() => menusParaPromo(catalogo), [catalogo]);
  /** Desde cuánto por persona, neto: lo mismo que dirá el sitio. 0 si le falta algo. */
  const desde = (p: Promocion) => promocionesParaElSitio([{ ...p, activa: true, sitio: p.sitio || 'ia' }], catalogo)[0]?.desde ?? 0;
  const extras = useMemo(() => extrasParaPromo(catalogo), [catalogo]);

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!promos) return <p className="text-hueso/50">Cargando…</p>;

  const cambiar = (i: number, cambio: Partial<Promocion>) => {
    setPromos(promos.map((p, k) => (k === i ? { ...p, ...cambio } : p)));
    setSucio(true);
  };

  async function guardar(lista: Promocion[]) {
    const sinNombre = lista.findIndex((p) => !p.nombre.trim());
    if (sinNombre !== -1) {
      setAbierta(sinNombre);
      avisar('Una promoción sin nombre no se guarda: escríbele uno.', 'atencion');
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch('/api/promociones', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ promociones: lista })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); return; }
      setPromos(d.promociones); setEnElSitio(d.enElSitio ?? []); setSucio(false);
      if (d.avisos?.length) avisar(d.avisos.join(' '), 'atencion');
    } finally { setGuardando(false); }
  }

  const botonGuardar = (
    <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => guardar(promos)} texto="Guardar promociones" />
  );

  return (
    <div>
      <ul className={LISTA_TARJETAS}>
        {promos.map((p, i) => {
          const sale = enElSitio.includes(p.sitio);
          const ocupados = new Map(promos.filter((x, k) => k !== i && x.sitio).map((x) => [x.sitio, x.nombre]));
          return (
            <li key={p.id || `nueva-${i}`} className={marcoTarjeta(abierta === i)}>
              <button type="button" aria-expanded={abierta === i} onClick={() => setAbierta(abierta === i ? null : i)}
                className={`flex min-h-[52px] w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left
                            hover:bg-hueso/5 ${p.activa ? '' : 'opacity-60'}`}>
                <SignoAbrir abierta={abierta === i} tamano="h-6 w-6 text-[14px]" />
                <span className="text-[16px] font-semibold">
                  🎁 {p.nombre.trim() || <span className="text-hueso/50">Sin nombre</span>}
                </span>
                {!p.activa && (
                  <span className="rounded-full border border-hueso/40 px-2 py-0.5 text-[13px] font-semibold text-hueso/80">apagada</span>
                )}
                {p.sitio ? (
                  <span className={`rounded-full border px-2 py-0.5 text-[13px] font-semibold ${sale || !p.cotizador
                    ? 'border-rosa/50 text-rosa-texto' : 'border-ambar-fuerte/60 text-ambar-texto'}`}>
                    {sale || !p.cotizador ? `en el sitio: ${nombreEnElSitio(p.sitio)}` : `${nombreEnElSitio(p.sitio)}: no sale`}
                  </span>
                ) : (
                  <span className="rounded-full border border-hueso/25 px-2 py-0.5 text-[13px] text-hueso/70">sin conectar</span>
                )}
                {p.sitio && !p.cotizador && (
                  <span className="rounded-full border border-hueso/25 px-2 py-0.5 text-[13px] text-hueso/70">sin cotizador</span>
                )}
                {p.minimo > 0 && <span className="text-[14px] text-hueso/70">desde {p.minimo} personas</span>}
                {desde(p) > 0 && <span className="text-[14px] text-hueso/70">· desde {enPesos(desde(p))} + IVA por persona</span>}
                {p.descuento > 0 && <span className="text-[14px] font-semibold text-verde-texto">−{p.descuento}%</span>}
              </button>

              {abierta === i && (
                <fieldset disabled={soloMira} className={`${CUERPO_ABIERTO} space-y-3 p-3 lg:space-y-2`}>
                  {p.sitio && !sale && p.activa && p.cotizador && (
                    <p className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px] font-semibold text-ambar-texto">
                      Todavía no sale en el sitio: le falta un menú, o un producto no tiene precio de cotización.
                      Su bloque sigue con el botón de WhatsApp.
                    </p>
                  )}
                  <Fila rotulo="Nombre">
                    <input value={p.nombre} maxLength={80} className={`${ENTRADA} sm:max-w-md lg:py-1.5`}
                      placeholder="Como la llaman ustedes" onChange={(e) => cambiar(i, { nombre: e.target.value })} />
                  </Fila>
                  <Fila rotulo="En el sitio" ayuda="promoEnElSitio">
                    <div role="radiogroup" aria-label="En el sitio" className="flex flex-wrap gap-2">
                      {[{ clave: '', nombre: 'Ninguna', corto: 'Ninguna' }, ...EN_EL_SITIO].map((s) => {
                        // Un bloque que ya tiene otra promoción se ve con 🔒 y
                        // no se elige: cada bloque tiene una sola.
                        const de = s.clave ? ocupados.get(s.clave) : undefined;
                        return (
                          <button key={s.clave || 'ninguna'} type="button" role="radio" aria-checked={p.sitio === s.clave}
                            disabled={!!de} title={de ? `${s.nombre}: ya la tiene ${de}` : s.nombre}
                            aria-label={de ? `${s.nombre}, ya la tiene ${de}` : s.nombre}
                            onClick={() => cambiar(i, { sitio: s.clave })}
                            className={`${BOTON} ${p.sitio === s.clave ? ELEGIDO : ''} disabled:opacity-50`}>
                            {de ? '🔒 ' : ''}{s.corto}
                          </button>
                        );
                      })}
                    </div>
                  </Fila>
                  {p.sitio && (
                    <Fila rotulo="Cotizador y link" ayuda="promoCotizador">
                      <div className="flex flex-wrap items-center gap-2">
                        <div role="radiogroup" aria-label="Cotizador en el sitio" className="flex gap-2">
                          {([[true, 'Sí'], [false, 'No, solo WhatsApp']] as const).map(([v, texto]) => (
                            <button key={String(v)} type="button" role="radio" aria-checked={p.cotizador === v}
                              onClick={() => cambiar(i, { cotizador: v })}
                              className={`${BOTON} ${p.cotizador === v ? ELEGIDO : ''}`}>{texto}</button>
                          ))}
                        </div>
                        <span aria-hidden className="mx-1 hidden h-6 border-l border-hueso/25 sm:inline-block" />
                        <code className="min-w-0 break-all rounded bg-hueso/10 px-2 py-1 text-[14px]">{linkDeCampana(p.sitio)}</code>
                        {(['es', 'en', 'pt'] as const).map((idioma) => (
                          <button key={idioma} type="button" className={BOTON}
                            aria-label={`Copiar el link${idioma === 'es' ? '' : idioma === 'en' ? ' en inglés' : ' en portugués'}`}
                            onClick={() => copiarConAviso(linkDeCampana(p.sitio, idioma), 'Link copiado', 'Copia el link:')}>
                            {idioma === 'es' ? 'Copiar' : idioma.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </Fila>
                  )}
                  <Fila rotulo="Menú" ayuda="promoMenu">
                    <Elegir etiqueta="Menú" opciones={menus} elegidos={p.menus} onCambio={(v) => cambiar(i, { menus: v })} />
                  </Fila>
                  <Fila rotulo="Menú de niños">
                    <Elegir etiqueta="Menú de niños" uno opciones={menus} elegidos={p.ninos ? [p.ninos] : []}
                      onCambio={(v) => cambiar(i, { ninos: v[0] ?? '' })} />
                  </Fila>
                  <Fila rotulo="Incluye siempre">
                    <Elegir etiqueta="Incluye siempre" opciones={extras} elegidos={p.incluye}
                      onCambio={(v) => cambiar(i, { incluye: v, suma: p.suma.filter((x) => !v.includes(x)) })} />
                  </Fila>
                  <Fila rotulo="Se puede sumar" ayuda="promoSuma">
                    <Elegir etiqueta="Se puede sumar" opciones={extras.filter((m) => !p.incluye.includes(m.nombre))}
                      elegidos={p.suma} onCambio={(v) => cambiar(i, { suma: v })} />
                  </Fila>
                  <Fila rotulo="Condición" ayuda="promoCondicion">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <label className="flex items-center gap-2 text-[15px]">
                        desde
                        <input type="number" min={1} value={p.minimo || ''} placeholder="1" aria-label="Mínimo de personas"
                          onChange={(e) => cambiar(i, { minimo: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                          className={`${ENTRADA} !w-24 text-center lg:py-1`} />
                        personas
                      </label>
                      <label className="flex items-center gap-2 text-[15px]">
                        descuento
                        <input type="number" min={0} max={100} value={p.descuento || ''} placeholder="0" aria-label="Descuento de la promoción"
                          onChange={(e) => cambiar(i, { descuento: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))) })}
                          className={`${ENTRADA} !w-20 text-center lg:py-1`} />
                        % sobre el total
                      </label>
                    </div>
                  </Fila>
                  <Fila rotulo="Arriendo" ayuda="promoArriendo">
                    <div role="radiogroup" aria-label="Arriendo" className="flex flex-wrap gap-2">
                      {Object.values(ARRIENDO_PROMO).map((a) => (
                        <button key={a} type="button" role="radio" aria-checked={p.arriendo === a}
                          onClick={() => cambiar(i, { arriendo: a })}
                          className={`${BOTON} ${p.arriendo === a ? ELEGIDO : ''}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </Fila>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button type="button" className={BOTON} onClick={() => cambiar(i, { activa: !p.activa })}>
                      {p.activa ? 'Apagar' : 'Encender'}
                    </button>
                    <button type="button" className={`${BOTON} hover:border-rojo-fuerte hover:text-rojo-texto`}
                      onClick={() => { setPromos(promos.filter((_, k) => k !== i)); setAbierta(null); setSucio(true); }}>
                      Quitar
                    </button>
                    {sucio && botonGuardar}
                  </div>
                </fieldset>
              )}
              {abierta === i && <PieCerrar nombre={p.nombre.trim()} onCerrar={() => setAbierta(null)} />}
            </li>
          );
        })}
        {!promos.length && (
          <li className="rounded border border-hueso/20 px-3 py-4 text-[15px] text-hueso/70">
            Todavía no hay promociones. Crea la primera y conéctala a su bloque del sitio.
          </li>
        )}
      </ul>
      {!soloMira && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="boton min-h-[44px] border-oro font-semibold"
            onClick={() => {
              const nueva = nuevaPromocion({ id: nuevoIdPromocion(promos) });
              setPromos([...promos, nueva]); setAbierta(promos.length); setSucio(true);
            }}>
            + Nueva promoción
          </button>
          {sucio && abierta === null && botonGuardar}
        </div>
      )}
    </div>
  );
}
