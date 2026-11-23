'use client';

/**
 * **Las notas de una cotización y su próximo contacto** (2026-11-23, lo
 * pidió el cliente: *"diariamente las notas se ingresan en un formulario
 * intuitivo y luego se ordena automáticamente por fecha… y luego poder
 * elegir en qué fecha recontactar al cliente"*). Ver `lib/notas.ts` y
 * `lib/agenda.ts`.
 *
 * - **Arriba, el formulario**: por qué medio, qué conversaron y cuándo
 *   volver a contactarlo (`ElegirFecha`). Se anota con *Anotar*, como un
 *   mensaje: una nota es algo que pasó, no un campo que se va editando. Lo
 *   escrito y sin anotar se guarda en este navegador y vuelve si se cierra
 *   la ventana.
 * - **Abajo, el historial** (`HistorialNotas`), ordenado solo por día, el
 *   más nuevo primero. Es la misma pieza en la ficha del cliente.
 *
 * Lo ven su vendedor y la gerencia: quien la abre ya pasó por
 * `puedeVerNotas()`, y el servidor lo vuelve a mirar.
 */
import { useEffect, useState } from 'react';
import Dialogo from './Dialogo';
import AyudaCorta from './AyudaCorta';
import ElegirFecha from './ElegirFecha';
import FechaDia from './FechaDia';
import { avisar } from './AvisoFlotante';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { MEDIOS, iconoDeMedio, notasPorDia, sePuedeCorregir, LARGO_NOTA, type Nota } from '@/lib/notas';
import { esFecha, sumarDias, type Fecha } from '@/lib/fechas';
import type { Presupuesto } from '@/lib/presupuestos';

const ENTRADA = 'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none';

/** Lo escrito sin anotar, en este navegador: si falla, no pasa nada. */
const BORRADOR = (grupo: string) => `blp-nota-${grupo}`;
function leerBorrador(grupo: string): string {
  try { return localStorage.getItem(BORRADOR(grupo)) ?? ''; } catch { return ''; }
}
function guardarBorrador(grupo: string, texto: string) {
  try {
    if (texto) localStorage.setItem(BORRADOR(grupo), texto); else localStorage.removeItem(BORRADOR(grupo));
  } catch { /* sin almacenamiento: da igual */ }
}

