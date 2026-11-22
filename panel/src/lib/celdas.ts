/**
 * Lo que se escribe en una celda de la planilla, a salvo de Sheets.
 *
 * **Vive aparte de `sheets.ts` a propósito**, por el mismo motivo que
 * `filas.ts`: acá no se importa `googleapis`, así que esto se puede probar
 * sin red y sin credenciales. Y hace falta probarlo, porque es justo la
 * pieza cuyo error se ve recién en la planilla del cliente, ya escrito.
 */

/**
 * Lo que se le manda a Sheets, **a salvo de que lo lea como fórmula**.
 *
 * `valueInputOption: 'USER_ENTERED'` hace que la API interprete cada celda
 * igual que si alguien la tecleara: un `=`, un `+`, un `-` o un `@` adelante
 * abren una fórmula. Eso destruyó dos datos reales de este proyecto, y los
 * dos en silencio —la celda queda con `#ERROR!` y el panel la lee así:
 *
 * - **El teléfono.** `telefonoNormal()` escribe `+56 9 1234 5678`, y la
 *   planilla guardaba `#ERROR! (Formula parse error.)` en vez del número. Lo
 *   pilló el cliente el 2026-11-01, con una compra de prueba: la columna de
 *   contacto de la reserva decía eso.
 * - **Los ajustes de un turno.** Con dos o más, la celda es `-5000|12000`, y
 *   `|` no es un operador de Sheets: el mismo `#ERROR!`, esta vez sobre
 *   plata que alguien tiene que cobrar.
 *
 * El `'` adelante es la forma que tiene Sheets de decir "esto es texto".
 * **No se guarda ni se lee**: lo que vuelve por la API es el valor tal cual.
 *
 * **Solo se escapa lo que no es un número**, y eso importa: un ajuste de
 * `-5000` solo tiene que seguir siendo el número -5000, porque esta planilla
 * la abre una persona y suma columnas con sus propias fórmulas.
 *
 * Ojo para quien pruebe esto: **la planilla falsa del entorno de desarrollo
 * no puede reproducirlo**. Es un archivo JSON que guarda las cadenas tal
 * cual, así que `-5000|12000` "funciona" ahí y revienta en la planilla de
 * verdad. Por eso lo que lo fija es una prueba sobre `valorSeguro()`.
 */
export function valorSeguro(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  // Un número, con o sin signo, es un número: -5000 se queda como -5000.
  if (v.trim() !== '' && Number.isFinite(Number(v))) return v;
  if (/^[=+\-@]/.test(v)) return `'${v}`;
  // **Una fecha o una hora van como texto** (2026-11-22). `USER_ENTERED`
  // convierte `2026-11-21` en el número de serie de ese día (46347) y `13:00`
  // en 0,5416…, y la celda lo vuelve a mostrar como fecha **solo si tiene
  // formato de fecha**. Una fila agregada justo bajo el encabezado —lo que
  // pasa en toda pestaña recién vaciada con *Dejar la base en cero*— hereda
  // el formato del encabezado, que no es de fecha: queda el número, el panel
  // lo lee como `46347`, no lo reconoce como día y la fila desaparece. Se vio
  // en la planilla de pruebas: los 26 días de la regla escritos y el
  // calendario en cero. Como texto, lo que vuelve es lo que se escribió.
  // Vale para todo lo que parte con un dígito y no es un número: una fecha,
  // una hora, un `2026-11`, un `10%`.
  if (/^\d/.test(v)) return `'${v}`;
  return v;
}

/** Una fila entera, celda por celda. */
export const celdas = (fila: unknown[]) => fila.map(valorSeguro);
