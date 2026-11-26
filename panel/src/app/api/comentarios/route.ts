import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { quienEs } from '@/lib/permisos';
import { ROL } from '@/lib/auth';
import { NOMBRE_ROL } from '@/lib/roles';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy } from '@/lib/fechas';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import {
  limpiarComentario, HOJA_COMENTARIOS, LEEN_TODOS, ESTADOS_COMENTARIO, PRIORIDADES, comentariosVisibles,
  ordenarComentarios, esSuyo, nuevoIdComentario, LARGO_TEXTO
} from '@/lib/comentarios';
import { HOJA_TAREAS, ESTADO_TAREA, limpiarTareaNueva, ROLES_CON_TAREAS } from '@/lib/tareas';
import {
  leerComentarios, agregarComentarios, cambiarComentario, agregarTarea, leerUsuarios, anotar
} from '@/lib/datos';

export const dynamic = 'force-dynamic';

/**
 * **Los comentarios del equipo** (`lib/comentarios.ts`). Desde el 2026-11-26
 * viven en la planilla del panel, pestaña `Comentarios`.
 *
 * - `POST`: anota uno desde 💬 Comentar. **Cualquier cuenta con sesión**: no
 *   es un permiso de la tabla, es la forma de avisar que algo falla o falta.
 *   Nombre y rol salen de la sesión, no del navegador. Una escritura, ninguna
 *   lectura.
 * - `GET`: los que la cuenta ve —todos la gerencia y el administrador; los
 *   demás, los suyos—, con las cuentas a las que se les puede pasar como tarea.
 * - `PATCH { id, accion }`:
 *   - `responder` (`texto`, `estado`): la gerencia y el administrador.
 *   - `estado` / `prioridad`: la gerencia y el administrador.
 *   - `tarea` (`para`, `plazo`): la gerencia y el administrador; crea la tarea
 *     con el texto del comentario y la deja anotada en él.
 *   - `visto`: quien lo escribió, al leer la respuesta.
 *
 * **Lecturas de Google**: el `GET` y el `PATCH`, una tanda (`Comentarios`,
 * `Usuarios`, `Tareas`); cambiar uno relee `Comentarios`.
 */

const sinSesion = () => NextResponse.json(
  { error: 'Tu sesión caducó o no estás identificado. Vuelve a entrar.' }, { status: 401 });

export async function POST(req: Request) {
  const quien = await quienEs(req);
  if (quien.rol === ROL.ninguno) return sinSesion();
  const limpio = limpiarComentario(await req.json().catch(() => null));
  if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
  const rol = NOMBRE_ROL[quien.rol] ?? quien.rol;
  const c = limpio.comentario;
  try {
    await agregarComentarios([{
      id: nuevoIdComentario(), fecha: ahoraEnChile(),
      rol: quien.rolReal ? `${rol} (visto por ${NOMBRE_ROL[quien.rolReal] ?? quien.rolReal})` : rol,
      nombre: quien.usuario, tipo: c.tipo, donde: c.pantalla, texto: c.texto, para: c.para, estado: 'Nuevo',
      prioridad: '', respuesta: '', resuelto: '', respondidoPor: '', vista: '', tarea: ''
    }]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'No se pudo guardar el comentario.' }, { status: 500 });
  }
}

