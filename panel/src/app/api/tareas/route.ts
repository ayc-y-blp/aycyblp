import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import {
  HOJA_TAREAS, VEN_TODAS, ROLES_CON_TAREAS, tareasVisibles, ordenarTareas, limpiarTareaNueva, aplicarAccion,
  rolesDelDestino, personasDelDestino, ESTADO_TAREA, type AccionTarea
} from '@/lib/tareas';
import { NOMBRE_ROL } from '@/lib/roles';
import { exigir, quienEs } from '@/lib/permisos';
import { leerTareas, leerUsuarios, agregarTarea, cambiarTarea, anotar } from '@/lib/datos';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * **Las tareas internas** (2026-11-26, `lib/tareas.ts`).
 *
 * - `GET`: las tareas que la cuenta ve (las suyas, o todas si es gerencia o
 *   administrador), a quién se le puede mandar una y los nombres de cada
 *   cuenta.
 * - `POST { para, que, plazo?, enlace? }`: manda una.
 * - `PATCH { id, accion, texto? }`: ✓ Hecha, ❓ Preguntar, responder, anular
 *   o reabrir. Lo que se puede lo decide `puedeHacer()`, con lo escrito en la
 *   planilla al momento.
 *
 * **Quién**: todas las cuentas que entran al panel (`tareas`). El texto de la
 * tarea no va a la bitácora: ahí lo leen otros roles. Va quién a quién.
 *
 * **Lecturas de Google**: una tanda (`Tareas` y `Usuarios`); cambiar una
 * relee `Tareas` para saber en qué fila escribir.
 */

const nombreDe = (c: { nombre: string; usuario: string }) => c.nombre || c.usuario;

async function cuentas() {
  const lista = await leerUsuarios();
  const activas = lista.filter((c) => c.activo && ROLES_CON_TAREAS.includes(c.rol));
  return {
    lista,
    // **La identidad es el nombre**, como en la sesión y en las notas: `De` y
    // `Para` guardan el nombre de la cuenta. El usuario de entrar también se
    // traduce, por si alguien lo escribe a mano en la planilla.
    nombres: Object.fromEntries(lista.flatMap((c) => [[c.usuario, nombreDe(c)], [nombreDe(c), nombreDe(c)]])) as Record<string, string>,
    cuentasPorNombre: lista.map((c) => ({ usuario: nombreDe(c), activo: c.activo && ROLES_CON_TAREAS.includes(c.rol) })),
    personas: activas.map((c) => ({ usuario: nombreDe(c), nombre: nombreDe(c), rol: c.rol }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  };
}

const paraEnPalabras = (para: string, nombres: Record<string, string>) => {
  return [...personasDelDestino(para).map((p) => nombres[p] ?? p),
    ...rolesDelDestino(para).map((r) => `todos los de ${NOMBRE_ROL[r] ?? r}`)].join(' y ');
};

export const GET = conLecturas([HOJA_TAREAS, HOJA_USUARIOS], async function GET(req: Request) {
  const no = await exigir(req, 'tareas');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const yo = { usuario: quien.usuario, rol: quien.rol };
    const [tareas, c] = await Promise.all([leerTareas(), cuentas()]);
    const visibles = ordenarTareas(tareasVisibles(tareas, yo), hoy()).map(({ fila: _f, ...t }) => t);
    return NextResponse.json({
      tareas: visibles, yo, hoy: hoy(), nombres: c.nombres, personas: c.personas,
      roles: ROLES_CON_TAREAS.map((r) => ({ rol: r, nombre: NOMBRE_ROL[r] ?? r,
        cuantos: c.personas.filter((p) => p.rol === r).length })).filter((r) => r.cuantos > 0),
      venTodas: VEN_TODAS.includes(quien.rol)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas([HOJA_TAREAS, HOJA_USUARIOS], async function POST(req: Request) {
  const no = await exigir(req, 'tareas');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const c = await cuentas();
    const limpio = limpiarTareaNueva(cuerpo, {
      // 📌 A mí: uno mismo siempre vale, también la cuenta de emergencia, que no está en Usuarios.
      cuentas: [...c.cuentasPorNombre, { usuario: quien.usuario, activo: true }], hoy: hoy()
    });
    if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });
    const t = await agregarTarea({
      ...limpio, creada: ahoraEnChile(), de: quien.usuario, estado: ESTADO_TAREA.pendiente,
      conversacion: [], cerradaPor: '', cerrada: ''
    });
    await anotar({ ...quien, accion: 'Mandó una tarea',
      detalle: `${t.id} · para ${paraEnPalabras(t.para, c.nombres)}${t.plazo ? ` · plazo ${t.plazo}` : ''}` });
    const { fila: _f, ...sinFila } = t;
    return NextResponse.json({ ok: true, tarea: sinFila });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

const ACCIONES: AccionTarea[] = ['hecha', 'preguntar', 'responder', 'anular', 'reabrir'];
const EN_LA_BITACORA: Record<AccionTarea, string> = {
  hecha: 'Marcó una tarea hecha', preguntar: 'Preguntó sobre una tarea', responder: 'Contestó una pregunta de una tarea',
  anular: 'Anuló una tarea', reabrir: 'Reabrió una tarea'
};

export const PATCH = conLecturas([HOJA_TAREAS], async function PATCH(req: Request) {
  const no = await exigir(req, 'tareas');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const accion = String(cuerpo.accion ?? '') as AccionTarea;
    if (!ACCIONES.includes(accion)) return NextResponse.json({ error: 'No sé qué hacer con esa tarea.' }, { status: 400 });
    const yo = { usuario: quien.usuario, rol: quien.rol };
    const r = await cambiarTarea(String(cuerpo.id ?? '').trim(),
      (t) => aplicarAccion(t, accion, String(cuerpo.texto ?? ''), yo, ahoraEnChile()));
    if (!r) return NextResponse.json({ error: 'Esa tarea ya no está.' }, { status: 404 });
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 409 });
    await anotar({ ...quien, accion: EN_LA_BITACORA[accion], detalle: r.id });
    return NextResponse.json({ ok: true, tarea: r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
