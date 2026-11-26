/**
 * Las reglas de armar una cotización (Fase 2, 2026-11-10).
 *
 * Todo lo que el servidor decide al guardar vive acá, puro y con pruebas:
 * cuánta gente es cada línea, qué es monto fijo, la regla del
 * show ecuestre y de dónde sale el cliente. La pantalla propone lo mismo
 * para que se vea mientras se escribe, pero **lo que se guarda lo decide
 * esto**, porque una llamada directa a la API tiene que obedecer las mismas
 * reglas que un clic.
 */
import { normalizar, estaCerrado, esPrivada } from './columnas.ts';
import { canonizar, TIPO_PRODUCTO, IVA_PRECIO, MONEDA, COBRO, textosDelProducto, type Menu } from './menus.ts';
import {
  normalizarLineas, ESTADO_PRESUPUESTO, estadoNormal, IVA,
  type LineaEntrante, type LineaPresupuesto, type Presupuesto
} from './presupuestos.ts';
import type { Cliente } from './clientes.ts';
import type { FechaHabil } from './tipos.ts';
import type { Config } from './config.ts';
import { diaSemana, esFecha } from './fechas.ts';

/** El producto del catálogo que corresponde a una línea, si hay uno. */
export function productoDe(concepto: string, catalogo: Menu[]): Menu | undefined {
  const nombre = canonizar(concepto, catalogo);
  return catalogo.find((m) => m.nombre === nombre);
}

/**
 * Si un día es **público**: está en `Fechas Hábiles`, abierto y no privado.
 *
 * Un día que no está en la hoja **cuenta como privado** (lo decidió el
 * cliente): una cotización para un martes cualquiera es un evento aparte,
 * no un día en que el restaurante abre al público.
 */
export function esDiaPublico(fecha: string, fechas: Pick<FechaHabil, 'fecha' | 'estado'>[]): boolean {
  const d = fechas.find((f) => f.fecha === fecha);
  if (!d) return false;
  return !estaCerrado(d.estado) && !esPrivada(d.estado);
}

/** El show ecuestre del catálogo: el primer producto de tipo Show. */
export function showDe(catalogo: Menu[]): Menu | undefined {
  // Uno desactivado ya no se agrega solo a un día público.
  return catalogo.find((m) => m.activo && m.tipo === TIPO_PRODUCTO.show);
}

/**
 * **El show ecuestre en un día privado con poca gente** (2026-11-20, lo pidió
 * el cliente). En un día privado o exclusivo —y en uno que no está en el
 * calendario, que cuenta como privado—, si la cotización tiene menos
 * personas que `desde`, el show **no puede ir gratis**: si va, se cobra al
 * menos `minimo`, neto + IVA. Desde `desde` personas se puede dejar
 * incluido, como siempre. Si el show no está en la cotización, no se cobra:
 * el vendedor lo quita y listo.
 *
 * Los dos números viven en Configuración (*Extras y arriendo*). La gerencia
 * general, quien paga y el administrador pueden pasar por encima
 * (`showBajoMinimo`): para ellos quien llama pasa `null`.
 */
export interface ReglaShow {
  /** Desde cuántas personas el show puede ir sin costo. */
  desde: number;
  /** El mínimo bajo ese número, neto (+ IVA). */
  minimo: number;
}

/** La regla de la configuración, o `null` si está apagada (algún 0). */
export function reglaShowDe(cfg: { showGratisDesde: number; showMinimo: number }): ReglaShow | null {
  return cfg.showGratisDesde > 0 && cfg.showMinimo > 0
    ? { desde: cfg.showGratisDesde, minimo: cfg.showMinimo } : null;
}

/** Si la regla corre para esta cotización: día no público y menos gente que `desde`. */
export function aplicaReglaShow(regla: ReglaShow | null | undefined, diaPublico: boolean,
  personas: number): regla is ReglaShow {
  return !!regla && !diaPublico && personas < regla.desde;
}

/**
 * El precio mínimo del show **en la forma de su línea**: si la línea va
 * *+ IVA*, el mínimo tal cual; si va *IVA incluido*, con el IVA sumado. Así
 * $100.000 + IVA y $119.000 IVA incluido son el mismo mínimo.
 */
export function minimoShowEnLinea(regla: ReglaShow, ivaIncluido: boolean): number {
  return ivaIncluido === false ? regla.minimo : Math.round(regla.minimo * (1 + IVA));
}

/**
 * Si en estas líneas —ya preparadas— el show queda **bajo el mínimo** de un
 * día privado con poca gente. Es lo que hizo quien puede pasar por encima, y
 * con esto el servidor sabe si dejar la marca de que lo autorizó.
 */
