'use client';

/**
 * **La caja chica** (2026-11-23, lo pidió el cliente; lógica en `lib/caja.ts`).
 *
 * Arriba, lo que hay: **en la caja**, **por recibir** y **en manos de** cada
 * persona que recibió. Debajo, lo que se puede anotar —según el rol—, un
 * formulario a la vez:
 *
 * - quien lleva la caja (`caja`): *🧾 Gasto* con la foto de la boleta y
 *   *📤 Entregar…* a alguien que recibe (la primera vez, *🏁 Saldo inicial*);
 * - quien recibe (`recibirCaja`): *✓ Recibí*, y *🏦 Depósito* o *🛒 Compra*
 *   con su comprobante, de lo que tiene en la mano;
 * - pagos (`pagar`): *✓ Revisado* en cada movimiento.
 *
 * Y la lista de movimientos, el más nuevo arriba. Nada se edita: lo anotado
 * por error se borra mientras pagos no lo haya revisado.
 */
import { useEffect, useState } from 'react';
import BandaSeccion from './BandaSeccion';
import Ayuda from './Ayuda';
import AyudaCorta from './AyudaCorta';
import Azulejo from './Azulejo';
import FechaDia from './FechaDia';
import BuscarEnLista from './BuscarEnLista';
import { avisar } from './AvisoFlotante';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import {
  TIPO_CAJA, ICONO_CAJA, partesRecibido, llevaFoto, esLaPersona, type Movimiento, type Saldos, type TipoCaja
} from '@/lib/caja';
import { enPalabras } from '@/lib/fechas';
import { NOMBRE_ROL } from '@/lib/roles';
import { ROL } from '@/lib/auth';

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

interface Datos {
  movimientos: Movimiento[];
  saldos: Saldos;
  porRecibir: Movimiento[];
  nombres: Record<string, string>;
  destinos: { usuario: string; nombre: string; rol: string }[];
  yo: string;
  hoy: string;
  puede: { anotar: boolean; recibir: boolean; revisar: boolean };
}

/** Lo que entra suma; lo que sale resta. Una entrega sale de la caja. */
const entra = (t: TipoCaja) => t === TIPO_CAJA.inicial || t === TIPO_CAJA.cobro;

const ROTULO = 'w-[8.5rem] shrink-0 text-[15px] font-semibold text-hueso/80';
const CAMPO = 'min-h-[44px] w-full min-w-0 rounded-xl border-2 border-hueso/25 bg-tinta px-3 text-[17px]';