export default function NotasCotizacion({ p, grupo, notas, hoy, usuario, onCambio, onCerrar, onAnotado }: {
  /** La cotización del grupo desde donde se abrió. */
  p: Presupuesto;
  grupo: string;
  /** Las notas que esta cuenta puede leer (de todas sus cotizaciones). */
  notas: Nota[];
  hoy: Fecha;
  usuario: string;
  onCambio: () => void;
  onCerrar: () => void;
  /** El próximo contacto como quedó, para quien abrió la ventana. */
  onAnotado?: (recontactar: string) => void;
}) {
  const delGrupo = notas.filter((n) => n.presupuesto === grupo);
  // El día elegido se ofrece si todavía viene; uno que ya llegó, no: si
  // anotas, ya hablaste con él.
  const actual = esFecha(p.recontactar) && p.recontactar! > hoy ? p.recontactar! : '';
  const [texto, setTexto] = useState('');
  const [medio, setMedio] = useState('');
  const [proximo, setProximo] = useState(actual);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setTexto(leerBorrador(grupo)); }, [grupo]);

  /** El último día que se puede elegir: el día antes del evento, si hay. */
  const hasta = esFecha(p.fecha) && p.fecha > hoy ? sumarDias(p.fecha, -1) : undefined;
  const cambiaFecha = proximo !== (p.recontactar ?? '');
  const puede = !!texto.trim() || cambiaFecha;

  async function anotar() {
    setEnviando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/notas', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, nota: texto.trim(), medio, recontactar: proximo })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) return setError(d.error || 'No se pudo anotar.');
      guardarBorrador(grupo, '');
      setTexto(''); setMedio('');
      onAnotado?.(String(d.recontactar ?? proximo));
      avisar(texto.trim() ? `Anotado${proximo ? ' · lo vuelves a contactar en la agenda' : ''}` : 'Cambió el próximo contacto');
      onCambio();
      onCerrar();
    } finally { setEnviando(false); }
  }

  return (
    // **En el computador, dos columnas** (2026-11-23): a la izquierda anotar,
    // a la derecha lo ya conversado. En una sola columna no cabía en
    // 1280×650 con dos notas. En el celular, una debajo de la otra.
    <Dialogo titulo={`Notas · ${p.cliente || 'Sin cliente'}`} onCerrar={onCerrar} ancho="max-w-2xl lg:max-w-5xl">
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      <div>
      <div className={`mt-2 ${marcoGrupo('rosa')} p-3`}>
        <p className={`mb-2 flex items-center gap-2 ${TITULO_GRUPO}`}>
          <span aria-hidden>🗒</span>Anotar <AyudaCorta tema="notas" />
        </p>
        {/* Los nombres arriba de su campo, todos en la misma vertical: en la
            columna de la ventana no hay ancho para tenerlos al lado. */}
        <div className="space-y-3">
          <div>
            <p className="rotulo-ficha mb-1">Medio</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Por dónde hablaron">
              {MEDIOS.map((m) => (
                <button key={m.clave} type="button" aria-pressed={medio === m.clave}
                  onClick={() => setMedio(medio === m.clave ? '' : m.clave)}
                  className={`boton min-h-[40px] px-3 !text-[14px] lg:min-h-[36px] ${medio === m.clave ? 'border-oro bg-oro/15 !font-semibold' : ''}`}>
                  <span aria-hidden>{m.icono}</span> {m.clave}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="rotulo-ficha mb-1 block">Qué conversaron</span>
            <textarea value={texto} rows={3} maxLength={LARGO_NOTA} className={ENTRADA}
              placeholder="Lo que te dijo, lo que quedaron en hacer"
              onChange={(e) => { setTexto(e.target.value); guardarBorrador(grupo, e.target.value); }} />
          </label>
          <div>
            <p className="rotulo-ficha mb-1">Volver a contactarlo</p>
            <ElegirFecha valor={proximo} onCambio={setProximo} hoy={hoy} hasta={hasta}
              etiqueta="Volver a contactarlo" />
          </div>
        </div>
      </div>
      {error && <p className="mt-3 text-[15px] text-rojo-texto" role="alert">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <button type="button" className="boton min-h-[44px]" onClick={onCerrar}>Cerrar</button>
        <button type="button" className="boton boton-relleno min-h-[44px] px-5" disabled={!puede || enviando}
          onClick={() => void anotar()}>
          {enviando ? 'Anotando…' : texto.trim() ? 'Anotar' : 'Guardar el día'}
        </button>
      </div>

      </div>
      <div className="mt-4 lg:mt-2">
        <p className={`mb-2 ${TITULO_GRUPO}`}>Lo conversado · {delGrupo.length}</p>
        <HistorialNotas notas={delGrupo} hoy={hoy} usuario={usuario} onCambio={onCambio} />
      </div>
      </div>
    </Dialogo>
  );
}

/**
 * **El historial de notas, por día**, el más nuevo primero. Cada nota con su
 * hora, el medio y quién la escribió; su autor la corrige el mismo día.
 * La misma pieza en la ventana de notas y en la ficha del cliente.
 */
export function HistorialNotas({ notas, hoy, usuario, onCambio, vacio = 'Todavía no hay notas.' }: {
  notas: Nota[]; hoy: Fecha; usuario: string; onCambio: () => void; vacio?: string;
}) {
  const [corrigiendo, setCorrigiendo] = useState<{ id: string; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  if (!notas.length) return <p className="text-[14px] text-hueso/60">{vacio}</p>;

  async function guardar() {
    if (!corrigiendo) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos/notas', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: corrigiendo.id, nota: corrigiendo.texto })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) return avisar(d.error || 'No se pudo corregir.', 'atencion');
      setCorrigiendo(null);
      avisar('Nota corregida');
      onCambio();
    } finally { setGuardando(false); }
  }

  return (
    <ol className="space-y-3" aria-label="Las notas, la más nueva primero">
      {notasPorDia(notas).map(([dia, lista]) => (
        <li key={dia || 'sin-dia'}>
          <p className="mb-1.5 border-b border-hueso/10 pb-1">
            {dia ? <FechaDia fecha={dia} tamano="aviso" conAno /> : <span className="text-[13px] text-hueso/60">Sin fecha</span>}
          </p>
          <ul className="space-y-2">
            {lista.map((n) => (
              <li key={n.id} className="rounded-lg border border-hueso/15 bg-panel px-3 py-2">
                <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-hueso/65">
                  <span aria-hidden>{iconoDeMedio(n.medio)}</span>
                  <span className="tabular-nums">{n.cuando.slice(11, 16)}</span>
                  {n.medio && <span>{n.medio}</span>}
                  <span>· <b className="text-hueso/85">{n.quien || '—'}</b></span>
                  <span className="flex-1" />
                  {sePuedeCorregir(n, usuario, hoy) && corrigiendo?.id !== n.id && (
                    <button type="button" className="boton min-h-[36px] !text-[13px]"
                      onClick={() => setCorrigiendo({ id: n.id, texto: n.nota })}>✎ Corregir</button>
                  )}
                </p>
                {corrigiendo?.id === n.id ? (
                  <div className="mt-1.5">
                    <textarea value={corrigiendo.texto} rows={3} maxLength={LARGO_NOTA} className={ENTRADA}
                      aria-label="Corregir la nota"
                      onChange={(e) => setCorrigiendo({ id: n.id, texto: e.target.value })} />
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" className="boton min-h-[40px]" onClick={() => setCorrigiendo(null)}>Cancelar</button>
                      <button type="button" className="boton boton-relleno min-h-[40px]"
                        disabled={!corrigiendo.texto.trim() || guardando} onClick={() => void guardar()}>
                        {guardando ? 'Guardando…' : 'Guardar la corrección'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px]">{n.nota}</p>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
