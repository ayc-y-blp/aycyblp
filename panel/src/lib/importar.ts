/**
 * **Importar del CRM viejo** (2026-11-21).
 *
 * Lo pidió el cliente al pasar a producción: traer los contactos del CRM del
 * socio *"lo más completa posible, para que los chicos no tengan que hacer
 * muchas cosas de forma manual… Controlarlo, claro"*. Y fijó el alcance:
 * **solo Lo Pirque**; **todos sus clientes** como fichas, también los de
 * eventos pasados, *"para que no haya que ingresar de nuevo el cliente"*; y
 * **todo lo que pasa hacia el futuro**, llevado para acá. Las cotizaciones
 * del pasado no.
 *
 * ## De dónde lee
 *
 * De **pestañas de la misma planilla**, que se llenan desde un Excel de
 * revisión. **El Excel se sube desde el mismo formulario** (`lib/xlsx.ts` lo
 * lee en el navegador y `hojasParaSubir()` valida lo que llega): pedirle a
 * quien importa que lo subiera en Google Sheets lo dejó frente a una pantalla
 * de *pide acceso*. Quien tiene la planilla a mano también puede importarlo
 * ahí (Archivo → Importar → Insertar hojas nuevas); es lo mismo.
 *
 * - `Importar clientes`: una fila por persona.
 * - `Importar cotizaciones`: una fila por conversación con fecha a futuro,
 *   con su estado **ya dicho** en la columna *Estado*.
 *
 * Por qué pestañas y no un archivo que se sube al panel: el panel ya sabe
 * leer la planilla y no sabe leer un Excel (habría que sumar una librería);
 * y, sobre todo, **lo que se va a importar queda a la vista y se corrige ahí
 * mismo** antes de apretar nada, que es el control que pidió el cliente. Los
 * datos de los clientes nunca pasan por el repositorio.
 *
 * ## Cómo calzan las etapas del CRM con las del panel
 *
 * La decisión se toma **al armar el Excel**, y la columna *Estado* la deja
 * escrita fila por fila —se puede cambiar ahí antes de importar—. Acá se
 * aceptan tres estados:
 *
 * | En el CRM | Acá |
 * |---|---|
 * | Nuevo, Contactado | **Candidato**: preguntó y todavía no se le cotiza |
 * | Cotizado | **Borrador**, con los productos y precios del CRM: se revisa y se manda desde acá |
 * | Ganado, con fecha a futuro | **Ganada**, con su reserva: toma cupo |
 * | Perdido, o con el evento ya pasado | solo la ficha, con su historia en la nota |
 *
 * **Una ganada del CRM entra ganada** (lo decidió el cliente el mismo día:
 * *"si hay una cotización ganada en el CRM, entonces se puede guardar como
 * ganada y entonces sí ocuparía cupo en reservas"*). El evento ya está
 * vendido: la gente viene, y el día tiene que saberlo.
 *
 * - **Necesita su día exacto** y gente: sin eso no hay dónde poner la reserva.
 * - **Su reserva nace por pagar**: el CRM no dice qué pagó cada cliente. El
 *   anticipo se anota en la cotización, con su comprobante, y ahí pasa a
 *   abonada y gana la preferencia de quien pagó.
 * - **Si el día queda sobre su cupo, entra igual y se avisa antes de
 *   confirmar**: es la misma salida de siempre —el panel lo muestra como
 *   sobrecupo y alguien amplía el cupo—. Dejarla afuera escondería un evento
 *   que sí viene.
 * - **Un día arrendado en exclusiva a otro no se pisa**: esa fila no entra, y
 *   se dice.
 *
 * **Nunca se importa nada como *Enviada***: echa a correr la vigencia y
 * cuenta gente posible en el calendario por un link que el cliente no ha
 * visto.
 *
 * ## Las reservas del sitio viejo
 *
 * Una tercera pestaña, **opcional**: `Importar reservas`. El sitio viejo
 * vendía la fecha en la variante del producto, sin `_booking_date`, así que
 * el panel no ve esos pedidos (se decidió no enseñarle el modelo viejo:
 * *"se anotan a mano"*). El cliente mandó el export de pedidos de Shopify y
 * preguntó si servía para preparar la producción: sirve para **anotarlos de
 * una vez** en lugar de uno por uno, que es lo mismo sin los errores de tipeo.
 *
 * - Entran como **reservas anotadas a mano** (`MANUAL-…`), con su día, su
 *   gente, su monto y *Pagada* o *Por pagar*. El número del pedido queda en
 *   la nota (`(LP1234)`) y es lo que evita anotarlo dos veces.
 * - **Las pagadas le llegan a pagos para revisar**, como toda reserva
 *   marcada pagada a mano: importar en lote no es haber mirado cada pago.
 * - Toman cupo, y la vista previa lo dice día por día junto con las ganadas.
 *   Un día que no existe se crea **privado**, como al anotar a mano: si se
 *   quiere seguir vendiendo, se pasa a público en el calendario.
 *
 * ## Se puede correr dos veces
 *
 * Una ficha que ya existe —mismo teléfono o mismo correo— no se duplica: la
 * cotización se cuelga de la que hay. Y cada cotización lleva en su nota la
 * referencia de su fila (`(CRM-0042-a)`): si ya hay una con esa referencia,
 * se salta. Así, si la importación se corta a medias, se vuelve a apretar.
 *
 * **Una ganada se escribe primero como borrador y después se gana**, una por
 * una (`ganadas`): si eso último se corta, queda un borrador con su nota y
 * *Marcar ganada* la termina desde Cotizaciones —encuentra la reserva que
 * haya alcanzado a nacer y no la duplica—. Al volver a importar, esa fila se
 * nombra como pendiente en vez de saltarse callada.
 *
 * Este archivo no toca la red: recibe filas y devuelve qué hay que escribir.
 * Lo usan la ruta `/api/mantencion/importar` y las pruebas.
 */