/** Un formulario de la caja: monto, detalle, a quién y la foto. Uno a la vez. */
function Formulario({ tipo, d, tengo, onListo, onVolver }: {
  tipo: TipoCaja; d: Datos; tengo: number; onListo: () => void; onVolver: () => void;
}) {
  const sugerido = tipo === TIPO_CAJA.entrega ? d.saldos.enCaja
    : tipo === TIPO_CAJA.deposito ? tengo : tipo === TIPO_CAJA.inicial ? 0 : 0;
  const [monto, setMonto] = useState(sugerido > 0 ? String(sugerido) : '');
  const [detalle, setDetalle] = useState('');
  // El habitual es el encargado de operaciones: *"entregar este dinero a
  // Cristóbal"*. Los demás, con el buscador.
  const habitual = d.destinos.find((x) => x.rol === ROL.operaciones) ?? d.destinos[0];
  const [para, setPara] = useState(habitual?.usuario ?? '');
  const [buscando, setBuscando] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const n = Math.round(Number(monto.replace(/[^\d]/g, ''))) || 0;
  const foto = llevaFoto(tipo);
  const pideDetalle = tipo === TIPO_CAJA.gasto || tipo === TIPO_CAJA.compra;
  const listo = n > 0 && (!foto || !!archivo) && (!pideDetalle || !!detalle.trim())
    && (tipo !== TIPO_CAJA.entrega || !!para);
  const nombrePara = d.nombres[para] ?? para;

  async function guardar() {
    setGuardando(true);
    try {
      const f = new FormData();
      f.set('tipo', tipo); f.set('monto', String(n)); f.set('detalle', detalle.trim());
      if (tipo === TIPO_CAJA.entrega) f.set('para', para);
      if (foto && archivo) f.set('archivo', archivo);
      const res = await fetch('/api/caja', { method: 'POST', body: f });
      const r = await res.json().catch(() => ({}));
      if (!res.ok || r.error) { avisar(r.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(tipo === TIPO_CAJA.entrega ? `Entregado: ${pesos(n)} a ${nombrePara}. Queda por recibir.` : `${tipo}: ${pesos(n)} anotado`);
      onListo();
    } catch (e) {
      avisar(String(e), 'atencion');
    } finally {
      setGuardando(false);
    }
  }

  const titulo = {
    [TIPO_CAJA.inicial]: '🏁 ¿Con cuánto parte la caja?',
    [TIPO_CAJA.gasto]: '🧾 Un gasto de la caja',
    [TIPO_CAJA.entrega]: '📤 Entregar la plata de la caja',
    [TIPO_CAJA.deposito]: '🏦 Lo depositaste',
    [TIPO_CAJA.compra]: '🛒 Compraste algo con la plata',
    [TIPO_CAJA.cobro]: ''
  }[tipo];
  const verbo = tipo === TIPO_CAJA.entrega ? `✓ Entregar ${n ? pesos(n) : ''} a ${nombrePara || '…'}`
    : tipo === TIPO_CAJA.inicial ? `✓ Parte con ${n ? pesos(n) : '…'}`
    : `✓ Anotar ${tipo.toLowerCase()}${n ? ` · ${pesos(n)}` : ''}`;

  return (
    <section className={`${marcoGrupo('oro')} space-y-2 p-3`} data-ficha>
      <p className={TITULO_GRUPO}>{titulo}</p>
      {tipo === TIPO_CAJA.entrega && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={ROTULO}>A quién</span>
          {habitual && (
            <button type="button" onClick={() => setPara(habitual.usuario)}
              className={`boton min-h-[44px] !text-[15px] ${para === habitual.usuario ? '!border-oro !font-bold text-oro' : ''}`}>
              {para === habitual.usuario ? '✓ ' : ''}{habitual.nombre}
            </button>
          )}
          {para && para !== habitual?.usuario && (
            <span className="boton min-h-[44px] !border-oro !text-[15px] !font-bold text-oro">✓ {nombrePara}</span>
          )}
          {d.destinos.length > 1 && (
            <button type="button" className="boton min-h-[44px] !text-[15px]" onClick={() => setBuscando(true)}>Otra persona…</button>
          )}
          {buscando && (
            <div className="basis-full">
              <BuscarEnLista etiqueta="Buscar a quién entregar" vacia="No hay nadie más que reciba la caja."
                opciones={d.destinos.map((x) => ({ id: x.usuario, nombre: x.nombre, detalle: NOMBRE_ROL[x.rol] ?? x.rol }))}
                elegido={para} onElegir={(id) => { setPara(id); setBuscando(false); }} onCerrar={() => setBuscando(false)} />
            </div>
          )}
          {!d.destinos.length && <span className="text-[15px] text-ambar-texto">No hay cuentas que reciban la caja.</span>}
        </div>
      )}
      <label className="flex items-center gap-2">
        <span className={ROTULO}>Monto</span>
        <span className="text-[20px] font-bold">$</span>
        <input inputMode="numeric" autoFocus value={monto} placeholder="0"
          onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))}
          className={`${CAMPO} max-w-[14rem] !text-[20px] font-bold tabular-nums`} />
        {tipo === TIPO_CAJA.entrega && <span className="text-[14px] text-hueso/65">en la caja hay {pesos(d.saldos.enCaja)}</span>}
        {(tipo === TIPO_CAJA.deposito || tipo === TIPO_CAJA.compra) && <span className="text-[14px] text-hueso/65">tienes {pesos(tengo)}</span>}
      </label>
      {tipo !== TIPO_CAJA.inicial && (
        <label className="flex items-center gap-2">
          <span className={ROTULO}>{pideDetalle ? (tipo === TIPO_CAJA.compra ? 'Qué compraste' : 'En qué') : 'Nota'}</span>
          <input value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={200}
            placeholder={tipo === TIPO_CAJA.gasto ? 'hielo, gas, estacionamiento…' : tipo === TIPO_CAJA.compra ? 'carbón, vajilla…' : 'opcional'}
            className={CAMPO} />
        </label>
      )}
      {foto && (
        <div className="flex items-center gap-2">
          <span className={ROTULO}>{tipo === TIPO_CAJA.deposito ? 'Comprobante' : 'Boleta'}</span>
          <label className={`flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-[15px] font-semibold ${
            archivo ? 'border-verde-fuerte/60 text-verde-texto' : 'border-dashed border-ambar-fuerte/70 text-ambar-texto'}`}>
            📎 {archivo ? archivo.name : tipo === TIPO_CAJA.deposito ? 'Foto del comprobante del depósito' : 'Foto de la boleta'}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 lg:pl-[calc(8.5rem+0.5rem)]">
        <button type="button" disabled={!listo || guardando} onClick={() => void guardar()}
          className="boton min-h-[48px] !border-verde-fuerte bg-verde-fuerte !text-[16px] !font-bold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : verbo}
        </button>
        <button type="button" className="boton min-h-[48px]" onClick={onVolver}>Volver</button>
        {tipo === TIPO_CAJA.entrega && <span className="text-[14px] text-hueso/70">Queda por recibir hasta que {nombrePara || 'esa persona'} apriete ✓ Recibí.</span>}
      </div>
    </section>
  );
}

