/**
 * Una cookie de sesión por rol, firmada con el secreto del panel de ejemplo
 * (`PANEL_USUARIO=jefe`, `PANEL_CLAVE=clave-de-prueba-1234`, sin
 * `SESION_SECRETO`). Las personas son las de `generar-planilla.mjs`: la
 * sesión lleva el NOMBRE, igual que en el panel de verdad.
 *
 *   node --experimental-strip-types pruebas/ejemplo/sesiones.mjs <salida.json>
 */
import fs from 'node:fs';

const { firmarSesion, secretoDeSesion } = await import(new URL('../../src/lib/sesion.ts', import.meta.url).href);
const secreto = secretoDeSesion({ PANEL_USUARIO: 'jefe', PANEL_CLAVE: 'clave-de-prueba-1234' });
const QUIEN = {
  anfitrion: 'Fernanda Muñoz', vendedor: 'Jorge', encargado: 'Tomás Herrera', gerente: 'Marcela Díaz',
  pagos: 'Verónica Lagos', gerencia: 'Rodrigo Vera', admin: 'Paula Fuentes',
  // La que recibe las cotizaciones del sitio (2026-11-23): para la ventana que se lo avisa.
  vendedora: 'Daniela'
};
const salida = {};
for (const [clave, usuario] of Object.entries(QUIEN)) {
  // La llave es el rol, salvo la segunda vendedora.
  const rol = clave === 'vendedora' ? 'vendedor' : clave;
  salida[clave] = await firmarSesion({ usuario, rol }, secreto);
}
if (!process.argv[2]) throw new Error('Falta dónde escribir las sesiones: sesiones.mjs <salida.json>');
fs.writeFileSync(process.argv[2], JSON.stringify(salida, null, 1));
console.log('sesiones:', Object.keys(salida).join(', '));
