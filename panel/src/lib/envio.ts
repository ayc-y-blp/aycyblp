/**
 * **Lo que el vendedor tiene que hacer con una cotización y nada se lo
 * recordaba** (2026-11-25). Dos cosas, las dos pedidas por el cliente el
 * mismo día:
 *
 * - **Confirmar que la mandó.** Con la foto de la N° 693616, lista y en
 *   *Borrador*: *"¿por qué no aparece esta cotización como posible cotización
 *   en el calendario (ni reservas, ni cotizaciones) si el vendedor ya vio el
 *   documento? Hay que reforzar el proceso de que tiene que confirmar si envió
 *   la cotización, con popups y aviso dentro del sistema cuando uno pasa por
 *   esta cotización"*. Solo lo mandado cuenta en los calendarios (decidido el
 *   2026-11-11), y el panel preguntaba *¿La mandaste?* solo al usar WhatsApp,
 *   el correo o *Copiar link*: una que se mandó de otra forma —el PDF, la
 *   dirección del documento— quedaba en borrador sin que nada lo dijera.
 * - **Empezar el seguimiento de las que llegan del sitio.** *"Necesito que
 *   estos se destacan… una tercera sección arriba en clientes y cotizaciones
 *   que muestra NUEVOS para que al tiro pueden empezar el seguimiento"*.
 */
import {
  ESTADO_PRESUPUESTO, estadoNormal, estaMandada, estaVencido, folioDe, lineasDe, pasoElEvento, totalDe,
  type LineaPresupuesto, type Presupuesto
} from './presupuestos.ts';
import { grupoDe } from './cotizar.ts';
import { esDelSitio } from './promociones.ts';
import { esSuya } from './auth.ts';
import { esFecha, type Fecha } from './fechas.ts';

/**
 * **Lista y sin confirmar el envío**: un borrador con cliente y total, de un
 * evento que no ha pasado. Un candidato —sin productos todavía— no está
 * listo; una que ya es reserva, tampoco cuenta. El estado en blanco se lee
 * como borrador, igual que en la pantalla.
 */
export function faltaConfirmarEnvio(
  p: Pick<Presupuesto, 'estado' | 'idReserva' | 'idCliente' | 'fecha'>, total: number, hoy: Fecha
): boolean {
  const e = estadoNormal(p.estado) || ESTADO_PRESUPUESTO.borrador;
  return e === ESTADO_PRESUPUESTO.borrador && !String(p.idReserva ?? '').trim()
    && !!String(p.idCliente ?? '').trim() && total > 0 && !(esFecha(p.fecha) && p.fecha < hoy);
}

/**
 * **Lo mismo, para un grupo de alternativas**: van en un solo link, así que si
 * alguna ya se mandó, el grupo está mandado (una alternativa nueva que se
 * suma después se manda con *Mandar de nuevo*). Se mira la primera que sigue
 * lista.
 */
export function porConfirmarDelGrupo(
  alts: Presupuesto[], lineas: LineaPresupuesto[], hoy: Fecha
): Presupuesto | undefined {
  if (alts.some((a) => estaMandada(a.estado) || String(a.idReserva ?? '').trim())) return undefined;
  return alts.find((a) => faltaConfirmarEnvio(a, totalDe(lineasDe(lineas, a.id), a.descuento), hoy));
}

export interface AvisoSinConfirmar {
  id: string;
  folio: string;
  cliente: string;
  empresa: string;
  fecha: string;
  periodo: string;
  invitados: number;
  total: number;
}

/**
 * **Las listas que esta cuenta no ha confirmado como mandadas**, para la
 * ventana que sale al entrar (`AvisoCotizacionesSitio`). Solo las suyas: la
 * pregunta es de quien la mandó. Una por grupo, las del evento más cercano
 * primero.
 */
