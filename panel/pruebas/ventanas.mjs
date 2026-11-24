/**
 * **Las ventanas y las fichas del panel, medidas una por una** (2026-11-21).
 *
 *   npm run ventanas              # todas
 *   npm run ventanas -- v-cotizar # solo las que parten así
 *
 * Abre cada pantalla, cada ficha y cada ventana del panel de ejemplo en un
 * notebook —**1280×650**, lo que queda con la barra del navegador— y mira
 * dos reglas:
 *
 * - ***una tarjeta abierta cabe en una pantalla***: la ventana, o la ficha
 *   abierta, entra entera sin tener que bajar;
 * - ***los formularios van alineados***: `revisarAlineacion()` no encuentra
 *   saltos, nombres partidos ni bordes que casi calzan.
 *
 * **Por qué existe.** El cliente fue encontrando una por una las ventanas
 * que no cabían o que tenían los campos corridos, y preguntó con razón:
 * *"¿por qué tengo que agregar yo todas las revisiones en los pop-ups… si ya
 * debería ser regla? ¿Qué habrá que hacer para reforzar esto, para que
 * realmente siempre tengas presente esta regla?"*. Las dos reglas estaban
 * escritas, pero se aplicaban a lo que se iba tocando y **dependían de que
 * alguien se acordara**. En este panel las reglas que se cumplen siempre son
 * las que se miden (`letra-chica`, `lecturas`): ésta es la medida de esas
 * dos.
 *
 * **Lo que todavía no cabe está anotado en `NO_CABEN`**, con su alto: es el
 * punto de partida, igual que `HABIA` en `letra-chica`. **Solo puede bajar.**
 * Si una ventana anotada crece, o una que cabía deja de caber, o aparece un
 * campo corrido, falla. Si una anotada ya cabe, pide sacarla de la lista.
 *
 * **Una ventana nueva se agrega a `ESCENAS`** en el mismo PR que la crea. Si
 * no está en la lista no se mide, y es justo lo que esto viene a evitar.
 *
 * Necesita el panel de ejemplo andando: `npm run ventanas` lo levanta
 * (`pruebas/ejemplo/capturas.sh --ventanas`).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { revisarAlineacion, revisarTarjetasParejas, revisarLineaDeLaFecha, revisarEspacio } from './alineacion.mjs';
import { revisarPlayStation } from './playstation.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL_PANEL = process.env.AYUDA_URL ?? 'http://localhost:3125';
const SESIONES = JSON.parse(fs.readFileSync(process.env.AYUDA_SESIONES ?? 'sesiones.json', 'utf8'));
// `VENTANAS_ANCHO` y `VENTANAS_ALTO` sirven para medir en otra pantalla —un
// teléfono, por ejemplo, para comprobar que un cambio "solo del computador" no
// movió nada ahí—. Las reglas de la prueba se miran siempre a 1280×650.
const ANCHO = Number(process.env.VENTANAS_ANCHO) || 1280, ALTO = Number(process.env.VENTANAS_ALTO) || 650;
const SOLO_MEDIR = !!process.env.VENTANAS_ANCHO;

/**
 * Lo que hoy no cabe en 1280×650, con cuánto mide. **Solo puede bajar.**
 * El 2026-11-21 partió con 21 y quedaron dos, las dos de la ventana del
 * equipo del día, que crece con lo que tenga abierto o con las reservas.
 */
export const NO_CABEN = {
  // El formulario de un ajuste abierto dentro de la línea de una persona.
  'v-equipo-del-dia-con-ajuste': 839,
  // La cara de reservas es una lista: crece con las reservas del día.
  'v-equipo-del-dia-reservas': 851,
  // **La cabecera de cotizar en dos filas** (2026-11-24, lo pidió el cliente:
  // *"los pasos tienen que llegar en una fila y ahí comprometer un poco la
  // eficiencia del espacio y poner las alternativas en una segunda fila abajo…
  // y un botón grande de las notas"*). La fila de las alternativas suma unos
  // 50px; en el paso 3, además, *Fuera del local* le quita ancho a los extras.
  'v-cotizar-3-productos': 698,
  'v-cotizar-4-envio': 665,
  'v-cotizar-4-envio-vendedor': 665,
  'v-cotizar-5-contrato': 681,
  'v-cotizar-5-contrato-vendedor': 681
};

/** Hallazgos de alineación que se aceptan, con el porqué. Hoy, ninguno. */
export const ALINEACION_ACEPTADA = {
};

