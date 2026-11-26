'use client';

/**
 * **Los comentarios del equipo, dentro del panel** (2026-11-26, lo decidió el
 * cliente: *"hagámoslo"*). Es la segunda vista de *Tareas* (`?ver=comentarios`).
 * Lógica en `lib/comentarios.ts`, ruta `/api/comentarios`.
 *
 * - **La gerencia general y el administrador** ven todos, en grupos con su
 *   marco: ***🆕 Nuevos***, ***⏳ En curso*** y ***✓ Cerrados*** (resueltos y
 *   los que no se harán), plegado. Cada uno se contesta (*↩ Contestar*, y queda
 *   resuelto o sigue en curso), se le pone estado y prioridad, y se pasa a una
 *   tarea (*📋 Pasar a tarea*) con su texto.
 * - **Los demás** ven ***Tus comentarios***: lo que mandaron, cómo va y la
 *   respuesta, con *✓ Entendido*, que apaga el aviso de la portada.
 */
import { useEffect, useState } from 'react';
import ElegirFecha from './ElegirFecha';
import BuscarEnLista from './BuscarEnLista';
import { marcoGrupo, marcoTarjeta, TITULO_GRUPO, LISTA_TARJETAS } from './TarjetaLista';
import { ESTADOS_COMENTARIO, PRIORIDADES, respuestaSinVer, type ComentarioGuardado } from '@/lib/comentarios';
import { NOMBRE_ROL } from '@/lib/roles';
import type { Fecha } from '@/lib/fechas';

type Comentario = Omit<ComentarioGuardado, 'fila'>;
interface Persona { usuario: string; nombre: string; rol: string }
interface Datos { comentarios: Comentario[]; todos: boolean; yo: string; hoy: Fecha; personas: Persona[] }

const CAMPO = 'min-h-[44px] w-full min-w-0 rounded-xl border-2 border-hueso/25 bg-tinta px-3 py-2 text-[16px]';
const CHIP = 'tecla min-h-[36px] rounded-full border-2 px-3 text-[14px]';

/** `2026-11-26 14:05` → `jue 26 nov · 14:05`. */
function cuando(c: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(c)) return c;
  const d = new Date(`${c.slice(0, 10)}T12:00:00`);
  const dia = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  return c.length > 10 ? `${dia} · ${c.slice(11, 16)}` : dia;
}

