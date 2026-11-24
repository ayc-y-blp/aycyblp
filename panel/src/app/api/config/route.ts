import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { leerConfig, guardarConfig , anotar, leerUsuarios } from '@/lib/datos';
import { leerConfigDe, aFilasConfig, aDiasSemana, aDescuentos, aFechas, HOJA_CONFIG } from '@/lib/config';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { puede, type Rol } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = conLecturas([HOJA_CONFIG, HOJA_USUARIOS], async function GET(req: Request) {
  const no = await exigirVer(req, 'configurar');
  if (no) return no;
  try {
    // **Las cuentas que cotizan** (2026-11-23): para elegir a quién le llegan
    // las cotizaciones del sitio. Solo el nombre y el rol.
    const cuentas = (await leerUsuarios().catch(() => []))
      .filter((u) => u.activo && puede(u.rol as Rol, 'presupuestos'))
      .map((u) => ({ nombre: u.nombre, rol: u.rol }));
    return NextResponse.json({ config: await leerConfig(), cuentas });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Guarda la configuración.
 *
 * Lo que llega se pasa por aFilasConfig + leerConfigDe antes de escribir:
 * así lo que se guarda es exactamente lo que el panel va a volver a leer, y
 * un valor imposible —un cupo en cero, un corte amarillo por encima del
 * rojo— se corrige acá en vez de quedar escrito en la planilla.
 */
export const PATCH = conLecturas([], async function PATCH(req: Request) {
  const no = await exigir(req, 'configurar');
  if (no) return no;
  try {
    const actual = await leerConfig();
    const pedido = await req.json();

    // Los días pueden llegar como texto desde el formulario ("sáb,dom") o
    // ya como lista. Interpretarlos acá, y no en el navegador, deja la
    // tolerancia a tildes y abreviaturas en un solo lugar. Si no se
    // entiende ni un día, se conservan los que había en vez de dejar la
    // semana sin ninguno.
    if (typeof pedido.diasAbiertos === 'string') {
      pedido.diasAbiertos = aDiasSemana(pedido.diasAbiertos) ?? actual.diasAbiertos;
    }

    // Los descuentos llegan escritos ("5, 10, 15"); mismo criterio que los
    // días. Y la empresa llega de a un campo: se mezcla con la que había en
    // vez de reemplazarla entera, o guardar el RUT borraría la razón social.
    if (typeof pedido.descuentos === 'string') {
      pedido.descuentos = aDescuentos(pedido.descuentos) ?? actual.descuentos;
    }
    // Las fechas sin exclusivo llegan escritas ("2027-05-09, 20-06-2027"):
    // se entienden acá, con la misma tolerancia que al leer la planilla.
    if (typeof pedido.fechasSinExclusivo === 'string') {
      pedido.fechasSinExclusivo = aFechas(pedido.fechasSinExclusivo);
    }
    if (pedido.empresa && typeof pedido.empresa === 'object') {
      pedido.empresa = { ...actual.empresa, ...pedido.empresa };
    }

    const limpia = leerConfigDe(aFilasConfig({ ...actual, ...pedido }));
    await guardarConfig(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió la configuración',
      detalle: Object.keys(pedido ?? {}).join(', ') });
    return NextResponse.json({ config: limpia });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
