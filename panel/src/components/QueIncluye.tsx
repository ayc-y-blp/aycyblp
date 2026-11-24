/**
 * **Qué incluye cada producto** (2026-11-24, `lib/detalle.ts`): la misma
 * pieza en la cotización que ve el cliente y en el contrato (lo pidió el
 * cliente: *"que en el contrato también aparece… el desglose"*). Los textos
 * salen del sitio; un producto que el sitio no describe no aparece.
 */
import { partes, MENU_CASA_DEL_SITIO, type ProductoDetallado } from '@/lib/detalle';

/**
 * Renglones *"Nombre: texto"* en dos columnas desde 640px; en el celular, de
 * corrido (*Entrada: …*). Un renglón sin nombre va a lo ancho.
 */
function Renglones({ texto }: { texto: string }) {
  return (
    <dl className="mt-1 space-y-1 text-[14px] leading-snug text-hueso/80 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-x-3 sm:gap-y-1 sm:space-y-0">
      {texto.split('\n').filter((r) => r.trim()).map((r, i) => {
        const { que, dice } = partes(r.trim());
        return que
          ? <div key={i} className="sm:contents"><dt className="inline font-semibold text-hueso/70 sm:block">{que}<span className="sm:hidden">: </span></dt><dd className="inline sm:block">{dice}</dd></div>
          : <dd key={i} className="sm:col-span-2">{dice}</dd>;
      })}
    </dl>
  );
}

export function Producto({ p, primero }: { p: ProductoDetallado; primero?: boolean }) {
  return (
    <div className={primero ? 'mt-2' : 'mt-3 border-t border-hueso/10 pt-2'}>
      <p className="text-[15px] font-semibold">{p.nombre}</p>
      <Renglones texto={p.detalle} />
    </div>
  );
}

/**
 * **Qué incluye, arriba de las alternativas** (2026-11-24): el menú de la
 * casa, si algún menú lo lleva, y lo que está en todas. Lo de cada una va en
 * su caja, *Lo que cambia en la B*. Con una sola, todo va acá.
 */
export default function QueIncluye({ casa, comunes, varias }: { casa: boolean; comunes: ProductoDetallado[]; varias: boolean }) {
  if (!casa && !comunes.length) return null;
  return (
    <section className="mt-7 break-inside-avoid rounded-lg border border-hueso/20 p-4">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
        Qué incluye{varias ? ' · igual en todas las alternativas' : ''}
      </p>
      {casa && (
        <div className="mt-2">
          <p className="text-[15px] font-semibold">El menú de la casa <span className="font-normal text-hueso/60">· en cuatro tiempos, el mismo en todos los menús de adulto</span></p>
          <Renglones texto={MENU_CASA_DEL_SITIO} />
        </div>
      )}
      {comunes.map((x, i) => <Producto key={x.nombre} p={x} primero={!casa && i === 0} />)}
    </section>
  );
}

