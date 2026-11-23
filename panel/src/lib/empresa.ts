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
export interface Empresa {
  /** Su nombre corto, fijo. No es el nombre comercial, que vive en `Config`. */
  id: string;
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

/** La empresa que atiende este panel. Hoy, una sola. */
export function empresaActual(): Empresa {
  return {
    id: 'lo-pirque',
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
