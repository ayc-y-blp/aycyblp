/**
 * Genera la planilla de ejemplo para las capturas de la ayuda.
 * Todo inventado: nombres, teléfonos, correos, montos.
 *
 * La corre `capturas.sh`; a mano, desde `panel/`:
 *
 *   node --no-warnings --experimental-strip-types \
 *     --import ./pruebas/lecturas/registrar.mjs pruebas/ejemplo/generar-planilla.mjs <salida.json>
 */
import fs from 'node:fs';
const L = new URL('../../src/lib/', import.meta.url).href;
const col = await import(L + 'columnas.ts');
const cfg = await import(L + 'config.ts');
const men = await import(L + 'menus.ts');
const pre = await import(L + 'presupuestos.ts');
const cli = await import(L + 'clientes.ts');
const cob = await import(L + 'cobros.ts');
const eq = await import(L + 'equipo.ts');
const cie = await import(L + 'cierres.ts');
const ext = await import(L + 'extras.ts');
const rem = await import(L + 'remuneraciones.ts');
const bit = await import(L + 'bitacora.ts');
const ven = await import(L + 'vendedores.ts');
const usu = await import(L + 'usuarios.ts');
const fil = await import(L + 'filas.ts');
const not = await import(L + 'notas.ts');
const caj = await import(L + 'caja.ts');
const prm = await import(L + 'promociones.ts');
const pla = await import(L + 'plata.ts');
const otr = await import(L + 'otrasEmpresas.ts');
const tar = await import(L + 'tareas.ts');
const cmt = await import(L + 'comentarios.ts');

const SALIDA = process.argv[2];
if (!SALIDA) throw new Error('Falta dónde escribir la planilla: generar-planilla.mjs <salida.json>');

const H = {};
const banco = (titular, rut, b = 'BancoEstado', tipo = 'Cuenta RUT', numero = '', correo = '') =>
  ({ titular, rut, banco: b, tipo, numero: numero || rut.replace(/\D/g, '').slice(0, -1), correo, nota: '' });
let semilla = 7;
const azar = () => { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
const token = () => Array.from({ length: 32 }, () => 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(azar() * 57)]).join('');

