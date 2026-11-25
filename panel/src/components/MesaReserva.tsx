'use client';

/**
 * **La mesa de una reserva** (2026-11-17, lo pidió el cliente; lógica en
 * `lib/mesa.ts`). La misma pieza en la Recepción y en la página del día:
 *
 * - **Lo agregado**: la gente que se sumó, cada uno con su menú o *a la
 *   carta*, con − y + por opción (`ElegirAgregados`).
 * - **El valor final**: el total de la cuenta de la mesa en Fudo, con lo ya
 *   pagado incluido, y quién lo anotó.
 *
 * Los dos se guardan con un botón que dice lo que pasa —toman cupo y son
 * plata—, no solos. Sin permiso o fuera de hora, se leen y no se tocan.
 *
 * - **El cobro** (2026-11-23, `lib/cobroLocal.ts`): con el valor final
 *   anotado, *Ya pagado* y *Falta por cobrar*, y cómo pagó el resto —💵
 *   Efectivo, 🏦 Transferencia con la foto del comprobante o 💳 Tarjeta, o
 *   varios—. ***✓ Pagó todo*** la deja pagada. Solo con el permiso `caja`.
 */
import { useEffect, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import { avisar } from './AvisoFlotante';
import {
  A_LA_CARTA, leerAgregados, escribirAgregados, limpiarValorFinal, partesMarcaMesa,
  pesosCL, type Agregado
} from '@/lib/mesa';
import type { Acordado } from '@/lib/fudo';
import {
  MEDIOS_LOCAL, ICONO_MEDIO, faltaPorCobrar, yaPagado, leerCobroLocal, partesMarcaCobro, llevaTransferencia,
  type MedioLocal
} from '@/lib/cobroLocal';

export interface DatosMesa {
  fila: number;
  /** Su id (2026-11-25): si la fila se movió, el servidor la encuentra igual (`reservaDeLaFila()`). */
  id?: string;
  nombre: string;
  agregados?: string;
  valorFinal?: number | null;
  mesaCerrada?: string;
  /** El pago, para cobrar la mesa (2026-11-23). Solo llega a quien tiene `caja`. */
  estadoPago?: string;
  monto?: number | null;
  abonado?: number | null;
  cobroLocal?: string;
  comprobanteCobro?: string;
  cobroCerrado?: string;
}

/**
 * **Cobrar la mesa** (2026-11-23, `lib/cobroLocal.ts`): lo ya pagado, lo que
 * falta y cómo pagó el resto. Una pieza aparte de `MesaReserva` para que su
 * estado no se mezcle con el de agregar y el valor final.
 */
function CobroMesa({ r, editable, revisado, onGuardado, onCobrando }: {
  r: DatosMesa & { estadoPago: string };
  editable: boolean;
  /** Si pagos ya lo revisó: deshacerlo es de pagos. */
  revisado: boolean;
  onGuardado: () => void;
  /** Mientras se elige cómo pagó, la mesa esconde lo demás: así cabe en una pantalla. */
  onCobrando?: (si: boolean) => void;
}) {
  const [filas, setFilas] = useState<{ medio: MedioLocal; monto: string }[]>([]);
  const cobrando = filas.length > 0;
  useEffect(() => { onCobrando?.(cobrando); }, [cobrando]); // eslint-disable-line react-hooks/exhaustive-deps
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const pagado = yaPagado({ estadoPago: r.estadoPago, monto: r.monto ?? null, abonado: r.abonado ?? null });
  const falta = faltaPorCobrar({ estadoPago: r.estadoPago, monto: r.monto ?? null, abonado: r.abonado ?? null,
    valorFinal: r.valorFinal, cobroCerrado: r.cobroCerrado });
  const hecho = leerCobroLocal(r.cobroLocal);
  const marca = partesMarcaCobro(r.cobroCerrado);
  const lista = filas.map((f) => ({ medio: f.medio, monto: Math.round(Number(f.monto.replace(/[^\d]/g, ''))) || 0 }));
  const suma = lista.reduce((s, p) => s + p.monto, 0);
  const conTransferencia = llevaTransferencia(lista.filter((p) => p.monto > 0));
  const listo = filas.length > 0 && suma === falta && (!conTransferencia || !!archivo);

  async function enviar(metodo: 'POST' | 'DELETE') {
    if (metodo === 'DELETE' && !confirm(`¿Deshacer el cobro de ${r.nombre}? La reserva vuelve a como estaba${
      hecho.some((p) => p.medio === 'Efectivo') ? ' y el efectivo sale de la caja chica' : ''}.`)) return;
    setGuardando(true);
    try {
      let cuerpo: FormData | undefined;
      if (metodo === 'POST') {
        cuerpo = new FormData();
        cuerpo.set('cobro', JSON.stringify(lista.filter((p) => p.monto > 0)));
        if (archivo && conTransferencia) cuerpo.set('archivo', archivo);
      }
      const res = await fetch(`/api/reservas/${r.fila}/cobro${r.id ? `?id=${encodeURIComponent(r.id)}` : ''}`, { method: metodo, body: cuerpo });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(metodo === 'POST' ? `${r.nombre}: pagó todo${d.efectivo ? ` · ${pesosCL(d.efectivo)} a la caja chica` : ''}`
        : `${r.nombre}: cobro deshecho`);
      setFilas([]); setArchivo(null);
      onGuardado();
    } catch (e) {
      avisar(String(e), 'atencion');
    } finally {
      setGuardando(false);
    }
  }

  const elegir = (medio: MedioLocal) => {
    const otros = lista.reduce((s, p) => s + p.monto, 0);
    setFilas((f) => [...f, { medio, monto: String(Math.max(0, falta - otros)) }]);
  };
  const libres = MEDIOS_LOCAL.filter((m) => !filas.some((f) => f.medio === m));

  return (
    <div className="mt-2 border-t-2 border-hueso/10 pt-2" aria-label="El pago de la mesa">
      {/* Lo que ya está: pagado en el local, o lo que falta. */}
      {hecho.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-verde-texto">✓ Pagó todo en el local</p>
            <p className="mt-0.5 text-[15px] font-semibold">
              {hecho.map((p) => `${ICONO_MEDIO[p.medio]} ${p.medio} ${pesosCL(p.monto)}`).join(' · ')}
              {r.comprobanteCobro && (
                <a href={`/api/reservas/${r.fila}/cobro`} target="_blank" rel="noreferrer"
                  className="ml-2 text-oro underline">📎 comprobante</a>
              )}
            </p>
            {marca && (
              <p className="text-[13px] text-hueso/65">
                lo cobró {marca.quien}{marca.cuando ? ` a las ${marca.cuando.slice(11)}` : ''}{revisado ? ' · ✓ revisado por pagos' : ''}
              </p>
            )}
          </div>
          {editable && (
            <button type="button" disabled={guardando} onClick={() => void enviar('DELETE')}
              className="boton min-h-[40px] !text-[14px] text-hueso/80">{guardando ? 'Deshaciendo…' : 'Deshacer'}</button>
          )}
        </div>
      ) : (
        <p className="flex flex-wrap items-center gap-x-3 text-[15px]">
          <span>Ya pagado <b className="tabular-nums">{pesosCL(pagado)}</b></span>
          <span className={falta > 0 ? 'font-bold text-ambar-texto' : 'font-bold text-verde-texto'}>
            {falta > 0 ? <>Falta por cobrar <span className="tabular-nums">{pesosCL(falta)}</span></> : '✓ No falta nada por cobrar'}
          </span>
          <AyudaCorta tema="cobroMesa" />
        </p>
      )}

      {/* Cómo pagó el resto: un toque elige el medio con todo lo que falta. */}
      {editable && !hecho.length && falta > 0 && filas.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {MEDIOS_LOCAL.map((m) => (
            <button key={m} type="button" onClick={() => elegir(m)}
              className="boton min-h-[44px] flex-1 !border-oro/70 !text-[15px] !font-semibold">
              {ICONO_MEDIO[m]} {m}
            </button>
          ))}
        </div>
      )}

      {editable && filas.length > 0 && (
        <div className="mt-2 space-y-2 rounded-xl border-2 border-oro/60 bg-panel p-3">
          <ul className="space-y-1.5" aria-label={`Cómo pagó los ${pesosCL(falta)}`}>
            {filas.map((f, i) => (
              <li key={f.medio} className="flex items-center gap-2">
                {/* En el celular el nombre cede: el monto es lo que se escribe. */}
                <span className="w-[7.25rem] shrink-0 text-[15px] font-bold leading-tight sm:w-[9.5rem] sm:text-[16px]">{ICONO_MEDIO[f.medio]} {f.medio}</span>
                <span className="hidden text-[20px] font-bold sm:inline">$</span>
                <input inputMode="numeric" aria-label={`Monto en ${f.medio}`} value={f.monto} autoFocus={i === filas.length - 1}
                  onChange={(e) => setFilas((x) => x.map((y, j) => (j === i ? { ...y, monto: e.target.value.replace(/[^\d.]/g, '') } : y)))}
                  className="min-h-[44px] w-full min-w-[5.5rem] rounded-xl border-2 border-hueso/25 bg-tinta px-3 text-[18px] font-bold tabular-nums" />
                <button type="button" aria-label={`Quitar ${f.medio}`} onClick={() => setFilas((x) => x.filter((_, j) => j !== i))}
                  className="boton h-11 w-11 shrink-0 !text-[18px]">✕</button>
              </li>
            ))}
          </ul>
          {conTransferencia && (
            <label className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-[15px] font-semibold ${
              archivo ? 'border-verde-fuerte/60 text-verde-texto' : 'border-dashed border-ambar-fuerte/70 text-ambar-texto'}`}>
              📎 {archivo ? archivo.name : 'Foto del comprobante de la transferencia'}
              <input type="file" accept="image/*,application/pdf" className="sr-only"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {suma !== falta && (
            <p className="text-[15px] font-semibold text-ambar-texto">
              {suma < falta ? `Faltan ${pesosCL(falta - suma)}` : `Sobran ${pesosCL(suma - falta)}: si es propina, va en la propina del día`}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!listo || guardando} onClick={() => void enviar('POST')}
              className="boton min-h-[48px] flex-1 !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta disabled:opacity-40">
              {guardando ? 'Guardando…' : `✓ Pagó todo · ${pesosCL(falta)}`}
            </button>
            {libres.length > 0 && suma < falta && (
              <span className="flex flex-wrap gap-2">
                {libres.map((m) => (
                  <button key={m} type="button" onClick={() => elegir(m)} className="boton min-h-[48px] !text-[15px]">
                    + {ICONO_MEDIO[m]} {m}
                  </button>
                ))}
              </span>
            )}
            {libres.length > 0 && suma >= falta && (
              <button type="button" onClick={() => elegir(libres[0])} className="boton min-h-[48px] !text-[15px]">+ Otro medio</button>
            )}
            <button type="button" className="boton min-h-[48px]" onClick={() => { setFilas([]); setArchivo(null); }}>Volver</button>
          </div>
        </div>
      )}
    </div>
  );
}

const etiqueta = (m: string) => (m === A_LA_CARTA ? '🍽 A la carta' : m);

/**
 * **Elegir qué comen**: un renglón por opción, con − y +. Las opciones las
 * arma `opcionesParaAgregar()`: los menús de la reserva, los del sitio y *a
 * la carta* al final.
 */
export function ElegirAgregados({ opciones, valor, onCambio }: {
  opciones: string[];
  valor: Agregado[];
  onCambio: (v: Agregado[]) => void;
}) {
  const de = (m: string) => valor.find((a) => a.menu === m)?.cantidad ?? 0;
  const poner = (m: string, n: number) => onCambio(
    [...valor.filter((a) => a.menu !== m), ...(n > 0 ? [{ menu: m, cantidad: n }] : [])]);
  return (
    <ul className="space-y-1.5">
      {opciones.map((m) => {
        const n = de(m);
        return (
          <li key={m} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 ${n > 0
            ? 'border-cielo-fuerte/60 bg-cielo/10' : 'border-hueso/15'}`}>
            <span className={`min-w-0 flex-1 text-[16px] leading-tight ${n > 0 ? 'font-bold' : ''}`}>{etiqueta(m)}</span>
            <button type="button" aria-label={`Una menos de ${m}`} disabled={n === 0}
              className="boton h-11 w-11 shrink-0 !text-[22px] !font-bold disabled:opacity-30"
              onClick={() => poner(m, n - 1)}>−</button>
            <span className="w-8 shrink-0 text-center text-[20px] font-bold tabular-nums">{n}</span>
            <button type="button" aria-label={`Una más de ${m}`}
              className="boton h-11 w-11 shrink-0 !text-[22px] !font-bold"
              onClick={() => poner(m, n + 1)}>+</button>
          </li>
        );
      })}
    </ul>
  );
}

