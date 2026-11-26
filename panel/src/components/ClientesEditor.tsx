'use client';

/**
 * Las fichas de clientes (2026-11-10).
 *
 * **Una ficha por cliente, y se escribe una vez.** Es el primer error que
 * reportó la vendedora en el CRM del socio, y lo que esta pantalla viene a
 * impedir: al crear un cliente, el servidor busca si ya hay uno con el mismo
 * teléfono, correo o RUT y, si lo hay, la pantalla pregunta *"¿es este
 * cliente?"* antes de crear otro.
 *
 * Mismo patrón que `/equipo`: cerrada, cada ficha es una línea; se abre una a
 * la vez con `+`. Abierta, se guarda sola salvo el nombre, que se confirma
 * (`EditarCliente`, la misma pieza de *✎ Editar cliente* en la cotización).
 */
import AvisoFijo from './AvisoFijo';
import { CUERPO_ABIERTO, LISTA_TARJETAS, PieCerrar, SignoAbrir, marcoTarjeta } from './TarjetaLista';
import { useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { usarSoloMira } from './SesionCliente';
import { Aviso } from './CalendarView';
import { BotonMias, BotonTodos } from './BotonMias';
import CambiarVendedor from './CambiarVendedor';
import EditarCliente, { CLIENTE_VACIO, CamposCliente } from './EditarCliente';
import NotasCotizacion, { HistorialNotas } from './NotasCotizacion';
import { UltimaNota } from './LoConversado';
import { PastillaContacto, PastillaNueva } from './Pastilla';
import { PastillaEnvio } from './ConfirmarEnvio';
import { pasoDelClic } from './pasoDelClic';
import { PASO, pasoDelEstado, linkACotizacion } from '@/lib/pasos';
import { ordenarNotas, type Nota } from '@/lib/notas';
import { avisar } from './AvisoFlotante';
import {
  buscarClientes, porNombreCliente, type Cliente, type DatosCliente
} from '@/lib/clientes';
import { PastillaEstado } from './CotizacionesVista';
import { enPesos } from '@/lib/ocupacion';
import FechaDia from './FechaDia';
import BuscarEnLista from './BuscarEnLista';

/** Una cotización en el historial de un cliente. */
interface EnHistorial {
  id: string; folio: string; fecha: string; periodo: string; estado: string;
  total: number; grupo: string;
  /** El día elegido para volver a contactarlo (2026-11-25), o `''`. */
  recontactar?: string;
  /** Si esta cuenta anota en esa cotización (su vendedor o la gerencia). */
  anota?: boolean;
  /** ✉ Lista sin confirmar el envío (2026-11-25): `pregunta` a su vendedor, `aviso` a quien ve al equipo. */
  envio?: '' | 'pregunta' | 'abre' | 'aviso';
  /** 🆕 Nueva del sitio, sin contacto anotado (2026-11-25), con su promoción y cuándo llegó. */
  nueva?: boolean;
  promo?: string;
  creado?: string;
}

/** Las cotizaciones (grupos) con notas, la de la nota más nueva primero. */
const gruposDeNotas = (notas: Nota[]) => [...new Set(ordenarNotas(notas).map((n) => n.presupuesto))];

/** El N° de un grupo: el de su cotización principal, o el de cualquiera del grupo. */
const folioDelGrupo = (h: EnHistorial[] = [], grupo: string) =>
  (h.find((x) => x.id === grupo) ?? h.find((x) => x.grupo === grupo))?.folio ?? '—';

/** El recontacto más cercano de un cliente, entre sus cotizaciones, o `''`. */
const primerRecontacto = (h: EnHistorial[] = []) =>
  h.map((x) => x.recontactar ?? '').filter(Boolean).sort()[0] ?? '';

/** **La nueva del sitio más reciente de un cliente** (2026-11-25), si tiene. */
const nuevaDe = (h: EnHistorial[] = []) =>
  h.filter((x) => x.nueva).sort((a, b) => (b.creado ?? '').localeCompare(a.creado ?? ''))[0];

/** **La lista sin confirmar de un cliente** (2026-11-25): primero la suya, que se pregunta. */
const envioDe = (h: EnHistorial[] = []) => h.find((x) => x.envio === 'pregunta') ?? h.find((x) => x.envio === 'abre')
  ?? h.find((x) => x.envio === 'aviso');

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

export default function ClientesEditor() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Record<string, number>>({});
  const [historial, setHistorial] = useState<Record<string, EnHistorial[]>>({});
  /** Las notas de sus cotizaciones que esta cuenta lee (2026-11-23), por cliente. */
  const [notas, setNotas] = useState<Record<string, Nota[]>>({});
  /** Si las notas de la ficha abierta están a la vista: parten plegadas. */
  const [verNotas, setVerNotas] = useState(false);
  /**
   * **De qué cotización se ven las notas** (2026-11-25, lo pidió el cliente:
   * *"¿qué pasa si el cliente tiene dos cotizaciones vigentes… puedes mostrar
   * las notas de ambas cotizaciones pero filtrable por cotización?"*): `''`
   * son todas, si no, el grupo. Vuelve a *Todas* al abrir otra ficha.
   */
  const [notasDe, setNotasDe] = useState('');
  const [sinFicha, setSinFicha] = useState(0);
  /** Para cambiar el vendedor (2026-11-22): solo llega a quien puede. */
  const [vendedores, setVendedores] = useState<{ usuario: string; nombre: string }[] | null>(null);
  const [abiertas, setAbiertas] = useState<Record<string, number>>({});
  const [ganadas, setGanadas] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  /**
   * **Míos / Todos** (2026-11-22, lo pidió el cliente: *"por lo menos poder
   * filtrar por los míos al tiro y buscar"*). Los de la cuenta son los que
   * creó o a los que les cotizó; los manda el servidor. `null` = todavía no
   * se eligió: parte en *Míos* si la cuenta tiene alguno, y si no, en *Todos*.
   * **Se ve siempre, también con *Míos (0)*** (2026-11-22, lo marcó el
   * cliente: *"falta aún el filtro míos en clientes"*): al principio se
   * escondía con ninguno o con todos, y después del importe —las fichas a
   * nombre de los vendedores del CRM— no le aparecía a quien no tiene
   * ninguno. Igual que *Mías / De todos* de Cotizaciones, que no se esconde.
   */
  const [mios, setMios] = useState<string[]>([]);
  const [ver, setVer] = useState<'mios' | 'todos' | null>(null);
  /**
   * **📞 Por contactar** (2026-11-25, lo pidió el cliente: *"tiene que llegar
   * una notificación de recontacto en varios lugares, ficha cliente…"*): solo
   * los que tienen un día elegido para volver a contactarlos, el más cercano
   * primero. Se aprieta para filtrar y otra vez para soltar.
   */
  const [porContactar, setPorContactar] = useState(false);
  /**
   * **👤 Por vendedor…** (2026-11-25, lo pidió el cliente: *"pagos, gerencia y
   * admin deberían poder filtrar por vendedor en clientes"*): la pieza de
   * Cotizaciones → *Lista*. El servidor manda los clientes de cada vendedor
   * (`porVendedor`) solo a quien puede cambiar el vendedor de un cliente
   * —pagos, la gerencia y el administrador—: sin eso, el botón no sale.
   * Elegido, *👤 Nombre ✕* lo suelta. Mira todos los clientes, no solo los
   * suyos, y se suma a *📞 Por contactar* y al buscador.
   */
  const [porVendedor, setPorVendedor] = useState<Record<string, string[]> | null>(null);
  const [vendedor, setVendedor] = useState('');
  const [eligiendoVendedor, setEligiendoVendedor] = useState(false);
  const [hoyDia, setHoyDia] = useState('');
  /** La hora de ahora en Chile (2026-11-25), para *llegó hace 2 h*. */
  const [ahora, setAhora] = useState('');
  const [usuario, setUsuario] = useState('');
  /** La ventanita de las notas abierta desde la ficha: de qué cotización y de quién. */
  const [anotando, setAnotando] = useState<{ h: EnHistorial; nombre: string; empresa: string; telefono: string; correo: string } | null>(null);
  /**
   * Qué ficha está abierta. Una a la vez, como en `/equipo`. Lo escrito y su
   * guardado viven en `EditarCliente`, la misma pieza de la ventana de cotizar.
   */
  const [abierta, setAbierta] = useState<string | null>(null);
  /** El formulario de un cliente nuevo, o null si no se está creando. */
  const [nuevo, setNuevo] = useState<DatosCliente | null>(null);
  /** Las fichas que se parecen al nuevo, cuando el servidor las encontró. */
  const [parecidas, setParecidas] = useState<Cliente[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  /** Vista gerencia sin `clientes`: las fichas se miran y no se tocan. */
  const soloMira = usarSoloMira('clientes');
  /** Cotizarle a alguien es del permiso de las cotizaciones. */
  const soloMiraCotizar = usarSoloMira('presupuestos');

  const cargar = () => fetch('/api/clientes').then((r) => r.json()).then((d) => {
    if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
    setClientes(d.clientes);
    setCotizaciones(d.cotizaciones ?? {});
    setHistorial(d.historial ?? {});
    setHoyDia(d.hoy ?? '');
    setAhora(d.ahora ?? '');
    setUsuario(d.usuario ?? '');
    setNotas(d.notas ?? {});
    setSinFicha(d.sinFicha ?? 0);
    setMios(d.mios ?? []);
    setVendedores(d.vendedores ?? null);
    setPorVendedor(d.porVendedor ?? null);
    setAbiertas(d.abiertas ?? {});
    setGanadas(d.ganadas ?? {});
  }).catch((e) => setError(String(e)));

  useEffect(() => { void cargar(); }, []);

  const sonMios = useMemo(() => new Set(mios), [mios]);
  const hayFiltro = !!clientes && clientes.length > 0;
  const soloMios = hayFiltro && (ver ?? (mios.length > 0 ? 'mios' : 'todos')) === 'mios';
  const delVendedor = useMemo(() => new Set(vendedor ? porVendedor?.[vendedor] ?? [] : []), [vendedor, porVendedor]);
  const deQuien = useMemo(() => (!clientes ? []
    : vendedor ? clientes.filter((c) => delVendedor.has(c.id))
      : soloMios ? clientes.filter((c) => sonMios.has(c.id)) : clientes),
  [clientes, soloMios, sonMios, vendedor, delVendedor]);
  const nombreVendedor = (u: string) => vendedores?.find((v) => v.usuario === u)?.nombre || u;
  const conRecontacto = deQuien.filter((c) => primerRecontacto(historial[c.id])).length;
  /**
   * **Dos secciones** (2026-11-25, lo pidió el cliente: *"primero, los clientes
   * que tienen para contactar… ordenarlos según su fecha… y el resto de mis
   * contactos alfabéticamente"*): arriba *📞 Por contactar*, por el día más
   * cercano de sus cotizaciones (`primerRecontacto()`), y abajo *Los demás*,
   * de la A a la Z. Con *📞 Por contactar* apretado, solo la primera.
   *
   * **Y una tercera, arriba de todo: *🆕 Nuevos*** (2026-11-25, lo pidió el
   * cliente: *"una tercera sección arriba en clientes y cotizaciones que
   * muestra NUEVOS para que al tiro pueden empezar el seguimiento"*): los que
   * tienen una cotización del sitio sin ningún contacto anotado
   * (`esNuevaDelSitio()`), la que llegó último primero. Salen de ahí con la
   * primera nota. Un cliente va en una sola sección.
   */
  const { nuevos, conDia, resto } = useMemo(() => {
    const lista = buscarClientes(deQuien, busqueda);
    const llego = (c: Cliente) => nuevaDe(historial[c.id])?.creado ?? '';
    const nuevos = porContactar ? [] : lista.filter((c) => !!nuevaDe(historial[c.id]))
      .sort((a, b) => llego(b).localeCompare(llego(a)) || porNombreCliente(a, b));
    const enNuevos = new Set(nuevos.map((c) => c.id));
    const dia = (c: Cliente) => primerRecontacto(historial[c.id]);
    const sigue = lista.filter((c) => !enNuevos.has(c.id));
    return {
      nuevos,
      conDia: sigue.filter(dia).sort((a, b) => dia(a).localeCompare(dia(b)) || porNombreCliente(a, b)),
      resto: porContactar ? [] : sigue.filter((c) => !dia(c)).sort(porNombreCliente)
    };
  }, [deQuien, busqueda, porContactar, historial]);
  const visibles = useMemo(() => [...nuevos, ...conDia, ...resto], [nuevos, conDia, resto]);
  /**
   * Cada sección con su rótulo si hay más de una; *🆕 Nuevos* lo lleva
   * siempre, aunque esté sola: es lo que se destaca.
   */
  const conAlgo = [
    { clave: 'nuevos', titulo: `🆕 Nuevos · ${nuevos.length}`, lista: nuevos, nuevos: true },
    { clave: 'dia', titulo: `📞 Por contactar · ${conDia.length}`, lista: conDia, nuevos: false },
    { clave: 'resto', titulo: `Los demás · ${resto.length}`, lista: resto, nuevos: false }
  ].filter((x) => x.lista.length);
  const secciones = conAlgo.length > 1 || nuevos.length ? conAlgo
    : [{ clave: 'todos', titulo: '', lista: visibles, nuevos: false }];

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!clientes) return <p className="text-hueso/50">Cargando…</p>;

  const abrir = (c: Cliente) => { setAbierta(abierta === c.id ? null : c.id); setNotasDe(''); };

  async function crear(forzar = false) {
    if (!nuevo) return;
    setGuardando(true); setAviso('');
    try {
      const r = await fetch('/api/clientes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...nuevo, forzar })
      });
      const d = await r.json();
      if (d.error) return setAviso(d.error);
      if (d.parecidos?.length) return setParecidas(d.parecidos);
      setClientes(d.clientes);
      setNuevo(null); setParecidas([]);
      setAbierta(d.id);
      avisar(`Cliente creado: ${nuevo.nombre}`);
    } finally { setGuardando(false); }
  }


  async function borrar(c: Cliente) {
    if (!confirm(`¿Borrar la ficha de ${c.nombre}? No tiene cotizaciones, así que no se pierde ninguna.`)) return;
    const r = await fetch(`/api/clientes?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.error) return avisar(d.error, 'atencion');
    setClientes(d.clientes);
    if (abierta === c.id) setAbierta(null);
    avisar(`Ficha borrada: ${c.nombre}`);
  }

  async function migrar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/clientes', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'migrar' })
      });
      const d = await r.json();
      if (d.error) return avisar(d.error, 'atencion');
      avisar(`${d.creadas} fichas nuevas · ${d.vinculados} presupuestos vinculados`);
      await cargar();
    } finally { setGuardando(false); }
  }

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Clientes<Ayuda tema="clientes" />
      </h1>
      <AvisoFijo clave="clientes-intro" className="mb-5 max-w-2xl">
        Una ficha por cliente. Se escribe una vez y la usan todas sus cotizaciones.
      </AvisoFijo>

      {sinFicha > 0 && !soloMira && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded border
                        border-ambar/50 bg-ambar/5 p-4">
          <p className="flex-1 text-[15px]">
            Hay <strong>{sinFicha}</strong> presupuesto{sinFicha === 1 ? '' : 's'} de antes
            de las fichas. Pásalos a fichas: si dos son del mismo cliente, quedan en una sola.
          </p>
          <button onClick={() => void migrar()} disabled={guardando} className="boton">
            {guardando ? 'Pasando…' : 'Crear las fichas'}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, empresa, teléfono, correo o RUT"
          aria-label="Buscar cliente"
          className={`${ENTRADA} min-h-[44px] flex-1 basis-full sm:max-w-md sm:basis-0`} />
        {/* El mismo *Mías* de todo el panel (`BotonMias`). */}
        {hayFiltro && (
          <div role="group" aria-label="De quién son" className="flex gap-2">
            <BotonMias texto="Míos" cuantas={mios.length} elegido={soloMios && !vendedor}
              onClick={() => { setVer('mios'); setVendedor(''); }} />
            <BotonTodos texto="Todos" cuantas={clientes!.length} elegido={!soloMios && !vendedor}
              onClick={() => { setVer('todos'); setVendedor(''); }} />
          </div>
        )}
        {hayFiltro && porVendedor && (vendedor ? (
          <button type="button" onClick={() => setVendedor('')}
            className="boton min-h-[44px] border-oro bg-oro/15 !font-semibold text-oro">
            👤 {nombreVendedor(vendedor)} <span className="ml-1 tabular-nums">{delVendedor.size}</span> ✕
          </button>
        ) : (
          <button type="button" onClick={() => setEligiendoVendedor(!eligiendoVendedor)}
            aria-expanded={eligiendoVendedor} aria-haspopup="listbox" className="boton min-h-[44px]">👤 Por vendedor…</button>
        ))}
        {hayFiltro && (
          <button type="button" aria-pressed={porContactar} onClick={() => setPorContactar(!porContactar)}
            disabled={!conRecontacto && !porContactar}
            className={`boton min-h-[44px] ${porContactar ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
            📞 Por contactar <span className="ml-1 tabular-nums text-hueso/60">{conRecontacto}</span>
          </button>
        )}
        {!nuevo && !soloMira && (
          <button onClick={() => { setNuevo({ ...CLIENTE_VACIO, nombre: busqueda }); setParecidas([]);
                                   setAviso(''); }}
            className="boton boton-relleno min-h-[44px] px-5 text-[15px]">
            + Nuevo cliente
          </button>
        )}
      </div>

      {eligiendoVendedor && porVendedor && vendedores && (
        <div className="-mt-2 mb-4 max-w-md">
          <BuscarEnLista etiqueta="Buscar vendedor" vacia="No hay vendedores."
            elegido={vendedor}
            // Solo los que tienen clientes: uno sin ninguno dejaría la lista vacía.
            opciones={vendedores.filter((v) => (porVendedor[v.usuario]?.length ?? 0) > 0).map((v) => {
              const n = porVendedor[v.usuario].length;
              return { id: v.usuario, nombre: v.nombre, detalle: `${n} ${n === 1 ? 'cliente' : 'clientes'}` };
            })}
            onElegir={(id) => { setVendedor(id); setEligiendoVendedor(false); setAbierta(null); }}
            onCerrar={() => setEligiendoVendedor(false)} />
        </div>
      )}

      {nuevo && (
        // `data-ficha`: así la encuentra `npm run ventanas`, que mide si cabe.
        <div data-ficha="nueva" className="mb-5 rounded border border-oro/50 bg-panel p-4">
          <h2 className="mb-3 text-[15px] font-bold uppercase tracking-wide">Nuevo cliente</h2>
          <CamposCliente datos={nuevo} quien="el cliente nuevo"
            poner={(k, v) => setNuevo({ ...nuevo, [k]: v })} />

          {parecidas.length > 0 && (
            <div className="mt-4 rounded border border-ambar/50 bg-ambar/5 p-3">
              <p className="text-[15px] font-semibold text-ambar-texto">
                ¿Es alguno de estos? Ya hay {parecidas.length === 1 ? 'un cliente' : 'clientes'} con
                ese teléfono, correo o RUT.
              </p>
              <ul className="mt-2 space-y-2">
                {parecidas.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3">
                    <span className="flex-1 text-[15px]">
                      <strong>{c.nombre}</strong>
                      {c.empresa && <> · {c.empresa}</>}
                      <span className="text-hueso/70"> · {c.telefono || c.correo}</span>
                    </span>
                    <button className="boton" onClick={() => {
                      setNuevo(null); setParecidas([]); setBusqueda('');
                      setAbierta(c.id);
                    }}>Sí, es este</button>
                  </li>
                ))}
              </ul>
              <button className="boton mt-3" onClick={() => void crear(true)} disabled={guardando}>
                No, es otro: crear la ficha igual
              </button>
            </div>
          )}

          {aviso && <p className="mt-3 text-[15px] text-rojo-texto">{aviso}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {parecidas.length === 0 && (
              <button onClick={() => void crear()} disabled={guardando}
                className="boton boton-relleno min-h-[44px] px-5">
                {guardando ? 'Guardando…' : 'Guardar cliente'}
              </button>
            )}
            <button onClick={() => { setNuevo(null); setParecidas([]); setAviso(''); }}
              className="boton min-h-[44px]">Cancelar</button>
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded border border-dashed border-hueso/15 p-5 text-[15px] text-hueso/60">
          {clientes.length === 0
            ? 'Todavía no hay clientes. Crea el primero con “+ Nuevo cliente”.'
            : soloMios && mios.length === 0
              ? 'Todavía no tienes clientes tuyos: aquí aparecen los que crees o a los que les cotices. Mira en Todos.'
              : soloMios ? `Ninguno de los tuyos calza con “${busqueda}”. Mira en Todos.` : `Nadie calza con “${busqueda}”.`}
        </p>
      ) : (
        // **Las tarjetas, en columnas** (2026-11-26, lo pidió el cliente: *"sin
        // confirmar envío es importante, debe estar en una columna central, no
        // al borde derecha"*; regla *el mismo dato va en la misma columna*). En
        // el computador, todas las secciones son una sola grilla y cada
        // cabecera usa sus columnas (`subgrid`): el nombre y su contacto · los
        // avisos (✉, 📞, 🆕), centrados en la columna del medio · *Borrar*. Así
        // quedan en la misma vertical en todas las tarjetas, también entre
        // secciones. En el celular, como antes.
        <div data-columnas="clientes" className="lg:grid lg:grid-cols-[auto_minmax(min-content,1fr)_auto]">{secciones.map((sec, k) => (
        <div key={sec.clave} className={`lg:contents ${k > 0 ? 'mt-5' : ''}`}>
        {/* El rótulo de los grupos de la Agenda (*Hoy · Próximos días*). */}
        {/* Un título de verdad (2026-11-25): abre su sección. */}
        {sec.titulo && (
          <h3 className={`mb-1.5 text-[13px] font-semibold uppercase tracking-wider lg:col-span-full
                          ${k > 0 ? 'lg:mt-5' : ''} ${sec.nuevos ? 'text-rosa-texto' : 'text-hueso/60'}`}>
            {sec.titulo}
          </h3>
        )}
        <ul className={`${LISTA_TARJETAS} lg:contents`}>
          {sec.lista.map((c) => {
            const n = cotizaciones[c.id] ?? 0;
            const abiertaEsta = abierta === c.id;
            return (
              <li key={c.id} className={`overflow-hidden ${marcoTarjeta(!!abiertaEsta)}
                                         lg:col-span-full lg:grid lg:grid-cols-subgrid`}>
                {/* La cabecera entera abre la ficha (2026-11-26): los avisos van
                    fuera del botón, en su columna, y apretarlos también la abre
                    —salvo ✉, que lleva a la cotización—. */}
                <div className="flex flex-wrap items-center gap-x-2 pr-2 lg:col-span-full lg:grid lg:grid-cols-subgrid lg:gap-x-3"
                  onClick={(e) => { if (!(e.target as Element).closest('button, a')) abrir(c); }}>
                  <button type="button" aria-expanded={!!abiertaEsta} onClick={() => abrir(c)}
                    className="flex min-h-[52px] min-w-0 flex-1 flex-wrap items-center gap-x-3
                               gap-y-1 px-3 py-2.5 text-left hover:bg-hueso/5">
                    <SignoAbrir abierta={!!abiertaEsta} tamano="h-6 w-6 text-[14px]" />
                    <span className="text-[16px] font-semibold">{c.nombre}</span>
                    {c.empresa && <span className="text-[14px] text-hueso/70">{c.empresa}</span>}
                    <span className="text-[14px] text-hueso/70">{c.telefono || c.correo}</span>
                    {n > 0 && (
                      <span className="rounded-full border border-rosa/50 px-2 py-0.5
                                       text-[13px] font-semibold text-rosa-texto">
                        {n} cotizaci{n === 1 ? 'ón' : 'ones'}
                      </span>
                    )}
                  </button>
                  {/* **Los avisos, en la columna del medio** (2026-11-26): el
                      recontacto más cercano, la del sitio sin contacto (🆕) y
                      ✉ una lista sin confirmar, que abre la cotización en el
                      Envío y pregunta. En el celular, debajo del nombre. */}
                  {(() => {
                    const contacto = primerRecontacto(historial[c.id]);
                    const nueva = nuevaDe(historial[c.id]);
                    const x = envioDe(historial[c.id]);
                    return (
                      <div className={`flex cursor-pointer justify-center max-lg:basis-full max-lg:justify-start max-lg:px-3
                                       ${contacto || nueva || x ? '' : 'max-lg:hidden'}`}>
                        {(contacto || nueva || x) && (
                          <span data-columna="avisos" data-eje="centro"
                            className="inline-flex flex-wrap items-center justify-center gap-2 max-lg:pb-2.5">
                            {x && <PastillaEnvio cliente={c.nombre} suya={x.envio === 'pregunta'}
                              href={x.envio !== 'aviso' && !soloMiraCotizar ? linkACotizacion(x.id, PASO.envio, true) : undefined} />}
                            <PastillaContacto fecha={contacto} hoy={hoyDia} />
                            {nueva && <PastillaNueva promo={nueva.promo ?? ''} creado={nueva.creado ?? ''} ahora={ahora} />}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {n === 0 && !soloMira && !c.contactoTapado ? (
                    <button onClick={() => void borrar(c)}
                      className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto lg:justify-self-end"
                      title="No tiene cotizaciones, así que se puede borrar">Borrar</button>
                  ) : <span aria-hidden className="hidden lg:block" />}
                </div>

                {abiertaEsta && (
                  <div className={`${CUERPO_ABIERTO} p-4 lg:col-span-full`}>
                    {/* **Su historial de cotizaciones** (Fase 2): todas, con la
                        ganada en verde y las alternativas marcadas. Un cliente
                        que pide varias, o dos opciones, las ve juntas acá. */}
                    <div className="mb-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
                          Cotizaciones
                        </p>
                        {/* **La última nota, a la vista** (2026-11-25, lo pidió el
                            cliente: *"se tiene que mostrar el último comentario…
                            en todos lados"*): con las notas plegadas, la última de
                            sus cotizaciones, con su N° si tiene varias. En el
                            computador va en esta fila, que tenía el medio vacío;
                            en el celular, debajo. La misma cajita de la cotización. */}
                        {!verNotas && (notas[c.id] ?? []).length > 0 ? (
                          <UltimaNota nota={ordenarNotas(notas[c.id] ?? [])[0]}
                            className="order-last min-w-0 basis-full lg:order-none lg:basis-0 lg:flex-1"
                            cotizacion={gruposDeNotas(notas[c.id] ?? []).length > 1
                              ? `N° ${folioDelGrupo(historial[c.id], ordenarNotas(notas[c.id] ?? [])[0].presupuesto)}` : ''} />
                        ) : <span className="flex-1" />}
                        {/* **Las notas de sus cotizaciones** (2026-11-23): plegadas,
                            para que la ficha siga cabiendo en la pantalla. Solo
                            llegan las que esta cuenta lee. */}
                        {(notas[c.id] ?? []).length > 0 && (
                          <button type="button" aria-expanded={verNotas} onClick={() => setVerNotas(!verNotas)}
                            className={`boton ${verNotas ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                            🗒 Notas · {(notas[c.id] ?? []).length} <span aria-hidden className="ml-1">{verNotas ? '▴' : '▾'}</span>
                          </button>
                        )}
                        {!soloMiraCotizar && (
                          <a href={`/presupuestos?cliente=${encodeURIComponent(c.id)}`}
                            className="tecla boton">+ Cotizarle</a>
                        )}
                      </div>
                      {verNotas && (notas[c.id] ?? []).length > 0 && (() => {
                        const todas = notas[c.id] ?? [];
                        const grupos = gruposDeNotas(todas);
                        const varios = grupos.length > 1;
                        const vistas = notasDe ? todas.filter((n) => n.presupuesto === notasDe) : todas;
                        return (
                          <div className="mb-3 rounded-lg border border-hueso/15 p-2.5">
                            {/* Con notas en dos o más cotizaciones, un botón por
                                cotización: son pocas y fijas. */}
                            {varios && (
                              <div className="mb-2.5 flex flex-wrap gap-2" role="group" aria-label="De qué cotización">
                                {[{ g: '', t: 'Todas', n: todas.length },
                                  ...grupos.map((g) => ({ g, t: `N° ${folioDelGrupo(historial[c.id], g)}`, n: todas.filter((x) => x.presupuesto === g).length }))]
                                  .map(({ g, t, n }) => (
                                    <button key={g || 'todas'} type="button" aria-pressed={notasDe === g} onClick={() => setNotasDe(g)}
                                      className={`boton min-h-[40px] ${notasDe === g ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                                      {t} <span className="ml-1 tabular-nums text-hueso/60">{n}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                            <HistorialNotas notas={vistas} hoy={hoyDia} usuario={usuario} onCambio={() => void cargar()}
                              cotizacionDe={varios && !notasDe ? (n) => `N° ${folioDelGrupo(historial[c.id], n.presupuesto)}` : undefined} />
                          </div>
                        );
                      })()}
                      {(historial[c.id] ?? []).length === 0 ? (
                        <p className="text-[14px] text-hueso/60">Todavía ninguna.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(historial[c.id] ?? []).map((h) => {
                            const alternativas = (historial[c.id] ?? []).filter((x) => x.grupo === h.grupo).length;
                            return (
                              <li key={h.id} className="flex items-stretch gap-2">
                                {/* Abre en el paso del dato apretado (2026-11-26,
                                    `pasoDelClic()`): la fecha, el Evento; el
                                    estado, el suyo; el total, Productos; el 📞, el
                                    Envío. El N°, como siempre. */}
                                <a href={linkACotizacion(h.id)}
                                  onClick={(e) => {
                                    const n = pasoDelClic(e);
                                    if (!n) return;
                                    e.preventDefault();
                                    window.location.href = linkACotizacion(h.id, n);
                                  }}
                                  className={`tecla flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded border
                                              px-3 py-2 min-h-[48px] ${h.estado === 'Ganada'
                                    ? 'border-verde-fuerte bg-verde/10' : 'border-hueso/15'}`}>
                                  <span className="text-[14px] font-semibold">N° {h.folio}</span>
                                  <span data-paso={pasoDelEstado(h.estado)}><PastillaEstado estado={h.estado} /></span>
                                  {alternativas > 1 && (
                                    <span className="text-[13px] text-hueso/60">alternativa</span>
                                  )}
                                  <span data-paso={PASO.evento} className="text-[14px] text-hueso/70">
                                    {/* Como en la lista de cotizaciones (2026-11-22): *DOM 22 nov 2026*. */}
                                    {h.fecha ? <FechaDia fecha={h.fecha} tamano="aviso" conAno /> : h.periodo}
                                  </span>
                                  {h.recontactar && (
                                    <span data-paso={PASO.envio} className="inline-flex"><PastillaContacto fecha={h.recontactar} hoy={hoyDia} /></span>
                                  )}
                                  {h.nueva && <PastillaNueva promo={h.promo ?? ''} creado={h.creado ?? ''} ahora={ahora} />}
                                  {(h.envio === 'aviso' || (h.envio && soloMiraCotizar)) && <PastillaEnvio cliente={c.nombre} suya={false} />}
                                  <span className="flex-1" />
                                  <strong data-paso={PASO.productos} className="text-[15px]">{enPesos(h.total)}</strong>
                                </a>
                                {/* **📝 Anotar, desde la ficha** (2026-11-25): la
                                    misma ventanita de la cotización —qué
                                    conversaron y cuándo volver a contactarlo—. */}
                                {(h.envio === 'pregunta' || h.envio === 'abre') && !soloMiraCotizar && (
                                  <PastillaEnvio cliente={c.nombre} suya={h.envio === 'pregunta'} href={linkACotizacion(h.id, PASO.envio, true)}
                                    className="!min-h-[48px] self-center" />
                                )}
                                {h.anota && !soloMiraCotizar && (
                                  <button type="button" onClick={() => setAnotando({ h, nombre: c.nombre, empresa: c.empresa ?? '', telefono: c.telefono ?? '', correo: c.correo ?? '' })}
                                    className="boton min-h-[48px] shrink-0 !border-oro font-semibold">📝 Anotar</button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {/* La ficha, con la misma pieza que la ventana de cotizar
                        (`EditarCliente`). La de un cliente de otro vendedor
                        llega con el contacto tapado y no se edita. */}
                    <EditarCliente cliente={c} soloMira={soloMira} onClientes={setClientes}
                      pie={vendedores ? (
                        <>
                          <span className="text-[13px] text-hueso/60">{c.id}</span>
                          <CambiarVendedor de={c.creadoPor ?? ''} vendedores={vendedores} cliente={c.id} nombre={c.nombre}
                            abiertas={abiertas[c.id] ?? 0} ganadas={ganadas[c.id] ?? 0} onCambiado={() => void cargar()} />
                        </>
                      ) : (
                        <span className="text-[13px] text-hueso/60">
                          {c.id}{c.creadoPor && <> · creada por {c.creadoPor}</>}
                        </span>
                      )} />
                  </div>
                )}
                {abiertaEsta && <PieCerrar nombre={c.nombre} onCerrar={() => abrir(c)} />}
              </li>
            );
          })}
        </ul>
        </div>
        ))}</div>
      )}
      {anotando && (
        <NotasCotizacion
          p={{ id: anotando.h.id, cliente: anotando.nombre, empresaCliente: anotando.empresa,
            recontactar: anotando.h.recontactar ?? '', fecha: anotando.h.fecha, telefono: anotando.telefono, email: anotando.correo }}
          grupo={anotando.h.grupo} notas={Object.values(notas).flat()} hoy={hoyDia} usuario={usuario}
          onCambio={() => void cargar()} onCerrar={() => setAnotando(null)} />
      )}
    </section>
  );
}
