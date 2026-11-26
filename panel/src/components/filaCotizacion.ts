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
 * deben tener el mismo diseño, más marcado"*). Letra seminegrita; el de la
 * vista que se está mirando, relleno en dorado claro.
 *
 * **Con el marco de la vista** (el mismo día, lo pidió el cliente: *"volver a
 * calendario y lista necesitan marcos más marcados, tienen que ser los marcos de
 * la vista"*, y *"ambos comandos tienen que tener más peso visualmente"*): 3px
 * en dorado entero, un tinte dorado apenas, la sombra de los marcos de grupo y la
 * letra en negrita de 16px. Es la excepción a *botones con 2px o menos*: lo pidió
 * el cliente para estos tres, porque cambian la pantalla entera. El de la vista
 * que se mira va con más tinte (`!bg-oro/25`). *+ Cotizar* sigue siendo el único
 * relleno.
 */
export const BOTON_VISTA = 'boton min-h-[48px] !border-[3px] !border-oro bg-oro/[0.07] shadow-md !text-[16px] !font-bold lg:min-h-[44px]';