import { normalizar, estaCerrado, ESTADO_PAGO, ASISTENCIA } from './columnas.ts';
import { esFecha } from './fechas.ts';
import { limpiarCliente, faltaEnCliente, parecidos, nuevoIdCliente, type Cliente } from './clientes.ts';
import {
  ESTADO_PRESUPUESTO, estadoNormal, reservaDesdePresupuesto,
  type Presupuesto, type LineaEntrante, type LineaPresupuesto
} from './presupuestos.ts';
import { prepararLineas, productoDe, esDiaPublico, conCliente } from './cotizar.ts';
import { cupoParaGanar } from './dias.ts';
import { ocupaLugar } from './ocupacion.ts';
import { desglosarMenu, componerMenu } from './shopify.ts';
import { telefonoNormal, correoNormal } from './contacto.ts';
import { marcasDePago } from './plata.ts';
import { TIPO_PRODUCTO, type Menu } from './menus.ts';
import type { Usuario } from './usuarios.ts';
import type { Config } from './config.ts';
import type { FechaHabil, Reserva } from './tipos.ts';

export const HOJA_IMPORTAR_CLIENTES = 'Importar clientes';
export const HOJA_IMPORTAR_COTIZACIONES = 'Importar cotizaciones';
/** Opcional: los pedidos del sitio viejo con visita a futuro. */
export const HOJA_IMPORTAR_RESERVAS = 'Importar reservas';

/** Las columnas que se leen de cada pestaña, por nombre. Las demás son para revisar y se ignoran. */
export const COL_IMPORTAR_CLIENTES = {
  ref: 'Ref', nombre: 'Nombre', telefono: 'Teléfono', correo: 'Correo',
  empresa: 'Empresa del cliente', vendedor: 'Vendedor', notas: 'Notas'
} as const;
export const COL_IMPORTAR_COTIZACIONES = {
  ref: 'Ref', refCliente: 'Ref cliente', estado: 'Estado', fecha: 'Fecha del evento', periodo: 'Periodo',
  invitados: 'Invitados', tipoEvento: 'Tipo de evento', vendedor: 'Vendedor', notas: 'Notas', productos: 'Productos'
} as const;

export const COL_IMPORTAR_RESERVAS = {
  ref: 'Ref', fecha: 'Fecha', nombre: 'Nombre', telefono: 'Teléfono', correo: 'Correo',
  menu: 'Menú', personas: 'Personas', monto: 'Monto', pago: 'Pago', nota: 'Nota de pago'
} as const;

/** Cómo se dice el pago de una reserva importada: solo estas dos. */
const PAGO_DE_LA_CELDA: Record<string, string> = {
  pagada: ESTADO_PAGO.pagado, 'por pagar': ESTADO_PAGO.pendiente
};

/** Una reserva lista para escribirse: le faltan el id y cuándo se creó. */
export type ReservaImportada = Omit<Reserva, 'id' | 'fila' | 'creada'>;

/** Un día que toma cupo con esta importación, para la vista previa. Sin datos de clientes. */
export interface DiaImportado {
  fecha: string;
  /** Cuántas reservas del sitio viejo y cuántas ganadas caen en él, y su gente. */
  reservas: number;
  ganadas: number;
  personas: number;
  /** El cupo del día como va a quedar, y lo que tenía libre antes de importar. */
  capacidad: number;
  libres: number;
  /** Personas sobre el cupo que deja la importación. Cero si cabe. */
  sobre: number;
  /** Qué le pasa al día: se crea privado, se reabre uno cerrado, o nada. */
  dia: 'crea' | 'reabre' | '';
}

/** Los únicos estados con que se importa una cotización. Ver arriba. */
const ESTADOS_QUE_ENTRAN: string[] = [ESTADO_PRESUPUESTO.candidato, ESTADO_PRESUPUESTO.borrador, ESTADO_PRESUPUESTO.aceptado];

/**
 * Una cotización que entra **ganada**: lo que hay que hacer después de
 * escribirla, y cómo queda su día. Sin datos del cliente fuera de `reserva`,
 * que no sale del servidor.
 */
