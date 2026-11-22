/**
 * **Cambiar el vendedor de un cliente o de una cotización** (2026-11-22).
 * Qué cambia y por qué vive en `lib/asignar.ts`; acá solo se comprueba el
 * permiso, se escribe y queda en la bitácora.
 *
 * `POST {presupuesto, a}`: esa cotización pasa al vendedor `a`.
 * `POST {cliente, a, conAbiertas}`: la ficha pasa a `a` y, con
 * `conAbiertas`, también sus cotizaciones abiertas. Las ganadas se quedan.
 *
 * Solo `asignarVendedor`: la gerencia, pagos y el administrador.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { leerPresupuestos, leerClientes, leerUsuarios, guardarPresupuesto, editarCliente, anotar } from '@/lib/datos';
import { planDeAsignacion, vendedoresParaAsignar, detalleDeAsignacion } from '@/lib/asignar';
import { folioDe } from '@/lib/presupuestos';

export const dynamic = 'force-dynamic';

export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_CLIENTES, HOJA_USUARIOS], async function POST(req: Request) {
  const no = await exigir(req, 'asignarVendedor');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const a = String(cuerpo.a ?? '').trim();
    const idPresupuesto = String(cuerpo.presupuesto ?? '').trim();
    const idCliente = String(cuerpo.cliente ?? '').trim();
    const [presupuestos, clientes, usuarios] = await Promise.all([leerPresupuestos(), leerClientes(), leerUsuarios()]);
    const vendedores = vendedoresParaAsignar(usuarios);
    const presupuesto = idPresupuesto ? presupuestos.find((p) => p.id === idPresupuesto) : undefined;
    const cliente = !idPresupuesto && idCliente ? clientes.find((c) => c.id === idCliente) : undefined;
    if (idPresupuesto && !presupuesto) return NextResponse.json({ error: 'Esa cotización ya no existe.' }, { status: 404 });
    if (!idPresupuesto && idCliente && !cliente) return NextResponse.json({ error: 'Ese cliente ya no existe.' }, { status: 404 });

    const plan = planDeAsignacion({ presupuesto, cliente, presupuestos, a, vendedores, conAbiertas: cuerpo.conAbiertas === true });
    if (plan.error) return NextResponse.json({ error: plan.error }, { status: 409 });
    // El nombre de la cuenta: es lo que trae su sesión y contra lo que se compara.
    const nuevo = plan.dueno;

    // La ficha primero: si se corta entremedio, queda la ficha con el
    // vendedor nuevo y alguna cotización con el anterior, y apretar de nuevo
    // termina lo que falte.
    if (plan.cliente && cliente) await editarCliente({ ...cliente, creadoPor: nuevo });
    for (const p of plan.mover) await guardarPresupuesto({ ...p, creadoPor: nuevo });

    const que = presupuesto ? `Cotización N° ${folioDe(presupuesto)}` : `Cliente ${cliente?.id ?? ''}`;
    await anotar({ ...quien, accion: presupuesto ? 'Cambió el vendedor de una cotización' : 'Cambió el vendedor de un cliente',
      detalle: detalleDeAsignacion(plan, que, nuevo, vendedores) });
    return NextResponse.json({ ok: true, movidas: plan.mover.length, quedan: plan.quedan.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
