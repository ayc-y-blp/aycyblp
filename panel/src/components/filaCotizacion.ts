/**
 * **Las filas de cotizaciones, en columnas** (2026-11-26, lo pidió el cliente:
 * *"deja los anuncios de contactar o envío alineados en una columna pero
 * centralizado… porque es lo mismo como la de se cayó a la derecha"*).
 *
 * En el computador la lista es una grilla y cada fila usa las mismas columnas
 * (`subgrid`): el nombre, la empresa, el estado y la fecha; las pastillas
 * (*✉*, *📞*), centradas en la columna que queda en medio; los valores; el
 * N°; y *✕ Se cayó…*. En la segunda línea, el detalle y, bajo los avisos, las
 * alternativas (2026-11-26, *"así más espacio en primera fila"*). Así el mismo dato queda a la misma
 * altura y en la misma columna en todas las filas, mida lo que mida el nombre.
 * Una fila **siempre dibuja sus cinco celdas** (vacías si no tiene ese dato):
 * si falta una, las de la derecha se corren de columna. En el celular, la
 * fila se dobla como antes.
 *
 * **Lo mide `revisarColumnas()`** (`pruebas/alineacion.mjs`, regla del
 * cliente del mismo día): la lista lleva `data-columnas` y cada dato que se
 * repite, `data-columna` (con `data-eje`).
 */
export const LISTA_FILAS = 'space-y-2 lg:grid lg:grid-cols-[auto_minmax(min-content,1fr)_auto_auto_auto] lg:gap-x-3';

/**
 * **Los botones que cambian de vista**: *← Volver al calendario*, *Sin fecha* y
 * *📋 Lista* (2026-11-26, lo pidió el cliente: *"volver al calendario y lista
 * deben tener el mismo diseño, más marcado"*). Borde doble dorado y letra
 * seminegrita; el de la vista que se está mirando, relleno en dorado claro.
 */
export const BOTON_VISTA = 'boton min-h-[48px] !border-2 !border-oro/60 !text-[15px] !font-semibold lg:min-h-[44px]';