export default function CajaChica() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<TipoCaja | ''>('');
  const [filtro, setFiltro] = useState<'todo' | 'revisar'>('todo');
  const [ocupado, setOcupado] = useState('');
  /** La entrega a la que se le está escribiendo otro monto. */
  const [otroMonto, setOtroMonto] = useState<{ id: string; monto: string } | null>(null);

  const cargar = () => fetch('/api/caja').then((r) => r.json()).then((x) => {
    if (x.error) { setError(x.error); return; }
    setD(x); setError('');
  }).catch((e) => setError(String(e)));
  useEffect(() => { void cargar(); }, []);

  async function llamar(url: string, metodo: string, cuerpo: object, aviso: string, clave: string) {
    setOcupado(clave);
    try {
      const res = await fetch(url, { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const r = await res.json().catch(() => ({}));
      if (!res.ok || r.error) { avisar(r.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(aviso);
      setOtroMonto(null);
      void cargar();
    } finally {
      setOcupado('');
    }
  }

  if (error) return <p className="rounded-xl border-2 border-rojo-fuerte/50 bg-rojo/10 p-4 text-[15px] text-rojo-texto">{error}</p>;
  if (!d) return <p className="text-[15px] text-hueso/70">Cargando la caja…</p>;

  const yo = { usuario: d.yo };
  const nombre = (u: string) => d.nombres[u] ?? u;
  const tengo = d.saldos.enManos.filter((x) => esLaPersona(x.persona, yo)).reduce((s, x) => s + x.monto, 0);
  const sinInicial = !d.movimientos.some((m) => m.tipo === TIPO_CAJA.inicial);
  const porRevisar = d.movimientos.filter((m) => !m.revisado && m.tipo !== TIPO_CAJA.cobro
    && !(m.tipo === TIPO_CAJA.entrega && !partesRecibido(m)));
  const lista = filtro === 'revisar' ? porRevisar : d.movimientos;

  return (
    <div className="space-y-3">
      <BandaSeccion tono="oro" icono="💵" seccion="Caja" titulo="Caja chica" ayuda={<Ayuda tema="caja" />} />

      {/* Lo que te entregaron: se confirma acá. */}
      {d.porRecibir.length > 0 && (
        <section className={`${marcoGrupo('verde')} p-3`}>
          <p className={TITULO_GRUPO}>🤲 Te entregaron</p>
          <ul className="mt-2 space-y-2">
            {d.porRecibir.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-hueso/35 bg-panel px-3 py-2">
                <p className="min-w-[14rem] flex-1 text-[15px]">
                  <b>{nombre(m.quien)}</b> te entregó <b className="text-verde-texto">{pesos(m.monto)}</b>
                  {m.detalle && <> · {m.detalle}</>}
                  <span className="text-hueso/65"> · {enPalabras(m.fecha)}, {m.cuando.slice(11)}</span>
                </p>
                {otroMonto?.id === m.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[20px] font-bold">$</span>
                    <input inputMode="numeric" autoFocus aria-label="Cuánto recibiste" value={otroMonto.monto}
                      onChange={(e) => setOtroMonto({ id: m.id, monto: e.target.value.replace(/[^\d.]/g, '') })}
                      className={`${CAMPO} w-[9rem] font-bold tabular-nums`} />
                    <button type="button" disabled={!otroMonto.monto || ocupado === m.id}
                      className="boton min-h-[44px] !border-verde-fuerte bg-verde-fuerte !font-bold text-tinta disabled:opacity-40"
                      onClick={() => void llamar('/api/caja/recibir', 'POST', { id: m.id, monto: otroMonto.monto },
                        'Recibido: queda marcado para pagos', m.id)}>
                      ✓ Recibí {otroMonto.monto ? pesos(Number(otroMonto.monto.replace(/\D/g, ''))) : ''}
                    </button>
                    <button type="button" className="boton min-h-[44px]" onClick={() => setOtroMonto(null)}>Volver</button>
                  </span>
                ) : (
                  <span className="flex flex-wrap gap-2">
                    <button type="button" disabled={ocupado === m.id}
                      className="boton min-h-[44px] !border-verde-fuerte bg-verde-fuerte !text-[15px] !font-bold text-tinta"
                      onClick={() => void llamar('/api/caja/recibir', 'POST', { id: m.id }, `Recibido: ${pesos(m.monto)}`, m.id)}>
                      {ocupado === m.id ? 'Guardando…' : `✓ Recibí ${pesos(m.monto)}`}
                    </button>
                    <button type="button" className="boton min-h-[44px] !text-[15px]"
                      onClick={() => setOtroMonto({ id: m.id, monto: '' })}>Recibí otro monto…</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lo que hay, y lo que se puede anotar, en una fila en el computador
          (regla *el espacio se usa bien*): los botones, a la derecha de los saldos. */}
      <div className="flex flex-wrap items-center gap-2">
        <Azulejo n={pesos(d.saldos.enCaja)} titulo="En la caja" nota="la tiene quien está de turno"
          color={d.saldos.enCaja < 0 ? 'text-rojo-texto' : 'text-verde-texto'} borde="border-verde/40" />
        {d.saldos.porRecibir > 0 && (
          <Azulejo n={pesos(d.saldos.porRecibir)} titulo="Por recibir" nota="entregado, sin confirmar"
            color="text-ambar-texto" borde="border-ambar/40" />
        )}
        {d.saldos.enManos.map((x) => (
          <Azulejo key={x.persona} n={pesos(x.monto)} titulo={`En manos de ${nombre(x.persona)}`}
            nota="para depositar o comprar" color="text-cielo-texto" borde="border-cielo/40" />
        ))}
        {d.saldos.diferencias.length > 0 && (
          <Azulejo n={d.saldos.diferencias.length} titulo={d.saldos.diferencias.length === 1 ? 'Recibida con otro monto' : 'Recibidas con otro monto'}
            nota={d.saldos.diferencias.map((x) => `${pesos(x.recibido)} de ${pesos(x.entregado)}`).join(' · ')}
            color="text-rojo-texto" borde="border-rojo/40" />
        )}
      {form === '' && (
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {d.puede.anotar && sinInicial && (
            <button type="button" className="boton min-h-[44px] !border-oro !text-[15px] !font-bold text-oro"
              onClick={() => setForm(TIPO_CAJA.inicial)}>🏁 Saldo inicial…</button>
          )}
          {d.puede.anotar && (
            <>
              <button type="button" className="boton min-h-[44px] !text-[15px] !font-semibold" onClick={() => setForm(TIPO_CAJA.gasto)}>🧾 Anotar un gasto…</button>
              <button type="button" className="boton min-h-[44px] !text-[15px] !font-semibold" disabled={!(d.saldos.enCaja > 0)}
                onClick={() => setForm(TIPO_CAJA.entrega)}>📤 Entregar…</button>
            </>
          )}
          {d.puede.recibir && tengo > 0 && (
            <>
              <button type="button" className="boton min-h-[44px] !border-cielo-fuerte/70 !text-[15px] !font-semibold text-cielo-texto"
                onClick={() => setForm(TIPO_CAJA.deposito)}>🏦 Depósito…</button>
              <button type="button" className="boton min-h-[44px] !border-cielo-fuerte/70 !text-[15px] !font-semibold text-cielo-texto"
                onClick={() => setForm(TIPO_CAJA.compra)}>🛒 Compra…</button>
            </>
          )}
          <AyudaCorta tema="cajaAnotar" />
        </div>
      )}
      </div>
      {form !== '' && (
        <Formulario key={form} tipo={form} d={d} tengo={tengo} onVolver={() => setForm('')}
          onListo={() => { setForm(''); void cargar(); }} />
      )}

      {/* Los movimientos, el más nuevo arriba. */}
      <section className={`${marcoGrupo(false)} p-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`${TITULO_GRUPO} flex-1`}>Movimientos</p>
          {d.puede.revisar && (
            <span className="flex gap-2">
              <button type="button" onClick={() => setFiltro('todo')}
                className={`boton min-h-[40px] !text-[14px] ${filtro === 'todo' ? '!border-oro !font-bold text-oro' : ''}`}>Todo</button>
              <button type="button" onClick={() => setFiltro('revisar')}
                className={`boton min-h-[40px] !text-[14px] ${filtro === 'revisar' ? '!border-oro !font-bold text-oro' : ''}`}>
                Por revisar ({porRevisar.length})
              </button>
            </span>
          )}
        </div>
        {!lista.length ? (
          <p className="mt-2 text-[15px] text-hueso/70">
            {filtro === 'revisar' ? 'No queda nada por revisar.' : 'Todavía no hay movimientos. El efectivo que se cobra en las mesas entra solo.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-hueso/10">
            {lista.map((m) => {
              const rec = partesRecibido(m);
              const rev = m.revisado ? m.revisado.split(' · ')[1] ?? '' : '';
              const mio = esLaPersona(m.quien, yo);
              const puedeBorrar = m.tipo !== TIPO_CAJA.cobro && (d.puede.revisar
                || (mio && !m.revisado && !(m.tipo === TIPO_CAJA.entrega && rec)));
              const sePuedeRevisar = d.puede.revisar && m.tipo !== TIPO_CAJA.cobro && !(m.tipo === TIPO_CAJA.entrega && !rec);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 lg:flex-nowrap">
                  {/* En el celular, la fecha y el monto en la primera línea y el
                      detalle debajo; en el computador, todo en una fila. */}
                  <span className="order-1 w-[5.5rem] shrink-0"><FechaDia fecha={m.fecha} tamano="aviso" conMes /></span>
                  <p className="order-3 min-w-0 basis-full text-[15px] leading-snug lg:order-2 lg:min-w-[14rem] lg:flex-1 lg:basis-auto">
                    <b>{ICONO_CAJA[m.tipo]} {m.tipo === TIPO_CAJA.entrega ? `Entrega a ${nombre(m.para)}` : m.tipo}</b>
                    {m.detalle && <> · {m.detalle}</>}
                    <span className="text-hueso/65"> · {nombre(m.quien)}, {m.cuando.slice(11)}</span>
                    {m.comprobante && (
                      <a href={`/api/caja/comprobante?id=${encodeURIComponent(m.id)}`} target="_blank" rel="noreferrer"
                        className="ml-2 font-semibold text-oro underline">📎 foto</a>
                    )}
                    {m.tipo === TIPO_CAJA.entrega && (rec
                      ? <span className={`ml-2 font-semibold ${rec.monto === m.monto ? 'text-verde-texto' : 'text-rojo-texto'}`}>
                          {rec.monto === m.monto ? `✓ recibió ${nombre(rec.quien)}` : `⚠ ${nombre(rec.quien)} recibió ${pesos(rec.monto)}`}
                        </span>
                      : <span className="ml-2 font-semibold text-ambar-texto">⏳ por recibir</span>)}
                    {rev && <span className="ml-2 font-semibold text-verde-texto">· ✓ revisado por {nombre(rev)}</span>}
                  </p>
                  <span className={`order-2 ml-auto shrink-0 text-right text-[17px] font-bold tabular-nums lg:order-3 lg:ml-0 lg:w-[7.5rem] ${entra(m.tipo) ? 'text-verde-texto' : ''}`}>
                    {entra(m.tipo) ? '+' : '−'}{pesos(m.monto)}
                  </span>
                  <span className="order-4 flex shrink-0 gap-2">
                    {sePuedeRevisar && (
                      <button type="button" disabled={ocupado === m.id}
                        className={`boton min-h-[40px] !text-[14px] ${m.revisado ? '' : '!border-verde-fuerte !font-semibold text-verde-texto'}`}
                        onClick={() => void llamar('/api/caja/revisar', 'POST', { id: m.id, revisado: !m.revisado },
                          m.revisado ? 'Revisión quitada' : 'Revisado', m.id)}>
                        {m.revisado ? 'Quitar revisión' : '✓ Revisado'}
                      </button>
                    )}
                    {puedeBorrar && (
                      <button type="button" disabled={ocupado === m.id} aria-label="Borrar este movimiento"
                        className="boton min-h-[40px] !text-[14px] text-rojo-texto"
                        onClick={() => { if (confirm('¿Borrar este movimiento? Queda en la bitácora.')) {
                          void llamar('/api/caja', 'DELETE', { id: m.id }, 'Borrado', m.id); } }}>
                        Borrar
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
