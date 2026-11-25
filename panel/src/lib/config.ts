/**
 * Los parámetros del negocio, que viven en la planilla y no en el código.
 *
 * **Por qué en la planilla:** cambiar un 10 por un 8 no puede obligar a
 * redesplegar. El backend de Apps Script ya lo resolvía así, con una
 * pestaña `Config` de filas clave/valor, y acá se replica — no son
 * parámetros nuevos, son los mismos.
 *
 * Este archivo no toca la red: recibe las filas y devuelve la
 * configuración. Toda la tolerancia a lo que una persona escriba a mano
 * vive acá y se prueba acá.
 */
import { normalizar } from './columnas.ts';

export const HOJA_CONFIG = 'Config';
export const COL_CONFIG = { clave: 'Clave', valor: 'Valor' } as const;

export interface Config {
  /** Desde cuántos lugares libres el sitio avisa "últimos lugares". */
  avisoPocosLugares: number;
  /** El cupo que se le pone a un día nuevo. Personas totales, niños incluidos. */
  cupoNormal: number;
  /** La hora a la que abre, como texto. */
  horaApertura: string;
  /**
   * La hora a la que cierra. Hoy solo la usa el evento de Google Calendar,
   * para saber hasta cuándo dura. El sitio no la muestra.
   */
  horaCierre: string;
  /** Qué días de la semana se abre. 0 es domingo y 6 sábado, como getDay(). */
  diasAbiertos: number[];
  /** Hasta cuántos días adelante se puede reservar. */
  diasAFuturo: number;
  /** Desde qué fracción de ocupación un día pasa a amarillo y a rojo. */
  cortes: { amarillo: number; rojo: number };
  /**
   * La llave del link de la planilla semanal, la que se manda al grupo.
   *
   * Vive acá y no en el entorno porque **se renueva desde el panel**: cuando
   * alguien deja el equipo y conviene que su copia del link deje de servir,
   * se cambia con un botón y no con un despliegue.
   *
   * En blanco significa **todavía no se ha creado ninguno**, y entonces no
   * hay link que funcione. No se genera solo: que exista un link público
   * —aunque sea con llave— tiene que ser una decisión de alguien.
   */
  tokenPlanilla: string;
  /**
   * Cuántos días vale un presupuesto desde que se crea.
   *
   * **Lo fijó el cliente en 15** y vive acá y no en el código porque es un
   * plazo comercial: cambiarlo no puede obligar a redesplegar. En cero
   * significa **sin vencimiento**, no "vence hoy" — un plazo de cero días
   * mataría cada presupuesto al nacer, que no es lo que nadie quiso decir.
   */
  vigenciaPresupuesto: number;
  /**
   * Desde cuántas personas una reserva es **grupo grande**, y la línea de
   * la semana del calendario lo avisa (2026-11-05: el cliente lo fijó en
   * 30 y pidió que se pudiera cambiar). En cero no se avisa nunca.
   */
  grupoGrande: number;
  /**
   * **El simulador de evento** (2026-11-23, `lib/simulador.ts`). El margen
   * que se busca en un evento, en puntos sobre lo cobrado sin IVA: bajo eso
   * la señal pasa a *justo* y a *no conviene*. En cero basta con no perder.
   * Parte en cero a propósito: cuánto margen quiere el negocio es dato suyo.
   */
  margenMinimo: number;
  /**
   * Los gastos de un evento que no son productos ni equipo, como texto:
   * *"Hielo: 15000; Transporte: 800 pp"* (`aGastos()`). Vacío de partida.
   */
  gastosEvento: string;
  /**
   * **La capacidad máxima del recinto** (2026-11-12, la fijó el cliente en
   * 900). Es el tope de *Ampliar el cupo* cuando un pago entró sobre
   * reservas sin pagar: el cupo de un día se puede subir para que quepan
   * todos, pero nunca por encima de esto.
   */
  capacidadMaxima: number;
  /**
   * Los descuentos que se ofrecen en una cotización con un botón
   * (2026-11-10, lo fijó el cliente en 5, 10 y 15%). Sirven por línea y
   * sobre el total. Viven acá para cambiarlos sin redesplegar.
   */
  descuentos: number[];
  /**
   * **Las condiciones de pago de una cotización** (2026-11-10). El anticipo
   * en % del total y cuántos días antes del evento se paga el saldo. Son el
   * valor por defecto: cada cotización los puede cambiar, porque se
   * negocian. Un solo lugar para la cotización y el contrato, que en el CRM
   * del socio decían cosas distintas (30% y 3 días contra 20% y 10).
   */
  anticipoPct: number;
  saldoDias: number;
  /**
   * **Las medidas de tranquilidad del contrato** (2026-11-10, el cliente las
   * pidió configurables): cuántas veces se puede cambiar la fecha, hasta
   * cuántos días antes se puede cancelar, y qué % de la reserva se devuelve
   * al cancelar. Los de partida son los del contrato del CRM. Un 0 en los
   * cambios o en los días saca esa frase del contrato.
   */
  cambiosFecha: number;
  cancelacionDias: number;
  reembolsoPct: number;
  /**
   * **El seguimiento de las cotizaciones** (2026-11-11): a cuántos días de
   * mandada sin moverse se pregunta "¿y?", y cuántos días antes del evento
   * se pregunta "¿se ganó o se perdió?". Cada cotización los puede cambiar.
   * En 0 no se pregunta.
   */
  seguimientoDias: number;
  /**
   * **A quién le llegan las cotizaciones del sitio** (2026-11-23, lo pidió el
   * cliente: *"en este momento las cotizaciones que vienen por este canal van
   * asignadas a la cuenta de Carmen Barros"*). El nombre de una cuenta que
   * cotiza; en blanco quedan sin vendedor y las ve la gerencia.
   */
  vendedorSitio: string;
  avisoEvento: number;
  /**
   * **Días mínimos para liberar un día por un evento exclusivo** (2026-11-12,
   * lo pidió el cliente). Con menos, pedirlo va como caso especial y quien
   * aprueba anota el motivo.
   */
  exclusivoDias: number;
  /**
   * **El show ecuestre en un día privado** (2026-11-20, lo pidió el
   * cliente): desde cuántas personas de una cotización el show se puede
   * dejar incluido sin costo, y cuánto se cobra como mínimo, neto + IVA,
   * cuando son menos. Vale en un día privado o exclusivo; en uno público el
   * show va siempre incluido. En 0 cualquiera de los dos, no hay mínimo.
   * Ver `reglaShowDe()` en `cotizar.ts`.
   */
  showGratisDesde: number;
  showMinimo: number;
  /**
   * **Con cuántos días de aviso se puede cambiar la fecha** (2026-11-23, lo
   * pidió el cliente: *"sí, agrego el plazo para cambiar la fecha en
   * configuraciones"*). En 0, sin plazo, como antes. El contrato lo dice, y
   * pasado ese plazo el contrato no ofrece el cambio (`plazosVencidos()`).
   */
  cambiosFechaDias: number;
  /**
   * **El arriendo mínimo** (2026-11-23, lo pidió el cliente: *"tengo que
   * evitar que un vendedor hace una reserva en un día cerrado… arrendó a 12
   * personas sin cobrar un ítem arriendo"*). Dos tramos por caso, cada uno
   * *hasta N personas: mínimo $X*, neto (+ IVA); desde el último, sin cargo.
   *
   * - **Privado**: un día que no está abierto al público (cerrado, privado o
   *   fuera del calendario, en la práctica de lunes a viernes). Cubre lo que
   *   cuesta abrir el día para el grupo.
   * - **Exclusivo**: un evento exclusivo en un día público. Repone lo que
   *   deja el público ese día.
   *
   * Un 0 en el tope o en el monto apaga ese tramo. Ver `reglaArriendoDe()`
   * en `cotizar.ts`, y "El arriendo mínimo" en `panel/CLAUDE.md`.
   */
  arriendoPrivadoHasta1: number;
  arriendoPrivadoMinimo1: number;
  arriendoPrivadoHasta2: number;
  arriendoPrivadoMinimo2: number;
  arriendoExclusivoHasta1: number;
  arriendoExclusivoMinimo1: number;
  arriendoExclusivoHasta2: number;
  arriendoExclusivoMinimo2: number;
  /**
   * **El arriendo estándar de lunes a viernes** (2026-11-25): lo que ve el cliente en el
   * cotizador del sitio cuando marca *Quiero el lugar exclusivo* un día de semana (el sitio
   * anuncia $1.500.000 contra $2.500.000 el fin de semana). Neto o con IVA según el producto
   * Arriendo del catálogo. En 0, vale el precio del catálogo todos los días.
   */
  arriendoSemana: number;
  /**
   * **El arriendo estándar de un día público** (2026-11-25): sábado, domingo o feriado abierto. Es el
   * que ve y paga quien marca *Quiero el lugar exclusivo* en el cotizador del sitio. En 0, el precio
   * del producto Arriendo del catálogo.
   */
  arriendoFinde: number;
  /**
   * **Los días en que no se arrienda en exclusiva** (2026-11-23): Día de la
   * Madre, del Padre, Fiestas Patrias. El público deja más que cualquier
   * arriendo, así que el vendedor no puede marcar *exclusivo*; decide quien
   * puede pasar por encima del mínimo. Fechas `AAAA-MM-DD`, ordenadas.
   */
  fechasSinExclusivo: string[];
  /**
   * La unidad compartida de Google Drive donde se guardan los comprobantes
   * de pago (2026-11-10). Es el ID que va después de `folders/`; vive acá y
   * no en el código porque Calicanto tendrá la suya. En blanco, no se puede
   * subir comprobantes y la pantalla lo dice.
   */
  driveComprobantes: string;
  /**
   * **Quién es esta empresa**, para el encabezado de la cotización y del
   * contrato. Cada panel lee una sola planilla (`GOOGLE_SHEET_ID`), así que
   * cada planilla dice de qué empresa es: Brasas de Lo Pirque hoy, Calicanto
   * mañana con la suya. Nada de esto se inventa: en blanco hasta que el
   * cliente lo escriba en Configuración.
   */
  empresa: Empresa;
}