export interface GanadaImportada {
  /** El id de su cotización, que ya va en `cotizaciones` como borrador. */
  id: string;
  fecha: string;
  personas: number;
  /** La reserva que hay que crear. */
  reserva: ReservaImportada;
}

export interface VendedorImportado {
  /** Como está escrito en la planilla. */
  nombre: string;
  /** La cuenta del panel que calzó, o vacío. */
  usuario: string;
  fichas: number;
  cotizaciones: number;
}

export interface PlanImportacion {
  /** Las fichas nuevas, con su id ya puesto. */
  fichas: Omit<Cliente, 'fila'>[];
  fichasQueYaEstaban: number;
  cotizaciones: Omit<Presupuesto, 'fila'>[];
  lineas: Omit<LineaPresupuesto, 'fila'>[];
  cotizacionesQueYaEstaban: number;
  candidatos: number;
  borradores: number;
  /** Las que entran ganadas: sus cotizaciones van en `cotizaciones` como borrador, y se ganan una por una. */
  ganadas: GanadaImportada[];
  /** Las reservas del sitio viejo. */
  reservas: ReservaImportada[];
  reservasQueYaEstaban: number;
  /** Cada día que toma cupo, con lo de las reservas y lo de las ganadas junto. */
  dias: DiaImportado[];
  vendedores: VendedorImportado[];
  /** Filas que no entran, dichas por pestaña y número de fila: **sin datos del cliente**. */
  problemas: string[];
  /** Productos de las cotizaciones que no están en *Productos*: entran como línea libre. */
  sinCatalogo: { concepto: string; veces: number }[];
  /** Nombres del CRM que calzaron con un producto que se llama distinto (`productoParecido()`). */
  equivalencias: { de: string; a: string; veces: number }[];
}

const texto = (v: unknown) => String(v ?? '').trim();

/** Las filas de una pestaña como objetos, por el nombre de sus columnas (sin tildes ni mayúsculas). */
function filasPorNombre<T extends Record<string, string>>(filas: string[][], columnas: T) {
  const enc = (filas[0] ?? []).map(normalizar);
  const indice = Object.fromEntries(Object.entries(columnas).map(([k, nombre]) => [k, enc.indexOf(normalizar(nombre))]));
  const faltan = Object.entries(columnas).filter(([k]) => indice[k] < 0).map(([, nombre]) => nombre);
  const datos = filas.slice(1)
    .map((f, i) => ({ fila: i + 2, ...Object.fromEntries(Object.keys(columnas).map((k) => [k, indice[k] < 0 ? '' : texto(f[indice[k]])])) }))
    .filter((f) => Object.keys(columnas).some((k) => (f as Record<string, unknown>)[k]));
  return { datos: datos as ({ fila: number } & Record<keyof T, string>)[], faltan };
}

/**
 * **A qué cuenta del panel corresponde un vendedor del CRM.** Primero el
 * nombre o el usuario tal cual; si no, que uno empiece con el otro por
 * palabras enteras —*Carla* con *Carla Rojas*—, y solo si calza
 * **una** cuenta: con dos Carla no se adivina. Vacío es *sin cuenta*, y
 * así se dice en la vista previa: esa ficha la ven gerencia y administración.
 */
export function cuentaDelVendedor(nombre: string, usuarios: Pick<Usuario, 'nombre' | 'usuario' | 'activo'>[]): string {
  const n = normalizar(nombre);
  if (!n) return '';
  const vivos = usuarios.filter((u) => u.activo !== false);
  const exacto = vivos.filter((u) => normalizar(u.nombre) === n || normalizar(u.usuario) === n);
  if (exacto.length === 1) return exacto[0].usuario;
  if (exacto.length > 1) return '';
  const empieza = (a: string, b: string) => a === b || a.startsWith(b + ' ');
  const cerca = vivos.filter((u) => {
    const un = normalizar(u.nombre);
    return !!un && (empieza(un, n) || empieza(n, un));
  });
  return cerca.length === 1 ? cerca[0].usuario : '';
}

/**
 * Los productos de una cotización, como vienen en su celda: **uno por
 * renglón**, `Producto | cantidad | precio | + IVA`. El cuarto dato es
 * opcional: sin él el precio trae el IVA.
 */
export function productosDeLaCelda(celda: string): { concepto: string; cantidad: number; precio: number; ivaIncluido: boolean }[] {
  const salida = [];
  for (const renglon of celda.split(/\r?\n/)) {
    const [concepto, cantidad, precio, iva] = renglon.split('|').map((x) => x.trim());
    if (!concepto) continue;
    const n = (v: string | undefined) => Math.max(0, Math.round(Number(String(v ?? '').replace(/[^\d]/g, '')) || 0));
    salida.push({ concepto, cantidad: n(cantidad) || 1, precio: n(precio), ivaIncluido: !/\+\s*iva/i.test(iva ?? '') });
  }
  return salida;
}

