/**
 * **El simulador de evento** (2026-11-23). La cuenta vive en
 * `lib/simulador.ts`; acá se juntan los datos y se decide qué ve cada uno.
 *
 * `POST {lineas, descuentoTotal, invitados}` → lo que cuesta ese evento y lo
 * que deja. No escribe nada.
 *
 * - Quien puede cotizar (`presupuestos`) puede simular.
 * - **Los números los ve solo quien tiene `costos`** —gerencia, pagos y el
 *   administrador—. Los demás reciben la señal y nada más: ni el costo, ni
 *   el margen, ni qué dato falta.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { puede, type Rol } from '@/lib/auth';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_PUESTOS, HOJA_TRABAJADORES } from '@/lib/equipo';
import { HOJA_CONFIG } from '@/lib/config';
import { leerMenus, leerPuestos, leerTrabajadores, leerConfig } from '@/lib/datos';
import { simular, aGastos, jornadaPorPuesto, soloLaSenal } from '@/lib/simulador';

export const dynamic = 'force-dynamic';

export const POST = conLecturas([HOJA_MENUS, HOJA_PUESTOS, HOJA_TRABAJADORES, HOJA_CONFIG], async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const lineas = (Array.isArray(cuerpo.lineas) ? cuerpo.lineas : []).slice(0, 200).map((l: Record<string, unknown>) => ({
      concepto: String(l?.concepto ?? '').trim(),
      cantidad: Math.max(0, Number(l?.cantidad) || 0),
      precio: Math.max(0, Number(l?.precio) || 0),
      descuento: Math.min(100, Math.max(0, Number(l?.descuento) || 0)),
      ivaIncluido: l?.ivaIncluido !== false
    }));
    const [menus, puestos, trabajadores, cfg] = await Promise.all([leerMenus(), leerPuestos(), leerTrabajadores(), leerConfig()]);
    const s = simular({
      lineas, descuentoTotal: Math.min(100, Math.max(0, Number(cuerpo.descuentoTotal) || 0)),
      invitados: Number(cuerpo.invitados) || 0,
      catalogo: menus, puestos, jornadas: jornadaPorPuesto(trabajadores),
      gastos: aGastos(cfg.gastosEvento), minimoPct: cfg.margenMinimo
    });
    return NextResponse.json(puede(quien.rol as Rol, 'costos') ? { ...s, veCostos: true } : { ...soloLaSenal(s), veCostos: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
