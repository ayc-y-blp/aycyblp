/**
 * El cliente de Google Sheets. Corre SOLO en el servidor: la clave privada
 * de la service account no puede llegar al navegador.
 */
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import { AsyncLocalStorage } from 'node:async_hooks';
import { celdas } from './celdas.ts';
import { conEmpresa, empresaActual, empresaDeLaPeticion, porEmpresa } from './empresa.ts';

// La planilla, y los eventos del calendario. El segundo se agregó el
// 2026-10-21 al jubilar el Apps Script, que era quien los creaba.
//
// Es `calendar.events` y no `calendar` a propósito: alcanza para crear y
// editar eventos del calendario que se nos haya compartido, y no para
// crear, borrar ni listar calendarios de la cuenta.
const ALCANCE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
  // Los comprobantes de pago (2026-11-10). `drive.file` y no `drive`: el
  // panel solo ve los archivos y carpetas que él mismo creó, no el resto de
  // la unidad compartida.
  'https://www.googleapis.com/auth/drive.file'
];

interface Pedida { hoja: string; res: (f: string[][]) => void; rej: (e: unknown) => void }

/**
 * Lo que esta instancia recuerda de la planilla, **por empresa**
 * (2026-11-23): cada una tiene su cliente, su credencial, su lista de
 * pestañas y sus lecturas en vuelo. Ver `porEmpresa()`.
 */
const memoria = porEmpresa(() => ({
  cliente: null as sheets_v4.Sheets | null,
  credencial: null as InstanceType<typeof google.auth.JWT> | null,
  /** El título real de cada pestaña. */
  titulos: null as Map<string, string> | null,
  /** El id de cada pestaña por su título real: no cambia nunca. */
  ids: new Map<string, number>(),
  /** El nombre del libro entero (*Pruebas*, o el de la planilla real). */
  nombreLibro: '',
  titulosEnVuelo: null as Promise<Map<string, string>> | null,
  lecturas: new Map<string, Promise<string[][]>>(),
  tanda: null as Map<string, Pedida> | null
}));

export function idPlanilla(): string {
  const id = empresaActual().planilla;
  if (!id) throw new Error('Falta GOOGLE_SHEET_ID en el entorno.');
  return id;
}

/**
 * La cuenta de servicio, una sola para la planilla y el calendario.
 *
 * Está aparte porque el calendario también la usa: tener dos credenciales
 * con la misma clave privada sería dos lugares donde equivocarse.
 */
export function autenticacion() {
  const m = memoria();
  if (m.credencial) return m.credencial;

  const { correo: email, clave } = empresaActual().cuenta;
  if (!email || !clave) {
    throw new Error(
      'Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY. Ver .env.example.'
    );
  }

  m.credencial = new google.auth.JWT({
    email,
    // En un .env los saltos de línea van como \n literales. Si no se
    // deshacen, la librería falla con un error de clave inválida que no
    // dice nada sobre el verdadero motivo.
    key: clave.replace(/\\n/g, '\n'),
    scopes: ALCANCE
  });
  return m.credencial;
}

export function sheets(): sheets_v4.Sheets {
  const m = memoria();
  if (!m.cliente) m.cliente = google.sheets({ version: 'v4', auth: autenticacion() });
  return m.cliente;
}

/**
 * El título REAL de una pestaña, buscándolo sin distinguir mayúsculas ni
 * tildes.
 *
 * Existe porque los nombres de pestaña en la API SÍ distinguen mayúsculas:
 * pedir "Fechas Hábiles" cuando la pestaña se llama "Fechas hábiles" falla
 * con "Unable to parse range", que no dice nada sobre la hache. Pasó en la
 * primera conexión real.
 *
 * Se consulta una vez y se recuerda. **Pero una pestaña que no está en lo
 * recordado se vuelve a buscar antes de darla por inexistente**, y eso no es
 * una precaución teórica: arregla un error que se vio en producción el
 * 2026-10-22.
 *
 * El panel corre en varias instancias a la vez y cada una recuerda lo suyo
 * mientras vive. La instancia A crea la pestaña `Turnos` la primera vez que
 * se guarda un equipo; la instancia B ya había mirado el libro antes y sigue
 * creyendo que no existe. Desde ahí, en B:
 *
 * - leer turnos devuelve vacío **en silencio** —el `catch` de `leerTurnos()`
 *   no distingue "no hay pestaña" de "no pude leerla"—, así que el día se ve
 *   sin equipo aunque esté guardado;
 * - y guardar falla con `addSheet: A sheet with the name "Turnos" already
 *   exists`, que es la pestaña que la propia planilla ya tiene.
 *
 * Volver a mirar cuesta una llamada, y solo cuando no se encontró.
 */

