/**
 * **Cambiar el vendedor de un cliente o de una cotización** (2026-11-22).
 *
 * Lo pidió el cliente: *"hay que agregar la función a la gerencia y al
 * administrador de pagos que pueda asignar vendedores a un cliente o a una
 * cotización… porque se va una vendedora, pero el cliente se queda, o porque
 * hay una venta sin asignación"* —lo que quedó *sin cuenta* al importar del
 * CRM—.
 *
 * El dueño de una ficha y de una cotización es su `Creado por`: de ahí salen
 * qué puede tocar un vendedor (`puedeTocarPresupuesto()`), de quién ve el
 * contacto (`privacidad.ts`) y a quién se le cuenta la venta
 * (`ventasDe()`). Cambiarlo es cambiar todo eso de una vez, así que **se
 * confirma a mano y queda en la bitácora**.
 *
 * Las dos reglas de plata las decidió el cliente (*"sí a los dos"*):
 *
 * 1. **Una cotización ganada que se reasigna se lleva su comisión al
 *    vendedor nuevo, salvo que ya esté cerrada** —el cliente pagó todo y
 *    pagos lo revisó: `Comisión vendedor` ya tiene su monto—. Esa no se
 *    cambia: se quedó con quien la ganó.
 * 2. **Al cambiar el vendedor de un cliente, sus cotizaciones ganadas se
 *    quedan con el vendedor anterior.** Solo se mueven las abiertas, y solo
 *    si quien cambia lo pide.
 *
 * Pura y con pruebas: la usan la ruta y la ventana, que así dicen lo mismo.
 */
import { ROL, puede, type Rol } from './auth.ts';
import { ESTADO_PRESUPUESTO, estadoNormal, type Presupuesto } from './presupuestos.ts';
import { normalizar } from './columnas.ts';
import type { Cliente } from './clientes.ts';
import type { Usuario } from './usuarios.ts';
import { clientePropio } from './privacidad.ts';

export interface VendedorParaAsignar { usuario: string; nombre: string; rol?: string }

/**
 * A quién se le puede asignar: **toda cuenta activa que puede cotizar**
 * (`presupuestos`), no solo las del rol Vendedor (2026-11-22, lo amplió el
 * cliente: *"amplíalo"*). En la planilla de verdad, uno de los vendedores del
 * CRM tiene cuenta con otro rol, y no se le podía pasar un cliente. Los
 * vendedores van primero; después los demás, por nombre.
 */
/**
 * **Los clientes de cada vendedor** (2026-11-25, lo pidió el cliente: *"pagos,
 * gerencia y admin deberían poder filtrar por vendedor en clientes"*): los que
 * creó o a los que les cotizó —la misma cuenta del filtro *Míos*,
 * `clientePropio()`—, por su usuario o por su nombre, que es lo que guardan
 * `Creado por` de las fichas y las cotizaciones. Solo los ids.
 */
export function clientesPorVendedor(
  vendedores: Pick<VendedorParaAsignar, 'usuario' | 'nombre'>[],
  clientes: Pick<Cliente, 'id' | 'creadoPor'>[],
  presupuestos: { idCliente?: string; creadoPor: string }[]
): Record<string, string[]> {
  return Object.fromEntries(vendedores.map((v) => [v.usuario, clientes
    .filter((c) => clientePropio(c, v.usuario, presupuestos) || (!!v.nombre && clientePropio(c, v.nombre, presupuestos)))
    .map((c) => c.id)]));
}

