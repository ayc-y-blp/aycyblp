/**
 * **Canjear un pase por una sesión** (2026-11-23). Es la otra mitad de
 * `/api/sesion/pasar`: llega desde la dirección de la otra empresa, sin
 * sesión acá, con un pase firmado de un minuto.
 *
 * - **Vale solo en la dirección de la empresa que nombra**: un pase para
 *   Asados y Corderos no abre Lo Pirque.
 * - **La sesión que nace dura lo de siempre** y lleva el rol que la cuenta
 *   tiene en esta empresa, que el pase trae firmado.
 * - Un pase malo o vencido manda a la entrada, sin decir por qué.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { anotar } from '@/lib/datos';
import { conEmpresa, empresaActual, empresaPorId } from '@/lib/empresa';
import { COOKIE_EMPRESA, empresasEncendidas, esDePrueba } from '@/lib/empresas';
import { leerPase, firmarSesion, secretoDeSesion, COOKIE_SESION, DURACION_SESION } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export const GET = conLecturas([], async function GET(req: Request) {
  const url = new URL(req.url);
  // La dirección de vuelta se arma con la cabecera, no con `req.url`: detrás
  // de un proxy, esa puede traer el nombre interno del servidor.
  const base = `${url.protocol}//${req.headers.get('host') ?? url.host}`;
  const secreto = secretoDeSesion(process.env);
  const pase = await leerPase(url.searchParams.get('t'), secreto);
  // En una versión de prueba no hay una dirección por empresa: el pase vale
  // para la empresa que nombra, si está encendida, y deja elegida ésa.
  const dePrueba = esDePrueba(process.env);
  const vale = !!pase && (dePrueba
    ? empresasEncendidas(process.env).some((e) => e.id === pase.empresa)
    : pase.empresa === empresaActual().id);
  if (!pase || !vale) {
    return NextResponse.redirect(`${base}/login`);
  }
  const token = await firmarSesion({
    usuario: pase.usuario, rol: pase.rol, gerencia: pase.gerencia, avisos: pase.avisos,
    empresa: pase.empresa, otras: pase.otras
  }, secreto);
  const res = NextResponse.redirect(`${base}/`);
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: DURACION_SESION
  });
  if (dePrueba) res.cookies.set(COOKIE_EMPRESA, pase.empresa, { sameSite: 'lax', path: '/', maxAge: DURACION_SESION });
  await conEmpresa(empresaPorId(pase.empresa), () =>
    anotar({ usuario: pase.usuario, rol: pase.rol, accion: 'Entró al panel (pasó desde la otra empresa)' }));
  return res;
});
