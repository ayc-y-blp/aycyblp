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
import { IVA_PRECIO, COBRO, TIPO_PRODUCTO, precioParaCotizar, type Menu } from '@/lib/menus';
import {
  EN_EL_SITIO, ARRIENDO_PROMO, nombreEnElSitio, menusAdultoParaPromo, menusNinosParaPromo, extrasParaPromo,
  nuevaPromocion, nuevoIdPromocion, promocionesParaElSitio, linkDeCampana, type Promocion, type Tramo
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

/**
 * **Una sección de la ficha** (2026-11-24, lo pidió el cliente con una foto:
 * *"falta todo orden según reglas gráficas y lógicas"*): *Menús*, *Extras* y
 * *Condición*, cada una en su marco, más fino que el de la tarjeta (la regla
 * *el marco de la tarjeta manda*).
 */
function Seccion({ titulo, ayuda, accion, children }: {
  titulo: string; ayuda?: string;
  /** Un botón en la línea del título, a la derecha (*+ Otro tramo*). */
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`${marcoTarjeta(false, 'normal', false, true)} space-y-2 p-2.5 lg:space-y-1.5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center text-[15px] font-bold">{titulo}{ayuda && <AyudaCorta tema={ayuda} />}</p>
        {accion}
      </div>
      {children}
    </section>
  );
}

const ESTADOS_EXTRA = [['no', 'No'], ['incluye', 'Incluido'], ['suma', 'Se suma']] as const;

/**
 * **Los extras, cada uno una vez** (2026-11-24): antes eran dos filas con la
 * misma lista —*Incluye siempre* y *Se puede sumar*— y cada producto salía dos
 * veces. Ahora una fila por extra con su estado: *No*, *Incluido* (va siempre)
 * o *Se suma* (el cliente lo elige en el sitio). **El show** no dice un precio:
 * sigue la regla de Configuración (sin costo en un día público y desde N
 * personas; bajo eso, su mínimo), igual que en una cotización.
 */
function Extras({ extras, incluye, suma, onCambio }: {
  extras: Menu[]; incluye: string[]; suma: string[];
  onCambio: (incluye: string[], suma: string[]) => void;
}) {
  if (!extras.length) {
    return <p className="text-[14px] text-hueso/60">No hay extras para elegir: márcalos “Se puede cotizar” en el catálogo.</p>;
  }
  return (
    <ul className="divide-y divide-hueso/10">
      {extras.map((m) => {
        const estado = incluye.includes(m.nombre) ? 'incluye' : suma.includes(m.nombre) ? 'suma' : 'no';
        const poner = (e: typeof estado) => {
          const sinEl = (l: string[]) => l.filter((x) => x !== m.nombre);
          onCambio(e === 'incluye' ? [...sinEl(incluye), m.nombre] : sinEl(incluye),
                   e === 'suma' ? [...sinEl(suma), m.nombre] : sinEl(suma));
        };
        const show = m.tipo === TIPO_PRODUCTO.show;
        return (
          // En el celular, el nombre arriba y los tres botones debajo, a lo ancho:
          // al lado no cabían y el precio chocaba con *No*.
          <li key={m.nombre} className="grid gap-1 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-2 sm:py-1">
            <span className="min-w-0 text-[15px] leading-tight">
              <span className="font-semibold">{m.nombre}</span>
              <span className="ml-1.5 text-[13px] text-hueso/70">
                {show ? 'regla de Configuración' : precioCorto(m)}
              </span>
              {show && <AyudaCorta tema="promoShow" />}
              {m.loCobra && <span className="ml-1.5 text-[13px] font-semibold text-ambar-texto">· lo cobra {m.loCobra}</span>}
            </span>
            <span role="radiogroup" aria-label={m.nombre} className="flex gap-1">
              {ESTADOS_EXTRA.map(([e, texto]) => (
                <button key={e} type="button" role="radio" aria-checked={estado === e} onClick={() => poner(e)}
                  className={`${BOTON} flex-1 !px-2.5 text-[14px] sm:flex-none ${estado === e ? ELEGIDO : 'text-hueso/75'}`}>
                  {texto}
                </button>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * **La condición en tramos** (2026-11-24, lo pidió el cliente: *"necesitamos
 * poder agregar otro tramo de condición o otros tramos de condición con un
 * más"*): el primero es desde cuántas personas sale la promoción y su
 * descuento; cada tramo de más, un descuento mayor desde más gente. Rige el
 * más alto que alcance el grupo (`descuentoPara()`).
 */
function Tramos({ p, onCambio }: { p: Promocion; onCambio: (c: Partial<Promocion>) => void }) {
  const numero = (v: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
  const filas: (Tramo & { primero?: boolean })[] = [{ desde: p.minimo, descuento: p.descuento, primero: true }, ...p.tramos];
  const cambiarTramo = (k: number, t: Partial<Tramo>) => {
    if (k === 0) return onCambio({ ...(t.desde !== undefined ? { minimo: t.desde } : {}), ...(t.descuento !== undefined ? { descuento: t.descuento } : {}) });
    onCambio({ tramos: p.tramos.map((x, j) => (j === k - 1 ? { ...x, ...t } : x)) });
  };
  return (
    <FilaSeccion rotulo="Tramos">
      <div className="space-y-1.5">
        {filas.map((t, k) => (
          <div key={k} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
            <span className="text-hueso/70">desde</span>
            <input type="number" min={1} value={t.desde || ''} placeholder={k === 0 ? '1' : ''}
              aria-label={k === 0 ? 'Mínimo de personas' : `Tramo ${k + 1}: desde cuántas personas`}
              onChange={(e) => cambiarTramo(k, { desde: numero(e.target.value, 10000) })}
              className={`${ENTRADA} !w-[4.5rem] text-center lg:py-1`} />
            <span>personas:</span>
            <input type="number" min={0} max={100} value={t.descuento || ''} placeholder="0"
              aria-label={k === 0 ? 'Descuento de la promoción' : `Tramo ${k + 1}: descuento`}
              onChange={(e) => cambiarTramo(k, { descuento: numero(e.target.value, 100) })}
              className={`${ENTRADA} !w-14 text-center lg:py-1`} />
            <span>% de descuento</span>
            {k > 0 && (
              <button type="button" aria-label={`Quitar el tramo ${k + 1}`} title="Quitar el tramo"
                onClick={() => onCambio({ tramos: p.tramos.filter((_, j) => j !== k - 1) })}
                className={`${BOTON} !px-2.5 hover:border-rojo-fuerte hover:text-rojo-texto`}>✕</button>
            )}
          </div>
        ))}
      </div>
    </FilaSeccion>
  );
}

/**
 * Una fila **dentro de una sección**: la columna del nombre es más angosta que
 * la de la ficha (7rem), para que los botones no se doblen en tres renglones
 * en media tarjeta. Los nombres de una sección miden lo mismo: los valores
 * parten en la misma vertical.
 */
function FilaSeccion({ rotulo, ayuda, children }: { rotulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:gap-x-2">
      <p className="rotulo-ficha flex items-center">{rotulo}{ayuda && <AyudaCorta tema={ayuda} />}</p>
      <div className="min-w-0">{children}</div>
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

  const menus = useMemo(() => menusAdultoParaPromo(catalogo), [catalogo]);
  const menusNinos = useMemo(() => menusNinosParaPromo(catalogo), [catalogo]);
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
                {(p.descuento > 0 || p.tramos.length > 0) && (
                  <span className="text-[14px] font-semibold text-verde-texto">
                    −{p.descuento}%{p.tramos.length ? ` a −${Math.max(p.descuento, ...p.tramos.map((t) => t.descuento))}%` : ''}
                  </span>
                )}
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
                    {/* Apagar, quitar y guardar van en esta fila, a la derecha
                        (2026-11-24): solos al pie de la tarjeta dejaban una fila
                        casi vacía y la tarjeta no cabía en la pantalla. */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={p.nombre} maxLength={80} className={`${ENTRADA} min-w-0 flex-1 sm:max-w-md lg:py-1.5`}
                        placeholder="Como la llaman ustedes" onChange={(e) => cambiar(i, { nombre: e.target.value })} />
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button type="button" className={BOTON} onClick={() => cambiar(i, { activa: !p.activa })}>
                          {p.activa ? 'Apagar' : 'Encender'}
                        </button>
                        <button type="button" className={`${BOTON} hover:border-rojo-fuerte hover:text-rojo-texto`}
                          onClick={() => { setPromos(promos.filter((_, k) => k !== i)); setAbierta(null); setSucio(true); }}>
                          Quitar
                        </button>
                        {sucio && botonGuardar}
                      </div>
                    </div>
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
                  <div className="grid gap-3 lg:grid-cols-2 lg:gap-2.5">
                    <div className="space-y-3 lg:space-y-2.5">
                      <Seccion titulo="🍽 Menús" ayuda="promoMenu">
                        <FilaSeccion rotulo="Adultos">
                          <Elegir etiqueta="Menú de adultos" opciones={menus} elegidos={p.menus} onCambio={(v) => cambiar(i, { menus: v })} />
                        </FilaSeccion>
                        <FilaSeccion rotulo="Niños">
                          <Elegir etiqueta="Menú de niños" uno opciones={menusNinos} elegidos={p.ninos ? [p.ninos] : []}
                            onCambio={(v) => cambiar(i, { ninos: v[0] ?? '' })} />
                        </FilaSeccion>
                      </Seccion>
                      <Seccion titulo="🏷 Condición" ayuda="promoCondicion" accion={p.tramos.length < 5 && (
                        <button type="button" className={`${BOTON} text-[14px]`}
                          onClick={() => cambiar(i, { tramos: [...p.tramos, { desde: 0, descuento: 0 }] })}>
                          + Otro tramo
                        </button>
                      )}>
                        <Tramos p={p} onCambio={(c) => cambiar(i, c)} />
                        <FilaSeccion rotulo="Arriendo" ayuda="promoArriendo">
                          <div role="radiogroup" aria-label="Arriendo" className="flex flex-wrap gap-1.5">
                            {Object.values(ARRIENDO_PROMO).map((a) => (
                              <button key={a} type="button" role="radio" aria-checked={p.arriendo === a}
                                onClick={() => cambiar(i, { arriendo: a })}
                                className={`${BOTON} ${p.arriendo === a ? ELEGIDO : ''}`}>
                                {a}
                              </button>
                            ))}
                          </div>
                        </FilaSeccion>
                      </Seccion>
                    </div>
                    {/* **Lo nuestro y lo de fuera del local, separados** (2026-11-24, lo
                        pidió el cliente: *"así tal cual deberías agregar actividades fuera
                        del local, y cuando se crea un producto que cobra otra empresa,
                        aparece en este fuera del local. Puede ser también un transfer…
                        segmentar esto"*). Es el mismo control; lo de fuera del local va
                        aparte del total, con quién lo cobra. */}
                    <div className="space-y-3 lg:space-y-2.5">
                      <Seccion titulo="➕ Extras" ayuda="promoSuma">
                        <Extras extras={extras.filter((m) => !m.loCobra)} incluye={p.incluye} suma={p.suma}
                          onCambio={(incluye, suma) => cambiar(i, { incluye, suma })} />
                      </Seccion>
                      {extras.some((m) => m.loCobra) && (
                        <Seccion titulo="🚐 Fuera del local" ayuda="loCobra">
                          <Extras extras={extras.filter((m) => m.loCobra)} incluye={p.incluye} suma={p.suma}
                            onCambio={(incluye, suma) => cambiar(i, { incluye, suma })} />
                        </Seccion>
                      )}
                    </div>
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
