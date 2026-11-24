/**
 * **Qué incluye cada producto, en la cotización** (2026-11-24, lo pidió el
 * cliente: *"que se desglose el detalle del producto en la cotización, que
 * incluye qué servicio, qué significa barra abierta… tiene que realizar
 * siempre el menú, la mesa, la comida, es el mismo menú, entonces esto puedes
 * dejarlo arriba de una cotización como un desglose general… y luego
 * especificas abajo el producto cotizado en alternativa A o alternativa B.
 * ¿Qué cambia?… Y eso para todos los links"*).
 *
 * **Los textos salen del sitio público**, tal como están escritos ahí
 * (`experiencias.html`, `eventos.html`, `dossier.html`): el menú de cuatro
 * tiempos, que es el mismo en todos los menús de adulto, y lo propio de cada
 * producto. No se inventa nada: un producto que el sitio no describe (el
 * arriendo, un extra nuevo) no lleva detalle. **Si cambia el texto en el
 * sitio, se cambia también acá.**
 *
 * Es puro, sin la planilla: lo usa la página de la cotización
 * (`/presupuesto/<token>`), que es la misma del link, del WhatsApp, del correo
 * y del PDF.
 */
import { normalizar } from './columnas.ts';

/** El menú de cuatro tiempos, igual en todos los menús de adulto (`experiencias.html`). */
export const MENU_CASA_DEL_SITIO = [
  'Entrada: Tabla campestre (1 cada 4 personas): sopaipillas, pan amasado, pebre casero, nachos caseros y mantequilla saborizada.',
  'Plato principal: 1 porción de 300 g o 2 de 150 g, a carbón y leña: tapabarriga angus, salmón del Pacífico, lomo vetado o liso al rescoldo, cordero patagónico, punta de picana al vino tinto, costillar de cerdo o pollo asado.',
  'Acompañamientos: 2 opciones por invitado: vegetales al rescoldo, papas nativas chilotas, papas fritas o inglesas, pastelera de choclo, arroz blanco, papas mayo, ensalada chilena, hojas verdes, ensalada de quinoa, ceviche de cochayuyo o espinacas a la crema.',
  'Postre: 1 opción: mote con huesillo, frutas de estación, panqueques con manjar, leche asada, torta de milhojas o crumble de manzana.'
].join('\n');

const BAR_ABIERTO = 'Bebestibles: bar abierto: bebidas, jugos naturales, cervezas, pisco sour, sangría, copa de vino reserva, michelada, chelada, Aperol o Ramazzotti spritz, a libre elección.';
const DESAYUNO = 'Pan amasado, huevos revueltos, tapaditos de jamón y queso, café de grano, té, jugo natural de naranja, ensalada de fruta y muffin.';
const PARRILLA = 'Técnicas de parrilla junto a expertos asadores, para fortalecer vínculos de equipo.';

/**
 * Lo propio de cada producto, tal como lo dice el sitio. `casa`: lleva el menú
 * de cuatro tiempos. **Sommelier** dice en el sitio *"bar abierto, misma
 * libertad que Brasas"*: acá va la lista entera, porque una cotización puede
 * no traer Brasas.
 */