export const GET = conLecturas([HOJA_COMENTARIOS, HOJA_USUARIOS], async function GET(req: Request) {
  const quien = await quienEs(req);
  if (quien.rol === ROL.ninguno) return sinSesion();
  try {
    const [lista, cuentas] = await Promise.all([leerComentarios(), leerUsuarios()]);
    const todos = LEEN_TODOS.includes(quien.rol);
    const visibles = ordenarComentarios(comentariosVisibles(lista, quien.rol, quien.usuario))
      .map(({ fila: _f, ...c }) => c);
    return NextResponse.json({
      comentarios: visibles, todos, yo: quien.usuario, hoy: hoy(),
      // A quién se le puede pasar como tarea: solo lo necesita quien los trabaja.
      personas: todos ? cuentas.filter((c) => c.activo && ROLES_CON_TAREAS.includes(c.rol))
        .map((c) => ({ usuario: c.nombre || c.usuario, nombre: c.nombre || c.usuario, rol: c.rol }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : []
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const PATCH = conLecturas([HOJA_COMENTARIOS, HOJA_USUARIOS, HOJA_TAREAS], async function PATCH(req: Request) {
  const quien = await quienEs(req);
  if (quien.rol === ROL.ninguno) return sinSesion();
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const accion = String(cuerpo.accion ?? '');
    const id = String(cuerpo.id ?? '').trim();
    const todos = LEEN_TODOS.includes(quien.rol);
    if (accion !== 'visto' && !todos) {
      return NextResponse.json({ error: 'Los comentarios los contesta la gerencia general o el administrador.', permiso: true },
        { status: 403 });
    }
    const ahora = ahoraEnChile();
    const texto = String(cuerpo.texto ?? '').trim().slice(0, LARGO_TEXTO);

    // Pasar a tarea: primero se crea la tarea y después se anota en el comentario.
    let tareaNueva = '';
    if (accion === 'tarea') {
      const cuentas = await leerUsuarios();
      const actual = (await leerComentarios()).find((x) => x.id === id);
      if (!actual) return NextResponse.json({ error: 'Ese comentario ya no está.' }, { status: 404 });
      const limpio = limpiarTareaNueva({
        para: cuerpo.para, plazo: cuerpo.plazo,
        que: `${texto || actual.texto}${actual.para ? ` (para: ${actual.para})` : ''} · 💬 de ${actual.nombre}${actual.donde ? `, en ${actual.donde}` : ''}`
      }, {
        cuentas: cuentas.map((c) => ({ usuario: c.nombre || c.usuario, activo: c.activo && ROLES_CON_TAREAS.includes(c.rol) })),
        hoy: hoy()
      });
      if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
      const t = await agregarTarea({ ...limpio, creada: ahora, de: quien.usuario, estado: ESTADO_TAREA.pendiente,
        conversacion: [], cerradaPor: '', cerrada: '' });
      tareaNueva = t.id;
    }

    const r = await cambiarComentario(id, (c) => {
      switch (accion) {
        case 'visto':
          if (!esSuyo(c, quien.usuario)) return { error: 'Solo quien lo escribió marca la respuesta como vista.' };
          return { ...c, vista: ahora };
        case 'responder': {
          if (!texto) return { error: 'Escribe la respuesta.' };
          const estado = ESTADOS_COMENTARIO.find((x) => x === cuerpo.estado) ?? 'Resuelto';
          return { ...c, respuesta: texto, respondidoPor: quien.usuario, vista: '', estado,
            resuelto: estado === 'Resuelto' || estado === 'No se hará' ? hoy() : '' };
        }
        case 'estado': {
          const estado = ESTADOS_COMENTARIO.find((x) => x === cuerpo.estado);
          if (!estado) return { error: 'Ese estado no existe.' };
          return { ...c, estado, resuelto: estado === 'Resuelto' || estado === 'No se hará' ? (c.resuelto || hoy()) : '' };
        }
        case 'prioridad': {
          const prioridad = cuerpo.prioridad === '' ? '' : PRIORIDADES.find((x) => x === cuerpo.prioridad);
          if (prioridad === undefined) return { error: 'Esa prioridad no existe.' };
          return { ...c, prioridad };
        }
        case 'tarea':
          return { ...c, tarea: tareaNueva, estado: c.estado === 'Nuevo' ? 'En curso' : c.estado };
        default:
          return { error: 'No sé qué hacer con ese comentario.' };
      }
    });
    if (!r) return NextResponse.json({ error: 'Ese comentario ya no está.' }, { status: 404 });
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
    if (accion !== 'visto') {
      await anotar({ ...quien, accion: accion === 'tarea' ? 'Pasó un comentario a tarea'
        : accion === 'responder' ? 'Contestó un comentario' : 'Cambió un comentario',
        detalle: `${r.id} · de ${r.nombre}${accion === 'tarea' ? ` · tarea ${tareaNueva}` : ` · ${r.estado}`}` });
    }
    return NextResponse.json({ ok: true, comentario: r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
