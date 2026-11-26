'use client';

/**
 * **📋 Lista: la vista de la gerencia sobre las cotizaciones** (2026-11-17,
 * lo pidió el cliente; lógica en `lib/listaCotizaciones.ts`). Reemplaza a
 * *🔎 Buscar*.
 *
 * De arriba abajo, como se lee:
 * 1. **De quién** —para quien ve el equipo, *👤 Por vendedor…* y *🤝 Por
 *    socio…*, con buscador— y **cuándo**: *Todo · Mes · Semana* con ◀ ▶, por
 *    fecha del evento o por fecha en que se cotizó.
 * 2. **Seis tarjetas**: En carrera, Cotizado, Ganado, Tasa de cierre,
 *    🗓 Agenda (antes *Por seguir*; 2026-11-23) y Por cobrar. Las que son una
 *    lista se aprietan y la filtran; la Agenda muestra la agenda del vendedor
 *    (`Agenda`), que no sigue al periodo: es de hoy y de los próximos días.
 * 3. **Ganado por mes**, según el día en que se ganó.
 * 4. **Estado** con cuántas hay, el buscador y la lista: las filas de
 *    siempre, con una segunda línea —quién la vende y el próximo paso—.
 *
 * El vendedor ve sus números: sin *Por vendedor*, y las tarjetas de lo suyo.
 */
import { LISTA_FILAS } from './filaCotizacion';
import { useMemo, useState, type ReactNode } from 'react';
import ElegirPeriodo from './ElegirPeriodo';
import AyudaCorta from './AyudaCorta';
import Tarjeta from './TarjetaNumero';
import BuscarEnLista from './BuscarEnLista';
import BotonPorVendedor from './BotonPorVendedor';
import { enPesos } from '@/lib/ocupacion';
import { mesEnPalabras, rangoEnPalabras, semanaDe, sumarDias } from '@/lib/fechas';
import type { Presupuesto } from '@/lib/presupuestos';
import { agendaDe, cuentasDeHoy, type ItemAgenda } from '@/lib/agenda';
import {
  veElEquipo, unaPorGrupo, enRango, rangoDe, pasaFiltro, calzaBusqueda, resumenLista, ganadoPorMes,
  cuentasPorFiltro, proximosPasos, ordenarLista, vendedoresDe, enLoQueViene, LO_QUE_VIENE,
  ordenarPorRecontacto, cuentasDeRecontacto,
  type ContextoLista, type FiltroLista, type PorFecha
} from '@/lib/listaCotizaciones';

/** El mes anterior o el siguiente, como texto `AAAA-MM`. */
function moverMes(mes: string, n: number): string {
  let [a, m] = mes.split('-').map(Number);
  m += n;
  while (m < 1) { m += 12; a--; }
  while (m > 12) { m -= 12; a++; }
  return `${a}-${String(m).padStart(2, '0')}`;
}

const TONO_PASO = { rojo: 'font-semibold text-rojo-texto', ambar: 'font-semibold text-ambar-texto',
  verde: 'font-semibold text-verde-texto', neutro: 'text-hueso/65' } as const;

const ESTADOS: [FiltroLista, string][] = [
  ['enCarrera', 'En carrera'], ['esperando', 'Esperando respuesta'], ['negociando', 'Negociando'],
  ['ganadas', 'Ganadas'], ['cerradas', 'Perdidas y vencidas'], ['todas', 'Todas']
];
const DE_LAS_TARJETAS: Partial<Record<FiltroLista, string>> = {
  mandadas: 'lo mandado', porCobrar: 'las ganadas con plata por cobrar',
  recontactar: 'las que tienen un día para recontactar, de todas las fechas'
};