export interface Empresa {
  nombre: string;
  razonSocial: string;
  rut: string;
  representante: string;
  /** La cédula del representante legal, para el contrato. */
  ciRepresentante: string;
  domicilio: string;
  /** Dónde se firman los contratos: "En Pirque, a …". */
  ciudadFirma: string;
  whatsapp: string;
  /** Banco, tipo y número de cuenta para el anticipo, como texto. */
  transferencia: string;
}

export const EMPRESA_VACIA: Empresa = {
  nombre: '', razonSocial: '', rut: '', representante: '', ciRepresentante: '',
  domicilio: '', ciudadFirma: '', whatsapp: '', transferencia: ''
};

/**
 * Los valores de hoy, que son los del backend viejo.
 *
 * Se usan cuando la pestaña `Config` no existe o le falta una fila, así que
 * **el panel funciona sin esa pestaña**: no hay que preparar nada para que
 * arranque, y agregarla solo sirve para cambiar algo.
 */
export const POR_DEFECTO: Config = {
  avisoPocosLugares: 10,
  cupoNormal: 60,
  horaApertura: '13:00',
  // 13:00 a 18:00 es el horario del negocio, una sola jornada por día.
  horaCierre: '18:00',
  diasAbiertos: [6, 0],          // sábado y domingo
  diasAFuturo: 90,
  cortes: { amarillo: 0.6, rojo: 0.85 },
  tokenPlanilla: '',
  vigenciaPresupuesto: 15,
  grupoGrande: 30,
  margenMinimo: 0,
  gastosEvento: '',
  capacidadMaxima: 900,
  descuentos: [5, 10, 15],
  // Los de la cotización del CRM, que es lo que los clientes ya recibían.
  anticipoPct: 30,
  saldoDias: 3,
  // Los del contrato del CRM, que es lo que los clientes ya firmaban.
  cambiosFecha: 2,
  cancelacionDias: 60,
  reembolsoPct: 20,
  seguimientoDias: 5,
  vendedorSitio: '',
  avisoEvento: 14,
  exclusivoDias: 7,
  // Los fijó el cliente el 2026-11-20: bajo 25 personas, $100.000 + IVA.
  showGratisDesde: 25,
  showMinimo: 100000,
  // En 0, sin plazo: el número lo pone el cliente en Configuración.
  cambiosFechaDias: 0,
  // Los fijó el cliente el 2026-11-23, con el análisis de costos de
  // mayo a septiembre y Lo Pirque a $50.000 + IVA ("ármalo así"). Ver
  // "El arriendo mínimo" en panel/CLAUDE.md.
  arriendoPrivadoHasta1: 10,
  arriendoPrivadoMinimo1: 400000,
  arriendoPrivadoHasta2: 15,
  arriendoPrivadoMinimo2: 200000,
  arriendoExclusivoHasta1: 20,
  arriendoExclusivoMinimo1: 1000000,
  arriendoExclusivoHasta2: 37,
  arriendoExclusivoMinimo2: 600000,
  // Los dos precios que el sitio anuncia y el cliente confirmó el 2026-11-25.
  arriendoSemana: 1500000,
  arriendoFinde: 2500000,
  fechasSinExclusivo: [],
  driveComprobantes: '',
  empresa: EMPRESA_VACIA
};

