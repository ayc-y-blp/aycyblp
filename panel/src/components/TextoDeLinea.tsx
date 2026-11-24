'use client';

/**
 * **Qué incluye un producto, en esta cotización** (2026-11-24, lo pidió el
 * cliente: *"que este texto solo corresponde a esta cotización. Y si uso el
 * producto en otra cotización de nuevo, me puede mantener el texto propuesto,
 * pero si lo cambio para esta cotización, lo guarda con el texto
 * correspondiente a esta cotización"* y *"lo tengo que poder cambiar dentro de
 * la cotización"*).
 *
 * Se abre con *📝 Qué incluye* en cada línea del paso Productos. Trae el texto
 * de la línea —el que el producto propuso al agregarlo, o el de siempre del
 * sitio— y lo que se escribe acá queda en la línea, que se guarda con la
 * cotización (autoguardado). **El producto y las otras cotizaciones no
 * cambian.**
 *
 * - Escrito igual al texto de siempre, se guarda en blanco (`propioOVacio()`):
 *   así el menú de la casa sigue arriba, en común con las otras alternativas.
 * - *↺ El texto del producto* (o *de siempre*, si el producto no trae uno)
 *   vuelve a lo que propone el producto hoy.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import AyudaCorta from './AyudaCorta';
import { textoDeSiempre, propioOVacio, igualAlProducto } from '@/lib/detalle';

type Partes = { descripcion: string; bebestibles: string };

/** El campo de texto de las ventanas de cotizar (el mismo de `NotasCotizacion`). */
const ENTRADA = 'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none';

export default function TextoDeLinea({ concepto, esMenu, linea, producto, onCambio, onCerrar }: {
  concepto: string;
  /** Un menú lleva también sus bebestibles. */
  esMenu: boolean;
  /** Lo que la línea trae escrito. */
  linea: Partes;
  /** Lo que propone el producto hoy (`textosDelProducto()`), para volver a él. */
  producto: Partes;
  onCambio: (cambio: Partes) => void;
  onCerrar: () => void;
}) {
  const siempre = textoDeSiempre(concepto);
  // Lo que se ve: lo de la línea, o el texto de siempre si la línea va en blanco.
  const enVista = (p: Partes): Partes => ({
    descripcion: p.descripcion || siempre.descripcion,
    bebestibles: p.bebestibles || siempre.bebestibles
  });
  const [texto, setTexto] = useState<Partes>(() => enVista(linea));
  const guardado = (t: Partes): Partes => ({
    descripcion: propioOVacio(concepto, 'descripcion', t.descripcion),
    bebestibles: esMenu ? propioOVacio(concepto, 'bebestibles', t.bebestibles) : ''
  });
  const cambiar = (k: keyof Partes, v: string) => {
    const nuevo = { ...texto, [k]: v };
    setTexto(nuevo);
    onCambio(guardado(nuevo));
  };
  const comoProducto = igualAlProducto(concepto, guardado(texto), producto);
  const productoTrae = !!(producto.descripcion || producto.bebestibles);

  return (
    <Dialogo titulo={`Qué incluye · ${concepto}`} ancho="max-w-2xl lg:max-w-3xl" onCerrar={onCerrar}>
      <p className="mt-1 text-[14px] text-hueso/80">
        Vale solo para esta cotización: el producto y las otras cotizaciones no cambian.{' '}
        <span className="inline-block align-middle"><AyudaCorta tema="textoDeLinea" /></span>
      </p>
      <div className="mt-3 space-y-3">
        <div className="fila-ficha">
          <p className="rotulo-ficha sm:pt-2">Qué incluye</p>
          <textarea rows={siempre.bebestibles ? 11 : 5} className={`${ENTRADA} resize-y leading-snug`}
            aria-label="Qué incluye" maxLength={1500} value={texto.descripcion}
            placeholder={siempre.descripcion
              ? 'En blanco va el texto de siempre.'
              : 'En blanco, la cotización no lo detalla. Ej.: Entrada: … · Plato principal: …'}
            onChange={(e) => cambiar('descripcion', e.target.value)} />
        </div>
        {esMenu && (
          <div className="fila-ficha">
            <p className="rotulo-ficha sm:pt-2">Bebestibles</p>
            <textarea rows={3} className={`${ENTRADA} resize-y leading-snug`}
              aria-label="Bebestibles" maxLength={1500} value={texto.bebestibles}
              placeholder={siempre.bebestibles ? 'En blanco van los de siempre.' : 'En blanco, sin bebestibles aparte.'}
              onChange={(e) => cambiar('bebestibles', e.target.value)} />
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {!comoProducto && (
          <button type="button" className="boton mr-auto min-h-[44px]"
            onClick={() => { setTexto(enVista(producto)); onCambio(guardado(enVista(producto))); }}>
            ↺ {productoTrae ? 'El texto del producto' : 'El texto de siempre'}
          </button>
        )}
        <button type="button" className="boton boton-relleno min-h-[44px]" onClick={onCerrar}>✓ Listo</button>
      </div>
    </Dialogo>
  );
}
