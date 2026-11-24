/**
 * **La tabla de una cotización: sus líneas en neto y, abajo, neto,
 * descuento, IVA y total.** La usan la hoja de la cotización y el contrato
 * (2026-11-10), y por eso vive acá: así el contrato no puede decir un precio
 * distinto del que el cliente aprobó — que es justo lo que pasaba en el CRM
 * del socio, que perdía el descuento al armar el contrato.
 */
import { netoDeLinea, otrasEmpresas, IVA, type Cuentas, type LineaPresupuesto } from '@/lib/presupuestos';
import { enUF } from '@/lib/uf';
import { enPesos } from '@/lib/ocupacion';

export default function TablaCotizacion({ lineas, cuentas, descuento, uf, fechaUF }: {
  lineas: LineaPresupuesto[];
  cuentas: Cuentas;
  /** El descuento sobre el total, en %. */
  descuento: number;
  uf: number;
  fechaUF: string;
}) {
  const tasaIVA = Math.round(IVA * 100);
  const precioNeto = (precio: number, ivaIncluido: boolean) =>
    Math.round(ivaIncluido ? precio / (1 + IVA) : precio);
  const p = { descuento, uf, fechaUF };
  // **Lo que cobra otra empresa va aparte** (2026-11-23): el karting no está
  // en nuestro total, así que tampoco en estas líneas. Va debajo, con quién
  // lo cobra y cuánto queda el día entero.
  const otras = otrasEmpresas(lineas);
  const deOtras = lineas.filter((l) => String(l.loCobra ?? '').trim());
  lineas = lineas.filter((l) => !String(l.loCobra ?? '').trim());
  return (
    <>
      {/* **La tabla se desplaza de lado dentro de su caja**, como las del
          panel, y lleva `relative` por lo mismo: sin eso la página entera se
          corría 11px a 393px —venía así de antes— y un documento que se
          abre en un teléfono no puede empezar movido. Al imprimir la caja
          deja de recortar: la hoja es mucho más ancha y la tabla entra.
          **Y en un teléfono cabe entera** (2026-11-24): desplazarla de lado no
          se notaba y la tabla se leía cortada (*SUBTOTAL NET*, *$2.882.35*).
          Bajo 640px, *Cant.* en vez de *Cantidad*, la letra a 13px, 6px entre columnas en vez
          de 12, sin espaciado de letras en la cabecera y el total a 16px (20
          desde 640px). Cabe entera desde 360px de ancho. El computador, el
          contrato impreso y el PDF, igual. */}
      <div className="relative overflow-x-auto caja-tabla">
      <table className="w-full text-[13px] sm:text-sm">
        <thead className="text-left text-[13px] font-semibold uppercase
                          text-hueso/60 sm:tracking-wide">
          <tr className="border-b border-hueso/20">
            <th className="py-2 pr-1.5 sm:pr-3">Concepto</th>
            <th className="py-2 pr-1.5 text-right sm:pr-3">
              <span className="sm:hidden" aria-hidden>Cant.</span>
              <span className="sr-only sm:not-sr-only">Cantidad</span>
            </th>
            <th className="py-2 pr-1.5 text-right sm:pr-3">Precio neto</th>
            <th className="py-2 text-right">Subtotal neto</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={i} className="border-b border-hueso/10">
              <td className="py-2.5 pr-1.5 sm:pr-3">
                {l.concepto}
                {l.precioUF > 0 && (
                  <span className="ml-1 text-hueso/60">({enUF(l.precioUF)} c/u)</span>
                )}
                {l.precio === 0 && <span className="text-hueso/60"> · incluido</span>}
                {l.descuento > 0 && <span className="text-hueso/60"> · {l.descuento}% de descuento</span>}
              </td>
              <td className="py-2.5 pr-1.5 text-right tabular-nums sm:pr-3">{l.cantidad}</td>
              <td className="py-2.5 pr-1.5 text-right tabular-nums sm:pr-3">{enPesos(precioNeto(l.precio, l.ivaIncluido))}</td>
              <td className="py-2.5 text-right tabular-nums">{enPesos(Math.round(netoDeLinea(l)))}</td>
            </tr>
          ))}
          {lineas.length === 0 && (
            <tr><td colSpan={4} className="py-4 text-hueso/60">
              Todavía no hay nada cotizado.
            </td></tr>
          )}
        </tbody>
        {/* **El desglose va sobre el total y no línea por línea**: la suma
            de los netos de cada línea no da el neto del total, y dos netos
            distintos en una misma hoja es justo lo que no puede pasar en un
            documento que va a la contabilidad de una empresa. El total es el
            que manda —es lo que se cobra— y por eso sigue siendo el número
            grande y en dorado. */}
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 pr-3 text-right text-sm text-hueso/70">
              Neto
            </td>
            <td className="pt-4 text-right text-sm tabular-nums text-hueso/70">
              {enPesos(cuentas.subtotal)}
            </td>
          </tr>
          {cuentas.descuento > 0 && (
            <>
              <tr>
                <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
                  Descuento {p.descuento}%
                </td>
                <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
                  −{enPesos(cuentas.descuento)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
                  Neto con descuento
                </td>
                <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
                  {enPesos(cuentas.neto)}
                </td>
              </tr>
            </>
          )}
          <tr>
            <td colSpan={3} className="pr-3 pt-1 text-right text-sm text-hueso/70">
              IVA {tasaIVA}%
            </td>
            <td className="pt-1 text-right text-sm tabular-nums text-hueso/70">
              {enPesos(cuentas.iva)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="border-t border-hueso/20 pr-3 pt-2 text-right
                                       text-sm font-semibold">
              Total
            </td>
            <td className="border-t border-hueso/20 pt-2 text-right text-base
                           font-bold tabular-nums text-oro sm:text-xl">
              {enPesos(cuentas.total)}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>

      {/* **Que los precios incluyen IVA se dice con palabras, no solo con el
          desglose.** Un presupuesto que va a una empresa lo lee alguien que,
          si no está dicho, le suma 19% encima por costumbre — y nos deja
          fuera de presupuesto por un impuesto que ya estaba cobrado. */}
      <p className="mt-3 text-[13px] font-semibold text-hueso/70">
        Los precios de cada línea son netos: el IVA se suma al final.
      </p>
      {otras.length > 0 && (
        <div className="mt-4 rounded border border-hueso/25 px-3 py-2 text-sm">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-hueso/60">
            Aparte: lo cobra otra empresa
          </p>
          {/* Con su detalle (2026-11-23, lo pidió el cliente): cuánto, a qué
              precio y quién lo cobra, para que el cliente sepa con quién lo paga. */}
          {deOtras.map((l, i) => (
            <p key={i} className="mt-1 flex flex-wrap justify-between gap-x-4">
              <span>{l.cantidad > 1 ? `${l.cantidad} × ` : ''}{l.concepto}
                <span className="text-hueso/70"> · {enPesos(l.precio)}{l.ivaIncluido ? ' con IVA' : ' + IVA'} c/u</span>
                {' '}· <strong>lo cobra {l.loCobra}</strong></span>
              <span className="tabular-nums">{enPesos(Math.round(netoDeLinea(l) * (1 + IVA)))} con IVA</span>
            </p>
          ))}
          <p className="mt-1 flex justify-between gap-x-4 border-t border-hueso/15 pt-1 font-semibold">
            <span>El día completo, con lo de otras empresas</span>
            <span className="tabular-nums">{enPesos(cuentas.total + otras.reduce((n, o) => n + o.total, 0))}</span>
          </p>
        </div>
      )}
      {p.uf > 0 && lineas.some((l) => l.precioUF > 0) && (
        <p className="mt-1 text-[13px] text-hueso/70">
          Los valores en UF se convirtieron con la UF del {p.fechaUF}: {enPesos(p.uf)}.
        </p>
      )}

    </>
  );
}