export default function ListaCotizaciones({ ctx, rol, visibles, mias, soloMias, socios, fila, onDeTodos, verAgenda, vendedor, onVendedor }: {
  ctx: ContextoLista;
  rol: string;
  /** Las que deja ver *Mías / De todos*. */
  visibles: Presupuesto[];
  /** Si *Mías / De todos* está en *Mías*: lo dice el título de *Ganado mes a mes*. */
  soloMias: boolean;
  /** Las de esta cuenta, con su grupo de alternativas. */
  mias: Presupuesto[];
  socios: { id: string; nombre: string; activo: boolean }[];
  /** La fila de siempre (la de *Sin fecha* y el calendario), con una segunda línea. */
  fila: (p: Presupuesto, detalle: ReactNode) => ReactNode;
  /** Elegir un vendedor o un socio mira *De todos*. */
  onDeTodos: () => void;
  /** La agenda de lo que se está mirando, con los botones de cada fila (`Agenda`). */
  verAgenda: (a: { contactar: ItemAgenda[]; redactar: ItemAgenda[] }) => ReactNode;
  /**
   * *👤 Por vendedor…*, el mismo del calendario (2026-11-26): lo guarda la
   * pantalla, así sigue puesto al pasar de una vista a otra.
   */
  vendedor: string;
  onVendedor: (v: string) => void;
}) {
  const equipo = veElEquipo(rol);
  const [filtro, setFiltro] = useState<FiltroLista>('enCarrera');
  const [busqueda, setBusqueda] = useState('');
  /**
   * `'viene'`: lo que viene; `''`: todo; `AAAA-MM`: un mes; `AAAA-MM-DD`: la
   * semana que parte ese lunes.
   */
  // **Parte en *Lo que viene*** (2026-11-25, lo pidió el cliente: *"dale, lo
  // que viene"*). Hasta ese día partía en el mes en curso (2026-11-22), y lo
  // importado del CRM con su día en diciembre o enero no se veía: estaba en
  // la Agenda y no en la Lista. *Semana*, *Mes* y *Todo* quedan a un toque.
  const [periodo, setPeriodo] = useState<string>(LO_QUE_VIENE);
  const [porFecha, setPorFecha] = useState<PorFecha>('evento');
  const setVendedor = onVendedor;
  const [socio, setSocio] = useState('');
  const [eligiendo, setEligiendo] = useState<'' | 'vendedor' | 'socio'>('');

  const viene = periodo === LO_QUE_VIENE;
  const rango = viene ? null : rangoDe(periodo);
  // **De quién**: el vendedor, lo suyo; quien ve el equipo, lo que deja ver
  // *Mías / De todos* y, si eligió, un vendedor o un socio.
  const deQuien = useMemo(() => {
    const desde = equipo ? visibles : mias;
    return desde.filter((p) => (!vendedor || p.creadoPor === vendedor) && (!socio || p.socio === socio));
  }, [equipo, visibles, mias, vendedor, socio]);
  const base = useMemo(() => unaPorGrupo(deQuien.filter((p) => (viene ? enLoQueViene(p, ctx.hoy) : enRango(p, rango, porFecha))), ctx),
    [deQuien, viene, rango?.desde, rango?.hasta, porFecha, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  // **📞 Recontactar no sigue al periodo** (2026-11-25, lo pidió el cliente:
  // *"un cuadro como el de agenda para filtrar por recontactar y aparecen
  // todas las cotizaciones que tienen un recontacto puesto"*): de *De quién*,
  // todas las fechas.
  const todasDeQuien = useMemo(() => unaPorGrupo(deQuien, ctx), [deQuien, ctx]);
  const recontacto = useMemo(() => cuentasDeRecontacto(todasDeQuien, ctx.hoy), [todasDeQuien, ctx]);
  const r = useMemo(() => resumenLista(base, ctx), [base, ctx]);
  const meses = useMemo(() => ganadoPorMes(unaPorGrupo(deQuien, ctx), ctx), [deQuien, ctx]);
  const cuantas = useMemo(() => cuentasPorFiltro(base, ctx), [base, ctx]);
  // **La agenda no sigue al periodo** (2026-11-23): es de hoy y de los
  // próximos días, de lo que se mira en *De quién*.
  const agenda = useMemo(() => agendaDe(deQuien, ctx.hoy, ctx.seguimiento), [deQuien, ctx]);
  const deHoy = cuentasDeHoy(agenda);
  const lista = useMemo(() => (filtro === 'recontactar'
    ? ordenarPorRecontacto(todasDeQuien.filter((p) => pasaFiltro(p, filtro, ctx) && calzaBusqueda(p, busqueda)), ctx.hoy)
    : ordenarLista(base.filter((p) => pasaFiltro(p, filtro, ctx) && calzaBusqueda(p, busqueda)), ctx)),
  [base, todasDeQuien, filtro, busqueda, ctx]);

  const nombreSocio = (id: string) => socios.find((s) => s.id === id)?.nombre ?? id;
  const esMes = periodo.length === 7;
  const titulo = !rango ? '' : esMes ? mesEnPalabras(periodo) : rangoEnPalabras([rango.desde, rango.hasta]);
  const alternar = (f: FiltroLista) => setFiltro(filtro === f ? 'enCarrera' : f);
  /** De quién es lo ganado mes a mes: lo que eligió en *De quién*, dicho en el título. */
  const deQuienGanado = [vendedor, socio && nombreSocio(socio)].filter(Boolean).join(' · ')
    || (!equipo || soloMias ? 'Tuyas' : 'Todo el equipo');

  return (
    <div>
      {/* 1. De quién y cuándo. */}
      <div className="flex flex-wrap items-center gap-2">
        {equipo && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="De quién">
            <BotonPorVendedor vendedor={vendedor} onSoltar={() => setVendedor('')} abierto={eligiendo === 'vendedor'}
              onAbrir={() => setEligiendo(eligiendo === 'vendedor' ? '' : 'vendedor')} />
            {socio ? (
              <button type="button" onClick={() => setSocio('')}
                className="boton min-h-[44px] border-cielo-fuerte bg-cielo/15 !font-semibold text-cielo-texto">🤝 {nombreSocio(socio)} ✕</button>
            ) : (
              <button type="button" onClick={() => setEligiendo(eligiendo === 'socio' ? '' : 'socio')}
                aria-expanded={eligiendo === 'socio'} aria-haspopup="listbox" className="boton min-h-[44px]">🤝 Por socio…</button>
            )}
          </div>
        )}
        <span className="flex-1" />
        {/* **El periodo es una sola pieza** (`ElegirPeriodo`, 2026-11-22, lo
            pidió el cliente): *Mes · Semana · Todo*, el mes o la semana con sus
            flechas y por qué fecha se cuenta, en un mismo marco y en la fila de
            *De quién*. La frase *Mostrando…* que había acá se fue: repetía lo
            que dicen los botones. */}
        {/* *Lo que viene · Semana · Mes*, en el orden de los calendarios
            (`MODOS_CALENDARIO`), y *Todo* al final (2026-11-25). */}
        <ElegirPeriodo
          modos={[{ clave: 'viene', rotulo: 'Lo que viene' }, { clave: 'semana', rotulo: 'Semana' },
            { clave: 'mes', rotulo: 'Mes' }, { clave: 'todo', rotulo: 'Todo' }]}
          modo={viene ? 'viene' : !periodo ? 'todo' : esMes ? 'mes' : 'semana'}
          onModo={(m) => setPeriodo(m === 'viene' ? LO_QUE_VIENE : m === 'mes' ? ctx.hoy.slice(0, 7)
            : m === 'semana' ? semanaDe(ctx.hoy) : '')}
          titulo={rango ? titulo : undefined}
          onMover={(n) => setPeriodo(esMes ? moverMes(periodo, n) : sumarDias(periodo, 7 * n))}
          fechas={rango ? [
            { clave: 'evento', icono: '📅', largo: 'Fecha del evento', corto: 'Evento' },
            { clave: 'cotizada', icono: '✍', largo: 'Fecha de cotización', corto: 'Cotización' }] : undefined}
          fecha={porFecha} onFecha={(k) => setPorFecha(k as PorFecha)} />
      </div>

      {eligiendo && (
        <div className="mt-2 max-w-md">
          <BuscarEnLista
            etiqueta={eligiendo === 'vendedor' ? 'Buscar vendedor' : 'Buscar socio comercial'}
            vacia={eligiendo === 'vendedor' ? 'Nadie ha cotizado todavía.' : 'No hay socios comerciales.'}
            elegido={eligiendo === 'vendedor' ? vendedor : socio}
            opciones={eligiendo === 'vendedor' ? vendedoresDe(ctx.todas)
              : socios.map((s) => {
                const n = unaPorGrupo(ctx.todas.filter((p) => p.socio === s.id), ctx).length;
                return { id: s.id, nombre: s.nombre, detalle: `${n} ${n === 1 ? 'cotización' : 'cotizaciones'}${s.activo ? '' : ' · desactivado'}` };
              })}
            onElegir={(id) => {
              if (eligiendo === 'vendedor') setVendedor(id); else setSocio(id);
              setEligiendo(''); onDeTodos();
            }}
            onCerrar={() => setEligiendo('')} />
        </div>
      )}

      {/* 2. Las tarjetas. */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        <Tarjeta que="En carrera" ayuda="listaEnCarrera" valor={String(r.enCarrera.n)}
          nota={`${r.enCarrera.gente} ${r.enCarrera.gente === 1 ? 'persona posible' : 'personas posibles'}`}
          tono="border-rosa/50 bg-rosa/[0.05]" activa={filtro === 'enCarrera'} onClick={() => setFiltro('enCarrera')} />
        <Tarjeta que="Cotizado" ayuda="listaCotizado" valor={enPesos(r.cotizado.monto)}
          nota={`${r.cotizado.n} ${r.cotizado.n === 1 ? 'mandada' : 'mandadas'}${r.cotizado.borradores
            ? ` · ${r.cotizado.borradores} sin mandar${r.cotizado.montoBorradores ? ` (${enPesos(r.cotizado.montoBorradores)})` : ''}` : ''}`}
          tono="border-rosa/50 bg-rosa/[0.05]" activa={filtro === 'mandadas'} onClick={() => alternar('mandadas')} />
        <Tarjeta que="Ganado" ayuda="listaGanado" valor={enPesos(r.ganado.monto)}
          nota={`${r.ganado.n} ${r.ganado.n === 1 ? 'evento' : 'eventos'}`}
          tono="border-verde-fuerte/40 bg-verde/[0.06] text-verde-texto" activa={filtro === 'ganadas'} onClick={() => alternar('ganadas')} />
        <Tarjeta que="Tasa de cierre" ayuda="listaTasa" valor={r.tasa.pct == null ? '—' : `${r.tasa.pct}%`}
          nota={`${r.tasa.ganadas} ${r.tasa.ganadas === 1 ? 'ganada' : 'ganadas'} · ${r.tasa.perdidas} ${r.tasa.perdidas === 1 ? 'perdida' : 'perdidas'}`}
          tono="border-hueso/20 bg-panel" />
        {/* **🗓 Agenda** (2026-11-23, reemplaza a *Por seguir*): lo que toca
            hoy —contactar o mandar una cotización prometida—. Se aprieta y se
            ve la agenda entera. */}
        <Tarjeta que="🗓 Agenda" ayuda="listaAgenda" valor={String(deHoy.hoy)}
          nota={deHoy.hoy ? `para hoy${deHoy.atrasadas ? ` · ${deHoy.atrasadas} atrasadas` : ''}`
            : deHoy.semana ? `nada hoy · ${deHoy.semana} esta semana` : 'nada pendiente'}
          tono={deHoy.atrasadas ? 'border-rojo-fuerte/50 bg-rojo/[0.06] text-rojo-texto'
            : deHoy.hoy ? 'border-ambar-fuerte/50 bg-ambar/[0.07] text-ambar-texto' : 'border-hueso/20 bg-panel'}
          activa={filtro === 'agenda'} onClick={() => alternar('agenda')} />
        {/* **📞 Recontactar** (2026-11-25): todas las que tienen un día para
            volver a contactarlo, de todas las fechas. Se aprieta y la lista
            las muestra por ese día, lo atrasado primero. */}
        <Tarjeta que="Recontactar" ayuda="listaRecontactar" valor={String(recontacto.total)}
          nota={recontacto.atrasadas ? `${recontacto.atrasadas} ${recontacto.atrasadas === 1 ? 'atrasada' : 'atrasadas'}${recontacto.hoy ? ` · ${recontacto.hoy} hoy` : ''}`
            : recontacto.hoy ? `${recontacto.hoy} para hoy` : recontacto.total ? 'ninguna atrasada' : 'ninguna puesta'}
          tono={recontacto.atrasadas || recontacto.hoy ? 'border-rojo-fuerte/50 bg-rojo/[0.06] text-rojo-texto'
            : recontacto.total ? 'border-ambar-fuerte/50 bg-ambar/[0.07] text-ambar-texto' : 'border-hueso/20 bg-panel'}
          activa={filtro === 'recontactar'} onClick={() => alternar('recontactar')} />
        <Tarjeta que="Por cobrar" ayuda="listaPorCobrar" valor={enPesos(r.porCobrar.monto)}
          nota={`${r.porCobrar.n} ${r.porCobrar.n === 1 ? 'ganada' : 'ganadas'} con saldo`}
          tono={r.porCobrar.monto ? 'border-ambar-fuerte/50 bg-ambar/[0.07] text-ambar-texto' : 'border-hueso/20 bg-panel'}
          activa={filtro === 'porCobrar'} onClick={() => alternar('porCobrar')} />
      </div>

      {/* 3. **Ganado mes a mes** (2026-11-22, lo pidió el cliente: *"no se
          entiende rápido. El título debería ser entonces distinto"*). El
          título dice **de quién es** —*Todo el equipo*, *Tuyas*, un vendedor o
          un socio, lo que se eligió en *De quién*—, y **sale solo mirando
          *Todo***: con *Mes* o *Semana* el periodo de arriba no lo movía, y la
          tarjeta *Ganado* ya dice lo de ese periodo. */}
      {meses.length > 0 && periodo === '' && (
        <div className="mt-3 lg:flex lg:items-center lg:gap-3">
          <p className="flex shrink-0 flex-wrap items-center gap-x-1.5 text-[13px] font-semibold uppercase tracking-wider text-hueso/60">
            Ganado mes a mes ·
            <b className="text-[15px] normal-case tracking-normal text-hueso">{deQuienGanado}</b>
            <AyudaCorta tema="listaPorMes" />
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2 lg:mt-0">
            {meses.map((m) => (
              <div key={m.mes} className="rounded-lg border border-verde/40 bg-panel px-3 py-1.5">
                <p className="text-[13px] font-semibold text-hueso/70 first-letter:uppercase">{mesEnPalabras(m.mes)}</p>
                <p className="text-[15px] font-bold tabular-nums text-verde-texto">{enPesos(m.monto)}</p>
                <p className="text-[13px] text-hueso/60">{m.cantidad} {m.cantidad === 1 ? 'evento' : 'eventos'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Estado, el buscador y la lista. */}
      <div className="mt-3 lg:flex lg:flex-wrap lg:items-center lg:gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
        {ESTADOS.map(([k, t]) => (
          <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={filtro === k}
            className={`boton min-h-[44px] ${filtro === k ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
            {t} <span className="ml-1 tabular-nums text-hueso/60">{cuantas[k]}</span>
          </button>
        ))}
      </div>
      {DE_LAS_TARJETAS[filtro] && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] lg:order-3 lg:mt-0 lg:basis-full">
          Mostrando {DE_LAS_TARJETAS[filtro]} ({filtro === 'recontactar' ? recontacto.total : cuantas[filtro]}).
          <button type="button" className="boton min-h-[40px]" onClick={() => setFiltro('enCarrera')}>Ver todo lo en carrera</button>
        </p>
      )}
      <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cliente, N°, tipo de evento o vendedor" aria-label="Buscar cotización"
        className="mt-2 min-h-[44px] w-full rounded border border-hueso/20 bg-tinta px-3 text-[15px]
                   focus:border-oro focus:outline-none sm:max-w-md lg:order-2 lg:ml-auto lg:mt-0 lg:w-80 lg:flex-none" />
      </div>

      <div className="mt-3">
        {filtro === 'agenda' ? verAgenda(agenda) : lista.length === 0 ? (
          <p className="rounded border border-dashed border-hueso/20 p-5 text-[15px] text-hueso/60">Ninguna calza.</p>
        ) : (
          <ul className={LISTA_FILAS} data-columnas="lista">
            {lista.map((p) => {
              const detalle = (
                <>
                  {equipo && p.creadoPor && <span>👤 {p.creadoPor}</span>}
                  {p.socio && <span>🤝 {nombreSocio(p.socio)}</span>}
                  {p.tipoEvento && <span>{p.tipoEvento}</span>}
                  {/* El día elegido para recontactarlo va como la pastilla 📞,
                      en la primera fila (2026-11-25): `fila` la pone. */}
                  {proximosPasos(p, ctx).filter((x) => !x.contacto).map((x) => (
                    <span key={x.texto} data-paso={x.paso} className={TONO_PASO[x.tono]}>{x.texto}</span>))}
                </>
              );
              return fila(p, detalle);
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
