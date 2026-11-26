'use client';

/**
 * **Las tareas internas** (2026-11-26, lo pidió el cliente; lógica en
 * `lib/tareas.ts`, ruta `/api/tareas`).
 *
 * Arriba, *📋 Nueva tarea* —el único botón relleno— y, para la gerencia y el
 * administrador, el filtro por persona. Debajo, en grupos con su marco:
 *
 * - ***Para ti***: lo que te toca ahora (una pendiente que recibiste, o una
 *   que mandaste y te preguntaron algo).
 * - ***Las que mandaste***: las tuyas abiertas, esperando a otro.
 * - ***Del equipo*** (solo quien ve todas): las abiertas entre otros.
 * - ***Cerradas***, plegado: hechas y anuladas.
 *
 * Cada tarea dice qué hay que hacer, de quién a quién, el plazo y el ida y
 * vuelta, con sus botones a la vista. **Se confirman con su botón**: una
 * tarea hecha le llega a otro.
 */
import { useEffect, useState } from 'react';
import BandaSeccion from './BandaSeccion';
import Ayuda from './Ayuda';
import Dialogo from './Dialogo';
import ElegirFecha from './ElegirFecha';
import BuscarEnLista from './BuscarEnLista';
import { FiltroConBuscador } from './BotonPorVendedor';
import ComentariosVista from './ComentariosVista';
import { BOTON_VISTA } from './filaCotizacion';
import { marcoGrupo, marcoTarjeta, TITULO_GRUPO, LISTA_TARJETAS } from './TarjetaLista';
import {
  ESTADO_TAREA, estaAbierta, estaAtrasada, leToca, laMande, esParaMi, rolDelDestino, puedeHacer, destinoDelEnlace,
  tareasDePersona, LARGO_TAREA, type Tarea, type AccionTarea, type Cuenta
} from '@/lib/tareas';
import type { Fecha } from '@/lib/fechas';

type TareaVista = Omit<Tarea, 'fila'>;
interface Persona { usuario: string; nombre: string; rol: string }
interface Datos {
  tareas: TareaVista[]; yo: Cuenta; hoy: Fecha; nombres: Record<string, string>;
  personas: Persona[]; roles: { rol: string; nombre: string; cuantos: number }[]; venTodas: boolean;
}

const ROTULO = 'w-[7.5rem] shrink-0 text-[15px] font-semibold text-hueso/80';
const CAMPO = 'min-h-[44px] w-full min-w-0 rounded-xl border-2 border-hueso/25 bg-tinta px-3 py-2 text-[16px]';

