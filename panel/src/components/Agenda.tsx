'use client';

/**
 * **La agenda del vendedor** (2026-11-23, lo pidió el cliente; lógica en
 * `lib/agenda.ts`). **Reemplaza a *Esperando respuesta***, que se fusionó
 * acá (lo decidió el cliente): sus mismos botones —*Está negociando*,
 * *✕ Se cayó…*, *✓ Se ganó*, el contrato firmado— siguen en cada fila, y
 * *Sigue esperando* pasó a ser **📝 Anotar**, que además dice qué se
 * conversó y cuándo volver a contactarlo.
 *
 * Dos grupos, cada uno en su marco: **📞 Contactar** (rosado, el color del
 * seguimiento) y **✍ Por redactar** (cielo, el color del candidato), con lo
 * de hoy y lo atrasado arriba y lo de los próximos días debajo. `soloHoy`
 * la deja en lo de hoy, sin marcos, para la pastilla de *Tus pendientes*.
 */
import { useState } from 'react';
import AyudaCorta from './AyudaCorta';
import SeCayo from './SeCayo';
import { UltimaNota } from './LoConversado';
import { avisar } from './AvisoFlotante';
import { usarSoloMira } from './SesionCliente';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { PastillaEstado } from './CotizacionesVista';
import { fraseDe, paraHoy, type ItemAgenda } from '@/lib/agenda';
import { ESTADO_PRESUPUESTO, estadoNormal, estadoVisible, estaMandada, folioDe, type Presupuesto } from '@/lib/presupuestos';
import { alternativasDe, enCarrera, grupoDe } from '@/lib/cotizar';
import { enCorto, esFecha, type Fecha } from '@/lib/fechas';
import type { Nota } from '@/lib/notas';
import EmpresaCliente from './EmpresaCliente';

const TONO = { rojo: 'font-semibold text-rojo-texto', ambar: 'font-semibold text-ambar-texto', neutro: 'text-hueso/75' } as const;

export interface PropsAgenda {
  agenda: { contactar: ItemAgenda[]; redactar: ItemAgenda[] };
  hoy: Fecha;
  /** Todas las cotizaciones: para contar las alternativas que se caen con una. */
  todas: Presupuesto[];
  /** Cuántas notas tiene cada grupo (solo las que esta cuenta lee). */
  notasPorGrupo: Map<string, number>;
  /**
   * **La última nota de cada grupo** (2026-11-25, lo pidió el cliente: *"se
   * tiene que mostrar el último comentario… en todos lados"*): va bajo la
   * frase, en un renglón, a quien lee las notas.
   */
  ultimaPorGrupo?: Map<string, Pick<Nota, 'cuando' | 'medio' | 'quien' | 'nota'>>;
  puedeTocar: (p: Presupuesto) => boolean;
  puedeAnotar: (p: Presupuesto) => boolean;
  onAbrir: (p: Presupuesto, paso?: number) => void;
  onNotas: (p: Presupuesto) => void;
  onCambio: () => void;
  /** Solo lo de hoy, sin marcos: la pastilla de *Tus pendientes*. */
  soloHoy?: boolean;
  /** Las conversaciones que esta cuenta anotó hoy, para el avance. */
  anotadasHoy?: number;
}

