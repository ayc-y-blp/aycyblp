'use client';

/**
 * **Reenganchar un nombre suelto** (2026-11-24, lo pidió el cliente: *"en
 * equipo sale correcto con Christopher Acevedo pero en los turnos me aparece
 * como Christipher Acevedo"*).
 *
 * Un nombre suelto está en lo guardado —turnos, días de un colaborador— y no
 * en la lista: se corrigió directo en la planilla, o se cambió antes de que
 * cambiar un nombre arrastrara lo guardado. ***Es…*** (o ***Pasar a…*** para
 * un puesto) abre esta ventana: se elige de la lista a quién corresponde y lo
 * guardado pasa a ese nombre (`/api/equipo/renombrar`, `lib/renombrar.ts`).
 *
 * La misma pieza en Equipo (personas y puestos) y en Extras (colaboradores).
 * Las personas se eligen con el buscador (una lista que crece); los puestos,
 * con un botón cada uno (son pocos y fijos).
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import BuscarEnLista, { type OpcionLista } from './BuscarEnLista';
import FechaDia from './FechaDia';
import { avisar } from './AvisoFlotante';
import { TITULO_GRUPO, marcoGrupo } from './TarjetaLista';
import type { QueSeRenombra } from '@/lib/renombrar';

const PALABRA: Record<QueSeRenombra, [string, string]> = {
  trabajador: ['turno', 'turnos'], puesto: ['turno', 'turnos'], colaborador: ['día', 'días']
};

export const cuantos = (tipo: QueSeRenombra, n: number) => `${n} ${PALABRA[tipo][n === 1 ? 0 : 1]}`;

export default function ReengancharSuelto({ tipo, de, veces, opciones, onListo }: {
  tipo: QueSeRenombra;
  /** El nombre suelto, como está escrito en lo guardado. */
  de: string;
  /** Cuántos turnos o días lo tienen. */
  veces: number;
  /** A quién se puede pasar: la lista de fichas o de puestos. */
  opciones: OpcionLista[];
  /** Después de pasar: para volver a leer la pantalla. */
  onListo: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [a, setA] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  /** Los días en que quedó dos veces: se muestran antes de cerrar. */
  const [repetidos, setRepetidos] = useState<string[] | null>(null);
  const elegido = opciones.find((o) => o.id === a);
  const esPuesto = tipo === 'puesto';
  /** *Su turno* / *Sus 6 turnos*. */
  const sus = veces === 1 ? `Su ${PALABRA[tipo][0]}` : `Sus ${cuantos(tipo, veces)}`;

  const cerrar = () => {
    setAbierto(false); setA(''); setError('');
    if (repetidos) { setRepetidos(null); onListo(); }
  };

  async function pasar() {
    if (!elegido) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/equipo/renombrar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo, de, a: elegido.nombre })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) return setError(d.error || 'No se pudo pasar.');
      avisar(`${de} → ${d.a}${d.frase ? `: pasaron ${d.frase}` : ''}`);
      if (d.repetidos?.length) { setRepetidos(d.repetidos); return; }
      setAbierto(false); setA('');
      onListo();
    } catch (e) { setError(String(e)); }
    finally { setGuardando(false); }
  }

  return (
    <>
      <button type="button" className="boton min-h-[40px] lg:min-h-[36px]"
        onClick={() => { setAbierto(true); setError(''); }}>
        {esPuesto ? 'Pasar a…' : 'Es…'}
      </button>
      {abierto && (
        <Dialogo titulo={esPuesto ? `Los turnos de ${de}` : `¿Quién es ${de}?`} onCerrar={cerrar}>
          {repetidos ? (
            <div className={`${marcoGrupo('ambar')} p-3`} role="status">
              <p className={`mb-2 ${TITULO_GRUPO}`}>{elegido?.nombre ?? 'Quedó'} quedó dos veces estos días</p>
              <ul className="flex flex-wrap gap-2">
                {repetidos.map((f) => (
                  <li key={f}>
                    <a href={`/dia/${f}`} className="boton min-h-[40px]"><FechaDia fecha={f} tamano="aviso" conMes /></a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[14px] text-hueso/80">Ya tenía su ficha ese día. Sácalo de uno en la ventana del equipo del día.</p>
            </div>
          ) : (
            <div className={`${marcoGrupo()} p-3`}>
              <p className={`mb-2 ${TITULO_GRUPO}`}>{esPuesto ? 'Pasan al puesto' : 'Es la ficha de'}</p>
              {elegido ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border-2 border-oro bg-oro/15 px-3 py-2 text-[15px] font-semibold">✓ {elegido.nombre}</span>
                  <button type="button" className="boton min-h-[44px]" onClick={() => setA('')}>Elegir otro</button>
                </div>
              ) : esPuesto ? (
                <div className="flex flex-wrap gap-2">
                  {opciones.map((o) => (
                    <button key={o.id} type="button" className="boton min-h-[44px]" onClick={() => setA(o.id)}>{o.nombre}</button>
                  ))}
                </div>
              ) : (
                <BuscarEnLista etiqueta={tipo === 'colaborador' ? 'Buscar colaborador' : 'Buscar trabajador'}
                  vacia="No hay nadie en la lista." opciones={opciones} onElegir={setA} onCerrar={() => undefined} />
              )}
              {elegido && (
                <p className="mt-3 text-[15px]" role="status">
                  {tipo === 'puesto' && <>{sus} y las fichas que lo tienen de puesto habitual pasan a <strong>{elegido.nombre}</strong>.</>}
                  {tipo === 'trabajador' && <>{sus}, y sus pagos, boletas y ajustes si los tiene, pasan a <strong>{elegido.nombre}</strong>.</>}
                  {tipo === 'colaborador' && <>{sus}, y sus pagos y boletas si los tiene, pasan a <strong>{elegido.nombre}</strong>.</>}
                  {' '}{de} deja de aparecer suelto.
                </p>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-[14px] text-rojo-texto" role="alert">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {repetidos ? (
              <button type="button" className="boton boton-relleno min-h-[44px]" onClick={cerrar}>Listo</button>
            ) : (
              <>
                <button type="button" className="boton min-h-[44px]" onClick={cerrar}>Cancelar</button>
                <button type="button" className="boton boton-relleno min-h-[44px]" disabled={!elegido || guardando} onClick={pasar}>
                  {guardando ? 'Pasando…' : elegido ? `Pasar a ${elegido.nombre}` : 'Pasar'}
                </button>
              </>
            )}
          </div>
        </Dialogo>
      )}
    </>
  );
}
