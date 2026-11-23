import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CAJA, TIPO_CAJA, partesRecibido, fraseMovimiento } from '@/lib/caja';
import { exigir, quienEs } from '@/lib/permisos';
import { leerCaja, editarMovimiento, anotar } from '@/lib/datos';
import { marcaPlata } from '@/lib/plata';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * ***✓ Revisado*** (2026-11-23, `lib/caja.ts`): pagos comprobó un movimiento
 * de la caja chica —la boleta, el depósito, lo recibido—. No frena nada: es
 * la regla de la plata (`plata.ts`). `revisado: false` lo desmarca.
 */
export const POST = conLecturas([HOJA_CAJA], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const m = (await leerCaja()).find((x) => x.id === String(cuerpo.id ?? ''));
    if (!m) return NextResponse.json({ error: 'Ese movimiento ya no está.' }, { status: 404 });
    if (m.tipo === TIPO_CAJA.cobro) {
      return NextResponse.json({ error: 'Un cobro se revisa con el pago de su reserva.' }, { status: 409 });
    }
    if (m.tipo === TIPO_CAJA.entrega && !partesRecibido(m)) {
      return NextResponse.json({ error: 'Esa entrega todavía no se recibe.' }, { status: 409 });
    }
    const revisado = cuerpo.revisado !== false;
    await editarMovimiento(m.id, { revisado: revisado ? marcaPlata(ahoraEnChile(), quien.usuario) : '' });
    await anotar({ ...quien, accion: revisado ? 'Revisó la caja chica' : 'Quitó la revisión de la caja chica',
      detalle: fraseMovimiento(m) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
