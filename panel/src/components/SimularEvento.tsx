'use client';

/**
 * **El simulador de evento, en la cotización** (2026-11-23, Fase 5). Lo
 * pidió el cliente: *"crear un simulador, me tinca"*. La cuenta vive en
 * `lib/simulador.ts` y la hace el servidor (`/api/simulador`), que es quien
 * sabe los costos: acá solo se muestra lo que manda.
 *
 * Un botón secundario —*🧮 Simular*— en el paso de los productos. Abre una
 * ventana con lo que se cobra, lo que cuesta y lo que queda, grupo por grupo,
 * y *¿Y si vienen…?* con − y + para mover los invitados.
 *
 * **Quien no ve los costos ve solo la señal** —conviene, justo, no conviene—:
 * el servidor no le manda ningún número. Lo decidió el cliente.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import Azulejo from './Azulejo';
import AyudaCorta from './AyudaCorta';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { SENAL, type Simulacion, type Senal } from '@/lib/simulador';

const enPesos = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-CL');

/** La señal, por forma y por palabra además del color. */
const SENALES: Record<Senal, { icono: string; palabra: string; frase: string; clase: string }> = {
  [SENAL.conviene]: { icono: '✓', palabra: 'Conviene', frase: 'Deja el margen que se busca.', clase: 'border-verde-fuerte bg-verde/10 text-verde-texto' },
  [SENAL.justo]: { icono: '≈', palabra: 'Justo', frase: 'Deja plata, pero menos que el margen que se busca.', clase: 'border-ambar-fuerte bg-ambar/10 text-ambar-texto' },
  [SENAL.noConviene]: { icono: '✕', palabra: 'No conviene', frase: 'Con estos precios deja muy poco, o se pierde.', clase: 'border-rojo-fuerte bg-rojo/10 text-rojo-texto' },
  [SENAL.sinDatos]: { icono: '?', palabra: 'Faltan datos', frase: 'Todavía no se puede decir: falta cargar algún costo.', clase: 'border-hueso/40 bg-hueso/[0.04] text-hueso' }
};

type Linea = { concepto: string; cantidad: number; precio: number; descuento?: number; ivaIncluido?: boolean };
type Respuesta = (Simulacion & { veCostos: true }) | { senal: Senal; veCostos: false };