export function avisosSinConfirmar(
  presupuestos: (Presupuesto & { cliente?: string; empresaCliente?: string })[],
  lineas: LineaPresupuesto[], usuario: string, hoy: Fecha
): AvisoSinConfirmar[] {
  const grupos = new Map<string, typeof presupuestos>();
  for (const p of presupuestos) {
    if (!esSuya(usuario, p.creadoPor)) continue;
    const g = grupoDe(p);
    grupos.set(g, [...(grupos.get(g) ?? []), p]);
  }
  const salida: AvisoSinConfirmar[] = [];
  for (const alts of grupos.values()) {
    const p = porConfirmarDelGrupo(alts, lineas, hoy) as (typeof presupuestos)[number] | undefined;
    if (!p) continue;
    salida.push({
      id: p.id, folio: folioDe({ id: grupoDe(p) }), cliente: p.cliente ?? '', empresa: p.empresaCliente ?? '',
      fecha: p.fecha, periodo: p.periodo, invitados: p.invitados,
      total: totalDe(lineasDe(lineas, p.id), p.descuento)
    });
  }
  return salida.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
}

const EN_CARRERA = new Set<string>([ESTADO_PRESUPUESTO.candidato, ESTADO_PRESUPUESTO.borrador,
  ESTADO_PRESUPUESTO.enviado, ESTADO_PRESUPUESTO.negociacion]);

/**
 * **Nueva del sitio**: llegó por el cotizador de promociones, sigue en
 * carrera, no venció y **nadie ha anotado todavía un contacto** en sus notas.
 * Sale de *Nuevas* con la primera nota (*📝 Anotar*: llamé, le escribí).
 * Marcar *Entendido* en la ventana del sitio no la saca: esa ventana dice que
 * llegó; esta sección, que falta empezar.
 */
export function esNuevaDelSitio(
  p: Pick<Presupuesto, 'origen' | 'estado' | 'idReserva' | 'validoHasta' | 'fecha'>, notasDelGrupo: number, hoy: Fecha
): boolean {
  return esDelSitio(p) && !String(p.idReserva ?? '').trim() && EN_CARRERA.has(estadoNormal(p.estado))
    && !estaVencido(p, hoy) && !pasoElEvento(p, hoy) && notasDelGrupo === 0;
}

/**
 * **De quién es una nueva**: de su vendedor; la que llegó sin vendedor, de
 * quien puede asignarla (la gerencia, pagos y el administrador), igual que la
 * ventana del sitio (`avisosDelSitio()`).
 */
export const esNuevaPara = (p: Pick<Presupuesto, 'creadoPor'>, usuario: string, asigna: boolean) =>
  String(p.creadoPor ?? '').trim() ? esSuya(usuario, p.creadoPor) : asigna;

/** Qué promoción la trajo: *Sitio · Gran Premio de Fin de Año* → *Gran Premio de Fin de Año*. */
export const promoDelOrigen = (origen: string | undefined) => String(origen ?? '').replace(/^sitio\s*·\s*/i, '').trim();

/**
 * **Cuánto hace que llegó**, con el `Creado` de la cotización y la hora de
 * ahora, los dos `AAAA-MM-DD HH:MM` en hora de Chile: *recién*, *hace 25
 * min*, *hace 3 h*, *ayer*, *hace 4 días*.
 */
export function haceCuanto(creado: string, ahora: string): string {
  const aMin = (t: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(t ?? '').trim());
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)) / 60000;
  };
  const a = aMin(creado), b = aMin(ahora);
  if (Number.isNaN(a) || Number.isNaN(b)) return '';
  const min = Math.max(0, Math.round(b - a));
  if (min < 5) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (creado.slice(0, 10) === ahora.slice(0, 10)) return `hace ${Math.floor(min / 60)} h`;
  const dias = Math.round((Date.UTC(+ahora.slice(0, 4), +ahora.slice(5, 7) - 1, +ahora.slice(8, 10))
    - Date.UTC(+creado.slice(0, 4), +creado.slice(5, 7) - 1, +creado.slice(8, 10))) / 86400000);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}