function clave(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function leerTitulos(): Promise<Map<string, string>> {
  const m = memoria();
  // Varias lecturas que llegan juntas a una instancia recién prendida
  // comparten la misma consulta del libro.
  if (!m.titulosEnVuelo) {
    m.titulosEnVuelo = leerTitulosYa();
    const p = m.titulosEnVuelo;
    const soltar = () => { if (m.titulosEnVuelo === p) m.titulosEnVuelo = null; };
    p.then(soltar, soltar);
  }
  return m.titulosEnVuelo;
}

async function leerTitulosYa(): Promise<Map<string, string>> {
  // La memoria se toma antes de esperar a Google: es la de quien preguntó.
  const m = memoria();
  const libro = await conReintento(() => sheets().spreadsheets.get({
    spreadsheetId: idPlanilla(), fields: 'properties.title,sheets.properties(title,sheetId)'
  }));
  m.nombreLibro = String(libro.data.properties?.title ?? '');
  m.ids = new Map((libro.data.sheets ?? [])
    .filter((s) => s.properties?.title && s.properties.sheetId != null)
    .map((s) => [s.properties!.title!, s.properties!.sheetId!]));
  m.titulos = new Map(
    (libro.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => !!t)
      .map((t) => [clave(t), t])
  );
  return m.titulos;
}

/**
 * **Cómo se llama la planilla a la que está conectado el panel** (2026-11-21,
 * para *Dejar la base en cero*: antes de borrar hay que ver, con su nombre,
 * si es la copia de pruebas o la real). Viene en la misma consulta de los
 * títulos de las pestañas, que cada instancia hace una vez: no es una lectura
 * más. Vacío si Google no lo dice.
 */
export async function nombreDeLaPlanilla(): Promise<string> {
  if (!memoria().titulos) await leerTitulos();
  return memoria().nombreLibro;
}

/**
 * Si el error es "esa pestaña no existe" y no otra cosa.
 *
 * Lo usan los lectores que tienen un valor por defecto —puestos, menús,
 * configuración— para distinguir **una planilla recién creada**, donde la
 * pestaña todavía no está y el defecto es correcto, de **una falla de
 * verdad**, donde devolver el defecto sería mostrar datos que no son.
 */
export function esPestanaQueNoExiste(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith('No hay ninguna pestaña llamada');
}

export async function nombreReal(
  hoja: string,
  /**
   * La lista de pestañas se acaba de leer (2026-11-21): no se vuelve a mirar.
   * Lo usa una tanda que ya preguntó por una pestaña que no existe: las tres
   * de importar, antes de subirlas, gastaban una lectura del libro cada una.
   */
  reciente = false
): Promise<string> {
  let mapa = memoria().titulos;
  // Si hubo que leer el libro recién, lo que dice es de ahora mismo y no hay
  // nada que volver a mirar.
  let alDia = reciente;
  if (!mapa) { mapa = await leerTitulos(); alDia = true; }

  let real = mapa.get(clave(hoja));
  // No estaba en lo que recordábamos. Puede que la pestaña se haya creado
  // después —otra instancia, o alguien a mano en la planilla—, así que se
  // mira una vez más antes de decir que no existe.
  if (!real && !alDia) {
    mapa = await leerTitulos();
    real = mapa.get(clave(hoja));
  }
  if (!real) {
    throw new Error(
      `No hay ninguna pestaña llamada "${hoja}" en la planilla. ` +
      `Las que hay: ${[...mapa.values()].join(', ')}.`
    );
  }
  return real;
}

/**
 * **El límite de Google, dicho en español** (2026-11-12). La API de Sheets
 * deja 60 lecturas por minuto **para la cuenta del panel**, que es una sola
 * para todos los que lo usan. Pasado eso responde 429 con un texto en
 * inglés que en pantalla no le dice nada a nadie. Lo que importa saber es
 * que no se perdió nada y que en medio minuto vuelve a andar.
 */
export const MENSAJE_LIMITE =
  'La planilla de Google recibió demasiadas consultas en este minuto. Espera unos ' +
  '30 segundos: lo que ya estaba guardado no se perdió, y lo que falta se reintenta.';

export function esLimiteDeGoogle(e: unknown): boolean {
  const x = e as { code?: number; status?: number; message?: string } | null;
  return x?.code === 429 || x?.status === 429 || /quota exceeded/i.test(String(x?.message ?? ''));
}

/**
 * **Las lecturas se juntan** (2026-11-12). La API de Sheets cobra el cupo
 * por consulta, no por pestaña: pedir siete pestañas en un `batchGet` cuesta
 * **una** lectura, y pedirlas de a una cuesta siete. Abrir el calendario
 * llegó a gastar 20 de las 60 que hay por minuto para todo el panel.
 *
 * Funciona así: la primera lectura que llega abre una **tanda** y espera unos
 * milisegundos; todas las que lleguen mientras tanto —las de un
 * `Promise.all`, o las de otra petición que entró al mismo tiempo— van en la
 * misma consulta. Dos lecturas de la misma pestaña en la misma tanda, o
 * mientras otra está en vuelo, comparten la respuesta.
 *
 * **No se recuerda nada entre peticiones.** Se probó guardar lo leído tres
 * segundos y se sacó el mismo día: en Vercel cada ruta corre aparte, así que
 * una escritura en una ruta no le borraba el recuerdo a otra, y *Marcar
 * ganada* volvía a aparecer en una cotización ya ganada. Dentro de UNA
 * petición sí se recuerda —ver `conLecturas()`—, porque ahí no hay otra
 * instancia que escriba sin avisar.
 */
/** Cuánto espera una tanda a que lleguen las demás lecturas. */
const ESPERA_TANDA = 8;

/**
 * Lo leído dentro de una petición. Lo abre `conLecturas()`; fuera de ella no
 * hay ámbito y cada lectura va a la planilla.
 */
const ambito = new AsyncLocalStorage<Map<string, Promise<string[][]>>>();

/**
 * Envuelve una ruta para que **lo que ya leyó en esta petición no lo vuelva a
 * leer**. Un autoguardado de una cotización leía la pestaña de cotizaciones
 * dos veces, y la configuración, y los menús… Lo que la propia petición
 * escribe se olvida en el acto, así que nunca lee un dato suyo viejo.
 *
 * `precargar` son las pestañas que la ruta va a necesitar: se piden juntas al
 * entrar, en una sola consulta, aunque después se lean de a una.
 */
export function conLecturas<A extends unknown[], R>(
  precargar: string[], fn: (...a: A) => Promise<R>
): (...a: A) => Promise<R> {
  const correr = (...a: A) => ambito.run(new Map(), () => {
    for (const h of precargar) leerHoja(h).catch(() => {});
    return fn(...a);
  });
  // **La dirección dice de qué empresa es la petición** (2026-11-23): toda
  // ruta pasa por acá, así que es donde se fija. Lo que no trae una petición
  // adelante —las pruebas— sigue con la empresa que ya había.
  return (...a: A) => {
    const req = a[0] as unknown;
    return req instanceof Request ? conEmpresa(empresaDeLaPeticion(req), () => correr(...a)) : correr(...a);
  };
}

/**
 * La llave de una pestaña en lo recordado de la petición: **con su empresa**
 * (2026-11-23). Una petición puede leer la lista de cuentas de la casa
 * estando en otra empresa, y las dos tienen una pestaña con el mismo nombre.
 */
const enPeticion = (hoja: string) => `${empresaActual().id}\n${clave(hoja)}`;

function olvidar(hoja: string) {
  memoria().lecturas.delete(clave(hoja));
  ambito.getStore()?.delete(enPeticion(hoja));
}

/** Espera y vuelve a intentar si Google dice que se pasó del límite. */
async function conReintento<T>(fn: () => Promise<T>): Promise<T> {
  // Cortas a propósito: una petición no puede quedarse esperando el minuto
  // entero, y el cupo se va liberando de a poco.
  const esperas = [1500, 4000];
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (!esLimiteDeGoogle(e)) throw e;
      if (i >= esperas.length) throw new Error(MENSAJE_LIMITE);
      await new Promise((r) => setTimeout(r, esperas[i]));
    }
  }
}

