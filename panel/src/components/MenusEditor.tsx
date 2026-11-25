'use client';

/**
 * El catálogo de productos (la pestaña `Menús`).
 *
 * Desde el 2026-11-10 no son solo los menús del sitio: es todo lo que se
 * vende y se cotiza —la once, el desayuno, el show ecuestre, el arriendo—,
 * en un solo catálogo para que lo cotizado y lo reservado se llamen igual.
 * Vive en la planilla, así que agregar uno no necesita un despliegue.
 *
 * **Una tarjeta por producto, como las fichas de `/equipo`**: cerrada es una
 * línea; abierta, botones grandes para lo que es una elección (tipo, cobro,
 * IVA, moneda) e interruptores para dónde se vende.
 *
 * **El aviso amarillo es la pieza importante de esta pantalla**, no la
 * tabla. Sin alias, lo único que mantiene alineados a Shopify, al sitio y al
 * panel es enterarse cuando dejan de estarlo. Ver src/lib/menus.ts.
 */
import AvisoFijo from './AvisoFijo';
import { CUERPO_ABIERTO, LISTA_TARJETAS, PieCerrar, SignoAbrir, marcoTarjeta } from './TarjetaLista';
import BotonGuardar from './BotonGuardar';
import AyudaCorta from './AyudaCorta';
import { useEffect, useMemo, useState } from 'react';
import { avisar } from './AvisoFlotante';
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import {
  desconocidos, aMonto, aPrecio, nuevoProducto, TIPO_PRODUCTO, COBRO, IVA_PRECIO, MONEDA,
  type Menu
} from '@/lib/menus';
import Campo from './Campo';
import MostrarDesactivados from './MostrarDesactivados';
import PromocionesEditor from './PromocionesEditor';
import OtrasEmpresasEditor from './OtrasEmpresasEditor';
import BuscarEnLista from './BuscarEnLista';
import EmpresaNueva from './EmpresaNueva';
import { datosEnFrase, type OtraEmpresa } from '@/lib/otrasEmpresas';
import { usarSoloMira } from './SesionCliente';
import { normalizar } from '@/lib/columnas';
import { textoDelSitio, MENU_CASA_DEL_SITIO, textoDeSiempre, propioOVacio } from '@/lib/detalle';
import { enPesos } from '@/lib/ocupacion';
import { menusConocidos } from '@/lib/shopify';
import type { Reserva } from '@/lib/tipos';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

/** Una fila de botones para elegir uno de varios valores. */
function Elegir<T extends string>({ valores, valor, onElegir, etiqueta }: {
  valores: readonly T[]; valor: T; onElegir: (v: T) => void; etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {valores.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={v === valor}
          onClick={() => onElegir(v)}
          className={`boton min-h-[40px] ${v === valor
            ? 'border-oro bg-oro/15 font-semibold text-hueso' : ''}`}>
          {v}
        </button>
      ))}
    </div>
  );
}