/**
 * **El espacio se usa bien** (2026-11-22). Filas que `revisarEspacio()` marca
 * y se dejan así, con el porqué. La llave es la escena o la pantalla; el
 * texto, un trozo del hallazgo.
 */
export const ESPACIO_ACEPTADO = {
};

/**
 * Las pantallas que se miran enteras con `revisarEspacio()`, además de las
 * escenas. **Una pantalla nueva, o una vista nueva dentro de una pantalla, se
 * agrega acá en el mismo PR que la crea.**
 */
export const PANTALLAS = [
  ['calendario', '/'], ['cotizaciones', '/presupuestos'],
  ['cotizaciones-lista', '/presupuestos', async (p) => { await p.locator('button:visible', { hasText: '📋 Lista' }).first().click(); }],
  // La Lista abre en *Mes* desde el 2026-11-22: la otra vista que se mide es *Todo*,
  // la que trae *Ganado mes a mes*.
  ['cotizaciones-lista-todo', '/presupuestos', async (p) => {
    await p.locator('button:visible', { hasText: '📋 Lista' }).first().click(); await p.waitForTimeout(300);
    await p.getByRole('group', { name: 'Periodo' }).getByRole('button', { name: 'Todo' }).click(); }],
  ['estadisticas-personalizado', '/estadisticas', async (p) => {
    await p.getByRole('group', { name: 'Periodo' }).getByRole('button', { name: 'Personalizado' }).click(); }],
  // **La agenda del vendedor** (2026-11-23): la tarjeta 🗓 Agenda de la Lista.
  ['cotizaciones-agenda', '/presupuestos', async (p) => {
    await p.locator('button:visible', { hasText: '📋 Lista' }).first().click(); await p.waitForTimeout(300);
    await p.locator('p:visible', { hasText: '🗓 Agenda' }).first().locator('xpath=..').locator('button[aria-pressed]').click(); await p.waitForTimeout(300);
  }],
  ['cotizaciones-sin-fecha', '/presupuestos', async (p) => { await p.locator('button:visible', { hasText: /^Sin fecha/ }).first().click(); }],
  ['clientes', '/clientes'], ['vendedores', '/vendedores'], ['equipo', '/equipo'], ['turnos', '/turnos'],
  ['extras', '/extras'], ['informe', '/informe'], ['estadisticas', '/estadisticas'], ['recepcion', '/recepcion'],
  ['dia', '/dia/2026-11-14'], ['productos', '/menus'], ['configuracion', '/config'], ['cuentas', '/usuarios'],
  ['bitacora', '/bitacora'],
  // La caja chica (2026-11-23, `caja.ts`).
  ['caja', '/caja'],
  // Las promociones del sitio (2026-11-23), en Productos.
  ['productos-promociones', '/menus?ver=promociones']
];

const b = await chromium.launch();
// `VENTANAS_ESCALA=2` para fotos que va a mirar una persona.
const ctx = await b.newContext({ viewport: { width: ANCHO, height: ALTO },
  deviceScaleFactor: Number(process.env.VENTANAS_ESCALA) || 1,
  timezoneId: 'America/Santiago', locale: 'es-CL' });
await ctx.addCookies([{ name: 'sesion', value: SESIONES.admin, url: URL_PANEL }]);
// El reloj del navegador, a la misma hora que el servidor de ejemplo: si no,
// "hoy" es un día para el servidor y otro para la página, y React avisa.
await ctx.clock.install({ time: new Date(process.env.AYUDA_RELOJ ?? '2026-11-13T17:25:00Z') });
const p = await ctx.newPage();
p.setDefaultTimeout(8000);