export default function Agenda(props: PropsAgenda) {
  const { agenda, soloHoy = false, anotadasHoy = 0 } = props;
  const [cayendo, setCayendo] = useState<Presupuesto | null>(null);
  const [sinPlazo, setSinPlazo] = useState(false);

  const fila = (x: ItemAgenda) => (
    <FilaAgenda key={`${x.tipo}-${grupoDe(x.p)}`} x={x} {...props} onCayo={setCayendo} />
  );
  const caer = cayendo && (
    <SeCayo id={cayendo.id} cliente={cayendo.cliente}
      alternativas={alternativasDe(cayendo, props.todas).filter((a) => a.id === cayendo.id || enCarrera(a)).length}
      onCerrar={() => setCayendo(null)}
      onListo={() => { setCayendo(null); props.onCambio(); }} />
  );

  if (soloHoy) {
    const hoy = [...agenda.contactar.filter(paraHoy), ...agenda.redactar.filter(paraHoy)];
    return <><ul className="space-y-2">{hoy.map(fila)}</ul>{caer}</>;
  }

  const contactarHoy = agenda.contactar.filter(paraHoy);
  const contactarDespues = agenda.contactar.filter((x) => !paraHoy(x));
  const redactarHoy = agenda.redactar.filter(paraHoy);
  const redactarDespues = agenda.redactar.filter((x) => x.cuando === 'proximo');
  const redactarSinPlazo = agenda.redactar.filter((x) => x.cuando === 'sinPlazo');
  const quedan = contactarHoy.length + redactarHoy.length;

  const sub = (texto: string) => (
    <p className="mb-1.5 mt-3 text-[13px] font-semibold uppercase tracking-wider text-hueso/60 first:mt-0">{texto}</p>
  );

  return (
    <div className="space-y-3">
      {/* El avance del día: lo anotado hoy y lo que queda. */}
      <p className="flex flex-wrap items-center gap-2 text-[15px]">
        <span className={`rounded-full border-2 px-3 py-1 font-semibold ${quedan
          ? 'border-ambar-fuerte/60 bg-ambar/[0.08] text-ambar-texto' : 'border-verde-fuerte/60 bg-verde/[0.08] text-verde-texto'}`}>
          {quedan ? `Hoy te quedan ${quedan}` : '✓ Nada pendiente para hoy'}
        </span>
        {anotadasHoy > 0 && (
          <span className="text-hueso/75">✓ {anotadasHoy} {anotadasHoy === 1 ? 'conversación anotada' : 'conversaciones anotadas'} hoy</span>
        )}
        <AyudaCorta tema="agenda" />
      </p>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <section className={`${marcoGrupo('rosa')} p-3`} aria-label="Contactar">
          <p className={`mb-2 ${TITULO_GRUPO}`}>📞 Contactar · {agenda.contactar.length}</p>
          {agenda.contactar.length === 0 && <p className="text-[14px] text-hueso/60">Nadie a quien contactar esta semana.</p>}
          {contactarHoy.length > 0 && <>{sub('Hoy')}<ul className="space-y-2">{contactarHoy.map(fila)}</ul></>}
          {contactarDespues.length > 0 && <>{sub('Próximos días')}<ul className="space-y-2">{contactarDespues.map(fila)}</ul></>}
        </section>
        <section className={`${marcoGrupo('cielo')} p-3`} aria-label="Por redactar">
          <p className={`mb-2 ${TITULO_GRUPO}`}>✍ Por redactar · {agenda.redactar.length}</p>
          {agenda.redactar.length === 0 && <p className="text-[14px] text-hueso/60">Ninguna cotización por mandar.</p>}
          {redactarHoy.length > 0 && <>{sub('Hoy')}<ul className="space-y-2">{redactarHoy.map(fila)}</ul></>}
          {redactarDespues.length > 0 && <>{sub('Próximos días')}<ul className="space-y-2">{redactarDespues.map(fila)}</ul></>}
          {redactarSinPlazo.length > 0 && (
            <>
              <button type="button" aria-expanded={sinPlazo} onClick={() => setSinPlazo(!sinPlazo)}
                className="boton mt-3 min-h-[40px]">
                Sin plazo · {redactarSinPlazo.length} <span aria-hidden className="ml-1">{sinPlazo ? '▴' : '▾'}</span>
              </button>
              {sinPlazo && <ul className="mt-2 space-y-2">{redactarSinPlazo.map(fila)}</ul>}
            </>
          )}
        </section>
      </div>
      {caer}
    </div>
  );
}