/** Un interruptor grande, con la frase completa: se lee antes de tocarlo. */
function Interruptor({ encendido, onCambio, texto, ayuda }: {
  encendido: boolean; onCambio: (b: boolean) => void; texto: string; ayuda: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={encendido}
      onClick={() => onCambio(!encendido)}
      className={`tecla flex min-h-[56px] w-full items-center gap-3 rounded border px-3 py-2
                  text-left ${encendido ? 'border-verde-fuerte bg-verde/10' : 'border-hueso/20'}`}>
      <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full transition
                                    ${encendido ? 'bg-verde-fuerte' : 'bg-hueso/25'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all
                          ${encendido ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{texto}</span>
        <span className="block text-[13px] text-hueso/70">{ayuda}</span>
      </span>
    </button>
  );
}

/** El precio de cotización en su moneda, para la línea cerrada. */
function enMoneda(n: number, moneda: string): string {
  if (!n) return 'sin precio';
  return moneda === MONEDA.uf ? `${String(n).replace('.', ',')} UF` : enPesos(n);
}

/**
 * Un producto en la pantalla: `nuevo` marca el que se agregó acá y todavía no
 * se guarda. **El candado del nombre mira el producto, no lo que se escribe**
 * (2026-11-22, lo encontró el cliente al agregar *A Brasas Abiertas
 * Empresas*: al escribir *A Brasas Abiertas*, que ya se cotizó, el campo del
 * producto nuevo se bloqueaba y no dejaba seguir con *Empresas*). Un producto
 * nuevo nunca está vendido ni cotizado, así que su nombre siempre se escribe;
 * si queda igual al de otro, se avisa y no se guarda.
 */
type Editable = Menu & { nuevo?: boolean };

/** Ya se vendió o se cotizó, así que el nombre no se cambia. Uno nuevo, nunca. */
const nombreFijo = (m: Editable, usados: Set<string>) => !m.nuevo && usados.has(normalizar(m.nombre));

/** Otro producto ya se llama así (sin mirar mayúsculas, tildes ni espacios). */
const nombreRepetido = (lista: Editable[], i: number) => {
  const n = normalizar(lista[i].nombre);
  return !!n && lista.some((x, k) => k !== i && normalizar(x.nombre) === n);
};

type Vista = 'catalogo' | 'promociones' | 'empresas';

export default function MenusEditor() {
  const [menus, setMenus] = useState<Editable[] | null>(null);
  /** La lista como está guardada: para saber si queda algo sin guardar al descartar un producto nuevo. */
  const [guardados, setGuardados] = useState<Editable[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  /** Qué tarjeta está abierta: la posición en la lista. Una a la vez. */
  const [abierta, setAbierta] = useState<number | null>(null);
  /**
   * **Filtrar el catálogo por tipo** (2026-11-25, lo pidió el cliente: *"aquí
   * deberíamos poder filtrar entre las distintas categorías, menú, extra,
   * etc."*). La forma del filtro de origen del calendario: se aprieta para
   * filtrar y otra vez para soltar, con cuántos hay de cada uno.
   */
  const [tipoVisto, setTipoVisto] = useState('');
  /**
   * Los productos que ya se vendieron o se cotizaron, normalizados. A esos
   * no se les ofrece *Quitar* sino *Desactivar* (2026-11-10). Lo decide el
   * servidor, que además rechaza quitarlos.
   */
  const [usados, setUsados] = useState<Set<string>>(new Set());
  /** Si esta cuenta ve los costos (`costos`): lo dice el servidor. */
  const [veCostos, setVeCostos] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  /** Vista gerencia sin `configurar`: el catálogo se mira y no se toca. */
  const soloMira = usarSoloMira('configurar');
  /**
   * **El catálogo o las promociones** (2026-11-23): dos pestañas en la misma
   * pantalla, para que las promociones no se mezclen con los productos. Se
   * llega directo con `?ver=promociones`.
   */
  const [vista, setVista] = useState<Vista>('catalogo');
  useEffect(() => {
    const ver = new URLSearchParams(window.location.search).get('ver');
    if (ver === 'promociones' || ver === 'empresas') setVista(ver);
  }, []);
  const verVista = (v: Vista) => {
    setVista(v); setAbierta(null);
    const url = new URL(window.location.href);
    if (v !== 'catalogo') url.searchParams.set('ver', v); else url.searchParams.delete('ver');
    window.history.replaceState(null, '', url);
  };
  /**
   * **Las otras empresas** (2026-11-24), para elegir quién cobra un extra.
   * Las lee su propia ruta: si la cuenta no puede verlas, el campo queda como
   * estaba.
   */
  const [otrasEmpresas, setOtrasEmpresas] = useState<OtraEmpresa[]>([]);
  const [eligiendoEmpresa, setEligiendoEmpresa] = useState<number | null>(null);
  /** El producto desde donde se crea otra empresa nueva, en su ventanita (2026-11-24). */
  const [empresaNuevaPara, setEmpresaNuevaPara] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/otras-empresas').then((r) => r.json())
      .then((d) => { if (Array.isArray(d.empresas)) setOtrasEmpresas(d.empresas); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/menus').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setMenus(d.menus); setGuardados(d.menus);
        setVeCostos(d.veCostos === true);
        setUsados(new Set((d.usados ?? []).map((n: string) => normalizar(n))));
      })
      .catch((e) => setError(String(e)));
    fetch('/api/reservas').then((r) => r.json())
      .then((d) => d.reservas && setReservas(d.reservas))
      .catch(() => {});
  }, []);

  // Lo que se está vendiendo y no está en la lista. Es lo que permite que la
  // lista crezca sola en vez de que alguien lo descubra cuando los totales
  // del día no cuadren.
  const sinRegistrar = useMemo(() => {
    if (!menus) return [];
    // Sin la lista: así los nombres salen crudos y se puede ver cuál falta.
    return desconocidos(menusConocidos(reservas, []), menus);
  }, [menus, reservas]);

  async function guardar(lista: Editable[]) {
    // Un producto nuevo sin nombre no se guarda (el servidor lo descartaría
    // sin decir nada): se abre para escribírselo, o cancelarlo.
    const sinNombre = lista.findIndex((m) => m.nuevo && !m.nombre.trim());
    if (sinNombre !== -1) {
      setAbierta(sinNombre);
      avisar('Hay un producto nuevo sin nombre: escríbele uno, o Cancelar.', 'atencion');
      return;
    }
    // El servidor descarta el segundo de dos nombres iguales sin decir nada:
    // se avisa acá, antes de mandar, para que no desaparezca un producto.
    const repetido = lista.find((m, i) => m.nuevo && nombreRepetido(lista, i));
    if (repetido) {
      avisar(`Ya hay un producto que se llama ${repetido.nombre.trim()}: el nuevo necesita otro nombre.`, 'atencion');
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch('/api/menus', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ menus: lista.map(({ nuevo: _n, ...m }) => m) })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
      else {
        setMenus(d.menus); setGuardados(d.menus); setError(''); setSucio(false);
        setUsados(new Set((d.usados ?? []).map((n: string) => normalizar(n))));
      }
    } finally { setGuardando(false); }
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!menus) return <p className="text-hueso/50">Cargando…</p>;

  const cambiar = (i: number, cambio: Partial<Editable>) => {
    setMenus(menus.map((m, k) => (k === i ? { ...m, ...cambio } : m)));
    setSucio(true);
  };
  /**
   * **El texto del sitio, para trabajar desde ahí** (2026-11-25, lo pidió el
   * cliente: *"cuando uno aprieta adentro del campo descripción, debería quedar
   * el texto por defecto editable para que puedo trabajar desde esta base"*).
   * Al entrar a *Qué incluye* o *Bebestibles* vacío, se llena con el texto de
   * siempre (`textoDeSiempre()`); al salir, si quedó igual, vuelve a blanco
   * (`propioOVacio()`), como en el 📝 de la cotización: en blanco sigue al
   * sitio y el menú de la casa va arriba, en común. Ninguno de los dos marca
   * la lista como cambiada: lo que cuenta es si quedó distinta de lo guardado.
   */
  const ponerTexto = (i: number, cambio: Partial<Editable>) => {
    const lista = menus.map((m, k) => (k === i ? { ...m, ...cambio } : m));
    setMenus(lista);
    setSucio(JSON.stringify(lista) !== JSON.stringify(guardados));
  };
  const alEntrarTexto = (i: number, parte: 'descripcion' | 'bebestibles') => {
    const m = menus[i];
    const siempre = textoDeSiempre(m.nombre)[parte];
    if (!m[parte].trim() && siempre) ponerTexto(i, { [parte]: siempre });
  };
  const alSalirTexto = (i: number, parte: 'descripcion' | 'bebestibles') => {
    const m = menus[i];
    const valor = propioOVacio(m.nombre, parte, m[parte]);
    if (valor !== m[parte]) ponerTexto(i, { [parte]: valor });
  };

  /**
   * **Un producto nuevo se guarda con su botón** (2026-11-24, lo pidió el
   * cliente: *"al crear un producto, sí tienes que aplicar la regla de que
   * tiene que guardarse con un botón, porque se me quedó abierto un producto
   * sin nombre… pero queda ahí dando vuelta"*). Hasta guardarlo es un
   * borrador: dice *nuevo · sin guardar*, trae *Guardar producto* y
   * *Cancelar*, y **si se cierra sin nombre, se descarta** —también al abrir
   * otro—. Lo demás de Productos sigue igual: los cambios esperan *Guardar
   * cambios*.
   */
  const descartar = (i: number) => {
    const resto = menus.filter((_, k) => k !== i);
    setMenus(resto); setAbierta(null);
    setSucio(JSON.stringify(resto) !== JSON.stringify(guardados));
  };
  const borradorSinNombre = (i: number | null) => i !== null && !!menus[i]?.nuevo && !menus[i].nombre.trim();
  /** Abre otra tarjeta, o cierra la abierta. Un producto nuevo sin nombre que se deja, se descarta. */
  const abrir = (i: number | null) => {
    if (abierta !== null && abierta !== i && borradorSinNombre(abierta)) {
      const resto = menus.filter((_, k) => k !== abierta);
      setMenus(resto);
      setSucio(JSON.stringify(resto) !== JSON.stringify(guardados));
      setAbierta(i === null ? null : i > abierta ? i - 1 : i);
      return;
    }
    if (i === null && borradorSinNombre(abierta)) return descartar(abierta!);
    setAbierta(i);
  };
  /**
   * **Un solo botón de guardar a la vista** (2026-11-24, lo marcó el cliente:
   * *"se ve un botón guardar en el pop-up y el botón abajo de guardar"*): con
   * una tarjeta abierta, el suyo —*Guardar cambios*, o *Guardar producto* en
   * uno nuevo—; el de abajo, solo con todas cerradas.
   */
  const tarjetaAbierta = abierta !== null;

  const botonGuardar = (
    <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => guardar(menus)}
      texto="Guardar cambios" />
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 lg:mb-2">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          Productos<Ayuda tema="menus" />
        </h1>
        <div role="tablist" aria-label="Qué mirar" className="flex flex-wrap gap-2">
          {([['catalogo', '📦 Catálogo'], ['promociones', '🎁 Promociones'], ['empresas', '🤝 Otras empresas']] as const).map(([v, texto]) => (
            <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => verVista(v)}
              className={`boton min-h-[44px] ${vista === v ? 'border-oro bg-oro/15 font-semibold text-hueso' : ''}`}>
              {texto}
            </button>
          ))}
        </div>
      </div>
      {vista === 'empresas' ? <OtrasEmpresasEditor soloMira={soloMira} onGuardar={setOtrasEmpresas} />
        : vista === 'promociones' ? <PromocionesEditor catalogo={menus} soloMira={soloMira} /> : <>
      <AvisoFijo clave="menus-intro" className="mb-6 max-w-2xl lg:mb-4">
        Todo lo que se vende y se cotiza. <strong>El nombre de un menú tiene que
        ser exactamente el mismo acá y en Shopify</strong>: solo se perdonan
        mayúsculas, tildes y espacios de sobra.
      </AvisoFijo>

      {sinRegistrar.length > 0 && (
        <div className="mb-6 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="flex items-center text-[15px] font-semibold text-ambar-texto">
            Hay {sinRegistrar.length === 1 ? 'un menú vendido' : 'menús vendidos'} que
            no está{sinRegistrar.length === 1 ? '' : 'n'} en esta lista.
            <AyudaCorta titulo="Un menú que no está en la lista">
              O Shopify está vendiendo algo que no está registrado acá, o alguien
              renombró un producto en la tienda. Agrégalo con ese nombre
              exacto, o arregla el nombre en Shopify para que vuelvan a calzar.
            </AyudaCorta>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sinRegistrar.map((m) => (
              <code key={m} className="rounded bg-hueso/10 px-2 py-1 text-sm">{m}</code>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 [&>button]:mb-0">
        <span role="group" aria-label="Qué tipo" className="flex flex-wrap items-center gap-2">
          {Object.values(TIPO_PRODUCTO).map((t) => {
            const n = menus.filter((m) => m.tipo === t && (m.activo || verInactivos)).length;
            const elegido = tipoVisto === t;
            return (
              <button key={t} type="button" aria-pressed={elegido} disabled={!n && !elegido}
                onClick={() => { setTipoVisto(elegido ? '' : t); setAbierta(null); }}
                className={`boton min-h-[44px] rounded-full disabled:opacity-40 ${elegido ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
                {t} <span className="tabular-nums text-hueso/65">{n}</span>
              </button>
            );
          })}
        </span>
        <MostrarDesactivados cuantos={menus.filter((m) => !m.activo).length}
          visible={verInactivos} onCambio={(v) => { setVerInactivos(v); setAbierta(null); }} />
      </div>
      <ul className={LISTA_TARJETAS}>
        {menus.map((m, i) => ((!m.activo && !verInactivos) || (tipoVisto && m.tipo !== tipoVisto && abierta !== i)) ? null : (
          <li key={i} className={`overflow-hidden ${marcoTarjeta(abierta === i, m.activo ? 'normal' : 'apagada')}`}>
            <div className="flex items-center gap-2 pr-2">
              <button type="button" aria-expanded={abierta === i}
                onClick={() => abrir(abierta === i ? null : i)}
                className={`flex min-h-[52px] min-w-0 flex-1 flex-wrap items-center gap-x-3
                           gap-y-1 px-3 py-2.5 text-left hover:bg-hueso/5 ${m.activo ? '' : 'opacity-60'}`}>
                <SignoAbrir abierta={abierta === i} tamano="h-6 w-6 text-[14px]" />
                <span className="text-[16px] font-semibold">
                  {m.nombre.trim() || <span className="text-hueso/50">Sin nombre</span>}
                </span>
                <span className="rounded-full border border-hueso/25 px-2 py-0.5 text-[13px]
                                 font-semibold text-hueso/70">{m.tipo}</span>
                {m.nuevo && (
                  <span className="rounded-full border border-ambar-fuerte/60 px-2 py-0.5 text-[13px]
                                   font-semibold text-ambar-texto">nuevo · sin guardar</span>
                )}
                {!m.activo && (
                  <span className="rounded-full border border-hueso/40 px-2 py-0.5 text-[13px]
                                   font-semibold text-hueso/80">desactivado</span>
                )}
                {m.sitioPublico && (
                  <span className="rounded-full border border-verde/50 px-2 py-0.5 text-[13px]
                                   font-semibold text-verde-texto">sitio y reservas</span>
                )}
                {m.bonoVendedor && (
                  <span className="rounded-full border border-oro/60 px-2 py-0.5 text-[13px]
                                   font-semibold text-oro">★ bono vendedor</span>
                )}
                {m.loCobra && (
                  <span className="rounded-full border border-ambar-fuerte/60 px-2 py-0.5 text-[13px]
                                   font-semibold text-ambar-texto">lo cobra {m.loCobra}</span>
                )}
                {m.cotizacion && (
                  <span className="rounded-full border border-rosa/50 px-2 py-0.5 text-[13px]
                                   font-semibold text-rosa-texto">
                    se cotiza · {enMoneda(m.precioCotizacion, m.moneda)}
                  </span>
                )}
              </button>
              {/* **Un producto que ya se vendió o se cotizó no se quita: se
                  desactiva** (2026-11-10, lo pidió el cliente). Quitarlo
                  dejaría sus cotizaciones sin tipo —sus personas pasarían a
                  cero al editarlas— y sus reservas en el aviso amarillo.
                  Desactivar y activar **se guardan en el acto**, como en
                  `/equipo`: al desactivar, la línea desaparece de la lista
                  y con ella el botón de guardarla. */}
              {soloMira ? null : !nombreFijo(m, usados) ? (
                <button onClick={() => {
                  if (m.nombre.trim() && !confirm(`¿Quitar ${m.nombre} del catálogo? `
                    + 'Nunca se vendió ni se cotizó, así que se borra.')) return;
                  if (m.nuevo) return descartar(i);
                  setMenus(menus.filter((_, k) => k !== i)); setSucio(true); setAbierta(null);
                }} className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto">
                  Quitar
                </button>
              ) : m.activo ? (
                <button disabled={guardando} onClick={() => {
                  if (!confirm(`¿Desactivar ${m.nombre}? Deja de ofrecerse en las reservas y `
                    + 'en las cotizaciones. Lo que ya se vendió o se cotizó no cambia.'
                    + (sucio ? ' Se guardan también los otros cambios de esta pantalla.' : '')))
                    return;
                  setAbierta(null);
                  guardar(menus.map((x, k) => (k === i ? { ...x, activo: false } : x)));
                }} className="boton shrink-0">
                  Desactivar
                </button>
              ) : (
                <button disabled={guardando} onClick={() => {
                  if (sucio && !confirm('Se guardan también los otros cambios de esta pantalla.'))
                    return;
                  guardar(menus.map((x, k) => (k === i ? { ...x, activo: true } : x)));
                }} className="boton shrink-0">
                  Activar
                </button>
              )}
            </div>

            {abierta === i && (
              <fieldset disabled={soloMira}
                className={`m-0 min-w-0 space-y-5 border-0 ${CUERPO_ABIERTO} p-4 lg:space-y-3 lg:p-3`}>
                {/* **En el computador la ficha entra en la pantalla** (2026-11-21,
                    regla *una tarjeta abierta cabe en una pantalla*): el nombre y
                    *Qué es* en una fila, los tres interruptores en otra, y los
                    precios de la reserva al lado de los de la cotización.
                    Apilada medía 788px. */}
                <div className="space-y-5 lg:flex lg:items-start lg:gap-8 lg:space-y-0">
                <div className="space-y-2 lg:w-[28rem] lg:shrink-0">
                <Campo etiqueta="Nombre" ancho="w-full sm:max-w-md">
                  <input type="text" value={m.nombre} className={ENTRADA}
                    placeholder="Si es un menú: como se llama en Shopify"
                    readOnly={nombreFijo(m, usados)}
                    onChange={(e) => cambiar(i, { nombre: e.target.value })} />
                </Campo>
                {m.nuevo && nombreRepetido(menus, i) && (
                  <p className="text-[13px] font-semibold text-ambar-texto">
                    Ya hay un producto que se llama así: agrégale lo que lo distingue.
                  </p>
                )}
                {/* Renombrar uno usado sería quitarlo: lo vendido y lo
                    cotizado guardan el nombre que tenía. */}
                {nombreFijo(m, usados) && (
                  <p className="flex items-center text-[13px] text-hueso/70">
                    🔒 Ya se vendió o se cotizó: el nombre no se cambia.
                    <AyudaCorta titulo="El nombre no se cambia">
                      Lo vendido y lo cotizado guardan el nombre que tenía. Si
                      cambió de nombre, agrega uno nuevo y desactiva éste.
                    </AyudaCorta>
                  </p>
                )}
                </div>

                <div>
                  <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:mb-1">
                    Qué es
                    <AyudaCorta titulo="Qué es">
                      Solo los de tipo Menú suman invitados. La once o el show no son gente nueva.
                    </AyudaCorta>
                  </p>
                  <Elegir etiqueta="Tipo de producto" valores={Object.values(TIPO_PRODUCTO)}
                    valor={m.tipo} onElegir={(v) => cambiar(i, { tipo: v })} />
                </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Interruptor encendido={m.sitioPublico}
                    onCambio={(b) => cambiar(i, { sitioPublico: b })}
                    texto="Se vende en el sitio y en las reservas"
                    ayuda="Aparece al anotar una reserva a mano. No cambia Shopify." />
                  <Interruptor encendido={m.cotizacion}
                    onCambio={(b) => cambiar(i, { cotizacion: b })}
                    texto="Se puede cotizar"
                    ayuda="Aparece al armar una cotización." />
                  {/* **El bono del vendedor** (2026-11-12): lo marcan los
                      menús más valiosos, que empujan la venta. Ver
                      `lib/vendedores.ts`. */}
                  <Interruptor encendido={m.bonoVendedor}
                    onCambio={(b) => cambiar(i, { bonoVendedor: b })}
                    texto="Suma el bono del vendedor"
                    ayuda="Sus líneas ganan los puntos de bono de la ficha de cada vendedor." />
                </div>

                {(m.sitioPublico || m.cotizacion) && (
                <div className="space-y-5 lg:flex lg:items-start lg:gap-8 lg:space-y-0">
                {m.sitioPublico && (
                  <div className="flex flex-wrap items-end gap-3 lg:shrink-0">
                    <Campo etiqueta="Reserva: pagando en línea" ancho="w-full sm:w-[17rem] lg:w-64">
                      <input type="number" min={0} step={1000} className={ENTRADA}
                        value={m.precioEnLinea || ''} placeholder="sin poner"
                        onChange={(e) => cambiar(i, { precioEnLinea: aMonto(e.target.value) })} />
                    </Campo>
                    <Campo etiqueta="Reserva: pagando en el local" ancho="w-full sm:w-[17rem] lg:w-64">
                      <input type="number" min={0} step={1000} className={ENTRADA}
                        value={m.precioEnLocal || ''} placeholder="sin poner"
                        onChange={(e) => cambiar(i, { precioEnLocal: aMonto(e.target.value) })} />
                    </Campo>
                    <span className="pb-2"><AyudaCorta tema="preciosReserva" /></span>
                  </div>
                )}

                {m.cotizacion && (
                  <div className="space-y-4 rounded border border-rosa/30 p-3 lg:min-w-0 lg:flex-1 lg:space-y-1.5 lg:px-3 lg:py-2">
                    <p className="flex items-center text-[13px] font-semibold uppercase tracking-wide text-rosa-texto">
                      En una cotización
                      <AyudaCorta titulo="En una cotización">
                        Es el precio que propone: en cada cotización se puede cambiar o
                        aplicarle un descuento.
                      </AyudaCorta>
                    </p>
                    <div className="space-y-4 lg:flex lg:flex-wrap lg:items-end lg:gap-x-5 lg:gap-y-2 lg:space-y-0">
                    <div>
                      <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:mb-1">
                        Cómo se cobra <AyudaCorta tema="cobro" />
                      </p>
                      <Elegir etiqueta="Cómo se cobra" valores={Object.values(COBRO)}
                        valor={m.cobro} onElegir={(v) => cambiar(i, { cobro: v })} />
                    </div>
                    <div className="flex flex-wrap items-end gap-4 lg:contents">
                      <Campo etiqueta={`Precio que propone${m.cobro === COBRO.porPersona
                        ? ' (por persona)' : ''}`} ancho="w-full sm:w-[19rem]">
                        <input type="text" inputMode="decimal" className={ENTRADA}
                          defaultValue={m.precioCotizacion ? String(m.precioCotizacion).replace('.', ',') : ''}
                          placeholder={m.moneda === MONEDA.uf ? 'ej. 2,61' : 'ej. 45000'}
                          onBlur={(e) => cambiar(i, { precioCotizacion: aPrecio(e.target.value) })} />
                      </Campo>
                      <div>
                        <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:mb-1">
                          Moneda <AyudaCorta tema="moneda" />
                        </p>
                        <Elegir etiqueta="Moneda" valores={Object.values(MONEDA)}
                          valor={m.moneda} onElegir={(v) => cambiar(i, { moneda: v })} />
                      </div>
                      <div>
                        <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:mb-1">
                          El precio <AyudaCorta tema="ivaProducto" />
                        </p>
                        <Elegir etiqueta="IVA del precio" valores={Object.values(IVA_PRECIO)}
                          valor={m.iva} onElegir={(v) => cambiar(i, { iva: v })} />
                      </div>
                      {/* **Lo que cuesta** (2026-11-23, el simulador de evento).
                          Solo para quien ve los costos: a los demás ni les llega. */}
                      {veCostos && (
                        <Campo etiqueta={`Costo${m.cobro === COBRO.porPersona ? ' (por persona)' : ''}`} ancho="w-full sm:w-[12rem]">
                          <input type="text" inputMode="numeric" className={ENTRADA}
                            defaultValue={m.costo ? String(m.costo) : ''} placeholder="sin IVA"
                            aria-label="Costo del producto"
                            onBlur={(e) => cambiar(i, { costo: Math.max(0, Math.round(Number(e.target.value.replace(/[^\d]/g, '')) || 0)) })} />
                        </Campo>
                      )}
                      {/* **Lo cobra otra empresa** (2026-11-23): el karting. Solo
                          un extra: un menú, el arriendo o el show son nuestros. */}
                      {/* **Quién lo cobra se elige de la lista** (2026-11-24,
                          *Productos → 🤝 Otras empresas*): el directo
                          (*Nosotros*) y el que abre la lista con buscador. */}
                      {m.tipo === TIPO_PRODUCTO.extra && (
                        <Campo etiqueta="Lo cobra" ancho="w-full sm:w-[22rem]" ayuda="loCobra">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" aria-pressed={!m.loCobra}
                              onClick={() => { cambiar(i, { loCobra: '' }); setEligiendoEmpresa(null); }}
                              className={`boton min-h-[40px] ${!m.loCobra ? 'border-oro bg-oro/15 font-semibold text-hueso' : ''}`}>
                              Nosotros
                            </button>
                            <button type="button" aria-pressed={!!m.loCobra}
                              onClick={() => setEligiendoEmpresa(eligiendoEmpresa === i ? null : i)}
                              className={`boton min-h-[40px] ${m.loCobra ? 'border-oro bg-oro/15 font-semibold text-hueso' : ''}`}>
                              {m.loCobra ? `🤝 ${m.loCobra}` : 'Otra empresa…'}
                            </button>
                          </div>
                          {eligiendoEmpresa === i && (
                            <div className="mt-2">
                              <BuscarEnLista etiqueta="La cobra" vacia="Todavía no hay otras empresas: agrega la primera abajo."
                                elegido={m.loCobra}
                                opciones={otrasEmpresas.filter((e) => e.activa || e.nombre === m.loCobra)
                                  .map((e) => ({ id: e.nombre, nombre: e.nombre, detalle: e.que || datosEnFrase(e) }))}
                                onElegir={(nombre) => { cambiar(i, { loCobra: nombre }); setEligiendoEmpresa(null); }}
                                onCerrar={() => setEligiendoEmpresa(null)}
                                pie={<button type="button" className="boton min-h-[40px]" onClick={() => setEmpresaNuevaPara(i)}>
                                  + Empresa nueva…
                                </button>} />
                            </div>
                          )}
                        </Campo>
                      )}
                    </div>
                    </div>
                  </div>
                )}
                </div>
                )}

                {/* **Qué incluye, escrito para este producto** (2026-11-24, lo
                    pidió el cliente: un menú especial con su propio detalle). Dos
                    campos, cada uno reemplaza su parte del texto del sitio en la
                    cotización y el contrato (`detalleDe()`); en blanco, el de
                    siempre, que se ve de muestra. Bebestibles, solo en un menú. */}
                {(() => {
                  const delSitio = textoDelSitio(m.nombre);
                  const esMenu = m.tipo === TIPO_PRODUCTO.menu;
                  const muestraComida = delSitio?.casa ? MENU_CASA_DEL_SITIO : delSitio?.detalle ?? '';
                  return (
                    <div className={`grid grid-cols-1 gap-3 ${esMenu ? 'lg:grid-cols-2' : ''}`}>
                      <Campo etiqueta="Qué incluye" ayuda="descripcionProducto">
                        <textarea rows={3} className={`${ENTRADA} resize-y leading-snug`} value={m.descripcion}
                          aria-label="Qué incluye" maxLength={1500}
                          placeholder={muestraComida
                            ? `En blanco va el texto del sitio:\n${muestraComida}`
                            : 'En blanco, la cotización no lo detalla. Ej.: Entrada: … · Plato principal: …'}
                          onFocus={() => alEntrarTexto(i, 'descripcion')} onBlur={() => alSalirTexto(i, 'descripcion')}
                          onChange={(e) => cambiar(i, { descripcion: e.target.value })} />
                      </Campo>
                      {esMenu && (
                        <Campo etiqueta="Bebestibles" ayuda="bebestiblesProducto">
                          <textarea rows={3} className={`${ENTRADA} resize-y leading-snug`} value={m.bebestibles}
                            aria-label="Bebestibles" maxLength={1500}
                            placeholder={delSitio?.casa
                              ? `En blanco va el texto del sitio:\n${delSitio.detalle}`
                              : 'En blanco, sin bebestibles aparte. Ej.: bebidas, jugos naturales y agua.'}
                            onFocus={() => alEntrarTexto(i, 'bebestibles')} onBlur={() => alSalirTexto(i, 'bebestibles')}
                            onChange={(e) => cambiar(i, { bebestibles: e.target.value })} />
                        </Campo>
                      )}
                    </div>
                  );
                })()}

                {m.nuevo ? (!soloMira && (
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hueso/15 pt-3 lg:pt-2">
                    <span className="mr-auto text-[14px] text-hueso/75">
                      {m.nombre.trim() ? 'Se agrega al catálogo al guardarlo.' : 'Escríbele un nombre para poder guardarlo.'}
                    </span>
                    <button type="button" className="boton min-h-[44px]" onClick={() => descartar(i)}>Cancelar</button>
                    <button type="button" disabled={!m.nombre.trim() || guardando} onClick={() => guardar(menus)}
                      className="boton boton-relleno min-h-[44px] disabled:opacity-50">
                      {guardando ? 'Guardando…' : 'Guardar producto'}
                    </button>
                  </div>
                )) : sucio && <div className="flex justify-end">{botonGuardar}</div>}
              </fieldset>
            )}
            {abierta === i && <PieCerrar nombre={m.nombre.trim()} onCerrar={() => abrir(null)} />}
          </li>
        ))}
      </ul>

      {!soloMira && (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            // Si ya hay uno nuevo sin nombre, se abre ese: no se apilan borradores vacíos.
            const vacio = menus.findIndex((m) => m.nuevo && !m.nombre.trim());
            if (vacio !== -1) return setAbierta(vacio);
            setMenus([...menus, { ...nuevoProducto({ nombre: '' }), nuevo: true }]);
            setAbierta(menus.length);
            setSucio(true);
          }}
          className="boton min-h-[44px]">
          + Agregar producto
        </button>
        <span className="flex-1" />
        {sucio && !tarjetaAbierta && <span className="text-[14px] text-hueso/70">Hay cambios sin guardar.</span>}
        {!tarjetaAbierta && botonGuardar}
      </div>
      )}

      {empresaNuevaPara !== null && menus[empresaNuevaPara] && (
        <EmpresaNueva producto={menus[empresaNuevaPara].nombre.trim()} onCerrar={() => setEmpresaNuevaPara(null)}
          onGuardada={(empresas, nombre) => {
            setOtrasEmpresas(empresas);
            cambiar(empresaNuevaPara, { loCobra: nombre });
            setEligiendoEmpresa(null); setEmpresaNuevaPara(null);
          }} />
      )}

      <AvisoFijo clave="menus-desactivar" className="mt-6 max-w-2xl">
        <strong>Un producto que ya se vendió o se cotizó no se quita, se
        desactiva</strong>: deja de ofrecerse y todo lo anterior lo sigue
        encontrando. Solo se quita lo que nunca se usó.{' '}
        <strong>Ojo al renombrar en Shopify:</strong> los pedidos ya hechos
        guardan el nombre que tenían, así que sus reservas van a contarse
        aparte hasta que se corrijan esas filas en la planilla.
      </AvisoFijo>
      </>}
    </section>
  );
}
