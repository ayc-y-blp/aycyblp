import { NextResponse } from 'next/server';
import { ganadasEl } from '@/lib/listaCotizaciones';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { alcanceDeContacto, recortarCliente, recortarContactoDeCotizacion, clientePropio } from '@/lib/privacidad';
import { HOJA_COBROS } from '@/lib/cobros';
import { HOJA_FECHAS, HOJA_RESERVAS } from '@/lib/columnas';
import { ocupacionDeTodos } from '@/lib/ocupacion';
import { diasConSobrecupo } from '@/lib/sobrecupo';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_MENUS, sinCostos } from '@/lib/menus';
import { HOJA_LINEAS, HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { HOJA_VENDEDORES } from '@/lib/vendedores';
import { vendedoresParaAsignar } from '@/lib/asignar';
import { horarioDe, faltaDeEmpresa, normalizarHorario } from '@/lib/contrato';
import { UF_MINIMA, UF_MAXIMA } from '@/lib/uf';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerLineasPresupuesto, guardarPresupuesto, guardarLineas,
  borrarPresupuesto, leerMenus, leerConfig, leerClientes, leerFechas, anotar, leerCobros,
  sincronizarReserva, leerReservas, leerVendedores, leerUsuarios, leerCierres
} from '@/lib/datos';
import { HOJA_CIERRES } from '@/lib/cierres';
import { HOJA_USUARIOS, cuentaDeSesion } from '@/lib/usuarios';
import {
  nuevoId, ESTADO_PRESUPUESTO, estaMandada, aEntero, folioDe, estadoNormal, lineasDe,
  documentoDe, numeroONulo, montoONulo, cuentasDe, type Presupuesto, type LineaEntrante
} from '@/lib/presupuestos';
import {
  topesDe, aprobadasDe, aplicarTopes, sobreElTope, escribirPedido, leerPedido, marcaCondiciones,
  condicionesEspecialesDe, frasePedido, vigenciaHasta, diasAlEvento, NOMBRE_CONDICION, valorCondicion,
  type CondicionesCotizacion, type Recorte
} from '@/lib/condiciones';
import {
  prepararLineas, esDiaPublico, conCliente, ESTADOS_A_MANO, grupoDe, otrasAlternativas, reglaShowDe,
  showQuedaBajoMinimo, showBajoMinimoDe, reglaArriendoDe, arriendoDelDia,
  arriendoQuedaBajoMinimo, personasParaMinimos
} from '@/lib/cotizar';
import { ocupaLugar } from '@/lib/ocupacion';
import { esExclusivo } from '@/lib/exclusivo';
import { puede, puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { nuevoToken } from '@/lib/equipo';
import { hoy, esFecha, sumarDias } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { guardaDelDia } from '@/lib/guardaCierre';

export const dynamic = 'force-dynamic';

/**
 * Las cotizaciones, sus líneas y todo lo que hace falta para armar una.
 *
 * **El cliente se resuelve acá, desde su ficha** (`conCliente()`): una
 * cotización nueva guarda solo el `ID Cliente`, y la pantalla recibe el
 * nombre y el contacto ya puestos. Las de antes de las fichas siguen
 * mostrando lo que tenían escrito.
 */
export const GET = conLecturas([HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_MENUS, HOJA_CONFIG, HOJA_CLIENTES, HOJA_FECHAS, HOJA_COBROS, HOJA_RESERVAS, HOJA_VENDEDORES, HOJA_USUARIOS, HOJA_CIERRES], async function GET(req: Request) {
  const no = await exigirVer(req, 'presupuestos');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const [presupuestos, lineas, menus, cfg, clientes, fechas, cobros, reservas, fichas, cuentas, cierres] = await Promise.all([
      leerPresupuestos(), leerLineasPresupuesto(), leerMenus(), leerConfig(),
      leerClientes(), leerFechas(), leerCobros().catch(() => []), leerReservas().catch(() => []),
      leerVendedores().catch(() => []), leerUsuarios(), leerCierres().catch(() => [])
    ]);
    // **Los días que se pasaron del cupo** (2026-11-12): un pago entró sobre
    // reservas sin pagar. Va en la misma lectura —la tanda ya trae
    // `Reservas`—, y al vendedor solo los días donde la reserva en riesgo
    // es suya. Lo justo para el aviso: quién y cuánta gente.
    const desdeHoy = fechas.filter((f) => f.fecha >= hoy());
    const sobrecupo = diasConSobrecupo(ocupacionDeTodos(reservas, desdeHoy), reservas,
      quien.rol as Rol, quien.usuario)
      .map((d) => ({ fecha: d.fecha, exceso: d.exceso, capacidad: d.capacidad, tomadas: d.tomadas,
        riesgo: d.riesgo.map((r) => ({ nombre: r.nombre, personas: r.personas, anotadaPor: r.anotadaPor })) }));
    // **El contacto, recortado por rol** (2026-11-13, `privacidad.ts`): el
    // vendedor ve el teléfono, el correo, el RUT y el domicilio solo de sus
    // clientes; de los demás, el nombre y el teléfono tapado.
    const alcance = alcanceDeContacto(quien.rol, quien.gerencia);
    const clientesVisibles = clientes.map((c) =>
      recortarCliente(c, alcance, clientePropio(c, quien.usuario, presupuestos)));
    return NextResponse.json({
      presupuestos: presupuestos.map((p) => recortarContactoDeCotizacion(conCliente(p, clientes), alcance, quien.usuario)),
      lineas, menus: puede(quien.rol as Rol, 'costos') ? menus : sinCostos(menus), clientes: clientesVisibles,
      // El simulador de evento (2026-11-23): quién ve los números y quién solo la señal.
      veCostos: puede(quien.rol as Rol, 'costos'),
      // **A quién se le puede pasar una cotización** (2026-11-22, `asignar.ts`):
      // solo para quien puede cambiar el vendedor. `Usuarios` ya venía en la tanda.
      vendedores: puede(quien.rol as Rol, 'asignarVendedor') ? vendedoresParaAsignar(cuentas) : undefined,
      // **Los socios comerciales**, para *"¿Viene por un socio comercial?"*:
      // solo el id, el nombre y si está activo. Su trato y su cuenta, no.
      socios: fichas.filter((f) => f.tipo === 'socio')
        .map((f) => ({ id: f.usuario, nombre: f.nombre || f.usuario, activo: f.activo, porConfirmar: !!f.porConfirmar }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })),
      // Lo justo para los avisos de la lista: de qué cotización, cuánto y si
      // ya se revisó.
      cobros: cobros.map((c) => ({ presupuesto: c.presupuesto, monto: c.monto,
        revisadoPor: c.revisadoPor, concepto: c.concepto })),
      // Solo lo que hace falta para saber si un día es público, privado o
      // cerrado: de eso dependen la tarjeta y la regla del show ecuestre.
      fechas: fechas.map((f) => ({ fecha: f.fecha, estado: f.estado, capacidad: f.capacidad })),
      vigencia: cfg.vigenciaPresupuesto,
      descuentos: cfg.descuentos,
      // El mínimo del show en un día privado (2026-11-20). La pantalla lo
      // aplica con la misma función del servidor, salvo a quien puede pasar
      // por encima: eso lo decide con el rol, que ya viaja.
      reglaShow: reglaShowDe(cfg),
      // **El arriendo mínimo** (2026-11-23): la regla, qué días de la semana
      // abre la regla diaria (un sábado que todavía no está en el calendario
      // cuenta como público), las fechas sin exclusivo, y cuántas reservas
      // ocupan lugar cada día que viene —solo el número: con otra reserva el
      // día ya está abierto y no hay mínimo—. Sale de lo ya leído.
      reglaArriendo: reglaArriendoDe(cfg),
      diasAbiertos: cfg.diasAbiertos,
      fechasSinExclusivo: cfg.fechasSinExclusivo,
      reservasPorDia: reservas.filter((r) => r.fecha >= hoy() && ocupaLugar(r))
        .reduce<Record<string, number>>((n, r) => { n[r.fecha] = (n[r.fecha] ?? 0) + 1; return n; }, {}),
      condiciones: { anticipoPct: cfg.anticipoPct, saldoDias: cfg.saldoDias },
      seguimiento: { dias: cfg.seguimientoDias, antesEvento: cfg.avisoEvento },
      empresa: cfg.empresa.nombre,
      // Para avisar antes de ganar si el día ya no tiene cupo (`cupoParaGanar()`).
      cupoNormal: cfg.cupoNormal, horaApertura: cfg.horaApertura,
      // El plazo para pedir liberar un día para un evento exclusivo.
      exclusivoDias: cfg.exclusivoDias,
      // Para el contrato: el horario de siempre, y qué le falta a la empresa
      // en Configuración para que el contrato salga completo.
      contrato: {
        horario: horarioDe({ horario: '' }, cfg),
        faltaEmpresa: faltaDeEmpresa(cfg.empresa),
        // Las condiciones de cancelación por defecto: lo que rige donde la
        // cotización las deja en blanco.
        tranquilidad: { cambiosFecha: cfg.cambiosFecha, cancelacionDias: cfg.cancelacionDias,
          reembolsoPct: cfg.reembolsoPct, avisoCambio: cfg.cambiosFechaDias }
      },
      // **Los topes de Configuración** (2026-11-23, `condiciones.ts`): lo más
      // generoso que un vendedor puede ofrecer sin pedirlo. Lo aprobado para
      // una cotización la pantalla lo saca de su propia marca.
      topes: topesDe(cfg),
      cambiosFechaDias: cfg.cambiosFechaDias,
      hoy: hoy(),
      usuario: quien.usuario,
      rol: quien.rol,
      // **Los avisos que esta cuenta cerró para siempre** (2026-11-13): van
      // en la misma tanda de lecturas (`Usuarios` se sumó a la precarga).
      avisosLeidos: cuentaDeSesion(cuentas, quien.usuario)?.avisosLeidos ?? [],
      sobrecupo,
      // **Los días cerrados** (2026-11-21, lo decidió el cliente: una ganada
      // cuya reserva está en un día cerrado *"también debería poder
      // corregirse"*). Guardarla reescribe su reserva, así que la ventana de
      // cotizar tiene que saber que ese día está cerrado para mostrar la lista
      // de cambios con su casilla. Solo las fechas, y si esta cuenta puede
      // corregir. `Cierres` va en la misma tanda: no es una lectura más.
      cerrados: cierres.map((c) => c.fecha),
      puedeCorregir: puede(quien.rol as Rol, 'corregir'),
      // **El día en que se ganó cada una** (2026-11-17, para la Lista): el día
      // en que nació su reserva, que ya viene en esta tanda.
      ganadaEl: ganadasEl(presupuestos, reservas)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/** Lo que llega del navegador, limpiado. El servidor no confía en el cliente. */
function lineasDelCuerpo(crudo: unknown, id: string): LineaEntrante[] {
  if (!Array.isArray(crudo)) return [];
  return crudo.map((x) => {
    const l = (x ?? {}) as Record<string, unknown>;
    return {
      presupuesto: id,
      concepto: String(l.concepto ?? '').trim(),
      cantidad: aEntero(l.cantidad),
      precio: aEntero(l.precio),
      personas: aEntero(l.personas),
      descuento: aEntero(l.descuento),
      ivaIncluido: l.ivaIncluido !== false,
      sigue: l.sigue === true
    };
  });
}

/** El id de un socio comercial (`S-0001`), o vacío: no se guarda otra cosa. */
const socioDelCuerpo = (v: unknown) => {
  const t = String(v ?? '').trim().toUpperCase();
  return /^S-\d{1,6}$/.test(t) ? t : '';
};

/** La fecha o el periodo que llegan, comprobados. */
function cuandoDelCuerpo(cuerpo: Record<string, unknown>, antes?: Presupuesto) {
  const fecha = cuerpo.fecha === undefined
    ? antes?.fecha ?? ''
    : String(cuerpo.fecha ?? '').slice(0, 10);
  const periodo = cuerpo.periodo === undefined
    ? antes?.periodo ?? ''
    : String(cuerpo.periodo ?? '').trim();
  // Con día exacto, el periodo sobra; sin día, el periodo es obligatorio.
  if (esFecha(fecha)) return { fecha, periodo: '' };
  if (periodo) return { fecha: '', periodo };
  return null;
}

const pct = (v: unknown) => Math.min(100, Math.max(0, aEntero(v)));

/** Las condiciones de una cotización que tienen tope en Configuración. */
const condicionesDe = (p: Pick<Presupuesto, 'anticipo' | 'anticipoMonto' | 'saldoDias' | 'cambiosFecha'
  | 'cancelacionDias' | 'reembolso' | 'descuento'>): CondicionesCotizacion => ({
  anticipo: p.anticipo, anticipoMonto: p.anticipoMonto ?? null, saldoDias: p.saldoDias,
  cambiosFecha: p.cambiosFecha, cancelacionDias: p.cancelacionDias, reembolso: p.reembolso,
  descuento: p.descuento
});

/** Un recorte en una frase, para la pantalla: *Devolución al cancelar: 40% → 20%*. */
const fraseRecorte = (r: Recorte) =>
  `${NOMBRE_CONDICION[r.campo]}: ${valorCondicion(r.campo, r.pedido)} → ${valorCondicion(r.campo, r.queda)}`;

/**
 * **Los topes de Configuración** (regla A, 2026-11-23, `condiciones.ts`).
 *
 * Lo que el vendedor escribe más generoso que Configuración —o que lo
 * aprobado para esa cotización— queda en el tope: menos anticipo, el saldo
 * más tarde, más cambios de fecha, cancelar con menos aviso, más devolución
 * o más descuento. Al editar, solo lo que cambia (`antes`): lo que el
 * cliente ya vio no cambia solo.
 *
 * Quien aprueba —la gerencia general, el encargado de pagos y el
 * administrador— no tiene tope: lo que deje por encima queda como
 * *Condiciones especiales* aprobadas por él, y en la bitácora.
 *
 * Cambia `p` en el lugar y devuelve las líneas que se guardan.
 */
function conTopes(
  p: Omit<Presupuesto, 'fila'>, lineas: LineaEntrante[], cfg: Awaited<ReturnType<typeof leerConfig>>,
  rol: Rol, usuario: string, antes?: { p: Presupuesto; lineas: LineaEntrante[] }
): { lineas: LineaEntrante[]; recortes: string[]; aprobo: string } {
  const total = cuentasDe(lineas, p.descuento).total;
  if (!puede(rol, 'showBajoMinimo')) {
    const r = aplicarTopes(condicionesDe(p), lineas, total, topesDe(cfg, aprobadasDe(p)),
      antes ? { p: condicionesDe(antes.p), lineas: antes.lineas } : undefined);
    Object.assign(p, r.p);
    return { lineas: r.lineas, recortes: r.recortes.map(fraseRecorte), aprobo: '' };
  }
  const base = topesDe(cfg);
  const sobre = sobreElTope(condicionesDe(p), lineas, base);
  if (!Object.keys(sobre).length) return { lineas, recortes: [], aprobo: '' };
  const vigente = condicionesEspecialesDe(p.condicionesEspeciales).estado === 'aprobada'
    ? escribirPedido(leerPedido(p.condicionesPedidas)) : '';
  const nuevo = escribirPedido(sobre);
  if (vigente === nuevo) return { lineas, recortes: [], aprobo: '' };
  p.condicionesPedidas = nuevo;
  p.condicionesEspeciales = marcaCondiciones('aprobada', usuario, ahoraEnChile(), 'las dejó quien aprueba');
  return { lineas, recortes: [], aprobo: frasePedido(sobre, base) };
}

/**
 * **La vigencia no pasa del día antes del evento** (regla B, 2026-11-23):
 * una cotización no puede seguir abierta cuando el evento ya ocurrió.
 * Solo baja, nunca alarga.
 */
const vigenciaAntesDelEvento = (validoHasta: string, fecha: string) =>
  validoHasta && esFecha(fecha) && validoHasta >= fecha ? sumarDias(fecha, -1) : validoHasta;

/** Lo que decide los mínimos de una cotización además de sus líneas. */
interface ParaMinimos {
  /** La respuesta a *¿el día es exclusivo?* (`sí`, `no` o vacío). */
  exclusivo: string;
  /** La reserva de esta misma cotización, si ya se ganó: no cuenta como *otra* reserva del día. */
  idReserva: string;
  /** Si ya hay una autorización guardada (`Show bajo el mínimo`, `Arriendo bajo el mínimo`). */
  showAutorizado: boolean;
  arriendoAutorizado: boolean;
}

/** El mínimo del arriendo de esta cotización en su día (`arriendoDelDia()`), con las reservas ya leídas. */
function arriendoParaElDia(
  fecha: string, para: Pick<ParaMinimos, 'exclusivo' | 'idReserva'>,
  cfg: Awaited<ReturnType<typeof leerConfig>>, fechas: Awaited<ReturnType<typeof leerFechas>>,
  reservas: Awaited<ReturnType<typeof leerReservas>>
) {
  return arriendoDelDia(reglaArriendoDe(cfg), fecha, fechas, cfg.diasAbiertos, esExclusivo(para.exclusivo),
    reservas.filter((r) => r.fecha === fecha && ocupaLugar(r) && r.id !== para.idReserva).length);
}

async function lineasListas(crudo: unknown, id: string, invitados: number, fecha: string,
  uf: number, rol: Rol, para: ParaMinimos) {
  const [menus, fechas, cfg, reservas] = await Promise.all([
    leerMenus(), leerFechas(), leerConfig(), leerReservas().catch(() => [])
  ]);
  // **Los mínimos del show y del arriendo** (2026-11-20 y 2026-11-23): rigen
  // para todos menos quien puede pasar por encima (la gerencia, quien paga y
  // el administrador), y no corren en una cotización donde uno de ellos ya
  // los autorizó.
  const pasaPorEncima = puede(rol, 'showBajoMinimo');
  const deConfig = reglaShowDe(cfg);
  const regla = pasaPorEncima || para.showAutorizado ? null : deConfig;
  const publico = esFecha(fecha) && esDiaPublico(fecha, fechas);
  const arriendo = arriendoParaElDia(fecha, para, cfg, fechas, reservas);
  const lineas = prepararLineas(lineasDelCuerpo(crudo, id), menus, invitados, publico, uf, regla,
    pasaPorEncima || para.arriendoAutorizado ? null : arriendo);
  const personas = personasParaMinimos(lineas, invitados);
  const minimo = arriendo ? arriendo(personas) : null;
  return {
    lineas,
    bajoMinimo: showQuedaBajoMinimo(lineas, menus, deConfig, publico, invitados),
    arriendoBajo: arriendoQuedaBajoMinimo(lineas, menus, minimo),
    minimo, personas
  };
}

/**
 * La UF que fija la cotización (2026-11-10). La manda la pantalla, que la
 * pidió a `/api/uf`; se acepta solo si es un valor creíble y con fecha. Sin
 * eso queda la que tenía: **la UF de una cotización no cambia sola**.
 */
function ufDelCuerpo(cuerpo: Record<string, unknown>, antes: { uf: number; fechaUF: string }) {
  const uf = Number(cuerpo.uf);
  const fecha = String(cuerpo.fechaUF ?? '').slice(0, 10);
  if (cuerpo.uf === undefined || !(uf > UF_MINIMA && uf < UF_MAXIMA) || !esFecha(fecha)) {
    return { uf: antes.uf, fechaUF: antes.fechaUF };
  }
  return { uf: Math.round(uf * 100) / 100, fechaUF: fecha };
}

/**
 * Crea una cotización (o un candidato).
 *
 * **Pide una ficha de cliente**, no un nombre suelto: es la regla que
 * evita escribir al cliente dos veces. **El token se crea acá**, porque una
 * cotización es un documento para mandar. **La vigencia la calcula el
 * servidor**, desde la planilla.
 *
 * Con `duplicarDe` es una **alternativa**: copia el cliente, la fecha, los
 * invitados y las líneas de otra, y queda en su mismo grupo.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_MENUS, HOJA_CONFIG, HOJA_CLIENTES, HOJA_FECHAS, HOJA_RESERVAS], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const quien = await quienEs(req);
    const [cfg, clientes, lista] = await Promise.all([
      leerConfig(), leerClientes(), leerPresupuestos()
    ]);
    const id = nuevoId();

    // Una alternativa: la misma conversación, otras líneas.
    if (cuerpo.duplicarDe) {
      const base = lista.find((p) => p.id === String(cuerpo.duplicarDe));
      if (!base) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
      const todas = await leerLineasPresupuesto();
      const nueva: Omit<Presupuesto, 'fila'> = {
        ...base, id, grupo: grupoDe(base), token: nuevoToken(), idReserva: '',
        estado: ESTADO_PRESUPUESTO.borrador, motivo: '',
        // El contrato firmado es de la cotización que se firmó, no de una
        // alternativa: la copia nace sin firmar.
        contrato: '', contratoSubidoPor: '', contratoSubido: '',
        // Lo de la cancelación y del día es de la que se ganó, no de la copia.
        devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '',
        // El pedido de liberar el día es de la original (2026-11-12).
        exclusividad: '', diaPausado: '', comisionVendedor: '', comisionSocio: '',
        // Un pedido de condiciones especiales que espera respuesta es de la
        // original; lo ya aprobado vale para la conversación (2026-11-23).
        ...(condicionesEspecialesDe(base.condicionesEspeciales).estado === 'aprobada' ? {}
          : { condicionesPedidas: '', condicionesEspeciales: '' }),
        // Una alternativa nace sin mandar: su vigencia corre cuando se mande.
        enviada: '', ultimoSeguimiento: '', validoHasta: '', contratoEnviado: '',
        // Quien la duplica es su dueño: un vendedor que arma la opción B de
        // una cotización ajena la puede seguir editando.
        creadoPor: quien.usuario, creado: ahoraEnChile()
      };
      delete (nueva as Partial<Presupuesto>).fila;
      // La original pasa a ser parte del grupo si todavía no lo era.
      if (!base.grupo) {
        const { fila: _f, ...sinFila } = base;
        await guardarPresupuesto({ ...sinFila, grupo: base.id });
      }
      await guardarPresupuesto(nueva);
      await guardarLineas(id, lineasDe(todas, base.id).map((l) => ({ ...l, presupuesto: id })));
      await anotar({ ...quien, accion: 'Creó una alternativa de cotización',
        detalle: `${folioDe(nueva)} · alternativa de ${folioDe(base)}` });
      return NextResponse.json({ presupuesto: { ...nueva, fila: -1 } });
    }

    const idCliente = String(cuerpo.idCliente ?? '').trim();
    const cliente = clientes.find((c) => c.id === idCliente);
    if (!cliente) {
      return NextResponse.json({ error: 'Elige o crea el cliente primero.' }, { status: 400 });
    }
    const cuando = cuandoDelCuerpo(cuerpo);
    if (!cuando) {
      return NextResponse.json(
        { error: 'Falta la fecha del evento, o el periodo si todavía no hay día.' },
        { status: 400 });
    }
    const invitados = Math.max(0, aEntero(cuerpo.invitados));
    const estado = estadoNormal(cuerpo.estado) === ESTADO_PRESUPUESTO.candidato
      ? ESTADO_PRESUPUESTO.candidato : ESTADO_PRESUPUESTO.borrador;

    const p: Omit<Presupuesto, 'fila'> = {
      id, ...cuando,
      // **Del cliente se guarda solo la ficha.** Las columnas viejas quedan
      // en blanco: el nombre y el contacto se leen de `Clientes`.
      cliente: '', email: '', telefono: '', idCliente,
      estado,
      // **La vigencia corre desde que se manda, no desde que se crea**
      // (2026-11-11): un borrador que estuvo una semana armándose no puede
      // llegarle al cliente con media vigencia gastada.
      validoHasta: '',
      token: nuevoToken(),
      notas: String(cuerpo.notas ?? '').trim(),
      idReserva: '',
      invitados,
      tipoEvento: String(cuerpo.tipoEvento ?? '').trim(),
      socio: socioDelCuerpo(cuerpo.socio),
      grupo: '',
      descuento: pct(cuerpo.descuento),
      motivo: '',
      documento: documentoDe(cuerpo.documento),
      anticipo: numeroONulo(cuerpo.anticipo, 100),
      anticipoMonto: montoONulo(cuerpo.anticipoMonto),
      saldoDias: numeroONulo(cuerpo.saldoDias, 365),
      ...ufDelCuerpo(cuerpo, { uf: 0, fechaUF: '' }),
      horario: normalizarHorario(String(cuerpo.horario ?? '')),
      ley20393: cuerpo.ley20393 === true,
      acuerdos: String(cuerpo.acuerdos ?? '').trim(),
      // El contrato firmado no se acepta del navegador: lo escribe la ruta
      // que lo sube (`/api/presupuestos/contrato`).
      contrato: '', contratoSubidoPor: '', contratoSubido: '',
      cambiosFecha: numeroONulo(cuerpo.cambiosFecha, 10),
      cancelacionDias: numeroONulo(cuerpo.cancelacionDias, 365),
      reembolso: numeroONulo(cuerpo.reembolso, 100),
      // Lo de la cancelación lo escribe solo /cancelar.
      devolucion: 0, canceladaPor: '', cancelada: '', diaAbierto: '',
      // El envío no se acepta del navegador: lo marca "¿la mandaste?".
      enviada: '', ultimoSeguimiento: '', contratoEnviado: '',
      seguimientoDias: numeroONulo(cuerpo.seguimientoDias, 365),
      avisoEvento: numeroONulo(cuerpo.avisoEvento, 365),
      creadoPor: quien.usuario,
      creado: ahoraEnChile()
    };
    const nuevas = await lineasListas(cuerpo.lineas, id, invitados, p.fecha, p.uf, quien.rol as Rol,
      { exclusivo: '', idReserva: '', showAutorizado: false, arriendoAutorizado: false });
    p.showBajoMinimo = showBajoMinimoDe('', puede(quien.rol as Rol, 'showBajoMinimo'), nuevas.bajoMinimo,
      quien.usuario, ahoraEnChile());
    p.arriendoBajoMinimo = showBajoMinimoDe('', puede(quien.rol as Rol, 'showBajoMinimo'), nuevas.arriendoBajo,
      quien.usuario, ahoraEnChile());
    const topados = conTopes(p, nuevas.lineas, cfg, quien.rol as Rol, quien.usuario);
    await guardarPresupuesto(p);
    await guardarLineas(id, topados.lineas);
    await anotar({ ...quien,
      accion: estado === ESTADO_PRESUPUESTO.candidato ? 'Anotó un candidato' : 'Creó una cotización',
      detalle: `${folioDe(p)} · ${cliente.nombre} · ${p.fecha || p.periodo}` });
    if (topados.aprobo) {
      await anotar({ ...quien, accion: 'Dejó condiciones especiales', detalle: `${folioDe(p)} · ${topados.aprobo}` });
    }
    return NextResponse.json({ presupuesto: { ...p, fila: -1 }, recortes: topados.recortes });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Edita una cotización. **Es parcial**: lo que no viene se conserva.
 *
 * - **El vendedor solo edita las suyas** (`puedeTocarPresupuesto()`).
 * - **No se acepta del navegador**: el token, el `ID Reserva`, quién la
 *   creó, ni el estado *Ganada* o *No elegida* —el primero se pone con
 *   "Marcar ganada", el segundo lo pone el sistema—.
 * - **Una ganada no cambia de estado**: tiene una reserva ocupando cupo. Sí
 *   se edita —más invitados, otro menú, otro precio— y **su reserva se
 *   reescribe sola** (`sincronizarReserva()`). Si el día de la reserva ya
 *   está cerrado, eso es corregirlo: con la lista de cambios confirmada.
 */
export const PATCH = conLecturas([HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_MENUS, HOJA_CONFIG, HOJA_FECHAS, HOJA_RESERVAS], async function PATCH(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json()) ?? {};
    const id = String(cuerpo.id ?? '').trim();
    const lista = await leerPresupuestos();
    const previo = lista.find((x) => x.id === id);
    if (!previo) {
      return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    }
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, previo.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${previo.creadoPor || 'otra persona'}, así que no es tuya para cambiarla.`,
        permiso: true
      }, { status: 403 });
    }

    // Una cancelada no se edita: su reserva ya liberó el cupo, y lo que
    // queda —la devolución— se anota en sus cobros.
    if (previo.estado === ESTADO_PRESUPUESTO.cancelada) {
      return NextResponse.json({
        error: 'Esta cotización está cancelada: ya no se edita. Si el cliente vuelve, haz una nueva.'
      }, { status: 409 });
    }

    const cuando = cuandoDelCuerpo(cuerpo, previo);
    if (!cuando) {
      return NextResponse.json(
        { error: 'Falta la fecha del evento, o el periodo si todavía no hay día.' },
        { status: 400 });
    }

    let estado = previo.estado;
    if (cuerpo.estado !== undefined) {
      const pedido = estadoNormal(cuerpo.estado);
      if (previo.idReserva && pedido !== ESTADO_PRESUPUESTO.aceptado) {
        return NextResponse.json({
          error: 'Esta cotización ya es una reserva. Si el cliente cancela, usa '
               + '"Cancelar evento": libera el cupo y anota lo que se devuelve.'
        }, { status: 409 });
      }
      if (!previo.idReserva) {
        if (!ESTADOS_A_MANO.includes(pedido)) {
          return NextResponse.json({
            error: 'Para ganarla usa "Marcar ganada": es lo que toma el cupo.'
          }, { status: 400 });
        }
        estado = pedido;
      }
    }

    // **El seguimiento** (2026-11-11). `seguimiento: 'enviada'` es el "Sí,
    // la mandé"; `'esperando'` es "sigue esperando". Las fechas las pone el
    // servidor, nunca el navegador.
    const cfgSeg = await leerConfig();
    let enviada = previo.enviada;
    let ultimoSeguimiento = previo.ultimoSeguimiento;
    let validoHasta = cuerpo.renovarVigencia
      ? vigenciaHasta(hoy(), cfgSeg.vigenciaPresupuesto, cuando.fecha) : previo.validoHasta;
    if (cuerpo.seguimiento === 'enviada' && !previo.idReserva && !estaMandada(estado)) {
      estado = ESTADO_PRESUPUESTO.enviado;
    }
    if (cuerpo.seguimiento === 'esperando') ultimoSeguimiento = hoy();
    // "Sí, mandé el contrato": la fecha la pone el servidor, la primera vez.
    let contratoEnviado = previo.contratoEnviado;
    if (cuerpo.seguimiento === 'contratoEnviado') {
      if (!contratoEnviado) contratoEnviado = hoy();
      ultimoSeguimiento = hoy();
    }
    if (estado !== previo.estado) ultimoSeguimiento = hoy();
    // La primera vez que queda mandada —con el botón o eligiendo la etapa a
    // mano— se anota el día y desde ahí corre la vigencia.
    if (estaMandada(estado) && !enviada) {
      enviada = hoy();
      validoHasta = vigenciaHasta(hoy(), cfgSeg.vigenciaPresupuesto, cuando.fecha);
    }
    // **"Todavía no se mandó"** (2026-11-12): de mandada a borrador se borran
    // la fecha de envío y la vigencia, que corren de nuevo al mandarla.
    const desmandada = estaMandada(previo.estado) && !previo.idReserva
      && (estadoNormal(estado) === ESTADO_PRESUPUESTO.borrador
          || estadoNormal(estado) === ESTADO_PRESUPUESTO.candidato);
    if (desmandada) { enviada = ''; validoHasta = ''; }
    // Si el evento se adelanta, la vigencia baja con él (regla B).
    if (cuando.fecha !== previo.fecha) validoHasta = vigenciaAntesDelEvento(validoHasta, cuando.fecha);

    // Una ganada: si el día de su reserva —o el día al que se mueve— ya se
    // cerró, guardarla es corregirlo. Desde el 2026-11-21 la ventana de
    // cotizar manda la lista de lo que cambió (`cambiosDeLaCotizacion()`),
    // confirmada con una casilla, y esa lista es la que queda en la bitácora.
    let motivoCorreccion = '';
    if (previo.idReserva) {
      const guarda = await guardaDelDia(req, [previo.fecha, cuando.fecha], cuerpo.correccion);
      if ('error' in guarda) return guarda.error;
      motivoCorreccion = guarda.motivo;
      if (!cuando.fecha) {
        return NextResponse.json(
          { error: 'Una cotización ganada tiene su reserva en un día: no puede quedar sin fecha.' },
          { status: 400 });
      }
      // **El plazo para cambiar la fecha** (2026-11-23, Configuración →
      // *Cambios de fecha y cancelación*): con el evento más cerca que eso,
      // moverla lo decide quien aprueba. Es lo que dice el contrato.
      const faltan = diasAlEvento(previo.fecha, hoy());
      if (cuando.fecha !== previo.fecha && cfgSeg.cambiosFechaDias > 0 && faltan !== null
          && faltan < cfgSeg.cambiosFechaDias && !puede(quien.rol as Rol, 'showBajoMinimo')) {
        return NextResponse.json({
          error: `Faltan ${Math.max(0, faltan)} días para el evento y la fecha se cambia con al menos `
            + `${cfgSeg.cambiosFechaDias} días de aviso. Si de verdad hay que moverla, lo hace la gerencia, `
            + 'el encargado de pagos o el administrador.'
        }, { status: 409 });
      }
    }

    const texto = (k: string, antes: string) =>
      cuerpo[k] === undefined ? antes : String(cuerpo[k] ?? '').trim();
    const invitados = cuerpo.invitados === undefined
      ? previo.invitados : Math.max(0, aEntero(cuerpo.invitados));

    const { fila: _f, ...sinFila } = previo;
    const p: Omit<Presupuesto, 'fila'> = {
      ...sinFila,
      ...cuando,
      idCliente: cuerpo.idCliente === undefined ? previo.idCliente
        : String(cuerpo.idCliente ?? '').trim() || previo.idCliente,
      estado,
      invitados,
      tipoEvento: texto('tipoEvento', previo.tipoEvento),
      socio: cuerpo.socio === undefined ? (previo.socio ?? '') : socioDelCuerpo(cuerpo.socio),
      // Si cambia el socio, su comisión congelada era del otro: se borra y
      // se vuelve a calcular para el nuevo (y se congela en el próximo cobro).
      comisionSocio: cuerpo.socio !== undefined && socioDelCuerpo(cuerpo.socio) !== (previo.socio ?? '')
        ? '' : (previo.comisionSocio ?? ''),
      descuento: cuerpo.descuento === undefined ? previo.descuento : pct(cuerpo.descuento),
      motivo: texto('motivo', previo.motivo),
      documento: cuerpo.documento === undefined ? previo.documento : documentoDe(cuerpo.documento),
      anticipo: cuerpo.anticipo === undefined
        ? previo.anticipo : numeroONulo(cuerpo.anticipo, 100),
      anticipoMonto: cuerpo.anticipoMonto === undefined
        ? (previo.anticipoMonto ?? null) : montoONulo(cuerpo.anticipoMonto),
      // **"¿El día es exclusivo?"** (2026-11-12): la respuesta sí viene del
      // navegador; el pedido a la gerencia y el día pausado, nunca (los
      // escribe `/api/presupuestos/exclusivo`, que se conservan del previo).
      exclusivo: cuerpo.exclusivo === undefined ? (previo.exclusivo ?? '')
        : (/^s[ií]$/i.test(String(cuerpo.exclusivo)) ? 'sí' : /^no$/i.test(String(cuerpo.exclusivo)) ? 'no' : ''),
      saldoDias: cuerpo.saldoDias === undefined
        ? previo.saldoDias : numeroONulo(cuerpo.saldoDias, 365),
      ...ufDelCuerpo(cuerpo, previo),
      notas: texto('notas', previo.notas),
      horario: normalizarHorario(texto('horario', previo.horario)),
      ley20393: cuerpo.ley20393 === undefined ? previo.ley20393 : cuerpo.ley20393 === true,
      acuerdos: texto('acuerdos', previo.acuerdos),
      cambiosFecha: cuerpo.cambiosFecha === undefined
        ? previo.cambiosFecha : numeroONulo(cuerpo.cambiosFecha, 10),
      cancelacionDias: cuerpo.cancelacionDias === undefined
        ? previo.cancelacionDias : numeroONulo(cuerpo.cancelacionDias, 365),
      reembolso: cuerpo.reembolso === undefined
        ? previo.reembolso : numeroONulo(cuerpo.reembolso, 100),
      seguimientoDias: cuerpo.seguimientoDias === undefined
        ? previo.seguimientoDias : numeroONulo(cuerpo.seguimientoDias, 365),
      avisoEvento: cuerpo.avisoEvento === undefined
        ? previo.avisoEvento : numeroONulo(cuerpo.avisoEvento, 365),
      enviada, ultimoSeguimiento, contratoEnviado,
      // La vigencia se recalcula solo al mandarla o si lo piden. Editar una
      // línea no puede correrle el plazo al cliente.
      validoHasta
    };
    // Las líneas se vuelven a preparar también cuando solo cambian los
    // invitados o la fecha: las que siguen a los invitados toman el número
    // nuevo, y la regla del show depende del día. Se preparan antes de
    // guardar la cotización, porque de ellas sale la marca del show bajo el
    // mínimo (2026-11-20).
    // **Los días en que no se arrienda en exclusiva** (2026-11-23): Día de la
    // Madre, del Padre, Fiestas Patrias. Marcarla exclusiva en uno de ellos
    // —o moverla ahí ya marcada— lo decide quien puede pasar por encima.
    if (esExclusivo(p.exclusivo) && esFecha(p.fecha) && cfgSeg.fechasSinExclusivo.includes(p.fecha)
        && !(esExclusivo(previo.exclusivo) && previo.fecha === p.fecha)
        && !puede(quien.rol as Rol, 'showBajoMinimo')) {
      return NextResponse.json({
        error: 'Ese día no se arrienda en exclusiva: el público deja más que cualquier arriendo. '
          + 'Si de verdad conviene, lo decide la gerencia, el encargado de pagos o el administrador.'
      }, { status: 409 });
    }

    // Las líneas se vuelven a preparar también cuando cambia *¿exclusivo?*:
    // de eso depende el mínimo del arriendo en un día público (2026-11-23).
    let nuevas: Awaited<ReturnType<typeof lineasListas>> | null = null;
    if (cuerpo.lineas !== undefined || cuerpo.invitados !== undefined
        || cuerpo.fecha !== undefined || cuerpo.uf !== undefined || cuerpo.exclusivo !== undefined) {
      const crudo = cuerpo.lineas !== undefined
        ? cuerpo.lineas : lineasDe(await leerLineasPresupuesto(), id);
      nuevas = await lineasListas(crudo, id, invitados, p.fecha, p.uf, quien.rol as Rol, {
        exclusivo: p.exclusivo ?? '', idReserva: previo.idReserva,
        showAutorizado: !!previo.showBajoMinimo, arriendoAutorizado: !!previo.arriendoBajoMinimo
      });
      p.showBajoMinimo = showBajoMinimoDe(previo.showBajoMinimo ?? '', puede(quien.rol as Rol, 'showBajoMinimo'),
        nuevas.bajoMinimo, quien.usuario, ahoraEnChile());
      p.arriendoBajoMinimo = showBajoMinimoDe(previo.arriendoBajoMinimo ?? '', puede(quien.rol as Rol, 'showBajoMinimo'),
        nuevas.arriendoBajo, quien.usuario, ahoraEnChile());
    }
    // **Los topes** (regla A, 2026-11-23): solo a lo que cambió.
    const lineasAntes = lineasDe(await leerLineasPresupuesto(), id);
    const topados = conTopes(p, nuevas ? nuevas.lineas : lineasAntes, cfgSeg, quien.rol as Rol, quien.usuario,
      { p: previo, lineas: lineasAntes });
    await guardarPresupuesto(p);
    if (nuevas || topados.recortes.length) await guardarLineas(id, topados.lineas);
    if (topados.aprobo) {
      await anotar({ ...quien, accion: 'Dejó condiciones especiales', detalle: `${folioDe(p)} · ${topados.aprobo}` });
    }
    if (p.showBajoMinimo && !previo.showBajoMinimo) {
      await anotar({ ...quien, accion: 'Dejó el show bajo el mínimo',
        detalle: `${folioDe(p)} · ${p.fecha || p.periodo} · bajo ${reglaShowDe(await leerConfig())?.desde ?? ''} personas` });
    }
    if (p.arriendoBajoMinimo && !previo.arriendoBajoMinimo && nuevas?.minimo) {
      await anotar({ ...quien, accion: 'Dejó el arriendo bajo el mínimo',
        detalle: `${folioDe(p)} · ${p.fecha} · ${nuevas.personas} personas · `
          + `${nuevas.minimo.caso === 'exclusivo' ? 'exclusivo en un día público' : 'día no público'} · `
          + `mínimo $${nuevas.minimo.minimo.toLocaleString('es-CL')} + IVA` });
    }
    if (p.idReserva) await sincronizarReserva(id);

    // **Las alternativas se mandan y se siguen juntas** (2026-11-11): van en
    // un solo link, así que lo que es de la conversación con el cliente —que
    // se mandó, que está negociando, que se perdió, que sigue esperando—
    // vale para todas las que siguen en carrera. Solo hacia adelante: una
    // alternativa que pasa de candidato a borrador no devuelve a las demás.
    if (!previo.idReserva) {
      const adelante: string[] = [
        ESTADO_PRESUPUESTO.enviado, ESTADO_PRESUPUESTO.negociacion, ESTADO_PRESUPUESTO.rechazado
      ];
      const estadoAdelante = p.estado !== previo.estado && adelante.includes(estadoNormal(p.estado));
      for (const otra of otrasAlternativas(previo, lista)) {
        const { fila: _fo, ...o } = otra;
        let cambio = false;
        if (estadoAdelante && estadoNormal(o.estado) !== estadoNormal(p.estado)
            && !(estadoNormal(p.estado) === ESTADO_PRESUPUESTO.enviado && estaMandada(o.estado))) {
          o.estado = p.estado;
          if (estadoNormal(p.estado) === ESTADO_PRESUPUESTO.rechazado) o.motivo = p.motivo;
          cambio = true;
        }
        // "Sí, la mandé" —también "Mandar de nuevo"— manda el link entero:
        // una alternativa nueva que todavía era borrador ya va en él.
        if (cuerpo.seguimiento === 'enviada' && !estaMandada(o.estado)) {
          o.estado = ESTADO_PRESUPUESTO.enviado; cambio = true;
        }
        if (p.enviada && !o.enviada && estaMandada(o.estado)) {
          o.enviada = p.enviada; o.validoHasta = p.validoHasta; cambio = true;
        }
        if (cuerpo.renovarVigencia && o.validoHasta !== p.validoHasta) {
          o.validoHasta = p.validoHasta; cambio = true;
        }
        if (p.ultimoSeguimiento !== previo.ultimoSeguimiento && o.ultimoSeguimiento !== p.ultimoSeguimiento) {
          o.ultimoSeguimiento = p.ultimoSeguimiento; cambio = true;
        }
        if (cambio) await guardarPresupuesto(o);
      }
      // Y "Todavía no se mandó" vale para todo el link: las que se habían
      // marcado enviadas con ella vuelven a borrador.
      if (desmandada) {
        for (const otra of otrasAlternativas(previo, lista)) {
          if (!estaMandada(otra.estado)) continue;
          const { fila: _fd, ...o } = otra;
          await guardarPresupuesto({ ...o, estado: ESTADO_PRESUPUESTO.borrador, enviada: '', validoHasta: '' });
        }
      }
      // **Volver a abrir una perdida reabre las del grupo** (2026-11-12): *Se
      // perdió* se copia a todas, así que deshacerlo también. Sin esto la
      // otra alternativa quedaba perdida y ya no iba en el link.
      if (estadoNormal(previo.estado) === ESTADO_PRESUPUESTO.rechazado
          && estadoNormal(p.estado) !== ESTADO_PRESUPUESTO.rechazado) {
        for (const otra of lista) {
          if (otra.id === p.id || grupoDe(otra) !== grupoDe(p) || otra.idReserva
              || estadoNormal(otra.estado) !== ESTADO_PRESUPUESTO.rechazado) continue;
          const { fila: _fr, ...o } = otra;
          await guardarPresupuesto({ ...o, estado: p.estado, motivo: '' });
        }
      }
    }

    await anotar({ ...quien,
      accion: motivoCorreccion ? 'Corrigió una cotización ganada de un día cerrado'
                               : 'Editó una cotización',
      detalle: `${folioDe(p)} · ${p.estado || 'Borrador'}`
             + (motivoCorreccion ? ` · cambios: ${motivoCorreccion}` : '') });
    return NextResponse.json({ ok: true, contratoEnviado: p.contratoEnviado, recortes: topados.recortes,
      validoHasta: p.validoHasta });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Borra una cotización y sus líneas. **Una ganada no se borra**: su
 * `ID Reserva` es el rastro de dónde salió esa reserva.
 */
export const DELETE = conLecturas([], async function DELETE(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { id } = await req.json();
    const previo = (await leerPresupuestos()).find((x) => x.id === String(id ?? '').trim());
    if (!previo) return NextResponse.json({ ok: true });
    const quien = await quienEs(req);
    if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, previo.creadoPor)) {
      return NextResponse.json({
        error: `Esa cotización la creó ${previo.creadoPor || 'otra persona'}, así que no es tuya para borrarla.`,
        permiso: true
      }, { status: 403 });
    }
    if (previo.idReserva) {
      return NextResponse.json({
        error: 'Esta cotización ya es una reserva, así que no se borra.'
      }, { status: 409 });
    }
    await borrarPresupuesto(previo.id);
    await anotar({ ...quien, accion: 'Borró una cotización', detalle: folioDe(previo) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
