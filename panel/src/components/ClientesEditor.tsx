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
import { PastillaContacto } from './Pastilla';
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
}

/** Las cotizaciones (grupos) con notas, la de la nota más nueva primero. */
const gruposDeNotas = (notas: Nota[]) => [...new Set(ordenarNotas(notas).map((n) => n.presupuesto))];

/** El N° de un grupo: el de su cotización principal, o el de cualquiera del grupo. */
const folioDelGrupo = (h: EnHistorial[] = [], grupo: string) =>
  (h.find((x) => x.id === grupo) ?? h.find((x) => x.grupo === grupo))?.folio ?? '—';

/** El recontacto más cercano de un cliente, entre sus cotizaciones, o `''`. */
const primerRecontacto = (h: EnHistorial[] = []) =>
  h.map((x) => x.recontactar ?? '').filter(Boolean).sort()[0] ?? '';

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
  const visibles = useMemo(() => {
    const lista = [...buscarClientes(porContactar ? deQuien.filter((c) => primerRecontacto(historial[c.id])) : deQuien, busqueda)];
    return porContactar
      ? lista.sort((a, b) => primerRecontacto(historial[a.id]).localeCompare(primerRecontacto(historial[b.id])) || porNombreCliente(a, b))
      : lista.sort(porNombreCliente);
  }, [deQuien, busqueda, porContactar, historial]);

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
        <ul className={LISTA_TARJETAS}>
          {visibles.map((c) => {
            const n = cotizaciones[c.id] ?? 0;
            const abiertaEsta = abierta === c.id;
            return (
              <li key={c.id} className={`overflow-hidden ${marcoTarjeta(!!abiertaEsta)}`}>
                <div className="flex items-center gap-2 pr-2">
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
                    {/* El recontacto más cercano, también con la ficha cerrada. */}
                    <PastillaContacto fecha={primerRecontacto(historial[c.id])} hoy={hoyDia} />
                  </button>
                  {n === 0 && !soloMira && !c.contactoTapado && (
                    <button onClick={() => void borrar(c)}
                      className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto"
                      title="No tiene cotizaciones, así que se puede borrar">Borrar</button>
                  )}
                </div>

                {abiertaEsta && (
                  <div className={`${CUERPO_ABIERTO} p-4`}>
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
                                <a href={`/presupuestos?abrir=${encodeURIComponent(h.id)}`}
                                  className={`tecla flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded border
                                              px-3 py-2 min-h-[48px] ${h.estado === 'Ganada'
                                    ? 'border-verde-fuerte bg-verde/10' : 'border-hueso/15'}`}>
                                  <span className="text-[14px] font-semibold">N° {h.folio}</span>
                                  <PastillaEstado estado={h.estado} />
                                  {alternativas > 1 && (
                                    <span className="text-[13px] text-hueso/60">alternativa</span>
                                  )}
                                  <span className="text-[14px] text-hueso/70">
                                    {/* Como en la lista de cotizaciones (2026-11-22): *DOM 22 nov 2026*. */}
                                    {h.fecha ? <FechaDia fecha={h.fecha} tamano="aviso" conAno /> : h.periodo}
                                  </span>
                                  <PastillaContacto fecha={h.recontactar ?? ''} hoy={hoyDia} />
                                  <span className="flex-1" />
                                  <strong className="text-[15px]">{enPesos(h.total)}</strong>
                                </a>
                                {/* **📝 Anotar, desde la ficha** (2026-11-25): la
                                    misma ventanita de la cotización —qué
                                    conversaron y cuándo volver a contactarlo—. */}
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