export function showQuedaBajoMinimo(
  lineas: Pick<LineaPresupuesto, 'concepto' | 'precio' | 'descuento' | 'ivaIncluido' | 'personas' | 'precioUF'>[],
  catalogo: Menu[], regla: ReglaShow | null, diaPublico: boolean, invitados: number
): boolean {
  const enMenus = lineas.reduce((n, l) => n + (l.personas || 0), 0);
  if (!aplicaReglaShow(regla, diaPublico, enMenus > 0 ? enMenus : invitados)) return false;
  return lineas.some((l) => productoDe(l.concepto, catalogo)?.tipo === TIPO_PRODUCTO.show && !(l.precioUF > 0)
    && l.precio * (1 - (Number(l.descuento) || 0) / 100) < minimoShowEnLinea(regla, l.ivaIncluido));
}

/**
 * **La marca de la excepción** (`Show bajo el mínimo` de la cotización). Solo
 * la cambia quien puede pasar por encima: la deja al guardar el show bajo el
 * mínimo —con su nombre y la hora, la primera vez— y la saca si lo sube. Para
 * los demás queda como estaba, y mientras esté, la regla no corre para nadie.
 */
export function showBajoMinimoDe(previa: string, pasaPorEncima: boolean, bajoMinimo: boolean,
  quien: string, ahora: string): string {
  if (!pasaPorEncima) return previa;
  return bajoMinimo ? (previa || `${quien} · ${ahora}`) : '';
}

/**
 * **El arriendo mínimo** (2026-11-23, lo pidió el cliente: *"tengo que evitar
 * que un vendedor hace una reserva en un día cerrado, o sea, en un día privado
 * o exclusivo, y no nos sale a costo, porque en verdad arrendó a 12 personas
 * sin cobrar un ítem arriendo, y además prometió el show ecuestre a costo
 * bajo"*). Los números salen del análisis de costos de mayo a septiembre, con
 * una estrategia agresiva: el mínimo cubre lo que cuesta el evento, no el
 * costo fijo del día. Ver "El arriendo mínimo" en `panel/CLAUDE.md`.
 *
 * Tres filtros, según el día:
 *
 * 1. **Un día público, sin exclusividad**: sin mínimo. El grupo entra como
 *    público.
 * 2. **Un día que no está abierto al público** (`privado`): el tramo según la
 *    gente. **Si ese día ya tiene otras reservas, no hay mínimo**: la
 *    apertura ya la pagó quien abrió el día.
 * 3. **Exclusivo en un día público** (`exclusivo`): el tramo según la gente,
 *    con sus propios números.
 *
 * Cada caso tiene dos tramos, *hasta N personas: mínimo $X* neto (+ IVA);
 * desde el último, sin mínimo. Viven en Configuración (*Extras y arriendo*).
 * La gerencia general, quien paga y el administrador pueden pasar por encima,
 * como con el show (`showBajoMinimo`).
 */
export interface TramoArriendo {
  /** Hasta cuántas personas rige (inclusive). */
  hasta: number;
  /** El mínimo, neto (+ IVA). */
  minimo: number;
}
export interface ReglaArriendo {
  privado: TramoArriendo[];
  exclusivo: TramoArriendo[];
}
export type CasoArriendo = keyof ReglaArriendo;

type ConfigArriendo = Pick<Config,
  'arriendoPrivadoHasta1' | 'arriendoPrivadoMinimo1' | 'arriendoPrivadoHasta2' | 'arriendoPrivadoMinimo2'
  | 'arriendoExclusivoHasta1' | 'arriendoExclusivoMinimo1' | 'arriendoExclusivoHasta2' | 'arriendoExclusivoMinimo2'>;

/** Los tramos de la configuración, ordenados; un 0 apaga un tramo. `null` si no queda ninguno. */
export function reglaArriendoDe(cfg: ConfigArriendo): ReglaArriendo | null {
  const tramos = (pares: [number, number][]) => pares
    .filter(([hasta, minimo]) => hasta > 0 && minimo > 0)
    .map(([hasta, minimo]) => ({ hasta, minimo }))
    .sort((a, b) => a.hasta - b.hasta);
  const regla = {
    privado: tramos([[cfg.arriendoPrivadoHasta1, cfg.arriendoPrivadoMinimo1],
      [cfg.arriendoPrivadoHasta2, cfg.arriendoPrivadoMinimo2]]),
    exclusivo: tramos([[cfg.arriendoExclusivoHasta1, cfg.arriendoExclusivoMinimo1],
      [cfg.arriendoExclusivoHasta2, cfg.arriendoExclusivoMinimo2]])
  };
  return regla.privado.length || regla.exclusivo.length ? regla : null;
}