/** Palabras que no distinguen un producto de otro. *Sin* y *no* no están: cambian lo que es. */
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'con', 'para', 'a', 'al', 'por']);
/** Las palabras que cuentan de un nombre, sin el plural: *Taller de quesos* es *Taller de queso*. */
const palabrasDe = (t: string) => normalizar(t).split(/[^a-z0-9]+/).filter((x) => x && !VACIAS.has(x))
  .map((x) => (x.length > 3 && x.endsWith('s') ? x.slice(0, -1) : x));

/**
 * **El producto del catálogo que corresponde a un nombre del CRM, aunque no
 * se llame igual** (2026-11-21, lo pidió el cliente al ver la lista de los
 * que no calzaban: *"si está arriendo del recinto, eso es claramente
 * arriendo. Y si está el desayuno de campo, eso es desayuno… estos productos
 * existen, solo tienen un poco otro nombre"*).
 *
 * Primero el nombre tal cual. Si no:
 *
 * 1. **Un nombre dentro del otro**: todas las palabras de uno están en el
 *    otro —*Desayuno de campo* con *Desayuno*, *Brasas* con *A Brasas
 *    abiertas*—, con dos palabras de diferencia a lo más, y ninguna que sea
 *    *sin* o *no*: *Barra abierta sin alcohol* no es *Barra abierta*. Sin
 *    mirar el plural.
 * 2. **Un arriendo es el arriendo**: si el nombre dice *arriendo*, el
 *    producto de tipo Arriendo.
 *
 * **Siempre que calce uno solo.** Con dos candidatos —*Arriendo fin de
 * semana* y *Arriendo día de semana*— no se adivina: entra como línea libre
 * y la vista previa lo nombra. Solo mira lo que se puede cotizar y está
 * activo. Lo que calza por acá **se dice en la vista previa**, con los dos
 * nombres, para que quien importa lo controle.
 */
export function productoParecido(concepto: string, menus: Menu[]): Menu | undefined {
  const exacto = productoDe(concepto, menus);
  if (exacto) return exacto;
  const suyas = palabrasDe(concepto);
  if (!suyas.length) return undefined;
  const vivos = menus.filter((m) => m.activo !== false && m.cotizacion !== false);
  const dentro = (chico: string[], grande: string[]) => {
    if (!chico.length || !chico.every((x) => grande.includes(x))) return false;
    const sobran = grande.filter((x) => !chico.includes(x));
    return sobran.length <= 2 && !sobran.some((x) => x === 'sin' || x === 'no');
  };
  const porNombre = vivos.filter((m) => {
    const delProducto = palabrasDe(m.nombre);
    return dentro(delProducto, suyas) || dentro(suyas, delProducto);
  });
  if (porNombre.length) return porNombre.length === 1 ? porNombre[0] : undefined;
  if (suyas.includes('arriendo')) {
    const arriendos = vivos.filter((m) => m.tipo === TIPO_PRODUCTO.arriendo);
    if (arriendos.length === 1) return arriendos[0];
  }
  return undefined;
}

/**
 * **La fecha de una celda, como `AAAA-MM-DD`**, venga como venga escrita.
 * La hoja la trae como texto `2026-12-05`, pero la corrige una persona:
 *
 * - `05-12-2026` o `5/12/2026`, **el día primero**, que es como se escribe
 *   en Chile y como el propio Excel de revisión muestra las fechas;
 * - el número con que Excel guarda una fecha (`46361`), si la celda quedó
 *   con formato de fecha.
 *
 * Lo que no se entiende se devuelve tal cual, y quien llama lo rechaza
 * nombrando la fila. Sin `Date` con huso: son cuentas de días.
 */
export function fechaDeCelda(celda: string): string {
  const t = celda.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const dma = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (dma) return `${dma[3]}-${dma[2].padStart(2, '0')}-${dma[1].padStart(2, '0')}`;
  // El día 1 de Excel es el 1 de enero de 1900; el 25569 es el 1 de enero de 1970.
  if (/^\d{5}(\.0+)?$/.test(t)) return new Date((Math.round(Number(t)) - 25569) * 86400000).toISOString().slice(0, 10);
  return t;
}

/** Cuánto se acepta en una subida: sobra para un CRM chico y frena un archivo equivocado. */
const TOPE_FILAS = 5000;
const TOPE_COLUMNAS = 60;
const TOPE_CELDA = 5000;

/**
 * **Lo que llega de un Excel subido, listo para copiarse a las pestañas de
 * paso.** Acepta solo las tres pestañas del importador, por su nombre (sin
 * mirar tildes ni mayúsculas); las demás hojas del archivo se ignoran. Cada
 * celda queda como texto. Devuelve un error con palabras si el archivo no
 * trae ninguna, si una viene sin su columna `Ref` —es otra cosa con el mismo
 * nombre— o si es demasiado grande.
 */