export default function SimularEvento({ lineas, descuentoTotal, invitados }: {
  lineas: Linea[]; descuentoTotal: number; invitados: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [r, setR] = useState<Respuesta | null>(null);
  const [gente, setGente] = useState(invitados);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  /** Con otra cantidad de gente, las líneas por persona se mueven con ella. */
  async function simular(n: number) {
    setCargando(true); setError(''); setGente(n);
    try {
      const res = await fetch('/api/simulador', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invitados: n, descuentoTotal,
          lineas: lineas.map((l) => ({ ...l, cantidad: invitados > 0 && l.cantidad === invitados ? n : l.cantidad }))
        })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) return setError(d.error || 'No se pudo simular.');
      setR(d);
    } catch (e) { setError(String(e)); }
    finally { setCargando(false); }
  }

  const s = r ? SENALES[r.senal] : null;
  const pastilla = s && (
    <span className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-[16px] font-bold ${s.clase}`} role="status">
      <span aria-hidden className="text-[20px] leading-none">{s.icono}</span>{s.palabra}
    </span>
  );

  return (
    <>
      <button type="button" className="boton min-h-[40px]" disabled={lineas.length === 0}
        onClick={() => { setAbierto(true); void simular(invitados); }}>
        🧮 Simular
      </button>
      {abierto && (
        <Dialogo titulo="Simulador del evento" ancho={r?.veCostos ? 'max-w-2xl lg:max-w-5xl' : 'max-w-lg'}
          onCerrar={() => setAbierto(false)} alLado={<AyudaCorta tema="simulador" />}>
          {!r && !error && <p className="mt-3 text-[15px] text-hueso/70">Calculando…</p>}
          {error && <p className="mt-3 text-[14px] text-rojo-texto" role="alert">{error}</p>}

          {r && !r.veCostos && s && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {pastilla}<p className="text-[15px]">{s.frase}</p>
            </div>
          )}

          {r && r.veCostos && s && (
            <div className={cargando ? 'opacity-60' : ''}>
              {/* En el celular, los tres números van como una cuenta: en
                  azulejos lado a lado no caben siete cifras a su tamaño. */}
              <div className="mt-3 lg:hidden">
                <dl className="space-y-1 text-[16px] tabular-nums">
                  <div className="flex justify-between gap-3"><dt>Se cobra <span className="text-[13px] text-hueso/60">sin IVA</span></dt><dd className="font-semibold">{enPesos(r.ingreso)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Cuesta</dt><dd className="font-semibold">−{enPesos(r.costo)}</dd></div>
                  <div className="flex justify-between gap-3 border-t-2 border-hueso/20 pt-1 text-[20px] font-bold">
                    <dt>Queda{r.pct !== null && <span className="ml-2 text-[13px] font-normal text-hueso/60">{String(r.pct).replace('.', ',')}%</span>}</dt>
                    <dd className={r.margen > 0 ? 'text-verde-texto' : 'text-rojo-texto'}>{enPesos(r.margen)}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pastilla}
                  <span className="text-[13px] text-hueso/70">{r.minimoPct > 0 ? `Se busca ${r.minimoPct}% o más` : 'Sin margen mínimo puesto'}</span>
                </div>
              </div>
              <div className="mt-3 hidden items-stretch gap-2 lg:flex lg:flex-wrap">
                <Azulejo compacto estira n={enPesos(r.ingreso)} titulo="Se cobra" nota="sin IVA" />
                <Azulejo compacto estira n={enPesos(r.costo)} titulo="Cuesta" color="text-hueso" />
                <Azulejo compacto estira n={enPesos(r.margen)} titulo="Queda"
                  nota={r.pct === null ? undefined : `${String(r.pct).replace('.', ',')}% de lo cobrado`}
                  color={r.margen > 0 ? 'text-verde-texto' : 'text-rojo-texto'} />
                <div className="flex flex-col justify-center gap-1">
                  {pastilla}
                  <span className="text-[13px] text-hueso/70">
                    {r.minimoPct > 0 ? `Se busca ${r.minimoPct}% o más` : 'Sin margen mínimo puesto'}
                  </span>
                </div>
              </div>

              {r.faltan.length > 0 && (
                <p className="mt-3 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-2 text-[14px]" role="alert">
                  <strong>Falta cargar:</strong> {r.faltan.join(' · ')}. Hasta entonces el margen sale mejor de lo que es.
                </p>
              )}

              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {r.grupos.map((g) => (
                  <section key={g.que} className={`${marcoGrupo(false)} p-2.5`}>
                    <h3 className={`flex items-baseline justify-between gap-2 ${TITULO_GRUPO}`}>
                      <span>{g.titulo}</span><span className="tabular-nums">{enPesos(g.total)}</span>
                    </h3>
                    {g.renglones.length === 0 ? (
                      <p className="mt-1 text-[13px] text-hueso/60">Nada cargado.</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {g.renglones.map((x, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3 text-[14px]">
                            <span className="min-w-0">
                              <span className="font-medium">{x.nombre}</span>
                              <span className={`block text-[13px] ${x.falta ? 'text-ambar-texto' : 'text-hueso/60'}`}>{x.detalle}</span>
                            </span>
                            <span className="shrink-0 tabular-nums">{x.falta ? '—' : enPesos(x.monto)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-hueso/20 pt-3">
                <div className="flex items-center gap-2" role="group" aria-label="Y si vienen">
                  <span className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">¿Y si vienen…?</span>
                  <button type="button" aria-label="Diez invitados menos" className="boton h-11 w-11 !p-0 text-[18px]"
                    disabled={cargando || gente <= 10} onClick={() => void simular(gente - 10)}>−</button>
                  <span className="min-w-[5.5rem] text-center text-[17px] font-bold tabular-nums">{gente} personas</span>
                  <button type="button" aria-label="Diez invitados más" className="boton h-11 w-11 !p-0 text-[18px]"
                    disabled={cargando} onClick={() => void simular(gente + 10)}>+</button>
                  {gente !== invitados && (
                    <button type="button" className="boton min-h-[40px]" disabled={cargando} onClick={() => void simular(invitados)}>
                      Volver a {invitados}
                    </button>
                  )}
                </div>
                {r.netoNecesario !== null && r.minimoPct > 0 && r.senal !== SENAL.conviene && (
                  <p className="text-[14px]">
                    Para llegar al {r.minimoPct}% habría que cobrar <strong>{enPesos(r.netoNecesario)}</strong> + IVA
                    {r.netoNecesarioPorPersona !== null && <> ({enPesos(r.netoNecesarioPorPersona)} por persona)</>}.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="button" className="boton min-h-[44px]" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
