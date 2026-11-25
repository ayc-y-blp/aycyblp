'use client';
/**
 * Crear o editar una reserva a mano: las que llegan por teléfono, por
 * WhatsApp o en el mesón y no pasan por Shopify.
 *
 * **Pide los mismos datos que escribe Shopify, y de la misma forma.** Eso
 * no es prolijidad: un pedido de Shopify queda como
 * `2 × Menú Tradiciones + 1 × Menú Niños`, y si acá se escribiera
 * "Tradiciones" suelto, el total del día contaría dos platos distintos y la
 * cocina prepararía mal. Por eso:
 *
 * - **Un contador por menú**, como el formulario del sitio, en vez de elegir
 *   uno solo. Una familia con dos menús distintos es lo normal.
 * - **Las personas se calculan**, no se escriben. Antes eran un campo aparte
 *   que podía no calzar con el menú elegido: 5 personas y "Tradiciones".
 * - **Los nombres de menú salen de las reservas que ya hay**, o sea de lo
 *   que Shopify escribió. No hay una lista escrita a mano que se
 *   desincronice el día que la tienda renombre un producto.
 *
 * **El MONTO sí se pide** (cambió el 2026-10-21). Antes no, con el argumento
 * de que los precios viven en Shopify y que fijarlos acá sería una segunda
 * verdad. Eso vale para un pedido de Shopify, que trae su total y ese manda.
 * Pero **en una reserva a mano no hay pedido de Shopify de dónde sacarlo**:
 * no son dos verdades, es la única que hay.
 *
 * Se propone sumando los precios de /menus según la modalidad, y se puede
 * corregir encima: un grupo con un acuerdo distinto es justamente el tipo de
 * reserva que se anota a mano.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import type { Reserva } from '@/lib/tipos';
import { ESTADO_PAGO } from '@/lib/columnas';
import { liberaCupo, pagoEnEspanol, COMO_VIENE, MEDIOS_RAPIDOS } from '@/lib/pagos';
import { esManual } from '@/lib/columnas';
import { EstadoDelPago } from './PastillaPago';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { cuandoSeReservo } from '@/lib/fechas';
import { desglosarMenu, componerMenu, personasDeCuenta } from '@/lib/shopify';
import { precioDe, aMonto, type Menu } from '@/lib/menus';
import Dialogo from './Dialogo';
import CampoTelefono from './CampoTelefono';
import { correoNormal, avisoCorreo } from '@/lib/contacto';
import { cambiosDeLaReserva, textoDeCambios } from '@/lib/correccion';
import { PieCorreccion } from './Correccion';

export default function ReservaForm({
  fecha, reserva, menusConocidos, catalogo, diaCerrado = false, desdeCRM,
  onListo, onCancelar, onSeCayo
}: {
  fecha: string;
  reserva: Reserva | null;
  /**
   * El ganado del socio que se está pasando al panel (2026-11-03).
   *
   * **Lo que el CRM sabe se propone; lo que solo sabemos acá se escribe.**
   * El nombre viene puesto y la gente se dice en una línea, pero **no se
   * reparte sola en los menús**: cuántos van de cada uno es justamente el
   * dato que el socio no tiene, y rellenarlo con un menú cualquiera sería
   * inventar lo que hay que cocinar.
   */
  desdeCRM?: { id: string; nombre: string; personas: number };
  menusConocidos: string[];
  catalogo: Menu[];
  /**
   * El día está cerrado y esto es una **corrección** (2026-11-03). **No pide
   * un motivo escrito** (2026-11-21, lo decidió el cliente: igual que la
   * corrección del equipo): el pie muestra **la lista de lo que cambia**, una
   * casilla para confirmarla y *Guardar corrección*. Esa lista es lo que
   * queda en la bitácora (`lib/correccion.ts`). El servidor sigue exigiendo
   * ese texto y el permiso `corregir`.
   */
  diaCerrado?: boolean;
  onListo: () => void;
  onCancelar: () => void;
  /**
   * *✕ Se cayó…* al pie (2026-11-25, `lib/caida.ts`): lo pasa la página del
   * día cuando la reserva sigue en pie y se puede dar por caída.
   */
  onSeCayo?: () => void;
}) {
  const [f, setF] = useState({
    fecha: reserva?.fecha ?? fecha,
    nombre: reserva?.nombre ?? desdeCRM?.nombre ?? '',
    email: reserva?.email ?? '',
    telefono: reserva?.telefono ?? '',
    // **La modalidad NO se edita acá**: sale del `variant_title` del pedido,
    // o sea que la escribe Shopify y nadie más. Viaja en el estado solo para
    // conservarla al editar una reserva comprada; una anotada a mano nace en
    // blanco, porque no compró ninguna variante.
    tipoPago: reserva?.tipoPago ?? '',
    estadoPago: reserva?.estadoPago || ESTADO_PAGO.pendiente,
    notaPago: reserva?.notaPago ?? '',
    abonado: reserva?.abonado != null ? String(reserva.abonado) : ''
  });
  // **De Shopify, el pago lo pone la tienda** (2026-11-11). A mano, se elige
  // con los tres botones. Que se cayó va aparte: *✕ Se cayó…*.
  const deShopify = !!reserva && !esManual(reserva.id);

  // El conteo por menú. Al editar se reconstruye desde el texto guardado,
  // así que una reserva que vino de Shopify se puede corregir acá sin
  // perder su desglose.
  const [cuenta, setCuenta] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const { menu, cantidad } of desglosarMenu(reserva?.menu)) inicial[menu] = cantidad;
    return inicial;
  });

  // Los que ya se vendieron, más los de esta reserva por si alguno dejó de
  // venderse y no aparecería en la lista.
  const menus = useMemo(
    () => [...new Set([...menusConocidos, ...Object.keys(cuenta)])].sort(
      (a, b) => a.localeCompare(b)),
    [menusConocidos, cuenta]
  );
  const personas = personasDeCuenta(cuenta);

  // El total que proponen los precios de /menus.
  //
  // **Sale del estado del pago, no de la modalidad**, desde que la modalidad
  // dejó de preguntarse: pagada por adelantado es el precio con descuento, y
  // por pagar es el del local, que es exactamente la regla de la tienda —el
  // recargo son los $5.000 por no pagar antes—. El monto queda editable
  // encima, que es para lo que existe el campo.
  const enElLocal = f.estadoPago !== ESTADO_PAGO.pagado;
  const sugerido = useMemo(() => {
    let suma = 0;
    for (const [nombre, n] of Object.entries(cuenta)) {
      suma += precioDe(catalogo.find((m) => m.nombre === nombre), enElLocal) * n;
    }
    return suma;
  }, [cuenta, catalogo, enElLocal]);

  // El monto escrito. Vacio significa "usa el sugerido": asi cambiar la
  // modalidad o agregar una persona vuelve a calcularlo, y recien cuando
  // alguien escribe un numero el formulario deja de pisarselo.
  const [montoManual, setMontoManual] = useState<string>(
    reserva?.monto != null ? String(reserva.monto) : ''
  );
  const monto = montoManual.trim() === '' ? sugerido : aMonto(montoManual);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // **Lo que cambia, para la corrección de un día cerrado.** Se compara lo
  // guardado con lo que este formulario va a escribir —los menús, compuestos
  // igual en los dos lados—, así que la lista dice lo que de verdad queda.
  const cuentaInicial = useRef(cuenta);
  const abonoQueQueda = f.estadoPago === ESTADO_PAGO.abonado ? aMonto(f.abonado) || null : null;
  const cambios = useMemo(() => {
    if (!diaCerrado) return [];
    const tapado = !!reserva?.contactoTapado;
    const despues = {
      fecha: f.fecha, nombre: f.nombre, menu: componerMenu(cuenta), personas,
      monto: monto > 0 ? monto : null, estadoPago: f.estadoPago, abonado: abonoQueQueda, notaPago: f.notaPago,
      telefono: tapado ? reserva?.telefono : f.telefono, email: tapado ? reserva?.email : f.email
    };
    return cambiosDeLaReserva(reserva ? {
      fecha: reserva.fecha, nombre: reserva.nombre, menu: componerMenu(cuentaInicial.current),
      personas: reserva.personas, monto: reserva.monto,
      estadoPago: reserva.estadoPago || ESTADO_PAGO.pendiente, abonado: reserva.abonado ?? null,
      notaPago: reserva.notaPago, telefono: reserva.telefono, email: reserva.email
    } : null, despues);
  }, [diaCerrado, reserva, f, cuenta, personas, monto, abonoQueQueda]);
  // La casilla confirma **esa** lista: si cambia, se suelta sola.
  const [confirmado, setConfirmado] = useState(false);
  const huella = cambios.join('\n');
  useEffect(() => { setConfirmado(false); }, [huella]);

  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value })
  });

  function sumar(menu: string, n: number) {
    setCuenta((c) => ({ ...c, [menu]: Math.max(0, (c[menu] ?? 0) + n) }));
  }

  /**
   * Escribir la cantidad de un menú a mano.
   *
   * **Los botones son una comodidad encima, no el único camino** — es la
   * misma regla que el formulario del sitio público, y acá se había perdido:
   * la cantidad era un `<span>`. Para una familia de seis da lo mismo; se
   * notó al anotar un evento del socio de **150 personas**, donde el único
   * camino era apretar `+` ciento cincuenta veces.
   */
  function poner(menu: string, v: string) {
    const n = Math.max(0, Math.trunc(Number(v)) || 0);
    setCuenta((c) => ({ ...c, [menu]: n }));
  }

  // **No hay "Otro menú" acá** (2026-11-05, lo pidió el cliente). Qué
  // menús existen es una decisión del negocio —se publica en la tienda y se
  // le pone precio en /menus—, no algo que se invente al anotar una reserva.
  // La lista son los menús conocidos más los que ya traiga esta reserva.

  async function guardar() {
    setError('');
    if (diaCerrado && (!cambios.length || !confirmado)) {
      return setError('El día está cerrado: marca la casilla que confirma los cambios.');
    }
    if (!f.nombre.trim()) return setError('Falta el nombre.');
    if (personas < 1) return setError('Tiene que haber al menos una persona en algún menú.');

    setGuardando(true);
    // Un contacto tapado (`privacidad.ts`) no viaja de vuelta: el servidor
    // también lo descarta.
    const { telefono, email, ...resto } = f;
    const cuerpo = {
      ...resto, ...(reserva?.contactoTapado ? {} : { telefono, email }), personas, menu: componerMenu(cuenta),
      abonado: f.estadoPago === ESTADO_PAGO.abonado ? aMonto(f.abonado) || null : null,
      // Sin precios puestos el sugerido da 0; eso se guarda en blanco, que
      // es lo mismo que hacia antes de pedir el monto.
      monto: monto > 0 ? monto : null,
      // De qué ganado del socio sale, para que deje de aparecer como
      // pendiente y el día no cuente esa gente dos veces.
      ...(desdeCRM ? { eventoCRM: desdeCRM.id } : {}),
      ...(diaCerrado ? { correccion: { motivo: textoDeCambios(cambios) } } : {})
    };
    const res = reserva
      ? await fetch(`/api/reservas/${reserva.fila}`,
          { method: 'PATCH', headers: { 'content-type': 'application/json' },
            // Con su id: si la fila se movió, el servidor la encuentra igual.
            body: JSON.stringify({ ...cuerpo, id: reserva.id }) })
      : await fetch('/api/reservas',
          { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify(cuerpo) });
    const d = await res.json();
    setGuardando(false);
    if (d.error) setError(d.error); else onListo();
  }

  // **Lo que dice Shopify, en una línea** (2026-11-25): de dónde viene, la
  // modalidad, cuándo compró y cómo va el pago, con la misma pastilla del
  // resto del panel. El porqué —el pago lo pone la tienda— va en su `?`.
  const cuando = reserva ? cuandoSeReservo(reserva.creada) : '';
  const tapado = !!reserva?.contactoTapado;

  return (
    <Dialogo
      titulo={desdeCRM ? 'Anotar el evento del CRM'
                       : reserva ? 'Editar reserva' : 'Agregar reserva'}
      onCerrar={onCancelar} ancho="max-w-lg lg:max-w-6xl">
      <>
        {/* Lo que el socio sabe, dicho una vez y arriba: el nombre ya está
            puesto abajo, y la gente es el número que hay que repartir en los
            menús. Va como aviso y no como campo porque **no se guarda**: lo
            que se guarda son los menús que se escriban. */}
        {desdeCRM && (
          <p className="mt-3 rounded border border-cielo/40 bg-cielo/[0.08] px-3 py-2 text-[13px]">
            Viene del <strong>CRM</strong>, con{' '}
            <strong className="tabular-nums">{desdeCRM.personas}</strong>{' '}
            {desdeCRM.personas === 1 ? 'persona' : 'personas'}. Reparte esa
            gente en los menús de abajo; lo que el CRM no trae —los menús,
            el monto, el contacto— se escribe acá.
          </p>
        )}

        {/* **Tres grupos con su marco, y los campos en columna** (2026-11-25,
            lo pidió el cliente: *"el popup aún no tiene buen diseño según
            nuestro estilo y reglas"*). En el computador, tres columnas:
            *Quién reserva*, *Menús* y *El pago* —con el monto, que es plata—.
            Los nombres de los campos miden lo mismo, así que los valores parten
            en la misma vertical (regla *los formularios van alineados*). En dos
            columnas, la anotada a mano con abono medía 724px y no cabía. */}
        <div className="mt-3 space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.15fr)]
                        lg:items-start lg:gap-3 lg:space-y-0">
          <section className={`${marcoGrupo()} p-3`}>
            <p className={TITULO_GRUPO}>Quién reserva</p>
            <div className="mt-2 space-y-2">
              <FilaCampo rotulo="Fecha"><input type="date" {...campo('fecha')} className={ENTRADA} /></FilaCampo>
              <FilaCampo rotulo="Nombre">
                <input type="text" {...campo('nombre')} className={ENTRADA} autoFocus />
              </FilaCampo>
              {/* El teléfono y el correo se ordenan al salir del campo: una
                  reserva anotada a mano queda con la misma forma que una de
                  Shopify (`contacto.ts`). Uno tapado no se muestra ni se
                  manda de vuelta (`privacidad.ts`). */}
              {tapado ? (
                <FilaCampo rotulo="Contacto" varios>
                  <p className="flex items-center gap-1.5 py-2 text-[14px] text-hueso/70">
                    🔒 {reserva?.telefono || 'Contacto reservado'} <AyudaCorta tema="contactoTapado" />
                  </p>
                </FilaCampo>
              ) : (<>
                <FilaCampo rotulo="Teléfono">
                  <CampoTelefono valor={f.telefono} className={ENTRADA}
                    etiqueta="Teléfono de quien reserva"
                    onCambio={(v) => setF({ ...f, telefono: v })} />
                </FilaCampo>
                <FilaCampo rotulo="Correo">
                  <input type="email" {...campo('email')} className={ENTRADA}
                    inputMode="email"
                    onBlur={(e) => setF({ ...f, email: correoNormal(e.target.value) })} />
                  {avisoCorreo(f.email) && (
                    <p className="mt-0.5 text-[13px] leading-tight text-ambar-texto/80">
                      {avisoCorreo(f.email)}
                    </p>
                  )}
                </FilaCampo>
              </>)}
            </div>
          </section>

          {/* Los menús, con un contador cada uno. Las personas salen de acá:
              no hay un campo aparte que pueda no calzar. */}
          <section className={`${marcoGrupo()} p-3`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className={TITULO_GRUPO}>Menús</p>
              <span className="text-[15px]">
                <strong className="tabular-nums">{personas}</strong>
                <span className="text-hueso/65"> {personas === 1 ? 'persona' : 'personas'}</span>
              </span>
            </div>

            {menus.length === 0 && (
              <p className="mt-2 text-[13px] text-hueso/65">
                Todavía no hay menús vendidos de dónde sacar los nombres. <AyudaCorta tema="menusDeLaReserva" />
              </p>
            )}

            <div className="mt-2 space-y-1.5">
              {menus.map((m) => (
                <div key={m} className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 break-words text-[15px] leading-tight">{m}</span>
                  <button type="button" onClick={() => sumar(m, -1)}
                    aria-label={`Quitar uno de ${m}`}
                    className="h-9 w-9 shrink-0 rounded border-2 border-hueso/20 text-lg leading-none
                               hover:border-oro disabled:opacity-30"
                    disabled={!(cuenta[m] > 0)}>−</button>
                  <input type="number" min={0} inputMode="numeric"
                    aria-label={`Cuántos de ${m}`}
                    value={cuenta[m] ?? 0}
                    onChange={(e) => poner(m, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="h-9 w-14 shrink-0 rounded border-2 border-hueso/20 bg-transparent
                               text-center text-[15px] tabular-nums focus:border-oro" />
                  <button type="button" onClick={() => sumar(m, 1)}
                    aria-label={`Agregar uno de ${m}`}
                    className="h-9 w-9 shrink-0 rounded border-2 border-hueso/20 text-lg leading-none
                               hover:border-oro">+</button>
                </div>
              ))}
            </div>
          </section>

          {/* **El pago**: el monto y cómo viene. En una de Shopify lo pone la
              tienda —de dónde viene, la modalidad, cuándo compró y la pastilla
              del resto del panel, con el porqué en su `?`—; en una anotada a
              mano se elige con Pagada · Abonada · Por pagar (2026-11-11). Que
              se cayó ya no se marca acá: es *✕ Se cayó…*, al pie (`lib/caida.ts`). */}
          <section className={`${marcoGrupo()} p-3`}>
            <p className={TITULO_GRUPO}>El pago</p>
            <div className="mt-2">
              <FilaCampo rotulo={<>Monto <AyudaCorta tema="montoDeLaReserva" /></>}>
                <input type="number" min={0} step={1000} className={ENTRADA}
                  value={montoManual} placeholder={sugerido > 0 ? String(sugerido) : '—'}
                  onChange={(e) => setMontoManual(e.target.value)} />
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-hueso/65">
                  {montoManual.trim() !== '' && aMonto(montoManual) !== sugerido ? (
                    <>
                      Escrito a mano.
                      {/* Se aprieta: un botón de 36px, no un texto subrayado (regla PlayStation). */}
                      <button type="button" onClick={() => setMontoManual('')}
                        className="boton min-h-[36px] !px-2.5 text-[13px] font-semibold text-oro">
                        Volver al calculado{sugerido > 0 && <> ({sugerido.toLocaleString('es-CL')})</>}
                      </button>
                    </>
                  ) : sugerido > 0 ? (
                    <>Calculado: precio {enElLocal ? 'del local' : 'en línea'}</>
                  ) : (
                    <>Sin precios en Productos: queda en blanco</>
                  )}
                </span>
              </FilaCampo>
            </div>

            {reserva && deShopify && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14px] text-hueso/80">
                <span>🛒 <strong className="text-hueso">Shopify</strong>{f.tipoPago ? <> · {f.tipoPago}</> : null}</span>
                <EstadoDelPago r={{ ...reserva, estadoPago: f.estadoPago }} />
                <AyudaCorta tema="pagoShopify" />
                {cuando && <span className="basis-full text-[13px] text-hueso/65">Compró el {cuando}</span>}
              </div>
            )}

            {!deShopify && (<>
              {liberaCupo(f.estadoPago) && (
                <p className="mt-2 text-[14px] font-semibold text-rojo-texto">
                  ✕ {pagoEnEspanol(f.estadoPago)}: elegir cómo viene la devuelve a la lista.
                </p>
              )}
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {COMO_VIENE.map((o) => {
                  const elegido = f.estadoPago === o.estado;
                  const tono = o.tono === 'verde' ? ['border-verde-fuerte', 'bg-verde-fuerte text-tinta', 'text-verde-texto']
                    : o.tono === 'cielo' ? ['border-cielo-fuerte', 'bg-cielo-fuerte text-tinta', 'text-cielo-texto']
                    : ['border-ambar-fuerte', 'bg-ambar-fuerte text-tinta', 'text-ambar-texto'];
                  return (
                    <button key={o.estado} type="button" aria-pressed={elegido} title={o.glosa}
                      onClick={() => setF({ ...f, estadoPago: o.estado })}
                      className={`tecla flex min-h-[48px] items-center justify-center gap-1 rounded-xl border-2
                                  px-1 py-1 text-center sm:gap-1.5 ${tono[0]} ${elegido ? tono[1] : `${tono[2]} hover:bg-hueso/5`}`}>
                      <span aria-hidden className="text-[16px] font-extrabold leading-none sm:text-[17px]">{o.icono}</span>
                      <span className="whitespace-nowrap text-[14px] font-bold leading-tight sm:text-[15px]">{o.palabra}</span>
                    </button>
                  );
                })}
              </div>

              {f.estadoPago === ESTADO_PAGO.abonado && (
                <div className="mt-2">
                  <FilaCampo rotulo="Abonó">
                    <input type="text" inputMode="numeric" value={f.abonado} placeholder="$"
                      onChange={(e) => setF({ ...f, abonado: e.target.value })}
                      className={ENTRADA} />
                    {aMonto(f.abonado) > 0 && monto > 0 && (
                      <span className="mt-1 block text-[13px] text-hueso/70">
                        Falta por cobrar: <strong>{'$' + Math.max(0, monto - aMonto(f.abonado)).toLocaleString('es-CL')}</strong>
                      </span>
                    )}
                  </FilaCampo>
                </div>
              )}

              {/* Cómo pagó: botones rápidos que escriben el medio, y el texto
                  sigue libre para el detalle. */}
              {(f.estadoPago === ESTADO_PAGO.pagado || f.estadoPago === ESTADO_PAGO.abonado) && (
                <div className="mt-2">
                  <FilaCampo rotulo="Cómo pagó" varios>
                    <span className="mb-1.5 flex flex-wrap gap-1.5">
                      {MEDIOS_RAPIDOS.map((m) => {
                        const ya = f.notaPago.toLowerCase().startsWith(m.toLowerCase());
                        return (
                          <button key={m} type="button" aria-pressed={ya}
                            onClick={() => {
                              const resto = MEDIOS_RAPIDOS.reduce((t, x) =>
                                t.toLowerCase().startsWith(x.toLowerCase()) ? t.slice(x.length).trimStart() : t, f.notaPago);
                              setF({ ...f, notaPago: resto ? `${m} ${resto}` : m });
                            }}
                            className={`boton min-h-[36px] !px-2.5 ${ya ? '!border-oro bg-oro/15 font-semibold' : ''}`}>{m}</button>
                        );
                      })}
                    </span>
                    <input type="text" {...campo('notaPago')} className={ENTRADA}
                      aria-label="Detalle de cómo pagó" placeholder="Transferencia 28/10…" />
                  </FilaCampo>
                </div>
              )}
            </>)}
          </section>
        </div>
        {error && <p className="mt-3 text-[14px] font-semibold text-rojo-texto">{error}</p>}

        {diaCerrado ? (
          // Un día cerrado se corrige: la lista de lo que cambia, la casilla
          // y *Guardar corrección*. La misma pieza de la ventana del equipo.
          <PieCorreccion modo="dosFilas" cambios={cambios} confirmado={confirmado} onConfirmado={setConfirmado}
            onCancelar={onCancelar} onGuardar={guardar} guardando={guardando} />
        ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={guardar} disabled={guardando}
            className="boton boton-relleno min-h-[48px] text-[15px] disabled:opacity-40">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onCancelar} className="boton min-h-[44px]">Cancelar</button>
          {/* **✕ Se cayó…, al pie** (2026-11-25), como en la ventana de
              cotizar: guardado aparte, donde Shopify no lo pisa. */}
          {onSeCayo && (
            <button type="button" onClick={onSeCayo}
              className="boton ml-auto min-h-[44px] !border-2 !border-rojo-fuerte/70 font-semibold text-rojo-texto">
              ✕ Se cayó…
            </button>
          )}
        </div>
        )}
      </>
    </Dialogo>
  );
}

const ENTRADA =
  'w-full rounded border-2 border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

/**
 * **El nombre de un campo en su columna y el valor al lado** (2026-11-25,
 * regla *los formularios van alineados*): todos los nombres miden lo mismo,
 * así que los valores parten en la misma vertical.
 */
function FilaCampo({ rotulo, varios = false, children }: {
  rotulo: React.ReactNode;
  /** Con varios controles adentro (botones y un campo) no es un `<label>`: apretar el nombre apretaría el primero. */
  varios?: boolean;
  children: React.ReactNode;
}) {
  const Fila = varios ? 'div' : 'label';
  return (
    <Fila className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-start gap-2">
      <span className="flex items-start gap-1 pt-2.5 text-[13px] font-semibold uppercase tracking-wide text-hueso/65">{rotulo}</span>
      <span className="block min-w-0">{children}</span>
    </Fila>
  );
}
