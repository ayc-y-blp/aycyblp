import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { leerColaboradores, guardarColaboradores, anotar } from '@/lib/datos';
import { nuevoToken } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';

export const dynamic = 'force-dynamic';

/**
 * **El link personal de un colaborador extra** (2026-11-12, lo pidió el
 * cliente): crear, renovar o quitar, igual que `/api/equipo/link`. Permiso
 * `links`. Renovar invalida el anterior; quitar lo apaga.
 *
 * **Crear, copiar y renovar piden `enviarLink`; quitar, `links`**
 * (2026-11-23): el encargado de turno también manda el link, igual que en
 * `/api/equipo/link`.
 */
export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'enviarLink');
  if (no) return no;
  try {
    const { nombre, accion } = await req.json();
    const buscado = normalizar(String(nombre ?? ''));
    if (!buscado) return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    if (!['crear', 'renovar', 'quitar'].includes(accion)) {
      return NextResponse.json({ error: 'La acción tiene que ser crear, renovar o quitar.' }, { status: 400 });
    }
    if (accion === 'quitar') {
      const noQuitar = await exigir(req, 'links');
      if (noQuitar) return noQuitar;
    }
    const gente = await leerColaboradores();
    const i = gente.findIndex((c) => normalizar(c.nombre) === buscado);
    if (i === -1) {
      return NextResponse.json({ error: `"${nombre}" no está en la lista de colaboradores.` }, { status: 404 });
    }
    // Crear no pisa uno que ya existe: ver `/api/equipo/link`.
    if (accion === 'crear' && gente[i].token) {
      return NextResponse.json({ nombre: gente[i].nombre, token: gente[i].token });
    }
    const token = accion === 'quitar' ? '' : nuevoToken();
    gente[i] = { ...gente[i], token };
    await guardarColaboradores(gente);
    await anotar({ ...(await quienEs(req)),
      accion: accion === 'quitar' ? 'Quitó un link personal'
            : accion === 'renovar' ? 'Renovó un link personal' : 'Creó un link personal',
      detalle: `${gente[i].nombre} · actividad extra` });
    return NextResponse.json({ nombre: gente[i].nombre, token });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
