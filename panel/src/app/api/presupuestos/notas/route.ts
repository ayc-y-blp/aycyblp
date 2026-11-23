import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { HOJA_NOTAS, puedeVerNotas, medioDe, LARGO_NOTA, sePuedeCorregir } from '@/lib/notas';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, agregarNota, corregirNota, guardarRecontacto, anotar, leerNotas } from '@/lib/datos';
import { grupoDe } from '@/lib/cotizar';
import { fechaDeAgenda } from '@/lib/agenda';
import { hoy, esFecha } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';


/**
 * **Las notas del vendedor y su próximo contacto** (2026-11-23, ver
 * `lib/notas.ts` y `lib/agenda.ts`).
 *
 * - `POST { id, nota?, medio?, recontactar? }`: anota lo conversado —en el
 *   grupo de alternativas, que es una sola conversación— y, si viene,
 *   cambia el día en que se le vuelve a hablar (`Recontactar el`) en todas
 *   las alternativas vivas del grupo. Con nota, `Último seguimiento` pasa a
 *   hoy: se habló con el cliente, y el recordatorio de siempre se posterga.
 * - `PATCH { id, nota }`: su autor corrige el texto de una nota, el mismo
 *   día. No se borran: son la historia con ese cliente.
 *
 * **Quién**: el vendedor de esa cotización y la gerencia (`puedeVerNotas()`;
 * lo decidió el cliente: *"solo ve el vendedor y la gerencia"*). El texto de
 * la nota no va a la bitácora: ahí lo leen otros roles.
 *
 * **Lecturas de Google**: una tanda (`Presupuestos`, `Notas`) y lo que leen
 * las escrituras para saber dónde escribir.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_NOTAS], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const quien = await quienEs(req);
    const lista = await leerPresupuestos();
    const p = lista.find((x) => x.id === String(cuerpo.id ?? '').trim());
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    const grupo = grupoDe(p);
    const delGrupo = lista.filter((x) => grupoDe(x) === grupo);
    if (!delGrupo.some((x) => puedeVerNotas(quien.rol, quien.usuario, x.creadoPor))) {
      return NextResponse.json({ error: 'Las notas de esta cotización las anotan su vendedor y la gerencia.', permiso: true },
        { status: 403 });
    }
    const texto = String(cuerpo.nota ?? '').trim().slice(0, LARGO_NOTA);
    const recontactar = cuerpo.recontactar === undefined ? undefined : fechaDeAgenda(cuerpo.recontactar, hoy());
    if (recontactar === null) {
      return NextResponse.json({ error: 'El día para volver a contactarlo tiene que ser de hoy en adelante.' }, { status: 400 });
    }
    if (recontactar && esFecha(p.fecha) && recontactar > p.fecha) {
      return NextResponse.json({ error: 'El día para volver a contactarlo es después del evento: elige uno antes.' }, { status: 400 });
    }
    if (!texto && recontactar === undefined) {
      return NextResponse.json({ error: 'Escribe qué conversaron, o elige cuándo volver a contactarlo.' }, { status: 400 });
    }
    const medio = medioDe(cuerpo.medio);
    if (texto) {
      await agregarNota({ presupuesto: grupo, cliente: p.idCliente ?? '', cuando: ahoraEnChile(), quien: quien.usuario,
        medio, nota: texto });
    }
    const proximo = recontactar === undefined ? (p.recontactar ?? '') : recontactar;
    await guardarRecontacto(grupo, proximo, texto ? hoy() : null);
    await anotar({ ...quien, accion: texto ? 'Anotó una conversación con un cliente' : 'Cambió el próximo contacto',
      detalle: `${folioDe(p)}${medio ? ` · ${medio}` : ''} · próximo contacto: ${proximo || 'sin fecha'}` });
    return NextResponse.json({ ok: true, recontactar: proximo });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
});

export const PATCH = conLecturas([HOJA_NOTAS], async function PATCH(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const quien = await quienEs(req);
    const id = String(cuerpo.id ?? '').trim();
    const texto = String(cuerpo.nota ?? '').trim().slice(0, LARGO_NOTA);
    if (!texto) return NextResponse.json({ error: 'Una nota no queda vacía: se corrige, no se borra.' }, { status: 400 });
    const n = (await leerNotas()).find((x) => x.id === id);
    if (!n) return NextResponse.json({ error: 'Esa nota ya no está.' }, { status: 404 });
    if (!sePuedeCorregir(n, quien.usuario, hoy())) {
      return NextResponse.json({ error: 'Una nota la corrige quien la escribió, el mismo día.', permiso: true }, { status: 403 });
    }
    await corregirNota(id, texto);
    await anotar({ ...quien, accion: 'Corrigió una nota de una cotización', detalle: n.presupuesto });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
});
