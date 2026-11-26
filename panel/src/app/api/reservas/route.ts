import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_TAREAS, cuantasMeTocan } from '@/lib/tareas';
import { HOJA_COMENTARIOS, avisosDeComentarios } from '@/lib/comentarios';
import { HOJA_RESERVAS, HOJA_FECHAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { ocupacionDe } from '@/lib/ocupacion';
import { esFecha, hoy } from '@/lib/fechas';
import { HOJA_MENUS, sinCostos } from '@/lib/menus';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, folioDe } from '@/lib/presupuestos';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { marcasDePago } from '@/lib/plata';
import { ROL, esSuya, puede, type Rol } from '@/lib/auth';
import { empujarDia } from '@/lib/crm-escribir';
import { anotar } from '@/lib/datos';
import { leerPresupuestos, leerLineasPresupuesto, leerClientes, leerVendedores, leerTareas, leerComentarios } from '@/lib/datos';
import { HOJA_VENDEDORES } from '@/lib/vendedores';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { leerReservas, crearReserva, leerMenus, abrirElDiaSiHaceFalta, reservasDeCotizaciones,
         leerFechas, leerConfig } from '@/lib/datos';
import { comoIngresar, acordadosPorReserva } from '@/lib/fudo';
import { ASISTENCIA, ESTADO_PAGO } from '@/lib/columnas';
import { telefonoNormal, correoNormal } from '@/lib/contacto';
import { alcanceDeContacto, recortarReserva } from '@/lib/privacidad';
import { guardaDelDia } from '@/lib/guardaCierre';
import { firmaDe } from '@/lib/cambios';
import { yaAbrio } from '@/lib/cierres';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';   // nunca cachear: son datos vivos

