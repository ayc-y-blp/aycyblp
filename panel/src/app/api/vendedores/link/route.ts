import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { HOJA_VENDEDORES, fichaDe, cuentasQueVenden } from '@/lib/vendedores';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { leerVendedores, guardarVendedor, anotar, leerUsuarios, leerPresupuestos } from '@/lib/datos';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { nuevoToken } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * **El link personal de un socio comercial o de un vendedor** (2026-11-12 el
 * socio; el vendedor desde el 2026-11-24, lo pidió el cliente): crear,
 * renovar o quitar, igual que `/api/extras/link`. Permiso `links`: muestra
 * la comisión y el trato. Renovar invalida el anterior; quitar lo apaga.
 *
 * Un vendedor puede no tener fila en `Vendedores` todavía (su trato está en
 * blanco): se le crea con la de partida al darle el link.
 */
export const POST = conLecturas([HOJA_VENDEDORES, HOJA_USUARIOS, HOJA_PRESUPUESTOS], async function POST(req: Request) {
  const no = await exigir(req, 'links');
  if (no) return no;
  try {
    const { usuario, accion } = (await req.json().catch(() => ({}))) ?? {};
    if (!['crear', 'renovar', 'quitar'].includes(accion)) {
      return NextResponse.json({ error: 'La acción tiene que ser crear, renovar o quitar.' }, { status: 400 });
    }
    const fichas = await leerVendedores();
    const u = normalizar(String(usuario ?? ''));
    let s = fichas.find((f) => normalizar(f.usuario) === u);
    if (!s) {
      // Un vendedor con cuenta y sin fila: su ficha de partida. **También quien
      // cotiza con otro rol** (2026-11-24, `cuentasQueVenden()`).
      const cuenta = cuentasQueVenden((await leerUsuarios()).filter((c) => c.activo), [], await leerPresupuestos())
        .find((c) => normalizar(c.usuario) === u);
      if (cuenta) s = fichaDe([], cuenta.usuario, cuenta.nombre);
    }
    if (!s) return NextResponse.json({ error: 'Ese vendedor o socio comercial no está.' }, { status: 404 });
    // Crear uno que ya existe lo devuelve tal cual: copiarlo dos veces no lo cambia.
    const token = accion === 'quitar' ? '' : accion === 'crear' && s.token ? s.token : nuevoToken();
    if (token !== s.token) await guardarVendedor({ ...s, token });
    if (token !== s.token) {
      await anotar({ ...(await quienEs(req)),
        accion: accion === 'quitar' ? 'Quitó un link personal'
          : accion === 'renovar' ? 'Renovó un link personal' : 'Creó un link personal',
        detalle: `${s.nombre} · ${s.tipo === 'socio' ? 'socio comercial' : 'vendedor'}` });
    }
    return NextResponse.json({ usuario: s.usuario, token });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
