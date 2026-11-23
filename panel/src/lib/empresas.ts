/**
 * **Qué empresas atiende el panel y en qué dirección vive cada una**
 * (2026-11-23, Fase 5, pasos 3 y 4).
 *
 * El cliente lo decidió así: *"los mundos igual independientes viven
 * independientes y con sus URLs"*. El mismo panel atiende a Brasas de Lo
 * Pirque en `panel.brasasdelopirque.cl` y a Asados y Corderos en
 * `panel.asadosycorderos.cl`; **la dirección dice de qué empresa es todo lo
 * que se ve y se escribe**.
 *
 * Este archivo no importa nada de Node: lo carga también el middleware, que
 * corre en el runtime Edge. Lo que es secreto de cada empresa —su planilla,
 * su cuenta de servicio— vive en `empresa.ts`.
 *
 * - **Lo Pirque es la casa**: cualquier dirección que no sea de otra empresa
 *   es suya (las versiones de prueba, `landing-pirque-alpha.vercel.app`, un
 *   computador). Olvidarse de algo nunca termina en la otra empresa.
 * - **Asados y Corderos está apagada mientras no tenga su planilla**
 *   (`AYC_GOOGLE_SHEET_ID`): sin ella, su dirección se atiende como Lo
 *   Pirque y nada del panel la nombra.
 */
type Entorno = Record<string, string | undefined>;

export const CASA = 'lo-pirque';
export const AYC = 'asados-y-corderos';

export interface FichaEmpresa {
  id: string;
  /** Cómo se llama en la barra del panel y en la columna de su rol. */
  nombre: string;
  /** Sus direcciones. La primera es a donde se manda a quien pasa a ella. */
  hosts: string[];
  /** Si tiene con qué funcionar. La casa, siempre. */
  configurada: boolean;
}

const lista = (texto: string | undefined, defecto: string): string[] => {
  const dados = String(texto ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  return dados.length ? dados : [defecto];
};

/** Las empresas que el panel conoce, con la casa primero. */
export function empresasDe(env: Entorno): FichaEmpresa[] {
  return [
    { id: CASA, nombre: 'Brasas de Lo Pirque', configurada: true,
      hosts: lista(env.PANEL_HOSTS, 'panel.brasasdelopirque.cl') },
    { id: AYC, nombre: 'Asados y Corderos', configurada: !!String(env.AYC_GOOGLE_SHEET_ID ?? '').trim(),
      hosts: lista(env.AYC_PANEL_HOSTS, 'panel.asadosycorderos.cl') }
  ];
}

/** Las que están encendidas. Con una sola, el panel es el de siempre. */
export function empresasEncendidas(env: Entorno): FichaEmpresa[] {
  return empresasDe(env).filter((e) => e.configurada);
}

/** Sin puerto y en minúsculas: `Panel.X.cl:443` y `panel.x.cl` son la misma. */
const sinPuerto = (host: string) => host.trim().toLowerCase().replace(/:\d+$/, '');

/**
 * De qué empresa es una dirección. **Todo lo que no calce con otra empresa
 * encendida es de la casa.**
 */
export function empresaDeHost(host: unknown, env: Entorno): string {
  const h = sinPuerto(String(host ?? ''));
  if (!h) return CASA;
  for (const e of empresasEncendidas(env)) {
    if (e.id !== CASA && e.hosts.some((x) => sinPuerto(x) === h)) return e.id;
  }
  return CASA;
}

export function fichaDe(id: string, env: Entorno): FichaEmpresa {
  return empresasDe(env).find((e) => e.id === id) ?? empresasDe(env)[0];
}

/** La dirección completa de una empresa: a donde se manda a quien pasa a ella. */
export function direccionDe(id: string, env: Entorno): string {
  const host = fichaDe(id, env).hosts[0];
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  return `${local ? 'http' : 'https'}://${host}`;
}

/** El nombre de la columna de `Usuarios` con el rol en esa empresa. */
export function columnaDelRol(e: FichaEmpresa): string {
  return `Rol ${e.nombre}`;
}
