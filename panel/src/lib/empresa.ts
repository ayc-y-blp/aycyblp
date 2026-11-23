/**
 * **La empresa, como una pieza** (2026-11-22, primer paso de la Fase 5).
 *
 * El panel atiende hoy a una sola empresa —Brasas de Lo Pirque—, y qué
 * planilla, qué tienda y qué calendario son los suyos estaba repartido en
 * siete archivos, cada uno leyendo su variable de entorno. La Fase 5 suma a
 * Calicanto con su propia planilla, y el cliente pidió poder seguir
 * desarrollando Lo Pirque mientras tanto, *"pero que no quede la cagada
 * cuando lo queremos unificar"*. Por eso el primer paso es éste, que **no
 * cambia nada de lo que el panel hace**: todo lo que es *de la empresa* se
 * pregunta acá, en un solo lugar.
 *
 * - **Hoy hay una sola**, armada con las mismas variables de siempre. No hay
 *   selector ni segunda planilla: eso viene en los pasos siguientes, y va a
 *   cambiar este archivo, no los siete que lo usan.
 * - **Se lee del entorno en cada llamada**, sin guardar nada: es lo que ya
 *   hacía cada archivo, y las pruebas cambian las variables entre un caso y
 *   otro.
 * - **Los valores van tal cual**: limpiarlos (sacar el `https://`, los
 *   espacios, los `\n` de la clave) sigue siendo de quien los usa, donde está
 *   escrito por qué.
 * - **Lo que no es de una empresa no va acá**: la sesión, el administrador de
 *   emergencia, `CRON_SECRET`, la planilla de comentarios y el entorno de
 *   Vercel son del panel entero.
 *
 * Una prueba (`npm run prueba`) fija que ningún otro archivo lea estas
 * variables por su cuenta: una lectura suelta sería una empresa que se
 * escapa de la pieza. El plan completo está en `panel/FASE5.md`.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { AYC, CASA, empresaDeHost, fichaDe } from './empresas.ts';

export interface Empresa {
  /** Su nombre corto, fijo. No es el nombre comercial, que vive en `Config`. */
  id: string;
  /** Cómo se llama en la barra del panel. */
  nombre: string;
  /** El id de su planilla de Google. */
  planilla: string;
  /** La cuenta de servicio que lee y escribe esa planilla. */
  cuenta: { correo: string; clave: string };
  /** El calendario de Google donde se anotan sus reservas. Opcional. */
  calendario: string;
  /** Su tienda de Shopify. */
  tienda: {
    dominio: string; tokenFijo: string; clienteId: string; clienteSecreto: string;
    version: string; secretoWebhook: string;
  };
  /** La clave del CRM del socio. Opcional, y hoy apagada. */
  claveCrm: string;
}

const v = (nombre: string) => process.env[nombre] ?? '';

/** Las variables que son de una empresa: solo este archivo las lee. */
export const VARIABLES_DE_LA_EMPRESA = [
  'GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CALENDAR_ID',
  'SHOPIFY_DOMINIO', 'SHOPIFY_ADMIN_TOKEN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET',
  'SHOPIFY_VERSION', 'SHOPIFY_WEBHOOK_SECRET', 'CRM_API_KEY'
] as const;

/**
 * La empresa de la petición en curso, cuando alguien la fijó con
 * `conEmpresa()`. Fuera de eso no hay ninguna y rige la del entorno.
 */
const ambiente = new AsyncLocalStorage<Empresa>();

/** La empresa armada con las variables de siempre: Brasas de Lo Pirque. */
function delEntorno(): Empresa {
  return {
    id: CASA,
    nombre: fichaDe(CASA, process.env).nombre,
    planilla: v('GOOGLE_SHEET_ID'),
    cuenta: { correo: v('GOOGLE_SERVICE_ACCOUNT_EMAIL'), clave: v('GOOGLE_PRIVATE_KEY') },
    calendario: v('GOOGLE_CALENDAR_ID'),
    tienda: {
      dominio: v('SHOPIFY_DOMINIO'), tokenFijo: v('SHOPIFY_ADMIN_TOKEN'),
      clienteId: v('SHOPIFY_CLIENT_ID'), clienteSecreto: v('SHOPIFY_CLIENT_SECRET'),
      version: v('SHOPIFY_VERSION'), secretoWebhook: v('SHOPIFY_WEBHOOK_SECRET')
    },
    claveCrm: v('CRM_API_KEY')
  };
}