export default function MesaReserva({ r, opciones, editable, onGuardado, compacta = false, acordado, cobrar = false, revisado = false }: {
  /** Si esta cuenta cobra la mesa (`caja`): trae el pago en `r`. */
  cobrar?: boolean;
  /** Si pagos ya revisó el cobro. */
  revisado?: boolean;
  r: DatosMesa;
  /**
   * Lo acordado en su cotización (2026-11-20), si viene de una y esta cuenta
   * lo ve. Al anotar el valor final se muestra al lado, y si el valor queda
   * bajo lo acordado, avisa antes de guardar: casi siempre es una mesa
   * ingresada en Fudo con los precios de la carta.
   */
  acordado?: Acordado;
  opciones: string[];
  /** Si esta cuenta, a esta hora, puede anotar la mesa. */
  editable: boolean;
  /** Después de guardar: recargar lo que corresponda. */
  onGuardado: () => void;
  /** Sin el título, cuando lo que la rodea ya dice que es la mesa. */
  compacta?: boolean;
}) {
  const [modo, setModo] = useState<'' | 'agregar' | 'valor'>('');
  const [borrador, setBorrador] = useState<Agregado[]>([]);
  const [valorTexto, setValorTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** Mientras se cobra, lo demás de la mesa se esconde (2026-11-23). */
  const [cobrando, setCobrando] = useState(false);
  const lista = leerAgregados(r.agregados);
  const marca = partesMarcaMesa(r.mesaCerrada);

  async function guardar(cambios: { agregados?: string; valorFinal?: number | null }, aviso: string) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/reservas/${r.fila}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...cambios, id: r.id })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(aviso);
      setModo('');
      onGuardado();
    } catch (e) {
      avisar(String(e), 'atencion');
    } finally {
      setGuardando(false);
    }
  }

  const nBorrador = borrador.reduce((s, a) => s + a.cantidad, 0);
  const valor = limpiarValorFinal(valorTexto);

  return (
    <section aria-label="La mesa" className="rounded-xl border-2 border-cielo-fuerte/40 bg-cielo/[0.05] p-3">
      {!compacta && <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">🍽 La mesa</p>}

      {/* Lo que ya tiene: lo agregado y el valor final, siempre a la vista. */}
      {/* Mientras se cobra y no se sumó nadie, *Nadie agregado* se esconde:
          así la ficha cabe en una pantalla (2026-11-23). */}
      {!(cobrando && !lista.length) && <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {lista.length ? lista.map((a) => (
          <span key={a.menu} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2
                                        border-cielo-fuerte/60 bg-cielo/10 px-2.5 py-0.5 text-[14px] font-bold text-cielo-texto">
            +{a.cantidad} {a.menu === A_LA_CARTA ? 'a la carta' : a.menu}
          </span>
        )) : <span className="text-[14px] text-hueso/65">Nadie agregado.</span>}
      </div>}
      <p className={`mt-1.5 text-[15px] ${r.valorFinal != null ? 'font-bold' : 'text-hueso/65'}`}>
        🧾 {r.valorFinal != null
          ? <>Valor final {pesosCL(r.valorFinal)}{marca && <span className="font-normal text-hueso/65">
              {' '}· lo anotó {marca.quien}{marca.cuando ? ` a las ${marca.cuando.slice(11) || marca.cuando}` : ''}</span>}</>
          : 'Sin valor final todavía'}
      </p>
      {acordado && r.valorFinal != null && r.valorFinal < acordado.total && (
        <p className="mt-1 text-[14px] font-semibold text-ambar-texto">
          ⚠ Bajo lo acordado en la cotización N° {acordado.folio} ({pesosCL(acordado.total)})
        </p>
      )}

      {editable && modo === '' && !cobrando && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="boton min-h-[44px] !border-cielo-fuerte/70 !font-semibold text-cielo-texto"
            onClick={() => { setBorrador(lista); setModo('agregar'); }}>
            {lista.length ? '✎ Cambiar lo agregado' : '➕ Agregar a la mesa'}
          </button>
          {/* Cobrada, el valor final queda fijo: cambiarlo descuadraría lo
              cobrado. Para cambiarlo se deshace el cobro primero. */}
          {!r.cobroCerrado && (
            <button type="button" className="boton min-h-[44px] !font-semibold"
              onClick={() => { setValorTexto(r.valorFinal != null ? String(r.valorFinal) : ''); setModo('valor'); }}>
              🧾 {r.valorFinal != null ? 'Cambiar el valor final' : 'Anotar el valor final'}
            </button>
          )}
        </div>
      )}

      {editable && modo === 'agregar' && (
        <div className="mt-2 space-y-2 rounded-xl border-2 border-cielo-fuerte/60 bg-panel p-3">
          <p className="flex items-center gap-2 text-[16px] font-semibold">
            ¿Quién se sumó a la mesa, y qué come? <AyudaCorta tema="agregadosMesa" />
          </p>
          <ElegirAgregados opciones={opciones} valor={borrador} onCambio={setBorrador} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={guardando || escribirAgregados(borrador) === escribirAgregados(lista)}
              className="boton min-h-[48px] flex-1 !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta disabled:opacity-40"
              onClick={() => void guardar({ agregados: escribirAgregados(borrador) },
                nBorrador ? `${r.nombre}: ${nBorrador} en la mesa` : `${r.nombre}: sin agregados`)}>
              {guardando ? 'Guardando…' : nBorrador ? `✓ Guardar · ${nBorrador} ${nBorrador === 1 ? 'agregado' : 'agregados'}`
                : '✓ Guardar · sin agregados'}
            </button>
            <button type="button" className="boton min-h-[48px]" onClick={() => setModo('')}>Volver</button>
          </div>
        </div>
      )}

      {editable && modo === 'valor' && (
        <div className="mt-2 space-y-2 rounded-xl border-2 border-oro/60 bg-panel p-3">
          <p className="flex items-center gap-2 text-[16px] font-semibold">
            <label htmlFor={`valor-${r.fila}`}>¿Cuánto fue la cuenta de la mesa?</label>
            <AyudaCorta tema="valorFinal" />
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold">$</span>
            <input id={`valor-${r.fila}`} inputMode="numeric" autoFocus value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="264.000"
              className="min-h-[52px] w-full rounded-xl border-2 border-hueso/25 bg-tinta px-3 text-[22px] font-bold tabular-nums" />
          </div>
          {acordado && (
            <p className="text-[15px] font-semibold text-oro">
              📋 Lo acordado en la cotización N° {acordado.folio}: {pesosCL(acordado.total)} con IVA,
              sin lo que se haya sumado aparte.
            </p>
          )}
          {acordado && valor != null && valor < acordado.total && (
            <p className="rounded-lg border-2 border-ambar-fuerte/60 bg-ambar/10 px-3 py-2 text-[15px] font-semibold text-ambar-texto">
              ⚠ Es menos que lo acordado ({pesosCL(acordado.total)}). Revisa que en Fudo esté ingresada con los
              precios de la cotización antes de guardar.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {valorTexto.trim() ? (
              <button type="button" disabled={guardando || valor == null || valor === r.valorFinal}
                className="boton min-h-[48px] flex-1 !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta disabled:opacity-40"
                onClick={() => valor != null && void guardar({ valorFinal: valor }, `${r.nombre}: valor final ${pesosCL(valor)}`)}>
                {guardando ? 'Guardando…' : valor == null ? 'Escribe un monto'
                  : acordado && valor < acordado.total ? `✓ Guardar igual ${pesosCL(valor)}` : `✓ Guardar ${pesosCL(valor)}`}
              </button>
            ) : r.valorFinal != null ? (
              <button type="button" disabled={guardando}
                className="boton min-h-[48px] flex-1 !border-rojo-fuerte/60 !font-semibold text-rojo-texto"
                onClick={() => void guardar({ valorFinal: null }, `${r.nombre}: sin valor final`)}>
                Quitar el valor final
              </button>
            ) : null}
            <button type="button" className="boton min-h-[48px]" onClick={() => setModo('')}>Volver</button>
          </div>
        </div>
      )}

      {/* **El pago de la mesa** (2026-11-23): con el valor final, o si ya se cobró. */}
      {cobrar && modo === '' && r.estadoPago !== undefined && (r.valorFinal != null || !!r.cobroLocal) && (
        <CobroMesa r={r as DatosMesa & { estadoPago: string }} editable={editable} revisado={revisado}
          onGuardado={() => { setCobrando(false); onGuardado(); }} onCobrando={setCobrando} />
      )}
    </section>
  );
}