export function hojasParaSubir(entrada: unknown):
  { hojas: Record<string, string[][]>; filas: Record<string, number> } | { error: string } {
  if (!entrada || typeof entrada !== 'object') return { error: 'No llegó ninguna hoja.' };
  const hojas: Record<string, string[][]> = {};
  const filas: Record<string, number> = {};
  for (const [nombre, valor] of Object.entries(entrada as Record<string, unknown>)) {
    const hoja = [HOJA_IMPORTAR_CLIENTES, HOJA_IMPORTAR_COTIZACIONES, HOJA_IMPORTAR_RESERVAS].find((h) => normalizar(h) === normalizar(nombre));
    if (!hoja || !Array.isArray(valor)) continue;
    if (valor.length > TOPE_FILAS) return { error: `«${hoja}» trae más de ${TOPE_FILAS.toLocaleString('es-CL')} filas: no parece el Excel para importar.` };
    const tabla = valor.map((f) => (Array.isArray(f) ? f : []).map((c) => (c == null ? '' : String(c).trim())));
    if (tabla.some((f) => f.length > TOPE_COLUMNAS || f.some((c) => c.length > TOPE_CELDA))) {
      return { error: `«${hoja}» trae filas demasiado anchas o celdas demasiado largas: no parece el Excel para importar.` };
    }
    // Sin las filas vacías del final; las de entremedio se quedan, para que
    // "fila 7" en un aviso sea la fila 7 del Excel.
    while (tabla.length && !tabla[tabla.length - 1].some(Boolean)) tabla.pop();
    if (!tabla.length) continue;
    if (!tabla[0].some((c) => normalizar(c) === 'ref')) return { error: `«${hoja}» no trae su columna Ref en la primera fila: no es la pestaña del Excel para importar.` };
    hojas[hoja] = tabla;
    filas[hoja] = tabla.slice(1).filter((f) => f.some(Boolean)).length;
  }
  if (!Object.keys(hojas).length) {
    return { error: `Ese Excel no trae ninguna de las pestañas para importar (${HOJA_IMPORTAR_CLIENTES}, ${HOJA_IMPORTAR_COTIZACIONES}, ${HOJA_IMPORTAR_RESERVAS}). El que se sube es «Importar-al-panel.xlsx».` };
  }
  return { hojas, filas };
}

/** La referencia de una fila, como queda en la nota de su cotización: es lo que evita importarla dos veces. */
export const marcaDeImportacion = (ref: string) => `(${ref})`;