export const DETALLE_DEL_SITIO: Record<string, { detalle: string; casa?: boolean }> = {
  'tradiciones': { casa: true, detalle: 'Bebestibles: elección de 1 opción: bebidas, jugos de fruta natural, cervezas o pisco sour.' },
  'lo pirque': { casa: true, detalle: 'Bebestibles: elección de 2 opciones: bebidas, jugos naturales, cervezas, pisco sour, sangría, copa de vino reserva, michelada, chelada, Aperol o Ramazzotti spritz.' },
  'a brasas abiertas': { casa: true, detalle: BAR_ABIERTO },
  'brasas': { casa: true, detalle: BAR_ABIERTO },
  'sommelier': { casa: true, detalle: `${BAR_ABIERTO}\nSommelier: guía el almuerzo, comparte maridajes y datos de cada vino.` },
  'ninos': { detalle: 'De 4 a 12 años.\nPlato principal: 150 g de pollo, costillar o punta picana.\nAcompañamientos: 2 a elección: papas fritas, arroz o ensalada chilena.\nPostre: 1 a elección.\nBebestible: 1 incluido: lata de bebida o vaso de jugo natural.' },
  'pequenos': { detalle: 'De 0 a 3 años.\nPlato principal: 150 g de pollo o punta picana.\nAcompañamientos: arroz o papas fritas, y ensalada.' },
  'show ecuestre': { detalle: 'Caballos chilenos, tradición huasa y bailes típicos.' },
  'desayuno de campo': { detalle: DESAYUNO },
  'once campesina': { detalle: `Misma propuesta que el desayuno de campo, en formato once: ${DESAYUNO.charAt(0).toLowerCase()}${DESAYUNO.slice(1)}` },
  'coaching con caballos': { detalle: 'Liderazgo, comunicación y trabajo en equipo junto a Fundación Caballos y Personas.' },
  'taller de queso': { detalle: 'Cada alumno elabora y se lleva sus propios quesos, con degustación final maridada.' },
  'karting': { detalle: 'Velocidad y trabajo en equipo, ideal para team building corporativo.' },
  'taller de asado': { detalle: PARRILLA },
  'clase de parrilla': { detalle: PARRILLA }
};

/** El nombre sin *Menú* delante: *Menú Niños* es *Niños*. */
const clave = (nombre: string) => normalizar(nombre).replace(/^menu (de )?/, '');

/** Palabras que no distinguen un producto de otro (las de `productoParecido()`). */
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'con', 'para', 'a', 'al', 'por', 'menu']);
const palabrasDe = (t: string) => normalizar(t).split(/[^a-z0-9]+/).filter((x) => x && !VACIAS.has(x))
  .map((x) => (x.length > 3 && x.endsWith('s') ? x.slice(0, -1) : x));

/**
 * **El texto del sitio que le corresponde a un producto, aunque no se llame
 * igual**: en producción el desayuno se llama *Desayuno* y en el sitio
 * *Desayuno de campo*. Primero el nombre tal cual; si no, **un nombre dentro
 * del otro** —todas las palabras de uno están en el otro, con dos de
 * diferencia a lo más, y ninguna que sea *sin* o *no*—, la misma regla del
 * importador (`productoParecido()`). Si calzan varios, el que deja menos
 * palabras sueltas, y solo si es uno: si no, no se adivina.
 */
export function textoDelSitio(nombre: string): { detalle: string; casa?: boolean } | undefined {
  const exacto = DETALLE_DEL_SITIO[clave(nombre)];
  if (exacto) return exacto;
  const suyas = palabrasDe(nombre);
  if (!suyas.length) return undefined;
  const sobran = (chico: string[], grande: string[]) => {
    if (!chico.every((x) => grande.includes(x))) return -1;
    const resto = grande.filter((x) => !chico.includes(x));
    return resto.length <= 2 && !resto.some((x) => x === 'sin' || x === 'no') ? resto.length : -1;
  };
  const candidatos = Object.keys(DETALLE_DEL_SITIO).map((k) => {
    const delSitio = palabrasDe(k);
    const a = sobran(delSitio, suyas), b = sobran(suyas, delSitio);
    return { k, sobran: Math.max(a, b) >= 0 ? Math.min(...[a, b].filter((x) => x >= 0)) : -1 };
  }).filter((c) => c.sobran >= 0).sort((x, y) => x.sobran - y.sobran);
  if (!candidatos.length) return undefined;
  if (candidatos.length > 1 && candidatos[1].sobran === candidatos[0].sobran) return undefined;
  return DETALLE_DEL_SITIO[candidatos[0].k];
}

/** Lo que un producto trae escrito para sí (`Menu.descripcion` y `Menu.bebestibles`). */
export interface DetallePropio { descripcion?: string; bebestibles?: string }

