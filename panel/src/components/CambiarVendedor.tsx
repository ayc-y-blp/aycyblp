'use client';

/**
 * **Cambiar el vendedor de un cliente o de una cotización** (2026-11-22, lo
 * pidió el cliente: *"porque se va una vendedora, pero el cliente se queda, o
 * porque hay una venta sin asignación"*). Qué cambia y las dos reglas de
 * plata viven en `lib/asignar.ts`; la ruta es `/api/vendedores/asignar`.
 *
 * Un botón secundario —*Vendedor: Carla · Cambiar…*— que abre una ventana
 * con la lista con buscador (`BuscarEnLista`, la regla de las listas que
 * crecen) y **dice qué va a pasar antes de hacerlo**: toca de quién es algo
 * y su comisión, así que se confirma a mano y queda en la bitácora.
 *
 * Solo se dibuja para quien recibe la lista de vendedores, que el servidor
 * manda solo con el permiso `asignarVendedor`; la ruta lo vuelve a comprobar.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import BuscarEnLista from './BuscarEnLista';
import AyudaCorta from './AyudaCorta';
import { avisar } from './AvisoFlotante';
import { nombreDelVendedor, esDelVendedor, type VendedorParaAsignar } from '@/lib/asignar';
import { ROL } from '@/lib/auth';
import { NOMBRE_ROL } from '@/lib/roles';

export default function CambiarVendedor({
  de, vendedores, cliente, presupuesto, nombre, abiertas = 0, ganadas = 0, cerrada = false, onCambiado
}: {
  /** Lo guardado en `Creado por`. */
  de: string;
  vendedores: VendedorParaAsignar[];
  /** El id de la ficha, si se cambia el vendedor de un cliente… */
  cliente?: string;
  /** …o el de la cotización, si se cambia el de una sola. */
  presupuesto?: string;
  /** De quién se habla: el nombre del cliente. */
  nombre: string;
  /** Solo con `cliente`: cuántas cotizaciones abiertas y ganadas tiene. */
  abiertas?: number;
  ganadas?: number;
  /** Solo con `presupuesto`: su comisión ya quedó cerrada, y no cambia de manos. */
  cerrada?: boolean;
  onCambiado: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [a, setA] = useState('');
  const [conAbiertas, setConAbiertas] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const actual = nombreDelVendedor(de, vendedores);
  const elegido = vendedores.find((v) => v.usuario === a);
  const esElMismo = !!elegido && esDelVendedor(elegido, de);
  // En un cliente que ya es suyo todavía se le pueden pasar las abiertas de otros.
  const listo = !!elegido && (!esElMismo || (!!cliente && conAbiertas && abiertas > 0));

  async function cambiar() {
    if (!listo) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/vendedores/asignar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cliente, presupuesto, a, conAbiertas: !!cliente && conAbiertas })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) return setError(d.error || 'No se pudo cambiar.');
      avisar(`${nombre} pasó a ${elegido!.nombre}`
        + (d.movidas && cliente ? `, con ${d.movidas} ${d.movidas === 1 ? 'cotización' : 'cotizaciones'}` : ''));
      setAbierto(false); setA('');
      onCambiado();
    } catch (e) { setError(String(e)); }
    finally { setGuardando(false); }
  }

  return (
    <>
      <button type="button" className="boton min-h-[36px] whitespace-normal text-left"
        onClick={() => { setAbierto(true); setError(''); }}>
        Vendedor: <strong className={de ? '' : 'text-ambar-texto'}>{actual}</strong> · Cambiar…
      </button>
      {abierto && (
        <Dialogo titulo="Cambiar vendedor" onCerrar={() => setAbierto(false)}>
          <p className="flex flex-wrap items-center gap-1.5 text-[15px]">
            <span>{cliente ? 'El cliente' : 'La cotización de'} <strong>{nombre}</strong> hoy es de <strong>{actual}</strong>.</span>
            <AyudaCorta tema="cambiarVendedor" />
          </p>
          {cerrada ? (
            <p className="mt-3 rounded-lg border border-ambar/60 bg-ambar/10 px-3 py-2 text-[15px]" role="alert">
              La comisión de esta venta ya quedó cerrada: se queda con {actual}.
            </p>
          ) : (
            // **En su marco de grupo** (2026-11-22, lo pidió el cliente: *"ponle
            // marco también a las ventanitas"*): a quién pasa, con la casilla y
            // la frase de lo que va a pasar adentro; los botones, al pie.
            <div className={`mt-3 ${marcoGrupo()} p-3`}>
              <p className={`mb-2 ${TITULO_GRUPO}`}>Pasa a</p>
              {elegido ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border-2 border-oro bg-oro/15 px-3 py-2 text-[15px] font-semibold">✓ {elegido.nombre}</span>
                  <button type="button" className="boton min-h-[44px]" onClick={() => setA('')}>Elegir otro</button>
                </div>
              ) : (
                <BuscarEnLista etiqueta="Buscar vendedor" vacia="No hay cuentas activas que puedan cotizar."
                  opciones={vendedores.map((v) => ({ id: v.usuario, nombre: v.nombre,
                    // Quien no es vendedor lleva su rol al lado: se sabe a quién se le pasa.
                    detalle: [esDelVendedor(v, de) ? 'lo tiene hoy' : '',
                      v.rol && v.rol !== ROL.vendedor ? NOMBRE_ROL[v.rol] ?? v.rol : ''].filter(Boolean).join(' · ') }))}
                  onElegir={setA} onCerrar={() => undefined} />
              )}
              {!!cliente && abiertas > 0 && (
                <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-2 text-[15px]">
                  <input type="checkbox" className="h-5 w-5" checked={conAbiertas}
                    onChange={(e) => setConAbiertas(e.target.checked)} />
                  También {abiertas === 1 ? 'su cotización abierta' : `sus ${abiertas} cotizaciones abiertas`}
                </label>
              )}
              {elegido && (
                <p className="mt-3 text-[15px]" role="status">
                  {esElMismo && !listo ? <>Ya es de {elegido.nombre}.</> : (
                    <>
                      {esElMismo ? <>Sigue con <strong>{elegido.nombre}</strong></> : <>Pasa de {actual} a <strong>{elegido.nombre}</strong></>}
                      {!!cliente && conAbiertas && abiertas > 0 && <>, con {abiertas === 1 ? 'su cotización abierta' : `sus ${abiertas} cotizaciones abiertas`}</>}.
                      {!!cliente && ganadas > 0 && <> {ganadas === 1 ? 'Su cotización ganada se queda' : `Sus ${ganadas} ganadas se quedan`} con quien {ganadas === 1 ? 'la' : 'las'} tiene.</>}
                      {!!presupuesto && <> Su comisión, si la hay, pasa también.</>}
                    </>
                  )}
                </p>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-[14px] text-rojo-texto" role="alert">{error}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="boton min-h-[44px]" onClick={() => setAbierto(false)}>
              {cerrada ? 'Cerrar' : 'Cancelar'}
            </button>
            {!cerrada && (
              <button type="button" className="boton boton-relleno min-h-[44px]" disabled={!listo || guardando} onClick={cambiar}>
                {guardando ? 'Cambiando…' : 'Cambiar vendedor'}
              </button>
            )}
          </div>
        </Dialogo>
      )}
    </>
  );
}
