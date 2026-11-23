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
import { HistorialNotas } from './NotasCotizacion';
import type { Nota } from '@/lib/notas';
import { avisar } from './AvisoFlotante';
import {
  buscarClientes, porNombreCliente, type Cliente, type DatosCliente
} from '@/lib/clientes';
import { PastillaEstado } from './CotizacionesVista';
import { enPesos } from '@/lib/ocupacion';
import FechaDia from './FechaDia';

/** Una cotización en el historial de un cliente. */
interface EnHistorial {
  id: string; folio: string; fecha: string; periodo: string; estado: string;
  total: number; grupo: string;
}

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
    setNotas(d.notas ?? {});
    setSinFicha(d.sinFicha ?? 0);
    setMios(d.mios ?? []);
    setVendedores(d.vendedores ?? null);
    setAbiertas(d.abiertas ?? {});
    setGanadas(d.ganadas ?? {});
  }).catch((e) => setError(String(e)));

  useEffect(() => { void cargar(); }, []);

  const sonMios = useMemo(() => new Set(mios), [mios]);
  const hayFiltro = !!clientes && clientes.length > 0;
  const soloMios = hayFiltro && (ver ?? (mios.length > 0 ? 'mios' : 'todos')) === 'mios';
  const visibles = useMemo(
    () => (clientes ? [...buscarClientes(soloMios ? clientes.filter((c) => sonMios.has(c.id)) : clientes, busqueda)]
      .sort(porNombreCliente) : []),
    [clientes, busqueda, soloMios, sonMios]);

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!clientes) return <p className="text-hueso/50">Cargando…</p>;

  const abrir = (c: Cliente) => setAbierta(abierta === c.id ? null : c.id);

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
            <BotonMias texto="Míos" cuantas={mios.length} elegido={soloMios} onClick={() => setVer('mios')} />
            <BotonTodos texto="Todos" cuantas={clientes!.length} elegido={!soloMios} onClick={() => setVer('todos')} />
          </div>
        )}
        {!nuevo && !soloMira && (
          <button onClick={() => { setNuevo({ ...CLIENTE_VACIO, nombre: busqueda }); setParecidas([]);
                                   setAviso(''); }}
            className="boton boton-relleno min-h-[44px] px-5 text-[15px]">
            + Nuevo cliente
          </button>
        )}
      </div>

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
                        <span className="flex-1" />
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
                      {verNotas && (notas[c.id] ?? []).length > 0 && (
                        <div className="mb-3 rounded-lg border border-hueso/15 p-2.5">
                          <HistorialNotas notas={notas[c.id] ?? []} hoy="" usuario="" onCambio={() => void cargar()} />
                        </div>
                      )}
                      {(historial[c.id] ?? []).length === 0 ? (
                        <p className="text-[14px] text-hueso/60">Todavía ninguna.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(historial[c.id] ?? []).map((h) => {
                            const alternativas = (historial[c.id] ?? []).filter((x) => x.grupo === h.grupo).length;
                            return (
                              <li key={h.id}>
                                <a href={`/presupuestos?abrir=${encodeURIComponent(h.id)}`}
                                  className={`tecla flex flex-wrap items-center gap-x-3 gap-y-1 rounded border
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
                                  <span className="flex-1" />
                                  <strong className="text-[15px]">{enPesos(h.total)}</strong>
                                </a>
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
    </section>
  );
}
