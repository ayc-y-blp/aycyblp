import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { leerUsuarios, leerCuentas, guardarUsuarios, anotar } from '@/lib/datos';
import { empresaActual } from '@/lib/empresa';
import { CASA, empresasEncendidas } from '@/lib/empresas';
import {
  hashDeClave, esRolDeCuenta, LARGO_MINIMO_CLAVE, type Usuario
} from '@/lib/usuarios';
import { exigir, quienEs } from '@/lib/permisos';
import { ROL, type Rol } from '@/lib/auth';
import { esSi } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * **Las huellas no salen de acá.** Son lo que protege las contraseñas si
 * alguien llega a la planilla; mandarlas al navegador las pondría además en
 * la memoria de cada pestaña abierta, sin que nadie las necesite. Lo único
 * que la pantalla precisa saber es **si la cuenta tiene clave puesta**.
 */
const sinHuellas = (lista: Usuario[]) =>
  lista.map(({ huella, ...resto }) => ({ ...resto, tieneClave: !!huella }));

export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigir(req, 'usuarios');
  if (no) return no;
  try {
    // **Las cuentas se administran en la casa** (2026-11-23): desde otra
    // empresa se ven —con el rol que tienen ahí— y no se cambian.
    const aca = empresaActual();
    const otras = empresasEncendidas(process.env).filter((e) => e.id !== CASA)
      .map((e) => ({ id: e.id, nombre: e.nombre }));
    return NextResponse.json({
      usuarios: sinHuellas(await leerUsuarios()),
      ...(aca.id === CASA ? { otrasEmpresas: otras } : { soloLectura: true, empresa: aca.nombre })
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

const SOLO_EN_LA_CASA = 'Las cuentas se cambian en el panel de Brasas de Lo Pirque: son las mismas para las dos empresas.';

/**
 * El rol en las otras empresas: de las encendidas, lo que mandó la pantalla
 * (en blanco quita el acceso); de las que no, lo que ya había, sin tocar.
 */
function rolesLimpios(
  mandados: unknown, previos: Record<string, Rol> | undefined, encendidas: string[]
): { roles?: Record<string, Rol> } {
  const roles: Record<string, Rol> = { ...(previos ?? {}) };
  for (const id of encendidas) {
    const r = normalizar(String((mandados as Record<string, unknown> | undefined)?.[id] ?? ''));
    if (esRolDeCuenta(r)) roles[id] = r as Rol; else delete roles[id];
  }
  return Object.keys(roles).length ? { roles } : {};
}

/**
 * Guarda la lista: nombres, roles y quién está activo.
 *
 * **Las contraseñas no se tocan por acá**, se arrastran las que ya había
 * buscándolas por nombre de usuario. Cambiar una es otra operación (POST),
 * y separarlas evita el accidente de que guardar la lista deje a alguien sin
 * poder entrar.
 */
export const PUT = conLecturas([], async function PUT(req: Request) {
  const no = await exigir(req, 'usuarios');
  if (no) return no;
  try {
    if (empresaActual().id !== CASA) return NextResponse.json({ error: SOLO_EN_LA_CASA }, { status: 409 });
    const { usuarios } = await req.json();
    if (!Array.isArray(usuarios)) {
      return NextResponse.json({ error: 'Falta la lista de usuarios.' }, { status: 400 });
    }

    // Lo que no viene del navegador se conserva de la fila de antes: la
    // huella de la contraseña y los avisos que la persona ya cerró.
    const previas = new Map(
      (await leerCuentas()).map((u) => [normalizar(u.usuario), u])
    );
    const encendidas = empresasEncendidas(process.env).filter((e) => e.id !== CASA).map((e) => e.id);
    const limpia: Usuario[] = [];
    const vistos = new Set<string>();
    for (const u of usuarios) {
      // El nombre de usuario no lleva espacios: se escribe al entrar, y un
      // espacio invisible al final es media hora de "no me deja entrar".
      const usuario = String(u?.usuario ?? '').trim().replace(/\s+/g, '');
      if (!usuario || vistos.has(normalizar(usuario))) continue;
      vistos.add(normalizar(usuario));
      const rol = normalizar(String(u?.rol ?? ''));
      limpia.push({
        nombre: String(u?.nombre ?? '').trim() || usuario,
        usuario,
        rol: esRolDeCuenta(rol) ? (rol as Rol) : ROL.encargado,
        activo: u?.activo === undefined ? true : esSi(u.activo),
        huella: previas.get(normalizar(usuario))?.huella ?? '',
        avisosLeidos: previas.get(normalizar(usuario))?.avisosLeidos ?? [],
        // La vista gerencia: un agregado a la cuenta, no un rol. Al
        // administrador no le suma nada —ya ve todo—, así que no se guarda.
        gerencia: u?.gerencia === true && rol !== ROL.admin,
        ...rolesLimpios(u?.roles, previas.get(normalizar(usuario))?.roles, encendidas)
      });
    }

    await guardarUsuarios(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió las cuentas del panel',
      detalle: limpia.map((u) => `${u.usuario} (${u.rol}${u.activo ? '' : ', inactivo'}`
                       + Object.entries(u.roles ?? {}).map(([e, r]) => `, en ${e}: ${r}`).join('') + ')')
                     .join(' · ') });
    return NextResponse.json({ usuarios: sinHuellas(limpia) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Le pone contraseña a una cuenta.
 *
 * La clave llega en claro —no hay otra forma, viene de un formulario— y se
 * guarda como huella scrypt. **Nunca se devuelve ni se anota.**
 */
export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'usuarios');
  if (no) return no;
  try {
    const { usuario, clave } = await req.json();
    const texto = String(clave ?? '');
    if (texto.length < LARGO_MINIMO_CLAVE) {
      return NextResponse.json(
        { error: `La contraseña necesita al menos ${LARGO_MINIMO_CLAVE} caracteres. ` +
                 'Tres o cuatro palabras pegadas funcionan bien.' },
        { status: 400 }
      );
    }

    if (empresaActual().id !== CASA) return NextResponse.json({ error: SOLO_EN_LA_CASA }, { status: 409 });
    const lista = await leerCuentas();
    const i = lista.findIndex((u) => normalizar(u.usuario) === normalizar(String(usuario ?? '')));
    if (i === -1) {
      return NextResponse.json(
        { error: `No hay ninguna cuenta "${usuario}". Guarda la lista primero.` },
        { status: 404 }
      );
    }

    lista[i] = { ...lista[i], huella: hashDeClave(texto) };
    await guardarUsuarios(lista);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió una contraseña',
      detalle: lista[i].usuario });
    return NextResponse.json({ listo: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