const ir = async (ruta) => { await p.goto(URL_PANEL + ruta, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(1100); };
const clic = async (loc, n = 0) => { await loc.nth(n).click(); await p.waitForTimeout(800); };
const boton = (name, exact = false) => p.getByRole('button', { name, exact });
const ventana = () => p.locator('[role=dialog]').last();
const abrirPrimera = () => clic(p.locator('main button[aria-expanded="false"]'));
const diaDe = async (ruta, dia) => {
  await ir(ruta);
  await clic(boton(dia), (await boton(dia).count()) - 1);
  await p.waitForSelector('[role=dialog]'); await p.waitForTimeout(500);
};
const lineaDelDia = () => clic(ventana().locator('button[aria-expanded="false"]'));
const cotizacion = async (paso) => {
  await ir('/presupuestos'); await clic(boton(/📋 Lista/)); await clic(p.getByRole('button', { name: 'Abrir la cotización de Andrés Pino' }));
  await p.waitForTimeout(1400);
  if (paso) await clic(ventana().getByRole('button', { name: paso }));
};
/** Abre una escena con la sesión del vendedor y vuelve a la del administrador. */
/** Como Daniela, que recibe las cotizaciones del sitio (2026-11-23). */
const comoVendedora = async (abrir) => {
  await ctx.addCookies([{ name: 'sesion', value: SESIONES.vendedora, url: URL_PANEL }]);
  try { await abrir(); } finally { await ctx.addCookies([{ name: 'sesion', value: SESIONES.admin, url: URL_PANEL }]); }
};
const comoVendedor = async (abrir) => {
  await ctx.addCookies([{ name: 'sesion', value: SESIONES.vendedor, url: URL_PANEL }]);
  try { await abrir(); } finally { await ctx.addCookies([{ name: 'sesion', value: SESIONES.admin, url: URL_PANEL }]); }
};
const personaDelInforme = async () => {
  // *Mes* va en el marco del periodo desde el 2026-11-22 (antes, *Por mes*).
  await ir('/informe'); await clic(p.getByRole('group', { name: 'Periodo' }).getByRole('button', { name: 'Mes', exact: true })); await p.waitForTimeout(1300);
  await clic(p.locator('main button[aria-expanded="false"]'), 1);
};
const vendedor = async () => { await ir('/vendedores'); await clic(boton(/^Daniela/)); };

/**
 * Cada escena deja en pantalla una ficha abierta (`ficha-…`) o una ventana
 * (`v-…`). El nombre dice qué es; el orden, por dónde se llega.
 */
export const ESCENAS = {
  // Fichas que se abren dentro de su lista.
  'ficha-trabajador': async () => { await ir('/equipo'); await abrirPrimera(); },
  'ficha-colaborador': async () => { await ir('/extras'); await clic(boton(/Paz Ortiz/)); },
  'ficha-cliente': async () => { await ir('/clientes'); await abrirPrimera(); },
  'ficha-producto': async () => { await ir('/menus'); await abrirPrimera(); },
  'ficha-vendedor': vendedor,
  'ficha-recepcion': async () => { await ir('/recepcion'); await clic(p.locator('li > button[aria-expanded]')); },
  'ficha-reserva-del-dia': async () => { await ir('/dia/2026-11-14'); await abrirPrimera(); },
  'ficha-persona-del-informe': personaDelInforme,
  'ficha-cliente-nuevo': async () => { await ir('/clientes'); await clic(boton(/Nuevo cliente/)); },
  // **Cobrar la mesa** (2026-11-23, `cobroLocal.ts`): la de Martín Araya, a la
  // que le faltan $18.000, con dos medios elegidos. La escena no cobra.
  'ficha-recepcion-cobro': async () => {
    await ir('/recepcion');
    await clic(p.locator('li', { hasText: 'Martín Araya' }).first().locator('button[aria-expanded]').first());
    const mesa = p.locator('section[aria-label="La mesa"]:visible').first();
    await clic(mesa.getByRole('button', { name: /Efectivo/ }));
    await mesa.getByLabel('Monto en Efectivo').fill('15000');
    await clic(mesa.getByRole('button', { name: /\+ 💳 Tarjeta/ }));
  },
  // **La caja chica** (2026-11-23): los dos formularios de quien la lleva.
  'ficha-caja-gasto': async () => { await ir('/caja'); await clic(boton(/Anotar un gasto/)); },
  // **Las promociones del sitio** (2026-11-23): la tarjeta del Gran Premio abierta,
  // con su link de campaña, el karting para sumar y el arriendo.
  'ficha-promocion': async () => {
    await ir('/menus?ver=promociones'); await clic(boton(/Gran Premio de Fin de Año/));
  },
  // La ventana que le avisa a la vendedora de las cotizaciones del sitio: sale sola al entrar.
  'v-aviso-sitio': async () => { await comoVendedora(async () => { await ir('/'); await p.getByRole('dialog').waitFor(); }); },
  'ficha-caja-entregar': async () => { await ir('/caja'); await clic(boton(/Entregar…/)); },
  // Cambiar el vendedor de un cliente (2026-11-22): con uno ya elegido, que es cuando más mide.
  'v-cambiar-vendedor': async () => {
    await ir('/clientes'); await abrirPrimera();
    await clic(boton(/Vendedor: .* Cambiar/));
    await clic(p.locator('[role=dialog]').getByRole('button', { name: /Daniela/ }));
  },
  // Reservas y días.
  'v-reserva-nueva': async () => { await ir('/'); await clic(boton('Agregar reserva')); },
  // *✎ Editar* es el de la reserva: con /^Editar/ la escena abría *Editar
  // actividades* —la ventana de los extras— y el formulario quedó sin medir.
  'v-reserva-editar': async () => { await ir('/dia/2026-11-14'); await abrirPrimera(); await clic(boton(/^✎ Editar$/)); },
  // Un día cerrado: editar o borrar una reserva es corregirlo, con la lista de cambios y su casilla.
  // La anotada a mano y pagada es la más larga —los tres botones del pago y
  // cómo pagó—, y con un cambio hecho la lista ya tiene su línea.
  'v-reserva-editar-dia-cerrado': async () => {
    await ir('/dia/2026-11-07'); await clic(p.locator('main button[aria-expanded]', { hasText: 'Familia Toro' }));
    await clic(boton(/^✎ Editar$/)); await clic(ventana().getByRole('button', { name: 'Agregar uno de Tradiciones' }));
  },
  'v-reserva-borrar-dia-cerrado': async () => { await ir('/dia/2026-11-07'); await abrirPrimera(); await clic(boton('Borrar', true)); },
  'v-fecha-nueva': async () => { await ir('/'); await clic(boton('Agregar fecha')); },
  'v-fecha-editar': async () => { await ir('/'); await clic(boton(/Editar/)); },
  // El equipo y los extras de un día.
  'v-equipo-del-dia': async () => { await diaDe('/turnos', /11 de noviembre/); await lineaDelDia(); },
  'v-equipo-del-dia-con-ajuste': async () => {
    await diaDe('/turnos', /11 de noviembre/); await lineaDelDia();
    await clic(ventana().getByRole('button', { name: /Descontar/ }));
  },
  'v-equipo-del-dia-reservas': async () => { await diaDe('/turnos', /11 de noviembre/); await clic(ventana().locator('button:visible', { hasText: 'Reservas' })); },
  'v-dia-cerrado': async () => { await diaDe('/turnos', /(^|\D)7 de noviembre/); },
  'v-dia-cerrado-corrigiendo': async () => {
    await diaDe('/turnos', /(^|\D)7 de noviembre/);
    await clic(ventana().getByRole('button', { name: 'Corregir este día' }));
  },
  'v-ficha-trabajador': async () => { await diaDe('/turnos', /11 de noviembre/); await lineaDelDia(); await clic(ventana().getByRole('button', { name: 'Ficha' })); },
  'v-trabajador-nuevo': async () => { await diaDe('/turnos', /11 de noviembre/); await clic(ventana().getByRole('button', { name: /Nuevo trabajador/ })); },
  'v-propina': async () => { await ir('/dia/2026-11-14'); await clic(boton(/propina/i)); },
  'v-extras-del-dia': async () => { await diaDe('/extras', /14 de noviembre/); await lineaDelDia(); },
  'v-ficha-colaborador': async () => { await diaDe('/extras', /14 de noviembre/); await lineaDelDia(); await clic(ventana().getByRole('button', { name: 'Ficha' })); },
  'v-puestos': async () => { await ir('/equipo'); await clic(p.locator('main button', { hasText: /puestos/i })); },
  // **Reenganchar un nombre suelto** (2026-11-24, `ReengancharSuelto`): el
  // turno de octubre de *Matias Peres*, con la ficha elegida. La escena no pasa.
  'v-reenganchar': async () => {
    await ir('/equipo'); await clic(boton('Es…', true));
    await ventana().getByLabel('Buscar trabajador').fill('Matías');
    await clic(ventana().getByRole('button', { name: /Matías Pérez/ }));
  },
  // Cotizaciones.
  'v-cotizar-1-cliente': async () => { await ir('/presupuestos'); await clic(boton('+ Cotizar', true)); },
  'v-cotizar-1-cliente-nuevo': async () => {
    await ir('/presupuestos'); await clic(boton('+ Cotizar', true));
    await clic(ventana().getByRole('button', { name: /Cliente nuevo/ }));
  },
  // ***✎ Editar cliente*** (2026-11-23): la ficha del cliente, desde el paso 1
  // de una cotización que ya tiene cliente. Solo se abre; no guarda nada.
  'v-cotizar-editar-cliente': async () => {
    await cotizacion(/Cliente/);
    await clic(ventana().getByRole('button', { name: /Editar cliente/ }));
  },
  // ***🗒 Notas*** (2026-11-23): lo conversado y el próximo contacto, como
  // vendedor, desde la cotización de Andrés Pino (tiene dos notas). Solo se abre.
  'v-notas': () => comoVendedor(async () => {
    await cotizacion(/Cliente/);
    await clic(ventana().locator('button:visible', { hasText: '🗒 Notas' }));
  }),
  // El paso Evento de un candidato, con *✍ Prometiste mandarla antes del*.
  'v-cotizar-2-evento-candidato': async () => {
    await ir('/presupuestos'); await clic(boton(/📋 Lista/));
    await clic(p.getByRole('group', { name: 'Periodo' }).getByRole('button', { name: 'Todo' }));
    await clic(p.getByRole('button', { name: 'Abrir la cotización de Felipe Ortúzar' }));
    await p.waitForTimeout(1400); await clic(ventana().getByRole('button', { name: /Evento/ }));
  },
  'v-cotizar-2-evento': () => cotizacion(/Evento/),
  'v-cotizar-3-productos': () => cotizacion(/Productos/),
  // **Aplicar una promoción** (2026-11-24), como vendedor: la lista y lo que
  // pasa al aplicar el Gran Premio, con 80 personas (su tramo del 20%).
  'v-aplicar-promocion': () => comoVendedor(async () => {
    await cotizacion(/Productos/);
    await clic(ventana().getByRole('button', { name: 'Aplicar promoción' }));
    await clic(p.getByRole('radio', { name: /Gran Premio de Fin de Año/ }));
    await clic(p.getByRole('radio', { name: 'A Brasas abiertas' }));
  }),
  // El simulador de evento (2026-11-23): solo calcula, no guarda nada.
  'v-simulador': async () => {
    await cotizacion(/Productos/);
    await clic(p.locator('button:visible', { hasText: 'Simular' }));
    // El resumen se dibuja dos veces (celular y computador): se espera el que se ve.
    await p.getByText('Cuesta').locator('visible=true').first().waitFor();
  },
  'v-cotizar-4-envio': () => cotizacion(/Envío/),
  'v-cotizar-4-factura': async () => {
    await cotizacion(/Envío/);
    await clic(ventana().getByRole('button', { name: /datos de facturación/ }));
  },
  'v-cotizar-5-contrato': () => cotizacion(/Contrato/),
  // **Las ventanitas de la cotización** (2026-11-22, cuando se les puso marco):
  // no estaban medidas. Solo se abren; ninguna guarda nada. *¿La mandaste?*
  // sale la primera vez que se copia el link de una que no se ha mandado.
  'v-cotizar-la-mandaste': async () => {
    // Su evento es en diciembre y la Lista abre en el mes en curso (2026-11-22): a *Todo*.
    await ir('/presupuestos'); await clic(boton(/📋 Lista/));
    await clic(p.getByRole('group', { name: 'Periodo' }).getByRole('button', { name: 'Todo' }));
    await clic(p.getByRole('button', { name: 'Abrir la cotización de Marisol Cáceres' }));
    await p.waitForTimeout(1400); await clic(ventana().getByRole('button', { name: /Envío/ }));
    await clic(ventana().locator('button:visible', { hasText: 'Copiar link' }));
  },
  // **¿Se cayó?** (2026-11-22): la ventanita de *✕ Se cayó…*, abierta desde
  // la fila de la lista, que es la misma que se abre en la cotización.
  'v-se-cayo': async () => {
    await ir('/presupuestos'); await clic(boton(/📋 Lista/));
    await clic(p.getByRole('group', { name: 'Periodo' }).getByRole('button', { name: 'Todo' }));
    // Se dibuja dos veces (computador y celular): se pide el que se ve.
    await clic(p.locator('button:visible[aria-label="Se cayó la cotización de Marisol Cáceres"]'));
  },
  // **Las condiciones especiales** (2026-11-23): como vendedor, porque quien
  // aprueba no tiene tope y no ve el botón *✋ Pedir condiciones especiales…*,
  // que alarga los pasos 4 y 5. La sesión vuelve a ser la del administrador
  // apenas se abre la ventana.
  'v-cotizar-4-envio-vendedor': () => comoVendedor(() => cotizacion(/Envío/)),
  'v-cotizar-5-contrato-vendedor': () => comoVendedor(() => cotizacion(/Contrato/)),
  'v-pedir-condiciones': () => comoVendedor(async () => {
    await cotizacion(/Envío/);
    await clic(ventana().locator('button:visible', { hasText: 'Pedir condiciones especiales' }));
  }),
  'v-cotizar-corregir-ganada': async () => {
    await ir('/presupuestos'); await clic(boton(/📋 Lista/)); await clic(boton(/^Ganadas/));
    await clic(p.getByRole('button', { name: 'Abrir la cotización de Gonzalo Contreras' })); await p.waitForTimeout(1400);
    await clic(ventana().getByRole('button', { name: /Envío/ }));
    await clic(ventana().locator('button:visible', { hasText: 'Corregir la ganada' }));
  },
  'v-cotizar-cancelar-evento': async () => {
    await ir('/presupuestos'); await clic(boton(/📋 Lista/)); await clic(boton(/^Ganadas/));
    await clic(p.getByRole('button', { name: 'Abrir la cotización de Gonzalo Contreras' })); await p.waitForTimeout(1400);
    // *Cancelar evento* va en el pie del paso 5, Contrato.
    await clic(ventana().getByRole('button', { name: /Contrato/ }));
    await clic(ventana().locator('button:visible', { hasText: 'Cancelar evento' }));
    await p.waitForTimeout(1200);
  },
  // Guardar una ganada cuya reserva queda en un día cerrado (2026-11-21): la
  // lista de lo que cambia, con su casilla. No guarda nada: solo la abre.
  'v-cotizar-ganada-dia-cerrado': async () => {
    await ir('/presupuestos'); await clic(boton(/📋 Lista/)); await clic(boton(/^Ganadas/));
    await clic(p.getByRole('button', { name: 'Abrir la cotización de Gonzalo Contreras' })); await p.waitForTimeout(1400);
    await clic(ventana().getByRole('button', { name: /Evento/ }));
    await ventana().locator('input[type=date]').fill('2026-11-07'); await p.waitForTimeout(400);
    await clic(ventana().getByRole('button', { name: /Productos/ }));
    await clic(ventana().locator('button:visible', { hasText: /^Guardar$/ }));
    await ventana().getByText('Confirmo').waitFor();
  },
  // Informe.
  'v-pago': async () => { await personaDelInforme(); await clic(boton(/Pago parcial/)); },
  'v-ajuste-del-informe': async () => { await personaDelInforme(); await clic(boton(/Descontar/)); },
  // Vendedores.
  'v-vendedor-nuevo': async () => { await ir('/vendedores'); await clic(boton(/Agregar vendedor/)); },
  'v-trato': async () => { await vendedor(); await clic(boton(/Cambiar el trato/)); },
  'v-documento-del-vendedor': async () => { await vendedor(); await clic(boton('Cambiar', true), 0); },
  'v-transferencia-del-vendedor': async () => { await vendedor(); await clic(boton('Cambiar', true), 1); },
  // Administración.
  'v-clave': async () => { await ir('/usuarios'); await clic(boton('Cambiar', true)); },
  'v-ver-como': async () => { await ir('/usuarios'); await clic(boton(/Ver como/)); },
  'v-base-en-cero': async () => {
    await ir('/config'); await clic(boton(/Ver qué se borra/));
    // Cuenta las filas de la planilla antes de mostrar la lista: se espera a que llegue.
    await ventana().getByText('Se borra').waitFor({ timeout: 15000 });
  },
  'v-importar-crm': async () => {
    await ir('/config'); await clic(boton(/Ver qué entra/));
    // Lee las pestañas de la planilla antes de mostrar la vista previa: se espera a que llegue.
    await ventana().getByText('Días que toman cupo').waitFor({ timeout: 15000 });
  },
  'v-comentar': async () => { await ir('/'); await clic(boton(/Coméntame/)); }
};

/** Cuánto mide lo que quedó abierto, y si entra en la pantalla. */
const medir = () => p.evaluate((alto) => {
  const v = [...document.querySelectorAll('[role="dialog"]')].at(-1);
  if (v) {
    const caja = v.firstElementChild?.getBoundingClientRect();
    return { que: 'ventana', mide: Math.round(caja?.height ?? 0), cabe: v.scrollHeight <= v.clientHeight + 1 };
  }
  // Una ficha abierta: la tarjeta que contiene el botón abierto.
  const abierta = [...document.querySelectorAll('main [aria-expanded="true"]')].at(-1);
  // O un formulario que se abre arriba de la lista, sin botón que lo pliegue
  // (un cliente nuevo): se marca con `data-ficha`.
  const tarjeta = abierta?.closest('li, article') ?? abierta?.parentElement?.parentElement
    ?? [...document.querySelectorAll('main [data-ficha]')].at(-1);
  if (!tarjeta) return { que: 'nada', mide: 0, cabe: true };
  const r = tarjeta.getBoundingClientRect();
  return { que: 'ficha', mide: Math.round(r.height), cabe: r.height <= alto };
}, ALTO);

const pedidas = process.argv.slice(2);
const fallas = [], bajaron = [], sinAbrir = [];
const medidas = {};
for (const [nombre, abrir] of Object.entries(ESCENAS)) {
  if (pedidas.length && !pedidas.some((x) => nombre.startsWith(x))) continue;
  try {
    await abrir();
  } catch (e) {
    sinAbrir.push(nombre);
    console.log(`  ?      ${nombre}: no se pudo abrir (${String(e.message).split('\n')[0].slice(0, 90)})`);
    continue;
  }
  // Lo que se carga al abrir (las reservas de un día) tiene que haber llegado:
  // medir un "Cargando…" —o el "Revisando el contrato…" de *Cancelar evento*—
  // daría una ventana corta que no es.
  await p.locator('[role=dialog]').last().getByText(/^(Cargando|Revisando)/).first()
    .waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  const m = await medir();
  // Con `VENTANAS_FOTOS=<carpeta>` deja una foto de cada escena. Una ventana
  // que no cabe se fotografía entera: se alarga la pantalla lo que haga falta
  // para la foto y se devuelve a su alto (el ancho, que es el que decide el
  // diseño, no cambia).
  if (process.env.VENTANAS_FOTOS) {
    fs.mkdirSync(process.env.VENTANAS_FOTOS, { recursive: true });
    const foto = `${process.env.VENTANAS_FOTOS}/${nombre}.png`;
    if (m.que === 'ventana') {
      await p.setViewportSize({ width: ANCHO, height: Math.max(ALTO, m.mide + 24) });
      await p.waitForTimeout(150);
      await p.screenshot({ path: foto });
      await p.setViewportSize({ width: ANCHO, height: ALTO });
    } else await p.screenshot({ path: foto, fullPage: true });
  }
  const corridos = (await revisarAlineacion(p)).filter((x) => !(ALINEACION_ACEPTADA[nombre] ?? []).some((a) => x.includes(a)));
  medidas[nombre] = m.mide;
  if (SOLO_MEDIR) { console.log(`  medida  ${nombre}: ${m.que} de ${m.mide}px`); continue; }
  const anotada = NO_CABEN[nombre];
  const problemas = [];
  // **Una escena que no encontró qué medir no pasa** (2026-11-21): decía
  // *ok · nada de 0px* y nadie lo veía. Así estuvo *ficha-cliente-nuevo*.
  if (m.que === 'nada') problemas.push('no quedó nada abierto que medir: hay que arreglar la escena');
  if (!m.cabe && anotada === undefined) problemas.push(`no cabe en ${ANCHO}×${ALTO}: mide ${m.mide}px`);
  if (!m.cabe && anotada !== undefined && m.mide > anotada + 4) problemas.push(`creció: mide ${m.mide}px y estaba anotada en ${anotada}`);
  if (m.cabe && anotada !== undefined) bajaron.push(`${nombre}: ya cabe (${m.mide}px). Sácala de NO_CABEN.`);
  if (!m.cabe && anotada !== undefined && m.mide < anotada - 4) bajaron.push(`${nombre}: bajó de ${anotada} a ${m.mide}px. Anótalo en NO_CABEN.`);
  for (const c of corridos) problemas.push(c);
  // `revisarEspacio()` no se pasa por las ventanas: adentro de un formulario los
  // campos van en su rejilla a propósito, y a una ventana ya se le exige caber
  // en la pantalla. Se pasa por las pantallas enteras, más abajo.
  // Con `VENTANAS_PLAYSTATION=1` dice además lo que `revisarPlayStation()`
  // encuentra en esa escena (letra bajo 13px, botones bajo 34px, desborde).
  // No hace fallar: es para mirarlo al cerrar un cambio. El `?` chico no se
  // lista: se ve de 24px y se aprieta en 36.
  const ps = process.env.VENTANAS_PLAYSTATION
    ? (await revisarPlayStation(p)).filter((x) => !/: "\?"$/.test(x)) : [];
  const marca = problemas.length ? 'FALLA ' : !m.cabe ? 'anotada' : 'ok     ';
  console.log(`  ${marca} ${nombre}: ${m.que} de ${m.mide}px${m.cabe ? '' : ' · no cabe'}${problemas.length ? '\n           · ' + problemas.join('\n           · ') : ''}`);
  for (const x of ps) console.log(`           (PlayStation) ${x}`);
  if (problemas.length) fallas.push(nombre);
}

// **Las tarjetas del calendario, parejas por dentro** (2026-11-22). Con el
// peor caso puesto a mano: pronóstico en todos los días menos hoy, y un cupo
// de tres cifras lleno en uno de cada dos (*150/150 personas* más el tiempo
// es lo que hacía bajar un renglón). **Y hoy, exclusivo** (2026-11-22): la
// pastilla *HOY* más la palabra más larga del estado es lo que bajaba el
// estado a otro renglón (`revisarLineaDeLaFecha()`).
if (!SOLO_MEDIR && !process.argv.slice(2).length) {
  const hoyEjemplo = new Date(process.env.AYUDA_RELOJ ?? '2026-11-13T17:25:00Z').toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
  await p.route('**/api/clima', (r) => r.fulfill({ json: { clima: Array.from({ length: 120 }, (_, i) => ({
    fecha: new Date(Date.UTC(2026, 10, 14 + i)).toISOString().slice(0, 10), simbolo: 'partlycloudy_day', max: 23, min: 9, lluvia: null, mm: 0 })) } }));
  await p.route('**/api/ocupacion*', async (r) => {
    const d = await (await r.fetch()).json();
    (d.ocupacion ?? []).forEach((o, i) => { if (o.capacidad > 0) { o.capacidad = 150; if (i % 2) { o.tomadas = 150; o.porPagar = 150; o.pagadas = 0; o.quedan = 0; } } });
    let deHoy = (d.ocupacion ?? []).find((o) => o.fecha === hoyEjemplo);
    const molde = (d.ocupacion ?? []).find((o) => o.capacidad > 0);
    if (!deHoy && molde) { deHoy = { ...molde, fecha: hoyEjemplo }; d.ocupacion.push(deHoy); d.ocupacion.sort((a, c) => a.fecha.localeCompare(c.fecha)); }
    if (deHoy) Object.assign(deHoy, { privada: true, exclusiva: true, bloqueada: false });
    await r.fulfill({ json: d });
  });
  await ir('/');
  const desparejas = await revisarTarjetasParejas(p);
  console.log(`  ${desparejas.length ? 'FALLA ' : 'ok     '} calendario: las tarjetas de cada fila${desparejas.length ? '\n           · ' + desparejas.join('\n           · ') : ', parejas por dentro'}`);
  if (desparejas.length) fallas.push('calendario');
  for (const [nombre, ruta] of [['calendario', null], ['cotizaciones', '/presupuestos']]) {
    if (ruta) await ir(ruta);
    const dobladas = await revisarLineaDeLaFecha(p);
    console.log(`  ${dobladas.length ? 'FALLA ' : 'ok     '} ${nombre}: la línea de la fecha${dobladas.length ? '\n           · ' + dobladas.join('\n           · ') : ', en una línea con hoy exclusivo'}`);
    if (dobladas.length) fallas.push(`${nombre} · línea de la fecha`);
  }
}
// **El espacio de cada pantalla** (2026-11-22): dos filas seguidas que cabrían
// en una. Solo en el computador y en una pasada completa.
if (!SOLO_MEDIR && !process.argv.slice(2).length && ANCHO >= 1024) {
  await p.unroute('**/api/clima'); await p.unroute('**/api/ocupacion*');
  for (const [nombre, ruta, preparar] of PANTALLAS) {
    await ir(ruta);
    if (preparar) { await preparar(p); await p.waitForTimeout(700); }
    const h = (await revisarEspacio(p)).filter((x) => !(ESPACIO_ACEPTADO[nombre] ?? []).some((a) => x.includes(a)));
    console.log(`  ${h.length ? 'FALLA ' : 'ok     '} espacio · ${nombre}${h.length ? '\n           · ' + h.join('\n           · ') : ''}`);
    if (h.length) fallas.push(`espacio · ${nombre}`);
  }
}
await b.close();

if (process.env.VENTANAS_MEDIDAS) fs.writeFileSync(process.env.VENTANAS_MEDIDAS, JSON.stringify(medidas, null, 1));
if (bajaron.length) console.log('\nMejoraron:\n  ' + bajaron.join('\n  '));
if (sinAbrir.length) {
  console.log(`\nNo se pudieron abrir: ${sinAbrir.join(', ')}. Si la pantalla cambió, hay que arreglar la escena.`);
  process.exitCode = 1;
}
if (fallas.length) {
  console.log(`\n${fallas.length} con fallas: ${fallas.join(', ')}.`);
  process.exitCode = 1;
} else if (!sinAbrir.length && !SOLO_MEDIR) {
  console.log('\nTodo bien: lo que cabía sigue cabiendo, los campos están alineados y no hay filas que cabrían en una.');
}