export const GET = conLecturas([HOJA_RESERVAS, HOJA_MENUS, HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_FECHAS, HOJA_CONFIG, HOJA_CLIENTES, HOJA_VENDEDORES, HOJA_TAREAS, HOJA_COMENTARIOS], async function GET(req: Request) {
  const no = await exigirVer(req, 'ver');
  if (no) return no;
  try {
    // Los menus viajan junto a las reservas: las dos vistas que leen esto
    // los necesitan para agrupar, y asi no hay una peticion mas.
    const [reservas, menus, deCot, presupuestos, lineasCot, clientes, fichas, tareas, comentarios] = await Promise.all([
      leerReservas(), leerMenus(), reservasDeCotizaciones().catch(() => new Map<string, string>()),
      leerPresupuestos().catch(() => []), leerLineasPresupuesto().catch(() => []), leerClientes().catch(() => []),
      leerVendedores().catch(() => []), leerTareas().catch(() => []), leerComentarios().catch(() => [])
    ]);
    // **Lo acordado en la cotización ganada** (2026-11-20): va dentro de la
    // caja de Fudo, así que el recorte de `privacidad.ts` lo saca junto con
    // ella a quien no ve la plata de esa reserva. Esta ruta pide `ver`, que
    // la anfitriona no tiene. Las líneas vienen en la misma tanda.
    const acordados = acordadosPorReserva(presupuestos, lineasCot, menus);
    // **Quién vendió cada reserva que viene de una cotización** (2026-11-12,
    // lo pidió el cliente): el encargado lo ve en la lista del día para saber
    // con quién hablar. Sale de la misma tanda de lecturas.
    const vendedorDe: Record<string, string> = {};
    for (const p of presupuestos) if (p.idReserva) vendedorDe[p.idReserva] = p.creadoPor;
    const folioDeReserva: Record<string, string> = {};
    for (const p of presupuestos) if (p.idReserva) folioDeReserva[p.idReserva] = folioDe(p);
    // **Y la empresa del cliente** (2026-11-26, lo pidió el cliente: *"o de
    // cotización de tal persona, tal empresa"*), para la línea de la reserva en
    // la página del día. No se recorta por rol: no es un dato de contacto.
    // `Clientes` va en la misma tanda.
    const empresaDe = new Map(clientes.map((c) => [c.id, c.empresa ?? '']));
    const empresaDeReserva: Record<string, string> = {};
    for (const p of presupuestos) {
      const e = p.idReserva && p.idCliente ? empresaDe.get(p.idCliente) : '';
      if (e) empresaDeReserva[p.idReserva!] = e;
    }
    // **Y el socio comercial, si vino por uno** (lo pidió el cliente el mismo
    // día: *"y si hay socio comercial, también"*): su nombre, de su ficha.
    // `Vendedores` va en la misma tanda.
    const socioDeReserva: Record<string, string> = {};
    for (const p of presupuestos) {
      if (!p.idReserva || !p.socio) continue;
      socioDeReserva[p.idReserva] = fichas.find((f) => f.usuario === p.socio)?.nombre || p.socio;
    }
    // **Cómo ingresarla en Fudo**, armado acá (2026-11-11): la misma
    // instrucción en la página del día, en /turnos y en la recepción.
    // **Con `?dia=AAAA-MM-DD`, el cupo de ese día** (2026-11-12): lo pide la
    // página del día para el bloque de sobrecupo. Viene en la misma tanda de
    // lecturas, así que no cuesta una consulta más a Google.
    const pedido = new URL(req.url).searchParams.get('dia') ?? '';
    let dia = null;
    let capacidadMaxima: number | undefined;
    // Los días van en la misma tanda de lecturas: sirven para la firma
    // (ver `lib/cambios.ts`) sin costar una consulta más.
    const fechas = await leerFechas();
    // El nombre comercial firma los mensajes de WhatsApp (2026-11-13). La
    // configuración viene en la misma tanda de lecturas.
    const empresa = (await leerConfig()).empresa.nombre;
    let apertura = '';
    let abierto = false;
    let descuentos: number[] = [];
    if (esFecha(pedido)) {
      const cfg = await leerConfig();
      // **Desde cuándo se rectifica** (2026-11-12): la hora de apertura del
      // día y si ya llegó, con la hora de Chile del servidor.
      apertura = fechas.find((x) => x.fecha === pedido)?.apertura || cfg.horaApertura;
      abierto = yaAbrio(pedido, apertura, ahoraEnChile());
      descuentos = cfg.descuentos;
      const f = fechas.find((x) => x.fecha === pedido);
      if (f) {
        const o = ocupacionDe(reservas, f, cfg.cortes);
        dia = { fecha: pedido, capacidad: o.capacidad, tomadas: o.tomadas, sobrecupo: o.sobrecupo,
                // Si el día está cerrado: con eso la ventana del equipo sabe si
                // es de preparación (2026-11-23, `esPreparacion()`).
                bloqueada: o.bloqueada,
                quedanPagando: o.quedanPagando, cupoPedido: f.cupoPedido ?? '' };
      }
      capacidadMaxima = cfg.capacidadMaxima;
    }
    // **El contacto, recortado por rol** (2026-11-13, `privacidad.ts`): el
    // vendedor recibe el teléfono, el correo y la plata solo de lo suyo; el
    // encargado de turno, el contacto de hoy en adelante.
    const quien = await quienEs(req);
    const alcance = alcanceDeContacto(quien.rol, quien.gerencia);
    const h = hoy();
    return NextResponse.json({
      reservas: reservas.map((r) => recortarReserva({ ...r, ingreso: comoIngresar(r, menus, deCot.has(r.id), acordados.get(r.id)) },
        alcance, { hoy: h, propia: esSuya(quien.usuario, r.anotadaPor) || esSuya(quien.usuario, vendedorDe[r.id] ?? '') })),
      menus: sinCostos(menus), dia, capacidadMaxima, firma: firmaDe(reservas, fechas), apertura, abierto, descuentos,
      // Qué reservas vienen de una cotización: esas no se sueltan acá, se
      // cancelan desde su cotización.
      deCotizacion: Object.fromEntries(deCot),
      vendedorDe, folioDeReserva, empresaDeReserva, socioDeReserva, empresa,
      // **Las tareas que te tocan** (2026-11-26, `lib/tareas.ts`): solo la
      // cuenta, para el aviso de la portada. `Tareas` viene en la tanda.
      tareasMias: cuantasMeTocan(tareas, { usuario: quien.usuario, rol: quien.rol }, h),
      // Los comentarios (2026-11-26): los nuevos, a quien los trabaja; a cada
      // uno, sus respuestas sin ver. `Comentarios` también viene en la tanda.
      comentariosMios: avisosDeComentarios(comentarios, quien.rol, quien.usuario)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas([], async function POST(req: Request) {
  // **El vendedor no anota directo** (2026-11-12): sus reservas nacen de una
  // cotización ganada. Ver `anotar` en `auth.ts`.
  if ((await quienEs(req)).rol === ROL.vendedor) {
    return NextResponse.json({
      error: 'Las reservas nuevas del vendedor se hacen por Cotizaciones: cotiza el día y, al ganarla, la reserva nace sola.',
      permiso: true
    }, { status: 403 });
  }
  const no = await exigir(req, 'anotar');
  if (no) return no;
  try {
    const b = await req.json();
    if (!b.fecha || !b.nombre) {
      return NextResponse.json(
        { error: 'La fecha y el nombre son obligatorios.' }, { status: 400 });
    }
    if (!(Number(b.personas) > 0)) {
      return NextResponse.json(
        { error: 'Una reserva sin personas no es una reserva.' }, { status: 400 });
    }
    // Anotar una reserva en un día ya cerrado también es corregirlo.
    const guarda = await guardaDelDia(req, [String(b.fecha)], b.correccion);
    if ('error' in guarda) return guarda.error;

    // **Quién la anota se resuelve antes de escribirla**, no después: es un
    // campo de la fila, no solo una línea de bitácora. Ver `COL_RESERVAS`.
    const quien = await quienEs(req);

    const id = await crearReserva({
      fecha: b.fecha, nombre: b.nombre, email: correoNormal(b.email),
      // Se guarda con la misma forma que las de Shopify: una reserva
      // anotada a mano y una comprada tienen que ser indistinguibles para
      // lo que venga después. Ver `contacto.ts`.
      telefono: telefonoNormal(b.telefono), menu: b.menu ?? '', personas: Number(b.personas),
      // El monto viene del formulario, calculado con los precios de /menus y
      // corregible a mano. Antes esta línea era un `null` fijo, de cuando el
      // monto no se pedía: con eso el precio se perdía al crear y solo se
      // guardaba al editar. Vacío sigue siendo válido — es lo que pasa si
      // nadie puso precios todavía.
      monto: b.monto == null || b.monto === '' ? null : Number(b.monto),
      // **La modalidad no se recibe del navegador**: la escribe el
      // sincronizador de Shopify y nadie más. Una reserva anotada a mano
      // nace sin ella, que es lo que de verdad pasó.
      tipoPago: '', estadoPago: b.estadoPago ?? '',
      notaPago: String(b.notaPago ?? '').trim(),
      // Cuánto abonó, solo si quedó *Abonada* (2026-11-11).
      abonado: b.estadoPago === ESTADO_PAGO.abonado && Number(b.abonado) > 0
        ? Math.round(Number(b.abonado)) : null,
      // **De qué ganado del socio sale esta reserva**, cuando sale de uno.
      // Al revés que `tipoPago`, este campo SÍ se acepta del navegador: no
      // es una opinión sobre la reserva, es de dónde viene — y acá no se
      // puede usar para mentir, porque la misma llamada crea la reserva que
      // dice estar anotando. (El `ID Reserva` de un presupuesto no se acepta
      // justamente porque ahí sí se podría apagar el conteo de un día sin
      // que existiera ninguna reserva.)
      eventoCRM: String(b.eventoCRM ?? '').trim(),
      // Sin marcar: a una reserva que se acaba de crear todavía no se le
      // puede saber si la persona apareció.
      asistencia: ASISTENCIA.sinMarcar,
      // **El dueño sale de la sesión y NO del cuerpo**, igual que la
      // modalidad. Si se aceptara del navegador, un vendedor podría
      // adjudicarse la reserva de otro — y con eso, borrársela.
      anotadaPor: quien.usuario,
      // **La plata la confirma pagos** (2026-11-13, `plata.ts`): nacer
      // Pagada o Abonada es anotar un pago, y le llega a la bandeja de pagos.
      ...marcasDePago(null, {
        estadoPago: b.estadoPago ?? '', notaPago: String(b.notaPago ?? '').trim(),
        monto: b.monto == null || b.monto === '' ? null : Number(b.monto),
        abonado: b.estadoPago === ESTADO_PAGO.abonado && Number(b.abonado) > 0 ? Math.round(Number(b.abonado)) : null
      }, quien.usuario, ahoraEnChile(), puede(quien.rol as Rol, 'pagar'))
    });
    await abrirElDiaSiHaceFalta(b.fecha);
    // Un día abierto sin reservas no se le manda al socio; con esta pasa a
    // tener algo que informar. Va después de abrir el día, que es lo que
    // decide el estado que se publica.
    await empujarDia(b.fecha);

    await anotar({ ...quien,
      accion: guarda.motivo ? 'Anotó una reserva en un día cerrado' : 'Anotó una reserva',
      detalle: `${b.nombre} · ${b.fecha} · ${b.personas} personas · ${b.menu ?? 'sin menú'}` +
               (guarda.motivo ? ` · cambios: ${guarda.motivo}` : '') });

    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
