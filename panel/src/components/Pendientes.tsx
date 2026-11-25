'use client';
/**
 * **Los pendientes, en una fila de pastillas** (2026-11-13, lo pidió el
 * cliente mirando Cotizaciones: los avisos apilados, cada uno con su fila de
 * pastillas, *"se anotan como lista Excel"* y empujaban el calendario a tres
 * pantallas en el celular).
 *
 * - **Una pastilla por tipo**, con su número y su ícono, **en orden de
 *   urgencia**: lo que tiene algo vencido va primero y con fondo rojo suave.
 * - **Apretar una abre su lista ahí mismo, una a la vez**; apretarla de nuevo
 *   la cierra. Cerradas, todas ocupan una o dos líneas.
 * - **La lista son filas cortas** (`FilaPendiente`): quién, lo que importa y
 *   *Abrir →*.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import AyudaCorta from './AyudaCorta';
import EmpresaCliente from './EmpresaCliente';

export type TonoPendiente = 'rojo' | 'ambar' | 'verde' | 'rosa' | 'neutro';

export interface Pendiente {
  clave: string;
  icono: string;
  /** *"5 cobros por revisar"*. */
  texto: string;
  /** *"1 vencido"*: va al lado, más fuerte. */
  urgente?: string;
  tono: TonoPendiente;
  /** Una frase que dice qué hacer, arriba de la lista abierta. */
  ayuda?: string;
  lista: React.ReactNode;
}

const PASTILLA: Record<TonoPendiente, string> = {
  rojo: 'border-rojo-fuerte/70 bg-rojo/10 text-rojo-texto',
  ambar: 'border-ambar-fuerte/60 bg-ambar/[0.08] text-ambar-texto',
  verde: 'border-verde-fuerte/60 bg-verde/[0.08] text-verde-texto',
  rosa: 'border-rosa-fuerte/50 bg-rosa/[0.08] text-rosa-texto',
  neutro: 'border-hueso/25 bg-panel text-hueso/85'
};
const CAJA: Record<TonoPendiente, string> = {
  rojo: 'border-rojo-fuerte/50 bg-rojo/[0.06]',
  ambar: 'border-ambar-fuerte/40 bg-ambar/[0.05]',
  verde: 'border-verde-fuerte/40 bg-verde/[0.05]',
  rosa: 'border-rosa-fuerte/40 bg-rosa/[0.05]',
  neutro: 'border-hueso/20 bg-panel'
};

/*
 * `enFila` (2026-11-21, el computador más compacto): desde 1024px las
 * pastillas van en la fila de botones de la pantalla —la pantalla la arma con
 * `lg:flex lg:flex-wrap`— y la lista que se abre, debajo, a todo el ancho.
 * La caja de esta pieza desaparece (`lg:contents`) y sus dos partes pasan a
 * ser de esa fila. En el celular no cambia nada.
 *
 * **Si no caben, bajan enteras a su propia fila** (2026-11-25, lo marcó el
 * cliente con una foto del computador de un vendedor: *📋 Lista* había bajado
 * sola a una segunda fila). Las pastillas cambian de largo según el día; con
 * una fila que se dobla, lo que iba después de ellas —*Mías*, *Sin fecha*,
 * *Lista*— bajaba, y con dos pastillas bajaba en cualquier pantalla. Ahora la
 * fila marca `data-fila="barra"` y sus botones fijos `data-fila="fija"`:
 * `usarCabeEnLaFila()` suma sus anchos con el de las pastillas y, si no caben,
 * las pastillas pasan debajo, a todo el ancho, y los botones fijos no se
 * mueven de su lugar.
 */
