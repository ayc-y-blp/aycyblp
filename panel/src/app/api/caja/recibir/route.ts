import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CAJA, TIPO_CAJA, partesRecibido, esLaPersona, marcaRecibido, MAXIMO_CAJA } from '@/lib/caja';
import { exigir, quienEs } from '@/lib/permisos';
import { leerCaja, editarMovimiento, anotar } from '@/lib/datos';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

const pesos = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

/**
 * ***✓ Recibí $X*** (2026-11-23, `lib/caja.ts`): quien recibe una entrega de
 * la caja chica la confirma. Solo esa persona. Si recibió otro monto, lo
 * escribe, y queda marcado para pagos.
 */
export const POST = conLecturas([HOJA_CAJA], async function POST(req: Request) {
  const no = await exigir(req, 'recibirCaja');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const m = (await leerCaja()).find((x) => x.id === String(cuerpo.id ?? ''));
    if (!m || m.tipo !== TIPO_CAJA.entrega) return NextResponse.json({ error: 'Esa entrega ya no está.' }, { status: 404 });
    if (partesRecibido(m)) return NextResponse.json({ error: 'Esa entrega ya se recibió.' }, { status: 409 });
    if (!esLaPersona(m.para, { usuario: quien.usuario })) {
      return NextResponse.json({ error: `Esa entrega es para ${m.para}: la confirma esa persona.`, permiso: true }, { status: 403 });
    }
    const monto = cuerpo.monto === undefined || cuerpo.monto === null || cuerpo.monto === ''
      ? m.monto : Math.round(Number(String(cuerpo.monto).replace(/[$.\s]/g, '')));
    if (!Number.isFinite(monto) || monto < 0 || monto > MAXIMO_CAJA) {
      return NextResponse.json({ error: 'Escribe cuánto recibiste.' }, { status: 400 });
    }
    await editarMovimiento(m.id, { recibido: marcaRecibido(ahoraEnChile(), quien.usuario, monto) });
    await anotar({ ...quien, accion: 'Recibió la caja chica',
      detalle: `de ${m.quien} · ${pesos(monto)}${monto !== m.monto ? ` de ${pesos(m.monto)} entregados` : ''}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