export default function ComentariosVista({ onAvisos }: { onAvisos?: (n: number) => void }) {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const r = await fetch('/api/comentarios');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudieron leer los comentarios.');
      setD(j);
      setError('');
      onAvisos?.(j.todos ? j.comentarios.filter((c: Comentario) => c.estado === 'Nuevo').length
        : j.comentarios.filter(respuestaSinVer).length);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => { void cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <p className={error ? 'text-rojo-texto' : 'text-hueso/70'}>{error || 'Cargando…'}</p>;

  const tarjetas = (lista: Comentario[]) => (
    <ul className={LISTA_TARJETAS}>
      {lista.map((c) => <TarjetaComentario key={c.id} c={c} d={d} onCambio={cargar} />)}
    </ul>
  );

  if (!d.todos) {
    return (
      <section className={`${marcoGrupo('cielo')} space-y-2 p-3`}>
        <h2 className={TITULO_GRUPO}>💬 Tus comentarios · {d.comentarios.length}</h2>
        {d.comentarios.length ? tarjetas(d.comentarios)
          : <p className="text-[15px] text-hueso/65">Todavía no mandas ninguno. Se mandan con 💬 Coméntame, arriba.</p>}
      </section>
    );
  }

  const nuevos = d.comentarios.filter((c) => c.estado === 'Nuevo');
  const enCurso = d.comentarios.filter((c) => c.estado === 'En curso');
  const cerrados = d.comentarios.filter((c) => c.estado !== 'Nuevo' && c.estado !== 'En curso');
  return (
    <div className="space-y-3">
      {error && <p className="text-[15px] text-rojo-texto">{error}</p>}
      <section className={`${marcoGrupo('cielo')} space-y-2 p-3`}>
        <h2 className={TITULO_GRUPO}>🆕 Nuevos · {nuevos.length}</h2>
        {nuevos.length ? tarjetas(nuevos) : <p className="text-[15px] text-hueso/65">No hay comentarios nuevos.</p>}
      </section>
      <section className={`${marcoGrupo()} space-y-2 p-3`}>
        <h2 className={TITULO_GRUPO}>⏳ En curso · {enCurso.length}</h2>
        {enCurso.length ? tarjetas(enCurso) : <p className="text-[15px] text-hueso/65">Nada en curso.</p>}
      </section>
      {cerrados.length > 0 && (
        <details className={`${marcoGrupo()} p-3`}>
          <summary className={`${TITULO_GRUPO} tecla flex min-h-[40px] cursor-pointer items-center gap-2`}>
            ✓ Cerrados · {cerrados.length}
          </summary>
          <div className="mt-2">{tarjetas(cerrados)}</div>
        </details>
      )}
    </div>
  );
}

function TarjetaComentario({ c, d, onCambio }: { c: Comentario; d: Datos; onCambio: () => Promise<void> }) {
  const [abierto, setAbierto] = useState<'' | 'contestar' | 'tarea'>('');
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [plazo, setPlazo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const persona = d.personas.find((p) => p.usuario === para);
  const aMi = !!para && para === d.yo;

  const mandar = async (cuerpo: Record<string, unknown>) => {
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/comentarios', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, ...cuerpo })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se pudo guardar.');
      setAbierto('');
      setTexto('');
      await onCambio();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const sinVer = !d.todos && respuestaSinVer(c);
  const cerrado = c.estado === 'Resuelto' || c.estado === 'No se hará';

  return (
    <li className={`${marcoTarjeta(false, sinVer ? 'verde' : cerrado ? 'apagada' : 'normal', sinVer, true)} space-y-2 p-3`}
        data-comentario={c.id}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-hueso/40 px-2 text-[13px] font-semibold">{c.tipo || '💬'}</span>
            {c.prioridad && (
              <span className={`rounded-full px-2 text-[13px] font-semibold ${c.prioridad === 'Alta'
                ? 'border-2 border-rojo-fuerte text-rojo-texto' : 'border border-hueso/40'}`}>Prioridad {c.prioridad.toLowerCase()}</span>
            )}
            {!d.todos && (
              <span className="rounded-full border border-hueso/40 px-2 text-[13px]">{c.estado}</span>
            )}
          </p>
          <p className="whitespace-pre-line text-[16px] font-semibold leading-snug">{c.texto}</p>
          {c.para && <p className="text-[15px]"><span className="text-hueso/65">Para qué: </span>{c.para}</p>}
          <p className="text-[14px] text-hueso/70">
            {d.todos && <><b className="text-hueso">{c.nombre}</b> · {c.rol} · </>}
            {c.donde && <>en {c.donde} · </>}{cuando(c.fecha)}
            {c.tarea && <> · 📋 pasado a tarea</>}
          </p>
        </div>
        {d.todos && !abierto && (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button type="button" onClick={() => { setAbierto('contestar'); setTexto(c.respuesta); }}
              className="boton min-h-[40px] border-verde-fuerte/80 px-3">↩ {c.respuesta ? 'Cambiar respuesta' : 'Contestar'}</button>
            {!c.tarea && (
              <button type="button" onClick={() => { setAbierto('tarea'); setTexto(''); }}
                className="boton min-h-[40px] px-3">📋 Pasar a tarea</button>
            )}
          </div>
        )}
      </div>

      {c.respuesta && (
        <div className="border-l-[3px] border-verde-fuerte/60 pl-3 text-[15px]">
          <span className="text-hueso/65">{c.respondidoPor ? `${c.respondidoPor} contestó` : 'Respuesta'}
            {c.resuelto ? ` · ${cuando(c.resuelto)}` : ''}: </span>
          {c.respuesta}
        </div>
      )}
      {sinVer && (
        <button type="button" onClick={() => void mandar({ accion: 'visto' })} disabled={enviando}
          className="boton min-h-[40px] px-3">✓ Entendido</button>
      )}

      {d.todos && (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Estado">
            <span className="w-[5.5rem] text-[14px] font-semibold text-hueso/75">Estado</span>
            {ESTADOS_COMENTARIO.map((e) => (
              <button key={e} type="button" disabled={enviando} aria-pressed={c.estado === e}
                onClick={() => c.estado !== e && void mandar({ accion: 'estado', estado: e })}
                className={`${CHIP} ${c.estado === e ? 'border-oro bg-oro/15 font-bold' : 'border-hueso/25'}`}>{e}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Prioridad">
            <span className="w-[5.5rem] text-[14px] font-semibold text-hueso/75 lg:w-auto">Prioridad</span>
            {PRIORIDADES.map((p) => (
              <button key={p} type="button" disabled={enviando} aria-pressed={c.prioridad === p}
                onClick={() => void mandar({ accion: 'prioridad', prioridad: c.prioridad === p ? '' : p })}
                className={`${CHIP} ${c.prioridad === p ? 'border-oro bg-oro/15 font-bold' : 'border-hueso/25'}`}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {abierto === 'contestar' && (
        <div className="space-y-2 rounded-xl border-2 border-hueso/25 p-2">
          <label className="block">
            <span className="mb-1 block text-[14px] font-semibold text-hueso/80">Tu respuesta: le llega a {c.nombre} en su panel</span>
            <textarea autoFocus rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} className={CAMPO} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={enviando || !texto.trim()}
              onClick={() => void mandar({ accion: 'responder', texto, estado: 'Resuelto' })}
              className="boton min-h-[44px] border-oro px-4 font-semibold">✓ Contestar y resolver</button>
            <button type="button" disabled={enviando || !texto.trim()}
              onClick={() => void mandar({ accion: 'responder', texto, estado: 'En curso' })}
              className="boton min-h-[44px] px-3">Contestar, sigue en curso</button>
            <button type="button" onClick={() => setAbierto('')} className="boton min-h-[44px] px-3">Cancelar</button>
          </div>
        </div>
      )}

      {abierto === 'tarea' && (
        <div className="space-y-2 rounded-xl border-2 border-hueso/25 p-2" data-ficha>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="w-[7.5rem] shrink-0 text-[15px] font-semibold text-hueso/80">Para</span>
            <div className="relative flex flex-wrap gap-2">
              <button type="button" aria-pressed={aMi} onClick={() => setPara(aMi ? '' : d.yo)}
                className={`tecla flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 text-[15px] ${aMi
                  ? 'border-oro bg-oro/15 font-bold' : 'border-hueso/25 bg-panel hover:border-oro/60'}`}>
                📌 A mí
              </button>
              <button type="button" onClick={() => setBuscando((b) => !b)}
                className={`tecla flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 text-[15px] ${persona && !aMi
                  ? 'border-oro bg-oro/15 font-bold' : 'border-hueso/25 bg-panel hover:border-oro/60'}`}>
                👤 {persona && !aMi ? persona.nombre : 'Otra persona…'}
              </button>
              {buscando && (
                <div className="absolute left-0 z-20 mt-1 w-[22rem] max-w-[80vw] rounded-xl border-2 border-oro/60 bg-panel p-2 shadow-lg">
                  <BuscarEnLista etiqueta="Buscar persona" vacia="No hay cuentas activas."
                    opciones={d.personas.map((p) => ({ id: p.usuario, nombre: p.nombre, detalle: NOMBRE_ROL[p.rol] ?? p.rol }))}
                    elegido={para} onElegir={(id) => { setPara(id); setBuscando(false); }} onCerrar={() => setBuscando(false)} />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="w-[7.5rem] shrink-0 text-[15px] font-semibold text-hueso/80">Para cuándo</span>
            <ElegirFecha valor={plazo} onCambio={setPlazo} hoy={d.hoy} etiqueta="Para cuándo" sinFecha="Sin plazo" />
          </div>
          <label className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
            <span className="w-[7.5rem] shrink-0 text-[15px] font-semibold text-hueso/80 sm:pt-2.5">Qué hacer</span>
            <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={c.texto} className={CAMPO} aria-label="Qué hacer (en blanco, el texto del comentario)" />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:pl-[8rem]">
            <button type="button" disabled={enviando || !para}
              onClick={() => void mandar({ accion: 'tarea', para, plazo, texto })}
              className="boton min-h-[44px] border-oro px-4 font-semibold">📋 Mandar la tarea</button>
            <button type="button" onClick={() => setAbierto('')} className="boton min-h-[44px] px-3">Cancelar</button>
            <span className="text-[14px] text-hueso/70">El comentario pasa a <i>En curso</i>.</span>
          </div>
        </div>
      )}
      {error && <p className="text-[14px] text-rojo-texto">{error}</p>}
    </li>
  );
}