export default function Pendientes({ items, titulo = 'Pendientes', enFila = false }: {
  items: Pendiente[]; titulo?: string; enFila?: boolean;
}) {
  const [abierta, setAbierta] = useState('');
  const grupo = useRef<HTMLDivElement>(null);
  const abajo = usarCabeEnLaFila(grupo, enFila && items.length > 0);
  if (!items.length) return null;
  const abiertaItem = items.find((x) => x.clave === abierta);
  return (
    <div className={`mb-4 ${enFila ? 'lg:contents' : 'lg:mb-3'}`}>
      <div ref={grupo} className={`flex flex-wrap items-center gap-2 ${enFila ? (abajo ? 'lg:order-5 lg:basis-full' : 'lg:order-2') : ''}`}
        role="group" aria-label={titulo}>
        <span className="text-[13px] font-semibold uppercase tracking-widest text-hueso/65">{titulo}</span>
        {items.map((x) => (
          <button key={x.clave} type="button" aria-expanded={abierta === x.clave}
            onClick={() => setAbierta(abierta === x.clave ? '' : x.clave)}
            className={`tecla inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-2 px-3 text-[14px] font-semibold
              ${PASTILLA[x.tono]} ${abierta === x.clave ? 'ring-2 ring-oro/60' : ''}`}>
            <span aria-hidden>{x.icono}</span>{x.texto}
            {x.urgente && <span className="rounded-full bg-rojo-fuerte px-1.5 text-[13px] font-bold text-white">{x.urgente}</span>}
            <span aria-hidden className="text-[13px] opacity-70">{abierta === x.clave ? '▴' : '▾'}</span>
          </button>
        ))}
      </div>
      {abiertaItem && (
        <div className={`mt-2 rounded-xl border-2 p-2 ${enFila ? 'lg:order-6 lg:mt-0 lg:basis-full' : ''} ${CAJA[abiertaItem.tono]}`}>
          {/* Qué hacer con estos, en su `?` (2026-11-21, regla *lo que explica
              va en su ?*). */}
          {abiertaItem.ayuda && (
            <p className="flex items-center gap-1.5 px-1 pb-2 text-[14px] font-semibold">
              {abiertaItem.texto} <AyudaCorta titulo={abiertaItem.texto}>{abiertaItem.ayuda}</AyudaCorta>
            </p>
          )}
          {abiertaItem.lista}
        </div>
      )}
    </div>
  );
}

/**
 * ¿Caben las pastillas en la fila de botones? Suma el ancho de los botones
 * fijos de la fila (`data-fila="fija"`), el de las pastillas y los espacios
 * entre ellos (la fila va con `gap-2`: 8px) y lo compara con el ancho de la
 * fila. **Mide el ancho natural de cada pastilla**, que es el mismo esté arriba
 * o abajo: por eso no salta de un lado a otro. Solo desde 1024px, que es donde
 * la fila existe.
 */
function usarCabeEnLaFila(grupo: RefObject<HTMLDivElement | null>, activo: boolean): boolean {
  const [abajo, setAbajo] = useState(false);
  const medir = useRef<() => void>(() => {});
  medir.current = () => {
    const g = grupo.current;
    const fila = g?.closest<HTMLElement>('[data-fila="barra"]');
    if (!activo || !g || !fila || !window.matchMedia('(min-width: 1024px)').matches) { setAbajo(false); return; }
    const ESPACIO = 8;
    const fijos = [...fila.querySelectorAll<HTMLElement>('[data-fila="fija"]')].filter((x) => x.offsetWidth > 0);
    const partes = [...g.children].map((x) => (x as HTMLElement).offsetWidth);
    const pastillas = partes.reduce((a, b) => a + b, 0) + ESPACIO * Math.max(0, partes.length - 1);
    const botones = fijos.reduce((a, x) => a + x.offsetWidth, 0);
    // Los botones, el espacio que empuja a la derecha y las pastillas: n + 2
    // piezas, n + 1 espacios.
    setAbajo(botones + pastillas + ESPACIO * (fijos.length + 1) > fila.clientWidth);
  };
  // Después de cada dibujo: cambian las pastillas, *Mías 4* pasa a *Mías 12*…
  useEffect(() => { medir.current(); });
  // Y cuando cambia el ancho de la ventana.
  useEffect(() => {
    const fila = grupo.current?.closest('[data-fila="barra"]');
    if (!activo || !fila || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => medir.current());
    ro.observe(fila);
    return () => ro.disconnect();
  }, [activo, grupo]);
  return abajo;
}

/** Una fila corta de una lista de pendientes: quién, el dato y *Abrir →*. */
export function FilaPendiente({ quien, empresa, dato, rojo = false, onAbrir }: {
  quien: string;
  /** La empresa del cliente, al lado del nombre (2026-11-25): `EmpresaCliente`. */
  empresa?: string;
  dato: string; rojo?: boolean; onAbrir: () => void;
}) {
  return (
    <button type="button" onClick={onAbrir}
      className={`tecla flex min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border bg-panel px-3 py-1.5 text-left
        hover:border-oro ${rojo ? 'border-rojo-fuerte/60' : 'border-hueso/15'}`}>
      <span className="text-[15px] font-semibold">{quien}</span>
      <EmpresaCliente nombre={quien} empresa={empresa} />
      <span className={`text-[14px] ${rojo ? 'font-semibold text-rojo-texto' : 'text-hueso/75'}`}>{dato}</span>
      <span className="ml-auto text-[14px] font-semibold text-oro">Abrir →</span>
    </button>
  );
}
