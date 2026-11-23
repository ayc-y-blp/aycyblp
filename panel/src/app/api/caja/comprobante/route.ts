import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CAJA } from '@/lib/caja';
import { exigirVer } from '@/lib/permisos';
import { leerCaja } from '@/lib/datos';
import { leerComprobante, errorDeDrive } from '@/lib/drive';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** La boleta o el comprobante de un movimiento de la caja chica, a través del panel (nunca por un link público). */
export const GET = conLecturas([HOJA_CAJA], async function GET(req: Request) {
  const no = await exigirVer(req, 'caja');
  if (no) return no;
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const m = (await leerCaja()).find((x) => x.id === id);
  if (!m?.comprobante) return NextResponse.json({ error: 'Ese movimiento no tiene foto.' }, { status: 404 });
  try {
    const a = await leerComprobante(m.comprobante);
    return new NextResponse(new Uint8Array(a.datos), {
      headers: {
        'content-type': a.tipo,
        'content-disposition': `inline; filename="${a.nombre.replace(/"/g, '')}"`,
        'cache-control': 'private, no-store'
      }
    });
  } catch (e) {
    console.error('[caja:comprobante]', e);
    return NextResponse.json({ error: errorDeDrive(e) }, { status: 502 });
  }
});