/** `2026-11-26` → `jue 26 nov`. */
function diaCorto(f: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(f)) return f;
  const d = new Date(`${f.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}

/** `2026-11-26 14:05` → `jue 26 nov · 14:05`. */
const cuandoCorto = (c: string) => (c.length > 10 ? `${diaCorto(c)} · ${c.slice(11, 16)}` : diaCorto(c));

export default function TareasVista() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState(false);
  const [persona, setPersona] = useState('');
  // **Tareas o comentarios** (2026-11-26): los comentarios de 💬 se ven acá,
  // como la segunda vista. `?ver=comentarios` abre en ellos (el aviso de la portada).
  const [ver, setVer] = useState<'tareas' | 'comentarios'>('tareas');
  const [avisosComentarios, setAvisosComentarios] = useState(0);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('ver') === 'comentarios') setVer('comentarios');
  }, []);
  const cambiarVista = (v: 'tareas' | 'comentarios') => {
    setVer(v);
    const u = new URL(window.location.href);
    if (v === 'comentarios') u.searchParams.set('ver', 'comentarios'); else u.searchParams.delete('ver');
    window.history.replaceState(null, '', u.toString());
  };

  const cargar = async () => {
    try {
      const r = await fetch('/api/tareas');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudieron leer las tareas.');
      setD(j);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => { void cargar(); }, []);

  if (!d) {
    return (
      <div className="space-y-3">
        <BandaSeccion tono="cielo" icono="📋" seccion="Mi panel" titulo="Tareas y comentarios" ayuda={<Ayuda tema="tareas" />} />
        <p className={error ? 'text-rojo-texto' : 'text-hueso/70'}>{error || 'Cargando…'}</p>
      </div>
    );
  }

  const nombre = (u: string) => d.nombres[u] ?? u;
  const paraTexto = (para: string) => {
    const rol = rolDelDestino(para);
    return rol ? `todos: ${d.roles.find((r) => r.rol === rol)?.nombre ?? rol}` : nombre(para);
  };

  const elegida = d.personas.find((p) => p.usuario === persona);
  const base = elegida ? tareasDePersona(d.tareas, elegida) : d.tareas;
  // Con una persona elegida, los grupos se leen desde ella: lo que le toca y lo que mandó.
  const quien: Cuenta = elegida ? { usuario: elegida.usuario, rol: elegida.rol } : d.yo;
  const abiertas = base.filter(estaAbierta);
  const paraTi = abiertas.filter((t) => leToca(t, quien));
  const mandaste = abiertas.filter((t) => !leToca(t, quien) && laMande(t, quien));
  const delEquipo = d.venTodas && !elegida
    ? abiertas.filter((t) => !leToca(t, quien) && !laMande(t, quien) && !esParaMi(t, quien)) : [];
  // Las que llegaron a su rol y le toca contestar a quien la mandó.
  const esperandoOtro = abiertas.filter((t) => !leToca(t, quien) && !laMande(t, quien) && esParaMi(t, quien));
  const cerradas = base.filter((t) => !estaAbierta(t));

  const tarjetas = (lista: TareaVista[]) => (
    <ul className={LISTA_TARJETAS}>
      {lista.map((t) => (
        <TarjetaTarea key={t.id} t={t} d={d} nombre={nombre} paraTexto={paraTexto} onCambio={cargar} />
      ))}
    </ul>
  );

  return (
    <div className="space-y-3">
      <BandaSeccion tono="cielo" icono="📋" seccion="Mi panel" titulo="Tareas y comentarios" ayuda={<Ayuda tema="tareas" />} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setNueva(true)} className="boton boton-relleno min-h-[44px] px-4">
          📋 Nueva tarea
        </button>
        {d.venTodas && ver === 'tareas' && (
          <div>
            <FiltroConBuscador texto="👤 Por persona…" icono="👤" elegido={persona} nombre={elegida?.nombre}
              cuantos={elegida ? base.length : undefined}
              opciones={d.personas.map((p) => ({ id: p.usuario, nombre: p.nombre,
                detalle: d.roles.find((r) => r.rol === p.rol)?.nombre }))}
              onElegir={setPersona} onSoltar={() => setPersona('')}
              etiqueta="Buscar persona" vacia="No hay cuentas activas." />
          </div>
        )}
        {/* Los botones que cambian de vista, al extremo derecho y con el marco de la vista (regla de coherencia). */}
        <div className="flex gap-2 lg:ml-auto" role="group" aria-label="Qué ver">
          <button type="button" aria-pressed={ver === 'tareas'} onClick={() => cambiarVista('tareas')}
            className={`${BOTON_VISTA} px-3 ${ver === 'tareas' ? '!bg-oro/25' : ''}`}>📋 Tareas</button>
          <button type="button" aria-pressed={ver === 'comentarios'} onClick={() => cambiarVista('comentarios')}
            className={`${BOTON_VISTA} px-3 ${ver === 'comentarios' ? '!bg-oro/25' : ''}`}>
            💬 Comentarios{avisosComentarios > 0 && (
              <span className="ml-1.5 rounded-full bg-rojo-fuerte px-2 text-[13px] text-white">{avisosComentarios}</span>
            )}
          </button>
        </div>
      </div>
      {error && <p className="text-[15px] text-rojo-texto">{error}</p>}

      {/* Los comentarios se montan siempre (escondidos en la vista de tareas) para contar sus avisos. */}
      <div hidden={ver !== 'comentarios'}><ComentariosVista onAvisos={setAvisosComentarios} /></div>
      {ver === 'tareas' && <>

      <Grupo titulo={elegida ? `Le toca a ${elegida.nombre}` : 'Para ti'} icono="👉" tono="cielo"
        lista={paraTi} vacia="No tienes nada pendiente." tarjetas={tarjetas} />
      {esperandoOtro.length > 0 && (
        <Grupo titulo={elegida ? 'A su rol, esperando respuesta' : 'A tu rol, esperando respuesta'} icono="⏳" tono="neutro" lista={esperandoOtro}
          vacia="" tarjetas={tarjetas} />
      )}
      <Grupo titulo={elegida ? `Las que mandó ${elegida.nombre}` : 'Las que mandaste'} icono="📤" tono="neutro" lista={mandaste}
        vacia="No tienes tareas mandadas abiertas." tarjetas={tarjetas} />
      {d.venTodas && !elegida && (
        <Grupo titulo="Del equipo" icono="👥" tono="neutro" lista={delEquipo}
          vacia="Nadie tiene tareas abiertas entre otros." tarjetas={tarjetas} />
      )}

      {cerradas.length > 0 && (
        <details className={`${marcoGrupo()} p-3`}>
          <summary className={`${TITULO_GRUPO} tecla flex min-h-[40px] cursor-pointer items-center gap-2`}>
            ✓ Cerradas · {cerradas.length}
          </summary>
          <div className="mt-2">{tarjetas(cerradas)}</div>
        </details>
      )}

      </>}

      {nueva && (
        <NuevaTarea d={d} onCerrar={() => setNueva(false)}
          onListo={() => { setNueva(false); void cargar(); }} />
      )}
    </div>
  );
}

function Grupo({ titulo, icono, tono, lista, vacia, tarjetas }: {
  titulo: string; icono: string; tono: 'cielo' | 'neutro'; lista: TareaVista[]; vacia: string;
  tarjetas: (l: TareaVista[]) => React.ReactNode;
}) {
  return (
    <section className={`${marcoGrupo(tono)} space-y-2 p-3`}>
      <h2 className={TITULO_GRUPO}>{icono} {titulo} · {lista.length}</h2>
      {lista.length ? tarjetas(lista) : <p className="text-[15px] text-hueso/65">{vacia}</p>}
    </section>
  );
}

const TEXTO_ACCION: Record<AccionTarea, { boton: string; confirmar: string; pide: string; obligatorio: boolean }> = {
  hecha: { boton: '✓ Hecha', confirmar: '✓ Marcar hecha', pide: 'Una nota, si quieres (opcional)', obligatorio: false },
  preguntar: { boton: '❓ Preguntar', confirmar: 'Mandar la pregunta', pide: '¿Qué te falta saber?', obligatorio: true },
  responder: { boton: '↩ Contestar', confirmar: 'Mandar la respuesta', pide: 'Tu respuesta', obligatorio: true },
  anular: { boton: '✕ Anular', confirmar: '✕ Anular la tarea', pide: 'Por qué, si quieres (opcional)', obligatorio: false },
  reabrir: { boton: '↺ Reabrir', confirmar: '↺ Reabrir', pide: 'Qué quedó a medias (opcional)', obligatorio: false }
};

const PALABRA_MENSAJE: Record<string, string> = {
  nota: 'la marcó hecha', pregunta: 'preguntó', respuesta: 'contestó', anulada: 'la anuló', reabierta: 'la reabrió'
};

function TarjetaTarea({ t, d, nombre, paraTexto, onCambio }: {
  t: TareaVista; d: Datos; nombre: (u: string) => string; paraTexto: (p: string) => string; onCambio: () => Promise<void>;
}) {
  const [accion, setAccion] = useState<AccionTarea | ''>('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const atrasada = estaAtrasada(t, d.hoy);
  const abierta = estaAbierta(t);
  const acciones = (['hecha', 'preguntar', 'responder', 'anular', 'reabrir'] as AccionTarea[])
    .filter((a) => puedeHacer(t, d.yo, a));
  const enlace = destinoDelEnlace(t.enlace);

  const mandar = async () => {
    if (!accion) return;
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/tareas', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, accion, texto })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se pudo guardar.');
      setAccion('');
      setTexto('');
      await onCambio();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const estado = t.estado === ESTADO_TAREA.pregunta
    ? <span className="rounded-full border-2 border-ambar-fuerte px-2 text-[13px] font-semibold text-ambar-texto">❓ Pregunta</span>
    : t.estado === ESTADO_TAREA.hecha
      ? <span className="rounded-full border border-verde-fuerte bg-verde/15 px-2 text-[13px] font-semibold text-verde-texto">✓ Hecha</span>
      : t.estado === ESTADO_TAREA.anulada
        ? <span className="rounded-full border border-dashed border-hueso/50 px-2 text-[13px] text-hueso/75">Anulada</span>
        : null;

  return (
    <li className={`${marcoTarjeta(false, atrasada ? 'rojo' : abierta ? 'normal' : 'apagada', atrasada, true)} space-y-2 p-3`}
        data-tarea={t.id}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="whitespace-pre-line text-[16px] font-semibold leading-snug">{t.que}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-hueso/75">
            <span>De <b className="text-hueso">{nombre(t.de)}</b> para <b className="text-hueso">{paraTexto(t.para)}</b></span>
            <span className="text-hueso/65">{cuandoCorto(t.creada)}</span>
            {t.plazo && (
              <span className={`rounded-full px-2 text-[13px] font-semibold ${atrasada
                ? 'border-2 border-rojo-fuerte bg-rojo/10 text-rojo-texto'
                : t.plazo === d.hoy ? 'border-2 border-ambar-fuerte text-ambar-texto' : 'border border-hueso/40'}`}>
                {atrasada ? `Atrasada: era para el ${diaCorto(t.plazo)}` : t.plazo === d.hoy ? 'Para hoy' : `Para el ${diaCorto(t.plazo)}`}
              </span>
            )}
            {estado}
            {enlace && <a href={enlace.href} className="tecla rounded-full border border-cielo/60 px-2 text-[13px] text-cielo-texto underline-offset-2 hover:underline">{enlace.texto}</a>}
          </p>
          {!abierta && t.cerradaPor && (
            <p className="text-[14px] text-hueso/70">
              {t.estado === ESTADO_TAREA.hecha ? 'Hecha' : 'Anulada'} por {nombre(t.cerradaPor)} · {cuandoCorto(t.cerrada)}
            </p>
          )}
        </div>
        {acciones.length > 0 && !accion && (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {acciones.map((a) => (
              <button key={a} type="button" onClick={() => { setAccion(a); setTexto(''); setError(''); }}
                className={`boton min-h-[40px] px-3 ${a === 'hecha' || a === 'responder' ? 'border-verde-fuerte/80' : ''}`}>
                {TEXTO_ACCION[a].boton}
              </button>
            ))}
          </div>
        )}
      </div>

      {t.conversacion.some((m) => m.texto) && (
        <ul className="space-y-1 border-l-[3px] border-hueso/20 pl-3">
          {t.conversacion.filter((m) => m.texto).map((m, i) => (
            <li key={i} className="text-[14px] leading-snug">
              <span className="text-hueso/65">{nombre(m.quien)} {PALABRA_MENSAJE[m.tipo] ?? ''} · {cuandoCorto(m.cuando)}: </span>
              <span>{m.texto}</span>
            </li>
          ))}
        </ul>
      )}

      {accion && (
        <div className="space-y-2 rounded-xl border-2 border-hueso/25 p-2">
          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-hueso/80">{TEXTO_ACCION[accion].pide}</span>
            <textarea autoFocus rows={2} maxLength={LARGO_TAREA} value={texto} onChange={(e) => setTexto(e.target.value)}
              className={CAMPO} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void mandar()}
              disabled={enviando || (TEXTO_ACCION[accion].obligatorio && !texto.trim())}
              className="boton min-h-[44px] border-oro px-4 font-semibold">
              {enviando ? 'Guardando…' : TEXTO_ACCION[accion].confirmar}
            </button>
            <button type="button" onClick={() => setAccion('')} className="boton min-h-[44px] px-3">Cancelar</button>
            <span className="text-[14px] text-hueso/70">
              {accion === 'preguntar' ? `Le llega a ${nombre(t.de)}.`
                : accion === 'responder' || accion === 'reabrir' ? 'Vuelve a quedar pendiente.'
                  : accion === 'hecha' ? `${nombre(t.de)} la ve hecha.` : 'Se cierra para todos.'}
            </span>
          </div>
        </div>
      )}
      {error && <p className="text-[14px] text-rojo-texto">{error}</p>}
    </li>
  );
}

function NuevaTarea({ d, onCerrar, onListo }: { d: Datos; onCerrar: () => void; onListo: () => void }) {
  const [para, setPara] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [que, setQue] = useState('');
  const [plazo, setPlazo] = useState('');
  const [dia, setDia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const rol = rolDelDestino(para);
  const persona = d.personas.find((p) => p.usuario === para);
  const aQuien = rol ? `todos los de ${d.roles.find((r) => r.rol === rol)?.nombre ?? rol}` : persona?.nombre ?? '';
  const BOTON_PARA = 'tecla flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 text-left text-[15px]';

  const mandar = async () => {
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/tareas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para, que, plazo, enlace: dia ? `dia:${dia}` : '' })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se pudo mandar.');
      onListo();
    } catch (e) {
      setError((e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <Dialogo titulo="📋 Nueva tarea" onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-3" data-ficha>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
          <span className={`${ROTULO} sm:pt-2.5`}>Para</span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="relative">
              <button type="button" onClick={() => setBuscando((b) => !b)}
                className={`${BOTON_PARA} w-full sm:w-auto ${persona ? 'border-oro bg-oro/15 font-bold' : 'border-hueso/25 bg-panel hover:border-oro/60'}`}>
                👤 {persona ? persona.nombre : 'Una persona…'}
              </button>
              {buscando && (
                <div className="absolute left-0 z-20 mt-1 w-full max-w-[22rem] rounded-xl border-2 border-oro/60 bg-panel p-2 shadow-lg">
                  <BuscarEnLista etiqueta="Buscar persona" vacia="No hay cuentas activas."
                    opciones={d.personas.map((p) => ({ id: p.usuario, nombre: p.nombre,
                      detalle: d.roles.find((r) => r.rol === p.rol)?.nombre }))}
                    elegido={persona?.usuario} onElegir={(id) => { setPara(id); setBuscando(false); }}
                    onCerrar={() => setBuscando(false)} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="O a un rol entero">
              <span className="text-[14px] text-hueso/70">o a todos los</span>
              {d.roles.map((r) => {
                const elegido = rol === r.rol;
                return (
                  <button key={r.rol} type="button" role="radio" aria-checked={elegido}
                    onClick={() => setPara(elegido ? '' : `rol:${r.rol}`)}
                    className={`${BOTON_PARA} min-h-[40px] ${elegido ? 'border-oro bg-oro/15 font-bold' : 'border-hueso/25 bg-panel hover:border-oro/60'}`}>
                    {r.nombre} <span className="text-[13px] text-hueso/65">{r.cuantos}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
          <span className={`${ROTULO} sm:pt-2.5`}>Qué hacer</span>
          <textarea rows={3} maxLength={LARGO_TAREA} value={que} onChange={(e) => setQue(e.target.value)}
            placeholder="Por ejemplo: llamar a la Constructora Maipo para confirmar los invitados"
            className={CAMPO} />
        </label>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className={ROTULO}>Para cuándo</span>
          <ElegirFecha valor={plazo} onCambio={setPlazo} hoy={d.hoy} etiqueta="Para cuándo" sinFecha="Sin plazo" />
        </div>

        <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className={ROTULO}>Con qué día</span>
          <span className="flex flex-wrap items-center gap-2">
            <input type="date" value={dia} onChange={(e) => setDia(e.target.value)}
              className={`${CAMPO} w-auto`} aria-label="Con qué día tiene que ver (opcional)" />
            <span className="text-[14px] text-hueso/65">opcional: la tarea lleva al día</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2 border-t-2 border-hueso/15 pt-3 sm:pl-[8rem]">
          <button type="button" onClick={() => void mandar()} disabled={enviando || !para || !que.trim()}
            className="boton boton-relleno min-h-[44px] px-4">
            {enviando ? 'Mandando…' : 'Mandar tarea'}
          </button>
          <span className="text-[14px] text-hueso/70">
            {aQuien ? `Le llega a ${aQuien}, en su panel.` : 'Elige a quién se la mandas.'}
          </span>
        </div>
        {error && <p className="text-[15px] text-rojo-texto">{error}</p>}
      </div>
    </Dialogo>
  );
}