async function despachar(): Promise<void> {
  const m = memoria();
  const pedidas = [...(m.tanda?.values() ?? [])];
  m.tanda = null;
  // El nombre real de cada pestaña. Una que no existe falla sola, sin
  // arrastrar a las demás.
  const listas: (Pedida & { real: string })[] = [];
  // La primera que no aparece hace mirar el libro de nuevo; desde ahí la
  // lista está al día para el resto de esta tanda. **Solo si de verdad no
  // existe**: ese error sale después de haber leído el libro. Con cualquier
  // otra falla —el límite de Google— la lista puede seguir vieja, y darla
  // por buena haría pasar por inexistente una pestaña que sí está.
  let reciente = false;
  for (const x of pedidas) {
    try { listas.push({ ...x, real: await nombreReal(x.hoja, reciente) }); }
    catch (e) { if (esPestanaQueNoExiste(e)) reciente = true; x.rej(e); }
  }
  if (!listas.length) return;
  try {
    const res = await conReintento(() => sheets().spreadsheets.values.batchGet({
      spreadsheetId: idPlanilla(),
      ranges: listas.map((x) => `'${x.real}'`),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    }));
    const rangos = res.data.valueRanges ?? [];
    listas.forEach((x, i) => x.res((rangos[i]?.values ?? [])
      .map((f) => f.map((c) => (c == null ? '' : String(c))))));
  } catch (e) {
    for (const x of listas) x.rej(e);
  }
}