/**
 * Si un día cuenta como **público para el arriendo**. Uno que está en el
 * calendario, como siempre (`esDiaPublico()`). **Uno que todavía no está**
 * cuenta como público si cae en un día de la semana que la regla diaria abre
 * (sábado y domingo): si no, un vendedor podría arrendar en exclusiva un
 * sábado de marzo al precio de un martes. Para todo lo demás —el show, la
 * tarjeta— un día que no está en el calendario sigue contando como privado.
 */
export function esPublicoParaArriendo(fecha: string,
  fechas: Pick<FechaHabil, 'fecha' | 'estado'>[], diasAbiertos: number[]): boolean {
  if (fechas.some((f) => f.fecha === fecha)) return esDiaPublico(fecha, fechas);
  return diasAbiertos.includes(diaSemana(fecha));
}

/** El mínimo que corre para una cotización: su caso, el monto y el tope del tramo. */
export interface MinimoArriendo {
  caso: CasoArriendo;
  minimo: number;
  hasta: number;
}

/**
 * **El mínimo del arriendo de esta cotización**, o `null` si no tiene.
 * `personas` es la gente de sus menús, o los invitados si todavía no tiene
 * menús (como el show). `otrasReservas`: las reservas que ya ocupan lugar ese
 * día, sin contar la de esta misma cotización.
 */
export function minimoDeArriendo(regla: ReglaArriendo | null | undefined,
  dia: { publico: boolean; exclusivo: boolean; otrasReservas: number },
  personas: number): MinimoArriendo | null {
  if (!regla) return null;
  let caso: CasoArriendo;
  if (dia.publico) {
    if (!dia.exclusivo) return null;
    caso = 'exclusivo';
  } else {
    if (dia.otrasReservas > 0) return null;
    caso = 'privado';
  }
  const tramo = regla[caso].find((t) => personas <= t.hasta);
  return tramo ? { caso, minimo: tramo.minimo, hasta: tramo.hasta } : null;
}

/**
 * **El mínimo del arriendo de un día**, como una función de la gente (el
 * tramo depende de cuántos suman los menús, y eso se sabe al preparar las
 * líneas). `null` sin fecha o sin regla. La misma en la ventana de cotizar,
 * al guardar y al ganar: `exclusivo` es la respuesta de la cotización y
 * `otrasReservas` las que ya ocupan lugar ese día sin contar la suya.
 */
