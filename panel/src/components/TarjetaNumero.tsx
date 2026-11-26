'use client';

/**
 * **La tarjeta de un número** (2026-11-19): qué es con su `?`, el número
 * grande y una nota. Nació en la Lista de cotizaciones y se compartió cuando
 * llegaron las estadísticas, para que el mismo tipo de dato se vea con la
 * misma pieza (regla de coherencia).
 *
 * - `onClick`: la tarjeta filtra algo; el número es una tecla.
 * - `cambio`: la comparación con el periodo anterior, con flecha y palabra
 *   (no solo color). `bueno` dice si que suba es bueno: el no-show que sube
 *   es malo.
 */
import type { CSSProperties, ReactNode } from 'react';
import AyudaCorta from './AyudaCorta';

export type Cambio = { texto: string; sentido: 'sube' | 'baja' | 'igual' } | null;

export default function TarjetaNumero({ que, valor, nota, tono, ayuda, activa, onClick, cambio, bueno = 'sube', contra, extra }: {
  que: string; valor: string; nota?: string; tono: string; ayuda: string;
  /** Un segundo dato, bajo la nota: la comisión de lo ganado (2026-11-26). */
  extra?: ReactNode;
  activa?: boolean; onClick?: () => void;
  cambio?: Cambio;
  /** Qué dirección es la buena: `sube`, `baja` o `ninguna`. */
  bueno?: 'sube' | 'baja' | 'ninguna';
  /** Contra qué se compara: *octubre 2026*. */
  contra?: string;
}) {
  const colorCambio = !cambio || cambio.sentido === 'igual' || bueno === 'ninguna' ? 'text-hueso/70'
    : cambio.sentido === bueno ? 'text-verde-texto' : 'text-rojo-texto';
  const cuerpo = (
    <>
      {/* **Del tamaño que cabe** (2026-11-26): ver `numero-cabe` en
          `globals.css`. `data-numero` lo usa `revisarDesborde()` para
          probarlo con el número más largo. */}
      <span className="numero-caja">
        <span className="numero-cabe font-bold tabular-nums" data-numero
          style={{ '--n': valor.length } as CSSProperties}>{valor}</span>
      </span>
      {nota && <span className="mt-1 block text-[13px] leading-tight text-hueso/75">{nota}</span>}
      {extra && <span className="mt-1.5 block">{extra}</span>}
      {cambio && (
        <span className={`mt-1 block text-[13px] font-semibold leading-snug ${colorCambio}`}>
          {cambio.texto}{contra && <span className="font-normal text-hueso/60"> vs. {contra}</span>}
        </span>
      )}
    </>
  );
  return (
    // **Un poco menos de aire en pantallas anchas** (2026-11-25): con la
    // tarjeta *Recontactar*, la Lista lleva siete en una fila y *Tasa de
    // cierre* se doblaba en dos renglones —su número quedaba más abajo que el
    // de las otras—. El espaciado entre letras baja de *wider* a *wide* y el
    // margen, desde 1280px, de 12 a 10px. La letra no baja.
    <div className={`min-w-0 rounded-xl border-2 px-3 py-2 xl:px-2.5 ${tono} ${activa ? 'ring-2 ring-oro ring-offset-2 ring-offset-tinta' : ''}`}>
      {/* **El `?` en la esquina de arriba a la derecha** (2026-11-26, lo
          pidió el cliente: *"donde puedes, déjalos en el mismo borde derecho
          arriba dentro de la tarjeta, revisa todo"*): en todas las tarjetas
          en el mismo lugar, mida lo que mida el título. Y el título no se sale
          en un celular de 360px (*Cancelaciones*, *Recontactar*): sin
          espaciado entre letras bajo 640px. */}
      <p className="flex items-start justify-between text-[13px] font-semibold uppercase tracking-normal text-hueso/70 sm:tracking-wide">
        <span className="min-w-0">{que}</span><AyudaCorta tema={ayuda} />
      </p>
      {onClick ? (
        <button type="button" aria-pressed={!!activa} onClick={onClick}
          className="tecla mt-0.5 block min-h-[40px] w-full rounded-lg text-left">
          {cuerpo}
        </button>
      ) : <div className="mt-0.5 min-h-[40px]">{cuerpo}</div>}
    </div>
  );
}