/** Una fila de la agenda: quién, qué toca y los botones para hacerlo ahí mismo. */
function FilaAgenda({ x, hoy, notasPorGrupo, ultimaPorGrupo, puedeTocar, puedeAnotar, onAbrir, onNotas, onCambio, onCayo, soloHoy }:
  PropsAgenda & { x: ItemAgenda; onCayo: (p: Presupuesto) => void }) {
  const soloMira = usarSoloMira('presupuestos');
  const [enviando, setEnviando] = useState(false);
  const p = x.p;
  const frase = fraseDe(x, hoy);
  const toca = puedeTocar(p) && !soloMira;
  const anota = puedeAnotar(p) && !soloMira;
  const notas = notasPorGrupo.get(grupoDe(p)) ?? 0;
  const ultima = ultimaPorGrupo?.get(grupoDe(p));
  const mandada = estaMandada(p.estado) && !p.idReserva;

  async function cambiar(cuerpo: Record<string, unknown>, aviso: string) {
    setEnviando(true);
    try {
      const r = await fetch('/api/presupuestos', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, ...cuerpo })
      });
      const d = await r.json().catch(() => ({}));
      if (d.error) return avisar(d.error, 'atencion');
      avisar(aviso); onCambio();
    } finally { setEnviando(false); }
  }

  const BOTON = 'boton min-h-[44px] lg:min-h-[40px]';
  return (
    <li className={`rounded-lg border-2 bg-panel p-2.5 ${frase.tono === 'rojo' ? 'border-rojo-fuerte/50' : 'border-hueso/15'}`}>
      <button type="button" onClick={() => onAbrir(p, x.tipo === 'redactar' ? 3 : undefined)} className="w-full text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {soloHoy && <span aria-hidden>{x.tipo === 'redactar' ? '✍' : '📞'}</span>}
          <span className="text-[16px] font-semibold">{p.cliente || 'Sin cliente'}</span>
          <EmpresaCliente nombre={p.cliente} empresa={p.empresaCliente} />
          <span className="text-[13px] text-hueso/65">N° {folioDe(p)}</span>
          <PastillaEstado estado={estadoVisible(p, hoy)} />
          {notas > 0 && <span className="text-[13px] text-hueso/65">🗒 {notas}</span>}
        </span>
        <span className={`mt-0.5 block text-[15px] ${TONO[frase.tono]}`}>
          {frase.texto}
          {esFecha(p.fecha) && x.motivo !== 'eventoCerca' && (
            <span className="font-normal text-hueso/60"> · evento {enCorto(p.fecha)}</span>
          )}
        </span>
      </button>
      {anota && ultima && <UltimaNota nota={ultima} compacta className="mt-1.5" />}
      {(toca || anota) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {anota && (
            <button type="button" onClick={() => onNotas(p)}
              className={`${BOTON} !border-oro font-semibold`}>📝 Anotar</button>
          )}
          {toca && x.tipo === 'redactar' && (
            <button type="button" onClick={() => onAbrir(p, 3)} className={BOTON}>✍ Redactarla</button>
          )}
          {toca && x.motivo === 'contratoSinFirmar' && (
            <>
              <button type="button" onClick={() => onAbrir(p, 5)}
                className={`${BOTON} !border-verde-fuerte font-semibold text-verde-texto`}>📎 Sí: subir el firmado</button>
              {!anota && (
                <button type="button" disabled={enviando} className={BOTON}
                  onClick={() => void cambiar({ seguimiento: 'esperando' }, 'Te pregunto de nuevo más adelante')}>Todavía no</button>
              )}
            </>
          )}
          {toca && x.tipo === 'contactar' && x.motivo === 'eventoCerca' && (
            <button type="button" onClick={() => onAbrir(p)}
              className={`${BOTON} !border-verde-fuerte font-semibold text-verde-texto`}>✓ Se ganó</button>
          )}
          {toca && x.tipo === 'contactar' && mandada && x.motivo !== 'contratoSinFirmar'
            && estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.negociacion && (
            <button type="button" disabled={enviando} className={BOTON}
              onClick={() => void cambiar({ estado: ESTADO_PRESUPUESTO.negociacion }, 'Pasó a Negociación')}>Está negociando</button>
          )}
          {toca && enCarrera(p) && (
            <button type="button" onClick={() => onCayo(p)}
              className={`${BOTON} !border-2 !border-rojo-fuerte/50 font-semibold text-rojo-texto
                         hover:!border-rojo-fuerte hover:!text-rojo-texto`}>✕ Se cayó…</button>
          )}
          {/* Quien no anota (no es su vendedor ni la gerencia) posterga como antes. */}
          {toca && !anota && x.tipo === 'contactar' && x.motivo && x.motivo !== 'elegida' && x.motivo !== 'contratoSinFirmar' && (
            <button type="button" disabled={enviando} className={BOTON}
              onClick={() => void cambiar({ seguimiento: 'esperando' }, 'Te pregunto de nuevo más adelante')}>Sigue esperando</button>
          )}
        </div>
      )}
    </li>
  );
}