/* ---------- Usuarios ---------- */
const CLAVE = usu.hashDeClave('clave-de-ejemplo-123', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');
const usuarios = [
  // La primera fila es la que muestra adm-cuentas: un rol con *+ Vista gerencia*.
  ['Fernanda Muñoz', 'fernanda', 'anfitrion', true, false],
  ['Tomás Herrera', 'tomas', 'encargado', true, false],
  ['Marcela Díaz', 'marcela', 'gerente', true, false],
  ['Verónica Lagos', 'veronica', 'pagos', true, false],
  ['Jorge', 'jorge', 'vendedor', true, false],
  ['Daniela', 'daniela', 'vendedor', true, false],
  ['Rodrigo Vera', 'rodrigo', 'gerencia', true, false],
  ['Paula Fuentes', 'paula', 'admin', true, false],
  ['Ignacio Reyes', 'ignacio', 'encargado', false, false]
].map(([nombre, usuario, rol, activo, gerencia]) =>
  ({ nombre, usuario, rol, activo, huella: CLAVE, gerencia, avisosLeidos: [] }));
H['Usuarios'] = usu.aFilasUsuarios(usuarios);

/* ---------- Config ---------- */
H['Config'] = cfg.aFilasConfig({
  ...cfg.POR_DEFECTO,
  cupoNormal: 120,
  diasAbiertos: [6, 0],
  diasAFuturo: 60,
  tokenPlanilla: '',
  // El simulador de evento: números inventados, solo para el panel de ejemplo.
  margenMinimo: 30, gastosEvento: 'Hielo: 20000; Leña y carbón: 600 pp',
  // La carpeta de los comprobantes: en el ejemplo, Drive es de mentira (`capturas.sh`).
  driveComprobantes: 'unidad-de-ejemplo',
  // Las cotizaciones del cotizador del sitio llegan a Daniela (2026-11-23).
  vendedorSitio: 'Daniela',
  empresa: { ...cfg.EMPRESA_VACIA, nombre: 'Brasas de Lo Pirque' }
});

/* ---------- Menús y productos ---------- */
const P = men.nuevoProducto;
H['Menús'] = men.aFilasMenus([
  P({ nombre: 'Tradiciones', precioEnLinea: 44000, precioEnLocal: 49000, cotizacion: true, precioCotizacion: 49000, costo: 16000 }),
  P({ nombre: 'Lo Pirque', precioEnLinea: 50000, precioEnLocal: 55000, sitioPublico: false, cotizacion: true, precioCotizacion: 55000, costo: 18000 }),
  P({ nombre: 'A Brasas abiertas', precioEnLinea: 70000, precioEnLocal: 75000, cotizacion: true, precioCotizacion: 75000, bonoVendedor: true, costo: 26000 }),
  P({ nombre: 'Sommelier', precioEnLinea: 90000, precioEnLocal: 95000, sitioPublico: false, cotizacion: true, precioCotizacion: 95000, bonoVendedor: true, costo: 34000 }),
  P({ nombre: 'Niños', precioEnLinea: 19000, precioEnLocal: 24000, cotizacion: true, precioCotizacion: 24000, costo: 8000 }),
  P({ nombre: 'Pequeños', precioEnLinea: 6000, precioEnLocal: 9000, cotizacion: true, precioCotizacion: 9000, costo: 3000 }),
  P({ nombre: 'Show ecuestre', tipo: 'Show', sitioPublico: false, cotizacion: true, cobro: 'Monto fijo', precioCotizacion: 450000, costo: 250000 }),
  P({ nombre: 'Arriendo del recinto', tipo: 'Arriendo', sitioPublico: false, cotizacion: true, cobro: 'Monto fijo', precioCotizacion: 2500000 }),
  P({ nombre: 'Desayuno de campo', tipo: 'Extra', sitioPublico: false, cotizacion: true, precioCotizacion: 8000, iva: '+ IVA' }),
  // Las promociones del sitio (2026-11-23): la clase del Combate y el karting,
  // que lo cobra otra empresa y va aparte del total.
  P({ nombre: 'Clase de parrilla', tipo: 'Extra', sitioPublico: false, cotizacion: true, precioCotizacion: 15000, iva: '+ IVA', costo: 6000 }),
  P({ nombre: 'Karting', tipo: 'Extra', sitioPublico: false, cotizacion: true, precioCotizacion: 35000, iva: '+ IVA', loCobra: 'Karting Pirque' })
]);

/* ---------- Otras empresas (2026-11-24): la del karting, con datos inventados ---------- */
H['Otras empresas'] = otr.aFilasOtrasEmpresas([
  otr.limpiarOtraEmpresa({ nombre: 'Karting Pirque', rut: '76.111.222-3', contacto: 'Pedro Soto',
    telefono: '+56 9 5555 1234', correo: 'reservas@karting.example', que: 'Karting en la pista de al lado' })
]);

/* ---------- Promociones del sitio (2026-11-23) ---------- */
const PR = prm.nuevaPromocion;
H['Promociones'] = prm.aFilasPromociones([
  PR({ id: 'PR-01', nombre: 'Fin de año', sitio: 'fin-de-ano', menus: ['Lo Pirque', 'A Brasas abiertas', 'Sommelier'],
    minimo: 22, descuento: 11, arriendo: prm.ARRIENDO_PROMO.semana, mostrar: true }),
  // Combate, solo con su link (2026-11-24): no sale en la lista de la página.
  PR({ id: 'PR-02', nombre: 'Combate de Parrillas', sitio: 'combate', menus: ['A Brasas abiertas'],
    incluye: ['Clase de parrilla'], minimo: 22, mostrar: false }),
  PR({ id: 'PR-03', nombre: 'Gran Premio de Fin de Año', sitio: 'gran-premio', menus: ['Lo Pirque', 'A Brasas abiertas', 'Sommelier'],
    incluye: ['Show ecuestre'], suma: ['Karting'], minimo: 22, descuento: 10,
    // Un tramo sobre el tope del vendedor (15%): Andrés Pino, con 80, lleva el 20%.
    tramos: [{ desde: 60, descuento: 20 }], mostrar: true }),
  PR({ id: 'PR-04', nombre: 'Día de Campo en Familia', sitio: 'dia-de-campo', menus: ['Lo Pirque'], ninos: ['Niños', 'Pequeños'],
    // Con 21 días de anticipación (2026-11-24): para Andrés Pino, el 28, no alcanza.
    incluye: ['Show ecuestre'], suma: ['Desayuno de campo'], minimo: 30, mostrar: true, anticipacion: 21 }),
  PR({ id: 'PR-05', nombre: 'Mesa de Directorio', menus: ['Sommelier'], minimo: 8, activa: false })
]);

/* ---------- Fechas Hábiles ---------- */
const FECHAS = [];
const dia = (fecha, capacidad, estado = 'Abierta', notas = '', apertura = '13:00') =>
  FECHAS.push({ fecha, capacidad, apertura, estado, notas });
dia('2026-10-31', 120); dia('2026-11-01', 120);
dia('2026-11-07', 120); dia('2026-11-08', 120);
dia('2026-11-11', 50, 'Privada', 'Cumpleaños Familia Contreras');
dia('2026-11-12', 60);
dia('2026-11-13', 80);
for (const f of ['2026-11-14', '2026-11-15', '2026-11-21', '2026-11-22', '2026-11-28', '2026-11-29',
  '2026-12-05', '2026-12-06', '2026-12-12', '2026-12-13', '2026-12-19', '2026-12-20']) dia(f, 120);
const encF = Object.values(col.COL_FECHAS);
H['Fechas Hábiles'] = [encF, ...FECHAS.map((f) => fil.filaFecha(encF, f).map(String))];

/* ---------- Clientes ---------- */
const CLIENTES = [
  { id: 'C-0001', nombre: 'Andrés Pino', empresa: 'Empresa Andes SpA', rut: '76.543.210-3', domicilio: 'Av. Los Leones 1200, Providencia',
    giro: 'Servicios de ingeniería', telefono: '+56 9 8123 4567', correo: 'andres.pino@ejemplo.cl', notas: 'Fin de año del equipo.', creadoPor: 'Jorge', creado: '2026-11-09 12:10' },
  { id: 'C-0002', nombre: 'Patricia Vidal', empresa: 'Colegio Santa Inés', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 7234 5678', correo: 'patricia.vidal@ejemplo.cl', notas: 'Paseo de apoderados.', creadoPor: 'Jorge', creado: '2026-10-20 10:31' },
  { id: 'C-0003', nombre: 'Rocío Fuenzalida', empresa: 'Agrícola El Peumo', rut: '77.111.222-3', domicilio: 'Camino El Principal 455, Pirque',
    giro: 'Agrícola', telefono: '+56 9 6345 6789', correo: 'rocio@ejemplo.cl', notas: '', creadoPor: 'Jorge', creado: '2026-10-28 16:02' },
  { id: 'C-0004', nombre: 'Gonzalo Contreras', empresa: '', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 5456 7890', correo: 'gonzalo.contreras@ejemplo.cl', notas: 'Cumpleaños 60 de su mamá.', creadoPor: 'Daniela', creado: '2026-10-05 11:45' },
  { id: 'C-0005', nombre: 'Marisol Cáceres', empresa: 'Inmobiliaria Cordillera', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 4567 8901', correo: 'marisol@ejemplo.cl', notas: '', creadoPor: 'Daniela', creado: '2026-11-10 09:20' },
  { id: 'C-0006', nombre: 'Felipe Ortúzar', empresa: '', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 3678 9012', correo: 'felipe.ortuzar@ejemplo.cl', notas: 'Matrimonio civil, almuerzo.', creadoPor: 'Jorge', creado: '2026-11-11 17:40' },
  // Llegó por el cotizador del sitio (2026-11-23): su ficha es de la cuenta que recibe las del sitio.
  { id: 'C-0007', nombre: 'Ignacia Rojas', empresa: 'Constructora Maipo', rut: '', domicilio: '', giro: '',
    telefono: '+56 9 2789 0123', correo: 'ignacia.rojas@ejemplo.cl', notas: 'Llegó por el cotizador del sitio.', creadoPor: 'Daniela', creado: '2026-11-13 09:40' }
];
const encC = cli.ENCABEZADO_CLIENTES;
H['Clientes'] = [encC, ...CLIENTES.map((c) => cli.filaCliente(encC, c))];
const cliente = (id) => CLIENTES.find((c) => c.id === id);

/* ---------- Cotizaciones ---------- */
const PRES = []; const LINEAS = []; const COBROS = [];
const vacio = {
  email: '', telefono: '', validoHasta: '', token: '', notas: '', idReserva: '', creadoPor: '', creado: '', idCliente: '',
  invitados: 0, periodo: '', tipoEvento: '', grupo: '', descuento: 0, motivo: '', documento: '', anticipo: 30,
  anticipoMonto: null, exclusivo: '', exclusividad: '', diaPausado: '', comisionVendedor: '', socio: '', comisionSocio: '',
  saldoDias: 3, uf: 0, fechaUF: '', horario: '13:00 a 18:00', ley20393: false, acuerdos: '', contrato: '', contratoSubidoPor: '',
  contratoSubido: '', cambiosFecha: 2, cancelacionDias: 60, reembolso: 20, devolucion: 0, canceladaPor: '', cancelada: '',
  diaAbierto: '', enviada: '', ultimoSeguimiento: '', contratoEnviado: '', seguimientoDias: 5, avisoEvento: 14
};
const linea = (presupuesto, concepto, cantidad, precio, personas, extra = {}) =>
  LINEAS.push({ presupuesto, concepto, cantidad, precio, personas, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0, ...extra });
const cotizacion = (ms, p) => {
  const id = pre.nuevoId(ms);
  const c = p.idCliente ? cliente(p.idCliente) : null;
  PRES.push({ ...vacio, id, grupo: id, token: token(), cliente: c?.nombre ?? '', email: c?.correo ?? '', telefono: c?.telefono ?? '', ...p });
  return id;
};

// Andrés Pino: enviada, esperando el anticipo del 30%. Es la que abren ven-envio y pag-cobros.
const andres = cotizacion(Date.parse('2026-11-09T15:20:47.318Z'), {
  fecha: '2026-11-28', idCliente: 'C-0001', estado: 'Enviada', validoHasta: '2026-11-24', creadoPor: 'Jorge',
  creado: '2026-11-09 12:20', invitados: 80, tipoEvento: 'Empresa', documento: 'Factura', anticipo: 30,
  enviada: '2026-11-09', ultimoSeguimiento: '2026-11-12',
  // **La agenda** (2026-11-23): quedó en llamarlo el lunes 16.
  recontactar: '2026-11-16'
});
linea(andres, 'Tradiciones', 70, 49000, 70);
linea(andres, 'Niños', 10, 24000, 10);
// En un día público el show va incluido: sin precio.
linea(andres, 'Show ecuestre', 1, 0, 0);

// Colegio Santa Inés: ganada y pagada entera el 6 de noviembre (comisión de Jorge en noviembre).
const santaInes = cotizacion(Date.parse('2026-10-20T13:31:12.462Z'), {
  fecha: '2026-11-21', idCliente: 'C-0002', estado: 'Ganada', validoHasta: '2026-11-04', creadoPor: 'Jorge',
  creado: '2026-10-20 10:31', invitados: 60, tipoEvento: 'Colegio', documento: 'Boleta', anticipo: 30,
  enviada: '2026-10-20', contratoEnviado: '2026-10-24', contrato: 'firmado', contratoSubidoPor: 'Jorge', contratoSubido: '2026-10-26 18:02',
  idReserva: 'MANUAL-1761670000001', diaAbierto: ''
});
linea(santaInes, 'Tradiciones', 48, 49000, 48);
linea(santaInes, 'Niños', 12, 24000, 12);
COBROS.push({ id: 'COB-mh2a1-a1b2', presupuesto: santaInes, fecha: '2026-10-23', concepto: 'Anticipo', monto: 792000, medio: 'Transferencia',
  nota: '', registradoPor: 'Jorge', cuando: '2026-10-23 16:40', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-10-24 09:12' });
COBROS.push({ id: 'COB-mhkq2-c3d4', presupuesto: santaInes, fecha: '2026-11-06', concepto: 'Saldo', monto: 1848000, medio: 'Transferencia',
  nota: '', registradoPor: 'Jorge', cuando: '2026-11-06 12:05', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-11-06 15:30' });

// Constructora Maipo (2026-11-23): la mandó el cliente desde el cotizador del
// Gran Premio, con el karting —que cobra otra empresa— aparte. Es de Daniela,
// que recibe las del sitio, y todavía no ve su aviso: la ventana sale al entrar.
const maipo = cotizacion(Date.parse('2026-11-13T12:40:11.204Z'), {
  fecha: '2026-12-12', idCliente: 'C-0007', estado: 'Enviada', validoHasta: '2026-11-28', creadoPor: 'Daniela',
  creado: '2026-11-13 09:40', invitados: 40, tipoEvento: 'Empresa', anticipo: null, saldoDias: null,
  cambiosFecha: null, cancelacionDias: null, reembolso: null, seguimientoDias: null, avisoEvento: null, horario: '',
  enviada: '2026-11-13 09:40', recontactar: '2026-11-13', origen: 'Sitio · Gran Premio de Fin de Año', avisoVisto: '',
  notas: 'Cotizada por el cliente en el sitio: Gran Premio de Fin de Año · Constructora Maipo.'
});
linea(maipo, 'A Brasas abiertas', 40, 75000, 40);
linea(maipo, 'Show ecuestre', 1, 0, 0);
linea(maipo, 'Karting', 40, 35000, 0, { ivaIncluido: false, loCobra: 'Karting Pirque' });

// Agrícola El Peumo: ganada con el anticipo; el saldo viene (lo que "viene" de Jorge).
const peumo = cotizacion(Date.parse('2026-10-28T19:02:33.851Z'), {
  fecha: '2026-12-05', idCliente: 'C-0003', estado: 'Ganada', validoHasta: '2026-11-12', creadoPor: 'Jorge',
  creado: '2026-10-28 16:02', invitados: 45, tipoEvento: 'Empresa', documento: 'Factura', anticipo: 30,
  enviada: '2026-10-28', contratoEnviado: '2026-11-03', idReserva: 'MANUAL-1762200000002'
});
linea(peumo, 'A Brasas abiertas', 45, 75000, 45);
COBROS.push({ id: 'COB-mhjx3-e5f6', presupuesto: peumo, fecha: '2026-11-02', concepto: 'Anticipo', monto: 1012500, medio: 'Transferencia',
  nota: '', registradoPor: 'Jorge', cuando: '2026-11-02 11:20', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-11-02 17:45' });

// Familia Contreras (Daniela): el día privado del miércoles 11, ganada y pagada.
const contreras = cotizacion(Date.parse('2026-10-05T14:45:09.127Z'), {
  fecha: '2026-11-11', idCliente: 'C-0004', estado: 'Ganada', validoHasta: '2026-10-20', creadoPor: 'Daniela',
  creado: '2026-10-05 11:45', invitados: 42, tipoEvento: 'Cumpleaños', documento: 'Boleta', anticipo: 30,
  enviada: '2026-10-05', contratoEnviado: '2026-10-08', contrato: 'firmado', contratoSubidoPor: 'Daniela', contratoSubido: '2026-10-09 10:00',
  idReserva: 'MANUAL-1760100000003', diaAbierto: 'creado'
});
linea(contreras, 'Tradiciones', 36, 49000, 36);
linea(contreras, 'Niños', 6, 24000, 6);
COBROS.push({ id: 'COB-mgf1a-g7h8', presupuesto: contreras, fecha: '2026-10-07', concepto: 'Anticipo', monto: 573000, medio: 'Transferencia',
  nota: '', registradoPor: 'Daniela', cuando: '2026-10-07 13:10', comprobante: '', revisadoPor: 'Verónica Lagos', revisado: '2026-10-07 18:00' });
COBROS.push({ id: 'COB-mhbb4-i9j0', presupuesto: contreras, fecha: '2026-11-04', concepto: 'Saldo', monto: 1335000, medio: 'Transferencia',
  nota: '', registradoPor: 'Daniela', cuando: '2026-11-04 10:15', comprobante: '', revisadoPor: '', revisado: '' });

// Inmobiliaria Cordillera (Daniela): borrador para el 12 de diciembre.
const cordillera = cotizacion(Date.parse('2026-11-10T12:20:51.704Z'), {
  fecha: '2026-12-12', idCliente: 'C-0005', estado: 'Borrador', validoHasta: '2026-11-25', creadoPor: 'Daniela',
  creado: '2026-11-10 09:20', invitados: 30, tipoEvento: 'Empresa', anticipo: 30,
  // Prometida para ayer: sale atrasada en la agenda de Daniela.
  redactarAntes: '2026-11-12'
});
linea(cordillera, 'Lo Pirque', 30, 55000, 30);

// Felipe Ortúzar (Jorge): candidato, todavía sin cotizar.
cotizacion(Date.parse('2026-11-11T20:40:18.593Z'), {
  fecha: '2026-12-19', idCliente: 'C-0006', estado: 'Candidato', validoHasta: '', creadoPor: 'Jorge',
  creado: '2026-11-11 17:40', invitados: 35, tipoEvento: 'Matrimonio', anticipo: null,
  // Le prometió la cotización para hoy: sale en la agenda de Jorge.
  redactarAntes: '2026-11-13'
});

// Gonzalo Contreras (Daniela, 2026-11-25): vino del CRM antiguo, con su
// historia en Notas internas y el evento en enero (sale con *Lo que viene*,
// no en el mes en curso). Quedó en llamarlo el miércoles 11: atrasado.
const gonzaloCrm = cotizacion(Date.parse('2026-11-10T22:07:00.000Z'), {
  fecha: '2027-01-16', idCliente: 'C-0004', estado: 'Candidato', validoHasta: '', creadoPor: 'Daniela',
  creado: '2026-11-10 19:07', invitados: 25, tipoEvento: 'Cumpleaños', anticipo: null,
  notas: 'Del CRM (10-11-2026): etapa Contactado · llegó por Marketing/Redes · próximo seguimiento el 12-11-2026 · monto cotizado $520.000. (CRM-0004-a)',
  recontactar: '2026-11-11'
});

// **Las notas del vendedor** (2026-11-23): dos conversaciones de Jorge con Andrés Pino.
H['Notas'] = [not.ENCABEZADO_NOTAS,
  not.filaNota(not.ENCABEZADO_NOTAS, { id: 'N-MHR1A2', presupuesto: andres, cliente: 'C-0001', cuando: '2026-11-09 12:40',
    quien: 'Jorge', medio: 'WhatsApp', nota: 'Le mandé la cotización. La revisa con su gerente esta semana.' }),
  not.filaNota(not.ENCABEZADO_NOTAS, { id: 'N-MHV7K9', presupuesto: andres, cliente: 'C-0001', cuando: '2026-11-12 10:15',
    quien: 'Jorge', medio: 'Llamada', nota: 'Dice que el lunes confirma cuántos niños van. Lo llamo el lunes en la mañana.' }),
  // Una de su cumpleaños anterior, en la otra cotización: la ficha del
  // cliente filtra las notas por cotización (2026-11-25).
  not.filaNota(not.ENCABEZADO_NOTAS, { id: 'N-MGF1B2', presupuesto: contreras, cliente: 'C-0004', cuando: '2026-10-06 18:30',
    quien: 'Daniela', medio: 'Llamada', nota: 'Confirmó 42 personas. Pide la torta para las 17:00.' }),
  // Dos del mismo minuto (2026-11-25): arriba tiene que salir la de después.
  not.filaNota(not.ENCABEZADO_NOTAS, { id: 'N-MHX1A1', presupuesto: gonzaloCrm, cliente: 'C-0004', cuando: '2026-11-12 16:20',
    quien: 'Daniela', medio: 'WhatsApp', nota: 'Le escribí: está comparando con otro lugar.' }),
  not.filaNota(not.ENCABEZADO_NOTAS, { id: 'N-MHX1A2', presupuesto: gonzaloCrm, cliente: 'C-0004', cuando: '2026-11-12 16:20',
    quien: 'Daniela', medio: 'WhatsApp', nota: 'Me respondió: quiere ver el menú de niños antes de decidir.' })];

const encP = pre.ENCABEZADO_PRESUPUESTOS;
H['Presupuestos'] = [encP, ...PRES.map((p) => pre.filaPresupuesto(encP, p))];
const encL = pre.ENCABEZADO_LINEAS;
H['Presupuesto Líneas'] = [encL, ...LINEAS.map((l) => pre.filaLinea(encL, l))];
const encCob = cob.ENCABEZADO_COBROS;
H['Cobros'] = [encCob, ...COBROS.map((c) => cob.filaCobro(encCob, c))];

/* ---------- Reservas ---------- */
const RES = [];
let shop = 6512345678901;
const reserva = (r) => RES.push({
  id: '', fecha: '', nombre: '', email: '', telefono: '', menu: '', personas: 0, monto: '', tipoPago: '', estadoPago: 'pending',
  creada: '', asistencia: '', notaPago: '', llegaron: '', avisoRecepcion: '', abonado: '', eventoCRM: '', anotadaPor: '',
  liberada: '', personasReales: '', menuReal: '', descuento: '', rectificacion: '', aprobacion: '', liberacion: '', ...r
});
const deShopify = (r) => reserva({ id: String(shop++), ...r });
let manual = 1762000000100;
const aMano = (r) => reserva({ id: 'MANUAL-' + (manual += 137), ...r });

// Sábado 31 de octubre y domingo 1 de noviembre (pasados, con asistencia).
deShopify({ fecha: '2026-10-31', nombre: 'Claudia Bustos', email: 'claudia.bustos@ejemplo.cl', telefono: '+56 9 9111 2201', menu: '4 × Tradiciones',
  personas: 4, monto: 176000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-10-25 20:14', asistencia: 'Sí', llegaron: 4 });
deShopify({ fecha: '2026-10-31', nombre: 'Héctor Salazar', email: 'hsalazar@ejemplo.cl', telefono: '+56 9 9111 2202', menu: '2 × A Brasas abiertas',
  personas: 2, monto: 140000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-10-27 09:40', asistencia: 'Sí', llegaron: 2 });
deShopify({ fecha: '2026-11-01', nombre: 'Familia Ibáñez', email: 'ibanez@ejemplo.cl', telefono: '+56 9 9111 2203', menu: '3 × Tradiciones + 2 × Niños',
  personas: 5, monto: 170000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-10-28 18:22', asistencia: 'Sí', llegaron: 5 });

// Sábado 7 y domingo 8.
deShopify({ fecha: '2026-11-07', nombre: 'Mónica Lillo', email: 'mlillo@ejemplo.cl', telefono: '+56 9 9111 2204', menu: '6 × Tradiciones',
  personas: 6, monto: 264000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-02 12:05', asistencia: 'Sí', llegaron: 6 });
// **Cobrada en la mesa** (2026-11-23, `cobroLocal.ts`): pagó todo en efectivo,
// y pagos ya lo revisó. Su efectivo es el cobro de la caja chica.
{
  const r = { id: '6512345670207', fecha: '2026-11-07', nombre: 'Ricardo Godoy', email: 'rgodoy@ejemplo.cl', telefono: '+56 9 9111 2205',
    menu: '2 × Tradiciones + 1 × Niños', personas: 3, monto: 122000, tipoPago: 'Solo reserva', estadoPago: 'paid', creada: '2026-11-03 21:30',
    asistencia: 'Sí', llegaron: 3, notaPago: '', abonado: null, valorFinal: 131000, mesaCerrada: '2026-11-07 17:25 · Tomás Herrera',
    cobroLocal: 'Efectivo 131000', cobroCerrado: '2026-11-07 17:30 · Tomás Herrera · antes pending/', pagoAnotado: '2026-11-07 17:30 · Tomás Herrera' };
  deShopify({ ...r, pagoRevisado: pla.marcaPlata('2026-11-08 10:00', 'Verónica Lagos', pla.firmaPago(r)) });
}
aMano({ fecha: '2026-11-07', nombre: 'Familia Toro', telefono: '+56 9 9111 2206', menu: '8 × Tradiciones + 3 × Niños',
  personas: 11, monto: 464000, estadoPago: 'paid', creada: '2026-11-04 10:12', asistencia: 'Sí', llegaron: 11, anotadaPor: 'Tomás Herrera',
  notaPago: 'Pagó por transferencia' });
deShopify({ fecha: '2026-11-07', nombre: 'Andrea Poblete', email: 'apoblete@ejemplo.cl', telefono: '+56 9 9111 2207', menu: '2 × A Brasas abiertas',
  personas: 2, monto: 150000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-05 08:44', asistencia: 'No' });
deShopify({ fecha: '2026-11-08', nombre: 'Sebastián Vial', email: 'svial@ejemplo.cl', telefono: '+56 9 9111 2208', menu: '4 × Tradiciones + 2 × Niños',
  personas: 6, monto: 214000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-04 19:02', asistencia: 'Sí', llegaron: 6 });
deShopify({ fecha: '2026-11-08', nombre: 'Lorena Gálvez', email: 'lgalvez@ejemplo.cl', telefono: '+56 9 9111 2209', menu: '5 × Tradiciones',
  personas: 5, monto: 220000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-06 14:50', asistencia: 'Sí', llegaron: 5 });

// Miércoles 11: el cumpleaños privado (de la cotización de Daniela).
reserva({ id: 'MANUAL-1760100000003', fecha: '2026-11-11', nombre: 'Gonzalo Contreras', email: 'gonzalo.contreras@ejemplo.cl',
  telefono: '+56 9 5456 7890', menu: '36 × Tradiciones + 6 × Niños', personas: 42, monto: 1908000, estadoPago: 'paid',
  creada: '2026-10-08 12:00', notaPago: `De la cotización N° ${pre.folioDe({ id: contreras })}`, anotadaPor: 'Daniela', asistencia: 'Sí', llegaron: 42 });

// Jueves 12: la página del día (enc-dia / ope-dia).
deShopify({ fecha: '2026-11-12', nombre: 'Familia Soto', email: 'familia.soto@ejemplo.cl', telefono: '+56 9 6123 4501', menu: '4 × Tradiciones + 2 × Niños',
  personas: 6, monto: 214000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-08 21:10', asistencia: 'Sí', llegaron: 6 });
deShopify({ fecha: '2026-11-12', nombre: 'Pedro Navarro', email: 'pnavarro@ejemplo.cl', telefono: '+56 9 6123 4502', menu: '2 × Tradiciones',
  personas: 2, monto: 88000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-09 10:33', asistencia: 'Sí', llegaron: 2 });
aMano({ fecha: '2026-11-12', nombre: 'Laura Méndez', telefono: '+56 9 6123 4503', menu: '4 × Lo Pirque',
  personas: 4, monto: 220000, estadoPago: 'pending', creada: '2026-11-10 16:20', anotadaPor: 'Tomás Herrera', asistencia: 'Sí', llegaron: 4,
  notaPago: 'Llamó por teléfono' });
deShopify({ fecha: '2026-11-12', nombre: 'Rodrigo Silva', email: 'rsilva@ejemplo.cl', telefono: '+56 9 6123 4504', menu: '3 × Tradiciones',
  personas: 3, monto: 147000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-11 08:15' });

// Viernes 13 (hoy): la recepción.
aMano({ fecha: '2026-11-13', nombre: 'Camila Rojas', telefono: '+56 9 7345 1101', menu: '4 × Tradiciones',
  personas: 4, monto: 196000, estadoPago: 'pending', creada: '2026-11-11 19:05', anotadaPor: 'Tomás Herrera', notaPago: 'Escribió por WhatsApp' });
deShopify({ fecha: '2026-11-13', nombre: 'Familia Muñoz', email: 'fmunoz@ejemplo.cl', telefono: '+56 9 7345 1102', menu: '3 × Tradiciones + 2 × Niños',
  personas: 5, monto: 170000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-09 22:41' });
aMano({ fecha: '2026-11-13', nombre: 'Grupo Sofía Paredes', telefono: '+56 9 7345 1103', menu: '8 × Tradiciones',
  personas: 8, monto: 392000, estadoPago: 'partially_paid', abonado: 150000, creada: '2026-11-06 11:30', anotadaPor: 'Marcela Díaz',
  notaPago: 'Abonó por transferencia' });
deShopify({ fecha: '2026-11-13', nombre: 'Ignacio Fernández', email: 'ifernandez@ejemplo.cl', telefono: '+56 9 7345 1104', menu: '2 × A Brasas abiertas',
  personas: 2, monto: 150000, tipoPago: 'Solo reserva', estadoPago: 'pending', creada: '2026-11-12 13:12' });
deShopify({ fecha: '2026-11-13', nombre: 'Valentina Castro', email: 'vcastro@ejemplo.cl', telefono: '+56 9 7345 1105', menu: '6 × Tradiciones',
  personas: 6, monto: 264000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-07 17:25', asistencia: 'Sí', llegaron: 6 });
// Con su valor final: le faltan $18.000 por cobrar en la mesa (2026-11-23).
// No es Valentina Castro: la foto de la misión de la anfitriona la muestra sin valor final.
deShopify({ fecha: '2026-11-13', nombre: 'Martín Araya', email: 'maraya@ejemplo.cl', telefono: '+56 9 7345 1106', menu: '2 × Tradiciones + 1 × Pequeños',
  personas: 3, monto: 94000, tipoPago: 'Pago directo', estadoPago: 'paid', creada: '2026-11-10 09:58', asistencia: 'Sí', llegaron: 3,
  valorFinal: 112000, mesaCerrada: '2026-11-13 14:15 · Tomás Herrera' });

// Sábado 14 y domingo 15 (lo que viene).
const futuro = [
  ['2026-11-14', 'Carolina Espinoza', '6 × Tradiciones', 6, 264000, 'paid'],
  ['2026-11-14', 'Familia Riquelme', '5 × Tradiciones + 3 × Niños', 8, 277000, 'paid'],
  ['2026-11-14', 'Joaquín Valdés', '2 × A Brasas abiertas', 2, 140000, 'paid'],
  ['2026-11-14', 'Daniela Olivares', '4 × Tradiciones', 4, 196000, 'pending'],
  ['2026-11-14', 'Familia Sepúlveda', '6 × Tradiciones + 4 × Niños + 1 × Pequeños', 11, 366000, 'paid'],
  ['2026-11-14', 'Esteban Carrasco', '3 × Tradiciones', 3, 147000, 'pending'],
  ['2026-11-15', 'Francisca Leiva', '10 × Tradiciones', 10, 440000, 'paid'],
  ['2026-11-15', 'Familia Gutiérrez', '4 × Tradiciones + 2 × Niños', 6, 214000, 'paid'],
  ['2026-11-15', 'Raúl Pizarro', '2 × Tradiciones', 2, 98000, 'pending'],
  ['2026-11-15', 'Grupo Amigas del Coro', '12 × Tradiciones', 12, 528000, 'paid'],
  ['2026-11-21', 'Teresa Molina', '4 × Tradiciones', 4, 176000, 'paid'],
  ['2026-11-22', 'Familia Aravena', '5 × Tradiciones + 2 × Niños', 7, 258000, 'paid'],
  ['2026-11-22', 'Pablo Quiroz', '2 × A Brasas abiertas', 2, 150000, 'pending']
];
for (const [fecha, nombre, menu, personas, monto, estadoPago] of futuro) {
  deShopify({ fecha, nombre, email: nombre.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, 14) + '@ejemplo.cl',
    telefono: '+56 9 8' + String(100 + RES.length).padStart(3, '0') + ' ' + String(4400 + RES.length * 7).slice(-4),
    menu, personas, monto, tipoPago: estadoPago === 'paid' ? 'Pago directo' : 'Solo reserva', estadoPago, creada: '2026-11-1' + (RES.length % 3) + ' 1' + (RES.length % 9) + ':2' + (RES.length % 6) });
}
// **Una que se cayó y un pedido repetido** (2026-11-25): para ver *Se cayeron*
// y *🧹 Limpiar la fila de más* el domingo 22. Ninguna cambia lo que cuenta el día.
deShopify({ fecha: '2026-11-22', nombre: 'Ismael Barros', email: 'ibarros@ejemplo.cl', telefono: '+56 9 8120 4521',
  menu: '2 × Tradiciones + 2 × Niños + 1 × Pequeños', personas: 5, monto: 155000, tipoPago: 'Solo reserva', estadoPago: 'pending',
  creada: '2026-11-12 16:13', cayo: '2026-11-13 10:31 · Tomás Herrera · El cliente avisó que no viene' });
RES.push({ ...RES.find((r) => r.nombre === 'Familia Aravena') });
// Las reservas de las cotizaciones ganadas.
reserva({ id: 'MANUAL-1761670000001', fecha: '2026-11-21', nombre: 'Patricia Vidal', email: 'patricia.vidal@ejemplo.cl',
  telefono: '+56 9 7234 5678', menu: '48 × Tradiciones + 12 × Niños', personas: 60, monto: 2640000, estadoPago: 'paid',
  creada: '2026-10-26 18:05', notaPago: `De la cotización N° ${pre.folioDe({ id: santaInes })}`, anotadaPor: 'Jorge' });
reserva({ id: 'MANUAL-1762200000002', fecha: '2026-12-05', nombre: 'Rocío Fuenzalida', email: 'rocio@ejemplo.cl',
  telefono: '+56 9 6345 6789', menu: '45 × A Brasas abiertas', personas: 45, monto: 3375000, estadoPago: 'partially_paid', abonado: 1012500,
  creada: '2026-11-03 12:00', notaPago: `De la cotización N° ${pre.folioDe({ id: peumo })}`, anotadaPor: 'Jorge' });

/* ---------- La caja chica (2026-11-23) ---------- */
// Parte con $7.000 (lo dijo el cliente). Todo revisado: la bandeja de ejemplo no cambia.
H['Caja chica'] = [caj.ENCABEZADO_CAJA, ...[
  { id: 'K-EJ1', fecha: '2026-11-07', cuando: '2026-11-07 12:00', tipo: 'Saldo inicial', monto: 7000, detalle: 'Con lo que partió la caja', quien: 'Tomás Herrera', revisado: '2026-11-08 10:00 · Verónica Lagos' },
  { id: 'K-EJ2', fecha: '2026-11-07', cuando: '2026-11-07 17:30', tipo: 'Cobro', monto: 131000, detalle: 'Mesa de Ricardo Godoy', quien: 'Tomás Herrera', reserva: '6512345670207' },
  { id: 'K-EJ3', fecha: '2026-11-07', cuando: '2026-11-07 18:05', tipo: 'Gasto', monto: 4500, detalle: 'Hielo', quien: 'Tomás Herrera', comprobante: 'ejemplo-boleta', revisado: '2026-11-08 10:00 · Verónica Lagos' },
  { id: 'K-EJ4', fecha: '2026-11-08', cuando: '2026-11-08 19:00', tipo: 'Entrega', monto: 130000, detalle: '', quien: 'Tomás Herrera', para: 'Marcela Díaz', recibido: '2026-11-09 09:40 · Marcela Díaz · 130000', revisado: '2026-11-10 11:00 · Verónica Lagos' },
  { id: 'K-EJ5', fecha: '2026-11-10', cuando: '2026-11-10 10:30', tipo: 'Depósito', monto: 130000, detalle: 'Cuenta corriente', quien: 'Marcela Díaz', comprobante: 'ejemplo-deposito', revisado: '2026-11-10 11:00 · Verónica Lagos' }
].map((m) => caj.filaCaja(caj.ENCABEZADO_CAJA, { para: '', recibido: '', comprobante: '', reserva: '', revisado: '', ...m }))];

const encR = Object.values(col.COL_RESERVAS);
H['Reservas'] = [encR, ...RES.map((r) => fil.filaReserva(encR, r).map((c) => (c == null ? '' : String(c))))];

/* ---------- Equipo ---------- */
H['Puestos'] = eq.aFilasPuestos([
  { nombre: 'Garzón', cadaCuantas: 15 }, { nombre: 'Cocina', cadaCuantas: 25 },
  { nombre: 'Parrilla', cadaCuantas: 40 }, { nombre: 'Barra', cadaCuantas: 50 }
]);
const GENTE = [
  ['Luis Contreras', '+56 9 4011 2201', 'Parrilla', 45000, 6000, true, banco('Luis Contreras', '15.234.567-8', 'BancoEstado', 'Cuenta RUT')],
  ['Rosa Espinoza', '+56 9 4011 2202', 'Cocina', 40000, 5000, true, banco('Rosa Espinoza', '16.345.678-9', 'BancoEstado', 'Cuenta RUT')],
  ['Matías Pérez', '+56 9 4011 2203', 'Garzón', 35000, 5000, true, banco('Matías Pérez', '19.456.789-0', 'Banco de Chile', 'Cuenta vista', '00123456789')],
  ['Javiera Tapia', '+56 9 4011 2204', 'Garzón', 35000, 5000, true, banco('Javiera Tapia', '20.567.890-1', 'BancoEstado', 'Cuenta RUT')],
  ['Diego Morales', '+56 9 4011 2205', 'Garzón', 35000, 5000, true, banco('Diego Morales', '18.678.901-2', 'Banco Santander', 'Cuenta corriente', '0071234567')],
  ['Catalina Vergara', '+56 9 4011 2206', 'Barra', 38000, 5000, true, banco('Catalina Vergara', '17.789.012-3', 'BancoEstado', 'Cuenta RUT')],
  ['Felipe Cortés', '+56 9 4011 2207', 'Cocina', 40000, 5000, true, banco('Felipe Cortés', '16.890.123-4', 'BancoEstado', 'Cuenta RUT')],
  ['Antonia Reyes', '+56 9 4011 2208', 'Garzón', 35000, 5000, true, banco('Antonia Reyes', '21.901.234-5', 'BancoEstado', 'Cuenta RUT')]
];
const TRAB = GENTE.map(([nombre, telefono, puesto, pagoJornada, valorHora, propina, b]) =>
  ({ nombre, telefono, puesto, activo: true, pagoJornada, valorHora, modalidad: 'Por turno', propina, banco: b, token: token() }));
TRAB.push({ nombre: 'Hernán Bravo', telefono: '+56 9 4011 2209', puesto: 'Parrilla', activo: true, pagoJornada: 0, valorHora: 0,
  modalidad: 'Contratado', propina: true, banco: banco('Hernán Bravo', '12.345.678-5', 'Banco BCI', 'Cuenta corriente', '11223344'), token: token() });
H['Trabajadores'] = eq.aFilasTrabajadores(TRAB);
const t = (nombre) => TRAB.find((x) => x.nombre === nombre);

const TURNOS = [];
const turno = (fecha, nombre, asistencia = '', propina = 0, extra = {}) => {
  const w = t(nombre);
  TURNOS.push({ fecha, trabajador: nombre, puesto: w.puesto, asistencia, modalidad: w.modalidad,
    pagoJornada: w.pagoJornada, horasExtra: 0, valorHora: w.valorHora, ajustes: [], propina, ...extra });
};
for (const f of ['2026-10-31', '2026-11-01']) {
  for (const n of ['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Javiera Tapia', 'Catalina Vergara']) turno(f, n, 'Sí', 14000);
}
// Sábado 7: cerrado por el encargado de turno.
for (const n of ['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Javiera Tapia', 'Diego Morales', 'Catalina Vergara']) turno('2026-11-07', n, 'Sí', 16500);
turno('2026-11-07', 'Felipe Cortés', 'No', 0);
turno('2026-11-07', 'Hernán Bravo', 'Sí', 16500);
TURNOS.find((x) => x.fecha === '2026-11-07' && x.trabajador === 'Luis Contreras').horasExtra = 2;
// Domingo 8: falta marcar a dos.
for (const n of ['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Antonia Reyes']) turno('2026-11-08', n, 'Sí', 12000);
turno('2026-11-08', 'Diego Morales');
turno('2026-11-08', 'Catalina Vergara');
// Miércoles 11 (el cumpleaños) y jueves 12: sin cerrar todavía.
// (42 personas: 3 garzones, 2 en cocina, 2 en parrilla y 1 en la barra.)
for (const n of ['Matías Pérez', 'Javiera Tapia', 'Antonia Reyes', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Hernán Bravo', 'Catalina Vergara']) turno('2026-11-11', n);
for (const n of ['Antonia Reyes', 'Felipe Cortés', 'Luis Contreras', 'Catalina Vergara']) turno('2026-11-12', n);
// Hoy y el fin de semana: planificados.
for (const n of ['Matías Pérez', 'Diego Morales', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Catalina Vergara']) turno('2026-11-13', n);
for (const n of ['Matías Pérez', 'Javiera Tapia', 'Diego Morales', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Hernán Bravo', 'Catalina Vergara']) turno('2026-11-14', n);
for (const n of ['Matías Pérez', 'Javiera Tapia', 'Antonia Reyes', 'Rosa Espinoza', 'Felipe Cortés', 'Luis Contreras', 'Catalina Vergara']) turno('2026-11-15', n);
// **Un turno suelto** (2026-11-24): octubre, con el nombre mal escrito, como
// si la ficha se hubiera corregido en la planilla. Para medir el aviso de
// Equipo y la ventana *Es…* (`ReengancharSuelto`). En octubre no sale en las
// fotos de la ayuda, que miran noviembre.
TURNOS.push({ fecha: '2026-10-24', trabajador: 'Matias Peres', puesto: 'Garzón', asistencia: 'Sí', modalidad: 'Por turno',
  pagoJornada: 35000, horasExtra: 0, valorHora: 5000, ajustes: [], propina: 0 });
const encT = eq.ENCABEZADO_TURNOS;
H['Turnos'] = [encT, ...TURNOS.map((x) => eq.filaTurno(encT, x))];

H['Cierres'] = [cie.ENCABEZADO_CIERRES,
  ['2026-10-31', 'Tomás Herrera', '2026-10-31 19:15'],
  ['2026-11-01', 'Tomás Herrera', '2026-11-01 19:02'],
  ['2026-11-07', 'Tomás Herrera', '2026-11-07 19:42']];

/* ---------- Extras ---------- */
H['Colaboradores'] = ext.aFilasColaboradores([
  { nombre: 'Carlos Paredes', actividad: 'Show ecuestre', telefono: '+56 9 3022 1101', activo: true, monto: 250000,
    banco: banco('Carlos Paredes', '11.222.333-4', 'BancoEstado', 'Cuenta corriente', '22334455'), token: token() },
  { nombre: 'Paz Ortiz', actividad: 'Pintacaritas', telefono: '+56 9 3022 1102', activo: true, monto: 60000,
    banco: banco('Paz Ortiz', '18.333.444-5', 'BancoEstado', 'Cuenta RUT'), token: token() }
]);
const encA = ext.ENCABEZADO_ACTIVIDADES;
H['Actividades'] = [encA,
  ext.filaExtra(encA, { fecha: '2026-11-07', colaborador: 'Carlos Paredes', actividad: 'Show ecuestre', estado: 'Sí', monto: 250000, ajuste: 0, motivo: '' }),
  ext.filaExtra(encA, { fecha: '2026-11-07', colaborador: 'Paz Ortiz', actividad: 'Pintacaritas', estado: 'Sí', monto: 60000, ajuste: 0, motivo: '' }),
  ext.filaExtra(encA, { fecha: '2026-11-14', colaborador: 'Carlos Paredes', actividad: 'Show ecuestre', estado: '', monto: 250000, ajuste: 0, motivo: '' })
];

/* ---------- Pagos al equipo ---------- */
const encPag = rem.ENCABEZADO_PAGOS;
const PAGOS = [
  // La semana del 26 de octubre, pagada entera.
  ...['Luis Contreras', 'Rosa Espinoza', 'Matías Pérez', 'Javiera Tapia', 'Catalina Vergara'].flatMap((n, k) => [
    { id: 'PAGO-MH9A' + k + 'S', fecha: '2026-11-02', quien: n, desde: '2026-10-26', hasta: '2026-11-01', monto: t(n).pagoJornada, nota: 'Transferencia masiva', registradoPor: 'Verónica Lagos', concepto: 'Sueldo' },
    { id: 'PAGO-MH9A' + k + 'P', fecha: '2026-11-02', quien: n, desde: '2026-10-26', hasta: '2026-11-01', monto: 14000, nota: 'Transferencia masiva', registradoPor: 'Verónica Lagos', concepto: 'Propina' }
  ]),
  // La semana pasada: a dos ya se les pagó el sueldo.
  { id: 'PAGO-MHT1C1', fecha: '2026-11-10', quien: 'Javiera Tapia', desde: '2026-11-02', hasta: '2026-11-08', monto: 35000, nota: '', registradoPor: 'Verónica Lagos', concepto: 'Sueldo' },
  { id: 'PAGO-MHT1C2', fecha: '2026-11-10', quien: 'Javiera Tapia', desde: '2026-11-02', hasta: '2026-11-08', monto: 16500, nota: '', registradoPor: 'Verónica Lagos', concepto: 'Propina' },
  // La comisión: un anticipo a Jorge.
  { id: 'PAGO-MHU2V1', fecha: '2026-11-10', quien: 'Jorge', desde: '2026-11-01', hasta: '2026-11-30', monto: 200000, nota: 'Anticipo de comisión', registradoPor: 'Verónica Lagos', concepto: 'Comisión' },
  { id: 'PAGO-MHU2V2', fecha: '2026-11-10', quien: 'Daniela', desde: '2026-11-01', hasta: '2026-11-30', monto: 150000, nota: 'Anticipo de comisión', registradoPor: 'Verónica Lagos', concepto: 'Comisión' }
];
H['Pagos'] = [encPag, ...PAGOS.map((p) => rem.filaPago(p, encPag))];
H['Boletas'] = [rem.ENCABEZADO_BOLETAS];

/* ---------- Vendedores ---------- */
const encV = ven.ENCABEZADO_VENDEDORES;
H['Vendedores'] = [encV,
  ven.filaVendedor({ ...ven.fichaVacia('jorge', 'Jorge'), sueldoFijo: 450000, comisionPct: 3, etapa2Pct: 4, etapa3Pct: 5, bonoPuntos: 1,
    banco: banco('Jorge Salinas', '17.654.321-0', 'Banco de Chile', 'Cuenta corriente', '00987654321', 'jorge@ejemplo.cl') }, encV),
  ven.filaVendedor({ ...ven.fichaVacia('daniela', 'Daniela'), sueldoFijo: 450000, comisionPct: 3, etapa2Pct: 4, etapa3Pct: 5,
    banco: banco('Daniela Ruiz', '18.765.432-1', 'BancoEstado', 'Cuenta RUT') }, encV),
  ven.filaVendedor({ ...ven.fichaSocio('S-0001', 'Turismo Valle del Maipo'), token: token() }, encV)
];

/* ---------- Bitácora ---------- */
const F = (id) => pre.folioDe({ id });
H['Bitácora'] = [bit.ENCABEZADO_BITACORA,
  ['2026-11-02 11:20', 'Jorge', 'vendedor', 'Anotó un cobro', `${F(peumo)} · Anticipo · $1.012.500`],
  ['2026-11-02 18:05', 'Verónica Lagos', 'pagos', 'Registró pagos en bloque', 'Sueldo · 5 personas · 2026-10-26 a 2026-11-01'],
  ['2026-11-04 10:12', 'Tomás Herrera', 'encargado', 'Anotó una reserva', 'Familia Toro · 2026-11-07 · 11 personas · 8 × Tradiciones + 3 × Niños'],
  ['2026-11-06 12:05', 'Jorge', 'vendedor', 'Anotó un cobro', `${F(santaInes)} · Saldo · $1.848.000`],
  ['2026-11-07 19:42', 'Tomás Herrera', 'encargado', 'Cerró un día', '2026-11-07'],
  ['2026-11-09 12:20', 'Jorge', 'vendedor', 'Creó una cotización', `${F(andres)} · Andrés Pino · 2026-11-28`],
  ['2026-11-09 12:31', 'Jorge', 'vendedor', 'Editó una cotización', `${F(andres)} · Enviada`],
  ['2026-11-10 09:20', 'Daniela', 'vendedor', 'Creó una cotización', `${F(cordillera)} · Marisol Cáceres · 2026-12-12`],
  ['2026-11-10 10:05', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Javiera Tapia · Sueldo · $35.000 · 2026-11-02 a 2026-11-08'],
  ['2026-11-10 10:06', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Javiera Tapia · Propina · $16.500 · 2026-11-02 a 2026-11-08'],
  ['2026-11-10 10:09', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Jorge · Comisión · $200.000 · 2026-11-01 a 2026-11-30'],
  ['2026-11-10 10:11', 'Verónica Lagos', 'pagos', 'Registró un pago', 'Daniela · Comisión · $150.000 · 2026-11-01 a 2026-11-30'],
  ['2026-11-10 16:20', 'Tomás Herrera', 'encargado', 'Anotó una reserva', 'Laura Méndez · 2026-11-12 · 4 personas · 4 × Lo Pirque'],
  ['2026-11-11 17:40', 'Jorge', 'vendedor', 'Anotó un candidato', `${F(PRES[PRES.length - 1].id)} · Felipe Ortúzar · 2026-12-19`],
  ['2026-11-11 19:05', 'Tomás Herrera', 'encargado', 'Anotó una reserva', 'Camila Rojas · 2026-11-13 · 4 personas · 4 × Tradiciones'],
  ['2026-11-12 09:30', 'Paula Fuentes', 'admin', 'Cambió la configuración', 'cupoNormal'],
  ['2026-11-12 18:10', 'Marcela Díaz', 'gerente', 'Planificó el equipo', '2026-11-14 · 8 personas · Matías Pérez (Garzón), Javiera Tapia (Garzón), Diego Morales (Garzón), Rosa Espinoza (Cocina), Felipe Cortés (Cocina), Luis Contreras (Parrilla), Hernán Bravo (Parrilla), Catalina Vergara (Barra)'],
  ['2026-11-13 13:20', 'Fernanda Muñoz', 'anfitrion', 'Editó una reserva', `fila ${RES.findIndex((r) => r.nombre === 'Valentina Castro') + 2} · asistencia, llegaron`],
  ['2026-11-13 13:41', 'Fernanda Muñoz', 'anfitrion', 'Editó una reserva', `fila ${RES.findIndex((r) => r.nombre === 'Martín Araya') + 2} · asistencia, llegaron`]
];

// **Los comentarios del equipo** (2026-11-26): pasaron a la planilla del
// panel. Uno nuevo, uno en curso pasado a tarea y uno contestado sin ver.
const comentario = (c) => cmt.filaDeComentario(cmt.ENCABEZADO_COMENTARIOS, { prioridad: '', respuesta: '', resuelto: '',
  respondidoPor: '', vista: '', tarea: '', para: '', estado: 'Nuevo', ...c });
H['Comentarios'] = [cmt.ENCABEZADO_COMENTARIOS,
  comentario({ id: 'C-EJ1', fecha: '2026-11-12 19:40', rol: 'Vendedor', nombre: 'Jorge', tipo: '🧩 Me falta', donde: 'Cotizaciones',
    texto: 'No veo cuánto le queda por pagar al cliente sin abrir la cotización.', para: 'Para llamarlo con el número a mano.' }),
  comentario({ id: 'C-EJ2', fecha: '2026-11-11 15:05', rol: 'Encargado de turno', nombre: 'Tomás Herrera', tipo: '🐞 Algo falla',
    donde: 'Recepción', texto: 'Al marcar Llegó en el teléfono a veces no cambia de color.', estado: 'En curso', prioridad: 'Alta',
    tarea: 'T-EJ5' }),
  comentario({ id: 'C-EJ3', fecha: '2026-11-09 12:30', rol: 'Vendedor', nombre: 'Jorge', tipo: '🤔 No se entiende', donde: 'Vendedores',
    texto: '¿Qué significa comisión garantizada?', estado: 'Resuelto', respuesta: 'Es la de las cotizaciones que el cliente ya pagó y pagos revisó.',
    respondidoPor: 'Paula Fuentes', resuelto: '2026-11-10' })
];

/* ---------- Las pestañas de importar (2026-11-21) ----------
 * Lo que se sube para importar del CRM viejo y del sitio viejo, con gente
 * inventada. Tienen de todo lo que la vista previa tiene que decir: una
 * ficha que ya estaba, un vendedor sin cuenta, una fila sin contacto, un
 * producto que no está en el catálogo, una ganada que deja el día sobre su
 * cupo y reservas pagadas y por pagar. */
H['Importar clientes'] = [
  ['Ref', 'Nombre', 'Teléfono', 'Correo', 'Empresa del cliente', 'Vendedor', 'Notas', 'Etapa (CRM)'],
  ['CRM-0001', 'Ignacio Salas', '+56 9 2111 0001', 'ignacio.salas@ejemplo.cl', 'Constructora Maipo', 'Jorge', 'Del CRM: corporativo, fin de año.', 'Contactado'],
  ['CRM-0002', 'Carolina Vera', '+56 9 2111 0002', 'carolina.vera@ejemplo.cl', '', 'Daniela', 'Del CRM: matrimonio en verano.', 'Nuevo'],
  ['CRM-0003', 'Andrés Pino', '+56 9 8123 4567', 'andres.pino@ejemplo.cl', 'Empresa Andes SpA', 'Jorge', '', 'Cotizado'],
  ['CRM-0004', 'Teresa Lobos', '', 'teresa.lobos@ejemplo.cl', '', 'Ramiro', 'Del CRM: cumpleaños.', 'Contactado'],
  ['CRM-0005', 'Raúl Medina', '+56 9 2111 0005', 'raul.medina@ejemplo.cl', 'Viña El Litre', 'Jorge', 'Del CRM: ganado el 02-11.', 'Ganado'],
  ['CRM-0006', 'Sin contacto', '', '', '', 'Daniela', '', 'Perdido'],
  ['CRM-0007', 'Olga Paredes', '+56 9 2111 0007', '', '', 'Daniela', 'Del CRM: vino en octubre.', 'Ganado']
];
H['Importar cotizaciones'] = [
  ['Ref', 'Ref cliente', 'Estado', 'Fecha del evento', 'Periodo', 'Invitados', 'Tipo de evento', 'Vendedor', 'Notas', 'Productos'],
  ['CRM-0001-a', 'CRM-0001', 'Candidato', '2026-12-11', '', '60', 'Empresa', 'Jorge', 'Del CRM: pidió precios por WhatsApp.', ''],
  ['CRM-0002-a', 'CRM-0002', 'Candidato', '', 'entre el 01-01-2027 y el 31-01-2027', '40', 'Matrimonio', 'Daniela', 'Del CRM: todavía sin día.', ''],
  ['CRM-0003-a', 'CRM-0003', 'Borrador', '2026-12-17', '', '45', 'Empresa', 'Jorge', 'Cotizado en el CRM.', 'Lo Pirque | 45 | 50000 | + IVA\nTaller de quesos | 1 | 180000 | + IVA'],
  ['CRM-0004-a', 'CRM-0004', 'Candidato', '2027-02-06', '', '25', 'Otro', 'Ramiro', '', ''],
  ['CRM-0005-a', 'CRM-0005', 'Ganada', '2026-11-27', '', '50', 'Empresa', 'Jorge', 'Ganada en el CRM el 02-11.', 'Sommelier | 50 | 90000 | + IVA'],
  ['CRM-0005-b', 'CRM-0005', 'Ganada', '2026-11-22', '', '130', 'Empresa', 'Jorge', 'Ganada en el CRM el 09-11.', 'Brasas | 130 | 70000 | + IVA'],
  ['CRM-0001-b', 'CRM-0001', 'Borrador', '2026-10-01', '', '30', 'Empresa', 'Jorge', '', '']
];
H['Importar reservas'] = [
  ['Ref', 'Fecha', 'Nombre', 'Teléfono', 'Correo', 'Menú', 'Personas', 'Monto', 'Pago', 'Nota de pago', 'Comprado'],
  ['LP9001', '2026-11-28', 'Marta Sepúlveda', '+56 9 2222 0001', 'marta.sepulveda@ejemplo.cl', '8 × Tradiciones + 2 × Niños', '10', '390000', 'Pagada', 'Pedido LP9001 del sitio viejo · Mercado Pago', '2026-11-08'],
  ['LP9002', '2026-11-28', 'Hugo Leiva', '+56 9 2222 0002', 'hugo.leiva@ejemplo.cl', '6 × Tradiciones', '6', '264000', 'Por pagar', 'Pedido LP9002 del sitio viejo · paga en el local', '2026-11-12'],
  ['LP9003', '2026-12-04', 'Pilar Osorio', '+56 9 2222 0003', 'pilar.osorio@ejemplo.cl', '2 × Tradiciones', '2', '88000', 'Por pagar', 'Pedido LP9003 del sitio viejo · paga en el local', '2026-11-17'],
  ['LP9004', '2026-12-27', 'Nelson Araya', '+56 9 2222 0004', 'nelson.araya@ejemplo.cl', '9 × Tradiciones', '9', '396000', 'Por pagar', 'Pedido LP9004 del sitio viejo · paga en el local', '2026-11-18']
];

// **Las tareas internas** (2026-11-26): una de cada caso, con el reloj del ejemplo (vie 13-11-2026).
const tarea = (t) => tar.filaTarea(tar.ENCABEZADO_TAREAS, { enlace: '', conversacion: [], cerradaPor: '', cerrada: '',
  estado: 'Pendiente', plazo: '', ...t });
H['Tareas'] = [tar.ENCABEZADO_TAREAS,
  tarea({ id: 'T-EJ1', creada: '2026-11-10 09:12', de: 'Rodrigo Vera', para: 'Marcela Díaz', plazo: '2026-11-12',
    que: 'Revisar con el proveedor el carbón para el sábado 14: que llegue el viernes en la tarde.' }),
  tarea({ id: 'T-EJ2', creada: '2026-11-12 18:40', de: 'Paula Fuentes', para: 'Jorge', plazo: '2026-11-16',
    que: 'Llamar a Andrés Pino para confirmar cuántos niños van el 28.', enlace: 'dia:2026-11-28' }),
  tarea({ id: 'T-EJ3', creada: '2026-11-13 10:05', de: 'Marcela Díaz', para: 'rol:encargado', plazo: '2026-11-14',
    que: 'Limpiar y aceitar las parrillas antes de abrir el sábado.' }),
  tarea({ id: 'T-EJ4', creada: '2026-11-11 16:20', de: 'Paula Fuentes', para: 'Verónica Lagos', estado: 'Pregunta',
    que: 'Pagar la boleta del pintacaritas de octubre.',
    conversacion: [{ cuando: '2026-11-12 09:30', quien: 'Verónica Lagos', tipo: 'pregunta', texto: '¿La de octubre entera o solo la del 25?' }] }),
  tarea({ id: 'T-EJ5', creada: '2026-11-13 08:50', de: 'Jorge', para: 'Paula Fuentes', plazo: '2026-11-13',
    que: 'Subir el precio del karting en Productos: la otra empresa lo cobra a $25.000 desde diciembre.' }),
  tarea({ id: 'T-EJ6', creada: '2026-11-09 11:00', de: 'Paula Fuentes', para: 'Tomás Herrera', estado: 'Hecha',
    que: 'Contar las sillas del galpón.', cerradaPor: 'Tomás Herrera', cerrada: '2026-11-10 13:15',
    conversacion: [{ cuando: '2026-11-10 13:15', quien: 'Tomás Herrera', tipo: 'nota', texto: 'Son 140, y 6 para arreglar.' }] })
];

const orden = ['Reservas', 'Fechas Hábiles', 'Config', 'Menús', 'Presupuestos', 'Presupuesto Líneas', 'Clientes', 'Cobros',
  'Puestos', 'Trabajadores', 'Turnos', 'Cierres', 'Actividades', 'Colaboradores', 'Pagos', 'Boletas', 'Usuarios',
  'Bitácora', 'Vendedores', 'Comentarios', 'Importar clientes', 'Importar cotizaciones', 'Importar reservas', 'Notas', 'Caja chica', 'Promociones', 'Otras empresas', 'Tareas'];
const hojas = Object.fromEntries(orden.map((k) => [k, (H[k] ?? []).map((f) => f.map((c) => (c == null ? '' : String(c))))]));
fs.writeFileSync(SALIDA, JSON.stringify({ orden, hojas }, null, 1));
console.log('Planilla de ejemplo:', SALIDA, Object.entries(hojas).map(([k, v]) => `${k}:${v.length - 1}`).join(' '));