/** Pide una pestaña: se suma a la tanda abierta, o abre una. */
function pedir(hoja: string): Promise<string[][]> {
  const k = clave(hoja);
  const m = memoria();
  const { lecturas } = m;
  const hay = lecturas.get(k);
  if (hay) return hay;
  // El reloj hereda la empresa de quien abrió la tanda: `despachar()` lee su
  // memoria y su planilla, no las de otra.
  if (!m.tanda) { m.tanda = new Map(); setTimeout(() => void despachar(), ESPERA_TANDA); }
  const tanda = m.tanda;
  const ya = tanda.get(k);
  const filas = new Promise<string[][]>((res, rej) => {
    if (!ya) tanda.set(k, { hoja, res, rej });
    else tanda.set(k, {
      hoja,
      res: (f) => { ya.res(f); res(f); },
      rej: (e) => { ya.rej(e); rej(e); }
    });
  });
  lecturas.set(k, filas);
  // Contestó (bien o mal): la siguiente lectura vuelve a preguntar.
  const soltar = () => { if (lecturas.get(k) === filas) lecturas.delete(k); };
  filas.then(soltar, soltar);
  return filas;
}

/**
 * Lee una hoja entera. Devuelve [] si está vacía.
 *
 * `fresca` se salta lo recordado en la petición: es para las lecturas que
 * buscan **en qué fila escribir**. Ahí un número de fila de hace un segundo
 * puede ser otra fila si alguien borró una entremedio.
 */
export async function leerHoja(hoja: string, fresca = false): Promise<string[][]> {
  const k = enPeticion(hoja);
  const recuerdo = ambito.getStore();
  let filas = !fresca ? recuerdo?.get(k) : undefined;
  if (!filas) {
    filas = pedir(hoja);
    if (recuerdo) {
      recuerdo.set(k, filas);
      const p = filas;
      p.catch(() => { if (recuerdo.get(k) === p) recuerdo.delete(k); });
    }
  }
  // Copias, para que quien la modifique no le cambie la fila a otro.
  return (await filas).map((f) => [...f]);
}

/**
 * Solo la primera fila, para saber si la pestaña tiene encabezado sin
 * traerla entera. Es lo que usa la bitácora, que crece con cada acción.
 */
export async function leerEncabezado(hoja: string): Promise<string[]> {
  const res = await conReintento(async () => sheets().spreadsheets.values.get({
    spreadsheetId: idPlanilla(),
    range: `'${await nombreReal(hoja)}'!1:1`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  }));
  return (res.data.values?.[0] ?? []).map((c) => (c == null ? '' : String(c)));
}

/** El id interno de una pestaña, sin leer el libro entero cada vez. */
async function idDeHoja(hoja: string): Promise<number> {
  const real = await nombreReal(hoja);
  if (!memoria().ids.has(real)) await leerTitulos();
  const id = memoria().ids.get(real);
  if (id == null) throw new Error(`No existe la hoja "${hoja}" en la planilla.`);
  return id;
}

