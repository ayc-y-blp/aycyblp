/**
 * **Elegir la empresa en una versión de prueba** (2026-11-23). Pone la cookie
 * `empresa` y vuelve a la entrada. **En producción no existe** (404): ahí la
 * empresa la dice la dirección, y nada más.
 *
 * No da acceso a nada: la sesión es de una empresa, así que después de elegir
 * la otra hay que entrar con una cuenta que tenga rol ahí.
 */
import { NextResponse } from 'next/server';
import { COOKIE_EMPRESA, empresasEncendidas, esDePrueba } from '@/lib/empresas';
import { DURACION_SESION } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!esDePrueba(process.env)) return new NextResponse('No existe.', { status: 404 });
  const url = new URL(req.url);
  const base = `${url.protocol}//${req.headers.get('host') ?? url.host}`;
  const a = url.searchParams.get('a') ?? '';
  const res = NextResponse.redirect(`${base}/login`);
  if (empresasEncendidas(process.env).some((e) => e.id === a)) {
    res.cookies.set(COOKIE_EMPRESA, a, { sameSite: 'lax', path: '/', maxAge: DURACION_SESION });
  }
  return res;
}
