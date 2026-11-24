/**
 * **Las otras empresas** (2026-11-24, lo pidió el cliente: *"tal vez hasta se
 * puede tener que ingresar la otra cuenta, la otra empresa y poder elegirla,
 * porque el karting va a quedar ahí al lado. Entonces, si se suma el karting,
 * obviamente se puede elegir directamente el karting con sus datos… para
 * mostrarlo bien en la cotización o en el contrato también, que es igual que
 * el taller de queso"*). Decidió además que **no pagan comisión** y que **van
 * en una línea del contrato**.
 *
 * Son las empresas que prestan y cobran directamente algo que se vende junto
 * con el evento: el karting, el taller de queso, un transfer. Su plata **no
 * pasa por nosotros** (`cuentasDe()` deja sus líneas fuera del total): acá
 * viven solo sus datos, para elegirlas en un producto (`Lo cobra`), mostrarlas
 * en la cotización y el contrato, y escribirles para coordinar.
 *
 * **El nombre es la identidad**, como en el resto del panel: el producto y la
 * línea de la cotización guardan el nombre escrito. Cambiarlo en esta lista lo
 * arrastra (`DONDE.empresa` en `lib/renombrar.ts`).
 *
 * Es puro, sin la planilla: la lee y la escribe `lib/datos.ts`.
 */
import { normalizar, indices } from './columnas.ts';

export const HOJA_OTRAS_EMPRESAS = 'Otras empresas';

export const COL_OTRAS_EMPRESAS = {
  nombre: 'Nombre',
  rut: 'RUT',
  /** Con quién se habla: una persona. */
  contacto: 'Contacto',
  telefono: 'Teléfono',
  correo: 'Correo',
  /** Qué hace: *karting*, *taller de queso*, *transfer desde Santiago*. */
  que: 'Qué hace',
  activa: 'Activa'
} as const;

export const ENCABEZADO_OTRAS_EMPRESAS: string[] = Object.values(COL_OTRAS_EMPRESAS);

export interface OtraEmpresa {
  nombre: string;
  rut: string;
  contacto: string;
  telefono: string;
  correo: string;
  que: string;
  activa: boolean;
}

const texto = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const esNo = (v: unknown) => ['no', 'n', 'false', '0'].includes(String(v ?? '').trim().toLowerCase());

/** Una empresa limpia: lo que llega del navegador o de una fila. Sin nombre no es nada. */
export function limpiarOtraEmpresa(x: Partial<Record<keyof OtraEmpresa, unknown>>): OtraEmpresa {
  return {
    nombre: texto(x.nombre, 60),
    rut: texto(x.rut, 20),
    contacto: texto(x.contacto, 60),
    telefono: texto(x.telefono, 30),
    correo: texto(x.correo, 80),
    que: texto(x.que, 120),
    // En blanco es sí: una fila escrita a mano sin esa columna sigue viva.
    activa: typeof x.activa === 'boolean' ? x.activa : !esNo(x.activa)
  };
}

/** Las empresas de la pestaña, por nombre de columna. Una repetida (sin tildes ni mayúsculas) cuenta una vez. */
export function leerOtrasEmpresasDe(filas: string[][]): OtraEmpresa[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_OTRAS_EMPRESAS);
  if (i.nombre === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));
  const vistas = new Set<string>();
  const salida: OtraEmpresa[] = [];
  for (const f of filas.slice(1)) {
    const e = limpiarOtraEmpresa({
      nombre: en(f, i.nombre), rut: en(f, i.rut), contacto: en(f, i.contacto), telefono: en(f, i.telefono),
      correo: en(f, i.correo), que: en(f, i.que), activa: en(f, i.activa)
    });
    if (!e.nombre || vistas.has(normalizar(e.nombre))) continue;
    vistas.add(normalizar(e.nombre));
    salida.push(e);
  }
  return salida;
}

export function aFilasOtrasEmpresas(lista: OtraEmpresa[]): string[][] {
  return [ENCABEZADO_OTRAS_EMPRESAS, ...lista.map((e) => [
    e.nombre, e.rut, e.contacto, e.telefono, e.correo, e.que, e.activa ? 'sí' : 'no'
  ])];
}

/** La empresa con ese nombre, sin mirar tildes ni mayúsculas. */
export const empresaDe = (lista: OtraEmpresa[], nombre: string | undefined) =>
  nombre ? lista.find((e) => normalizar(e.nombre) === normalizar(nombre)) : undefined;

/**
 * **Los nombres que un producto ya usa y no están en la lista** —el *Karting
 * Pirque* que se escribió a mano antes de que existiera la lista—, para
 * completarlos con sus datos.
 */
export function sinFicha(usados: string[], lista: OtraEmpresa[]): string[] {
  const vistos = new Set<string>();
  return usados.map((n) => n.trim()).filter((n) => {
    if (!n || empresaDe(lista, n) || vistos.has(normalizar(n))) return false;
    vistos.add(normalizar(n));
    return true;
  });
}

/** *RUT 76.111.222-3 · Juan Pérez · +56 9 1234 5678 · juan@…*: lo que se muestra de una empresa. */
export function datosEnFrase(e: Pick<OtraEmpresa, 'rut' | 'contacto' | 'telefono' | 'correo'> | undefined): string {
  return datosDe(e).join(' · ');
}

/** Los mismos datos, uno por uno: para dibujarlos sin que un teléfono se parta en dos renglones. */
export function datosDe(e: Pick<OtraEmpresa, 'rut' | 'contacto' | 'telefono' | 'correo'> | undefined): string[] {
  if (!e) return [];
  return [e.rut ? `RUT ${e.rut}` : '', e.contacto, e.telefono, e.correo].filter(Boolean);
}

/**
 * **La línea del contrato** (2026-11-24, lo decidió el cliente: *"sí va en una
 * línea del contrato"*): cada empresa con lo suyo, su RUT y cuánto. Solo los
 * hechos —lo presta y lo cobra ella, no es parte del precio—; quién responde
 * por qué es una decisión del negocio y de su abogado, y no se escribe acá.
 */
export function puntosDelContrato(
  otras: { empresa: string; total: number; conceptos: string[] }[], lista: OtraEmpresa[],
  enPesos: (n: number) => string
): string[] {
  return otras.map((o) => {
    const e = empresaDe(lista, o.empresa);
    return `${o.conceptos.join(', ')}: ${e?.nombre ?? o.empresa}${e?.rut ? `, RUT ${e.rut}` : ''}, `
      + `por **${enPesos(o.total)}** (IVA incluido).`;
  });
}

/**
 * **El mensaje para coordinar por WhatsApp** (2026-11-24): a quién, para qué
 * día, cuánta gente y qué. Lo arma la ventana de cotizar al lado de *🤝 Ya lo
 * coordiné*.
 */
export function mensajeParaCoordinar(a: {
  empresa: Pick<OtraEmpresa, 'contacto'> | undefined; negocio: string; dia: string; invitados: number;
  conceptos: { concepto: string; cantidad: number }[];
}): string {
  const hola = a.empresa?.contacto ? `Hola ${a.empresa.contacto.split(' ')[0]}` : 'Hola';
  const que = a.conceptos.map((c) => (c.cantidad > 1 ? `${c.concepto} para ${c.cantidad}` : c.concepto)).join(' y ');
  return `${hola}, te escribo de ${a.negocio}. Tenemos un evento ${a.dia ? `el ${a.dia}` : 'por confirmar'}`
    + `${a.invitados ? ` con ${a.invitados} personas` : ''} y quieren ${que}. ¿Lo coordinamos?`;
}