/** Las claves como se escriben en la planilla, en el orden en que se muestran. */
export const CLAVES = {
  avisoPocosLugares: 'aviso_pocos_lugares',
  cupoNormal: 'cupo_normal',
  horaApertura: 'hora_apertura',
  horaCierre: 'hora_cierre',
  diasAbiertos: 'dias_abiertos',
  diasAFuturo: 'dias_a_futuro',
  corteAmarillo: 'corte_amarillo',
  corteRojo: 'corte_rojo',
  tokenPlanilla: 'token_planilla',
  vigenciaPresupuesto: 'vigencia_presupuesto',
  grupoGrande: 'grupo_grande',
  margenMinimo: 'margen_minimo',
  gastosEvento: 'gastos_evento',
  capacidadMaxima: 'capacidad_maxima',
  descuentos: 'descuentos',
  anticipoPct: 'anticipo_porcentaje',
  saldoDias: 'saldo_dias_antes',
  cambiosFecha: 'contrato_cambios_fecha',
  cancelacionDias: 'contrato_cancelacion_dias',
  reembolsoPct: 'contrato_reembolso',
  seguimientoDias: 'seguimiento_dias',
  vendedorSitio: 'cotizaciones_sitio_vendedor',
  avisoEvento: 'seguimiento_antes_evento',
  exclusivoDias: 'exclusivo_dias_minimos',
  showGratisDesde: 'show_gratis_desde',
  showMinimo: 'show_minimo_privado',
  cambiosFechaDias: 'contrato_cambios_fecha_aviso',
  arriendoPrivadoHasta1: 'arriendo_privado_hasta_1',
  arriendoPrivadoMinimo1: 'arriendo_privado_minimo_1',
  arriendoPrivadoHasta2: 'arriendo_privado_hasta_2',
  arriendoPrivadoMinimo2: 'arriendo_privado_minimo_2',
  arriendoExclusivoHasta1: 'arriendo_exclusivo_hasta_1',
  arriendoExclusivoMinimo1: 'arriendo_exclusivo_minimo_1',
  arriendoExclusivoHasta2: 'arriendo_exclusivo_hasta_2',
  arriendoExclusivoMinimo2: 'arriendo_exclusivo_minimo_2',
  arriendoSemana: 'arriendo_semana',
  arriendoFinde: 'arriendo_finde',
  fechasSinExclusivo: 'fechas_sin_exclusivo',
  driveComprobantes: 'drive_comprobantes',
  empresaNombre: 'empresa_nombre',
  empresaRazonSocial: 'empresa_razon_social',
  empresaRut: 'empresa_rut',
  empresaRepresentante: 'empresa_representante',
  empresaCiRepresentante: 'empresa_ci_representante',
  empresaDomicilio: 'empresa_domicilio',
  empresaCiudadFirma: 'contrato_ciudad',
  empresaWhatsapp: 'empresa_whatsapp',
  empresaTransferencia: 'empresa_transferencia'
} as const;