/** Agrega una fila al final. */
export async function agregarFila(hoja: string, fila: unknown[]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    await conReintento(async () => sheets().spreadsheets.values.append({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [celdas(fila)] }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Agrega una fila al final de una pestaña de **otra planilla** (2026-11-12):
 * los comentarios del equipo van a la planilla del testeo del cliente, no a
 * la del panel. **No gasta lecturas**: el nombre de la pestaña va tal cual
 * en el rango, sin pedir la lista de títulos. La misma cuenta de servicio, el
 * mismo reintento ante un 429 y la misma protección contra lo que parece
 * fórmula (`celdas()`).
 */
export async function agregarFilaEnOtraPlanilla(
  spreadsheetId: string, hoja: string, fila: unknown[]
): Promise<void> {
  try {
    await conReintento(() => sheets().spreadsheets.values.append({
      spreadsheetId,
      range: `'${hoja.replace(/'/g, "''")}'!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [celdas(fila)] }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  }
}

/** La letra de una columna desde 0: 0 → A, 25 → Z, 26 → AA. */
export function letraDeColumna(n: number): string {
  let s = '';
  for (let k = n + 1; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
  return s;
}

/**
 * **Escribe celdas sueltas, en varias pestañas, en una sola llamada**
 * (2026-11-24, para renombrar: `lib/renombrar.ts`). Solo toca las celdas que
 * cambian, no la fila entera: lo que otra persona haya escrito en las demás
 * columnas de esa fila, entre la lectura y esta escritura, no se pisa.
 * `fila` es 1-based, como la ve la planilla; `col`, desde 0.
 */
export async function escribirCeldas(cambios: { hoja: string; fila: number; col: number; valor: unknown }[]): Promise<void> {
  if (!cambios.length) return;
  const hojas = [...new Set(cambios.map((c) => c.hoja))];
  hojas.forEach(olvidar);
  try {
    const titulos = new Map<string, string>();
    for (const h of hojas) titulos.set(h, await nombreReal(h));
    await conReintento(async () => sheets().spreadsheets.values.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: cambios.map((c) => ({
          range: `'${titulos.get(c.hoja)!.replace(/'/g, "''")}'!${letraDeColumna(c.col)}${c.fila}`,
          values: [celdas([c.valor])]
        }))
      }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { hojas.forEach(olvidar); }
}

/** Reescribe una fila completa. `fila` es 1-based, como la ve la planilla. */
export async function escribirFila(hoja: string, fila: number, valores: unknown[]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    await conReintento(async () => sheets().spreadsheets.values.update({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'!A${fila}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [celdas(valores)] }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Borra una fila de verdad, corriendo las de abajo.
 *
 * Necesita el id numérico de la hoja, que no es su nombre. Por eso la
 * consulta previa: es la única forma de traducir uno al otro.
 */
export async function borrarFila(hoja: string, fila: number): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    const sheetId = await idDeHoja(hoja);
  
    await conReintento(async () => sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila }
          }
        }]
      }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Crea una pestaña si no existe, y devuelve su título real.
 *
 * El panel la usa para la pestaña `Config`: así no hay que preparar nada a
 * mano antes de guardar la configuración por primera vez. Es segura de
 * repetir.
 */
export async function asegurarHoja(hoja: string): Promise<string> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    try {
      return await nombreReal(hoja);
    } catch {
      try {
        await conReintento(async () => sheets().spreadsheets.batchUpdate({
          spreadsheetId: idPlanilla(),
          requestBody: { requests: [{ addSheet: { properties: { title: hoja } } }] }
        }));
      } catch (e) {
        // "A sheet with the name X already exists": alguien la creó entremedio.
        // Eso es justo lo que queríamos, así que no es un error — pero sí hay
        // que volver a mirar el libro, porque lo que recordábamos ya no sirve.
        memoria().titulos = null;
        return await nombreReal(hoja);
      }
      memoria().titulos = null;          // el cache quedó viejo: ahora hay una pestaña más
      return hoja;
    }
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Reescribe una pestaña entera desde A1, **y borra lo que quede debajo**.
 *
 * Ese segundo paso arregla un error real (2026-10-30): `values.update`
 * escribe las filas que uno le pasa y **deja intactas las de más abajo**,
 * así que sacar a alguien de una lista de cuatro escribía tres filas y la
 * cuarta se quedaba donde estaba. Quien quitaba a un trabajador lo veía
 * desaparecer de la pantalla y encontraba al último **duplicado** en la
 * planilla. Lo mismo valía para los puestos, los menús y los colaboradores:
 * todas las pestañas que se reescriben enteras.
 *
 * **Se escribe primero y se borra después**, en ese orden. Al revés, un
 * fallo entre las dos llamadas dejaría la pestaña vacía; así, lo peor que
 * puede pasar es quedarse con la fila de más, que es exactamente lo que
 * pasaba antes y se corrige al siguiente guardado.
 */
export async function escribirBloque(hoja: string, filas: unknown[][]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    const titulo = await asegurarHoja(hoja);
    await conReintento(async () => sheets().spreadsheets.values.update({
      spreadsheetId: idPlanilla(),
      range: `'${titulo}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: filas.map(celdas) }
    }));
    await conReintento(async () => sheets().spreadsheets.values.clear({
      spreadsheetId: idPlanilla(),
      range: `'${titulo}'!A${filas.length + 1}:ZZ`
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * **Vacía varias pestañas de una vez, dejando su encabezado** (2026-11-18,
 * para el paso a producción: `lib/produccion.ts`). Va en **una** llamada
 * (`batchClear`): o se vacían todas o ninguna. Las que no existen se saltan.
 * Devuelve los títulos que vació.
 */
export async function vaciarHojas(hojas: string[]): Promise<string[]> {
  hojas.forEach(olvidar);
  try {
    const titulos: string[] = [];
    for (const h of hojas) {
      try { titulos.push(await nombreReal(h)); } catch (e) { if (!esPestanaQueNoExiste(e)) throw e; }
    }
    if (!titulos.length) return [];
    await conReintento(async () => sheets().spreadsheets.values.batchClear({
      spreadsheetId: idPlanilla(),
      requestBody: { ranges: titulos.map((t) => `'${t}'!A2:ZZ`) }
    }));
    return titulos;
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { hojas.forEach(olvidar); }
}

/** Una celda leída sin formato: el texto, el número o el sí/no tal cual. */
type ValorCelda = string | number | boolean;

/** Un título de pestaña dentro de un rango A1, con sus comillas escapadas. */
const enRango = (titulo: string) => `'${titulo.replace(/'/g, "''")}'`;

/**
 * **Lee pestañas de otra planilla, y nada más** (2026-11-24, para *Traer los
 * datos de producción* a la versión de prueba: `lib/sincronizar.ts`).
 *
 * Es **lo único que recibe el id de la planilla de producción** en una
 * versión de prueba, y solo pide `spreadsheets.get` y `values.batchGet`: no
 * hay cómo escribir desde acá. Dos lecturas del límite de Google —la lista de
 * pestañas y todas juntas—, de la cuenta de servicio de la empresa.
 *
 * Los valores vuelven **con su tipo** (un número es un número), leídos con
 * las mismas opciones que usa el panel, para copiarlos tal cual: la prueba
 * lee después lo mismo que lee producción. Una pestaña que no existe allá
 * vuelve en `null`.
 */
export async function leerOtraPlanilla(
  spreadsheetId: string, hojas: string[]
): Promise<{ nombre: string; hojas: Map<string, ValorCelda[][] | null> }> {
  try {
    const libro = await conReintento(() => sheets().spreadsheets.get({
      spreadsheetId, fields: 'properties.title,sheets.properties.title'
    }));
    const titulos = new Map((libro.data.sheets ?? [])
      .map((x) => x.properties?.title).filter((t): t is string => !!t).map((t) => [clave(t), t]));
    const salida = new Map<string, ValorCelda[][] | null>(hojas.map((h) => [h, null]));
    const pedidas = hojas.map((hoja) => ({ hoja, real: titulos.get(clave(hoja)) }))
      .filter((x): x is { hoja: string; real: string } => !!x.real);
    if (pedidas.length) {
      const res = await conReintento(() => sheets().spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: pedidas.map((x) => enRango(x.real)),
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      }));
      const rangos = res.data.valueRanges ?? [];
      pedidas.forEach((x, i) => salida.set(x.hoja, ((rangos[i]?.values ?? []) as unknown[][])
        .map((f) => f.map((c) => (typeof c === 'number' || typeof c === 'boolean' ? c : c == null ? '' : String(c))))));
    }
    return { nombre: String(libro.data.properties?.title ?? ''), hojas: salida };
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  }
}

/**
 * **Reemplaza pestañas enteras de la planilla del panel**, tal cual se le dan
 * (2026-11-24, para *Traer los datos de producción*: `lib/sincronizar.ts`).
 *
 * - `copiar`: se crean si faltan, se agrandan si no les caben las filas o las
 *   columnas, se vacían enteras y se escriben desde A1. **Con `RAW`**, sin
 *   `celdas()`: lo que llega ya es lo que la otra planilla tenía, con su tipo
 *   —un texto que empieza con `=` sigue siendo texto—.
 * - `vaciar`: quedan con su encabezado y sin datos.
 *
 * **Vacía primero y escribe después**, al revés que `escribirBloque()`: acá
 * se escribe la copia de pruebas, y si se corta entremedio basta apretar de
 * nuevo. Son tres llamadas que escriben (la estructura, el vaciado y los
 * datos, más un pedido por cada 4 MB) y una lectura, la de cómo es la
 * planilla. Lo que esta instancia recordaba de ella se olvida.
 */
export async function reemplazarPestanas(
  copiar: { hoja: string; filas: ValorCelda[][] }[], vaciar: string[],
  pedidos: (copiar: { hoja: string; filas: ValorCelda[][] }[]) => { hoja: string; desde: number; filas: ValorCelda[][] }[][]
): Promise<void> {
  const todas = [...copiar.map((c) => c.hoja), ...vaciar];
  todas.forEach(olvidar);
  try {
    const libro = await conReintento(() => sheets().spreadsheets.get({
      spreadsheetId: idPlanilla(),
      fields: 'sheets.properties(title,sheetId,gridProperties(rowCount,columnCount))'
    }));
    const hay = new Map((libro.data.sheets ?? []).filter((x) => x.properties?.title)
      .map((x) => [clave(x.properties!.title!), x.properties!]));

    // 1. Que cada pestaña exista y le quepa lo que se escribe.
    const estructura: sheets_v4.Schema$Request[] = [];
    const titulo = new Map<string, string>();
    for (const c of copiar) {
      const filas = c.filas.length;
      const columnas = c.filas.reduce((m, f) => Math.max(m, f.length), 0);
      const p = hay.get(clave(c.hoja));
      if (!p) {
        estructura.push({ addSheet: { properties: {
          title: c.hoja, gridProperties: { rowCount: Math.max(1000, filas + 50), columnCount: Math.max(26, columnas) }
        } } });
        titulo.set(c.hoja, c.hoja);
        continue;
      }
      titulo.set(c.hoja, p.title!);
      const g = p.gridProperties;
      // Sin las medidas (no es una grilla), no se toca.
      if (!g || p.sheetId == null) continue;
      if ((g.rowCount ?? 0) < filas || (g.columnCount ?? 0) < columnas) {
        estructura.push({ updateSheetProperties: {
          properties: { sheetId: p.sheetId, gridProperties: {
            rowCount: Math.max(g.rowCount ?? 0, filas + 50), columnCount: Math.max(g.columnCount ?? 0, columnas)
          } },
          fields: 'gridProperties.rowCount,gridProperties.columnCount'
        } });
      }
    }
    if (estructura.length) {
      await conReintento(() => sheets().spreadsheets.batchUpdate({
        spreadsheetId: idPlanilla(), requestBody: { requests: estructura }
      }));
    }

    // 2. Vaciar: las que se copian, enteras; las otras, bajo el encabezado.
    const rangos = [
      ...copiar.filter((c) => hay.has(clave(c.hoja))).map((c) => enRango(titulo.get(c.hoja)!)),
      ...vaciar.map((h) => hay.get(clave(h))?.title).filter((t): t is string => !!t).map((t) => `${enRango(t)}!A2:ZZ`)
    ];
    if (rangos.length) {
      await conReintento(() => sheets().spreadsheets.values.batchClear({
        spreadsheetId: idPlanilla(), requestBody: { ranges: rangos }
      }));
    }

    // 3. Escribir, tal cual.
    for (const pedido of pedidos(copiar.filter((c) => c.filas.length))) {
      await conReintento(() => sheets().spreadsheets.values.batchUpdate({
        spreadsheetId: idPlanilla(),
        requestBody: {
          valueInputOption: 'RAW',
          data: pedido.map((t) => ({ range: `${enRango(titulo.get(t.hoja)!)}!A${t.desde}`, values: t.filas }))
        }
      }));
    }
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally {
    memoria().titulos = null;
    todas.forEach(olvidar);
  }
}

/**
 * Agrega varias filas de una vez.
 *
 * Una llamada en vez de N: guardar el equipo de un día son diez o quince
 * filas, y quince llamadas a la API serían quince oportunidades de quedar a
 * medio camino.
 */
export async function agregarFilas(hoja: string, filas: unknown[][]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    if (!filas.length) return;
    await conReintento(async () => sheets().spreadsheets.values.append({
      spreadsheetId: idPlanilla(),
      range: `'${await nombreReal(hoja)}'`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: filas.map(celdas) }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Borra varias filas de verdad, corriendo las de abajo.
 *
 * **Las ordena de mayor a menor antes de pedirlas**, y eso no es una
 * optimización: borrar la fila 5 corre la 9 al lugar 8, así que borrar de
 * arriba hacia abajo borraría filas equivocadas. De abajo hacia arriba, cada
 * índice sigue siendo válido cuando le toca.
 *
 * Va todo en un batchUpdate, así que o se borran todas o no se borra
 * ninguna: no puede quedar media reasignación aplicada.
 */
export async function borrarFilas(hoja: string, filas: number[]): Promise<void> {
  // Lo leído de esta pestaña deja de valer, antes y después de escribir.
  olvidar(hoja);
  try {
    const orden = [...new Set(filas)].filter((n) => n > 1).sort((a, b) => b - a);
    if (!orden.length) return;
  
    const sheetId = await idDeHoja(hoja);
  
    await conReintento(async () => sheets().spreadsheets.batchUpdate({
      spreadsheetId: idPlanilla(),
      requestBody: {
        requests: orden.map((fila) => ({
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: fila - 1, endIndex: fila }
          }
        }))
      }
    }));
  } catch (e) {
    if (esLimiteDeGoogle(e)) throw new Error(MENSAJE_LIMITE);
    throw e;
  } finally { olvidar(hoja); }
}

/**
 * Deja la pestaña creada y con su encabezado, y devuelve las filas que tiene.
 *
 * Para las pestañas a las que se les agregan filas de a una, como `Turnos`:
 * `escribirBloque` no sirve ahí porque reescribe desde A1, y acá lo que hace
 * falta es que la primera fila diga los nombres de las columnas y nada más.
 */
/**
 * Deja la columna en el encabezado, y devuelve el encabezado que quedó.
 *
 * Una columna que el panel conoce y la planilla no se lee vacía y **no se
 * escribe en ninguna parte**: `filaReserva()` saltea los índices en -1. Eso
 * está bien para una planilla vieja que todavía no la tiene, y es una trampa
 * en el momento en que alguien escribe algo en ese campo y aprieta Guardar:
 * el formulario dice que guardó y el dato no está en ninguna parte.
 *
 * Por eso la columna se agrega sola la primera vez que hace falta —es lo
 * mismo que hace `asegurarHoja()` con una pestaña—, **al final y sin tocar
 * ninguna celda de datos**. Si ya está, esto no escribe nada.
 */
export async function asegurarColumna(
  hoja: string, encabezado: string[], columna: string
): Promise<string[]> {
  const limpio = (c: unknown) => String(c ?? '').trim().toLowerCase();
  if (encabezado.some((c) => limpio(c) === limpio(columna))) return encabezado;
  const nuevo = [...encabezado, columna];
  await escribirFila(hoja, 1, nuevo);
  return nuevo;
}

export async function asegurarEncabezado(
  hoja: string, encabezado: string[]
): Promise<string[][]> {
  await asegurarHoja(hoja);
  // Fresca: quien pide el encabezado va a buscar en qué fila escribir.
  const filas = await leerHoja(hoja, true);
  if (filas.length > 0 && (filas[0] ?? []).some((c) => String(c).trim() !== '')) {
    return filas;
  }
  await escribirFila(hoja, 1, encabezado);
  return [encabezado];
}
