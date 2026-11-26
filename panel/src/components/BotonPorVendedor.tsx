'use client';

import { useRef, useState } from 'react';
import BuscarEnLista from './BuscarEnLista';

type Opcion = { id: string; nombre: string; detalle?: string };

/**
 * **Filtrar por una persona, con su buscador flotante** (2026-11-26, lo pidió
 * el cliente con una foto del calendario: *"reorganiza los espacios cuando
 * filtro por vendedor… estandarizar el formato para todos los lugares donde se
 * filtra por vendedores, tiene que ser un mini popup o ampliación pero sin
 * desplazarse en el sitio ni abrir un espacio desmedido"*). El buscador
 * (`BuscarEnLista`) se abre **flotando bajo el botón**, sin empujar nada de la
 * página, y se cierra al elegir, con Escape o tocando fuera. Elegido, el botón
 * pasa a *👤 Nombre ✕* y lo suelta.
 *
 * Es la misma pieza en el calendario y la Lista de Cotizaciones, en Clientes y
 * para *🤝 Por socio…*.
 */
export function FiltroConBuscador({ texto, icono, elegido, nombre, cuantos, opciones, onElegir, onSoltar,
  etiqueta, vacia, tono = 'oro' }: {
  /** El botón sin elegir: *👤 Por vendedor…*. */
  texto: string;
  /** El ícono que acompaña al elegido: *👤*. */
  icono: string;
  /** El id elegido, o `''`. */
  elegido: string;
  /** Cómo se llama el elegido, si el id no es el nombre. */
  nombre?: string;
  /** Cuántos quedan con el filtro puesto, si se quiere decir. */
  cuantos?: number;
  opciones: Opcion[];
  onElegir: (id: string) => void;
  onSoltar: () => void;
  etiqueta: string;
  vacia: string;
  tono?: 'oro' | 'cielo';
}) {
  const [abierto, setAbierto] = useState(false);
  // Tocar el botón con el buscador abierto lo cierra (lo cierra el propio
  // buscador, al tocar fuera de él): que el clic no lo vuelva a abrir.
  const cerradoEn = useRef(0);
  if (elegido) {
    return (
      <button type="button" onClick={onSoltar} title="Quitar el filtro"
        className={`boton min-h-[44px] !font-semibold ${tono === 'cielo'
          ? 'border-cielo-fuerte bg-cielo/15 text-cielo-texto' : 'border-oro bg-oro/15 text-oro'}`}>
        {icono} {nombre || elegido}{cuantos !== undefined && <span className="ml-1 tabular-nums">{cuantos}</span>} ✕
      </button>
    );
  }
  return (
    <div className="relative">
      <button type="button" aria-expanded={abierto} aria-haspopup="listbox" className="boton min-h-[44px]"
        onClick={() => { if (Date.now() - cerradoEn.current > 300) setAbierto(!abierto); }}>
        {texto}
      </button>
      {abierto && (
        <div className="absolute left-0 top-full z-40 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-xl shadow-xl">
          <BuscarEnLista etiqueta={etiqueta} vacia={vacia} opciones={opciones}
            onElegir={(id) => { setAbierto(false); onElegir(id); }}
            onCerrar={() => { cerradoEn.current = Date.now(); setAbierto(false); }} />
        </div>
      )}
    </div>
  );
}

/** **👤 Por vendedor…**: la gerencia, pagos y el administrador. */
export default function BotonPorVendedor(props: {
  vendedor: string; nombre?: string; cuantos?: number; opciones: Opcion[];
  onElegir: (id: string) => void; onSoltar: () => void; vacia?: string;
}) {
  return (
    <FiltroConBuscador texto="👤 Por vendedor…" icono="👤" elegido={props.vendedor} nombre={props.nombre}
      cuantos={props.cuantos} opciones={props.opciones} onElegir={props.onElegir} onSoltar={props.onSoltar}
      etiqueta="Buscar vendedor" vacia={props.vacia ?? 'Nadie ha cotizado todavía.'} />
  );
}