export function arriendoDelDia(regla: ReglaArriendo | null, fecha: string,
  fechas: Pick<FechaHabil, 'fecha' | 'estado'>[], diasAbiertos: number[],
  exclusivo: boolean, otrasReservas: number): ((personas: number) => MinimoArriendo | null) | null {
  if (!regla || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const dia = { publico: esPublicoParaArriendo(fecha, fechas, diasAbiertos), exclusivo, otrasReservas };
  return (personas) => minimoDeArriendo(regla, dia, personas);
}

/**
 * **Un mínimo aprobado para esta cotización** (2026-11-23, `condiciones.ts`):
 * el monto que aprobó la gerencia, pagos o el administrador reemplaza al de
 * Configuración si es menor. En 0, sin mínimo.
 */
export function conMinimoShow(regla: ReglaShow | null, aprobado?: number): ReglaShow | null {
  if (!regla || typeof aprobado !== 'number') return regla;
  return aprobado <= 0 ? null : { ...regla, minimo: Math.min(regla.minimo, aprobado) };
}

/** Lo mismo para el arriendo: el mínimo del día, pero nunca más que lo aprobado. */
export function conMinimoArriendo(
  fn: ((personas: number) => MinimoArriendo | null) | null, aprobado?: number
): ((personas: number) => MinimoArriendo | null) | null {
  if (!fn || typeof aprobado !== 'number') return fn;
  if (aprobado <= 0) return null;
  return (personas) => {
    const m = fn(personas);
    return m ? { ...m, minimo: Math.min(m.minimo, aprobado) } : m;
  };
}

/** El producto de arriendo del catálogo: el primero activo, de tipo Arriendo, que se puede cotizar. */
export function arriendoDe(catalogo: Menu[]): Menu | undefined {
  return catalogo.find((m) => m.activo && m.cotizacion && m.tipo === TIPO_PRODUCTO.arriendo);
}

/** Lo que deja una línea sin IVA, con su descuento. */
function netoDeLinea(l: Pick<LineaPresupuesto, 'precio' | 'cantidad' | 'descuento' | 'ivaIncluido'>): number {
  const bruto = (l.precio || 0) * (l.cantidad || 0) * (1 - (Number(l.descuento) || 0) / 100);
  return l.ivaIncluido === false ? bruto : bruto / (1 + IVA);
}

/** Un monto neto, escrito en la forma de su línea: tal cual si va *+ IVA*, con el IVA si va incluido. */
export function enFormaDeLinea(neto: number, ivaIncluido: boolean): number {
  return ivaIncluido === false ? Math.round(neto) : Math.round(neto * (1 + IVA));
}

/** Lo que suman, netas, las líneas de arriendo. Las líneas en UF no se miran: su precio sale de la UF. */
function arriendoNeto(lineas: Pick<LineaPresupuesto, 'concepto' | 'precio' | 'cantidad' | 'descuento' | 'ivaIncluido' | 'precioUF'>[],
  catalogo: Menu[]): { neto: number; hay: boolean; enUF: boolean } {
  const suyas = lineas.filter((l) => productoDe(l.concepto, catalogo)?.tipo === TIPO_PRODUCTO.arriendo);
  return {
    neto: Math.round(suyas.reduce((n, l) => n + netoDeLinea(l), 0)),
    hay: suyas.length > 0,
    enUF: suyas.some((l) => l.precioUF > 0)
  };
}

/**
 * Si en estas líneas —ya preparadas— el arriendo queda **bajo su mínimo**: lo
 * que hizo quien puede pasar por encima, para dejar la marca, y lo que mira
 * `/convertir` antes de ganar. Un arriendo en UF no se mide.
 */
export function arriendoQuedaBajoMinimo(
  lineas: Pick<LineaPresupuesto, 'concepto' | 'precio' | 'cantidad' | 'descuento' | 'ivaIncluido' | 'precioUF'>[],
  catalogo: Menu[], minimo: MinimoArriendo | null
): boolean {
  if (!minimo) return false;
  const a = arriendoNeto(lineas, catalogo);
  return !a.enUF && a.neto < minimo.minimo;
}

/** La gente que cuenta para los mínimos: la de los menús, o los invitados si todavía no hay menús. */
export function personasParaMinimos(lineas: { personas: number }[], invitados: number): number {
  const enMenus = lineas.reduce((n, l) => n + (l.personas || 0), 0);
  return enMenus > 0 ? enMenus : invitados;
}

/**
 * Deja las líneas listas para guardar, con las reglas del negocio:
 *
 * - **La gente sale del tipo del producto**: una línea de un producto de
 *   tipo Menú son tantas personas como su cantidad; cualquier otra —la once,
 *   el arriendo, el show, una línea libre— son cero. Ya no hay una columna
 *   de personas que alguien tenga que llenar a mano.
 * - **Ninguna línea sigue sola a los invitados** (2026-11-11, lo decidió el
 *   cliente): 10 invitados pueden ser 8 desayunos y 6 onces. La once nace
 *   con los invitados y se ajusta con − y +. Las líneas viejas que venían
 *   marcadas conservan la cantidad con que se guardaron.
 * - **Un monto fijo —arriendo, show— es siempre 1**: va o no va, y no hay
 *   cantidad que cambiar, ni en la pantalla ni llamando a la API.
 * - **El show ecuestre en un día público va siempre, incluido y a cero.**
 *   Si no viene, se agrega; si viene con precio, se le quita. En un día
 *   privado es una línea más, que se agrega o no y cobra su precio.
 */
export function prepararLineas(
  entrantes: LineaEntrante[],
  catalogo: Menu[],
  invitados: number,
  diaPublico: boolean,
  /**
   * El valor de la UF de la cotización. **Una línea en UF toma su precio en
   * pesos de acá**, siempre: así lo que se ve y lo que se guarda salen de la
   * misma cuenta. Sin UF, la línea conserva el precio que traía.
   */
  uf = 0,
  /**
   * El mínimo del show en un día privado con poca gente (`ReglaShow`), o
   * `null` para quien puede pasar por encima. Un show que con su descuento
   * queda bajo el mínimo **sube al mínimo y pierde el descuento**: lo que se
   * ve y lo que se guarda salen de acá, y una llamada directa a la API no lo
   * esquiva.
   */
  reglaShow: ReglaShow | null = null,
  /**
   * El mínimo del arriendo (`minimoDeArriendo()`), o `null` para quien puede
   * pasar por encima o si no corre. **Sin arriendo, se agrega** el producto de
   * arriendo del catálogo con el mínimo; **con arriendo bajo el mínimo, la
   * primera línea sube** hasta cubrirlo y pierde su descuento. Igual que el
   * show: una llamada directa a la API no lo esquiva. Puede venir como una
   * función de la gente, porque el tramo depende de cuántos suman los menús,
   * y eso se sabe recién acá.
   */
  arriendoPedido: MinimoArriendo | ((personas: number) => MinimoArriendo | null) | null = null
): Omit<LineaPresupuesto, 'fila'>[] {
  const show = showDe(catalogo);
  const lineas = normalizarLineas(entrantes).map((l) => {
    const prod = productoDe(l.concepto, catalogo);
    const esMenu = prod?.tipo === TIPO_PRODUCTO.menu;
    const montoFijo = !!prod && normalizar(prod.cobro) === normalizar(COBRO.fijo);
    const sigue = false;
    const cantidad = montoFijo ? 1 : l.cantidad;
    const esShow = !!prod && prod.tipo === TIPO_PRODUCTO.show;
    return {
      ...l,
      concepto: prod?.nombre ?? l.concepto,
      sigue,
      cantidad,
      personas: esMenu ? cantidad : 0,
      // En un día público el show va incluido: ni precio ni descuento.
      precio: esShow && diaPublico ? 0
        : l.precioUF && uf > 0 ? Math.round(l.precioUF * uf) : l.precio,
      descuento: esShow && diaPublico ? 0 : l.descuento,
      // **Quién la cobra sale del catálogo** (2026-11-23): marcar el karting
      // como de otra empresa lo saca del total de toda cotización que se
      // vuelva a guardar. Una línea libre es nuestra.
      loCobra: prod ? prod.loCobra || '' : ''
    };
  });
  // La gente de la cotización: la de sus menús, o los invitados si todavía
  // no tiene menús.
  const enMenus = lineas.reduce((n, l) => n + l.personas, 0);
  if (aplicaReglaShow(reglaShow, diaPublico, enMenus > 0 ? enMenus : invitados)) {
    for (const l of lineas) {
      const prod = productoDe(l.concepto, catalogo);
      if (prod?.tipo !== TIPO_PRODUCTO.show || l.precioUF > 0) continue;
      const minimo = minimoShowEnLinea(reglaShow, l.ivaIncluido);
      if (l.precio * (1 - (Number(l.descuento) || 0) / 100) < minimo) {
        l.precio = minimo;
        l.descuento = 0;
      }
    }
  }
  const arriendo = typeof arriendoPedido === 'function'
    ? arriendoPedido(enMenus > 0 ? enMenus : invitados) : arriendoPedido;
  if (arriendo && arriendo.minimo > 0) {
    const actual = arriendoNeto(lineas, catalogo);
    if (!actual.hay) {
      const prod = arriendoDe(catalogo);
      if (prod) {
        const incluido = prod.iva !== IVA_PRECIO.mas;
        lineas.push({
          presupuesto: lineas[0]?.presupuesto ?? '', concepto: prod.nombre, cantidad: 1,
          precio: enFormaDeLinea(arriendo.minimo, incluido), personas: 0, descuento: 0,
          ivaIncluido: incluido, sigue: false, precioUF: 0, loCobra: '', ...textosDelProducto(prod)
        });
      }
    } else if (!actual.enUF && actual.neto < arriendo.minimo) {
      const suyas = lineas.filter((l) => productoDe(l.concepto, catalogo)?.tipo === TIPO_PRODUCTO.arriendo);
      const primera = suyas[0];
      const resto = suyas.slice(1).reduce((n, l) => n + netoDeLinea(l), 0);
      const falta = Math.max(0, arriendo.minimo - resto);
      const cantidad = Math.max(1, primera.cantidad || 1);
      primera.precio = Math.ceil(enFormaDeLinea(falta, primera.ivaIncluido) / cantidad);
      primera.descuento = 0;
    }
  }
  if (diaPublico && show && !lineas.some((l) => l.concepto === show.nombre)) {
    lineas.push({
      presupuesto: lineas[0]?.presupuesto ?? '', concepto: show.nombre,
      cantidad: 1, precio: 0, personas: 0, descuento: 0, ivaIncluido: true, sigue: false,
      precioUF: 0, loCobra: '', ...textosDelProducto(show)
    });
  }
  return lineas;
}

/** Una línea nueva para un producto del catálogo, como la propone la pantalla. */
/**
 * **Un producto del catálogo va una sola vez por cotización** (2026-11-12,
 * lo pidió el cliente: *"no quiero que se puedan poner dos veces el mismo
 * ítem"*). Lo Pirque se cotiza una vez con cuánta gente lo come, y los niños
 * en su propia línea; dos líneas de Lo Pirque solo confunden. Se compara sin
 * tildes ni mayúsculas, como el resto del panel.
 *
 * Da vuelta lo que decía este proyecto el 2026-11-01 (*"dos líneas del mismo
 * concepto no se juntan"*, por el caso de una cortesía a precio cero): una
 * cortesía va ahora como descuento de la línea. Lo que ya tenga dos líneas
 * de antes no se junta solo: se ve como está y se corrige a mano.
 */
export function yaEstaEnLaCotizacion(lineas: { concepto: string }[], producto: string): boolean {
  const n = normalizar(producto);
  return !!n && lineas.some((l) => normalizar(l.concepto) === n);
}

export function lineaDeProducto(
  m: Menu, presupuesto: string, invitados: number, precio: number,
  /** Cuánta gente ya está en los menús de la cotización. */
  yaEnMenus = 0
): Omit<LineaPresupuesto, 'fila'> {
  const porPersona = normalizar(m.cobro) === normalizar('Por persona');
  // Nada sigue solo a los invitados (2026-11-11): la once nace con todos y
  // se ajusta a mano, porque no todos la toman.
  const sigue = false;
  // **Un menú nuevo toma los invitados que faltan, no todos** (2026-11-10,
  // lo reclamó el cliente: 40 invitados, Lo Pirque con 40 y el de niños con
  // otros 40 eran 80). El primero toma los 40; el segundo nace en 0 y se le
  // escribe cuántos, bajándole al primero. Sin invitados, nace en 1.
  const cantidad = !porPersona ? 1
    : m.tipo === TIPO_PRODUCTO.menu
      ? (invitados > 0 ? Math.max(0, invitados - yaEnMenus) : 1)
      : Math.max(1, invitados);
  return {
    presupuesto, concepto: m.nombre, cantidad, precio,
    personas: m.tipo === TIPO_PRODUCTO.menu ? cantidad : 0,
    descuento: 0, ivaIncluido: m.iva !== IVA_PRECIO.mas, sigue,
    // En UF, la línea guarda su precio en UF y lo convierte `prepararLineas()`.
    precioUF: m.moneda === MONEDA.uf ? m.precioCotizacion : 0,
    // **Lo que incluye nace con el texto del producto** (2026-11-24) y desde
    // acá es de esta cotización: se cambia en la línea, no en el producto.
    ...textosDelProducto(m)
  };
}

/**
 * **Cambia la cantidad de un menú y se la descuenta al primero** (2026-11-10,
 * lo pidió el cliente). Con 40 invitados, Lo Pirque nace con 40 y Niños con
 * 0; subir Niños a 10 deja Lo Pirque en 30, y bajarlo se los devuelve. Así
 * los menús siguen sumando los invitados sin hacer la resta a mano.
 *
 * - El primero en la lista es el que absorbe la diferencia, y **nunca baja
 *   de cero**: si no le queda, el otro no sube más de lo que había.
 * - Cambiar el primero, o cualquier línea que no sea un menú, no mueve nada
 *   más: ahí el aviso de que no calzan dice lo que pasa.
 * - Sin invitados tampoco: no hay un total que conservar.
 */
export function cambiarCantidad<L extends { concepto: string; cantidad: number }>(
  lineas: L[], i: number, nueva: number, catalogo: Menu[], invitados: number
): L[] {
  const esMenu = (l: L) => productoDe(l.concepto, catalogo)?.tipo === TIPO_PRODUCTO.menu;
  const salida = lineas.map((l) => ({ ...l }));
  let cantidad = Math.max(0, Math.round(nueva) || 0);
  const primero = salida.findIndex(esMenu);
  if (invitados > 0 && esMenu(salida[i]) && primero !== -1 && primero !== i) {
    const antes = salida[i].cantidad;
    cantidad = Math.min(cantidad, antes + salida[primero].cantidad);
    salida[primero].cantidad -= cantidad - antes;
  }
  salida[i].cantidad = cantidad;
  return salida;
}

/**
 * El cliente de una cotización: **de la ficha** cuando la tiene, y de las
 * columnas viejas cuando es de antes de las fichas.
 *
 * Desde la Fase 2 una cotización nueva no copia el nombre ni el contacto:
 * guarda solo el `ID Cliente`, y esto lo resuelve al leer. Así corregir un
 * teléfono en la ficha lo corrige en todas sus cotizaciones de una vez.
 */
export function clienteDe(
  p: Pick<Presupuesto, 'idCliente' | 'cliente' | 'email' | 'telefono'>,
  clientes: Pick<Cliente, 'id' | 'nombre' | 'correo' | 'telefono' | 'empresa'>[]
): { nombre: string; email: string; telefono: string; empresa: string } {
  const c = p.idCliente ? clientes.find((x) => x.id === p.idCliente) : undefined;
  if (c) return { nombre: c.nombre, email: c.correo, telefono: c.telefono, empresa: c.empresa };
  return { nombre: p.cliente, email: p.email, telefono: p.telefono, empresa: '' };
}

/** La cotización con su cliente resuelto, para mostrar o convertir. */
export function conCliente<T extends Presupuesto>(p: T, clientes: Cliente[]): T {
  const c = clienteDe(p, clientes);
  return { ...p, cliente: c.nombre, email: c.email, telefono: c.telefono, empresaCliente: c.empresa };
}

/** El grupo de alternativas de una cotización: el suyo, o ella misma. */
export const grupoDe = (p: Pick<Presupuesto, 'id' | 'grupo'>) => p.grupo || p.id;

/**
 * **Las alternativas de una cotización viven dentro de ella** (2026-11-10,
 * lo pidió el cliente: *"hay que quedarse en el mundo interno de esta
 * cotización, y ahí dentro veo las dos alternativas"*). Por dentro siguen
 * siendo filas aparte de `Presupuestos` con el mismo `Grupo`; lo que cambia
 * es cómo se muestran: **un número de cotización y una letra por
 * alternativa**, no dos números sueltos.
 */
export function alternativasDe<T extends Pick<Presupuesto, 'id' | 'grupo'>>(p: T, lista: T[]): T[] {
  const g = grupoDe(p);
  const del = lista.filter((x) => grupoDe(x) === g);
  if (!del.some((x) => x.id === p.id)) del.push(p);
  // En el orden en que se crearon: el id lleva la hora.
  return del.sort((a, b) => a.id.localeCompare(b.id));
}

/** La letra de una alternativa (A, B, C…), o vacío si es la única. */
export function letraDe<T extends Pick<Presupuesto, 'id' | 'grupo'>>(p: T, lista: T[]): string {
  const alts = alternativasDe(p, lista);
  if (alts.length < 2) return '';
  return String.fromCharCode(65 + alts.findIndex((x) => x.id === p.id));
}

/**
 * La que representa al grupo en las listas y el calendario: la ganada si
 * hay, si no la primera que sigue abierta, si no la primera. Así una
 * cotización con dos alternativas es **una** tarjeta, no dos.
 */
export function principalDe<T extends Presupuesto>(alts: T[], abierta: (p: T) => boolean): T {
  return alts.find((x) => !!x.idReserva) ?? alts.find(abierta) ?? alts[0];
}

/**
 * Las otras alternativas del mismo grupo que hay que marcar *No elegida*
 * cuando una gana. Las que ya están cerradas —perdidas, o con su propia
 * reserva— no se tocan.
 */
export function otrasAlternativas(ganadora: Presupuesto, lista: Presupuesto[]): Presupuesto[] {
  const g = grupoDe(ganadora);
  return lista.filter((p) => p.id !== ganadora.id && grupoDe(p) === g && !p.idReserva
    && estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.rechazado
    && estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.noElegida);
}

/**
 * **Si una alternativa sigue en carrera** (2026-11-11). Fuera quedan las
 * perdidas, las *No elegida* y las canceladas; la ganada sigue, porque es
 * la que el cliente eligió.
 */
export function sigueViva(p: Pick<Presupuesto, 'estado' | 'idReserva'>): boolean {
  const e = estadoNormal(p.estado);
  if (e === ESTADO_PRESUPUESTO.cancelada) return false;
  if (p.idReserva) return true;
  return e !== ESTADO_PRESUPUESTO.rechazado && e !== ESTADO_PRESUPUESTO.noElegida;
}

/** Las alternativas del grupo que siguen en carrera, en orden A, B, C. */
export function vivasDelGrupo(p: Presupuesto, lista: Presupuesto[]): Presupuesto[] {
  return alternativasDe(p, lista).filter(sigueViva);
}

/**
 * **Antes de ganar hay que elegir** (2026-11-11, lo pidió el cliente: *"antes
 * de marcar como ganado, tiene que decidir cuál de las alternativas usa"*).
 * Verdadero si a esta cotización todavía le queda otra alternativa en
 * carrera. La misma regla la usan `/convertir` y la pantalla.
 */
export function faltaElegir(p: Presupuesto, lista: Presupuesto[]): boolean {
  return !p.idReserva && sigueViva(p) && otrasAlternativas(p, lista).length > 0;
}

/**
 * **Lo que muestra el link del cliente** (2026-11-11): un solo link para todo
 * el grupo. Mientras se decide, las alternativas en carrera, A, B y C juntas;
 * elegida una —o ganada—, solo esa. Un candidato no va: todavía no es una
 * cotización. Si no queda ninguna viva —se perdió—, la del propio link.
 */
export function paraElLink(p: Presupuesto, lista: Presupuesto[]): Presupuesto[] {
  const vivas = vivasDelGrupo(p, lista)
    .filter((x) => estadoNormal(x.estado) !== ESTADO_PRESUPUESTO.candidato);
  const ganada = vivas.find((x) => !!x.idReserva);
  if (ganada) return [ganada];
  return vivas.length ? vivas : [p];
}

/**
 * Qué estados se pueden poner a mano. **Ganada no**: se llega solo por
 * "Marcar ganada", que crea la reserva. **No elegida tampoco**: la pone el
 * sistema cuando gana otra alternativa.
 */
export const ESTADOS_A_MANO: string[] = [
  ESTADO_PRESUPUESTO.candidato, ESTADO_PRESUPUESTO.borrador, ESTADO_PRESUPUESTO.enviado,
  ESTADO_PRESUPUESTO.negociacion, ESTADO_PRESUPUESTO.rechazado
];

/**
 * **En carrera**: se sigue conversando y todavía no hay reserva —candidato,
 * borrador, enviada o en negociación—. Es lo que se puede dar por caído con
 * *Se cayó…* (`seCayo()`). Una ganada no: esa se cancela, porque ya tomó
 * cupo y puede haber plata que devolver.
 */
export function enCarrera(p: Pick<Presupuesto, 'estado' | 'idReserva'> & { fecha?: string }, hoy?: string): boolean {
  if (p.idReserva) return false;
  // Con `hoy`, una cuyo evento ya pasó se cayó sola (2026-11-26, `pasoElEvento()`).
  if (hoy && esFecha(p.fecha) && p.fecha < hoy) return false;
  const e = estadoNormal(p.estado);
  return e === ESTADO_PRESUPUESTO.candidato || e === ESTADO_PRESUPUESTO.borrador
    || e === ESTADO_PRESUPUESTO.enviado || e === ESTADO_PRESUPUESTO.negociacion;
}

/**
 * **Se cayó** (2026-11-22, lo pidió el cliente: *"en cualquier momento el
 * vendedor puede decir, ok, se cayó… con reconfirmación, se cayó y darle una
 * razón, pero hacerlo muy fácil… para que desaparezca de la lista"*). La
 * cotización pasa a *Perdida* con su motivo, y con ella **las alternativas
 * del grupo que siguen en carrera**: es la conversación con el cliente la
 * que se cayó, igual que *Se perdió* se copiaba a todas al guardar.
 *
 * Devuelve qué escribir en cada una, o por qué no se puede. Puro: lo usa la
 * ruta `/api/presupuestos/perdida`.
 */
export function seCayo(
  p: Presupuesto, lista: Presupuesto[], motivo: string, dia: string
): { error: string } | { cambios: { id: string; estado: string; motivo: string; ultimoSeguimiento: string }[] } {
  if (p.idReserva) {
    return { error: 'Esta cotización ya es una reserva: si se cayó, usa "Cancelar evento", que libera el cupo y calcula la devolución.' };
  }
  if (!enCarrera(p)) return { error: 'Esta cotización ya no está en carrera.' };
  const m = String(motivo ?? '').trim().slice(0, 200);
  if (m.length < 2) return { error: 'Falta el motivo: elige uno o escríbelo.' };
  const del = alternativasDe(p, lista).filter((a) => a.id === p.id || enCarrera(a));
  return { cambios: del.map((a) => ({ id: a.id, estado: ESTADO_PRESUPUESTO.rechazado, motivo: m, ultimoSeguimiento: dia })) };
}

/** Los motivos de pérdida que se ofrecen con un botón. Igual se escribe otro. */
export const MOTIVOS_PERDIDA = [
  'Precio', 'Fecha no disponible', 'Eligió otra opción', 'No respondió', 'Se canceló el evento'
];

/**
 * **Cómo queda el grupo al deshacer una ganada** (2026-11-12, lo pidió el
 * cliente: marcó ganada la A cuando el cliente había elegido la B). La
 * ganada y las que pasaron a *No elegida* por ella vuelven a estar en
 * carrera: *Enviada* si ya se mandó, *Borrador* si no. Una *Perdida* o una
 * *Cancelada* se quedan como están: no las tocó la ganada.
 *
 * No se guarda en qué etapa estaba cada una antes de ganar, así que una que
 * iba en *Negociación* vuelve a *Enviada*. Es lo más cercano que se sabe, y
 * la conversación sigue igual.
 */
export function grupoSinGanar(
  ganada: Presupuesto, lista: Presupuesto[]
): { id: string; estado: string }[] {
  return alternativasDe(ganada, lista)
    .filter((a) => a.id === ganada.id || estadoNormal(a.estado) === ESTADO_PRESUPUESTO.noElegida)
    .map((a) => ({
      id: a.id,
      estado: String(a.enviada ?? '').trim() ? ESTADO_PRESUPUESTO.enviado : ESTADO_PRESUPUESTO.borrador
    }));
}