export function vendedoresParaAsignar(
  usuarios: Pick<Usuario, 'usuario' | 'nombre' | 'rol' | 'activo'>[]
): VendedorParaAsignar[] {
  const orden = (r?: string) => (r === ROL.vendedor ? 0 : 1);
  return usuarios
    .filter((u) => u.activo !== false && !!u.usuario && puede(u.rol as Rol, 'presupuestos'))
    .map((u) => ({ usuario: u.usuario, nombre: u.nombre || u.usuario, rol: u.rol }))
    .sort((a, b) => orden(a.rol) - orden(b.rol) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/**
 * Si lo guardado en `Creado por` es de esta cuenta. **`Creado por` lleva el
 * nombre de la persona** —lo que trae la sesión—, pero lo de antes y lo
 * importado puede traer el usuario: calza con cualquiera de los dos.
 */
export function esDelVendedor(v: VendedorParaAsignar, creadoPor: string): boolean {
  const t = normalizar(String(creadoPor ?? ''));
  return !!t && (normalizar(v.usuario) === t || normalizar(v.nombre) === t);
}

/** El nombre de quien la tiene hoy, para decirlo: la cuenta, lo escrito, o *sin vendedor*. */
export function nombreDelVendedor(creadoPor: string, vendedores: VendedorParaAsignar[]): string {
  const t = String(creadoPor ?? '').trim();
  if (!t) return 'sin vendedor';
  return vendedores.find((v) => esDelVendedor(v, t))?.nombre ?? t;
}

/** La comisión del vendedor ya quedó cerrada: no cambia de manos. */
export const comisionCerrada = (p: Pick<Presupuesto, 'comisionVendedor'>) =>
  !!String(p.comisionVendedor ?? '').trim();

/** Ganada: tiene su reserva. */
const ganada = (p: Pick<Presupuesto, 'idReserva'>) => !!p.idReserva;

/** Abierta: sigue en conversación. Ni ganada, ni perdida, ni cancelada, ni descartada. */
export function estaAbierta(p: Pick<Presupuesto, 'idReserva' | 'estado'>): boolean {
  if (ganada(p)) return false;
  const e = estadoNormal(p.estado);
  return e !== ESTADO_PRESUPUESTO.rechazado && e !== ESTADO_PRESUPUESTO.noElegida
    && e !== ESTADO_PRESUPUESTO.cancelada;
}

export interface PlanDeAsignacion {
  /** Por qué no se puede. Vacío si se puede. */
  error: string;
  /** La ficha cambia de dueño. */
  cliente: boolean;
  /** Las cotizaciones que cambian de dueño. */
  mover: Presupuesto[];
  /** Las ganadas del cliente, que se quedan con quien las tiene. */
  quedan: Presupuesto[];
  /** De quién era (lo guardado en `Creado por`). */
  de: string;
  /** Lo que se escribe en `Creado por`: el nombre de la cuenta, que es lo que trae su sesión. */
  dueno: string;
}

/**
 * Qué cambia al asignar. Con `presupuesto`, esa cotización sola; con
 * `cliente`, su ficha y —si `conAbiertas`— sus cotizaciones abiertas.
 */
export function planDeAsignacion(e: {
  cliente?: Pick<Cliente, 'id' | 'creadoPor'>;
  presupuesto?: Presupuesto;
  presupuestos: Presupuesto[];
  a: string;
  vendedores: VendedorParaAsignar[];
  conAbiertas?: boolean;
}): PlanDeAsignacion {
  const nada = { cliente: false, mover: [] as Presupuesto[], quedan: [] as Presupuesto[], de: '', dueno: '' };
  const nuevo = e.vendedores.find((v) => normalizar(v.usuario) === normalizar(e.a));
  if (!nuevo) return { ...nada, error: 'Elige una cuenta activa que pueda cotizar.' };

  if (e.presupuesto) {
    const p = e.presupuesto;
    const de = p.creadoPor ?? '';
    if (esDelVendedor(nuevo, de)) return { ...nada, de, error: `Ya es de ${nuevo.nombre}.` };
    if (comisionCerrada(p)) {
      return { ...nada, de, error: 'La comisión de esta venta ya quedó cerrada —el cliente pagó todo y pagos lo revisó—: '
        + `se queda con ${nombreDelVendedor(de, e.vendedores)}.` };
    }
    return { error: '', cliente: false, mover: [p], quedan: [], de, dueno: nuevo.nombre || nuevo.usuario };
  }

  if (e.cliente) {
    const c = e.cliente;
    const de = c.creadoPor ?? '';
    const suyas = e.presupuestos.filter((p) => p.idCliente === c.id);
    const mover = e.conAbiertas
      ? suyas.filter((p) => estaAbierta(p) && !esDelVendedor(nuevo, p.creadoPor ?? '')) : [];
    const cambiaFicha = !esDelVendedor(nuevo, de);
    if (!cambiaFicha && !mover.length) return { ...nada, de, error: `Ya es de ${nuevo.nombre}.` };
    return { error: '', cliente: cambiaFicha, mover, quedan: suyas.filter(ganada), de, dueno: nuevo.nombre || nuevo.usuario };
  }
  return { ...nada, error: 'Falta decir qué se cambia.' };
}

/** Lo que queda en la bitácora: quién era, quién es y cuántas cotizaciones se movieron. Sin datos del cliente. */
export function detalleDeAsignacion(plan: PlanDeAsignacion, que: string, a: string, vendedores: VendedorParaAsignar[]): string {
  const partes = [`${que}: de ${nombreDelVendedor(plan.de, vendedores)} a ${nombreDelVendedor(a, vendedores)}`];
  if (plan.cliente && plan.mover.length) {
    partes.push(`con ${plan.mover.length} ${plan.mover.length === 1 ? 'cotización abierta' : 'cotizaciones abiertas'}`);
  }
  if (plan.quedan.length) {
    partes.push(`${plan.quedan.length} ${plan.quedan.length === 1 ? 'ganada se queda' : 'ganadas se quedan'} con quien la tenía`);
  }
  return partes.join(' · ');
}
