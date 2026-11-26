import type { ReactNode } from 'react';
import Tarjeta from './TarjetaNumero';
import { enPesos } from '@/lib/ocupacion';
import type { ResumenComision } from '@/lib/vendedores';

/**
 * **Un grupo de tarjetas de números** (2026-11-26): un marco más suave que el
 * de una tarjeta abierta, con su rótulo chico arriba —*En curso*, *Por
 * hacer*, *Resultado*, *💰 Tu comisión*—, y las tarjetas en su grilla.
 * `ancho` es cuánto ocupa en la grilla de quien lo pone.
 */
export default function GrupoTarjetas({ titulo, columnas, ancho = '', children }: {
  titulo: string; columnas: string; ancho?: string; children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className={`rounded-xl border-2 border-hueso/25 bg-hueso/[0.03] p-1.5 pt-1 ${ancho}`}>
      <p className="mb-1 px-1 text-[13px] font-semibold uppercase tracking-wider text-hueso/60">{titulo}</p>
      <div className={`grid gap-2 ${columnas}`}>{children}</div>
    </section>
  );
}

/**
 * **💰 La comisión: posible y garantizada** (2026-11-26, lo pidió el cliente:
 * *"comisión debe ser una sección más separada, que muestre la posible ganancia
 * por ganadas y aparte la comisión garantizada (por cotización pagada)"*, y
 * *"esta estadística sirve también para pestaña vendedores y mi resumen"*).
 * **La misma pieza en Cotizaciones → *Lista* y en *Vendedores***; el link
 * personal la dibuja con sus azulejos, sin JavaScript (`mi/[token]/Socio.tsx`).
 * `notaGarantizada` dice de dónde salen: *2 pagadas* en la Lista, *2 pagadas
 * en noviembre* en *Vendedores*.
 */
export function GrupoComision({ titulo, c, notaGarantizada, ancho = '' }: {
  titulo: string; c: ResumenComision; notaGarantizada: string; ancho?: string;
}) {
  return (
    <GrupoTarjetas titulo={titulo} columnas="grid-cols-2" ancho={ancho}>
      <Tarjeta que="Posible" ayuda="listaComisionPosible" valor={enPesos(c.posible)}
        nota={`${c.nPosible} ${c.nPosible === 1 ? 'ganada sin pagar' : 'ganadas sin pagar'}${c.porRevisar
          ? ` · ${c.porRevisar} por revisar` : ''}`}
        tono="border-oro/50 bg-oro/[0.06] text-oro" />
      <Tarjeta que="Garantizada" ayuda="listaComisionGarantizada" valor={enPesos(c.garantizada)}
        nota={notaGarantizada} tono="border-verde-fuerte/40 bg-verde/[0.06] text-verde-texto" />
    </GrupoTarjetas>
  );
}
