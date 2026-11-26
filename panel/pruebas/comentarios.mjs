/**
 * **El botón 💬 Comentar, de punta a punta** (2026-11-12; desde el 2026-11-26
 * los comentarios viven en la planilla del panel): llama la ruta
 * `/api/comentarios` contra el Google falso de `pruebas/lecturas/` y mira que
 * deje una fila en la pestaña `Comentarios` con su encabezado, nombre y rol de
 * la sesión, un ID y *Nuevo*; que sin texto no escriba; y que contestar y
 * marcar visto cambien esa fila.
 *
 *   npm run comentarios
 */
const API = new URL('../src/app/api/', import.meta.url);
const escrituras = (globalThis.__gescrituras ??= []);
const mandado = (globalThis.__gmandado ??= []);
const store = (globalThis.__gstore ??= new Map());
let fallos = 0;
const ok = (c, txt) => { console.log(`  ${c ? 'ok   ' : 'FALLA'}  ${txt}`); if (!c) fallos++; };

const { POST, PATCH } = await import(new URL('comentarios/route.ts', API).href);
const pedir = (metodo, f, cuerpo) => f(new Request('http://localhost/api/comentarios', {
  method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }));

delete process.env.COMENTARIOS_SHEET_ID;
let r = await pedir('POST', POST, { tipo: '💡 Idea', texto: '   ' });
ok(r.status === 400 && escrituras.length === 0, 'sin texto no escribe');

r = await pedir('POST', POST, { tipo: '🧩 Me falta', texto: '=no veo si pagó', para: 'cobrar en la entrada', pantalla: 'Recepción', rol: 'admin-falso' });
const hoja = store.get('Comentarios') ?? [];
const enc = hoja[0] ?? [];
const fila = hoja[1] ?? [];
const en = (col) => fila[enc.indexOf(col)];
ok(r.status === 200, 'sin COMENTARIOS_SHEET_ID igual guarda: va a la planilla del panel');
ok(enc[0] === 'Fecha' && enc.includes('ID') && enc.includes('Respuesta vista'), 'la pestaña nace con su encabezado, las columnas nuevas al final');
ok(en('Rol') === 'Administrador' && en('Nombre') === 'desarrollo' && en('Tipo') === '🧩 Me falta'
   && en('Dónde') === 'Recepción' && en('Estado') === 'Nuevo' && /^C-/.test(en('ID') ?? ''),
   'nombre y rol salen de la sesión, no del navegador; nace en Nuevo y con su ID');
// El Google falso guarda como Sheets: sin el `'`. Lo que importa es que se mandó con él.
ok(mandado.some((f) => Array.isArray(f) && f.some((c) => String(c).startsWith("'=no veo"))), 'un texto que parece fórmula no entra como fórmula');

const id = en('ID');
r = await pedir('PATCH', PATCH, { id, accion: 'responder', texto: 'Ya está en la tarjeta.', estado: 'Resuelto' });
const tras = (store.get('Comentarios') ?? [])[1] ?? [];
ok(r.status === 200 && tras[enc.indexOf('Respuesta / qué se hizo')] === 'Ya está en la tarjeta.'
   && tras[enc.indexOf('Estado')] === 'Resuelto' && tras[enc.indexOf('Respondido por')] === 'desarrollo',
   'el administrador contesta y queda resuelto, a su nombre');
r = await pedir('PATCH', PATCH, { id, accion: 'visto' });
ok(r.status === 200 && !!((store.get('Comentarios') ?? [])[1] ?? [])[enc.indexOf('Respuesta vista')], 'quien lo escribió lo marca visto');

console.log(fallos ? `\n${fallos} FALLAS` : '\nTodo bien: los comentarios llegan a la planilla del panel y se contestan.');
process.exit(fallos ? 1 : 0);
