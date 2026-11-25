/**
 * **La rotación de las cotizaciones del sitio** (2026-11-25, lo pidió el cliente: *"cuando caen
 * estas cotizaciones desde el sistema, que asignas las ventas o las cotizaciones rotativamente a
 * los vendedores que se ponen la casilla check y ellos participan en esta rotación"*).
 *
 * Una cotización que llega del cotizador de promociones le toca al **siguiente** de los que
 * participan, por turno: no se guarda un contador. Se mira a quién le tocó la última del sitio
 * (`Origen` = *Sitio · …*) y le toca a quien sigue en la lista, que va en orden de nombre. Así no
 * hay un número que se desfase si alguien entra o sale de la rotación, y la lista de cotizaciones
 * es la única verdad.
 *
 * Pura, con pruebas. La ruta pública solo la llama.
 */
import { normalizar } from './columnas.ts';
import type { Rol } from './auth.ts';
import { puede } from './auth.ts';

interface Cuenta { usuario: string; nombre: string; rol: string; activo: boolean }
interface Ficha { usuario: string; tipo: string; rotacionSitio?: boolean }
interface Cotizacion { origen?: string; creadoPor: string }

/** Las cuentas que hoy participan: con la casilla, activas y que pueden cotizar. En orden de nombre. */
export function participantesDeLaRotacion(fichas: Ficha[], cuentas: Cuenta[]): Cuenta[] {
  const marcadas = new Set(fichas.filter((f) => f.tipo !== 'socio' && f.rotacionSitio).map((f) => normalizar(f.usuario)));
  return cuentas
    .filter((c) => c.activo && marcadas.has(normalizar(c.usuario)) && puede(c.rol as Rol, 'presupuestos'))
    .sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre), 'es'));
}

/** A quién le tocó la última cotización del sitio (la más nueva de la lista), o vacío si no hubo. */
export function ultimoDelSitio(cotizaciones: Cotizacion[]): string {
  for (let i = cotizaciones.length - 1; i >= 0; i--) {
    const p = cotizaciones[i];
    if (/^sitio/i.test(p.origen ?? '') && p.creadoPor.trim()) return p.creadoPor.trim();
  }
  return '';
}

/**
 * La cuenta a la que le toca la que llega ahora. Con participantes, el que sigue al de la última
 * (o el primero, si la última fue de alguien que ya no participa o es la primera). **Sin
 * participantes, la cuenta de respaldo de Configuración** (*Las del sitio van a*), como antes; y
 * sin ninguna, nadie: la ven quienes asignan.
 */
export function elegirVendedorDelSitio(a: {
  fichas: Ficha[]; cuentas: Cuenta[]; cotizaciones: Cotizacion[]; respaldo: string;
}): Cuenta | null {
  const lista = participantesDeLaRotacion(a.fichas, a.cuentas);
  if (lista.length) {
    const ultimo = normalizar(ultimoDelSitio(a.cotizaciones));
    const i = lista.findIndex((c) => normalizar(c.nombre) === ultimo || normalizar(c.usuario) === ultimo);
    return lista[i < 0 ? 0 : (i + 1) % lista.length];
  }
  const r = normalizar(a.respaldo);
  return (r && a.cuentas.find((c) => c.activo && normalizar(c.nombre) === r && puede(c.rol as Rol, 'presupuestos'))) || null;
}

/**
 * **Un cliente que cotiza otra vez vuelve con su vendedor** (2026-11-25, lo pidió el cliente: *"si un
 * cliente cotiza dos veces, que caiga a un vendedor"*): la cuenta de la cotización más nueva de ese
 * cliente, si sigue activa y cotiza. Una cotización a nombre del administrador no cuenta (lo importado
 * del CRM quedó a su nombre). Sin cotización previa o sin cuenta válida, nadie: le toca el turno.
 */
export function vendedorDelCliente(delCliente: Cotizacion[], cuentas: Cuenta[]): Cuenta | null {
  for (let i = delCliente.length - 1; i >= 0; i--) {
    const quien = normalizar(delCliente[i].creadoPor);
    if (!quien) continue;
    const c = cuentas.find((x) => x.activo && x.rol !== 'admin' && puede(x.rol as Rol, 'presupuestos')
      && (normalizar(x.nombre) === quien || normalizar(x.usuario) === quien));
    if (c) return c;
  }
  return null;
}