export function planDeImportacion(e: {
  filasClientes: string[][];
  filasCotizaciones: string[][];
  /** La pestaña de las reservas del sitio viejo, o vacío si no se subió. */
  filasReservas?: string[][];
  /** Lo que ya hay en el panel. */
  clientes: Cliente[];
  presupuestos: Pick<Presupuesto, 'id' | 'notas' | 'estado' | 'idReserva'>[];
  usuarios: Pick<Usuario, 'nombre' | 'usuario' | 'activo'>[];
  menus: Menu[];
  fechas: Pick<FechaHabil, 'fecha' | 'estado' | 'capacidad'>[];
  /** Las reservas que ya hay: lo tomado de cada día, para decir cómo queda con una ganada. */
  reservas: Reserva[];
  cfg: Pick<Config, 'cupoNormal' | 'horaApertura'>;
  /** Quién importa: dueña de la reserva de una ganada cuyo vendedor no tiene cuenta. */
  quien: string;
  hoy: string;
  /** *2026-11-21 18:30*, para la columna Creado. */
  cuando: string;
  /** El reloj, para los ids de las cotizaciones. */
  ahora: number;
  nuevoToken: () => string;
}): PlanImportacion {
  const problemas: string[] = [];
  const C = filasPorNombre(e.filasClientes, COL_IMPORTAR_CLIENTES);
  const Q = filasPorNombre(e.filasCotizaciones, COL_IMPORTAR_COTIZACIONES);
  // Sin sus columnas no se adivina nada: se dice y no entra ninguna fila de esa pestaña.
  if (e.filasClientes.length && C.faltan.length) problemas.push(`${HOJA_IMPORTAR_CLIENTES}: faltan las columnas ${C.faltan.join(', ')}.`);
  if (e.filasCotizaciones.length && Q.faltan.length) problemas.push(`${HOJA_IMPORTAR_COTIZACIONES}: faltan las columnas ${Q.faltan.join(', ')}.`);
  const filasC = C.faltan.length ? [] : C.datos;
  const filasQ = Q.faltan.length ? [] : Q.datos;

  const vendedores = new Map<string, VendedorImportado>();
  const vendedor = (nombre: string) => {
    const k = normalizar(nombre);
    if (!vendedores.has(k)) vendedores.set(k, { nombre, usuario: cuentaDelVendedor(nombre, e.usuarios), fichas: 0, cotizaciones: 0 });
    return vendedores.get(k)!;
  };

  // --- Las fichas
  const fichas: Omit<Cliente, 'fila'>[] = [];
  /** La referencia de cada fila de cliente → el id de su ficha (nueva o la que ya estaba). */
  const idDeRef = new Map<string, string>();
  let fichasQueYaEstaban = 0;
  for (const f of filasC) {
    const datos = limpiarCliente({ nombre: f.nombre, empresa: f.empresa, telefono: f.telefono, correo: f.correo, notas: f.notas });
    const falta = faltaEnCliente(datos);
    if (falta) { problemas.push(`${HOJA_IMPORTAR_CLIENTES}, fila ${f.fila}: ${falta} No entra.`); continue; }
    // Contra lo que ya hay en el panel **y** contra lo que esta misma pasada va a crear.
    const ya = parecidos(datos, [...e.clientes, ...(fichas as Cliente[])])[0];
    if (ya) {
      if (f.ref) idDeRef.set(f.ref, ya.id);
      // Una ficha de más arriba en la misma pestaña no "ya estaba": es una fila repetida.
      if (e.clientes.some((c) => c.id === ya.id)) fichasQueYaEstaban++;
      else problemas.push(`${HOJA_IMPORTAR_CLIENTES}, fila ${f.fila}: repite el teléfono o el correo de otra fila. Queda una sola ficha.`);
      continue;
    }
    const v = f.vendedor ? vendedor(f.vendedor) : null;
    if (v) v.fichas++;
    const id = nuevoIdCliente([...e.clientes, ...fichas]);
    fichas.push({ id, ...datos, creadoPor: v?.usuario ?? '', creado: e.cuando });
    if (f.ref) idDeRef.set(f.ref, id);
  }

  // --- Las reservas del sitio viejo. Van antes que las cotizaciones: una
  // ganada de este mismo día tiene que contarlas como lugares ya tomados.
  const R = filasPorNombre(e.filasReservas ?? [], COL_IMPORTAR_RESERVAS);
  if ((e.filasReservas ?? []).length && R.faltan.length) problemas.push(`${HOJA_IMPORTAR_RESERVAS}: faltan las columnas ${R.faltan.join(', ')}.`);
  const reservas: ReservaImportada[] = [];
  let reservasQueYaEstaban = 0;
  const numero = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d]/g, '')) || 0));
  for (const f of R.faltan.length ? [] : R.datos) {
    const donde = `${HOJA_IMPORTAR_RESERVAS}, fila ${f.fila}`;
    if (!f.ref) { problemas.push(`${donde}: le falta la referencia (columna Ref): el número del pedido. No entra.`); continue; }
    const marca = marcaDeImportacion(f.ref);
    if (e.reservas.some((x) => String(x.notaPago ?? '').includes(marca)) || reservas.some((x) => x.notaPago.includes(marca))) {
      reservasQueYaEstaban++; continue;
    }
    const fecha = fechaDeCelda(f.fecha);
    if (!esFecha(fecha)) { problemas.push(`${donde}: la fecha "${f.fecha}" no se entiende (va como 2026-12-05). No entra.`); continue; }
    if (fecha < e.hoy) { problemas.push(`${donde}: la fecha ya pasó. No entra.`); continue; }
    if (!f.nombre) { problemas.push(`${donde}: le falta el nombre. No entra.`); continue; }
    const estadoPago = PAGO_DE_LA_CELDA[normalizar(f.pago)];
    if (!estadoPago) { problemas.push(`${donde}: el pago "${f.pago}" no se entiende. Va Pagada o Por pagar. No entra.`); continue; }
    // El menú con los nombres del catálogo, y la gente que suma: es lo que manda.
    const platos = desglosarMenu(f.menu, e.menus);
    const cuenta = Object.fromEntries(platos.map((x) => [x.menu, x.cantidad]));
    const deLosMenus = platos.reduce((s, x) => s + x.cantidad, 0);
    const personas = deLosMenus || numero(f.personas);
    if (!(personas > 0)) { problemas.push(`${donde}: no dice cuánta gente es (Menú o Personas). No entra.`); continue; }
    if (deLosMenus && f.personas && numero(f.personas) !== deLosMenus) {
      problemas.push(`${donde}: dice ${numero(f.personas)} personas y sus menús suman ${deLosMenus}. Entra con ${deLosMenus}: revísala.`);
    }
    const notaPago = f.nota.includes(marca) ? f.nota : `${f.nota} ${marca}`.trim();
    const monto = f.monto ? numero(f.monto) : null;
    reservas.push({
      fecha: fecha as Reserva['fecha'], nombre: f.nombre, email: correoNormal(f.correo), telefono: telefonoNormal(f.telefono),
      menu: componerMenu(cuenta), personas, monto,
      // La modalidad la escribe solo Shopify, con el modelo nuevo: ésta es una anotada a mano.
      tipoPago: '', estadoPago, asistencia: ASISTENCIA.sinMarcar, notaPago, eventoCRM: '', anotadaPor: e.quien,
      // **No queda revisada aunque importe alguien de pagos**: nadie miró cada pago.
      ...marcasDePago(null, { estadoPago, notaPago, monto, abonado: null }, e.quien, e.cuando, false)
    });
  }

  // --- Las cotizaciones
  const cotizaciones: Omit<Presupuesto, 'fila'>[] = [];
  const lineas: Omit<LineaPresupuesto, 'fila'>[] = [];
  const ganadas: GanadaImportada[] = [];
  const equivalencias = new Map<string, { de: string; a: string; veces: number }>();
  /** Lo que ya ocupa lugar ese día en el panel, antes de importar nada. */
  const yaTomadas = (fecha: string) => e.reservas.filter((x) => x.fecha === fecha && ocupaLugar(x)).reduce((n, x) => n + (x.personas || 0), 0);
  const sinCatalogo = new Map<string, number>();
  let cotizacionesQueYaEstaban = 0;
  const todasLasFichas = () => [...e.clientes, ...(fichas as Cliente[])];
  for (const f of filasQ) {
    const donde = `${HOJA_IMPORTAR_COTIZACIONES}, fila ${f.fila}`;
    if (!f.ref) { problemas.push(`${donde}: le falta la referencia (columna Ref). No entra.`); continue; }
    const marca = marcaDeImportacion(f.ref);
    const estado = estadoNormal(f.estado);
    const yaEsta = e.presupuestos.find((p) => p.notas.includes(marca));
    if (yaEsta || cotizaciones.some((p) => p.notas.includes(marca))) {
      cotizacionesQueYaEstaban++;
      // Una ganada que quedó a medias no se salta callada: se dice dónde terminarla.
      if (yaEsta && estado === ESTADO_PRESUPUESTO.aceptado && !yaEsta.idReserva
          && estadoNormal(yaEsta.estado) !== ESTADO_PRESUPUESTO.aceptado) {
        problemas.push(`${donde}: ya está en el panel, pero quedó como borrador y sin su reserva. Termínala con Marcar ganada, desde Cotizaciones.`);
      }
      continue;
    }
    const idCliente = idDeRef.get(f.refCliente);
    if (!idCliente) { problemas.push(`${donde}: su cliente (${f.refCliente || 'sin referencia'}) no está en ${HOJA_IMPORTAR_CLIENTES}, o no entró. No entra.`); continue; }
    if (!ESTADOS_QUE_ENTRAN.includes(estado)) {
      problemas.push(`${donde}: el estado "${f.estado}" no se importa. Solo Candidato, Borrador o Ganada.`); continue;
    }
    const gana = estado === ESTADO_PRESUPUESTO.aceptado;
    const fecha = fechaDeCelda(f.fecha);
    if (f.fecha && !esFecha(fecha)) { problemas.push(`${donde}: la fecha "${f.fecha}" no se entiende (va como 2027-03-14). No entra.`); continue; }
    if (fecha && fecha < e.hoy) { problemas.push(`${donde}: la fecha ya pasó. No entra.`); continue; }
    if (!fecha && !f.periodo) { problemas.push(`${donde}: no tiene fecha ni periodo. No entra.`); continue; }
    if (gana && !fecha) { problemas.push(`${donde}: una ganada necesita su día exacto: la reserva vive en un día. No entra.`); continue; }

    const id = `PRE-${e.ahora + cotizaciones.length}`;
    const invitados = Math.max(0, Math.round(Number(f.invitados.replace(/[^\d]/g, '')) || 0));
    // Cada producto con el nombre de su producto del catálogo, si tiene uno
    // —también cuando allá se llama un poco distinto—: desde acá es ese producto.
    const productos = (estado === ESTADO_PRESUPUESTO.candidato ? [] : productosDeLaCelda(f.productos)).map((x) => {
      const prod = productoParecido(x.concepto, e.menus);
      return { ...x, escrito: x.concepto, concepto: prod?.nombre ?? x.concepto, esta: !!prod };
    });
    // Las mismas reglas de una cotización hecha a mano: solo los menús suman
    // personas, un producto de monto fijo va una vez, el show va incluido en
    // un día público.
    const entrantes: LineaEntrante[] = productos.map((p) => ({
      presupuesto: id, concepto: p.concepto, cantidad: p.cantidad, precio: p.precio, personas: 0, ivaIncluido: p.ivaIncluido
    }));
    const suyas = entrantes.length ? prepararLineas(entrantes, e.menus, invitados, !!fecha && esDiaPublico(fecha, e.fechas)) : [];
    const v = f.vendedor ? vendedor(f.vendedor) : null;

    const cotizacion: Omit<Presupuesto, 'fila'> = {
      id, fecha: fecha as Presupuesto['fecha'], periodo: fecha ? '' : f.periodo,
      cliente: '', email: '', telefono: '', idCliente,
      // Una ganada se escribe como borrador y se gana después, una por una.
      estado: gana ? ESTADO_PRESUPUESTO.borrador : estado, validoHasta: '', token: e.nuevoToken(),
      notas: f.notas.includes(marca) ? f.notas : `${f.notas} ${marca}`.trim(),
      idReserva: '', invitados, tipoEvento: f.tipoEvento, grupo: '', descuento: 0, motivo: '', documento: '',
      anticipo: null, anticipoMonto: null, saldoDias: null, uf: 0, fechaUF: '',
      horario: '', ley20393: false, acuerdos: '', contrato: '', contratoSubidoPor: '', contratoSubido: '',
      cambiosFecha: null, cancelacionDias: null, reembolso: null,
      devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '',
      enviada: '', ultimoSeguimiento: '', contratoEnviado: '', seguimientoDias: null, avisoEvento: null,
      creadoPor: v?.usuario ?? '', creado: e.cuando
    };

    if (gana) {
      // La misma reserva que arma *Marcar ganada*: el total negociado, y al
      // menú solo las líneas que son gente. Su dueña es la cuenta del
      // vendedor, o quien importa si el vendedor no tiene cuenta.
      const reserva = reservaDesdePresupuesto(
        conCliente({ ...cotizacion, fila: 0 } as Presupuesto, todasLasFichas()),
        suyas.map((l) => ({ ...l, fila: 0 })) as LineaPresupuesto[], e.menus, v?.usuario || e.quien);
      if (!(reserva.personas > 0)) {
        problemas.push(`${donde}: una ganada necesita cuánta gente viene (Invitados, o un menú en Productos). No entra.`); continue;
      }
      // Un día arrendado en exclusiva a otro no se pisa: se mira con lo que ya
      // hay y con lo que esta misma pasada le pone encima.
      const tomadas = yaTomadas(fecha) + reservas.filter((x) => x.fecha === fecha).reduce((n, x) => n + x.personas, 0)
        + ganadas.filter((g) => g.fecha === fecha).reduce((n, g) => n + g.personas, 0);
      if (cupoParaGanar(e.fechas.find((d) => d.fecha === fecha), fecha, e.cfg, tomadas, reserva.personas).exclusivo) {
        problemas.push(`${donde}: ese día está arrendado en exclusiva a otro cliente. No entra: hay que verlo con la gerencia.`); continue;
      }
      ganadas.push({ id, fecha, personas: reserva.personas, reserva });
    }

    for (const p of productos) {
      if (!p.esta) sinCatalogo.set(p.concepto, (sinCatalogo.get(p.concepto) ?? 0) + 1);
      else if (normalizar(p.escrito) !== normalizar(p.concepto)) {
        const k = `${normalizar(p.escrito)}→${p.concepto}`;
        const ya = equivalencias.get(k) ?? { de: p.escrito, a: p.concepto, veces: 0 };
        equivalencias.set(k, { ...ya, veces: ya.veces + 1 });
      }
    }
    if (v) v.cotizaciones++;
    lineas.push(...suyas);
    cotizaciones.push(cotizacion);
  }

  // --- Cómo queda cada día que toma cupo, con las reservas y las ganadas juntas.
  const dias: DiaImportado[] = [...new Set([...reservas.map((x) => x.fecha as string), ...ganadas.map((g) => g.fecha)])].sort().map((fecha) => {
    const suyas = reservas.filter((x) => x.fecha === fecha);
    const ganadasDelDia = ganadas.filter((g) => g.fecha === fecha);
    const personas = suyas.reduce((n, x) => n + x.personas, 0) + ganadasDelDia.reduce((n, g) => n + g.personas, 0);
    const dia = e.fechas.find((d) => d.fecha === fecha);
    const cupo = cupoParaGanar(dia, fecha, e.cfg, yaTomadas(fecha), personas);
    return {
      fecha, reservas: suyas.length, ganadas: ganadasDelDia.length, personas,
      capacidad: cupo.capacidad, libres: cupo.libres, sobre: Math.max(0, personas - cupo.libres),
      dia: !dia ? 'crea' as const : estaCerrado(dia.estado) ? 'reabre' as const : '' as const
    };
  });

  const idsGanadas = new Set(ganadas.map((g) => g.id));
  return {
    fichas, fichasQueYaEstaban, cotizaciones, lineas, cotizacionesQueYaEstaban,
    candidatos: cotizaciones.filter((p) => p.estado === ESTADO_PRESUPUESTO.candidato).length,
    borradores: cotizaciones.filter((p) => p.estado === ESTADO_PRESUPUESTO.borrador && !idsGanadas.has(p.id)).length,
    ganadas, reservas, reservasQueYaEstaban, dias,
    vendedores: [...vendedores.values()].sort((a, b) => (b.fichas + b.cotizaciones) - (a.fichas + a.cotizaciones)),
    problemas,
    sinCatalogo: [...sinCatalogo.entries()].map(([concepto, veces]) => ({ concepto, veces })).sort((a, b) => b.veces - a.veces),
    equivalencias: [...equivalencias.values()].sort((a, b) => b.veces - a.veces)
  };
}

/** La línea de la bitácora: cuánto entró, sin nombres. */
export function detalleDeLaImportacion(p: Pick<PlanImportacion, 'fichas' | 'candidatos' | 'borradores' | 'ganadas' | 'reservas'>): string {
  const n = (c: number, uno: string, varios: string) => `${c} ${c === 1 ? uno : varios}`;
  return [n(p.fichas.length, 'ficha', 'fichas'), n(p.candidatos, 'candidato', 'candidatos'), n(p.borradores, 'borrador', 'borradores'),
    ...(p.ganadas.length ? [n(p.ganadas.length, 'ganada', 'ganadas')] : []),
    ...(p.reservas.length ? [n(p.reservas.length, 'reserva del sitio viejo', 'reservas del sitio viejo')] : [])].join(' · ');
}
