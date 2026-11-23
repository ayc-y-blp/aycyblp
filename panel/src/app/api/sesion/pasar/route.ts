/**
 * **Pasar a la otra empresa sin escribir la clave de nuevo** (2026-11-23,
 * Fase 5). Lo pidió el cliente: una sola cuenta, y *"los mundos igual
 * independientes viven independientes y con sus URLs"*.
 *
 * Cada empresa vive en su dirección y la cookie de una no llega a la otra.
 * Así que esto arma **un pase**: un token firmado, de un minuto, que dice
 * quién es, a qué empresa va y con qué rol. El navegador lo lleva a
 * `/api/sesion/pase` de la otra dirección, que lo canjea por una sesión.
 *
 * - **El rol se vuelve a mirar en la cuenta**, no en la sesión: si a alguien
 *   le quitaron esa empresa ayer, hoy no pasa.
 * - **Mirando como otro rol no se pasa**: primero se vuelve a administrador.
 * - **El pase no es una sesión**: en cualquier otra ruta no abre nada.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { leerCuentas, anotar } from '@/lib/datos';
import { cuentaDeSesion, rolEn, otrasDe, HOJA_USUARIOS } from '@/lib/usuarios';
import { empresaActual } from '@/lib/empresa';
import { empresasEncendidas, direccionDe, esDePrueba, fichaDe } from '@/lib/empresas';
import { cookieDe, COOKIE_SESION, leerSesion, firmarSesion, secretoDeSesion, DURACION_PASE } from '@/lib/sesion';
import { iguales, ROL } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = conLecturas([HOJA_USUARIOS], async function POST(req: Request) {
  const secreto = secretoDeSesion(process.env);
  const aca = empresaActual().id;
  const sesion = await leerSesion(cookieDe(req.headers.get('cookie'), COOKIE_SESION), secreto);
  if (!sesion || sesion.empresa !== aca) {
    return NextResponse.json({ error: 'Tu sesión caducó. Vuelve a entrar.' }, { status: 401 });
  }
  if (sesion.rolReal) {
    return NextResponse.json({ error: 'Vuelve primero a administrador: mirando como otro rol no se cambia de empresa.' },
      { status: 409 });
  }
  const { a } = await req.json().catch(() => ({}));
  const encendidas = empresasEncendidas(process.env).map((e) => e.id);
  const destino = String(a ?? '');
  if (!encendidas.includes(destino) || destino === aca) {
    return NextResponse.json({ error: 'Esa empresa no existe.' }, { status: 400 });
  }

  try {
    // El administrador de emergencia no tiene fila: lo es en todas.
    const deEmergencia = !!process.env.PANEL_USUARIO && iguales(sesion.usuario, process.env.PANEL_USUARIO)
      && sesion.rol === ROL.admin;
    const cuenta = deEmergencia ? undefined : cuentaDeSesion(await leerCuentas(), sesion.usuario);
    const rol = deEmergencia ? ROL.admin : cuenta?.activo ? rolEn(cuenta, destino) : '';
    if (!rol) {
      return NextResponse.json(
        { error: `Tu cuenta no tiene acceso a ${fichaDe(destino, process.env).nombre}. Pídeselo al administrador.`, permiso: true },
        { status: 403 });
    }
    const pase = await firmarSesion({
      usuario: sesion.usuario, rol, empresa: destino, pase: true,
      gerencia: cuenta?.gerencia, avisos: cuenta?.avisosLeidos ?? sesion.avisos,
      otras: cuenta ? otrasDe(cuenta, destino, encendidas) : encendidas.filter((id) => id !== destino)
    }, secreto, undefined, DURACION_PASE);
    await anotar({ usuario: sesion.usuario, rol: sesion.rol,
      accion: `Pasó al panel de ${fichaDe(destino, process.env).nombre}` });
    // En una versión de prueba las dos empresas viven en la misma dirección:
    // el pase se canjea ahí mismo, y es él quien cambia de empresa.
    const base = esDePrueba(process.env) ? '' : direccionDe(destino, process.env);
    return NextResponse.json({ ir: `${base}/api/sesion/pase?t=${encodeURIComponent(pase)}` });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
