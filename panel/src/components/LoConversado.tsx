'use client';

/**
 * **Lo conversado: cuántos contactos van, el próximo y la última nota**
 * (2026-11-23, al pie de *Seguimiento y envío*; pieza propia desde el
 * 2026-11-25). Lo pidió el cliente: *"se tiene que mostrar el último, no el
 * primer comentario, en paso 2 Evento y paso 4 Envío y en todos lados"*.
 * Ahora es una pieza propia, al pie del paso 4; la última nota sola
 * (`UltimaNota`) va también en la ficha del cliente y en la Agenda, y en los
 * cinco pasos, dentro del botón *🗒 Notas* de la cotización (en el paso 2 un
 * bloque aparte no cabía en 1280×650).
 *
 * - *Contactos · N* y *📝 Anotar*, que abre la ventanita de las notas.
 * - *📞* cuándo toca el próximo, con la misma frase de la agenda.
 * - **Solo la última nota** (`ultimaNota()`: la más nueva, y con la misma
 *   hora, la anotada después). Las demás están en *🗒 Notas*.
 *
 * La nota se ve a quien las lee (su vendedor y la gerencia); el próximo
 * contacto, a todos los que abren la cotización.
 */
import AyudaCorta from './AyudaCorta';
import { iconoDeMedio, QUIEN_CRM, type Nota } from '@/lib/notas';
import { enCorto, esFecha } from '@/lib/fechas';

const TONO_FRASE = { rojo: 'font-semibold text-rojo-texto', ambar: 'font-semibold text-ambar-texto', neutro: 'text-hueso/80' } as const;

export default function LoConversado({ veNotas, cuantas, ultima, frase, onAnotar }: {
  veNotas: boolean; cuantas: number; ultima?: Pick<Nota, 'cuando' | 'medio' | 'quien' | 'nota'>;
  frase: { texto: string; tono: keyof typeof TONO_FRASE } | null;
  onAnotar: () => void;
}) {
  return (
    <div className="border-t border-hueso/10 pt-2">
      <p className="mb-1 flex items-center text-[13px] font-medium uppercase tracking-wide text-hueso/60">
        {/* *Lo conversado · 3 contactos* se partía en dos renglones en la columna. */}
        {veNotas ? <>Contactos · {cuantas}</> : 'Próximo contacto'}
        {veNotas && <AyudaCorta tema="notas" />}
        {veNotas && (
          <button type="button" onClick={onAnotar}
            className="boton ml-auto min-h-[40px] !border-oro font-semibold normal-case tracking-normal lg:min-h-[36px]">
            📝 Anotar
          </button>
        )}
      </p>
      <p className={`text-[14px] ${frase ? TONO_FRASE[frase.tono] : 'text-hueso/60'}`}>
        <span aria-hidden>📞 </span>{frase ? frase.texto : 'Sin próximo contacto: elígelo al anotar'}
      </p>
      {veNotas && ultima && <UltimaNota nota={ultima} className="mt-1.5" />}
    </div>
  );
}

/**
 * **La última nota, en su cajita**: cuándo, por dónde y quién, y el texto en
 * dos o tres renglones. La misma en la cotización, la ficha del cliente y la
 * Agenda (`compacta`: un renglón de texto). La que vino del CRM antiguo dice
 * *Del CRM antiguo*.
 */
export function UltimaNota({ nota, compacta = false, className = '', cotizacion = '' }: {
  nota: Pick<Nota, 'cuando' | 'medio' | 'quien' | 'nota'>; compacta?: boolean; className?: string;
  /** De qué cotización es (*N° 420000*): en la ficha de un cliente con varias. */
  cotizacion?: string;
}) {
  const dia = nota.cuando.slice(0, 10);
  const delCrm = nota.quien === QUIEN_CRM;
  return (
    <div className={`rounded-lg border border-hueso/15 bg-panel px-3 py-1.5 ${className}`}>
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-hueso/65">
        <span>Última nota{esFecha(dia) ? ` · ${enCorto(dia)}` : ''}</span>
        {nota.medio && <span><span aria-hidden>{iconoDeMedio(nota.medio)} </span>{nota.medio}</span>}
        <span>· <b className="text-hueso/85">{delCrm ? 'Del CRM antiguo' : nota.quien || '—'}</b></span>
        {cotizacion && <span className="font-semibold text-hueso/80">· {cotizacion}</span>}
      </p>
      <p className={`mt-0.5 whitespace-pre-wrap break-words text-[14px] ${compacta ? 'line-clamp-1' : 'line-clamp-3 lg:line-clamp-2'}`}>
        {nota.nota}
      </p>
    </div>
  );
}