/**
 * **Asados y Corderos** (2026-11-23), con sus propias variables, todas con
 * `AYC_` adelante. Lo que no trae:
 *
 * - **Tienda**: no vende por Shopify (lo decidió el cliente: es solo
 *   eventos). Sus campos van vacíos, y así `configurado()` da falso.
 * - **Cuenta de servicio propia, si se le da**: con `AYC_GOOGLE_…` usa la
 *   suya —y su propio cupo de 60 lecturas por minuto—; sin ellas, la de la
 *   casa, que entonces tiene que tener acceso a su planilla.
 */
function asadosYCorderos(): Empresa {
  const casa = delEntorno();
  return {
    id: AYC,
    nombre: fichaDe(AYC, process.env).nombre,
    planilla: v('AYC_GOOGLE_SHEET_ID'),
    cuenta: {
      correo: v('AYC_GOOGLE_SERVICE_ACCOUNT_EMAIL') || casa.cuenta.correo,
      clave: v('AYC_GOOGLE_PRIVATE_KEY') || casa.cuenta.clave
    },
    calendario: v('AYC_GOOGLE_CALENDAR_ID'),
    tienda: { dominio: '', tokenFijo: '', clienteId: '', clienteSecreto: '', version: '', secretoWebhook: '' },
    claveCrm: ''
  };
}

/** Una empresa por su id. Una que no existe, o apagada, es la casa. */
export function empresaPorId(id: string): Empresa {
  return id === AYC && fichaDe(AYC, process.env).configurada ? asadosYCorderos() : delEntorno();
}

/** La casa: donde vive la lista de cuentas, que es una sola para todas. */
export function laCasa(): Empresa {
  return delEntorno();
}

/** La empresa de una petición, por su dirección. */
export function empresaDeLaPeticion(req: { headers: { get(n: string): string | null } }): Empresa {
  return empresaPorId(empresaDeHost(req.headers.get('host'), process.env));
}

/**
 * La empresa que atiende esta petición: la que fijó `conEmpresa()`, y si
 * nadie fijó ninguna, la casa. La fija `conLecturas()` al entrar a cada
 * ruta, por la dirección de la petición.
 */
export function empresaActual(): Empresa {
  return ambiente.getStore() ?? delEntorno();
}

/**
 * Corre `fn` con esa empresa: todo lo que pregunte `empresaActual()` adentro
 * —también después de un `await`— recibe ésa. Es lo que va a usar el paso de
 * *una dirección por empresa* para decir de quién es cada petición.
 */
export function conEmpresa<R>(empresa: Empresa, fn: () => R): R {
  return ambiente.run(empresa, fn);
}

/**
 * **Lo que el panel recuerda mientras vive una instancia, guardado por
 * empresa** (2026-11-23, segundo paso de la Fase 5).
 *
 * El panel recuerda cosas entre una petición y la siguiente: la lista de
 * pestañas de la planilla, la credencial de Google, el token de Shopify, si
 * la bitácora ya tiene encabezado. Con una sola empresa bastaba una
 * variable suelta por archivo. Con dos, esa variable sería **la pestaña de
 * una empresa respondida con la lista de la otra**, o una escritura con la
 * credencial equivocada: justo la mezcla que no puede pasar.
 *
 * `porEmpresa(crear)` devuelve una función que entrega la memoria de la
 * empresa en curso, creándola la primera vez. La llave es su id, su
 * planilla y su cuenta: si cambia cualquiera de las tres —las pruebas lo
 * hacen—, es otra memoria.
 */
export function porEmpresa<T>(crear: () => T): () => T {
  const memorias = new Map<string, T>();
  return () => {
    const e = empresaActual();
    const llave = `${e.id}\n${e.planilla}\n${e.cuenta.correo}`;
    let m = memorias.get(llave);
    if (m === undefined) { m = crear(); memorias.set(llave, m); }
    return m;
  };
}