/**
 * **El detalle de un producto: lo propio si está, el del sitio si no**
 * (2026-11-24, lo pidió el cliente: *"si se rellena, corre el campo. Si no se
 * rellena, corre la descripción del menú estándar"*, en dos campos: *"uno
 * para el menú y uno para bebestibles"*). Cada campo reemplaza **su parte**:
 *
 * - **La descripción** reemplaza la comida. En un menú de adulto la comida
 *   estándar es el menú de la casa (los cuatro tiempos, que van arriba,
 *   `casa`): con descripción propia, ese producto ya no lo lleva. En otro
 *   producto, reemplaza su texto entero.
 * - **Los bebestibles** reemplazan los del menú (en uno de adulto, su texto del
 *   sitio son justamente los bebestibles). Van con *Bebestibles:* adelante si
 *   no lo traen.
 *
 * Sin nada propio y sin texto en el sitio, no hay detalle.
 */
export function detalleDe(nombre: string, propio?: DetallePropio): { detalle: string; casa: boolean } | undefined {
  const delSitio = textoDelSitio(nombre);
  const descripcion = String(propio?.descripcion ?? '').trim();
  const bebestibles = String(propio?.bebestibles ?? '').trim();
  if (!descripcion && !bebestibles) return delSitio ? { detalle: delSitio.detalle, casa: !!delSitio.casa } : undefined;
  const conCasa = !!delSitio?.casa;
  // La comida: la propia; si no, en un menú con casa va arriba, y en otro, su texto del sitio.
  const comida = descripcion || (conCasa ? '' : delSitio?.detalle ?? '');
  const bebidas = bebestibles
    ? (/^bebestibles?\s*:/i.test(bebestibles) ? bebestibles : `Bebestibles: ${bebestibles}`)
    : (conCasa ? delSitio!.detalle : '');
  const detalle = [comida, bebidas].filter(Boolean).join('\n');
  const casa = !descripcion && conCasa;
  return detalle || casa ? { detalle, casa } : undefined;
}

/** Un renglón *"Nombre: texto"* partido en dos, para dibujarlo en columnas. */
export function partes(renglon: string): { que: string; dice: string } {
  const m = renglon.match(/^([^:]{2,30}):\s*(.+)$/);
  return m ? { que: m[1], dice: m[2] } : { que: '', dice: renglon };
}

export interface ProductoDetallado { nombre: string; detalle: string }

/**
 * **El desglose de la cotización**: arriba, lo que tienen todas las
 * alternativas (el menú de la casa si algún menú lo lleva, y cada producto que
 * está en todas); en cada alternativa, solo lo que la distingue. Con una sola,
 * todo va arriba. Un producto sin texto en el sitio no aparece.
 */
export function desglose(
  alternativas: { id: string; conceptos: string[] }[],
  /**
   * El catálogo, para lo que cada producto trae escrito (2026-11-24). Se busca
   * por nombre, sin tildes ni mayúsculas. Sin catálogo, solo el texto del sitio.
   */
  catalogo: ({ nombre: string } & DetallePropio)[] = []
): { casa: boolean; comunes: ProductoDetallado[]; propios: Record<string, ProductoDetallado[]> } {
  const propioDe = (n: string) => catalogo.find((m) => normalizar(m.nombre) === normalizar(n));
  const detalle = (n: string) => detalleDe(n, propioDe(n));
  const todas = alternativas.map((a) => [...new Set(a.conceptos.map((n) => n.trim()).filter(Boolean))]);
  const enTodas = (n: string) => todas.every((lista) => lista.some((x) => normalizar(x) === normalizar(n)));
  const vistos = new Set<string>();
  const comunes: ProductoDetallado[] = [];
  let casa = false;
  for (const lista of todas) for (const n of lista) {
    const t = detalle(n);
    if (t?.casa) casa = true;
    if (!t?.detalle || !enTodas(n) || vistos.has(normalizar(n))) continue;
    vistos.add(normalizar(n));
    comunes.push({ nombre: n, detalle: t.detalle });
  }
  const propios: Record<string, ProductoDetallado[]> = {};
  alternativas.forEach((a, i) => {
    propios[a.id] = todas[i].filter((n) => !enTodas(n))
      .flatMap((n) => { const t = detalle(n); return t?.detalle ? [{ nombre: n, detalle: t.detalle }] : []; });
  });
  return { casa, comunes, propios };
}