/**
 * "5, 10, 15" -> [5, 10, 15]. Entre 1 y 99, sin repetidos y ordenados.
 * Null si no se entiende ni uno, para que quien llame use el de siempre.
 */
/**
 * "2027-05-09, 9/5/2027" -> ["2027-05-09"]: las fechas de una lista escrita a
 * mano, como `AAAA-MM-DD`, sin repetidos y ordenadas. Acepta también el día
 * primero (`9-5-2027`, `09/05/2027`), que es como se escribe en Chile. Lo
 * que no es una fecha se ignora.
 */
export function aFechas(texto: unknown): string[] {
  const salida: string[] = [];
  for (const p of String(texto ?? '').split(/[,;\s]+/)) {
    let a = 0; let m = 0; let d = 0;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(p);
    const chi = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(p);
    if (iso) { a = +iso[1]; m = +iso[2]; d = +iso[3]; }
    else if (chi) { d = +chi[1]; m = +chi[2]; a = +chi[3]; }
    else continue;
    const f = new Date(a, m - 1, d);
    if (f.getFullYear() !== a || f.getMonth() !== m - 1 || f.getDate() !== d) continue;
    salida.push(`${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return [...new Set(salida)].sort();
}

export function aDescuentos(texto: unknown): number[] | null {
  const salida = String(texto ?? '').split(/[,;\s%]+/)
    .map((p) => Number(p.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 100)
    .map((n) => Math.round(n * 10) / 10);
  const unicos = [...new Set(salida)].sort((a, b) => a - b);
  return unicos.length ? unicos : null;
}

/**
 * Los días de la semana como los escribe una persona.
 *
 * Se aceptan con y sin tilde, en singular, y abreviados a tres letras,
 * porque la planilla la llena alguien a mano y "sab", "sáb" y "sábado" son
 * la misma intención. `normalizar()` ya saca tildes y mayúsculas.
 */
const DIAS: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miercoles: 3, mie: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sabado: 6, sab: 6
};

/** "sáb,dom" -> [6, 0]. Devuelve null si no se entiende ni un día. */
export function aDiasSemana(texto: unknown): number[] | null {
  const partes = String(texto ?? '').split(/[,;/\s]+/).filter(Boolean);
  const salida: number[] = [];
  for (const p of partes) {
    const d = DIAS[normalizar(p)];
    if (d === undefined) continue;
    if (!salida.includes(d)) salida.push(d);
  }
  return salida.length ? salida : null;
}

/** [6, 0] -> "sáb,dom", para mostrarlo en el panel. */
export function deDiasSemana(dias: number[]): string {
  const nombre = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return dias.map((d) => nombre[d] ?? '?').join(',');
}

/**
 * Un número, o el valor por defecto si lo escrito no sirve.
 *
 * **Nunca lanza y nunca devuelve algo fuera de rango**, y eso es a
 * propósito: un cupo en cero o un umbral negativo escritos por error no
 * pueden dejar el panel sin dibujar. Se ignora el valor malo y se sigue con
 * el de siempre, que es visible y correcto.
 */
function numero(v: unknown, porDefecto: number, min: number, max: number): number {
  const crudo = String(v ?? '').trim();
  // Una celda vacía es "no configurado", no un cero. Sin esta línea
  // Number('') daba 0, y un 0 dentro del rango se tomaba como el valor
  // elegido: el umbral de "pocos lugares" se apagaba solo.
  if (crudo === '') return porDefecto;
  const n = Number(crudo.replace(',', '.').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n) || n < min || n > max) return porDefecto;
  return n;
}

/**
 * Un corte del semáforo. Se acepta `0.6` y también `60`, porque quien lo
 * escriba en una planilla va a poner un porcentaje.
 */
function fraccion(v: unknown, porDefecto: number): number {
  const n = Number(String(v ?? '').replace('%', '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return porDefecto;
  const f = n > 1 ? n / 100 : n;
  return f > 0 && f <= 1 ? f : porDefecto;
}

const texto = (v: unknown) => String(v ?? '').trim();

/** Las filas de la pestaña `Config` como configuración. */
export function leerConfigDe(filas: string[][]): Config {
  const mapa = new Map<string, string>();
  for (let i = 1; i < filas.length; i++) {
    const clave = normalizar(String(filas[i]?.[0] ?? '')).replace(/\s/g, '_');
    if (clave) mapa.set(clave, String(filas[i]?.[1] ?? ''));
  }
  const v = (k: string) => mapa.get(normalizar(k).replace(/\s/g, '_'));

  const cortes = {
    amarillo: fraccion(v(CLAVES.corteAmarillo), POR_DEFECTO.cortes.amarillo),
    rojo: fraccion(v(CLAVES.corteRojo), POR_DEFECTO.cortes.rojo)
  };
  // Amarillo tiene que entrar antes que rojo. Al revés, el amarillo nunca se
  // vería: se evalúa rojo primero. Se ignoran los dos en vez de dibujar un
  // semáforo que no significa nada.
  if (cortes.amarillo >= cortes.rojo) {
    cortes.amarillo = POR_DEFECTO.cortes.amarillo;
    cortes.rojo = POR_DEFECTO.cortes.rojo;
  }

  return {
    avisoPocosLugares: numero(v(CLAVES.avisoPocosLugares),
      POR_DEFECTO.avisoPocosLugares, 0, 10000),
    cupoNormal: numero(v(CLAVES.cupoNormal), POR_DEFECTO.cupoNormal, 1, 100000),
    horaApertura: String(v(CLAVES.horaApertura) ?? '').trim() || POR_DEFECTO.horaApertura,
    horaCierre: String(v(CLAVES.horaCierre) ?? '').trim() || POR_DEFECTO.horaCierre,
    diasAbiertos: aDiasSemana(v(CLAVES.diasAbiertos)) ?? POR_DEFECTO.diasAbiertos,
    diasAFuturo: numero(v(CLAVES.diasAFuturo), POR_DEFECTO.diasAFuturo, 1, 3650),
    cortes,
    tokenPlanilla: String(v(CLAVES.tokenPlanilla) ?? '').trim(),
    // El mínimo es 0 —sin vencimiento— y no 1: es un valor que alguien puede
    // querer de verdad, y rechazarlo lo devolvería en silencio a 15.
    vigenciaPresupuesto: numero(v(CLAVES.vigenciaPresupuesto),
      POR_DEFECTO.vigenciaPresupuesto, 0, 3650),
    // En cero no se avisa: alguien que no quiere el aviso tiene que poder
    // apagarlo sin que vuelva solo a 30.
    grupoGrande: numero(v(CLAVES.grupoGrande), POR_DEFECTO.grupoGrande, 0, 100000),
    margenMinimo: numero(v(CLAVES.margenMinimo), POR_DEFECTO.margenMinimo, 0, 95),
    gastosEvento: texto(v(CLAVES.gastosEvento)),
    capacidadMaxima: numero(v(CLAVES.capacidadMaxima), POR_DEFECTO.capacidadMaxima, 1, 100000),
    descuentos: aDescuentos(v(CLAVES.descuentos)) ?? POR_DEFECTO.descuentos,
    // En cero no hay anticipo: es un valor que alguien puede querer.
    anticipoPct: numero(v(CLAVES.anticipoPct), POR_DEFECTO.anticipoPct, 0, 100),
    saldoDias: numero(v(CLAVES.saldoDias), POR_DEFECTO.saldoDias, 0, 365),
    cambiosFecha: numero(v(CLAVES.cambiosFecha), POR_DEFECTO.cambiosFecha, 0, 10),
    cancelacionDias: numero(v(CLAVES.cancelacionDias), POR_DEFECTO.cancelacionDias, 0, 365),
    reembolsoPct: numero(v(CLAVES.reembolsoPct), POR_DEFECTO.reembolsoPct, 0, 100),
    seguimientoDias: numero(v(CLAVES.seguimientoDias), POR_DEFECTO.seguimientoDias, 0, 365),
    vendedorSitio: String(v(CLAVES.vendedorSitio) ?? '').trim(),
    avisoEvento: numero(v(CLAVES.avisoEvento), POR_DEFECTO.avisoEvento, 0, 365),
    exclusivoDias: numero(v(CLAVES.exclusivoDias), POR_DEFECTO.exclusivoDias, 0, 365),
    // En cero no hay mínimo: es un valor que alguien puede querer.
    showGratisDesde: numero(v(CLAVES.showGratisDesde), POR_DEFECTO.showGratisDesde, 0, 100000),
    showMinimo: numero(v(CLAVES.showMinimo), POR_DEFECTO.showMinimo, 0, 100000000),
    cambiosFechaDias: numero(v(CLAVES.cambiosFechaDias), POR_DEFECTO.cambiosFechaDias, 0, 365),
    // En cero se apaga ese tramo: es un valor que alguien puede querer.
    arriendoPrivadoHasta1: numero(v(CLAVES.arriendoPrivadoHasta1), POR_DEFECTO.arriendoPrivadoHasta1, 0, 100000),
    arriendoPrivadoMinimo1: numero(v(CLAVES.arriendoPrivadoMinimo1), POR_DEFECTO.arriendoPrivadoMinimo1, 0, 1000000000),
    arriendoPrivadoHasta2: numero(v(CLAVES.arriendoPrivadoHasta2), POR_DEFECTO.arriendoPrivadoHasta2, 0, 100000),
    arriendoPrivadoMinimo2: numero(v(CLAVES.arriendoPrivadoMinimo2), POR_DEFECTO.arriendoPrivadoMinimo2, 0, 1000000000),
    arriendoExclusivoHasta1: numero(v(CLAVES.arriendoExclusivoHasta1), POR_DEFECTO.arriendoExclusivoHasta1, 0, 100000),
    arriendoExclusivoMinimo1: numero(v(CLAVES.arriendoExclusivoMinimo1), POR_DEFECTO.arriendoExclusivoMinimo1, 0, 1000000000),
    arriendoExclusivoHasta2: numero(v(CLAVES.arriendoExclusivoHasta2), POR_DEFECTO.arriendoExclusivoHasta2, 0, 100000),
    arriendoExclusivoMinimo2: numero(v(CLAVES.arriendoExclusivoMinimo2), POR_DEFECTO.arriendoExclusivoMinimo2, 0, 1000000000),
    arriendoSemana: numero(v(CLAVES.arriendoSemana), POR_DEFECTO.arriendoSemana, 0, 1000000000),
    arriendoFinde: numero(v(CLAVES.arriendoFinde), POR_DEFECTO.arriendoFinde, 0, 1000000000),
    fechasSinExclusivo: aFechas(v(CLAVES.fechasSinExclusivo)),
    driveComprobantes: idDeDrive(v(CLAVES.driveComprobantes)),
    empresa: {
      nombre: texto(v(CLAVES.empresaNombre)),
      razonSocial: texto(v(CLAVES.empresaRazonSocial)),
      rut: texto(v(CLAVES.empresaRut)),
      representante: texto(v(CLAVES.empresaRepresentante)),
      ciRepresentante: texto(v(CLAVES.empresaCiRepresentante)),
      domicilio: texto(v(CLAVES.empresaDomicilio)),
      ciudadFirma: texto(v(CLAVES.empresaCiudadFirma)),
      whatsapp: texto(v(CLAVES.empresaWhatsapp)),
      transferencia: texto(v(CLAVES.empresaTransferencia))
    }
  };
}

/** La configuración como filas, para escribirla de vuelta. */
export function aFilasConfig(c: Config): string[][] {
  return [
    [COL_CONFIG.clave, COL_CONFIG.valor],
    [CLAVES.avisoPocosLugares, String(c.avisoPocosLugares)],
    [CLAVES.cupoNormal, String(c.cupoNormal)],
    [CLAVES.horaApertura, c.horaApertura],
    [CLAVES.horaCierre, c.horaCierre],
    [CLAVES.diasAbiertos, deDiasSemana(c.diasAbiertos)],
    [CLAVES.diasAFuturo, String(c.diasAFuturo)],
    [CLAVES.corteAmarillo, String(Math.round(c.cortes.amarillo * 100))],
    [CLAVES.corteRojo, String(Math.round(c.cortes.rojo * 100))],
    [CLAVES.tokenPlanilla, c.tokenPlanilla],
    [CLAVES.vigenciaPresupuesto, String(c.vigenciaPresupuesto)],
    [CLAVES.grupoGrande, String(c.grupoGrande)],
    [CLAVES.margenMinimo, String(c.margenMinimo)],
    [CLAVES.gastosEvento, c.gastosEvento],
    [CLAVES.capacidadMaxima, String(c.capacidadMaxima)],
    [CLAVES.descuentos, c.descuentos.join(', ')],
    [CLAVES.anticipoPct, String(c.anticipoPct)],
    [CLAVES.saldoDias, String(c.saldoDias)],
    [CLAVES.cambiosFecha, String(c.cambiosFecha)],
    [CLAVES.cancelacionDias, String(c.cancelacionDias)],
    [CLAVES.reembolsoPct, String(c.reembolsoPct)],
    [CLAVES.seguimientoDias, String(c.seguimientoDias)],
    [CLAVES.vendedorSitio, c.vendedorSitio],
    [CLAVES.avisoEvento, String(c.avisoEvento)],
    [CLAVES.exclusivoDias, String(c.exclusivoDias)],
    [CLAVES.showGratisDesde, String(c.showGratisDesde)],
    [CLAVES.showMinimo, String(c.showMinimo)],
    [CLAVES.cambiosFechaDias, String(c.cambiosFechaDias)],
    [CLAVES.arriendoPrivadoHasta1, String(c.arriendoPrivadoHasta1)],
    [CLAVES.arriendoPrivadoMinimo1, String(c.arriendoPrivadoMinimo1)],
    [CLAVES.arriendoPrivadoHasta2, String(c.arriendoPrivadoHasta2)],
    [CLAVES.arriendoPrivadoMinimo2, String(c.arriendoPrivadoMinimo2)],
    [CLAVES.arriendoExclusivoHasta1, String(c.arriendoExclusivoHasta1)],
    [CLAVES.arriendoExclusivoMinimo1, String(c.arriendoExclusivoMinimo1)],
    [CLAVES.arriendoExclusivoHasta2, String(c.arriendoExclusivoHasta2)],
    [CLAVES.arriendoExclusivoMinimo2, String(c.arriendoExclusivoMinimo2)],
    [CLAVES.arriendoSemana, String(c.arriendoSemana)],
    [CLAVES.arriendoFinde, String(c.arriendoFinde)],
    [CLAVES.fechasSinExclusivo, c.fechasSinExclusivo.join(', ')],
    [CLAVES.driveComprobantes, c.driveComprobantes],
    [CLAVES.empresaNombre, c.empresa.nombre],
    [CLAVES.empresaRazonSocial, c.empresa.razonSocial],
    [CLAVES.empresaRut, c.empresa.rut],
    [CLAVES.empresaRepresentante, c.empresa.representante],
    [CLAVES.empresaCiRepresentante, c.empresa.ciRepresentante],
    [CLAVES.empresaDomicilio, c.empresa.domicilio],
    [CLAVES.empresaCiudadFirma, c.empresa.ciudadFirma],
    [CLAVES.empresaWhatsapp, c.empresa.whatsapp],
    [CLAVES.empresaTransferencia, c.empresa.transferencia]
  ];
}

/**
 * El ID de una carpeta o unidad de Drive, escrito como ID o pegado como el
 * link entero (`https://drive.google.com/drive/folders/0AEF…`). Lo que no
 * parece un ID queda en blanco: un valor inventado haría fallar cada subida.
 */
export function idDeDrive(v: unknown): string {
  const t = String(v ?? '').trim();
  const m = t.match(/folders\/([A-Za-z0-9_-]{10,})/) ?? t.match(/^([A-Za-z0-9_-]{10,})$/);
  return m ? m[1] : '';
}
