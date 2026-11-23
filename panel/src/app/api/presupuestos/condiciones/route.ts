import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, guardarPresupuesto, leerConfig, anotar } from '@/lib/datos';
import { HOJA_PRESUPUESTOS, folioDe, ESTADO_PRESUPUESTO, estadoNormal } from '@/lib/presupuestos';
import { HOJA_CONFIG } from '@/lib/config';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { ahoraEnChile } from '@/lib/bitacora';
import {
  CAMPOS_CONDICION, MAXIMO_CONDICION, topesDe, aprobadasDe, masGeneroso, escribirPedido, leerPedido,
  marcaCondiciones, condicionesEspecialesDe, frasePedido, type Topes
} from '@/lib/condiciones';

export const dynamic = 'force-dynamic';

/**
 * **Condiciones especiales** (2026-11-23, lo pidió el cliente: *"deja la
 * opción de solicitar otro monto para esta regla. Y ahí tiene que confirmar
 * la gerencia o el encargado de pagos"*). Ver `lib/condiciones.ts`.
 *
 * - `pedir` (quien puede tocar la cotización): el vendedor pide algo más
 *   generoso que los topes de Configuración —más devolución, menos anticipo,
 *   más descuento…—, con su motivo. No cambia la cotización: queda esperando
 *   en la bandeja de quien aprueba.
 * - `aprobar` (permiso `showBajoMinimo`: la gerencia general, el encargado de
 *   pagos y el administrador): lo pedido pasa a ser el tope de esa
 *   cotización, y se escribe en ella. El descuento solo sube el tope: cuánto
 *   se descuenta y en qué línea lo pone el vendedor.
 * - `rechazar` (el mismo permiso): con motivo, que el vendedor ve en la
 *   cotización. La cotización sigue con los topes de Configuración.
 *
 * Todo queda en la bitácora.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_CONFIG], async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const accion = String(b.accion ?? '');
    if (!['pedir', 'aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
    }
    const no = await exigir(req, accion === 'pedir' ? 'presupuestos' : 'showBajoMinimo');
    if (no) return no;
    const quien = await quienEs(req);

    const [lista, cfg] = await Promise.all([leerPresupuestos(), leerConfig()]);
    const p = lista.find((x) => x.id === String(b.id ?? '').trim());
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    const estado = estadoNormal(p.estado);
    if (estado === ESTADO_PRESUPUESTO.cancelada || estado === ESTADO_PRESUPUESTO.rechazado
        || estado === ESTADO_PRESUPUESTO.noElegida) {
      return NextResponse.json({ error: 'Esa cotización ya no está en carrera.' }, { status: 409 });
    }
    const { fila: _f, ...resto } = p;
    const folio = folioDe(p);
    const base = topesDe(cfg);
    const motivo = String(b.motivo ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const actual = condicionesEspecialesDe(p.condicionesEspeciales);

    if (accion === 'pedir') {
      if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
        return NextResponse.json({ error: 'Esa cotización no es tuya.', permiso: true }, { status: 403 });
      }
      // Solo números, dentro de lo posible, y solo lo que de verdad pasa el
      // tope de Configuración: lo demás no hace falta pedirlo.
      const crudo = (b.pedido ?? {}) as Record<string, unknown>;
      const nuevo: Partial<Topes> = {};
      for (const c of CAMPOS_CONDICION) {
        const v = Math.round(Number(crudo[c]));
        if (crudo[c] === undefined || crudo[c] === '' || !Number.isFinite(v)) continue;
        if (v < 0 || v > MAXIMO_CONDICION[c]) continue;
        if (masGeneroso(c, v, base)) nuevo[c] = v;
      }
      if (!Object.keys(nuevo).length) {
        return NextResponse.json({
          error: 'Lo que pides ya cabe en lo que permite Configuración: no hace falta pedirlo.'
        }, { status: 400 });
      }
      if (motivo.length < 5) {
        return NextResponse.json({ error: 'Escribe por qué: lo lee quien lo aprueba.' }, { status: 400 });
      }
      // Lo ya aprobado se mantiene en el pedido: aprobar el nuevo no le quita
      // lo anterior.
      const pedido = { ...aprobadasDe(p), ...nuevo };
      const marca = marcaCondiciones('pedida', quien.usuario, ahoraEnChile(), motivo);
      await guardarPresupuesto({ ...resto, condicionesPedidas: escribirPedido(pedido), condicionesEspeciales: marca });
      await anotar({ ...quien, accion: 'Pidió condiciones especiales',
        detalle: `${folio} · ${frasePedido(nuevo, base)} · ${motivo}` });
      return NextResponse.json({ ok: true, condicionesPedidas: escribirPedido(pedido), condicionesEspeciales: marca });
    }

    if (actual.estado !== 'pedida') {
      return NextResponse.json({ error: 'Ese pedido ya no está esperando: alguien lo resolvió.' }, { status: 409 });
    }
    const pedido = leerPedido(p.condicionesPedidas);

    if (accion === 'aprobar') {
      const cambia: Partial<typeof resto> = {};
      if (typeof pedido.anticipo === 'number') { cambia.anticipo = pedido.anticipo; cambia.anticipoMonto = null; }
      if (typeof pedido.saldoDias === 'number') cambia.saldoDias = pedido.saldoDias;
      if (typeof pedido.cambiosFecha === 'number') cambia.cambiosFecha = pedido.cambiosFecha;
      if (typeof pedido.cancelacionDias === 'number') cambia.cancelacionDias = pedido.cancelacionDias;
      if (typeof pedido.reembolso === 'number') cambia.reembolso = pedido.reembolso;
      const marca = marcaCondiciones('aprobada', quien.usuario, ahoraEnChile(), motivo);
      await guardarPresupuesto({ ...resto, ...cambia, condicionesEspeciales: marca });
      await anotar({ ...quien, accion: 'Aprobó condiciones especiales',
        detalle: `${folio} · ${frasePedido(pedido, base)}${actual.quien ? ` · las pidió ${actual.quien}` : ''}`
          + (motivo ? ` · ${motivo}` : '') });
      return NextResponse.json({ ok: true, condicionesEspeciales: marca });
    }

    // rechazar
    if (motivo.length < 3) return NextResponse.json({ error: 'Escribe el motivo: lo ve el vendedor.' }, { status: 400 });
    const marca = marcaCondiciones('rechazada', quien.usuario, ahoraEnChile(), motivo);
    await guardarPresupuesto({ ...resto, condicionesEspeciales: marca });
    await anotar({ ...quien, accion: 'Rechazó condiciones especiales',
      detalle: `${folio} · ${frasePedido(pedido, base)} · ${motivo}` });
    return NextResponse.json({ ok: true, condicionesEspeciales: marca });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});
