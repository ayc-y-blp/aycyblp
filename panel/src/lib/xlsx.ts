/**
 * **Leer un Excel (.xlsx) sin librería** (2026-11-21).
 *
 * Lo pidió el cliente al ensayar *Importar del CRM*: el formulario lo mandaba
 * a la planilla de Google a subir el archivo, y ahí Google le pedía acceso
 * (*"cuando aprieto pide acceso a Google Drive. No deja subir el Excel"*).
 * Quien importa no siempre está en el navegador con la cuenta de Google de la
 * planilla, y no tiene por qué: **el Excel se sube desde el mismo
 * formulario**, el navegador lo lee con esto y el panel lo copia a las
 * pestañas de paso.
 *
 * Por qué a mano y no con una librería: un `.xlsx` es un zip con XML
 * adentro, y el navegador ya sabe descomprimir (`DecompressionStream`). Lo
 * que hace falta leer es poco —los nombres de las hojas y el texto de cada
 * celda— y cabe acá; una librería de Excel pesa cientos de kB y trae mucho
 * que no se usa. Corre igual en el navegador y en Node, así que tiene
 * pruebas.
 *
 * **Lee solo valores**: el texto de cada celda, tal cual. No fórmulas (toma
 * su resultado guardado), ni formatos, ni fechas con formato de fecha —esas
 * llegan como el número de Excel, y `fechaDeCelda()` de `importar.ts` lo
 * entiende—. Las hojas del importador llevan las fechas como texto.
 */

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

/** Lo que se le dice a quien sube algo que no es un Excel. */
export const NO_ES_XLSX = 'Ese archivo no es un Excel (.xlsx). Sube «Importar-al-panel.xlsx».';

async function inflar(comprimido: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no puede abrir el Excel. Prueba con Chrome, Edge, Safari o Firefox al día.');
  }
  // Una copia propia: el trozo del archivo puede compartir memoria con el resto.
  const flujo = new Blob([comprimido.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

/** Los archivos de adentro del zip: su nombre y cómo leer cada uno como texto. */
function entradasDelZip(bytes: Uint8Array): Map<string, () => Promise<string>> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // El índice está al final: se busca su firma desde atrás.
  let fin = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (u32(v, i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error(NO_ES_XLSX);
  const cuantas = u16(v, fin + 10);
  let p = u32(v, fin + 16);
  const salida = new Map<string, () => Promise<string>>();
  const utf8 = new TextDecoder('utf-8');
  for (let n = 0; n < cuantas; n++) {
    if (p + 46 > bytes.length || u32(v, p) !== 0x02014b50) throw new Error(NO_ES_XLSX);
    const metodo = u16(v, p + 10);
    const comprimido = u32(v, p + 20);
    const largoNombre = u16(v, p + 28);
    const largoExtra = u16(v, p + 30);
    const largoComentario = u16(v, p + 32);
    const local = u32(v, p + 42);
    const nombre = utf8.decode(bytes.subarray(p + 46, p + 46 + largoNombre));
    salida.set(nombre, async () => {
      if (local + 30 > bytes.length || u32(v, local) !== 0x04034b50) throw new Error(NO_ES_XLSX);
      const desde = local + 30 + u16(v, local + 26) + u16(v, local + 28);
      const trozo = bytes.subarray(desde, desde + comprimido);
      if (metodo === 0) return utf8.decode(trozo);
      if (metodo === 8) return utf8.decode(await inflar(trozo));
      throw new Error(NO_ES_XLSX);
    });
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return salida;
}

const sinEntidades = (t: string) => t
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

const atributo = (etiqueta: string, nombre: string) => {
  const m = new RegExp(`(?:^|\\s)${nombre}="([^"]*)"`).exec(etiqueta);
  return m ? sinEntidades(m[1]) : '';
};

/** El texto de un `<si>` o un `<is>`: todos sus `<t>`, sin la guía fonética. */
const textoDe = (xml: string) => [...xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '')
  .matchAll(/<t(?:\s[^>]*)?\/>|<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
  .map((m) => sinEntidades(m[1] ?? '')).join('');

/** `B` → 1, `AA` → 26: la columna de una referencia como `B7`. */
function columnaDe(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/[^A-Za-z]/g, '').toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Las filas de una hoja, como texto. Los huecos quedan en blanco. */
function filasDeLaHoja(xml: string, compartidos: string[]): string[][] {
  const filas: string[][] = [];
  let siguiente = 0;
  // Primero la fila vacía (`<row … />`): si no, la otra forma se la llevaría con la de al lado.
  for (const f of xml.matchAll(/<row\b[^>]*\/>|<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const etiqueta = f[1] ?? f[0];
    const r = Number(atributo(etiqueta, 'r'));
    const n = r > 0 ? r - 1 : siguiente;
    siguiente = n + 1;
    const fila: string[] = [];
    let col = 0;
    for (const c of (f[2] ?? '').matchAll(/<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const atrs = c[1] ?? c[2] ?? '';
      const ref = atributo(atrs, 'r');
      const k = ref ? columnaDe(ref) : col;
      col = k + 1;
      const dentro = c[3] ?? '';
      const tipo = atributo(atrs, 't');
      const crudo = sinEntidades(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(dentro)?.[1] ?? '');
      let valor = crudo;
      if (tipo === 's') valor = compartidos[Number(crudo)] ?? '';
      else if (tipo === 'inlineStr') valor = textoDe(dentro);
      else if (tipo === 'b') valor = crudo === '1' ? 'TRUE' : 'FALSE';
      // Un número llega como lo guardó Excel (`44000.0`, `1.5E6`): se deja como se lee.
      else if (tipo !== 'str' && tipo !== 'e' && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(crudo)) valor = String(Number(crudo));
      if (k < 0 || k > 2000) continue;
      while (fila.length < k) fila.push('');
      fila[k] = valor;
    }
    if (n > 200000) continue;
    while (filas.length < n) filas.push([]);
    filas[n] = fila;
  }
  return filas;
}

/**
 * Las hojas de un `.xlsx`, por su nombre: cada una como filas de texto.
 * Con `solo`, lee nada más las hojas que `solo` acepta: un respaldo trae
 * hojas grandes que no hacen falta.
 */
export async function leerXlsx(
  datos: ArrayBuffer | Uint8Array, solo?: (nombre: string) => boolean
): Promise<Record<string, string[][]>> {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  const zip = entradasDelZip(bytes);
  const leer = async (ruta: string) => { const f = zip.get(ruta); return f ? f() : ''; };
  const libro = await leer('xl/workbook.xml');
  if (!libro) throw new Error(NO_ES_XLSX);
  const destinos = new Map<string, string>();
  for (const m of (await leer('xl/_rels/workbook.xml.rels')).matchAll(/<Relationship\b[^>]*>/g)) {
    const destino = atributo(m[0], 'Target');
    destinos.set(atributo(m[0], 'Id'), destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`);
  }
  let compartidos: string[] | null = null;
  const salida: Record<string, string[][]> = {};
  for (const m of libro.matchAll(/<sheet\b[^>]*>/g)) {
    const nombre = atributo(m[0], 'name');
    const ruta = destinos.get(atributo(m[0], 'r:id'));
    if (!nombre || !ruta || (solo && !solo(nombre))) continue;
    if (!compartidos) {
      compartidos = [...(await leer('xl/sharedStrings.xml')).matchAll(/<si\/>|<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)]
        .map((s) => textoDe(s[1] ?? ''));
    }
    salida[nombre] = filasDeLaHoja(await leer(ruta), compartidos);
  }
  return salida;
}
