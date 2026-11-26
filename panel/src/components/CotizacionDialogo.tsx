'use client';

/**
 * Armar una cotización, en cuatro pasos (Fase 2, 2026-11-10).
 *
 * **Una pregunta por pantalla**, que es la regla PlayStation llevada a un
 * formulario: 1 Cliente · 2 Evento · 3 Productos · 4 Enviar. Los pasos son
 * botones y se puede saltar entre ellos: es un orden sugerido, no una cárcel.
 *
 * - **El cliente se elige de su ficha** (o se crea ahí mismo, con la misma
 *   pregunta de "¿es alguno de estos?" de `/clientes`). Se escribe una vez.
 * - **Lo que se ve es lo que se guarda**: las líneas pasan por
 *   `prepararLineas()` —la misma función que usa el servidor— en cada
 *   dibujado, así que el monto fijo en 1 y la regla del
 *   show ecuestre se ven mientras se escribe.
 * - **Un candidato** es una cotización que se guarda en el paso 2, con
 *   cliente, fecha e invitados. Después se sigue cotizando desde ahí mismo.
 * - **Lo que no es de esta cuenta se ve y no se toca**: el vendedor ve las
 *   cotizaciones de otros en solo lectura (`<fieldset disabled>`).
 */
import BuscarEnLista from './BuscarEnLista';
import CambiarVendedor from './CambiarVendedor';
import AgregarVendedor from './AgregarVendedor';
import { useEffect, useMemo, useRef, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import BotonGuardar from './BotonGuardar';
import { rutValido } from '@/lib/banco';
import AvisoGuardado from './AvisoGuardado';
import { usarAutoguardado } from './usarAutoguardado';
import Dialogo from './Dialogo';
import { PieCorreccion } from './Correccion';
import { cambiosDeLaCotizacion, textoDeCambios, type CotizacionEnCorreccion } from '@/lib/correccion';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import { avisar, copiarConAviso } from './AvisoFlotante';
import { normalizar } from '@/lib/columnas';
import {
  cuentasDe, otrasEmpresas, coordinadasDe, totalDeLinea, folioDe, estadoVisible, ESTADO_PRESUPUESTO, IVA,
  DOCUMENTO, documentoDe, numeroONulo, montoONulo, estaMandada, totalDe, estadoNormal, lineasDe, type Documento, type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import {
  prepararLineas, esDiaPublico, lineaDeProducto, yaEstaEnLaCotizacion, productoDe, showDe, cambiarCantidad,
  alternativasDe, letraDe, grupoDe, vivasDelGrupo, sigueViva, paraElLink,
  MOTIVOS_PERDIDA, aplicaReglaShow, minimoShowEnLinea, enCarrera, type ReglaShow,
  arriendoDelDia, personasParaMinimos, enFormaDeLinea, conMinimoShow, conMinimoArriendo, type ReglaArriendo
} from '@/lib/cotizar';
import { paraCotizar, precioParaCotizar, aPrecio, TIPO_PRODUCTO, MONEDA, COBRO, textosDelProducto, type Menu } from '@/lib/menus';
import { igualAlProducto } from '@/lib/detalle';
import {
  condicionesDe, estadoCobros, montoCobro, CONCEPTO_COBRO, ganaSinRespaldo, type Cobro
} from '@/lib/cobros';
import { buscarClientes, porNombreCliente, faltaParaFactura, empresaAparte, type Cliente } from '@/lib/clientes';
import { puedeTocarPresupuesto, puede, esSuya, type Rol } from '@/lib/auth';
import { porConfirmarDelGrupo } from '@/lib/envio';
import { achicarFoto } from '@/lib/achicarFoto';
import { faltaDelCliente, partirHorario, textoHorario, moverHora, PASO_HORARIO } from '@/lib/contrato';
import CampoRut from './CampoRut';
import { frasesCancelacion } from '@/lib/cancelacion';
import CancelarEvento from './CancelarEvento';
import SeCayo from './SeCayo';
import PedirCondiciones from './PedirCondiciones';
import {
  topesDe, topesConAprobadas, aprobadasDe, minimosAprobados, alTope, condicionesEspecialesDe, leerPedido, frasePedido,
  fraseCondiciones, valorCondicion, NOMBRE_CONDICION, plazosVencidos, fechaDelContrato, sobreElTope,
  type CampoCondicion, type Topes
} from '@/lib/condiciones';
import CorregirGanada from './CorregirGanada';
import BloqueCancelada from './BloqueCancelada';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, esFecha, enCorto, sumarDias } from '@/lib/fechas';
import { estaCerrado, esPrivada, esExclusiva } from '@/lib/columnas';
import { enlaceWhatsApp, saludoAlCliente } from '@/lib/contacto';
import { abrirWhatsApp } from './BotonWhatsApp';
import { cupoParaGanar } from '@/lib/dias';
import { tieneArriendo, esExclusivo, exclusividadDe, plazoParaLiberar } from '@/lib/exclusivo';
import { usarSoloMira } from './SesionCliente';
import { marcoGrupo, marcoTarjeta, TITULO_GRUPO } from './TarjetaLista';
import SimularEvento from './SimularEvento';
import EditarCliente from './EditarCliente';
import ElegirFecha from './ElegirFecha';
import NotasCotizacion from './NotasCotizacion';
import LoConversado from './LoConversado';
import { puedeVerNotas, ultimaNota, type Nota } from '@/lib/notas';
import { agendaDe, fraseDe } from '@/lib/agenda';
import AplicarPromocion from './AplicarPromocion';
import TextoDeLinea from './TextoDeLinea';
import { empresaDe, mensajeParaCoordinar, type OtraEmpresa } from '@/lib/otrasEmpresas';
import {
  promocionDe, beneficioDePromocion, rigePromocion, aplicarALineas, type Promocion
} from '@/lib/promociones';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

type Linea = Omit<LineaPresupuesto, 'fila'>;

export interface DatosCotizar {
  menus: Menu[];
  clientes: Cliente[];
  fechas: { fecha: string; estado: string; capacidad: number }[];
  descuentos: number[];
  /** Las líneas de todas las cotizaciones, para el total de cada alternativa. */
  lineas?: LineaPresupuesto[];
  /** Las condiciones de pago por defecto, de Configuración. */
  condiciones?: { anticipoPct: number; saldoDias: number };
  /** El mínimo del show en un día privado con poca gente (2026-11-20). */
  reglaShow?: ReglaShow | null;
  /**
   * **El arriendo mínimo** (2026-11-23): la regla, qué días abre la regla
   * diaria, las fechas sin exclusivo y cuántas reservas ocupan lugar cada día.
   */
  reglaArriendo?: ReglaArriendo | null;
  diasAbiertos?: number[];
  fechasSinExclusivo?: string[];
  reservasPorDia?: Record<string, number>;
  /** Los plazos del seguimiento de Configuración: los que rigen en blanco. */
  seguimiento?: { dias: number; antesEvento: number };
  /** El nombre comercial, para el asunto del correo. */
  empresa?: string;
  /** El cupo de un día nuevo, para `cupoParaGanar()`. */
  cupoNormal?: number;
  /** Con cuántos días de anticipación se puede pedir liberar un día (Configuración). */
  exclusivoDias?: number;
  horaApertura?: string;
  /** Para el contrato: el horario de siempre y qué le falta a la empresa. */
  contrato?: { horario: string; faltaEmpresa: string[];
    tranquilidad?: { cambiosFecha: number; cancelacionDias: number; reembolsoPct: number; avisoCambio?: number } };
  /**
   * **Los topes de Configuración** (2026-11-23, `condiciones.ts`): lo más
   * generoso que un vendedor puede ofrecer sin pedirlo, y con cuántos días de
   * aviso se cambia la fecha.
   */
  topes?: Topes;
  cambiosFechaDias?: number;
  /** Los días de vigencia de Configuración: los de una renovación. */
  vigencia?: number;
  /** Las promociones (2026-11-24): las activas, para aplicarlas, y las ya aplicadas en alguna. */
  promociones?: Promocion[];
  /** Las otras empresas (2026-11-24): su teléfono, para coordinar por WhatsApp. */
  otrasEmpresas?: OtraEmpresa[];
  hoy: string;
  usuario: string;
  rol: string;
  /** Los socios comerciales, para *¿Viene por un socio comercial?* (2026-11-12). */
  socios?: { id: string; nombre: string; activo: boolean; porConfirmar?: boolean }[];
  /** A quién se le puede pasar la cotización (2026-11-22): solo llega a quien puede cambiar el vendedor. */
  vendedores?: { usuario: string; nombre: string }[];
  /** Los días cerrados y si esta cuenta puede corregirlos (2026-11-21). Ver `diaCerrado`. */
  cerrados?: string[];
  puedeCorregir?: boolean;
  /** Las notas que esta cuenta puede leer (2026-11-23, la agenda): ver `lib/notas.ts`. */
  notas?: Nota[];
}

/** El 4 se llamaba *Enviar* y ahí no se manda nada solo: tiene el documento,
 *  el pago, el contrato y el cierre (2026-11-11). Mandarla es un botón más. */
const PASOS = ['Cliente', 'Evento', 'Productos', 'Envío', 'Contrato'] as const;
const TIPOS_EVENTO = ['Cumpleaños', 'Matrimonio', 'Empresa', 'Paseo', 'Otro'];

/** Qué es ese día, en palabras, para el paso 2. */
function estadoDelDia(fecha: string, fechas: DatosCotizar['fechas']): string {
  if (!esFecha(fecha)) return '';
  const d = fechas.find((f) => f.fecha === fecha);
  if (!d) return 'Ese día no está en el calendario: cuenta como evento privado.';
  if (estaCerrado(d.estado)) return 'Ese día está cerrado.';
  if (esExclusiva(d.estado)) return 'Ese día está arrendado en exclusiva.';
  if (esPrivada(d.estado)) return 'Ese día es privado.';
  return 'Ese día es público: el show ecuestre va incluido.';
}

/**
 * **El horario se elige, no se escribe** (2026-11-12, lo pidió el cliente:
 * *"elegible de forma fácil, estilo PlayStation… siempre el mismo
 * formato"*). Desde y hasta con − y + de media hora; se guarda como
 * `13:00 a 18:00`. En blanco rige el de Configuración, y lo dice.
 */
function ElegirHorario({ valor, deSiempre, onCambio, rotulo }: {
  valor: string; deSiempre: string; onCambio: (v: string) => void; rotulo: string;
}) {
  const propio = partirHorario(valor);
  const base = propio ?? partirHorario(deSiempre) ?? { desde: '13:00', hasta: '18:00' };
  /**
   * **Pasa del cierre de siempre** (2026-11-23, lo decidió el cliente: *"como
   * recomendación, no como condición… puede ser que se dice, no, ok, los
   * dejamos hasta las 23. Mejor vender"*). Se avisa y no se frena: el tiempo
   * extra conviene que vaya en el precio.
   */
  const cierre = partirHorario(deSiempre)?.hasta ?? '';
  const pasaCierre = !!propio && !!cierre && (base.hasta > cierre || base.hasta <= base.desde);
  const poner = (desde: string, hasta: string) => onCambio(textoHorario(desde, hasta));
  const fila = (rotulo: string, hora: string, cambiar: (h: string) => void) => (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[14px] font-semibold text-hueso/75">{rotulo}</span>
      <button type="button" aria-label={`${rotulo}: media hora antes`}
        className="boton h-12 w-12 !text-[22px] !font-bold"
        onClick={() => cambiar(moverHora(hora, -PASO_HORARIO))}>−</button>
      <span className="w-20 text-center text-[22px] font-bold tabular-nums">{hora}</span>
      <button type="button" aria-label={`${rotulo}: media hora después`}
        className="boton h-12 w-12 !text-[22px] !font-bold"
        onClick={() => cambiar(moverHora(hora, PASO_HORARIO))}>+</button>
    </div>
  );
  // *Volver al de siempre* va en la línea del rótulo, a la derecha: debajo
  // sumaba un renglón entero a la columna (2026-11-23).
  const volver = !!valor.trim() && !!propio && valor !== deSiempre;
  return (
    <div className="space-y-2">
      <div className="-mb-1 flex min-h-[20px] flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="block text-[13px] font-medium uppercase tracking-wide text-hueso/60">{rotulo}</span>
        {volver && (
          <button type="button" className="boton min-h-[36px] !text-[13px]" title={`Volver al de siempre (${deSiempre})`}
            aria-label={`Volver al de siempre (${deSiempre})`} onClick={() => onCambio('')}>
            ↺ Volver al de siempre
          </button>
        )}
      </div>
      {fila('Desde', base.desde, (h) => poner(h, base.hasta))}
      {fila('Hasta', base.hasta, (h) => poner(base.desde, h))}
      {base.hasta <= base.desde && (
        <p className="text-[13px] text-hueso/70">Termina después de medianoche.</p>
      )}
      {pasaCierre && (
        <p className="text-[14px] font-semibold text-ambar-texto">
          ⚠ Pasa del cierre ({cierre}): cobra el extra
          <AyudaCorta tema="horarioExtra" />
        </p>
      )}
      {!valor.trim() ? (
        <p className="text-[13px] text-hueso/70">El de siempre (Configuración).</p>
      ) : !propio && (
        <p className="text-[13px] font-semibold text-ambar-texto">
          Estaba escrito a mano: “{valor}”. Con − y + queda en el formato de siempre.
        </p>
      )}
    </div>
  );
}

function Elegir({ opciones, valor, onElegir, etiqueta }: {
  opciones: string[]; valor: string; onElegir: (v: string) => void; etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === valor}
          onClick={() => onElegir(o === valor ? '' : o)}
          className={`boton min-h-[40px] ${o === valor ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function CotizacionDialogo({
  presupuesto, lineasIniciales, fechaInicial, clienteInicial, datos, onCambio, onCerrar,
  pasoInicial, onAbrir, alternativas = []
}: {
  /** En qué paso abrir. Por defecto, Productos si ya existe. */
  pasoInicial?: number;
  /**
   * Abrir otra cotización en esta misma ventana: una alternativa, o la que
   * se acaba de crear. La pantalla recarga y la abre ya guardada.
   */
  onAbrir?: (id: string, paso?: number) => void;
  /** Las alternativas del grupo de esta cotización, ella incluida. */
  alternativas?: Presupuesto[];
  /** Para una nueva desde la ficha de un cliente. */
  clienteInicial?: string;
  /** null es una cotización nueva. */
  presupuesto: Presupuesto | null;
  lineasIniciales: Linea[];
  /** Para una nueva desde la tarjeta de un día. */
  fechaInicial?: string;
  datos: DatosCotizar;
  /** Se guardó algo: hay que recargar la lista. */
  onCambio: () => void;
  onCerrar: () => void;
}) {
  const p = presupuesto;
  const [clientes, setClientes] = useState<Cliente[]>(datos.clientes);
  const [paso, setPaso] = useState(pasoInicial ?? (p ? 3 : clienteInicial ? 2 : 1));
  /** Lo último que dijo el servidor al guardar, para el aviso del autoguardado. */
  const ultimoError = useRef('');
  /** Si el autoguardado guardó algo: al cerrar, la lista de atrás se recarga. */
  const huboGuardado = useRef(false);
  /**
   * **Cambiar de paso empieza arriba** (2026-11-12, lo pidió el cliente): se
   * cambia con el botón del pie, y la ventana se quedaba abajo, en el
   * scroll del paso anterior.
   */
  const arriba = useRef<HTMLElement>(null);
  useEffect(() => {
    arriba.current?.closest('[role=dialog]')?.scrollTo({ top: 0 });
  }, [paso]);
  const [idCliente, setIdCliente] = useState(p?.idCliente ?? clienteInicial ?? '');
  const [fecha, setFecha] = useState(p ? p.fecha : (fechaInicial ?? ''));
  const [sinFecha, setSinFecha] = useState(p ? !p.fecha && !!p.periodo : false);
  const [periodo, setPeriodo] = useState(p?.periodo ?? '');
  const [invitados, setInvitados] = useState(p?.invitados ?? 0);
  const [tipoEvento, setTipoEvento] = useState(p?.tipoEvento ?? '');
  /** El socio comercial que trajo la venta: su id, o vacío (2026-11-12). */
  const [socio, setSocio] = useState(p?.socio ?? '');
  /** Si la lista de socios con buscador está abierta. */
  const [buscandoSocio, setBuscandoSocio] = useState(false);
  /** Los socios recién agregados desde esta ventana (2026-11-20), hasta que la lista se recargue. */
  const [sociosNuevos, setSociosNuevos] = useState<{ id: string; nombre: string; activo: boolean; porConfirmar?: boolean }[]>([]);
  const [agregandoSocio, setAgregandoSocio] = useState(false);
  const [notas, setNotas] = useState(p?.notas ?? '');
  /**
   * **Para cuándo se le prometió la cotización** (2026-11-23, la agenda del
   * vendedor; lo decidió el cliente: *"que el vendedor elige nomás"*). Solo
   * mientras no se mande: después está cumplido. Va a *✍ Por redactar*.
   */
  const [redactarAntes, setRedactarAntes] = useState(p?.redactarAntes ?? '');
  /** La ventanita de las notas y el próximo contacto (2026-11-23). */
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  /** El próximo contacto como quedó al anotar: la cotización abierta no se recarga. */
  const [recontactar, setRecontactar] = useState(p?.recontactar ?? '');
  const [estado, setEstado] = useState(
    p ? (estadoVisible(p, datos.hoy) === 'Vencida' ? p.estado : estadoVisible(p, datos.hoy))
      : ESTADO_PRESUPUESTO.borrador);
  const [motivo, setMotivo] = useState(p?.motivo ?? '');
  /**
   * **"¿El día es exclusivo?"** (2026-11-12, lo pidió el cliente): se
   * pregunta cuando la cotización lleva arriendo, sin obligar. `'sí'`, `'no'`
   * o `''` sin contestar. Se guarda solo, como el resto de la cotización.
   */
  const [exclusivo, setExclusivo] = useState(p?.exclusivo ?? '');
  /** El pedido de liberar el día y su decisión: lo escribe el servidor. */
  const [marcaExcl, setMarcaExcl] = useState(p?.exclusividad ?? '');
  const [descuento, setDescuento] = useState(p?.descuento ?? 0);
  /** **La promoción aplicada** (2026-11-24): su ID, o vacío. */
  const [promocion, setPromocion] = useState(p?.promocion ?? '');
  const [aplicandoPromo, setAplicandoPromo] = useState(false);
  /** La línea cuyo *Qué incluye* se está editando (2026-11-24), por su posición. */
  const [textoDe, setTextoDe] = useState<number | null>(null);
  /** `''` es por definir. Ver `DOCUMENTO`. */
  const [documento, setDocumento] = useState<Documento>(p?.documento ?? '');
  /**
   * Los datos de facturación **se escriben acá pero viven en la ficha**: al
   * guardar la cotización se guardan en el cliente, para no pedirlos de
   * nuevo la próxima vez. Nacen con lo que la ficha ya tenga.
   */
  const fichaInicial = datos.clientes.find((c) => c.id === (p?.idCliente ?? clienteInicial));
  /**
   * Las condiciones de pago de esta cotización, como se escriben: **en
   * blanco rige Configuración**, y "0" en el anticipo es sin anticipo.
   */
  const [anticipoTxt, setAnticipoTxt] = useState(p?.anticipo == null ? '' : String(p.anticipo));
  /** El anticipo en pesos, si se acordó un monto (manda sobre el %). */
  const [anticipoMontoTxt, setAnticipoMontoTxt] = useState(p?.anticipoMonto ? String(p.anticipoMonto) : '');
  const [saldoTxt, setSaldoTxt] = useState(p?.saldoDias == null ? '' : String(p.saldoDias));
  /**
   * **La UF de esta cotización**, fija: se pide la primera vez que se agrega
   * un producto en UF, y se cambia solo con *Usar la UF de hoy*. 0 es sin UF.
   */
  const [uf, setUf] = useState(p?.uf ?? 0);
  const [fechaUF, setFechaUF] = useState(p?.fechaUF ?? '');
  /** Lo del contrato (Fase 4): el horario, la Ley 20.393 y lo acordado aparte. */
  const [horario, setHorario] = useState(p?.horario ?? '');
  const [ley20393, setLey20393] = useState(p?.ley20393 ?? false);
  /**
   * **Las condiciones de cancelación** (2026-11-11): en blanco rige
   * Configuración, igual que el anticipo. Son las que imprime el contrato y
   * las que aplica *Cancelar evento* (`lib/cancelacion.ts`).
   */
  const [cambiosTxt, setCambiosTxt] = useState(p?.cambiosFecha == null ? '' : String(p.cambiosFecha));
  const [cancelTxt, setCancelTxt] = useState(p?.cancelacionDias == null ? '' : String(p.cancelacionDias));
  const [reembolsoTxt, setReembolsoTxt] = useState(p?.reembolso == null ? '' : String(p.reembolso));
  /**
   * **Las condiciones especiales** (2026-11-23, `condiciones.ts`): lo pedido
   * por sobre los topes de Configuración y su marca (*pedida*, *aprobada*,
   * *rechazada*). Las escribe `/api/presupuestos/condiciones`.
   */
  const [condPedidas, setCondPedidas] = useState(p?.condicionesPedidas ?? '');
  const [condMarca, setCondMarca] = useState(p?.condicionesEspeciales ?? '');
  const [pidiendoCond, setPidiendoCond] = useState(false);
  /** Lo último que quedó en su tope, para decirlo al lado del campo. */
  const [recorteCond, setRecorteCond] = useState('');
  /**
   * **La vigencia y cuántas veces se renovó** (2026-11-23): la primera
   * renovación la hace el vendedor; la segunda se pide. Viven acá para que
   * *Renovar* se vea en el acto, sin recargar la lista.
   */
  const [validoHastaVivo, setValidoHastaVivo] = useState(p?.validoHasta ?? '');
  const [renovacionesVivas, setRenovacionesVivas] = useState(p?.renovaciones ?? 0);
  const [renovando, setRenovando] = useState(false);
  /** Los plazos del seguimiento de esta cotización; en blanco rige Configuración. */
  const [segTxt, setSegTxt] = useState(p?.seguimientoDias == null ? '' : String(p.seguimientoDias));
  const [avisoTxt, setAvisoTxt] = useState(p?.avisoEvento == null ? '' : String(p.avisoEvento));
  /** Por qué vía se acaba de mandar, mientras se pregunta "¿la mandaste?". */
  const [preguntaEnvio, setPreguntaEnvio] = useState<'' | 'cotizacion' | 'contrato'>('');
  /** Por dónde se intentó mandar: la pregunta ofrece abrirlo de nuevo si no se abrió. */
  const [viaEnvio, setViaEnvio] = useState<'' | 'whatsapp' | 'correo' | 'link' | 'ver'>('');
  /** La ventana *¿Marcarla ganada?*, abierta. */
  /** El id de la alternativa que se va a marcar ganada, o '' si no se pregunta. */
  const [confirmandoGanar, setConfirmandoGanar] = useState('');
  const [corrigiendo, setCorrigiendo] = useState(false);
  // Lo plegado en el computador (ver `camposFactura`, más abajo).
  const [facturaAbierta, setFacturaAbierta] = useState(false);
  const [condAbiertas, setCondAbiertas] = useState(false);
  const [cancelAbierto, setCancelAbierto] = useState(false);
  const [recordarAbierto, setRecordarAbierto] = useState(false);
  /**
   * ***Mandarla de nuevo*, plegado en el computador** (2026-11-23): con la
   * caja *Lo conversado* la columna del seguimiento pasaba de una pantalla.
   * Ya se mandó: volver a mandarla es lo secundario, como *Recordarme*.
   */
  const [mandarAbierto, setMandarAbierto] = useState(false);
  /** El día en que se le mandó el contrato (lo pone el servidor). */
  const [contratoEnviado, setContratoEnviado] = useState(p?.contratoEnviado ?? '');
  const [cancelando, setCancelando] = useState(false);
  /** La ventanita *¿Se cayó?* abierta (2026-11-22). */
  const [cayendo, setCayendo] = useState(false);
  const [acuerdos, setAcuerdos] = useState(p?.acuerdos ?? '');
  /** El contrato firmado subido: quién y cuándo. Que esté es lo que dice "firmado". */
  const [firmado, setFirmado] = useState<null | { por: string; cuando: string }>(
    p?.contrato ? { por: p.contratoSubidoPor, cuando: p.contratoSubido } : null);
  const [subiendoContrato, setSubiendoContrato] = useState(false);
  /** Pide la UF de hoy y la fija. Devuelve el valor, o 0 si no se pudo. */
  async function traerUF(): Promise<number> {
    const d = await fetch('/api/uf').then((r) => r.json()).catch(() => ({}));
    if (!d?.valor) { avisar(d?.error ?? 'No se pudo leer la UF de hoy', 'atencion'); return 0; }
    setUf(d.valor); setFechaUF(d.fecha);
    return d.valor;
  }
  /** Los cobros al cliente. Solo existen para una cotización ya guardada. */
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [medio, setMedio] = useState('');
  /** El id del cobro cuyo comprobante se está subiendo. */
  const [subiendo, setSubiendo] = useState('');
  const [otroMonto, setOtroMonto] = useState<null | { monto: string; concepto: string }>(null);
  useEffect(() => {
    if (!p) return;
    fetch(`/api/presupuestos/cobros?id=${encodeURIComponent(p.id)}`).then((r) => r.json())
      .then((d) => d.cobros && setCobros(d.cobros)).catch(() => {});
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * **Lo pagado en las otras alternativas** (2026-11-12): lo pagado es del
   * evento, así que para ofrecer *Ganó la B* cuenta también el anticipo
   * anotado en la A. Al ganar, el servidor pasa esos cobros a la ganadora.
   */
  const [cobrosOtras, setCobrosOtras] = useState<Cobro[]>([]);
  useEffect(() => {
    if (!p || alternativas.length < 2) return;
    fetch(`/api/presupuestos/cobros?id=${encodeURIComponent(p.id)}&grupo=1`).then((r) => r.json())
      .then((d) => d.cobros && setCobrosOtras(d.cobros.filter((c: Cobro) => c.presupuesto !== p.id)))
      .catch(() => {});
  }, [p?.id, alternativas.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [facturacion, setFacturacion] = useState({
    empresa: fichaInicial?.empresa ?? '', rut: fichaInicial?.rut ?? '',
    giro: fichaInicial?.giro ?? '', domicilio: fichaInicial?.domicilio ?? ''
  });
  const [lineas, setLineas] = useState<Linea[]>(lineasIniciales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState<null | {
    nombre: string; telefono: string; correo: string; empresa: string }>(null);
  const [parecidas, setParecidas] = useState<Cliente[]>([]);
  /**
   * ***✎ Editar cliente*** (2026-11-23, lo pidió el cliente: *"agregar botón
   * editar cliente en cotización"*): la ficha del cliente elegido, en una
   * ventanita, sin salir de la cotización. Es la misma pieza de *Clientes*
   * (`EditarCliente`): se guarda sola, salvo el nombre.
   */
  const [editandoCliente, setEditandoCliente] = useState(false);
  const clientesRef = useRef(clientes);
  clientesRef.current = clientes;
  /**
   * Lo que se guardó en la ficha. Los datos de facturación que cambiaron
   * pasan también a la cotización: si no, al guardarla volvería a escribir
   * en la ficha lo de antes (`guardar()` le manda lo de `facturacion`).
   */
  const alEditarCliente = (lista: Cliente[]) => {
    const antes = clientesRef.current.find((c) => c.id === idCliente);
    const despues = lista.find((c) => c.id === idCliente);
    setClientes(lista);
    if (antes && despues) {
      setFacturacion((f) => {
        const n = { ...f };
        for (const k of ['empresa', 'rut', 'giro', 'domicilio'] as const) {
          if (despues[k] !== antes[k]) n[k] = despues[k];
        }
        return n;
      });
    }
    // Al cerrar la cotización, la lista se vuelve a leer con el nombre nuevo.
    huboGuardado.current = true;
  };

  // Cambiar de cliente trae sus datos de facturación.
  useEffect(() => {
    const c = clientes.find((x) => x.id === idCliente);
    if (c) setFacturacion({ empresa: c.empresa, rut: c.rut, giro: c.giro, domicilio: c.domicilio });
  }, [idCliente]); // eslint-disable-line react-hooks/exhaustive-deps

  const ganada = !!p?.idReserva;
  const cancelada = p?.estado === ESTADO_PRESUPUESTO.cancelada;
  // Con vista gerencia y sin el permiso de cotizar, todo se ve en solo
  // lectura, igual que la cotización de otro vendedor.
  const soloMira = usarSoloMira('presupuestos');
  /** Editar la ficha es del permiso de los clientes, que el servidor vuelve a mirar. */
  const soloMiraClientes = usarSoloMira('clientes');
  const puedeEditarCliente = puede(datos.rol as Rol, 'clientes') && !soloMiraClientes;
  /**
   * **Las notas las leen su vendedor y la gerencia** (2026-11-23, lo decidió
   * el cliente). Valen para todo el grupo de alternativas: es una sola
   * conversación con el cliente.
   */
  const grupoNotas = p ? (p.grupo || p.id) : '';
  const veNotas = !!p && [p, ...alternativas].some((a) => puedeVerNotas(datos.rol, datos.usuario, a.creadoPor));
  const notasDelGrupo = (datos.notas ?? []).filter((n) => n.presupuesto === grupoNotas).length;
  /**
   * **La última nota y el próximo contacto, en *Seguimiento y envío***
   * (2026-11-23, lo pidió el cliente: *"mostrar la última nota que escribió
   * el vendedor. No todas las notas, sino solo la última. Y en ese lugar
   * también mostrar cuándo debería recontactar de nuevo y cuántos
   * recontactos hubo"*). El próximo contacto es el de la agenda
   * (`agendaDe()`), con el día recién elegido en la ventana de notas.
   */
  const ultima = ultimaNota(datos.notas ?? [], grupoNotas);
  const proximo = p
    ? agendaDe([p, ...alternativas].map((a) => ({ ...a, recontactar })), datos.hoy,
        { seguimientoDias: datos.seguimiento?.dias ?? 5, avisoEvento: datos.seguimiento?.antesEvento ?? 14 }).contactar[0]
    : undefined;
  const puedeEditar = !soloMira
    && (!p || puedeTocarPresupuesto(datos.rol as Rol, datos.usuario, p.creadoPor));
  /**
   * **Al abrirla lista y sin confirmar el envío, se pregunta** (2026-11-25, lo
   * pidió el cliente con la foto de la N° 693616: *"hay que reforzar el
   * proceso de que tiene que confirmar si envió la cotización, con popups y
   * aviso dentro del sistema cuando uno pasa por esta cotización por
   * vendedor"*). Solo a quien la creó, y con lo que tenía al abrirla
   * (`porConfirmarDelGrupo()`): una que se está armando no pregunta a la
   * mitad. Sale cada vez que la abre, hasta que diga que sí.
   */
  const [preguntaAlAbrir] = useState(() => !!presupuesto && puedeEditar
    && esSuya(datos.usuario, presupuesto.creadoPor)
    && !!porConfirmarDelGrupo(alternativas.length ? alternativas : [presupuesto], datos.lineas ?? [], datos.hoy));
  useEffect(() => { if (preguntaAlAbrir) setPreguntaEnvio('cotizacion'); }, [preguntaAlAbrir]);
  /** Revisar cobros es de quien hace los pagos, no de quien los anota. */
  const puedePagar = puede(datos.rol as Rol, 'pagar');
  const cliente = clientes.find((c) => c.id === idCliente);
  const fechaReal = sinFecha ? '' : fecha;
  const publico = esFecha(fechaReal) && esDiaPublico(fechaReal, datos.fechas);
  /**
   * **El mínimo del show en un día privado** (2026-11-20): la misma regla del
   * servidor. La gerencia y el administrador pueden pasar por encima, así que
   * para ellos no corre (`showBajoMinimo`).
   */
  const pasaPorEncima = puede(datos.rol as Rol, 'showBajoMinimo');
  /** Si la gerencia, pagos o el administrador ya autorizaron el show bajo el mínimo. */
  const showAutorizado = (p?.showBajoMinimo ?? '').split(' · ')[0];
  /** Los mínimos aprobados como condición especial (2026-11-23): mandan sobre los de Configuración. */
  const minAprobados = minimosAprobados({ condicionesEspeciales: condMarca, condicionesPedidas: condPedidas });
  const reglaShowEfectiva = conMinimoShow(datos.reglaShow ?? null, minAprobados.show);
  const reglaShow = pasaPorEncima || showAutorizado ? null : reglaShowEfectiva;
  /**
   * **El arriendo mínimo** (2026-11-23): la misma regla del servidor
   * (`arriendoDelDia()`). *Otras reservas* son las que ya ocupan lugar ese
   * día sin contar la de esta cotización, si está ganada.
   */
  const arriendoAutorizado = (p?.arriendoBajoMinimo ?? '').split(' · ')[0];
  /**
   * **Lo que da la promoción aplicada** (2026-11-24, `beneficioDePromocion()`,
   * la misma cuenta del servidor): su descuento, que sube el tope, y si
   * perdona el arriendo ese día. Bajo su mínimo de personas, nada.
   */
  const promoAplicada = promocionDe(datos.promociones ?? [], promocion);
  const beneficio = beneficioDePromocion(promoAplicada, invitados, fechaReal);
  const otrasDelDia = Math.max(0, (datos.reservasPorDia?.[fechaReal] ?? 0)
    - (ganada && p?.fecha === fechaReal ? 1 : 0));
  const arriendoDelDiaFn = useMemo(
    () => beneficio.sinArriendo ? null : conMinimoArriendo(arriendoDelDia(datos.reglaArriendo ?? null, fechaReal, datos.fechas, datos.diasAbiertos ?? [6, 0],
      esExclusivo(exclusivo), otrasDelDia), minAprobados.arriendo),
    [datos.reglaArriendo, fechaReal, datos.fechas, datos.diasAbiertos, exclusivo, otrasDelDia, minAprobados.arriendo,
      beneficio.sinArriendo]);
  /** Si la regla del arriendo corre para esta cuenta: no para quien pasa por encima, ni si ya se autorizó. */
  const arriendoForzado = !pasaPorEncima && !arriendoAutorizado;
  // **Lo que se ve es lo que se guarda**: la misma función del servidor.
  const vistas = useMemo(
    () => prepararLineas(lineas, datos.menus, invitados, publico, uf, reglaShow,
      arriendoForzado ? arriendoDelDiaFn : null),
    [lineas, datos.menus, invitados, publico, uf, reglaShow, arriendoForzado, arriendoDelDiaFn]);
  /** El mínimo del arriendo de esta cotización, para decirlo; también a quien puede pasar por encima. */
  const minimoArriendo = arriendoDelDiaFn ? arriendoDelDiaFn(personasParaMinimos(vistas, invitados)) : null;
  const cuentas = cuentasDe(vistas, descuento);
  /**
   * **El descuento de la promoción ya va en las líneas** (2026-11-25): con el
   * lugar exclusivo, una cotización del sitio lo trae línea por línea —menos el
   * arriendo, que va a su precio estándar—. Con eso, *Usar −N%* no se ofrece:
   * pondría el descuento dos veces.
   */
  const lineaSinPromo = (l: { concepto: string; loCobra?: string }) => {
    const t = productoDe(l.concepto, datos.menus)?.tipo;
    return t === TIPO_PRODUCTO.arriendo || t === TIPO_PRODUCTO.show || !!l.loCobra;
  };
  const descuentoEnLineas = !!promoAplicada && beneficio.descuento > 0 && descuento === 0
    && vistas.some((l) => !lineaSinPromo(l) && (Number(l.descuento) || 0) === beneficio.descuento);
  // Lo que cobra otra empresa (el karting): fuera del total, dicho debajo.
  const otras = otrasEmpresas(vistas);
  /**
   * **Lo ya coordinado con cada empresa** (2026-11-23): *🤝 Ya lo coordiné*
   * bajo el total. Vive acá y se guarda con su ruta, no con el autoguardado:
   * es un seguimiento, queda a nombre de quien lo marca.
   */
  const [coordinadas, setCoordinadas] = useState(p?.coordinadas ?? '');
  async function coordinar(empresa: string, hecho: boolean) {
    if (!p) return;
    const r = await fetch('/api/presupuestos/coordinada', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: p.id, empresa, hecho })
    });
    const d = await r.json().catch(() => ({}));
    if (d.error) avisar(d.error, 'atencion');
    else { setCoordinadas(d.coordinadas ?? ''); onCambio(); }
  }
  /** Cuánta gente suman los menús: tiene que calzar con los invitados. */
  const enMenus = vistas.reduce((n, l) => n + l.personas, 0);
  /** Si en esta cotización el show tiene mínimo: día no público y poca gente. */
  const showConMinimo = aplicaReglaShow(reglaShowEfectiva, publico, enMenus > 0 ? enMenus : invitados);
  const cond = condicionesDe(
    { anticipo: numeroONulo(anticipoTxt, 100), anticipoMonto: montoONulo(anticipoMontoTxt),
      saldoDias: numeroONulo(saldoTxt, 365), fecha: fechaReal },
    cuentas.total, datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 });
  /**
   * **Los topes** (regla A, 2026-11-23, `condiciones.ts`): lo más generoso que
   * puede ofrecer el vendedor —Configuración, o lo aprobado para esta
   * cotización—. Quien aprueba (gerencia, pagos, administrador) no tiene
   * tope: lo que deje por encima queda como aprobado por él al guardar. Es la
   * misma cuenta del servidor (`conTopes()` en `/api/presupuestos`).
   */
  const topesBase: Topes = datos.topes ?? topesDe({
    anticipoPct: datos.condiciones?.anticipoPct ?? 30, saldoDias: datos.condiciones?.saldoDias ?? 3,
    cambiosFecha: datos.contrato?.tranquilidad?.cambiosFecha ?? 2,
    cancelacionDias: datos.contrato?.tranquilidad?.cancelacionDias ?? 60,
    reembolsoPct: datos.contrato?.tranquilidad?.reembolsoPct ?? 20, descuentos: datos.descuentos });
  const aprobadasCond = aprobadasDe({ condicionesEspeciales: condMarca, condicionesPedidas: condPedidas });
  /** Los topes sin la promoción: al quitarla, un descuento por encima de esto vuelve a cero. */
  const topesSinPromo = topesConAprobadas(topesBase, aprobadasCond);
  // **El descuento de la promoción vale aunque pase el tope** (2026-11-24): lo sube, como lo aprobado.
  const topes = beneficio.descuento > topesSinPromo.descuento
    ? { ...topesSinPromo, descuento: beneficio.descuento } : topesSinPromo;
  const marcaCond = condicionesEspecialesDe(condMarca);
  /** Los botones de descuento: los de Configuración, el aprobado si es más y el de la promoción. */
  const botonesDescuento = [...new Set([0, ...datos.descuentos,
    ...(topes.descuento > Math.max(0, ...datos.descuentos) ? [topes.descuento] : []),
    // El de la promoción aplicada, aunque no sea uno de Configuración (el 11% de fin de año).
    ...(beneficio.descuento ? [beneficio.descuento] : [])])].sort((a, b) => a - b);
  /** Al salir de un campo: si se pasa del tope, queda en él y se dice. El servidor hace lo mismo. */
  const toparCampo = (campo: CampoCondicion, txt: string, poner: (t: string) => void) => {
    if (pasaPorEncima || !txt.trim()) return;
    const n = Math.round(Number(txt));
    if (!Number.isFinite(n)) return;
    const t = alTope(campo, n, topes);
    if (t === n) return;
    poner(String(t));
    setRecorteCond(`${NOMBRE_CONDICION[campo]}: ${valorCondicion(campo, n)} no cabe en lo que permite Configuración; `
      + `queda en ${valorCondicion(campo, t)}. Si el cliente lo necesita, pide condiciones especiales.`);
  };
  /** Un anticipo en pesos no baja del % del tope sobre el total. */
  const toparMonto = () => {
    const m = Number(anticipoMontoTxt);
    const minimo = Math.round((cuentas.total * topes.anticipo) / 100);
    if (pasaPorEncima || !(m > 0) || !(cuentas.total > 0) || m >= minimo) return;
    setAnticipoMontoTxt(String(minimo));
    setRecorteCond(`Anticipo: ${enPesos(m)} no cabe en lo que permite Configuración (${topes.anticipo}%); `
      + `queda en ${enPesos(minimo)}. Si el cliente lo necesita, pide condiciones especiales.`);
  };
  /** Las condiciones de cancelación que rigen: las de la cotización o, en blanco, las de Configuración. */
  const tranqEfectiva = {
    cambiosFecha: numeroONulo(cambiosTxt, 10) ?? datos.contrato?.tranquilidad?.cambiosFecha ?? 2,
    cancelacionDias: numeroONulo(cancelTxt, 365) ?? datos.contrato?.tranquilidad?.cancelacionDias ?? 60,
    reembolsoPct: numeroONulo(reembolsoTxt, 100) ?? datos.contrato?.tranquilidad?.reembolsoPct ?? 20
  };
  /**
   * **Lo que el calendario ya no permite** (regla B): con la fecha del
   * contrato —la de la firma, o hoy—, un saldo vencido se paga al firmar y una
   * cancelación o un cambio de fecha fuera de plazo no se ofrecen. Es lo que
   * imprime el contrato.
   */
  const plazos = plazosVencidos(fechaReal, fechaDelContrato({ contratoSubido: firmado?.cuando }, datos.hoy),
    { cambiosFecha: tranqEfectiva.cambiosFecha, cancelacionDias: tranqEfectiva.cancelacionDias,
      avisoCambio: datos.cambiosFechaDias ?? 0 }, cond.saldoHasta);
  /** Lo que quien aprueba deja por encima de Configuración: al guardar queda como aprobado por él. */
  const sobreTope = pasaPorEncima ? sobreElTope({
    anticipo: numeroONulo(anticipoTxt, 100), anticipoMonto: montoONulo(anticipoMontoTxt),
    saldoDias: numeroONulo(saldoTxt, 365), cambiosFecha: numeroONulo(cambiosTxt, 10),
    cancelacionDias: numeroONulo(cancelTxt, 365), reembolso: numeroONulo(reembolsoTxt, 100), descuento
  }, vistas, topesBase) : {};
  const haySobreTope = Object.keys(sobreTope).length > 0;
  const puedePedirCond = !!p && !pasaPorEncima && puedeEditar && !cancelada && marcaCond.estado !== 'pedida';
  /**
   * **Vencida, y si se puede renovar sola** (2026-11-23): la primera
   * renovación la hace el vendedor; desde la segunda se pide.
   */
  const vencidaViva = !!p && !ganada && !cancelada && estado !== ESTADO_PRESUPUESTO.rechazado
    && !!validoHastaVivo && validoHastaVivo < datos.hoy;
  const puedeRenovarSola = pasaPorEncima || renovacionesVivas < 1;
  /** Lo que también se pide con el mismo botón: un mínimo que rige, y renovar. */
  const conLineaDe = (tipo: string) => vistas.some((l) => productoDe(l.concepto, datos.menus)?.tipo === tipo && !(l.precioUF > 0));
  const showSePide = !!reglaShow && showConMinimo && conLineaDe(TIPO_PRODUCTO.show);
  const arriendoSePide = arriendoForzado && !!minimoArriendo && conLineaDe(TIPO_PRODUCTO.arriendo);
  const extrasPedido = {
    show: showSePide && reglaShow ? reglaShow.minimo : null,
    arriendo: arriendoSePide && minimoArriendo ? minimoArriendo.minimo : null,
    renovar: vencidaViva && !puedeRenovarSola
  };
  const botonPedirCond = (
    <span className="flex items-center gap-1">
      <button type="button" className="boton min-h-[40px] lg:min-h-[44px]" onClick={() => setPidiendoCond(true)}>
        ✋ Pedir condiciones especiales…
      </button>
      <AyudaCorta tema="condicionesEspeciales" />
    </span>
  );
  /**
   * **La línea de las condiciones especiales** (2026-11-23): lo que quedó en
   * su tope, cómo va lo pedido y el botón para pedir. Es la misma en el pago
   * (paso 4) y en *Cambios de fecha y cancelación* (paso 5); en el 5 va
   * `corta`, porque lo aprobado ya se lee en la frase de arriba. **En el
   * computador el botón va al pie de la ventana** (`pedirEnElPie`), donde
   * sobra ancho: en la caja alargaba los pasos 4 y 5 más allá de 650px.
   */
  const lineaCondiciones = (corta: boolean) => (
    <>
      {recorteCond && (
        <p role="status" className="mt-1 text-[14px] font-semibold text-ambar-texto">{recorteCond}</p>
      )}
      {marcaCond.estado === 'pedida' && (
        <p className="mt-2 text-[14px] font-semibold text-ambar-texto lg:mt-1">
          ⏳ {corta ? 'Condiciones especiales pedidas'
            : `${pasaPorEncima ? `${marcaCond.quien} pidió` : 'Pediste'} ${fraseCondiciones(leerPedido(condPedidas)).toLowerCase()}`}
          {' · '}esperan respuesta{pasaPorEncima ? ' en la bandeja del calendario' : ''}
        </p>
      )}
      {marcaCond.estado === 'aprobada' && (
        <p className="mt-2 text-[14px] font-semibold text-verde-texto lg:mt-1">
          ✓ {corta || !fraseCondiciones(leerPedido(condPedidas)) ? `Condiciones especiales aprobadas por ${marcaCond.quien}`
            : `Aprobadas por ${marcaCond.quien}: ${fraseCondiciones(leerPedido(condPedidas))}`}
        </p>
      )}
      {marcaCond.estado === 'rechazada' && (
        <p className="mt-2 text-[14px] font-semibold text-rojo-texto lg:mt-1">
          ✕ {marcaCond.quien} no aprobó las condiciones especiales{marcaCond.nota ? `: ${marcaCond.nota}` : ''}
        </p>
      )}
      {haySobreTope && marcaCond.estado !== 'aprobada' && (
        <p className="mt-2 text-[14px] text-hueso/80 lg:mt-1">
          Por sobre Configuración: {fraseCondiciones(sobreTope)}. Al guardar queda aprobado por ti.
        </p>
      )}
      {puedePedirCond && (
        <div className="mt-2 flex items-center gap-2 lg:hidden">{botonPedirCond}</div>
      )}
    </>
  );
  /**
   * **Lo pagado es del evento** (2026-11-12, lo reclamó el cliente: pagó
   * $299.000 anotados en la A y la C le pedía el anticipo entero). Mientras
   * ninguna alternativa esté ganada, cuenta lo anotado en todas; al ganar,
   * el servidor lo pasa a la ganadora.
   */
  const otraGanada = alternativas.some((a) => a.id !== p?.id && !!a.idReserva);
  const cobrosEvento = otraGanada ? cobros : [...cobros, ...cobrosOtras];
  const cobrado = estadoCobros({ anticipo: cond.anticipo, total: cuentas.total }, cobrosEvento);

  /**
   * **Si hay algo sin guardar** (2026-11-10): una firma de todo lo que se
   * manda al guardar, comparada contra la de la última vez que se guardó.
   * Con eso el botón dice *Guardar* en dorado o *✓ Guardado* en gris
   * (`BotonGuardar`). Una cotización nueva siempre tiene algo sin guardar.
   */
  const firma = JSON.stringify({
    idCliente, fechaReal, periodo: sinFecha ? periodo : '', invitados, tipoEvento, notas,
    descuento, motivo, documento, anticipoTxt, anticipoMontoTxt, saldoTxt, uf, fechaUF, estado, lineas: vistas,
    horario, ley20393, acuerdos, fact: facturacion, cambiosTxt, cancelTxt, reembolsoTxt,
    segTxt, avisoTxt, exclusivo, socio, redactarAntes, promocion
  });
  const [guardada, setGuardada] = useState<string | null>(null);
  useEffect(() => { if (p) setGuardada(firma); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * **Si al abrir, el mínimo del show cambió el precio** (2026-11-20). Pasa
   * con una cotización de antes de la regla, o si cambió la Configuración.
   * Se guarda en el acto, para que nadie la mande con el show a $0. Solo
   * miran las líneas del show: lo demás no se escribe al abrir.
   */
  const showSubio = lineas.some((l, i) => productoDe(l.concepto, datos.menus)?.tipo === TIPO_PRODUCTO.show
    && !!vistas[i] && (vistas[i].precio !== l.precio || vistas[i].descuento !== l.descuento));
  /**
   * **Y lo mismo con el arriendo** (2026-11-23): una cotización de antes de la
   * regla, en un día que la pide, se abre con el arriendo agregado o subido y
   * se guarda en el acto. Si no, *Marcar ganada* la frenaría sin que nadie
   * pudiera guardarla.
   */
  const esArriendo = (l: { concepto: string }) => productoDe(l.concepto, datos.menus)?.tipo === TIPO_PRODUCTO.arriendo;
  const arriendoSubio = (vistas.some(esArriendo) && !lineas.some(esArriendo))
    || lineas.some((l, i) => esArriendo(l) && !!vistas[i]
      && (vistas[i].precio !== l.precio || vistas[i].descuento !== l.descuento));
  const sucio = !p || (guardada !== null && firma !== guardada);

  /**
   * **Una ganada cuya reserva está en un día cerrado se corrige con la lista
   * de cambios y su casilla** (2026-11-21, lo decidió el cliente: *"sí,
   * también debería poder corregirse"*). Guardar una ganada reescribe su
   * reserva; si ese día —o el día al que se mueve— ya se cerró, es corregirlo,
   * y el servidor lo rechazaba porque esta ventana no tenía dónde confirmar
   * nada. Ahora *Guardar* abre la misma pieza del equipo y de las reservas
   * (`PieCorreccion`), con lo que cambió respecto de lo guardado, y esa lista
   * es la que queda en la bitácora. Son las mismas dos fechas que mira el
   * servidor (`guardaDelDia()`).
   */
  const diaCerrado = ganada && [p?.fecha, fechaReal].some((f) => !!f && (datos.cerrados ?? []).includes(f));
  const nombreSocio = (id: string) => (!id ? ''
    : [...(datos.socios ?? []), ...sociosNuevos].find((x) => x.id === id)?.nombre ?? id);
  /** Lo que se manda al guardar, en palabras: con qué se compara lo guardado (`cambiosDeLaCotizacion()`). */
  const enCorreccion: CotizacionEnCorreccion = {
    cliente: cliente?.nombre ?? '', fecha: fechaReal, invitados, total: cuentas.total,
    lineas: vistas.map((l) => ({ concepto: l.concepto, cantidad: l.cantidad, precio: l.precio, descuento: l.descuento,
      texto: [l.descripcion ?? '', l.bebestibles ?? ''].join('|') })),
    datos: [
      ['tipo de evento', tipoEvento],
      ['descuento sobre el total', `${descuento || 0}%`],
      ['documento', documento],
      ['socio comercial', nombreSocio(socio) || 'ninguno'],
      ['día exclusivo', exclusivo],
      ['anticipo', anticipoMontoTxt.trim() ? enPesos(Number(anticipoMontoTxt))
        : anticipoTxt.trim() ? `${anticipoTxt.trim()}%` : 'el de Configuración'],
      ['saldo', saldoTxt.trim() ? `${saldoTxt.trim()} días antes` : 'el de Configuración'],
      ['UF', uf ? enPesos(uf) : '']
    ],
    // Sin su valor: son textos largos, o datos de la ficha del cliente.
    otros: [
      ['cambiaron las notas', notas.trim()],
      ['cambió el horario del contrato', horario],
      ['cambió la marca de la Ley 20.393', String(ley20393)],
      ['cambió lo acordado aparte', acuerdos.trim()],
      ['cambiaron las condiciones de cancelación', [cambiosTxt, cancelTxt, reembolsoTxt].join('|')],
      ['cambiaron los recordatorios', [segTxt, avisoTxt].join('|')],
      ['cambiaron los datos de facturación', JSON.stringify(facturacion)]
    ]
  };
  /** Como quedó guardada: al abrir, y después de cada guardado. */
  const [baseCorreccion, setBaseCorreccion] = useState(enCorreccion);
  /** La ventana de la corrección, abierta. */
  const [corrigiendoDia, setCorrigiendoDia] = useState(false);
  const [correccionConfirmada, setCorreccionConfirmada] = useState(false);
  const cambiosCorreccion = useMemo(() => {
    if (!diaCerrado) return [];
    const c = cambiosDeLaCotizacion(baseCorreccion, enCorreccion);
    // Que nadie quede sin poder guardar: si hay algo sin guardar que la lista
    // no sabe nombrar, se dice igual que algo cambió.
    return c.length || !sucio ? c : ['Cambió otro detalle de la cotización'];
  }, [diaCerrado, sucio, firma, baseCorreccion]); // eslint-disable-line react-hooks/exhaustive-deps
  /** *Guardar*: directo, o por la lista de cambios si el día de la reserva está cerrado. */
  function pedirGuardar() {
    if (!diaCerrado) return void guardar();
    setError(''); setCorreccionConfirmada(false); setCorrigiendoDia(true);
  }

  /**
   * **Una cotización ya creada se guarda sola** (2026-11-10, lo pidió el
   * cliente: ahorrarle el *Guardar* donde se pueda). Es la regla del panel:
   * lo que se edita acá son valores de algo que ya existe —cantidades,
   * precios, descuentos, el documento, las condiciones—, igual que la
   * ventana del día. Espera a que dejen de escribir, y al cerrar la ventana
   * manda lo que quede.
   *
   * **Una ganada no**: guardarla reescribe su reserva, y en un día cerrado
   * eso es una corrección con motivo. Ahí sigue el botón. El botón queda
   * también en las demás, para quien quiera mandar ya: con todo guardado
   * dice *✓ Guardado* en gris.
   */
  const autoActivo = !!p && puedeEditar && !ganada;
  const auto = usarAutoguardado(firma, async () => {
    if (!(await guardar(undefined, true))) return ultimoError.current || 'No se pudo guardar';
  }, 1200, autoActivo);
  // El guardado de los mínimos del show y del arriendo al abrir (ver `showSubio`).
  useEffect(() => {
    if (!(showSubio || arriendoSubio) || !autoActivo) return;
    const t = setTimeout(() => { void auto.reintentar(); }, 1200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * **Si la planilla dijo "demasiadas consultas", se reintenta sola**
   * (2026-11-12). Google corta a 60 lecturas por minuto para la cuenta del
   * panel; a los 30 segundos ya hay cupo de nuevo y lo escrito se manda sin
   * que nadie tenga que apretar nada.
   */
  useEffect(() => {
    if (auto.estado !== 'error' || !/demasiadas consultas/i.test(auto.error)) return;
    const t = setTimeout(() => { void auto.reintentar(); }, 30000);
    return () => clearTimeout(t);
  }, [auto.estado, auto.error]); // eslint-disable-line react-hooks/exhaustive-deps
  const cotizables = paraCotizar(datos.menus);
  const show = showDe(datos.menus);
  const encontrados = useMemo(
    () => [...buscarClientes(clientes, busqueda)].sort(porNombreCliente).slice(0, 8),
    [clientes, busqueda]);

  const cambiarLinea = (i: number, cambio: Partial<Linea>) =>
    setLineas(vistas.map((l, k) => (k === i ? { ...l, ...cambio } : l)));

  /**
   * **📝 Qué incluye de una línea** (2026-11-24): nace con el texto del producto
   * y se cambia en `TextoDeLinea`, solo para esta cotización. En el computador,
   * solo el ícono: con *Qué incluye* escrito, la fila de un nombre largo se
   * doblaba. *✎* y el dorado dicen que ya no dice lo del producto. Lo que cobra
   * otra empresa no va en el desglose: no lo trae.
   */
  const botonTexto = (l: Linea, prod: Menu | undefined, i: number, clase: string) => {
    if (l.loCobra) return null;
    const cambiado = !igualAlProducto(l.concepto, l, textosDelProducto(prod));
    return (
      <button type="button" onClick={() => setTextoDe(i)}
        aria-label={`Qué incluye ${l.concepto}${cambiado ? ', cambiado para esta cotización' : ''}`}
        title={cambiado ? 'Qué incluye: cambiado para esta cotización' : 'Qué incluye'}
        className={`boton min-h-[36px] !px-2 text-[13px] font-normal lg:min-w-[36px] ${clase}
                    ${cambiado ? 'border-oro/70 font-semibold text-oro' : ''}`}>
        <span aria-hidden="true">📝{cambiado ? ' ✎' : ''}</span>
        <span aria-hidden="true" className="lg:hidden">Qué incluye</span>
      </button>
    );
  };

  const agregar = (m: Menu) => {
    // Una sola vez por cotización: ver `yaEstaEnLaCotizacion()`.
    if (yaEstaEnLaCotizacion(vistas, m.nombre)) return;
    // En UF, el precio en pesos lo pone `prepararLineas()` con la UF de la
    // cotización; si todavía no tiene, se pide la de hoy.
    const precio = m.moneda === MONEDA.uf ? 0 : Math.round(precioParaCotizar(m));
    setLineas([...vistas, lineaDeProducto(m, p?.id ?? '', invitados, precio, enMenus)]);
    if (m.moneda === MONEDA.uf && !uf) void traerUF();
  };
  const hayUF = vistas.some((l) => l.precioUF > 0);

  /**
   * **Aplicar una promoción** (2026-11-24): su menú reemplaza a los otros de
   * adulto, suma lo que incluye y pone su descuento sobre el total
   * (`aplicarALineas()`). Todo queda editable.
   */
  const aplicarPromocion = (promo: Promocion, menu: string) => {
    setLineas(aplicarALineas(promo, menu, invitados, p?.id ?? '', datos.menus, vistas).lineas);
    setPromocion(promo.id);
    const b = beneficioDePromocion(promo, invitados, fechaReal);
    if (b.descuento) setDescuento(b.descuento);
    setAplicandoPromo(false);
    avisar(`Promoción aplicada: ${promo.nombre}`);
  };
  /** Quitarla deja los productos; su descuento, si pasa el tope de siempre, vuelve a cero. */
  const quitarPromocion = () => {
    setPromocion('');
    if (!pasaPorEncima && descuento > topesSinPromo.descuento) setDescuento(0);
    // Con el descuento en las líneas (lugar exclusivo), se va con la promoción.
    if (descuentoEnLineas) {
      setLineas((ls) => ls.map((l) => (!lineaSinPromo(l) && (Number(l.descuento) || 0) === beneficio.descuento
        ? { ...l, descuento: 0 } : l)));
    }
    avisar('Se quitó la promoción: los productos quedan en la cotización');
  };

  async function crearCliente(forzar = false) {
    if (!nuevoCliente) return;
    setError('');
    const r = await fetch('/api/clientes', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...nuevoCliente, forzar })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    if (d.parecidos?.length) return setParecidas(d.parecidos);
    setClientes(d.clientes);
    setIdCliente(d.id);
    setNuevoCliente(null); setParecidas([]);
    avisar(`Cliente creado: ${nuevoCliente.nombre}`);
    setPaso(2);
  }

  /** Guarda. Devuelve el id, o '' si falló. */
  async function guardar(estadoForzado?: string, solo = false, correccion = ''): Promise<string> {
    setError('');
    ultimoError.current = '';
    // Guardando solo no se salta de paso: quien está escribiendo se queda
    // donde está, y el error se lee abajo.
    if (!idCliente) { if (!solo) setPaso(1); setError('Elige o crea el cliente primero.'); return ''; }
    if (!esFecha(fechaReal) && !periodo.trim()) {
      if (!solo) setPaso(2);
      setError('Pon la fecha, o el periodo si todavía no hay día.'); return '';
    }
    setGuardando(true);
    try {
      // Lo escrito en los datos de facturación —o en el RUT y el domicilio
      // que pide el contrato— va a la ficha, para no pedirlo dos veces.
      const ficha = clientes.find((c) => c.id === idCliente);
      if (ficha && (['empresa', 'rut', 'giro', 'domicilio'] as const)
        .some((k) => facturacion[k].trim() !== ficha[k])) {
        const rc = await fetch('/api/clientes', {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: idCliente, ...facturacion })
        });
        const dc = await rc.json();
        if (dc.error) { setError(`Datos de facturación: ${dc.error}`); return ''; }
        if (dc.clientes) setClientes(dc.clientes);
      }
      const cuerpo = {
        id: p?.id, idCliente, fecha: fechaReal, periodo: sinFecha ? periodo : '',
        invitados, tipoEvento, notas, descuento, motivo, documento,
        anticipo: anticipoTxt, anticipoMonto: anticipoMontoTxt, saldoDias: saldoTxt,
        horario, ley20393, acuerdos,
        cambiosFecha: cambiosTxt, cancelacionDias: cancelTxt, reembolso: reembolsoTxt,
        seguimientoDias: segTxt, avisoEvento: avisoTxt, exclusivo, socio, redactarAntes,
        // La promoción solo se edita en una cotización ya creada (el paso Productos).
        ...(p ? { promocion } : {}),
        ...(uf ? { uf, fechaUF } : {}),
        estado: estadoForzado ?? estado,
        lineas: vistas,
        // La lista de cambios confirmada, si el día de la reserva está cerrado.
        ...(correccion ? { correccion: { motivo: correccion } } : {})
      };
      const r = await fetch('/api/presupuestos', {
        method: p ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo)
      });
      const d = await r.json();
      if (d.error) { setError(d.error); ultimoError.current = d.error; return ''; }
      if (Array.isArray(d.recortes) && d.recortes.length) {
        setRecorteCond(`Quedó en lo que permite Configuración: ${d.recortes.join(' · ')}. Si el cliente lo necesita, pide condiciones especiales.`);
      }
      if (!solo) {
        avisar(p ? 'Cotización guardada' : (cuerpo.estado === ESTADO_PRESUPUESTO.candidato
          ? 'Candidato anotado' : 'Cotización creada'));
      }
      if (estadoForzado) setEstado(estadoForzado);
      setGuardada(JSON.stringify({ ...JSON.parse(firma), estado: estadoForzado ?? estado }));
      setBaseCorreccion(enCorreccion);
      // **Guardando solo no se recarga la lista de atrás** (2026-11-12): cada
      // recarga son siete lecturas de la planilla, y con un autoguardado por
      // pausa al escribir se pasaba del límite de Google (60 por minuto). Se
      // recarga una vez, al cerrar la ventana (`cerrar()`).
      if (solo) huboGuardado.current = true; else onCambio();
      return p?.id ?? d.presupuesto?.id ?? '';
    } finally { setGuardando(false); }
  }

  /** Renovar la vigencia: la primera vez, el vendedor; desde la segunda, quien aprueba. */
  async function renovarVigencia() {
    if (!p) return;
    setRenovando(true);
    try {
      if (autoActivo) await auto.forzar();
      const r = await fetch('/api/presupuestos', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, renovarVigencia: true })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { avisar(d.error || 'No se pudo renovar.', 'atencion'); return; }
      setValidoHastaVivo(d.validoHasta ?? '');
      setRenovacionesVivas((n) => n + 1);
      huboGuardado.current = true;
      avisar(d.validoHasta ? `Renovada: vale hasta el ${enPalabras(d.validoHasta)}` : 'Renovada');
    } finally { setRenovando(false); }
  }

  /** Cerrar manda lo pendiente y, si se guardó algo, recarga la lista una vez. */
  async function cerrar() {
    if (autoActivo) await auto.forzar();
    if (huboGuardado.current) onCambio();
    onCerrar();
  }

  async function ganar(objetivo: string) {
    if (!p || !objetivo) return;
    // La pregunta la hizo antes la ventana *¿Marcarla ganada?* (`confirmandoGanar`).
    setConfirmandoGanar('');
    // Primero se guarda lo que esté escrito, para que la reserva salga con eso.
    if (!(await guardar())) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos/convertir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: objetivo })
      });
      const d = await r.json();
      // Que no se pierda abajo de la ventana: un ganar que falla tiene que
      // verse en el acto (2026-11-12).
      if (d.error) { avisar(d.error, 'atencion'); return setError(d.error); }
      // **Ganar se festeja** (2026-11-11): es el hito de todo el flujo.
      const ganadora = alternativas.find((a) => a.id === objetivo);
      avisar(`🎉 Ganada${alts.length > 1 && ganadora ? ` la ${letraDe(ganadora, alternativas)}` : ''}: `
        + `la reserva de ${objetivo === p.id ? personasDelEvento : genteDe(ganadora ?? p)} personas ya está en el calendario`);
      onCambio(); onCerrar();
    } finally { setGuardando(false); }
  }

  /**
   * **Pasar de Evento a Productos guarda solo** (2026-11-10, lo pidió el
   * cliente). Con cliente y fecha (o periodo) ya hay una cotización: un
   * candidato pasa a **Borrador** y queda guardado, y una nueva se crea —
   * desde ahí ya se le pueden anotar pagos y subir comprobantes. La ventana
   * se reabre sobre la cotización guardada, en el paso pedido.
   */
  async function irA(n: number) {
    if (n <= 2 || paso >= 3 || !puedeEditar) return setPaso(n);
    const nuevoEstado = estado === ESTADO_PRESUPUESTO.candidato ? ESTADO_PRESUPUESTO.borrador : undefined;
    if (!p || sucio || nuevoEstado) {
      // **En un día cerrado se sigue sin guardar**: lo escrito se confirma una
      // sola vez, con *Guardar*, y la lista sale completa —los invitados del
      // paso 2 junto con los menús del 3—, en vez de una corrección por paso.
      if (p && diaCerrado) return setPaso(n);
      const id = await guardar(nuevoEstado);
      if (!id) return;
      if (!p) { onAbrir?.(id, n); return; }
    }
    setPaso(n);
  }

  /** Abre otra alternativa del grupo; lo escrito en esta se guarda antes. */
  async function abrirAlternativa(id: string) {
    if (sucio && !ganada && !(await guardar())) return;
    if (sucio && ganada && !confirm('Hay cambios sin guardar en esta alternativa. ¿Salir igual?')) return;
    onAbrir?.(id, paso);
  }

  async function duplicar(pasoNuevo = 3) {
    if (!p) return;
    // Lo escrito va también en la copia: primero se guarda.
    if (sucio && !(await guardar())) return;
    const r = await fetch('/api/presupuestos', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ duplicarDe: p.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    avisar('Alternativa creada: ajústala acá mismo');
    onCambio();
    if (onAbrir) onAbrir(d.presupuesto.id, pasoNuevo); else onCerrar();
  }

  /**
   * **"Se quedó con la B"** (2026-11-11). Elegir pasa las otras a *No
   * elegida* y el link pasa a mostrar solo esa; `deshacer` las vuelve a
   * ofrecer. La ventana se reabre con lo que quedó guardado.
   */
  async function elegirAlternativa(id: string, deshacer = false) {
    if (!p) return;
    if (sucio && !ganada && !(await guardar())) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/elegir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, deshacer })
      });
      const d = await r.json().catch(() => ({}));
      if (d.error) return setError(d.error);
      const elegida = alternativas.find((x) => x.id === id);
      avisar(deshacer ? 'Las alternativas vuelven a estar en carrera'
        : `Se quedó con la ${elegida ? letraDe(elegida, alternativas) : 'elegida'}`);
      onCambio();
      if (onAbrir) onAbrir(id, paso);
    } finally { setGuardando(false); }
  }

  /** Anota un cobro. Lo comprueba el servidor: el vendedor, solo los suyos. */
  async function cobrar(monto: number, concepto: string) {
    if (!p || !monto) return;
    setGuardando(true); setError('');
    try {
      const r = await fetch('/api/presupuestos/cobros', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ presupuesto: p.id, monto, concepto, medio })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      setCobros(d.cobros); setOtroMonto(null);
      avisar(`${concepto} anotado: ${enPesos(monto)}`);
      onCambio();
    } finally { setGuardando(false); }
  }

  /** Sube el comprobante de un cobro; las fotos se achican antes. */
  async function subirComprobante(c: Cobro, archivo: File) {
    setSubiendo(c.id); setError('');
    try {
      const f = await achicarFoto(archivo);
      const datosForm = new FormData();
      datosForm.set('id', c.id);
      datosForm.set('archivo', f);
      const r = await fetch('/api/presupuestos/cobros/comprobante', { method: 'POST', body: datosForm });
      const d = await r.json().catch(() => ({ error: 'No se pudo subir el comprobante.' }));
      if (d.error) return setError(d.error);
      const lista = await fetch(`/api/presupuestos/cobros?id=${encodeURIComponent(c.presupuesto)}`)
        .then((x) => x.json()).catch(() => ({}));
      if (lista.cobros) setCobros(lista.cobros);
      avisar('Comprobante guardado');
    } finally { setSubiendo(''); }
  }

  /**
   * Sube el contrato firmado (Fase 4). Se firma en papel; esto es la foto o
   * el PDF, que va a Drive junto a los comprobantes.
   */
  async function subirContrato(archivo: File) {
    if (!p) return;
    setSubiendoContrato(true); setError('');
    try {
      const datosForm = new FormData();
      datosForm.set('id', p.id);
      datosForm.set('archivo', await achicarFoto(archivo));
      const r = await fetch('/api/presupuestos/contrato', { method: 'POST', body: datosForm });
      const d = await r.json().catch(() => ({ error: 'No se pudo subir el contrato.' }));
      if (d.error) return setError(d.error);
      setFirmado({ por: d.contratoSubidoPor, cuando: d.contratoSubido });
      avisar('Contrato firmado guardado');
      onCambio();
    } finally { setSubiendoContrato(false); }
  }

  async function quitarContrato() {
    if (!p || !confirm('¿Quitar el contrato firmado de esta cotización? Es para cuando se subió '
      + 'otro archivo. El archivo queda en Drive.')) return;
    const r = await fetch('/api/presupuestos/contrato', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: p.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    setFirmado(null); avisar('Contrato firmado quitado'); onCambio();
  }

  /**
   * Marca o desmarca la revisión: solo quien hace los pagos.
   *
   * **Un error se dice al lado del cobro, no al pie de la ventana**
   * (2026-11-11): el aviso de error vive al final de una ventana larga, y
   * quien apretó *Marcar revisado* veía el botón quedarse igual sin saber
   * por qué. Una respuesta que no es JSON —un tiempo agotado— tampoco puede
   * perderse en silencio.
   */
  const [revisando, setRevisando] = useState('');
  const [errorPagos, setErrorPagos] = useState('');
  async function revisar(c: Cobro, revisado: boolean) {
    setRevisando(c.id); setErrorPagos('');
    try {
      const r = await fetch('/api/presupuestos/cobros', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: c.id, revisado })
      });
      const d = await r.json().catch(() => ({ error: `No se pudo guardar (error ${r.status}). Prueba de nuevo.` }));
      if (d.error || !Array.isArray(d.cobros)) {
        const msg = d.error || 'No se pudo guardar. Prueba de nuevo.';
        setErrorPagos(msg); avisar(msg, 'atencion'); return;
      }
      setCobros(d.cobros);
      const quedo = (d.cobros as Cobro[]).find((x) => x.id === c.id);
      if (quedo && !!quedo.revisadoPor !== revisado) {
        const msg = 'La planilla no guardó la revisión. Prueba de nuevo.';
        setErrorPagos(msg); avisar(msg, 'atencion'); return;
      }
      avisar(revisado ? 'Cobro revisado' : 'Revisión quitada'); onCambio();
    } catch {
      const msg = 'No hubo conexión con el panel. Prueba de nuevo.';
      setErrorPagos(msg); avisar(msg, 'atencion');
    } finally {
      setRevisando('');
    }
  }

  async function deshacerCobro(c: Cobro) {
    if (!confirm(`¿Deshacer el cobro de ${enPesos(c.monto)}? Es para uno anotado por error: `
      + 'se borra. Si de verdad se devolvió plata, anota un cobro en negativo.')) return;
    const r = await fetch('/api/presupuestos/cobros', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: c.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    setCobros(d.cobros); avisar('Cobro deshecho'); onCambio();
  }

  async function borrar() {
    if (!p || !confirm('¿Borrar esta cotización? No se puede deshacer.')) return;
    const r = await fetch('/api/presupuestos', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: p.id })
    });
    const d = await r.json();
    if (d.error) return setError(d.error);
    avisar('Cotización borrada');
    onCambio(); onCerrar();
  }

  const link = p?.token && typeof window !== 'undefined'
    ? `${window.location.origin}/presupuesto/${p.token}` : '';
  /** Cuántas alternativas van en el link: todas las que siguen en carrera. */
  const enVariasAlt = p ? paraElLink(p, alternativas).length : 0;
  const linkContrato = p?.token && typeof window !== 'undefined'
    ? `${window.location.origin}/contrato/${p.token}` : '';
  const textoWhatsapp = !link || !cliente ? ''
    : enVariasAlt > 1
      // **Firmado por quien la manda** (2026-11-13): *Hola Andrés, te escribe
      // Jorge de Brasas de Lo Pirque. Te mando la cotización: …*
      ? `${saludoAlCliente(cliente.nombre, datos.usuario, datos.empresa)}. Te mando la cotización con ${enVariasAlt} alternativas para que elijas: ${link}`
      : `${saludoAlCliente(cliente.nombre, datos.usuario, datos.empresa)}. Te mando la cotización: ${link}`;
  const whatsapp = textoWhatsapp ? enlaceWhatsApp(cliente!.telefono, textoWhatsapp) : '';
  /**
   * **El correo** (2026-11-11): sin un servidor de correo, abría el programa
   * de correo de quien cotiza con todo puesto. **Desde el 2026-11-25 copia
   * solo la dirección** (lo pidió el cliente: *"en paso 4 envío, el botón
   * correo solo copie la dirección de correo"*): se escribe desde el correo de
   * siempre, y el link se copia con *📋 Copiar link*. Solo si la ficha tiene
   * correo.
   */
  const correo = link && cliente?.correo ? cliente.correo : '';
  /** **Mandar el contrato** (2026-11-11): los mismos tres caminos que la cotización. */
  const textoWhatsappContrato = linkContrato && cliente
    ? `${saludoAlCliente(cliente.nombre, datos.usuario, datos.empresa)}. Te mando el contrato para firmar: ${linkContrato}` : '';
  const whatsappContrato = textoWhatsappContrato
    ? enlaceWhatsApp(cliente!.telefono, textoWhatsappContrato) : '';
  /** El correo del contrato: la misma dirección (2026-11-25). */
  const correoContrato = linkContrato && cliente?.correo ? cliente.correo : '';
  const mandada = estaMandada(estado);
  /**
   * **Mandarla** (2026-11-11). Sin WhatsApp ni correo conectados al panel,
   * no hay cómo saber si de verdad se mandó: se pregunta. Copiar el link
   * también, porque casi siempre es para pegarlo en alguna parte.
   */
  function mandar(via: 'whatsapp' | 'correo' | 'link' | 'ver', que: 'cotizacion' | 'contrato' = 'cotizacion') {
    // WhatsApp y el documento son enlaces de verdad (`BotonesMandar`): los
    // abre el navegador. Abrirlos con `window.open` los bloqueaba en el
    // teléfono como ventana emergente, y se perdía justo lo que el botón
    // promete (2026-11-11).
    const elLink = que === 'contrato' ? linkContrato : link;
    setViaEnvio(via);
    if (via === 'link' && elLink) copiarConAviso(elLink, 'Link copiado', 'Copia este link:');
    // **El correo copia la dirección** (2026-11-25, lo pidió el cliente: *"el
    // botón correo solo copie la dirección de correo"*).
    if (via === 'correo' && cliente?.correo) copiarConAviso(cliente.correo, 'Correo copiado: pégalo en tu correo', 'Copia este correo:');
    if (!p || !puedeEditar || cancelada) return;
    // Se pregunta solo la primera vez: mandarla de nuevo no cambia nada.
    if (que === 'cotizacion' && (ganada || mandada)) return;
    if (que === 'contrato' && (contratoEnviado || firmado)) return;
    // Copiar no saca de la pantalla: se pregunta enseguida.
    if (via === 'link') return setPreguntaEnvio(que);
    // **WhatsApp, el correo y *Ver el documento* preguntan al volver** (lo
    // pidió el cliente: *"cuando vuelvo a la pestaña o al panel, me tiene que
    // preguntar"*). Se espera a que la página vuelva a estar a la vista o a
    // tener el foco. **El documento, desde el 2026-11-25** (lo pidió el
    // cliente: una cotización mandada desde ahí —el PDF, la dirección— quedaba
    // en borrador sin que nada lo preguntara). Si nunca se fue, WhatsApp
    // pregunta igual a los 3 s (no se abrió); el correo y el documento esperan
    // a que vuelva: copiar una dirección o mirar no es mandar.
    let salio = false;
    const listo = () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      window.removeEventListener('blur', alSalir);
      clearTimeout(reloj);
      setPreguntaEnvio(que);
    };
    function alSalir() { salio = true; }
    function alVolver() { if (document.visibilityState === 'visible' && salio) listo(); }
    const alOcultar = () => { if (document.visibilityState === 'hidden') salio = true; };
    document.addEventListener('visibilitychange', alOcultar, { once: true });
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    window.addEventListener('blur', alSalir);
    const reloj = via === 'whatsapp' ? setTimeout(() => { if (!salio) listo(); }, 3000) : undefined;
  }
  async function confirmarEnvio() {
    const que = preguntaEnvio;
    setPreguntaEnvio('');
    if (que === 'contrato') {
      if (!p) return;
      // Solo la marca: la fecha la pone el servidor, y no hace falta mandar
      // lo demás de la cotización.
      const r = await fetch('/api/presupuestos', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, seguimiento: 'contratoEnviado' })
      });
      const d = await r.json().catch(() => ({}));
      if (d.error) return setError(d.error);
      setContratoEnviado(d.contratoEnviado || datos.hoy || '');
      avisar('Contrato enviado: te recuerdo si no vuelve firmado');
      onCambio();
      return;
    }
    if (await guardar(ESTADO_PRESUPUESTO.enviado, true)) {
      avisar('Enviada: desde hoy corre su vigencia y cuenta en el calendario');
    }
  }
  /**
   * **¿Están negociando?** (2026-11-11): una cotización ya mandada a la que
   * se le cambian líneas o precios.
   *
   * **Se compara contra cómo estaba al mandarla, no al abrir la ventana**
   * (arreglado el mismo día, lo reclamó el cliente). Antes la base era la de
   * la primera vez que se dibujó la ventana, así que armar las líneas en el
   * paso 3 y después apretar *Sí, la mandé* mostraba la franja en el acto,
   * como si se hubiera cambiado algo ya enviado. Ahora la base se toma
   * cuando la cotización queda Enviada —al abrirla ya enviada, o al
   * mandarla en esta misma ventana— y se suelta si deja de estarlo.
   */
  const firmaPrecio = JSON.stringify({ l: vistas.map((l) => [l.concepto, l.cantidad, l.precio, l.descuento]), descuento });
  const enviadaAhora = !!p && estado === ESTADO_PRESUPUESTO.enviado;
  const [precioAlMandar, setPrecioAlMandar] = useState<string | null>(enviadaAhora ? firmaPrecio : null);
  useEffect(() => {
    if (!enviadaAhora) setPrecioAlMandar(null);
    else if (precioAlMandar === null) setPrecioAlMandar(firmaPrecio);
  }, [enviadaAhora]); // eslint-disable-line react-hooks/exhaustive-deps
  const renegociando = enviadaAhora && precioAlMandar !== null && firmaPrecio !== precioAlMandar;

  /**
   * **El camino** (2026-11-11): los hitos de una cotización, como trofeos.
   * Sin anticipo, ese hito se cumple al mandarla.
   */
  // Un anticipo de $0 —una cotización todavía sin productos— no está pagado.
  const anticipoPagado = cond.pct > 0 && cond.anticipo > 0 && cobrado.anticipoListo;
  const camino = [
    { nombre: 'Enviada', listo: ganada || mandada },
    { nombre: cond.pct > 0 ? 'Anticipo' : 'Sin anticipo',
      listo: cond.pct > 0 ? ganada || anticipoPagado : ganada || mandada },
    { nombre: 'Ganada', listo: ganada },
    { nombre: 'Contrato enviado', listo: !!contratoEnviado || !!firmado },
    { nombre: 'Contrato firmado', listo: !!firmado },
    { nombre: 'Pagada', listo: cobrado.completo }
  ];
  const personasDelEvento = enMenus || invitados;
  /**
   * **¿Cabe en el día?** (2026-11-11, lo pidió el cliente). Lo ya tomado ese
   * día se pide a `/api/ocupacion` cada vez que cambia la fecha; la regla es
   * la misma `cupoParaGanar()` que usa `/convertir` para rechazarlo. Una
   * ganada no se mira: su propia reserva ya está contada.
   */
  // Dos números: todo lo tomado, y lo tomado por quien pagó o abonó. **Con
  // algo pagado la cotización tiene prioridad** (2026-11-12) y solo cuentan
  // los segundos; es la misma regla de `/convertir`.
  const [tomadasDia, setTomadasDia] = useState<{ todas: number; prioridad: number } | null>(null);
  useEffect(() => {
    setTomadasDia(null);
    if (!esFecha(fechaReal) || ganada) return;
    let vivo = true;
    fetch(`/api/ocupacion?desde=${fechaReal}&hasta=${fechaReal}`).then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        const o = (d.ocupacion ?? []).find((x: { fecha: string }) => x.fecha === fechaReal);
        setTomadasDia(o ? { todas: o.tomadas, prioridad: (o.pagadas ?? 0) + (o.abonadas ?? 0) }
          : { todas: 0, prioridad: 0 });
      }).catch(() => {});
    return () => { vivo = false; };
  }, [fechaReal, ganada]);
  const cupo = tomadasDia === null || !esFecha(fechaReal) ? null
    : cupoParaGanar(datos.fechas.find((f) => f.fecha === fechaReal), fechaReal,
        { cupoNormal: datos.cupoNormal ?? 120, horaApertura: datos.horaApertura ?? '' },
        cobrado.pagado > 0 ? tomadasDia.prioridad : tomadasDia.todas, personasDelEvento);
  const sinCupo = !!cupo && !cupo.cabe && !ganada && personasDelEvento > 0;
  const avisoCupo = sinCupo && cupo ? (
    <div role="alert" className="rounded-xl border-2 border-rojo-fuerte/70 bg-rojo/10 p-3 text-[15px]">
      <p className="font-bold text-rojo-texto">
        {cupo.exclusivo
          ? 'Ese día está arrendado en exclusiva a otro cliente.'
          : `Se está excediendo el cupo del día: quedan ${Math.max(0, cupo.libres)} lugares y la cotización es de ${personasDelEvento} personas.`}
      </p>
      <p className="mt-1 text-hueso/85">
        No podemos tomar la reserva. Comunícate con la administración para ver si se pueden
        abrir más cupos, o si habrá que cancelar la cotización.
      </p>
    </div>
  ) : null;
  /**
   * **El evento exclusivo** (2026-11-12, lo pidió el cliente). Si la
   * cotización es exclusiva y ese día ya tiene reservas de otros, **no se
   * gana**: hay que liberar el día, y eso lo decide el encargado de pagos o
   * la gerencia (`/api/presupuestos/exclusivo`). Nada se hace solo.
   */
  const conArriendo = tieneArriendo(vistas, datos.menus);
  /** En un día privado sin show, que va solo si se agrega (paso 3). */
  const notaShow = show && !publico && esFecha(fechaReal) && !vistas.some((l) => l.concepto === show.nombre)
    ? 'Día privado: el show ecuestre va solo si lo agregas.' : '';
  const esExcl = esExclusivo(exclusivo);
  /** Un día en que el vendedor no puede marcar exclusivo (Configuración, 2026-11-23). */
  const sinExclusivo = esFecha(fechaReal) && !pasaPorEncima
    && (datos.fechasSinExclusivo ?? []).includes(fechaReal);
  const otrasPersonas = tomadasDia?.todas ?? 0;
  const choqueExclusivo = esExcl && !ganada && esFecha(fechaReal) && otrasPersonas > 0;
  const decisionExcl = exclusividadDe(marcaExcl);
  const diasExcl = datos.exclusivoDias ?? 7;
  const plazoExcl = esFecha(fechaReal) ? plazoParaLiberar(fechaReal, datos.hoy, diasExcl) : null;
  const [pidiendoExcl, setPidiendoExcl] = useState(false);
  async function pedirLiberar() {
    if (!p) return;
    setPidiendoExcl(true);
    try {
      // Lo escrito se manda antes: el pedido exige que esté guardada como exclusiva.
      if (autoActivo) await auto.forzar();
      const r = await fetch('/api/presupuestos/exclusivo', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id, accion: 'pedir' })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { avisar(d.error || 'No se pudo mandar el pedido.', 'atencion'); return; }
      if (d.exclusividad !== undefined) setMarcaExcl(d.exclusividad);
      huboGuardado.current = true;
      avisar('Pedido enviado: le llega a quien decide, en su bandeja de aprobaciones');
    } finally { setPidiendoExcl(false); }
  }
  const alarmaExclusivo = choqueExclusivo ? (
    <div role="alert" className="rounded-xl border-2 border-morado-fuerte/70 bg-morado/10 p-4 text-[15px]">
      <p className="text-[17px] font-bold text-morado-texto">
        🟣 Es exclusivo, y ese día ya hay {otrasPersonas} {otrasPersonas === 1 ? 'persona reservada' : 'personas reservadas'}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-hueso/85">
        Para ganarla hay que liberar el día. <AyudaCorta tema="liberarParaGanar" />
      </p>
      {plazoExcl && !plazoExcl.enPlazo && decisionExcl.estado !== 'aprobada' && (
        <p className="mt-2 font-semibold text-ambar-texto">
          Faltan {plazoExcl.faltan} {plazoExcl.faltan === 1 ? 'día' : 'días'}, menos de los {diasExcl} de
          Configuración: va como caso especial.
        </p>
      )}
      {decisionExcl.estado === 'pedida' && (
        <p className="mt-3 rounded-lg border-2 border-dashed border-morado-fuerte/60 px-3 py-2 font-semibold">
          ⏳ Pedido por {decisionExcl.quien} el {decisionExcl.cuando}. Esperando la decisión.
        </p>
      )}
      {decisionExcl.estado === 'aprobada' && (
        <p className="mt-3 rounded-lg border-2 border-verde-fuerte/70 bg-verde/10 px-3 py-2">
          <strong className="text-verde-texto">✓ {decisionExcl.quien} aprobó liberar el día</strong>
          {decisionExcl.nota ? ` · ${decisionExcl.nota}` : ''}. El día ya no se vende. Falta avisarles a esas
          reservas y cancelarlas o cambiarlas de fecha: el plan está en{' '}
          <a href={`/dia/${fechaReal}#liberar`} className="font-semibold text-oro underline">la página del día</a>.
          Con el día libre, se puede ganar.
        </p>
      )}
      {decisionExcl.estado === 'rechazada' && (
        <p className="mt-3 rounded-lg border-2 border-rojo-fuerte/70 bg-rojo/10 px-3 py-2">
          <strong className="text-rojo-texto">✕ {decisionExcl.quien} no lo aprobó</strong>
          {decisionExcl.nota ? `: ${decisionExcl.nota}` : ''}.
        </p>
      )}
      {puedeEditar && decisionExcl.estado !== 'pedida' && decisionExcl.estado !== 'aprobada' && (
        <button type="button" disabled={pidiendoExcl} onClick={() => void pedirLiberar()}
          className="tecla mt-3 min-h-[52px] w-full rounded-xl border-2 border-morado-fuerte px-5 text-[16px]
                     font-bold text-morado-texto hover:bg-morado/10 disabled:opacity-50">
          {pidiendoExcl ? 'Mandando…' : decisionExcl.estado === 'rechazada'
            ? '🙋 Pedirlo de nuevo' : '🙋 Pedir liberar el día'}
        </button>
      )}
    </div>
  ) : null;
  /** Lo que impide ganar ahora: el día exclusivo con gente, o el cupo. */
  const bloqueoGanar = choqueExclusivo || sinCupo;
  const tituloBloqueo = choqueExclusivo ? 'Falta liberar el día' : 'No hay cupo para tomarla';
  const bajadaBloqueo = choqueExclusivo
    ? 'Mientras ese día tenga reservas de otros, no se puede ganar como exclusiva.'
    : 'Mientras el día no tenga lugar, no se puede marcar ganada.';
  // **Las alternativas** (2026-11-10, rehechas el 2026-11-11): un número por
  // cotización —el del grupo— y una letra por alternativa. Se mandan juntas
  // en un solo link y, antes de ganar, se elige una.
  const alts = p ? alternativasDe(p, alternativas) : [];
  const letra = p ? letraDe(p, alternativas) : '';
  const vivas = p ? vivasDelGrupo(p, alternativas) : [];
  const grupoGanado = alts.some((a) => !!a.idReserva);
  const porElegir = !!p && !ganada && !grupoGanado && !cancelada && vivas.length > 1 && sigueViva(p);
  const noQuedo = !!p && !ganada && estadoNormal(p.estado) === ESTADO_PRESUPUESTO.noElegida;
  const laElegida = noQuedo ? vivas[0] : undefined;
  const enElLink = p ? paraElLink(p, alternativas) : [];
  const siguienteLetra = String.fromCharCode(65 + alts.length);
  const totalAlt = (a: Presupuesto) => a.id === p?.id ? cuentas.total
    : totalDe(lineasDe(datos.lineas ?? [], a.id), a.descuento);
  const resumenLink = enElLink.length > 1
    ? enElLink.map((a) => `${letraDe(a, alternativas)} ${enPesos(totalAlt(a))}`).join(' · ') : '';

  /** La gente de una alternativa: la de esta ventana es la que se ve. */
  const genteDe = (a: Presupuesto) => a.id === p?.id ? personasDelEvento
    : lineasDe(datos.lineas ?? [], a.id).reduce((n, l) => n + (l.personas || 0), 0) || a.invitados || 0;
  /**
   * **Si se puede ganar cada alternativa** (2026-11-12). Con lo pagado en
   * todo el grupo: el anticipo es del evento, aunque se haya anotado en otra.
   */
  const cobrosGrupo = [...cobros, ...cobrosOtras];
  const ganable = (a: Presupuesto): { ok: boolean; falta: number } => {
    const c = a.id === p?.id ? cond : condicionesDe(
      { anticipo: a.anticipo, anticipoMonto: a.anticipoMonto, saldoDias: a.saldoDias, fecha: a.fecha }, totalAlt(a),
      datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 });
    const est = estadoCobros({ anticipo: c.anticipo, total: totalAlt(a) }, cobrosGrupo);
    const conContrato = a.id === p?.id ? !!firmado : !!String(a.contrato ?? '').trim();
    const ok = (c.pct > 0 && c.anticipo > 0 && est.anticipoListo)
      || (c.pct === 0 && estaMandada(a.id === p?.id ? estado : a.estado)) || conContrato;
    return { ok, falta: est.faltaAnticipo };
  };
  /** Para *Corregir la ganada*: a qué otra alternativa se pueden pasar los pagos. */
  const vivasParaCorregir = alts.filter((a) => a.id !== p?.id
    && !([ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.cancelada] as string[]).includes(estadoNormal(a.estado)));
  /** Con varias alternativas en carrera, alguna ya se puede ganar. */
  const grupoListo = porElegir && vivas.some((a) => ganable(a).ok);

  /** El botón grande de ganar, el mismo en los dos pasos. */
  // Con alternativas en carrera también se ofrece: ganar una es elegirla
  // (2026-11-12, lo decidió el cliente). La confirmación dice cuáles quedan
  // como No elegida.
  // **Con varias alternativas, un botón por cada una** (2026-11-12, lo pidió
  // el cliente: estaba en la A, la marcó ganada y el cliente había elegido la
  // B). Cada botón dice la letra y el total: se elige cuál ganó, no se gana
  // "esta" sin mirar.
  const botonGanar = choqueExclusivo ? alarmaExclusivo : sinCupo ? avisoCupo : esFecha(fechaReal) && puedeEditar && porElegir ? (
    <div className="space-y-2">
      <p className="text-[15px] font-semibold">¿Con cuál alternativa se quedó el cliente?</p>
      <div className={`grid gap-2 ${vivas.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {vivas.map((a) => {
          const g = ganable(a);
          const l = letraDe(a, alternativas);
          return (
            <button key={a.id} type="button" disabled={guardando || !g.ok}
              onClick={() => setConfirmandoGanar(a.id)}
              className={`tecla flex min-h-[84px] flex-col items-center justify-center rounded-xl border-2 px-4 py-2
                         disabled:cursor-not-allowed ${g.ok
                ? 'border-verde-fuerte bg-verde-fuerte text-tinta shadow-md hover:brightness-110'
                : 'border-hueso/25 text-hueso/70'}`}>
              <span className="text-[20px] font-extrabold uppercase tracking-wide">✓ Ganó la {l}</span>
              <span className="text-[15px] font-semibold">{enPesos(totalAlt(a))}{a.id === p?.id ? ' · la que estás viendo' : ''}</span>
              {!g.ok && <span className="text-[13px]">falta el anticipo: {enPesos(g.falta)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  ) : esFecha(fechaReal) && puedeEditar ? (
    <span className="flex items-center gap-1">
      <button type="button" disabled={guardando} onClick={() => setConfirmandoGanar(p?.id ?? '')}
        className="tecla min-h-[64px] w-full rounded-xl border-2 border-verde-fuerte bg-verde-fuerte
                   px-6 text-[20px] font-extrabold uppercase tracking-wide text-tinta
                   shadow-md hover:brightness-110 disabled:opacity-50">
        ✓ Marcar ganada
      </button>
      <AyudaCorta tema="marcarGanada" />
    </span>
  ) : !esFecha(fechaReal) ? (
    <button type="button" className="boton min-h-[48px]" onClick={() => setPaso(2)}>Ir al paso 2: Evento</button>
  ) : null;
  const bajadaGanar = esFecha(fechaReal)
    ? `Crea la reserva de ${personasDelEvento} personas y le toma el cupo al ${enPalabras(fechaReal)}.`
    : 'Para ganarla, ponle la fecha en el paso 2.';
  const saldo = cobrado.falta > 0 ? (
    // Solo se muestra con la cotización ganada (2026-11-12, lo pidió el
    // cliente: que el paso diga qué falta para completar la reserva y no
    // vuelva a ofrecer ganarla).
    <Hito tono="ambar" titulo={ganaSinRespaldo(cobrado.pagado, !!firmado)
        ? `⚠ Ganada sin pago ni contrato · sujeta a espacio`
        : `✓ Ganada${firmado ? ' y firmada' : ''} · falta el saldo: ${enPesos(cobrado.falta)}`}
      bajada={ganaSinRespaldo(cobrado.pagado, !!firmado)
        ? `Falta ${enPesos(cobrado.falta)}.`
        : `Se paga ${cond.saldoHasta
        ? `hasta el ${enPalabras(cond.saldoHasta)}` : `${cond.dias} días antes del evento`}.`}>
      {puedeEditar && (
        <button type="button" disabled={guardando} onClick={() => void cobrar(cobrado.falta, 'Saldo')}
          className="tecla min-h-[56px] w-full rounded-xl border-2 border-verde-fuerte px-5 text-[17px]
                     font-bold text-verde-texto hover:bg-verde/10 disabled:opacity-50 lg:min-h-[48px]">
          ✓ Pagó el saldo · {enPesos(cobrado.falta)}
        </button>
      )}
    </Hito>
  ) : null;

  /**
   * **El próximo paso del paso 4, Envío** (2026-11-11). Mandarla, esperar el
   * anticipo y ganarla con él. Con *Sin anticipo* también se ofrece ganar, y
   * la confirmación avisa si tampoco hay contrato firmado.
   */
  // Una alternativa que no quedó no tiene próximo paso: lo dice su franja
  // arriba, con *Abrir la elegida*.
  /** Si el próximo paso del 4 es mandarla: ese cuadro va arriba, no al final. */
  const mandarPrimero = !!p && !cancelada && !noQuedo && !ganada
    && !(anticipoPagado || (mandada && cond.pct === 0) || grupoListo) && !mandada;
  /**
   * **Lo que se llena una vez, plegado en el computador** (2026-11-21, regla
   * *una tarjeta abierta cabe en una pantalla*: "lo secundario plegado, como
   * un ajuste guardado"). Las condiciones de pago y los recordatorios se leen
   * en una frase con su *✎ Cambiar*, y se abren al apretarlo; los datos de la
   * factura se leen en dos renglones y se cambian en una ventanita. **En el
   * celular no cambia nada**: ahí los campos siguen a la vista (el pliegue va
   * con `lg:`).
   */
  const faltaFactura = faltaParaFactura(facturacion);
  const rutMalo = !!facturacion.rut.trim() && !rutValido(facturacion.rut);
  /** Los cuatro campos de la factura: en línea en el celular, en su ventana en el computador. */
  const camposFactura = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {([
        ['empresa', 'Razón social', 'Como aparece en el SII'],
        ['rut', 'RUT', '76.123.456-7'],
        ['giro', 'Giro', 'Actividad de la empresa'],
        ['domicilio', 'Dirección', 'Calle, número, comuna']
      ] as const).map(([k, etiqueta, ejemplo]) => (
        <label key={k} className="block">
          <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
            {etiqueta}
          </span>
          {k === 'rut' ? (
            <CampoRut valor={facturacion.rut} placeholder={ejemplo} className={ENTRADA}
              onCambio={(v) => setFacturacion({ ...facturacion, rut: v })} />
          ) : (
            <input value={facturacion[k]} placeholder={ejemplo} className={ENTRADA}
              onChange={(e) => setFacturacion({ ...facturacion, [k]: e.target.value })} />
          )}
        </label>
      ))}
    </div>
  );
  /** Guardar a mano, corregir la ganada y borrar: abajo en el celular, en el pie en el computador. */
  const secundarios = (
    <>
      {ganada && !cancelada && puedeEditar && (
        <span className="inline-flex items-center">
          <button type="button" disabled={guardando} onClick={() => setCorrigiendo(true)}
            className="boton">Corregir la ganada</button>
          <AyudaCorta tema="corregirGanada" />
        </span>
      )}
      {p && !ganada && puedeEditar && (
        <button type="button" onClick={() => void borrar()}
          className="boton hover:border-rojo-fuerte hover:text-rojo-texto">
          Borrar
        </button>
      )}
    </>
  );

  /**
   * **✕ Se cayó…, en el pie de cada paso** (2026-11-22, lo pidió el cliente:
   * *"el vendedor responsable de su venta debería tener en cada página del
   * pop-up de cotizaciones el botón se cayó… da igual en qué fase está"*, y
   * después, al verlo arriba a la derecha: *"prefiero que se cayó esté al
   * lado abajo de donde sale ir al próximo paso. Como botón clave"*). Va al
   * lado del dorado, del mismo alto, con borde rojo. Abre la ventanita que
   * pide el motivo y confirma (`SeCayo`). Solo en una cotización en carrera:
   * una ganada se cancela, con su propio botón (*Cancelar evento*). Lo ve
   * quien puede tocarla: el vendedor la suya; pagos, la gerencia y el
   * administrador, todas.
   */
  const botonSeCayo = p && puedeEditar && !cancelada && enCarrera({ estado, idReserva: p.idReserva }) ? (
    <button type="button" disabled={guardando} onClick={() => setCayendo(true)}
      className="boton min-h-[52px] !border-2 !border-rojo-fuerte/60 !px-4 !text-[15px] !font-bold text-rojo-texto
                 hover:!border-rojo-fuerte hover:!text-rojo-texto lg:min-h-[44px]">
      ✕ Se cayó…
    </button>
  ) : null;

  /** Lo mismo, del paso 5: corregir la ganada y cancelar el evento. */
  const secundariosContrato = (
    <>
      {ganada && !cancelada && puedeEditar && (
        <span className="inline-flex items-center">
          <button type="button" disabled={guardando} onClick={() => setCorrigiendo(true)}
            className="boton">Corregir la ganada</button>
          <AyudaCorta tema="corregirGanada" />
        </span>
      )}
      {ganada && !cancelada && puedeEditar && (
        <span className="inline-flex items-center">
          <button type="button" disabled={guardando} onClick={() => setCancelando(true)}
            className="boton hover:!border-rojo-fuerte hover:text-rojo-texto">
            Cancelar evento
          </button>
          <AyudaCorta tema="cancelarEvento" />
        </span>
      )}
    </>
  );

  /** Que los menús sumen los invitados: en verde si calzan, en ámbar si no. No bloquea. */
  const avisoMenus = invitados > 0 && enMenus > 0 && enMenus !== invitados ? (
    <p className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px] font-semibold text-ambar-texto lg:py-1">
      Los menús suman {enMenus} {enMenus === 1 ? 'persona' : 'personas'} y los
      invitados son {invitados}.{' '}
      {enMenus > invitados ? 'Baja la cantidad de algún menú.' : `Faltan ${invitados - enMenus} en los menús.`}
    </p>
  ) : invitados > 0 && enMenus === invitados ? (
    <p className="text-[14px] font-semibold text-verde-texto">
      ✓ Los menús suman los {invitados} invitados.
    </p>
  ) : null;

  const hitoEnvio: React.ReactNode = !p || cancelada || noQuedo ? null
    : ganada ? (
      saldo && firmado ? saldo : (
        <Hito tono="verde" titulo="✓ Ganada · sigue el contrato">
          <button type="button" className="boton boton-relleno min-h-[52px] px-6 text-[16px]"
            onClick={() => setPaso(5)}>Ir al paso 5: Contrato →</button>
        </Hito>
      )
    ) : anticipoPagado || (mandada && cond.pct === 0) || grupoListo ? (
      <Hito tono={bloqueoGanar ? 'ambar' : 'verde'}
        titulo={bloqueoGanar ? tituloBloqueo : esFecha(fechaReal) ? 'Lista para ganar' : 'Falta el día del evento'}
        bajada={bloqueoGanar ? bajadaBloqueo : bajadaGanar}>
        {botonGanar}
      </Hito>
    ) : !mandada ? (
      <Hito tono="rosa" titulo={enElLink.length > 1 ? `Mándale las ${enElLink.length} alternativas` : 'Mándasela al cliente'}
        bajada={(enElLink.length > 1 ? `Van todas en un solo link: ${resumenLink}. ` : '')
          + 'Al volver te pregunto si la mandaste.'}>
        <BotonesMandar link={link} whatsapp={whatsapp} correo={correo} onMandar={mandar} grande />
      </Hito>
    ) : (
      <Hito tono="ambar" titulo={`Esperando el anticipo: ${enPesos(cobrado.faltaAnticipo)}`}
        bajada={firmado
          ? 'Ya tiene el contrato firmado: también se puede marcar ganada en el paso 5, Contrato.'
          : 'Si pagó otro monto, anótalo arriba en El pago.'}>
        {puedeEditar && (
          <button type="button" disabled={guardando}
            onClick={() => void cobrar(cobrado.faltaAnticipo, 'Anticipo')}
            className="tecla min-h-[56px] w-full rounded-xl border-2 border-verde-fuerte px-5 text-[17px]
                       font-bold text-verde-texto hover:bg-verde/10 disabled:opacity-50 lg:min-h-[48px]">
            ✓ Anticipo recibido · {enPesos(cobrado.faltaAnticipo)}
          </button>
        )}
      </Hito>
    );

  /**
   * **El próximo paso del paso 5, Contrato** (2026-11-11). Mandar el
   * contrato, esperar el firmado y, con el firmado subido, ganarla aunque
   * falte el anticipo (`puedeGanar()`): *"en contratos obviamente solo puede
   * marcar ganado si está el contrato"*.
   */
  const hitoContrato: React.ReactNode = !p || cancelada || noQuedo ? null
    : !firmado ? (
      contratoEnviado ? (
        <Hito tono="cielo" titulo="Esperando el contrato firmado"
          bajada={`Se lo mandaste el ${enPalabras(contratoEnviado)}. Cuando te lo devuelva firmado, súbelo.`}>
          {puedeEditar && <SubirFirmado subiendo={subiendoContrato} onArchivo={(f) => void subirContrato(f)} />}
        </Hito>
      ) : (
        <Hito tono="cielo" titulo="Mándale el contrato"
          bajada="Al volver te pregunto si lo mandaste.">
          <BotonesMandar link={linkContrato} whatsapp={whatsappContrato} correo={correoContrato}
            onMandar={(v) => mandar(v, 'contrato')} ver="Ver el contrato" grande />
          {puedeEditar && <SubirFirmado subiendo={subiendoContrato} onArchivo={(f) => void subirContrato(f)} />}
        </Hito>
      )
    ) : !ganada ? (
      <Hito tono={bloqueoGanar ? 'ambar' : 'verde'}
        titulo={bloqueoGanar ? tituloBloqueo : esFecha(fechaReal) ? '✓ Contrato firmado · lista para ganar' : 'Falta el día del evento'}
        bajada={bloqueoGanar ? bajadaBloqueo : bajadaGanar + (cobrado.faltaAnticipo > 0
          ? ` El anticipo (${enPesos(cobrado.faltaAnticipo)}) queda por cobrar.` : '')}>
        {botonGanar}
      </Hito>
    ) : saldo ?? (
      <Hito tono="verde" titulo="✓ Cerrada: ganada, firmada y pagada" bajada="No queda nada por hacer con esta cotización." />
    );

  const titulo = p
    ? `${estadoVisible(p, datos.hoy) === ESTADO_PRESUPUESTO.candidato ? 'Candidato' : 'Cotización'}`
      + ` N° ${folioDe({ id: grupoDe(p) })}${letra ? ` · Alternativa ${letra}` : ''}`
    : 'Nueva cotización';

  /**
   * **Para quién es, al lado del título** (2026-11-21, solo en el
   * computador): el cliente, el día, los invitados y el total, en la línea
   * del N°. Reemplaza ahí a la línea *Para …* y al resumen que abría los
   * pasos 4 y 5: decían lo mismo en tres renglones más.
   */
  // Un `div` y no un `p`: adentro va *✓ Guardado* (`AvisoGuardado`), que es
  // un párrafo, y un párrafo dentro de otro es un error de HTML (2026-11-23).
  const resumenArriba = cliente && paso !== 1 ? (
    <div className="text-[15px]">
      Para <strong>{cliente.nombre}</strong>
      {empresaAparte(cliente.nombre, cliente.empresa) && <span className="text-hueso/75"> · {cliente.empresa}</span>}
      {fechaReal ? <> · <span className="inline-block first-letter:uppercase">{enPalabras(fechaReal)}</span></>
        : periodo ? <> · {periodo}</> : null}
      {invitados > 0 && <> · {invitados} invitados</>}
      {tipoEvento && <> · {tipoEvento}</>}
      {p && cuentas.total > 0 && <> · <strong className="text-oro">{enPesos(cuentas.total)}</strong></>}
      {/* *✓ Guardado*, también arriba: en cada paso iba al pie, en su propia fila. */}
      {autoActivo && paso >= 3 && !cancelada && (
        <span className="ml-4 inline-block align-baseline">
          <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
        </span>
      )}
    </div>
  ) : null;

  return (
    <Dialogo titulo={titulo} onCerrar={() => void cerrar()} ancho="max-w-3xl lg:max-w-[73rem]"
      alLado={resumenArriba}>
      {/* **La ventana entera cabe en la pantalla del computador** (2026-11-21,
          lo pidió el cliente: *"todas las pestañas se pueden organizar para que
          queden dentro de una pantalla"*). Desde 1024px la ventana es ancha:
          los pasos y las alternativas van en una fila, y cada paso reparte lo
          suyo en columnas. En el celular, lo de siempre. */}
      {/* **Dos filas en el computador** (2026-11-24, lo pidió el cliente: *"los
          pasos tienen que llegar en una fila y ahí comprometer un poco la
          eficiencia del espacio y poner las alternativas en una segunda fila
          abajo. Son igual cosas importantes… en otra fila veo las alternativas
          y quizás un botón grande de las notas"*): arriba los cinco pasos, a lo
          ancho; abajo las alternativas y *🗒 Notas*, grande, a la derecha. */}
      <div className="lg:mb-2 lg:mt-1.5 lg:space-y-1.5">
      {/* Los cinco pasos, como botones: se ve dónde se está y se puede saltar.
          Desde el 2026-11-11 son cinco: el envío y el contrato son dos
          conversaciones con el cliente, cada una con su hito al final. */}
      <nav ref={arriba} aria-label="Pasos" className="mb-4 grid grid-cols-5 gap-1 lg:mb-0 lg:gap-1.5">
        {PASOS.map((nombre, i) => (
          <button key={nombre} type="button" onClick={() => void irA(i + 1)}
            aria-current={paso === i + 1 ? 'step' : undefined}
            className={`tecla flex min-h-[48px] flex-col items-center justify-center rounded
                        border px-1 text-[13px] font-semibold lg:min-h-[44px] lg:flex-row lg:gap-1.5
                        lg:text-[14px] ${paso === i + 1
              ? 'border-oro bg-oro text-tinta' : 'border-hueso/20 text-hueso/80'}`}>
            <span className="text-[16px] leading-none">{i + 1}</span>
            <span>{nombre}</span>
          </button>
        ))}
      </nav>

      {/* ***🗒 Notas*** (2026-11-23, la agenda del vendedor): lo conversado
          con el cliente y cuándo volver a contactarlo, a la vista en los cinco
          pasos. Solo para su vendedor y la gerencia (`puedeVerNotas()`). */}
      <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-2">
      {/* **La última nota, en los cinco pasos** (2026-11-25, lo pidió el
          cliente: *"se tiene que mostrar el último, no el primer comentario,
          en paso 2 Evento y paso 4 Envío y en todos lados"*). Va dentro de
          este botón, en un renglón: en el paso 2 un bloque aparte no cabía en
          1280×650. Entera, al pasar el mouse y en *🗒 Notas*; en el paso 4
          sigue además *Lo conversado*. El día del próximo contacto, como la
          pastilla 📞: ámbar hasta ese día y rojo desde ese día. */}
      {p && veNotas && (
        <button type="button" onClick={() => setNotasAbiertas(true)} title={ultima ? ultima.nota : undefined}
          className="boton mb-4 flex min-h-[48px] w-full flex-wrap items-center justify-center gap-x-2 text-[15px]
                     font-semibold sm:w-auto lg:order-last lg:mb-0 lg:min-h-[44px] lg:min-w-[15rem] lg:max-w-[36rem]
                     lg:flex-1 lg:flex-nowrap lg:justify-start">
          <span className="shrink-0">🗒 Notas{notasDelGrupo ? ` · ${notasDelGrupo}` : ''}</span>
          {esFecha(recontactar) && (
            <span className={`shrink-0 ${recontactar <= datos.hoy ? 'text-rojo-texto' : 'text-ambar-texto'}`}>
              · 📞 {enCorto(recontactar)}</span>
          )}
          {ultima && (
            <span className="min-w-0 basis-full truncate text-[14px] font-normal text-hueso/75 lg:basis-auto">
              <span aria-hidden className="hidden lg:inline">· </span>{ultima.nota}
            </span>
          )}
        </button>
      )}

      {/* **Las alternativas, dentro de la cotización** (2026-11-10): una
          pestaña por alternativa y *+ Otra alternativa*, en vez de dos
          cotizaciones sueltas con dos números. */}
      {p && paso >= 2 && (
        <div className="mb-4 rounded-xl border border-hueso/15 bg-panel p-2 lg:mb-0 lg:min-w-0 lg:flex-1
                        lg:px-1.5 lg:py-[3px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center text-[13px] font-medium uppercase tracking-wide text-hueso/60">
              {alts.length > 1 ? 'Alternativas' : 'Una sola versión'}
              <AyudaCorta tema="alternativas" />
            </span>
            {alts.length > 1 && alts.map((a) => {
              const fuera = !sigueViva(a);
              const elegidaYa = !fuera && vivas.length === 1 && alts.length > 1;
              return (
                <button key={a.id} type="button" aria-pressed={a.id === p.id}
                  onClick={() => { if (a.id !== p.id) void abrirAlternativa(a.id); }}
                  className={`boton min-h-[48px] min-w-[48px] gap-1.5 lg:min-h-[36px] ${a.id === p.id ? '!border-oro bg-oro/15 font-semibold' : ''}
                              ${fuera ? 'opacity-60' : ''}`}>
                  <span className={`text-[17px] font-bold ${fuera ? 'line-through' : ''}`}>{letraDe(a, alternativas)}</span>
                  <span className="text-[13px] font-normal text-hueso/75">{enPesos(totalAlt(a))}</span>
                  {elegidaYa && <span className="text-[13px] font-semibold text-verde-texto">✓ elegida</span>}
                  {fuera && <span className="text-[13px]">no quedó</span>}
                </button>
              );
            })}
            {puedeEditar && !grupoGanado && !cancelada && (
              <button type="button" disabled={guardando} onClick={() => void duplicar(paso >= 3 ? 3 : 2)}
                className="boton min-h-[48px] border-dashed lg:min-h-[36px]">+ Crear alternativa {siguienteLetra}</button>
            )}
          </div>
          {noQuedo && laElegida && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-2">
              <span className="flex-1 text-[15px] font-semibold text-ambar-texto">
                Esta alternativa no quedó: el cliente se quedó con la {letraDe(laElegida, alternativas)}.
              </span>
              <button type="button" className="boton min-h-[44px]"
                onClick={() => void abrirAlternativa(laElegida.id)}>Abrir la {letraDe(laElegida, alternativas)}</button>
              {puedeEditar && !grupoGanado && (
                <button type="button" disabled={guardando} className="boton min-h-[44px]"
                  onClick={() => void elegirAlternativa(laElegida.id, true)}>Volver a ofrecer todas</button>
              )}
            </div>
          )}
          {!noQuedo && !porElegir && !grupoGanado && vivas.length === 1 && alts.length > 1 && puedeEditar && (
            <p className="mt-2 text-[14px] text-hueso/75">
              El cliente se quedó con esta.{' '}
              <button type="button" disabled={guardando} className="font-semibold text-oro underline"
                onClick={() => void elegirAlternativa(p.id, true)}>Volver a ofrecer todas</button>
            </p>
          )}
        </div>
      )}
      </div>

      {/* Para quién es, a la vista en los cuatro pasos. */}
      </div>

      {cliente && paso !== 1 && (
        <p className="mb-3 text-[15px] lg:hidden">
          Para <strong>{cliente.nombre}</strong>
          {empresaAparte(cliente.nombre, cliente.empresa) && <span className="text-hueso/75"> · {cliente.empresa}</span>}
          {fechaReal && <> · <span className="first-letter:uppercase inline-block">{enPalabras(fechaReal)}</span></>}
          {!fechaReal && periodo && <> · {periodo}</>}
        </p>
      )}

      {!puedeEditar && (
        <p className="mb-3 rounded border border-hueso/25 bg-hueso/5 px-3 py-2 text-[14px]">
          {soloMira
            ? <>👁 <strong>Vista gerencia:</strong> la puedes ver, no cambiar.</>
            : <>La creó <strong>{p?.creadoPor || 'otra persona'}</strong>: la puedes ver, no cambiar.</>}
        </p>
      )}
      {cancelada && (
        <p className="mb-3 rounded border border-rojo-fuerte/60 bg-rojo/10 px-3 py-2 text-[14px]">
          <strong className="text-rojo-texto">Cancelada.</strong> Lo que queda es la devolución, en el paso 4, Envío.
        </p>
      )}
      {ganada && !cancelada && (ganaSinRespaldo(cobrado.pagado, !!firmado) ? (
        // **Ganada sin un peso y sin contrato** (2026-11-12): se dice arriba,
        // en todos los pasos, porque su reserva no tiene preferencia.
        <div className="mb-3 rounded-lg border-2 border-dashed border-ambar-fuerte/70 bg-ambar/10 px-3 py-2 text-[15px]">
          {/* El porqué, en su `?` (2026-11-21, regla *lo que explica va en su ?*). */}
          <p className="flex items-center gap-2">
            <strong className="text-ambar-texto">⚠ Ganada sin pago ni contrato: sujeta a espacio.</strong>
            <AyudaCorta tema="sujetaAEspacio" />
          </p>
        </div>
      ) : (
        <p className="mb-3 flex items-center gap-2 rounded border border-verde-fuerte/60 bg-verde/10 px-3 py-2 text-[14px]">
          <strong className="text-verde-texto">✓ Ganada.</strong> <AyudaCorta tema="ganada" />
        </p>
      ))}

      {/* Una cancelada se ve, no se edita: solo quedan sus pagos (paso 4),
          para anotar la devolución. */}
      <fieldset disabled={!puedeEditar || (cancelada && paso !== 4)} className="min-w-0">
        {/* ---------- 1. Cliente ---------- */}
        {paso === 1 && (
          <div className="space-y-3">
            {cliente && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-verde-fuerte/50
                              bg-verde/10 p-3">
                <div className="flex-1">
                  <p className="text-[16px] font-semibold">{cliente.nombre}</p>
                  <p className="text-[14px] text-hueso/70">
                    {[cliente.empresa, cliente.telefono, cliente.correo].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {/* La ficha de un cliente de otro vendedor llega tapada y no
                    se edita: el botón no se dibuja. */}
                {puedeEditarCliente && !cliente.contactoTapado && (
                  <button type="button" className="boton min-h-[44px] px-4"
                    onClick={() => setEditandoCliente(true)}>✎ Editar cliente</button>
                )}
              </div>
            )}
            {editandoCliente && cliente && (
              <Dialogo titulo="Editar cliente" onCerrar={() => setEditandoCliente(false)} ancho="max-w-2xl">
                <div className="mt-2">
                  <EditarCliente cliente={cliente} columnas={2} onClientes={alEditarCliente}
                    onListo={() => setEditandoCliente(false)}
                    titulo={<>
                      <span aria-hidden>👤</span>{cliente.nombre}
                      <span className="text-[14px] font-normal text-hueso/70">· se guarda en su ficha</span>
                    </>} />
                </div>
              </Dialogo>
            )}
            {!nuevoCliente && (
              <>
                {/* ***+ Cliente nuevo* va arriba y se nota** (2026-11-21, lo pidió
                    el cliente: *"tiene que estar arriba y un botón notable, y
                    luego la lista y búsqueda"*). Iba al final, bajo la lista,
                    con el mismo peso que un botón cualquiera: con muchos
                    clientes había que bajar para encontrarlo. No va relleno
                    —el relleno de esta ventana es *Ir al paso 2*—: va grande
                    y con borde dorado. Lo escrito en el buscador pasa a ser
                    el nombre del cliente nuevo. */}
                {/* **La lista de clientes, en su marco de grupo** (2026-11-22,
                    la regla *el marco de la tarjeta manda*): el título, el
                    botón y el buscador arriba, y los clientes como tarjetas de
                    adentro (2px). */}
                <div className={`space-y-3 ${marcoGrupo()} p-3 lg:space-y-2 lg:px-3 lg:py-2`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <h3 className={`${TITULO_GRUPO} sm:mr-1 sm:shrink-0`}>Clientes</h3>
                  <button type="button"
                    className="boton min-h-[48px] shrink-0 !border-2 !border-oro px-5 !text-[15px] !font-bold !text-oro hover:bg-oro/10"
                    onClick={() => setNuevoCliente({ nombre: busqueda, telefono: '', correo: '', empresa: '' })}>
                    + Cliente nuevo
                  </button>
                  <input type="search" value={busqueda} autoFocus={!cliente}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar cliente por nombre, empresa, teléfono o correo"
                    aria-label="Buscar cliente" className={`${ENTRADA} min-h-[48px] sm:flex-1`} />
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {encontrados.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => { setIdCliente(c.id); setPaso(2); }}
                        className={`tecla w-full px-3 py-2 text-left min-h-[52px] ${
                          marcoTarjeta(false, c.id === idCliente ? 'verde' : 'normal', true, true)}`}>
                        <span className="block text-[15px] font-semibold">{c.nombre}</span>
                        <span className="block text-[13px] text-hueso/70">
                          {c.empresa || c.telefono || c.correo}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                </div>
              </>
            )}
            {nuevoCliente && (
              <div className={`space-y-3 ${marcoGrupo('oro')} p-3`}>
                <p className={TITULO_GRUPO}>Cliente nuevo</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Nombre" ancho="w-full">
                    <input className={ENTRADA} value={nuevoCliente.nombre} autoFocus
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Empresa (si es una)" ancho="w-full">
                    <input className={ENTRADA} value={nuevoCliente.empresa}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, empresa: e.target.value })} />
                  </Campo>
                  <Campo etiqueta="Teléfono" ancho="w-full">
                    <CampoTelefono valor={nuevoCliente.telefono} className={ENTRADA}
                      etiqueta="Teléfono del cliente nuevo"
                      onCambio={(v) => setNuevoCliente({ ...nuevoCliente, telefono: v })} />
                  </Campo>
                  <Campo etiqueta="Correo" ancho="w-full">
                    <input type="email" className={ENTRADA} value={nuevoCliente.correo}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })} />
                  </Campo>
                </div>
                {parecidas.length > 0 && (
                  <div className="rounded border border-ambar/50 bg-ambar/5 p-3">
                    <p className="text-[15px] font-semibold text-ambar-texto">
                      ¿Es alguno de estos? Ya hay un cliente con ese teléfono, correo o RUT.
                    </p>
                    {parecidas.map((c) => (
                      <button key={c.id} type="button" className="boton mt-2 mr-2"
                        onClick={() => { setIdCliente(c.id); setNuevoCliente(null);
                                         setParecidas([]); setPaso(2); }}>
                        Sí, es {c.nombre}
                      </button>
                    ))}
                    <button type="button" className="boton mt-2" onClick={() => void crearCliente(true)}>
                      No, es otro: crearlo igual
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {parecidas.length === 0 && (
                    <button type="button" className="boton boton-relleno min-h-[44px]"
                      onClick={() => void crearCliente()}>Crear y seguir</button>
                  )}
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => { setNuevoCliente(null); setParecidas([]); }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- 2. Evento ---------- */}
        {paso === 2 && (
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:space-y-0">
            {/* En el computador, dos columnas: a la izquierda cuándo y cuántos;
                a la derecha qué es, por quién viene y las notas. **Cada una en
                su marco de grupo, con su título** (2026-11-22, la regla *el
                marco de la tarjeta manda*): la misma `Seccion` de los pasos 4
                y 5. */}
            <Seccion tono="neutro" icono="📅" titulo="Cuándo y cuántos">
            <div className="space-y-4 lg:space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              {!sinFecha && (
                <Campo etiqueta="Fecha del evento" ancho="w-56">
                  <input type="date" value={fecha} min={ganada ? undefined : datos.hoy}
                    onChange={(e) => setFecha(e.target.value)}
                    className={`${ENTRADA} min-h-[48px]`} />
                </Campo>
              )}
              {sinFecha && (
                <Campo etiqueta="¿Cuándo, más o menos?" ancho="w-full sm:w-72">
                  <input value={periodo} onChange={(e) => setPeriodo(e.target.value)}
                    placeholder="marzo o abril, fin de año…" className={`${ENTRADA} min-h-[48px]`} />
                </Campo>
              )}
              {!ganada && (
                <button type="button" onClick={() => setSinFecha(!sinFecha)}
                  className={`boton min-h-[48px] ${sinFecha ? 'border-oro bg-oro/15' : ''}`}>
                  {sinFecha ? '✓ Todavía sin día exacto' : 'Todavía no hay día exacto'}
                </button>
              )}
              {!ganada && <span className="self-center"><AyudaCorta tema="sinFecha" /></span>}
            </div>
            {!sinFecha && fecha && (
              <p className="text-[14px] text-hueso/75">
                <span className="first-letter:uppercase inline-block">{enPalabras(fecha)}</span>.{' '}
                {estadoDelDia(fecha, datos.fechas)}
              </p>
            )}
            {avisoCupo}

            <div>
              <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Invitados, niños incluidos
              </p>
              <div className="flex items-center gap-2">
                <button type="button" className="boton h-12 w-12 text-xl"
                  onClick={() => setInvitados(Math.max(0, invitados - 1))} aria-label="Uno menos">−</button>
                <input type="number" min={0} value={invitados || ''} placeholder="0"
                  onChange={(e) => setInvitados(Math.max(0, Number(e.target.value) || 0))}
                  className={`${ENTRADA} h-12 w-28 text-center text-[20px] font-bold`}
                  aria-label="Invitados, niños incluidos" />
                <button type="button" className="boton h-12 w-12 text-xl"
                  onClick={() => setInvitados(invitados + 1)} aria-label="Uno más">+</button>
              </div>
              {/* Qué cuenta y cómo se reparte, en su `?` (2026-11-21, regla *lo que explica va en su ?*). */}
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-hueso/60">
                Adultos y niños <AyudaCorta tema="invitados" />
              </p>
            </div>
            {/* **¿Para cuándo le prometiste la cotización?** (2026-11-23, la
                agenda): mientras no se mande. La elige el vendedor; en blanco,
                *✍ Por redactar* la pone al final, sin plazo. */}
            {(!p || (!p.idReserva && (estadoNormal(estado) === ESTADO_PRESUPUESTO.candidato
              || estadoNormal(estado) === ESTADO_PRESUPUESTO.borrador))) && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  ✍ Prometiste mandarla antes del <AyudaCorta tema="redactarAntes" />
                </p>
                <ElegirFecha valor={redactarAntes} onCambio={setRedactarAntes} hoy={datos.hoy}
                  hasta={!sinFecha && esFecha(fecha) && fecha > datos.hoy ? sumarDias(fecha, -1) : undefined}
                  etiqueta="Mandarla antes del" sinFecha="Sin plazo" />
              </div>
            )}
            </div>
            </Seccion>

            <Seccion tono="neutro" icono="🎉" titulo="El evento">
            <div className="space-y-4 lg:space-y-3">
            <div>
              <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Tipo de evento
              </p>
              <Elegir etiqueta="Tipo de evento" opciones={TIPOS_EVENTO}
                valor={tipoEvento} onElegir={setTipoEvento} />
            </div>

            {/* **¿Viene por un socio comercial?** (2026-11-12, lo pidió el
                cliente): una agencia, un chofer, una municipalidad. El socio
                cobra su comisión y el vendedor la parte que diga su ficha.
                **Dos botones, no uno por socio** (regla del cliente): *No,
                directo* y *Por un socio comercial*, que abre la lista con
                buscador (`BuscarEnLista`). Un desactivado se lista solo si ya
                era el elegido. */}
            {/* **Agregar un socio nuevo ahí mismo** (2026-11-20, lo pidió el
                cliente): el vendedor también puede; su trato queda por
                confirmar hasta que lo confirma el encargado de pagos. */}
            {((datos.socios ?? []).length > 0 || puede(datos.rol as Rol, 'agregarSocios')) && (() => {
              const socios = [...(datos.socios ?? []), ...sociosNuevos.filter((n) => !(datos.socios ?? []).some((x) => x.id === n.id))];
              const elegido = socios.find((x) => x.id === socio);
              return (
                <div>
                  <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                    ¿Viene por un socio comercial?
                  </p>
                  <div role="radiogroup" aria-label="Socio comercial" className="flex flex-wrap gap-2">
                    <button type="button" role="radio" aria-checked={!socio}
                      onClick={() => { setSocio(''); setBuscandoSocio(false); }}
                      className={`boton min-h-[44px] ${!socio ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                      {!socio ? '✓ ' : ''}No, directo
                    </button>
                    <button type="button" role="radio" aria-checked={!!socio} aria-expanded={buscandoSocio}
                      onClick={() => setBuscandoSocio(true)}
                      className={`boton min-h-[44px] ${socio ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                      {socio ? `✓ 🤝 ${elegido?.nombre ?? socio}${elegido && !elegido.activo ? ' (desactivado)' : ''}` : '🤝 Por un socio comercial…'}
                    </button>
                    {socio && !buscandoSocio && (
                      <button type="button" className="boton min-h-[44px]" onClick={() => setBuscandoSocio(true)}>Cambiar</button>
                    )}
                  </div>
                  {buscandoSocio && (
                    <div className="mt-2">
                      <BuscarEnLista etiqueta="Buscar socio comercial" elegido={socio}
                        vacia="No hay socios comerciales activos."
                        opciones={socios.filter((x) => x.activo || x.id === socio)
                          .map((x) => ({ id: x.id, nombre: x.nombre,
                            detalle: !x.activo ? 'desactivado' : x.porConfirmar ? 'trato por confirmar' : '' }))}
                        onElegir={(id) => { setSocio(id); setBuscandoSocio(false); }}
                        onCerrar={() => setBuscandoSocio(false)}
                        pie={puede(datos.rol as Rol, 'agregarSocios') && (
                          <button type="button" className="boton !min-h-[44px] w-full border-dashed !text-[15px]"
                            onClick={() => { setBuscandoSocio(false); setAgregandoSocio(true); }}>+ Agregar socio comercial</button>
                        )} />
                    </div>
                  )}
                  {socio && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-hueso/70">
                      Comisión de {elegido?.nombre ?? 'el socio'} <AyudaCorta tema="comisionSocio" />
                      {elegido?.porConfirmar && <b className="text-ambar-texto">Su trato está por confirmar.</b>}
                    </p>
                  )}
                  {agregandoSocio && (
                    <AgregarVendedor tipo="socio" desdeCotizacion={!puede(datos.rol as Rol, 'pagar')}
                      onCerrar={() => setAgregandoSocio(false)}
                      onCreado={(id, nombre, porConfirmar) => {
                        setSociosNuevos((l) => [...l, { id, nombre, activo: true, porConfirmar }]);
                        setSocio(id); setAgregandoSocio(false);
                      }} />
                  )}
                </div>
              );
            })()}

            {/* **De qué vendedor es** (2026-11-22): solo para la gerencia, pagos
                y el administrador, que reciben la lista. Una cotización que
                todavía no se guarda no tiene dueño que cambiar. */}
            {p && datos.vendedores && cliente && (
              <div>
                <CambiarVendedor de={p.creadoPor} vendedores={datos.vendedores} presupuesto={p.id}
                  nombre={cliente.nombre} cerrada={!!String(p.comisionVendedor ?? '').trim()}
                  onCambiado={onCambio} />
              </div>
            )}

            <Campo etiqueta="Notas internas" ancho="w-full">
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Lo que conviene recordar de esta conversación" className={ENTRADA} />
            </Campo>

            {!p && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={guardando} className="boton min-h-[44px]"
                  onClick={async () => { if (await guardar(ESTADO_PRESUPUESTO.candidato)) onCerrar(); }}>
                  Guardar como candidato
                </button>
              </div>
            )}
            </div>
            </Seccion>
          </div>
        )}

        {/* ---------- 3. Productos ---------- */}
        {paso === 3 && (
          <div className="space-y-4 lg:space-y-2">
            {cotizables.length === 0 ? (
              <p className="rounded border border-ambar/50 bg-ambar/5 p-3 text-[14px]">
                Ningún producto está marcado “se puede cotizar”. Márcalos en <a href="/menus"
                  className="font-semibold text-oro underline">Productos</a>.
              </p>
            ) : (
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-x-2 lg:gap-y-1.5">
                <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:hidden">
                  Agregar <AyudaCorta tema="agregarProducto" />
                </p>
                {/* **Menús en una fila, extras en otra** (2026-11-20, lo pidió el
                    cliente: *"separar los productos de forma muy simple"*). Arriba
                    lo que es gente —los menús—; abajo lo que se suma aparte: el
                    arriendo, el show, el desayuno, las actividades. Sale del tipo
                    de cada producto en Productos. */}
                {[
                  { titulo: 'Menús', lista: cotizables.filter((m) => m.tipo === TIPO_PRODUCTO.menu), otra: false },
                  { titulo: 'Extras y arriendo', lista: cotizables.filter((m) => m.tipo !== TIPO_PRODUCTO.menu && !m.loCobra), otra: true },
                  // **Fuera del local** (2026-11-24, lo pidió el cliente: *"segmentar
                  // esto… y lo mismo para la cotización de un vendedor"*): lo que
                  // cobra otra empresa —el karting, un transfer— en su grupo. Va
                  // aparte del total, y cada botón dice quién lo cobra.
                  { titulo: 'Fuera del local', lista: cotizables.filter((m) => m.tipo !== TIPO_PRODUCTO.menu && !!m.loCobra), otra: false }
                ].filter((g) => g.lista.length > 0 || g.otra).map((g, n, grupos) => (
                  // En el computador, el nombre del grupo va a la izquierda, en
                  // su columna, y los botones a su derecha: dos filas en vez de
                  // seis. El `?` de *Agregar* va con el primer grupo.
                  // **Cada uno en su marco de grupo** (2026-11-22, lo pidió el
                  // cliente: *"para distinguir mejor entre sección menú, sección
                  // extras"*): 3px y el nombre en negrita; los botones de
                  // adentro, con su borde fino de siempre.
                  // **Fuera del local va al lado de los extras** en el computador
                  // (2026-11-24): en su propia fila, el paso 3 pasaba de 612 a 682px
                  // y no cabía; la fila de los extras tenía espacio a la derecha.
                  // En ese grupo el título va arriba y la empresa bajo el nombre:
                  // así ocupa poco ancho y los extras siguen en una fila.
                  <div key={g.titulo} className={`mb-3 last:mb-0 ${marcoGrupo()} p-3 lg:mb-0 lg:items-start
                                                  lg:gap-2 lg:px-3 lg:py-1.5 ${g.titulo === 'Fuera del local' ? 'lg:block'
                                                    : 'lg:flex'} ${g.titulo === 'Fuera del local' ? ''
                                                    : g.titulo === 'Extras y arriendo' && grupos.some((x) => x.titulo === 'Fuera del local') ? ''
                                                    : 'lg:col-span-2'}`}>
                    {/* Los botones de agregar van a 40px en el computador (2026-11-23): con
                        el karting y las actividades de otras empresas, el catálogo crece
                        y las dos filas se doblan; así el paso 3 sigue cabiendo. */}
                    <p className={`mb-2 ${TITULO_GRUPO} ${g.titulo === 'Fuera del local' ? 'lg:mb-1'
                      : 'lg:mb-0 lg:flex lg:min-h-[40px] lg:w-[9.5rem] lg:shrink-0 lg:items-center'}`}>
                      {g.titulo}
                      {n === 0 && <span className="hidden lg:inline"><AyudaCorta tema="agregarProducto" /></span>}
                    </p>
                    <div className="flex flex-wrap gap-2 lg:gap-1.5">
                      {g.lista.map((m) => {
                        // **Ya agregado, el botón se apaga y lo dice** (2026-11-12):
                        // un producto va una sola vez; la cantidad se cambia en su línea.
                        const ya = yaEstaEnLaCotizacion(vistas, m.nombre);
                        return (
                          <button key={m.nombre} type="button" onClick={() => agregar(m)} disabled={ya}
                            title={ya ? 'Ya está en la cotización: cambia la cantidad en su línea' : undefined}
                            className={`boton min-h-[48px] text-[14px] lg:min-h-[40px] lg:px-2 lg:text-[13px] ${m.loCobra ? 'flex-wrap !justify-start !gap-x-0 text-left lg:py-1' : ''} ${ya ? 'border-verde-fuerte/50 text-verde-texto' : ''}`}>
                            {ya ? '✓' : '+'} {m.nombre}
                            <span className={`ml-1 text-hueso/60 ${ya ? 'lg:hidden' : ''}`}>
                              {ya ? '· ya está'
                                : m.moneda === MONEDA.uf ? `${String(m.precioCotizacion).replace('.', ',')} UF`
                                : precioParaCotizar(m) ? enPesos(precioParaCotizar(m)) : ''}
                            </span>
                            {m.loCobra && <span className="basis-full text-left text-[13px] font-semibold leading-tight text-ambar-texto">{m.loCobra}</span>}
                          </button>
                        );
                      })}
                      {g.otra && (
                        <button type="button" className="boton min-h-[48px] text-[14px] lg:hidden"
                          onClick={() => setLineas([...vistas, {
                            presupuesto: p?.id ?? '', concepto: 'Otro', cantidad: 1, precio: 0,
                            personas: 0, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0 }])}>
                          + Otra línea
                        </button>
                      )}
                    </div>
                    {/* En el computador, la nota del show va en la fila de los extras,
                        a la derecha, y no en un renglón suelto debajo (2026-11-23, al
                        compactar el paso 3; regla *lo que cabe en una fila no se apila*). */}
                    {g.otra && notaShow && (
                      <p className="hidden text-[13px] leading-snug text-hueso/70 lg:ml-auto lg:block lg:max-w-[11rem]
                                    lg:shrink-0 lg:self-center">
                        Día privado: el show va solo si lo agregas.
                      </p>
                    )}
                  </div>
                ))}
                {notaShow && (
                  <p className="mt-2 text-[13px] text-hueso/70 lg:hidden">{notaShow}</p>
                )}
              </div>
            )}

            {/* **Lo cotizado, en su marco de grupo** (2026-11-22): las líneas,
                la UF y las cuentas son una sola tarjeta, con las líneas como
                tarjetas de adentro (2px) y el total al pie, bajo una raya. El
                título va en la cabecera de la tabla, donde decía *Producto*. */}
            <div className={`${marcoGrupo()} p-3 lg:px-3 lg:py-2`}>
            <p className={`mb-2 ${TITULO_GRUPO} lg:hidden`}>En la cotización</p>
            {vistas.length === 0 ? (
              <p className="flex flex-wrap items-center gap-3 rounded border border-dashed border-hueso/20 p-4 text-[14px] text-hueso/60">
                Todavía no hay nada cotizado.
                <button type="button" className="boton hidden min-h-[36px] !px-2 text-[13px] lg:inline-flex"
                  onClick={() => setLineas([...vistas, {
                    presupuesto: p?.id ?? '', concepto: 'Otro', cantidad: 1, precio: 0,
                    personas: 0, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0 }])}>
                  + Otra línea
                </button>
              </p>
            ) : (
              // **En el computador, una tabla** (2026-11-21): el nombre de cada
              // columna va una vez arriba y cada línea ocupa una fila —producto,
              // cantidad, precio, descuento, total y *Quitar*—, todas con las
              // mismas columnas (`subgrid`). Cada línea medía 170px; ahora 54.
              // Los nombres de cada campo siguen ahí para un lector de pantalla.
              <ul className="space-y-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] lg:gap-x-4
                             lg:gap-y-1.5 lg:space-y-0">
                <li className="hidden border-2 border-transparent px-3 text-[13px] font-medium uppercase
                                           tracking-wide text-hueso/60 lg:col-span-full lg:grid lg:grid-cols-subgrid
                                           lg:items-center">
                  {/* En el computador, *+ Otra línea* va acá, junto a lo cotizado, y no
                      en la fila de los extras: con más extras esa fila se doblaba. */}
                  <span className={`${TITULO_GRUPO} flex items-center gap-3 normal-case tracking-normal text-hueso`}>
                    En la cotización
                    <button type="button" className="boton min-h-[36px] !px-2 text-[13px] font-normal"
                      onClick={() => setLineas([...vistas, {
                        presupuesto: p?.id ?? '', concepto: 'Otro', cantidad: 1, precio: 0,
                        personas: 0, descuento: 0, ivaIncluido: true, sigue: false, precioUF: 0 }])}>
                      + Otra línea
                    </button>
                  </span>
                  <span>Cantidad</span>
                  <span className="flex items-center">Precio c/u <AyudaCorta tema="precioLinea" /></span>
                  <span className="flex items-center">Descuento <AyudaCorta tema="descuentoLinea" /></span>
                  <span className="text-right">Total</span>
                  <span />
                </li>
                {vistas.map((l, i) => {
                  const prod = productoDe(l.concepto, datos.menus);
                  const esShowIncluido = publico && prod?.tipo === TIPO_PRODUCTO.show;
                  // El show con mínimo (2026-11-20): día privado y poca gente.
                  const showMinimo = prod?.tipo === TIPO_PRODUCTO.show && showConMinimo && reglaShowEfectiva
                    ? reglaShowEfectiva : null;
                  // El arriendo con mínimo (2026-11-23): un día que no está abierto
                  // al público con poca gente, o un exclusivo en un día público.
                  const arriendoMinimo = prod?.tipo === TIPO_PRODUCTO.arriendo && !(l.precioUF > 0)
                    ? minimoArriendo : null;
                  const arriendoFijo = !!arriendoMinimo && arriendoForzado;
                  return (
                    <li key={i} className={`${marcoTarjeta(false, 'normal', false, true)} p-3 lg:col-span-full lg:grid
                                           lg:min-h-[46px] lg:grid-cols-subgrid lg:items-center lg:py-1`}>
                      <div className="flex flex-wrap items-center gap-2 lg:contents">
                        <span className="flex min-w-0 flex-wrap items-center gap-2 lg:col-start-1 lg:row-start-1">
                        {prod ? (
                          <span className="text-[16px] font-semibold">{l.concepto}</span>
                        ) : (
                          <input value={l.concepto} aria-label="Concepto"
                            onChange={(e) => cambiarLinea(i, { concepto: e.target.value })}
                            className={`${ENTRADA} w-56`} />
                        )}
                        {prod && (
                          <span className="rounded-full border border-hueso/25 px-2 py-0.5 text-[13px]
                                           text-hueso/70">{prod.tipo}</span>
                        )}
                        {l.loCobra && (
                          <span className="rounded-full border border-ambar-fuerte/60 px-2 py-0.5 text-[13px]
                                           font-semibold text-ambar-texto">lo cobra {l.loCobra} · aparte</span>
                        )}
                        {/* **Qué incluye, en esta cotización** (2026-11-24): en el
                            computador, al lado del nombre; en el celular, en el renglón
                            de *Quitar* (`botonTexto`, más abajo). */}
                        {botonTexto(l, prod, i, 'hidden lg:inline-flex')}
                        </span>
                        {botonTexto(l, prod, i, 'lg:hidden')}
                        <span className="flex-1 lg:hidden" />
                        {esShowIncluido ? (
                          <span className="rounded-full border border-verde-fuerte/60 px-2 py-0.5
                                           text-[13px] font-semibold text-verde-texto lg:col-start-2 lg:col-end-7
                                           lg:row-start-1 lg:justify-self-end">
                            incluido: día público
                          </span>
                        ) : arriendoFijo ? null : (
                          <button type="button" className="boton hover:border-rojo-fuerte hover:text-rojo-texto
                                                           lg:col-start-6 lg:row-start-1"
                            onClick={() => setLineas(vistas.filter((_, k) => k !== i))}>Quitar</button>
                        )}
                      </div>
                      {!esShowIncluido && (
                        <div className="mt-2 flex flex-wrap items-end gap-3 lg:contents">
                          {/* **Un monto fijo no tiene cantidad** (2026-11-11): el
                              arriendo o el show van o no van. Lo por persona —menús,
                              la once, el desayuno— se ajusta con − y +. */}
                          {(!prod || prod.cobro !== COBRO.fijo) && (
                          <Campo etiqueta="Cantidad" ancho="w-auto lg:col-start-2 lg:row-start-1" rotuloClase="lg:sr-only">
                            {/* − y + grandes, y el número se puede escribir. En un
                                menú, lo que sube se le resta al primero
                                (`cambiarCantidad()`). */}
                            <div className="flex items-center gap-2">
                              <button type="button" className="boton h-11 w-11 text-xl" aria-label="Uno menos"
                                onClick={() => setLineas(cambiarCantidad(vistas, i, l.cantidad - 1, datos.menus, invitados))}>−</button>
                              <input type="number" min={0} value={l.cantidad}
                                onChange={(e) => setLineas(cambiarCantidad(vistas, i,
                                  Number(e.target.value) || 0, datos.menus, invitados))}
                                className={`${ENTRADA} h-11 !w-20 text-center text-[17px] font-bold`} />
                              <button type="button" className="boton h-11 w-11 text-xl" aria-label="Uno más"
                                onClick={() => setLineas(cambiarCantidad(vistas, i, l.cantidad + 1, datos.menus, invitados))}>+</button>
                            </div>
                          </Campo>
                          )}
                          {l.precioUF > 0 ? (
                            <Campo etiqueta={`Precio en UF${l.ivaIncluido ? ' (con IVA)' : ' (+ IVA)'}`}
                              ancho="w-auto lg:col-start-3 lg:row-start-1" ayuda="precioLinea" rotuloClase="lg:sr-only">
                              <input type="text" inputMode="decimal" defaultValue={String(l.precioUF).replace('.', ',')}
                                onBlur={(e) => cambiarLinea(i, { precioUF: aPrecio(e.target.value) || l.precioUF })}
                                className={`${ENTRADA} !w-28`} />
                              <p className="mt-1 text-[13px] text-hueso/70">
                                {uf ? <>= {enPesos(l.precio)} con la UF del {fechaUF}</>
                                  : <span className="font-semibold text-ambar-texto">Sin UF todavía</span>}
                              </p>
                            </Campo>
                          ) : (
                          <Campo etiqueta={`Precio${l.ivaIncluido ? ' (con IVA)' : ' (+ IVA)'}`}
                            ancho="w-48 lg:col-start-3 lg:row-start-1 lg:w-32" ayuda="precioLinea" rotuloClase="lg:sr-only">
                            {showMinimo && reglaShow ? (
                              // Con mínimo, el precio se aplica al salir del campo: así
                              // se puede escribir un número entero sin que el mínimo
                              // lo corrija a cada tecla.
                              <input key={`show-${l.precio}`} type="number" step={500}
                                min={minimoShowEnLinea(showMinimo, l.ivaIncluido)}
                                defaultValue={l.precio || ''} placeholder="0"
                                onBlur={(e) => {
                                  // Lo mismo que hará `prepararLineas()`, escrito de una vez
                                  // en el campo: si queda bajo el mínimo, sube al mínimo.
                                  const v = Number(e.target.value) || 0;
                                  const minimo = minimoShowEnLinea(showMinimo, l.ivaIncluido);
                                  const final = v * (1 - (l.descuento || 0) / 100) < minimo ? minimo : v;
                                  e.target.value = String(final);
                                  cambiarLinea(i, { precio: final, ...(final !== v ? { descuento: 0 } : {}) });
                                }}
                                className={ENTRADA} />
                            ) : arriendoFijo && arriendoMinimo ? (
                              // Igual que el show: se aplica al salir del campo, y lo
                              // que queda bajo el mínimo sube al mínimo.
                              <input key={`arriendo-${l.precio}`} type="number" step={500}
                                min={enFormaDeLinea(arriendoMinimo.minimo, l.ivaIncluido)}
                                defaultValue={l.precio || ''} placeholder="0"
                                onBlur={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  const minimo = enFormaDeLinea(arriendoMinimo.minimo, l.ivaIncluido);
                                  const final = v * (1 - (l.descuento || 0) / 100) < minimo ? minimo : v;
                                  e.target.value = String(final);
                                  cambiarLinea(i, { precio: final, ...(final !== v ? { descuento: 0 } : {}) });
                                }}
                                className={ENTRADA} />
                            ) : (
                            <input type="number" min={0} step={500} value={l.precio || ''} placeholder="0"
                              onChange={(e) => cambiarLinea(i, { precio: Number(e.target.value) || 0 })}
                              className={ENTRADA} />
                            )}
                          </Campo>
                          )}
                          <div className="lg:col-start-4 lg:row-start-1">
                            <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:hidden">
                              Descuento <AyudaCorta tema="descuentoLinea" />
                            </p>
                            <div className="flex gap-1.5">
                              {botonesDescuento.map((d) => (
                                <button key={d} type="button" onClick={() => cambiarLinea(i, { descuento: d })}
                                  className={`boton boton-angosto min-h-[40px] ${l.descuento === d
                                    ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                                  {d ? `${d}%` : 'Sin'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <span className="ml-auto text-[16px] font-bold tabular-nums lg:col-start-5 lg:row-start-1
                                           lg:ml-0 lg:text-right">
                            {enPesos(totalDeLinea(l))}
                            <span className="ml-1 text-[13px] font-normal text-hueso/60">
                              {l.ivaIncluido ? 'con IVA' : '+ IVA'}
                            </span>
                          </span>
                        </div>
                      )}
                      {/* **El mínimo del show en un día privado** (2026-11-20):
                          dice por qué el precio no baja, y que quitarlo es la
                          salida. A la gerencia y al administrador, que pueden
                          pasar por encima, se les dice el mínimo sin forzarlo. */}
                      {showMinimo && (
                        <p className={`mt-2 rounded border px-3 py-2 text-[14px] font-semibold lg:col-span-full lg:row-start-2
                                       lg:mb-0.5 lg:mt-0.5 lg:py-0.5 ${reglaShow
                          ? 'border-ambar/50 bg-ambar/5 text-ambar-texto' : 'border-hueso/20 text-hueso/75'}`}>
                          🐎 Día privado con menos de {showMinimo.desde} personas: el show se cobra, mínimo{' '}
                          {enPesos(showMinimo.minimo)} + IVA{typeof minAprobados.show === 'number' ? ' (aprobado)' : ''}.{' '}
                          {reglaShow ? 'Si no va, quítalo.'
                            : showAutorizado && !pasaPorEncima ? `Lo autorizó ${showAutorizado}: va bajo el mínimo.`
                            : 'Tú puedes cobrar menos o dejarlo sin costo.'}
                          {/* En el celular, el pedido va acá; en el computador, al pie. */}
                          {reglaShow && puedePedirCond && <span className="mt-2 block font-normal lg:hidden">{botonPedirCond}</span>}
                        </p>
                      )}
                      {/* **El arriendo mínimo** (2026-11-23): la misma pieza que el
                          show. Dice por qué el precio no baja y que la línea no se
                          quita; a quien puede pasar por encima, el mínimo sin forzarlo. */}
                      {arriendoMinimo && (
                        <p data-arriendo-minimo
                          className={`mt-2 rounded border px-3 py-2 text-[14px] font-semibold lg:col-span-full lg:row-start-2
                                       lg:mb-0.5 lg:mt-0.5 lg:py-0.5 ${arriendoFijo
                          ? 'border-ambar/50 bg-ambar/5 text-ambar-texto' : 'border-hueso/20 text-hueso/75'}`}>
                          🏠 {arriendoMinimo.caso === 'exclusivo' ? 'Exclusivo en un día público' : 'Día no abierto al público'},{' '}
                          {personasParaMinimos(vistas, invitados)} personas: arriendo mínimo {enPesos(arriendoMinimo.minimo)} + IVA{typeof minAprobados.arriendo === 'number' ? ' (aprobado)' : ''}.{' '}
                          {arriendoFijo ? 'Va siempre, y no baja de ahí.'
                            : arriendoAutorizado && !pasaPorEncima ? `Lo autorizó ${arriendoAutorizado}: va bajo el mínimo.`
                            : 'Tú puedes cobrar menos o sacarlo.'}
                          {arriendoFijo && puedePedirCond && <span className="mt-2 block font-normal lg:hidden">{botonPedirCond}</span>}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* **La UF de la cotización** (2026-11-10): fija, para que la cifra
                que recibió el cliente no se mueva sola. Se cambia a mano. */}
            {hayUF && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-hueso/15 bg-panel
                              px-3 py-2 text-[14px]">
                {uf ? <span>UF del {fechaUF}: <strong>{enPesos(uf)}</strong></span>
                  : <span className="font-semibold text-ambar-texto">
                      No se pudo leer la UF: las líneas en UF quedan en $0.</span>}
                {fechaUF !== datos.hoy && (
                  <button type="button" className="boton" onClick={() => void traerUF()}>
                    Usar la UF de hoy
                  </button>
                )}
                <AyudaCorta tema="ufCotizacion" />
              </div>
            )}

            {/* **Los menús tienen que sumar los invitados** (2026-11-10). Cada
                menú nuevo toma solo los que faltan; si igual no calzan, se
                dice en ámbar, sin bloquear: puede que cambien los invitados. */}
            {/* En el computador este aviso va en el pie, junto a *volver*. */}
            {avisoMenus && <div className="lg:hidden">{avisoMenus}</div>}

            {/* Las cuentas, como en una cotización: neto, descuento, IVA y total.
                Al pie del grupo de lo cotizado, bajo una raya, como el total
                de una cuenta. */}
            <div className="mt-3 border-t-2 border-hueso/20 pt-3 lg:mt-2 lg:flex lg:flex-wrap lg:items-center lg:gap-x-5
                            lg:gap-y-1 lg:pt-2">
              {/* En el computador, las cuentas van en una fila: el
                  descuento sobre el total, y neto, IVA y total. */}
              <div className="mb-2 flex flex-wrap items-center gap-2 lg:mb-0">
                <span className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  Descuento sobre el total
                </span>
                <AyudaCorta tema="descuentoTotal" />
                {botonesDescuento.map((d) => (
                  <button key={d} type="button" onClick={() => setDescuento(d)}
                    className={`boton boton-angosto min-h-[40px] ${descuento === d
                      ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                    {d ? `${d}%` : 'Sin'}
                  </button>
                ))}
                {/* **La promoción** (2026-11-24): al lado del descuento, que es
                    lo que más cambia. Aplicada, una pastilla con su nombre,
                    lo que da y *Quitar*. */}
                {p && promoAplicada ? (
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border-2 border-oro/60
                                   bg-oro/10 py-0.5 pl-2.5 pr-1 text-[13px]">
                    <b className="text-[14px]">🎁 {promoAplicada.nombre}</b>
                    {rigePromocion(promoAplicada, invitados)
                      ? <span>−{beneficio.descuento}%{beneficio.sinArriendo ? ' · sin arriendo' : ''}</span>
                      : <span className="font-semibold text-ambar-texto">pide desde {Math.max(1, promoAplicada.minimo)}: no rige</span>}
                    <AyudaCorta tema="promoEnCotizacion" />
                    {rigePromocion(promoAplicada, invitados) && descuento !== beneficio.descuento && !descuentoEnLineas && (
                      <button type="button" className="boton boton-angosto min-h-[36px]"
                        onClick={() => setDescuento(beneficio.descuento)}>
                        Usar −{beneficio.descuento}%
                      </button>
                    )}
                    <button type="button" className="boton boton-angosto min-h-[36px]" onClick={quitarPromocion}>
                      Quitar
                    </button>
                  </span>
                ) : p && (datos.promociones ?? []).some((x) => x.activa) ? (
                  <button type="button" className="boton min-h-[40px] !border-2 !border-oro/60" aria-label="Aplicar promoción"
                    onClick={() => setAplicandoPromo(true)}>
                    {/* En el computador, corto: con el largo, el neto y el total bajaban de fila. */}
                    🎁 <span className="lg:hidden">Aplicar promoción…</span><span className="hidden lg:inline">Promoción…</span>
                  </button>
                ) : null}
              </div>
              <dl className="ml-auto max-w-xs space-y-1 text-[15px] tabular-nums lg:flex lg:max-w-none lg:items-baseline
                             lg:gap-x-5 lg:space-y-0">
                <div className="flex justify-between lg:gap-2"><dt>Neto</dt><dd>{enPesos(cuentas.subtotal)}</dd></div>
                {cuentas.descuento > 0 && (
                  <div className="flex justify-between text-rojo-texto lg:gap-2">
                    <dt>Descuento {descuento}%</dt><dd>−{enPesos(cuentas.descuento)}</dd>
                  </div>
                )}
                <div className="flex justify-between lg:gap-2">
                  <dt>IVA {Math.round(IVA * 100)}%</dt><dd>{enPesos(cuentas.iva)}</dd>
                </div>
                <div className="flex justify-between border-t border-hueso/20 pt-1 text-[20px] font-bold lg:gap-2
                                lg:border-0 lg:pt-0">
                  <dt>Total</dt><dd className="text-oro">{enPesos(cuentas.total)}</dd>
                </div>
              </dl>
              {otras.length > 0 && (
                <div className="w-full space-y-1 text-[14px] text-hueso/80 lg:basis-full">
                  {otras.map((o) => {
                    const hecha = coordinadasDe(coordinadas).get(normalizar(o.empresa));
                    // **Escribirle para coordinar** (2026-11-24): con el teléfono
                    // de *Productos → 🤝 Otras empresas* y un mensaje con el día,
                    // la gente y lo que se pidió.
                    const ficha = empresaDe(datos.otrasEmpresas ?? [], o.empresa);
                    const wa = ficha?.telefono ? enlaceWhatsApp(ficha.telefono, mensajeParaCoordinar({
                      empresa: ficha, negocio: datos.empresa || 'Brasas de Lo Pirque',
                      dia: esFecha(fechaReal) ? enPalabras(fechaReal) : '', invitados,
                      conceptos: vistas.filter((l) => normalizar(l.loCobra ?? '') === normalizar(o.empresa))
                        .map((l) => ({ concepto: l.concepto, cantidad: l.cantidad }))
                    })) : '';
                    return (
                      <p key={o.empresa} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        <span>Aparte, lo cobra <strong>{o.empresa}</strong> ({o.conceptos.join(', ')}): {enPesos(o.total)}</span>
                        {p && wa && (
                          <button type="button" className="boton min-h-[36px] border-verde-fuerte/60 font-semibold text-verde-texto"
                            onClick={() => abrirWhatsApp(wa)}>💬 Escribirle</button>
                        )}
                        {p && (hecha ? (
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-verde-texto">✓ coordinado · {hecha.quien}</span>
                            <button type="button" className="boton min-h-[36px] !px-2 text-[13px]"
                              onClick={() => coordinar(o.empresa, false)}>Deshacer</button>
                          </span>
                        ) : (
                          <button type="button" className="boton min-h-[36px] border-ambar-fuerte/60 font-semibold text-ambar-texto"
                            onClick={() => coordinar(o.empresa, true)}>🤝 Ya lo coordiné</button>
                        ))}
                      </p>
                    );
                  })}
                  <p className="text-right">El día completo, con lo de otras empresas: <strong>
                    {enPesos(cuentas.total + otras.reduce((n, o) => n + o.total, 0))}</strong></p>
                </div>
              )}
            </div>
            </div>

            {/* **¿El día es exclusivo?** (2026-11-12, lo pidió el cliente):
                con arriendo se pregunta, sin obligar —con buena negociación
                puede venir otro grupo—. Exclusivo llega así al calendario al
                ganarla. */}
            {p && (conArriendo || esExcl) && (
              <div className={`${marcoGrupo('morado')} p-4 lg:flex lg:flex-wrap
                              lg:items-center lg:gap-x-4 lg:gap-y-1 lg:px-3 lg:py-1.5 lg:[&>*]:mt-0`}>
                <p className="flex items-center gap-2 text-[17px] font-bold text-morado-texto">
                  🟣 ¿El día es exclusivo? <AyudaCorta tema="exclusivo" />
                </p>
                {ganada ? (
                  <p className="mt-2 text-[15px] font-semibold">
                    {esExcl ? '✓ Sí, exclusivo' : exclusivo === 'no' ? 'No: puede venir otro grupo' : 'Sin contestar'}
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {([['sí', 'Sí, exclusivo'], ['no', 'No, puede venir otro grupo']] as const).map(([v, texto]) => {
                      const marcado = v === 'sí' ? esExcl : exclusivo === 'no';
                      return (
                        <button key={v} type="button" aria-pressed={marcado}
                          disabled={!puedeEditar || (v === 'sí' && sinExclusivo && !esExcl)}
                          onClick={() => setExclusivo(marcado ? '' : v)}
                          className={`tecla min-h-[48px] rounded-xl border-2 px-4 text-[16px] font-bold
                                      disabled:cursor-not-allowed lg:min-h-[44px] lg:text-[15px] ${marcado
                            ? 'border-morado-fuerte bg-morado-fuerte text-tinta'
                            : 'border-hueso/30 text-hueso/85 hover:border-morado-fuerte/70'}`}>
                          {marcado ? '✓ ' : ''}{texto}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!exclusivo && !ganada && !sinExclusivo && (
                  <p className="mt-2 text-[14px] text-ambar-texto">Sin contestar cuenta como no exclusivo.</p>
                )}
                {/* **Los días sin arriendo exclusivo** (2026-11-23): Día de la Madre,
                    del Padre, Fiestas Patrias. El servidor tampoco lo acepta. */}
                {sinExclusivo && !ganada && (
                  <p className="mt-2 text-[14px] font-semibold text-rojo-texto">
                    🚫 Ese día no se arrienda en exclusiva: lo decide la gerencia, el encargado de pagos o el administrador.
                  </p>
                )}
                {esExcl && !ganada && !choqueExclusivo && esFecha(fechaReal) && tomadasDia !== null && (
                  <p className="mt-2 text-[14px] text-verde-texto">✓ Ese día no tiene otras reservas.</p>
                )}
                {choqueExclusivo && <div className="mt-3">{alarmaExclusivo}</div>}
              </div>
            )}

            <div className={`flex flex-wrap justify-end gap-2 ${autoActivo ? 'lg:hidden' : ''}`}>
              {p && puedeEditar && (autoActivo
                ? <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
                : <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => pedirGuardar()} />)}
            </div>

            {/* **¿Otra versión?** (2026-11-11, lo pidió el cliente: que crear
                una alternativa esté más presente). Al final de los productos,
                que es donde se decide si conviene ofrecer otra. */}
            {p && puedeEditar && !grupoGanado && !cancelada && (
              // En el computador no va: *+ Crear alternativa* está arriba, a la
              // vista, en la misma pantalla.
              <div className="rounded-xl border-2 border-dashed border-oro/50 bg-oro/[0.05] p-4 lg:hidden">
                <p className="flex items-center gap-2 text-[17px] font-bold">
                  ¿Le ofreces otra versión? <AyudaCorta tema="alternativas" />
                </p>
                <button type="button" disabled={guardando} onClick={() => void duplicar(3)}
                  className="boton mt-3 min-h-[52px] w-full !border-oro text-[16px] font-bold sm:w-auto">
                  + Crear alternativa {siguienteLetra}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- 4. Enviar ---------- */}
        {paso === 4 && (
          <div className="space-y-4 lg:space-y-2">
            {/* En el computador este resumen va arriba, al lado del N°; acá
                queda solo el aviso de las alternativas que van en el link. */}
            <div className={`rounded border border-hueso/15 bg-panel p-3 text-[15px] lg:border-0 lg:bg-transparent lg:p-0
                             lg:[&>p:not(.del-link)]:hidden ${enElLink.length > 1 && !ganada ? '' : 'lg:hidden'}`}>
              <p className="font-semibold">{cliente?.nombre ?? 'Sin cliente'}</p>
              <p className="text-hueso/75">
                {fechaReal ? <span className="first-letter:uppercase inline-block">{enPalabras(fechaReal)}</span>
                  : periodo || 'Sin fecha'}
                {invitados > 0 && <> · {invitados} invitados</>}
                {tipoEvento && <> · {tipoEvento}</>}{socio && <> · 🤝 {(datos.socios ?? []).find((x) => x.id === socio)?.nombre ?? socio}</>}
              </p>
              <p className="mt-1 text-[20px] font-bold text-oro">{enPesos(cuentas.total)}</p>
              {enElLink.length > 1 && !ganada && (
                <p className="del-link mt-2 rounded-lg border border-oro/40 bg-oro/[0.06] px-3 py-2 text-[15px] lg:mt-0 lg:py-1">
                  <strong>En el link van {enElLink.length} alternativas:</strong> {resumenLink}.
                </p>
              )}
            </div>

            {/* **El camino y el próximo hito** (2026-11-11, lo pidió el
                cliente: *"marcar ganada debe ser un botón realmente más
                grande… aquí cumplimos un hito"*). Arriba se ve por dónde va;
                debajo, un solo bloque grande con lo que toca ahora. */}
            {p && !cancelada && <Camino pasos={camino} />}

            {cancelada && p && (
              <BloqueCancelada p={p} cobros={cobros} puedePagar={puedePagar}
                onCobros={(c) => { setCobros(c); onCambio(); }} />
            )}



            {/* **Tres columnas en el computador** (2026-11-21): el documento con
                el próximo paso debajo, el pago, y el seguimiento. Apiladas
                medían 1.770px; así entran en la pantalla. */}
            <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-2 lg:space-y-0">
            <div className="space-y-4 lg:space-y-2">
            <fieldset disabled={cancelada} className="min-w-0 space-y-4">
            {/* ---------- Documento ---------- */}
            <Seccion tono="neutro" icono="🧾" titulo="Documento" ayudaPc="documento">
            {/* **El documento de la venta** (2026-11-10). Nace por definir;
                apretar el elegido lo vuelve a dejar por definir. Por ahora
                no cambia el precio. Con factura pide los datos de
                facturación, que se guardan en la ficha del cliente. */}
            <div>
              <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:hidden">
                Documento de la venta <AyudaCorta tema="documento" />
              </p>
              <Elegir etiqueta="Documento de la venta" opciones={Object.values(DOCUMENTO)}
                valor={documento} onElegir={(v) => setDocumento(documentoDe(v))} />
              {!documento && <p className="mt-1.5 text-[14px] text-hueso/70">Por definir.</p>}
              {/* **Sin documento** (2026-11-23, lo decidió el cliente: *"haz un
                  aviso pero no pides aprobación en ese momento"*). Se puede; se
                  dice y queda en la bitácora. */}
              {documento === DOCUMENTO.sin && (
                <p className="mt-1.5 text-[14px] font-semibold text-ambar-texto">
                  ⚠ Sin boleta ni factura: queda anotado en la bitácora. <AyudaCorta tema="sinDocumento" />
                </p>
              )}
              {/* En el computador, los datos de la factura en dos renglones y
                  su botón; se escriben en una ventanita (`facturaAbierta`). */}
              {documento === DOCUMENTO.factura && (
                <div className="mt-2 hidden rounded border border-hueso/15 bg-panel px-3 py-2 text-[14px] lg:block">
                  {facturacion.empresa.trim() || facturacion.rut.trim() ? (
                    <p><strong>{facturacion.empresa || 'Sin razón social'}</strong>
                      {facturacion.rut.trim() && <> · RUT {facturacion.rut}</>}</p>
                  ) : null}
                  {(facturacion.giro.trim() || facturacion.domicilio.trim()) && (
                    <p className="text-hueso/75">{[facturacion.giro, facturacion.domicilio].filter((x) => x.trim()).join(' · ')}</p>
                  )}
                  {(faltaFactura.length > 0 || rutMalo) && (
                    <p className="font-semibold text-ambar-texto">
                      {faltaFactura.length > 0 ? <>Para facturarle falta: {faltaFactura.join(', ')}.</> : null}
                      {rutMalo ? ' El RUT no calza: revísalo.' : null}
                    </p>
                  )}
                  <button type="button" className="boton mt-1.5" onClick={() => setFacturaAbierta(true)}>
                    ✎ {faltaFactura.length > 0 ? 'Completar' : 'Cambiar'} los datos de facturación
                  </button>
                </div>
              )}
              {documento === DOCUMENTO.factura && (
                <div className="mt-3 rounded border border-hueso/15 bg-panel p-3 lg:hidden">
                  <p className="mb-2 text-[14px] text-hueso/75">
                    Datos de facturación. Se guardan en la ficha del cliente.
                  </p>
                  {camposFactura}
                  {faltaFactura.length > 0 && (
                    <p className="mt-3 rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                                  font-semibold text-ambar-texto">
                      Para facturarle falta: {faltaFactura.join(', ')}.
                    </p>
                  )}
                </div>
              )}
              {facturaAbierta && (
                <Dialogo titulo="Datos de facturación" onCerrar={() => setFacturaAbierta(false)} ancho="max-w-xl">
                  {/* En su marco de grupo (2026-11-22), con el nombre del cliente:
                      se sabe de quién es la ficha que se está llenando. */}
                  <div className={`mt-2 ${marcoGrupo()} p-3`}>
                  <p className={`flex items-center gap-2 ${TITULO_GRUPO}`}>
                    <span aria-hidden>🧾</span>{cliente?.nombre ?? 'El cliente'}
                    <span className="text-[14px] font-normal text-hueso/70">· se guarda en su ficha</span>
                  </p>
                  <div className="mt-3">{camposFactura}</div>
                  {faltaFactura.length > 0 && (
                    <p className="mt-3 rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                                  font-semibold text-ambar-texto">
                      Para facturarle falta: {faltaFactura.join(', ')}.
                    </p>
                  )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button type="button" className="boton boton-relleno min-h-[44px] px-5"
                      onClick={() => setFacturaAbierta(false)}>✓ Listo</button>
                  </div>
                </Dialogo>
              )}
            </div>


            </Seccion>
            </fieldset>
            {/* El próximo paso, en el computador: bajo el documento, siempre a la vista. */}
            {p && !cancelada && hitoEnvio && <div className="hidden lg:block">{hitoEnvio}</div>}
            </div>

            {/* ---------- El pago: condiciones y cobros ---------- */}
            <Seccion tono="verde" icono="💰" titulo="El pago">
            <fieldset disabled={cancelada} className="min-w-0">
            {/* **Las condiciones de pago** (2026-11-10). En blanco rige
                Configuración; cada cotización las puede negociar. Las
                calcula `condicionesDe()`, la misma que usa el documento. */}
            <div>
              <p className="mb-2 flex items-center text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:mb-1">
                Condiciones <AyudaCorta tema="condicionesPago" />
                <button type="button" aria-expanded={condAbiertas} onClick={() => setCondAbiertas(!condAbiertas)}
                  className="boton ml-auto hidden normal-case tracking-normal lg:inline-flex">
                  {condAbiertas ? '✓ Listo' : '✎ Cambiar'}
                </button>
              </p>
              <div className={`flex flex-wrap items-end gap-3 lg:gap-2 ${condAbiertas ? '' : 'lg:hidden'}`}>
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">Anticipo %</span>
                  <input type="number" min={0} max={100} value={anticipoTxt} className={`${ENTRADA} w-24 lg:w-20`}
                    placeholder={String(datos.condiciones?.anticipoPct ?? 30)} disabled={cond.fijo}
                    onChange={(e) => setAnticipoTxt(e.target.value)}
                    onBlur={(e) => toparCampo('anticipo', e.target.value, setAnticipoTxt)} />
                </label>
                {/* **O un monto acordado** (2026-11-12, lo pidió el cliente:
                    *"págame 500 más"*). Si se escribe, manda sobre el %. */}
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">o un monto acordado</span>
                  <span className="flex items-center gap-1">
                    <span className="text-[15px] text-hueso/70">$</span>
                    <input inputMode="numeric" value={anticipoMontoTxt ? Number(anticipoMontoTxt).toLocaleString('es-CL') : ''}
                      className={`${ENTRADA} w-36 lg:w-32`} placeholder="ej. 500.000"
                      onChange={(e) => setAnticipoMontoTxt(e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={toparMonto} />
                    {cond.fijo && (
                      <button type="button" className="boton min-h-[44px]" onClick={() => setAnticipoMontoTxt('')}>
                        Volver al %
                      </button>
                    )}
                  </span>
                </label>
                <button type="button" aria-pressed={cond.pct === 0}
                  disabled={!pasaPorEncima && topes.anticipo > 0 && cond.pct !== 0}
                  title={!pasaPorEncima && topes.anticipo > 0 ? 'Sin anticipo se pide como condición especial' : undefined}
                  onClick={() => { setAnticipoMontoTxt(''); setAnticipoTxt(cond.pct === 0 ? '' : '0'); }}
                  className={`boton min-h-[44px] ${cond.pct === 0 ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
                  Sin anticipo
                </button>
                <label className="block">
                  <span className="mb-1 block text-[13px] text-hueso/70">Saldo, días antes</span>
                  <input type="number" min={0} max={365} value={saldoTxt} className={`${ENTRADA} w-24 lg:w-20`}
                    placeholder={String(datos.condiciones?.saldoDias ?? 3)}
                    onChange={(e) => setSaldoTxt(e.target.value)}
                    onBlur={(e) => toparCampo('saldoDias', e.target.value, setSaldoTxt)} />
                </label>
              </div>
              <p className="mt-2 text-[15px] lg:mt-1 lg:text-[14px]">
                {cond.pct > 0
                  ? <>Anticipo {cond.fijo ? 'acordado' : `${cond.pct}%`}: <strong>{enPesos(cond.anticipo)}</strong> para reservar la fecha · Saldo <strong>{enPesos(cond.saldo)}</strong></>
                  : <>Sin anticipo · Todo <strong>{enPesos(cond.saldo)}</strong></>}
                {plazos.saldoAlFirmar
                  ? <> <b className="text-ambar-texto">al firmar</b>: el evento es antes del plazo de {cond.dias} días.</>
                  : cond.saldoHasta
                  ? <> hasta el {enPalabras(cond.saldoHasta)}.</>
                  : <>, {cond.dias} días antes del evento.</>}
              </p>
              {lineaCondiciones(false)}
            </div>

            </fieldset>
            {/* **Los cobros al cliente**: se anotan los pagos, no una
                casilla. Lo normal es un toque —anticipo recibido, o todo—;
                otro monto abre un campo. Un cobro anotado por error se
                deshace. */}
            <div className="border-t border-verde/25 pt-3 lg:pt-2">
              <p className="text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                Pagos del cliente <AyudaCorta tema="pagosCliente" />
              </p>
              {!p ? (
                <p className="mt-1 text-[14px] text-hueso/70">Guarda la cotización para anotar sus pagos.</p>
              ) : (
                <>
                  <p className="mt-1 text-[15px]">
                    Pagado <strong>{enPesos(cobrado.pagado)}</strong>
                    {cobrado.falta > 0 && <> · Falta <strong>{enPesos(cobrado.falta)}</strong></>}
                    {cobrado.completo && <span className="ml-2 rounded-full border border-verde/50 px-2 py-0.5
                      text-[13px] font-semibold text-verde-texto">✓ Pagado completo</span>}
                  </p>
                  {!otraGanada && cobrosOtras.length > 0 && (
                    <div className="mt-2 rounded-lg border border-cielo-fuerte/50 bg-cielo/10 px-3 py-2 text-[14px]">
                      <p className="font-semibold">Anotado en otra alternativa, cuenta para esta:</p>
                      <ul className="mt-1">
                        {cobrosOtras.map((c) => {
                          const a = alternativas.find((x) => x.id === c.presupuesto);
                          return (
                            <li key={c.id}>
                              {c.concepto} <strong>{enPesos(c.monto)}</strong> · {c.fecha}
                              {a ? ` · en la ${letraDe(a, alternativas)}` : ''}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-1 text-[13px] text-hueso/75">Al marcar ganada esta alternativa, esos pagos pasan a ella.</p>
                    </div>
                  )}
                  {cobros.length > 0 && (
                    <ul className="mt-2 divide-y divide-hueso/10 border-y border-hueso/10">
                      {cobros.map((c) => (
                        <li key={c.id} className="py-2.5 text-[14px]">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold">{c.concepto}</span>
                            <span className={c.monto < 0 ? 'text-rojo-texto' : ''}>
                              {c.monto < 0 ? `−${enPesos(-c.monto)}` : enPesos(c.monto)}
                            </span>
                            <span className="text-hueso/70">{c.fecha}{c.medio && ` · ${c.medio}`}
                              {c.registradoPor && ` · ${c.registradoPor}`}</span>
                            {/* **La revisión**, por forma además de color:
                                verde relleno revisado, ámbar con borde sin revisar.
                                **Solo la ve quien paga** (2026-11-13, lo pidió el
                                cliente): revisar es suyo; los demás anotan el
                                cobro y suben el comprobante. */}
                            {!puedePagar ? null : c.revisadoPor ? (
                              <span className="rounded-full border border-verde-fuerte bg-verde/15 px-2 py-0.5
                                               text-[13px] font-semibold text-verde-texto">
                                ✓ Revisado por {c.revisadoPor}
                              </span>
                            ) : (
                              <span className="rounded-full border border-ambar/60 px-2 py-0.5 text-[13px]
                                               font-semibold text-ambar-texto">sin revisar</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {/* El comprobante: se ve a través del panel, nunca por un link público. */}
                            {c.comprobante ? (
                              <a href={`/api/presupuestos/cobros/comprobante?id=${encodeURIComponent(c.id)}`}
                                target="_blank" rel="noopener" className="boton tecla">📎 Ver comprobante</a>
                            ) : null}
                            {puedeEditar && (
                              <label className={`boton tecla cursor-pointer ${subiendo === c.id ? 'opacity-60' : ''}`}>
                                {subiendo === c.id ? 'Subiendo…'
                                  : c.comprobante ? 'Cambiar comprobante' : '📎 Subir comprobante'}
                                <input type="file" accept="image/*,application/pdf" className="sr-only"
                                  disabled={subiendo !== ''}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) void subirComprobante(c, f);
                                  }} />
                              </label>
                            )}
                            {puedePagar && (
                              <button type="button" disabled={revisando !== ''}
                                onClick={() => void revisar(c, !c.revisadoPor)}
                                className={`boton ${c.revisadoPor ? '' : '!border-verde-fuerte text-verde-texto hover:bg-verde/10'}`}>
                                {revisando === c.id ? 'Guardando…'
                                  : c.revisadoPor ? 'Quitar revisión' : '✓ Marcar revisado'}
                              </button>
                            )}
                            {/* Una devolución la deshace solo quien paga: la anotó él. */}
                            {puedeEditar && (!c.revisadoPor || puedePagar)
                              && (c.concepto !== CONCEPTO_COBRO.devolucion || puedePagar) && (
                              <button type="button" onClick={() => void deshacerCobro(c)}
                                className="boton hover:border-rojo-fuerte hover:text-rojo-texto">Deshacer</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {errorPagos && (
                    <p role="alert" className="mt-2 rounded border border-rojo-fuerte/60 bg-rojo/10 px-3 py-2
                                               text-[14px] font-semibold text-rojo-texto">{errorPagos}</p>
                  )}
                  {puedeEditar && !cancelada && cobrado.falta > 0 && (
                    <div className="mt-3 space-y-2 lg:mt-2">
                      <input value={medio} onChange={(e) => setMedio(e.target.value)}
                        placeholder="Cómo pagó: transferencia, efectivo… (opcional)"
                        className={`${ENTRADA} sm:w-96 lg:w-full`} />
                      <div className="flex flex-wrap gap-2">
                        {cobrado.faltaAnticipo > 0 && (
                          <button type="button" disabled={guardando}
                            onClick={() => void cobrar(cobrado.faltaAnticipo, 'Anticipo')}
                            className="boton min-h-[44px] !border-verde-fuerte text-verde-texto hover:bg-verde/10">
                            ✓ Anticipo recibido · {enPesos(cobrado.faltaAnticipo)}
                          </button>
                        )}
                        <button type="button" disabled={guardando}
                          onClick={async () => {
                            // Pagar todo de una son dos cobros: el anticipo y el saldo.
                            if (cobrado.faltaAnticipo > 0) await cobrar(cobrado.faltaAnticipo, 'Anticipo');
                            const resto = cobrado.falta - cobrado.faltaAnticipo;
                            if (resto > 0) await cobrar(resto, 'Saldo');
                          }}
                          className="boton min-h-[44px] !border-verde-fuerte text-verde-texto hover:bg-verde/10">
                          ✓ Pagó todo · {enPesos(cobrado.falta)}
                        </button>
                        <button type="button" onClick={() => setOtroMonto({ monto: '', concepto: 'Otro' })}
                          className="boton min-h-[44px]">Otro monto</button>
                      </div>
                      {otroMonto && (
                        <div className="flex flex-wrap items-end gap-2">
                          <input type="text" inputMode="numeric" value={otroMonto.monto} autoFocus
                            placeholder="Monto" className={`${ENTRADA} w-36`}
                            onChange={(e) => setOtroMonto({ ...otroMonto, monto: e.target.value })} />
                          <Elegir etiqueta="Concepto" opciones={['Anticipo', 'Saldo', 'Otro']}
                            valor={otroMonto.concepto}
                            onElegir={(v) => setOtroMonto({ ...otroMonto, concepto: v || 'Otro' })} />
                          <button type="button" disabled={guardando || !montoCobro(otroMonto.monto)}
                            onClick={() => void cobrar(montoCobro(otroMonto.monto), otroMonto.concepto)}
                            className="boton min-h-[44px]">Anotar</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            </Seccion>

            {/* **Primero el documento y el pago; al final, mandarla y el seguimiento**
                (2026-11-12, lo pidió el cliente). Mientras no se mande, el cuadro
                de mandarla va antes del seguimiento, que recién corre después. */}
            {mandarPrimero && hitoEnvio && <div className="lg:hidden">{hitoEnvio}</div>}

            {/* ---------- Seguimiento ---------- */}
            {!cancelada && (
            <Seccion tono="rosa" icono="📨" titulo="Seguimiento y envío" ayuda="seguimiento">
            {/* **Sin botones de estado** (2026-11-12, lo pidió el cliente:
                *"se dobla información"*). El camino de arriba ya dice en qué
                va, y los botones *Candidato · Borrador · Enviada…* lo
                repetían; peor, apretar el marcado lo devolvía a Borrador sin
                avisar y con eso desaparecía *Marcar ganada*. Ahora el estado
                avanza solo con acciones: *Sí, la mandé* (Enviada), *Están
                negociando*, *Se perdió…* y *Marcar ganada*. */}
            {!ganada && estado === ESTADO_PRESUPUESTO.rechazado ? (
              <div className="rounded-lg border-2 border-hueso/25 p-3">
                <p className="text-[16px] font-bold">Se perdió</p>
                <p className="mb-1 mt-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                  Por qué
                </p>
                <Elegir etiqueta="Motivo" opciones={MOTIVOS_PERDIDA} valor={motivo} onElegir={setMotivo} />
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="u otro motivo" className={`${ENTRADA} mt-2 sm:w-80`} />
                {puedeEditar && (
                  <button type="button" className="boton mt-3 min-h-[44px]"
                    onClick={() => { setEstado(p?.enviada ? ESTADO_PRESUPUESTO.enviado : ESTADO_PRESUPUESTO.borrador); setMotivo(''); }}>
                    No se perdió: volver a abrirla
                  </button>
                )}
              </div>
            ) : !ganada && puedeEditar && p
                && (estado === ESTADO_PRESUPUESTO.negociacion || estado === ESTADO_PRESUPUESTO.enviado) && (
              <div className="flex flex-wrap items-center gap-2">
                {estado === ESTADO_PRESUPUESTO.negociacion && (
                  <span className="rounded-full border-2 border-ambar/60 bg-ambar/10 px-3 py-1 text-[14px]
                                   font-semibold text-ambar-texto">En negociación</span>
                )}
                {estado === ESTADO_PRESUPUESTO.enviado && (
                  <button type="button" className="boton min-h-[44px] lg:min-h-[40px]"
                    onClick={() => setEstado(ESTADO_PRESUPUESTO.negociacion)}>Están negociando</button>
                )}
                {/* **Deshacer un "Sí, la mandé" apretado por error** (2026-11-12,
                    lo pidió el cliente). Vuelve a Borrador, junto con las
                    alternativas del grupo, y el servidor borra la fecha de
                    envío y la vigencia: corren de nuevo cuando de verdad se
                    mande. */}
                {estado === ESTADO_PRESUPUESTO.enviado && (!vencidaViva || pasaPorEncima) && (
                  <button type="button" className="boton min-h-[44px] lg:min-h-[40px]"
                    onClick={() => {
                      if (confirm('¿Todavía no se mandó? Vuelve a Borrador: deja de contar en el calendario y su vigencia corre de nuevo cuando la mandes.')) {
                        setEstado(ESTADO_PRESUPUESTO.borrador);
                      }
                    }}>Todavía no se mandó</button>
                )}
                {/* *Se perdió…* se fue de acá el 2026-11-22: ahora es *✕ Se cayó…*,
                    arriba, en todos los pasos y con su motivo. Dos botones para
                    lo mismo era no saber cuál apretar. Su `?` (*En qué va*) va al
                    lado del camino de arriba, que es lo que explica: acá, sin
                    botones, quedaba solo en su renglón (2026-11-23). */}
              </div>
            )}



              {renegociando && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ambar/50
                                bg-ambar/10 px-3 py-2 text-[15px]">
                  <span className="flex-1 font-semibold text-ambar-texto">
                    Cambiaste una cotización ya enviada. ¿Están negociando?
                    <span className="block text-[14px] font-normal text-hueso/75">
                      El cliente ve lo nuevo en el mismo link.
                    </span>
                  </span>
                  <button type="button" className="boton min-h-[44px]"
                    onClick={() => setEstado(ESTADO_PRESUPUESTO.negociacion)}>Pasar a Negociación</button>
                </div>
              )}
              {p && (p.enviada || validoHastaVivo) && (
                <p className="text-[14px] text-hueso/75 first-letter:uppercase">
                  {/* Con el día corto (*lun 9 nov*), en un renglón (2026-11-23). */}
                  {p.enviada ? <>Enviada el {enCorto(p.enviada)}{validoHastaVivo ? ' · ' : '.'}</> : null}
                  {validoHastaVivo ? (vencidaViva
                    ? <b className="text-ambar-texto">venció el {enCorto(validoHastaVivo)}.</b>
                    : <>vigente hasta el {enCorto(validoHastaVivo)}.</>) : null}
                </p>
              )}
              {/* **Renovar la vigencia** (2026-11-23, lo decidió el cliente): la
                  primera la hace el vendedor; la segunda se pide con el mismo
                  botón de las condiciones especiales. */}
              {vencidaViva && puedeEditar && (puedeRenovarSola ? (
                <button type="button" disabled={renovando} className="boton min-h-[44px] lg:min-h-[40px]"
                  onClick={() => void renovarVigencia()}>
                  {renovando ? 'Renovando…' : `↻ Renovar la vigencia · ${datos.vigencia ?? 15} días`}
                </button>
              ) : (
                <p className="text-[14px] font-semibold text-ambar-texto">
                  Ya se renovó una vez: la siguiente se pide con ✋ Pedir condiciones especiales…
                </p>
              ))}

              {/* Antes de mandarla, los botones están en el próximo paso, grandes;
                  acá aparecen después, para volver a mandarla. Dos veces en la
                  misma pantalla era no saber cuál apretar. */}
              {p && (mandada || ganada) && (
                <div>
                  <p className="mb-2 flex items-center text-[13px] font-medium uppercase tracking-wide text-hueso/60 lg:mb-1">
                    Mandarla de nuevo
                    <button type="button" aria-expanded={mandarAbierto} onClick={() => setMandarAbierto(!mandarAbierto)}
                      className="boton ml-auto hidden normal-case tracking-normal lg:inline-flex">
                      {mandarAbierto ? '▴ Cerrar' : '📤 Mandar…'}
                    </button>
                  </p>
                  <div className={mandarAbierto ? '' : 'lg:hidden'}>
                    <BotonesMandar link={link} whatsapp={whatsapp} correo={correo} onMandar={mandar} />
                  </div>
                </div>
              )}
              {!ganada && !cancelada && (
                <div>
                  <p className="mb-1 flex items-center text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                    Recordarme
                    <button type="button" aria-expanded={recordarAbierto} onClick={() => setRecordarAbierto(!recordarAbierto)}
                      className="boton ml-auto hidden normal-case tracking-normal lg:inline-flex">
                      {recordarAbierto ? '✓ Listo' : '✎ Cambiar'}
                    </button>
                  </p>
                  {!recordarAbierto && (
                    // En un renglón (2026-11-23): con *Lo conversado* debajo, la
                    // columna no cabía en 1280×650.
                    <p className="hidden text-[14px] lg:block">
                      <strong>{segTxt || (datos.seguimiento?.dias ?? 5)}</strong> días sin respuesta ·{' '}
                      <strong>{avisoTxt || (datos.seguimiento?.antesEvento ?? 14)}</strong> antes del evento
                    </p>
                  )}
                  <div className={`flex flex-wrap items-end gap-3 ${recordarAbierto ? '' : 'lg:hidden'}`}>
                    {([
                      ['Sin respuesta, a los días', segTxt, setSegTxt, datos.seguimiento?.dias ?? 5, 'seguimientoDias'],
                      ['Días antes del evento', avisoTxt, setAvisoTxt, datos.seguimiento?.antesEvento ?? 14, 'avisoEvento']
                    ] as const).map(([etiqueta, valor, poner, defecto, ayuda]) => (
                      <label key={etiqueta} className="block">
                        <span className="mb-1 block text-[13px] text-hueso/70">{etiqueta}<AyudaCorta tema={ayuda} /></span>
                        <input type="number" min={0} max={365} value={valor} className={`${ENTRADA} w-24`}
                          placeholder={String(defecto)} onChange={(e) => poner(e.target.value)} />
                      </label>
                    ))}
                  </div>
                  <p className={`mt-1 text-[13px] text-hueso/65 ${recordarAbierto ? '' : 'lg:hidden'}`}>En blanco rige Configuración. En 0 no pregunta.</p>
                </div>
              )}
              {p && (veNotas || proximo) && (
                <LoConversado veNotas={veNotas} cuantas={notasDelGrupo} ultima={ultima}
                  frase={proximo ? fraseDe(proximo, datos.hoy) : null}
                  onAnotar={() => setNotasAbiertas(true)} />
              )}
            </Seccion>
            )}

            {/* **El próximo paso va al final** (2026-11-11, lo pidió el
                cliente: *"primero hacemos el seguimiento, los datos… y de ahí
                te ofrezco marcar como ganado"*). Cada uno de los dos pasos
                del final —Envío y Contrato— cierra con el suyo. */}
            {p && !cancelada && !mandarPrimero && hitoEnvio && <div className="lg:hidden">{hitoEnvio}</div>}
            </div>

            {/* **Lo secundario va abajo, chico y separado**: guardar ya es
                solo y borrar es peligroso. Nunca al lado del hito. En el
                computador va en el pie, junto a *volver*. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-hueso/10 pt-3 lg:hidden">
              {!cancelada && (autoActivo
                ? <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
                : <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => pedirGuardar()} />)}
              <span className="flex-1" />
              {secundarios}
            </div>
          </div>
        )}

        {/* ---------- 5. Contrato (2026-11-11) ----------
            Lo pidió el cliente: separar la cotización del contrato, que son
            dos conversaciones con el cliente. Termina en su propio hito. */}
        {paso === 5 && (
          <div className="space-y-4 lg:space-y-2">
            {/* En el computador este resumen va arriba, al lado del N°. */}
            <div className="rounded border border-hueso/15 bg-panel p-3 text-[15px] lg:hidden">
              <p className="font-semibold">{cliente?.nombre ?? 'Sin cliente'}</p>
              <p className="text-hueso/75">
                {fechaReal ? <span className="first-letter:uppercase inline-block">{enPalabras(fechaReal)}</span>
                  : periodo || 'Sin fecha'}
                {invitados > 0 && <> · {invitados} invitados</>}
                {tipoEvento && <> · {tipoEvento}</>}{socio && <> · 🤝 {(datos.socios ?? []).find((x) => x.id === socio)?.nombre ?? socio}</>}
              </p>
              <p className="mt-1 text-[20px] font-bold text-oro">{enPesos(cuentas.total)}</p>
            </div>

            {p && !cancelada && <Camino pasos={camino} />}

            {/* **El contrato es de la alternativa que está abierta** (2026-11-12,
                lo pidió el cliente: *"la que se eligió pasa a contrato"*). Ya
                no hay un paso aparte de elegir: mandar el contrato desde la B
                es mandar el de la B, y ganarla —con el anticipo o con ese
                contrato firmado— la elige y deja las otras No elegida. */}
            {porElegir && (
              <p className="rounded-lg border-2 border-oro/50 bg-oro/[0.06] px-3 py-2 text-[15px] lg:py-1">
                <strong>Este contrato es de la alternativa {letra}</strong>
                {' '}({enPesos(cuentas.total)}).
              </p>
            )}

            {/* **En el computador**, el contrato ocupa dos tercios, con lo suyo
                repartido en dos columnas, y el próximo paso va a su derecha. */}
            <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-2 lg:space-y-0">
            <fieldset disabled={cancelada} className="min-w-0 space-y-4 lg:col-span-2">
            {/* **El contrato** (Fase 4, 2026-11-10). Sale de la cotización:
                el precio, las condiciones de pago y el cliente de su ficha.
                Se firma en papel y se sube el firmado, que va a Drive. Lo
                único que se escribe acá es lo que la cotización no sabe. */}
            <Seccion tono="cielo" icono="📄" titulo="El contrato" ayuda="contrato">
              {!p ? (
                <p className="mt-1 text-[14px] text-hueso/70">Guarda la cotización para armar su contrato.</p>
              ) : (
                <div className="mt-2 space-y-3 lg:mt-0 lg:columns-2 lg:gap-x-5 lg:space-y-0 lg:[&>*]:!mb-2
                                lg:[&>*]:break-inside-avoid">
                  {firmado ? (
                    <p className="text-[15px]">
                      <span className="rounded-full border border-verde-fuerte bg-verde/15 px-2.5 py-1
                                       font-semibold text-verde-texto">✓ Contrato firmado</span>
                      <span className="ml-2 text-[14px] text-hueso/70">
                        subido{firmado.por && ` por ${firmado.por}`}{firmado.cuando && ` el ${firmado.cuando.slice(0, 10)}`}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[15px]">
                      <span className="rounded-full border border-ambar/60 px-2.5 py-1 font-semibold
                                       text-ambar-texto">Sin firmar</span>
                      <span className="ml-2 text-[14px] text-hueso/70">
                        {contratoEnviado
                          ? <>Enviado el {enPalabras(contratoEnviado)}: falta que vuelva firmado.</>
                          : <span className="inline-flex items-center gap-1.5">Falta mandarlo <AyudaCorta tema="contrato" /></span>}
                      </span>
                    </p>
                  )}


                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Con factura, el RUT y la dirección ya se piden arriba:
                        son los mismos de la ficha, no se piden dos veces. */}
                    {documento !== DOCUMENTO.factura && ([
                      ['rut', 'RUT del cliente', '12.345.678-9'],
                      ['domicilio', 'Domicilio del cliente', 'Calle, número, comuna']
                    ] as const).map(([k, etiqueta, ejemplo]) => (
                      <label key={k} className="block">
                        <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                          {etiqueta}
                        </span>
                        {k === 'rut' ? (
                          <CampoRut valor={facturacion.rut} placeholder={ejemplo} className={ENTRADA}
                            onCambio={(v) => setFacturacion({ ...facturacion, rut: v })} />
                        ) : (
                          <input value={facturacion[k]} placeholder={ejemplo} className={ENTRADA}
                            onChange={(e) => setFacturacion({ ...facturacion, [k]: e.target.value })} />
                        )}
                      </label>
                    ))}
                    <div className="sm:col-span-2">
                      <ElegirHorario valor={horario} onCambio={setHorario} rotulo="Horario del evento"
                        deSiempre={datos.contrato?.horario ?? '13:00 a 18:00'} />
                    </div>
                  </div>
                  <p className="text-[13px] text-hueso/60">
                    {documento === DOCUMENTO.factura
                      ? 'El RUT y el domicilio son los de los datos de facturación.'
                      : 'El RUT y el domicilio se guardan en la ficha del cliente.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-y-1 lg:flex-nowrap">
                  <button type="button" aria-pressed={ley20393} onClick={() => setLey20393(!ley20393)}
                    className={`boton min-h-[44px] h-auto max-w-full !whitespace-normal py-2 text-left
                      ${ley20393 ? '!border-oro bg-oro/15 font-semibold' : ''}`}>
                    <span>
                      {ley20393 ? '✓ ' : ''}Cláusula de la Ley 20.393{' '}
                      <span className="font-normal text-hueso/70">(la piden las empresas grandes)</span>
                    </span>
                  </button>
                  <AyudaCorta tema="ley20393" />
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                      Acuerdos adicionales <AyudaCorta tema="acuerdos" />
                    </span>
                    <textarea value={acuerdos} rows={2} className={ENTRADA}
                      placeholder="Lo acordado aparte con el cliente. Va como la última cláusula."
                      onChange={(e) => setAcuerdos(e.target.value)} />
                  </label>

                  {/* **Cambios de fecha y cancelación** (2026-11-11): lo que
                      se negocia con el cliente. En blanco rige Configuración.
                      El contrato lo imprime y *Cancelar evento* lo aplica. */}
                  <div className="rounded-lg border border-ambar/40 bg-ambar/5 p-3 lg:px-3 lg:py-2">
                    <p className="mb-2 flex items-center text-[14px] font-bold uppercase tracking-wide text-ambar-texto lg:mb-1">
                      Cambios de fecha y cancelación
                      {/* En el computador se lee en la frase y los tres números se
                          abren con *Cambiar* (ver `condAbiertas`). */}
                      <button type="button" aria-expanded={cancelAbierto} onClick={() => setCancelAbierto(!cancelAbierto)}
                        className="boton ml-auto hidden font-medium normal-case tracking-normal text-hueso lg:inline-flex">
                        {cancelAbierto ? '✓ Listo' : '✎ Cambiar'}
                      </button>
                    </p>
                    <div className={`flex flex-wrap items-end gap-3 ${cancelAbierto ? '' : 'lg:hidden'}`}>
                      {([
                        ['Cambios de fecha', cambiosTxt, setCambiosTxt, 10, datos.contrato?.tranquilidad?.cambiosFecha ?? 2, 'cambiosFecha', 'cambiosFecha'],
                        ['Cancela hasta, días antes', cancelTxt, setCancelTxt, 365, datos.contrato?.tranquilidad?.cancelacionDias ?? 60, 'cancelacionDias', 'cancelacionDias'],
                        ['Devuelve, % de lo pagado', reembolsoTxt, setReembolsoTxt, 100, datos.contrato?.tranquilidad?.reembolsoPct ?? 20, 'reembolso', 'reembolso']
                      ] as const).map(([etiqueta, valor, poner, max, defecto, ayuda, campo]) => (
                        <label key={etiqueta} className="block">
                          <span className="mb-1 block text-[13px] text-hueso/70">{etiqueta}<AyudaCorta tema={ayuda} /></span>
                          <input type="number" min={0} max={max} value={valor} className={`${ENTRADA} w-24`}
                            placeholder={String(defecto)} onChange={(e) => poner(e.target.value)}
                            onBlur={(e) => toparCampo(campo, e.target.value, poner)} />
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[14px] text-hueso/75">
                      {/* *En blanco rige Configuración* está en el `?` de cada campo. */}
                      {frasesCancelacion(tranqEfectiva)}
                    </p>
                    {/* **Lo que el calendario ya no permite** (regla B): el
                        contrato no lo ofrece, y acá se dice antes de mandarlo. */}
                    {(plazos.sinCambios || plazos.sinCancelacion) && (
                      <p className="mt-1 text-[14px] font-semibold text-ambar-texto">
                        ⚠ Faltan {Math.max(0, plazos.dias ?? 0)} días: el contrato ya no ofrece{' '}
                        {plazos.sinCambios && plazos.sinCancelacion ? 'cambiar la fecha ni cancelar'
                          : plazos.sinCambios ? 'cambiar la fecha' : 'cancelar con devolución'}.
                      </p>
                    )}
                    {lineaCondiciones(true)}
                  </div>

                  {(faltaDelCliente(facturacion).length > 0
                    || (datos.contrato?.faltaEmpresa.length ?? 0) > 0 || !esFecha(fechaReal)) && (
                    <div className="rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-[14px]
                                    font-semibold text-ambar-texto">
                      {!esFecha(fechaReal) && <p>Al contrato le falta el día del evento.</p>}
                      {faltaDelCliente(facturacion).length > 0 && (
                        <p>Al cliente le falta: {faltaDelCliente(facturacion).join(' y ')}.</p>
                      )}
                      {(datos.contrato?.faltaEmpresa.length ?? 0) > 0 && (
                        <p>En Configuración falta: {datos.contrato?.faltaEmpresa.join(', ')}.</p>
                      )}
                      <p className="font-normal">Se puede imprimir igual: lo que falta sale con una raya para completar a mano.</p>
                    </div>
                  )}

                  {(contratoEnviado || firmado) ? (
                    <div>
                      <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                        Mandar el contrato de nuevo <AyudaCorta tema="mandarContrato" />
                      </p>
                      <BotonesMandar link={linkContrato} whatsapp={whatsappContrato} correo={correoContrato}
                        onMandar={(v) => mandar(v, 'contrato')} ver="📄 Ver el contrato" />
                    </div>
                  ) : linkContrato && (
                    <a href={linkContrato} target="_blank" rel="noreferrer" className="tecla boton min-h-[44px]">
                      📄 Ver el contrato
                    </a>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {firmado && (
                      <a href={`/api/presupuestos/contrato?id=${encodeURIComponent(p.id)}`}
                        target="_blank" rel="noopener" className="tecla boton min-h-[44px]">📎 Ver el firmado</a>
                    )}
                    {puedeEditar && firmado && (
                      <label className={`boton tecla min-h-[44px] cursor-pointer ${subiendoContrato ? 'opacity-60' : ''}
                        ${firmado ? '' : '!border-verde-fuerte text-verde-texto hover:bg-verde/10'}`}>
                        {subiendoContrato ? 'Subiendo…' : firmado ? 'Cambiar el firmado' : '📎 Subir contrato firmado'}
                        <input type="file" accept="image/*,application/pdf" className="sr-only"
                          disabled={subiendoContrato}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (f) void subirContrato(f);
                          }} />
                      </label>
                    )}
                    {firmado && puedeEditar && (
                      <button type="button" onClick={() => void quitarContrato()}
                        className="boton min-h-[44px] hover:border-rojo-fuerte hover:text-rojo-texto">Quitar</button>
                    )}
                  </div>
                </div>
              )}
            </Seccion>

            </fieldset>

            {p && !cancelada && hitoContrato}
            </div>

            {/* En el computador esto va en el pie, junto a *volver*. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-hueso/10 pt-3 lg:hidden">
              {!cancelada && (autoActivo
                ? <AvisoGuardado estado={auto.estado} error={auto.error} onReintentar={() => void auto.reintentar()} />
                : <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => pedirGuardar()} />)}
              <span className="flex-1" />
              {secundariosContrato}
            </div>
          </div>
        )}
      </fieldset>

      {paso < 5 && (
        <PieDePaso paso={paso} guardando={guardando}
          puede={paso !== 1 || !!idCliente}
          porQueNo="Elige o crea el cliente para seguir."
          aviso={paso !== 2 || !puedeEditar ? ''
            : !p ? 'Al seguir, se crea la cotización.'
            : estado === ESTADO_PRESUPUESTO.candidato ? 'Al seguir, deja de ser candidato y pasa a borrador.'
            : ''}
          medio={paso === 3 ? <>{avisoMenus}{puedePedirCond && (showSePide || arriendoSePide) && botonPedirCond}</>
            : paso === 4 ? <>
                {!cancelada && !autoActivo && <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => pedirGuardar()} />}
                {secundarios}
                {puedePedirCond && botonPedirCond}
              </> : null}
          // **El simulador de evento** (2026-11-23), en el pie del paso de
          // productos, al lado de *Se cayó…* y del dorado. Estaba junto al
          // total y el cliente lo movió: *"ahí donde está, no tiene nada que
          // ver. Mejor que esté en la última fila y un poco más visible"*.
          antesDeSeguir={paso === 3
            // En el celular los dos comparten una fila, mitad y mitad: con
            // *volver* al lado no caben los tres.
            ? <div className="flex gap-2 max-lg:basis-full max-lg:[&>*]:flex-1 lg:contents">
                <SimularEvento lineas={vistas} descuentoTotal={descuento} invitados={invitados} />{botonSeCayo}
              </div>
            : botonSeCayo}
          onVolver={() => void irA(paso - 1)} onSeguir={() => void irA(paso + 1)} />
      )}
      {paso === 5 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hueso/10 pt-3 lg:mt-2 lg:pt-2">
          <button type="button" className="boton min-h-[48px] lg:min-h-[44px]" onClick={() => void irA(4)}>
            ← 4 · {PASOS[3]}
          </button>
          <div className="hidden min-w-0 flex-wrap items-center gap-2 lg:ml-2 lg:flex">
            {!cancelada && !autoActivo && <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => pedirGuardar()} />}
            {secundariosContrato}
            {puedePedirCond && botonPedirCond}
          </div>
          {botonSeCayo && <><span className="flex-1" />{botonSeCayo}</>}
        </div>
      )}

      {error && <p className="mt-3 text-[15px] font-semibold text-rojo-texto">{error}</p>}
      {/* **Guardar una ganada en un día cerrado** (2026-11-21): la lista de lo
          que cambió y su casilla, como en el equipo y en las reservas. */}
      {corrigiendoDia && p && (
        <Dialogo titulo={`Corregir un día cerrado · ${cliente?.nombre ?? folioDe(p)}`} ancho="max-w-lg"
          onCerrar={() => { if (!guardando) setCorrigiendoDia(false); }}>
          <p className="mt-2 text-[15px] text-hueso/80">
            {p.fecha && fechaReal && p.fecha !== fechaReal
              ? <>La reserva se mueve del <strong>{enPalabras(p.fecha)}</strong> al <strong>{enPalabras(fechaReal)}</strong>, y uno de los dos días ya está cerrado.</>
              : <>El <strong>{enPalabras(fechaReal || p.fecha)}</strong> ya está cerrado: guardar esta cotización es corregir su reserva de ese día.</>}
          </p>
          {error && <p className="mt-2 text-[14px] font-semibold text-rojo-texto">{error}</p>}
          <PieCorreccion modo="apilado" cambios={cambiosCorreccion}
            confirmado={correccionConfirmada} onConfirmado={setCorreccionConfirmada}
            guardando={guardando}
            porQueNo={datos.puedeCorregir ? undefined
              : 'Un día cerrado lo corrige el administrador o quien hace los pagos.'}
            onCancelar={() => setCorrigiendoDia(false)}
            onGuardar={async () => {
              if (await guardar(undefined, false, textoDeCambios(cambiosCorreccion))) setCorrigiendoDia(false);
            }} />
        </Dialogo>
      )}
      {preguntaEnvio && (
        <Dialogo titulo="¿La mandaste?" onCerrar={() => setPreguntaEnvio('')}>
          {/* **En su marco de grupo** (2026-11-22, lo pidió el cliente: *"ponle
              marco también a las ventanitas"*): rosado, el color del envío, con
              la pregunta como título. Los botones van fuera, al pie. */}
          <div className={`mt-3 ${marcoGrupo('rosa')} p-3`}>
          <p className={TITULO_GRUPO}>
            ¿Le mandaste {preguntaEnvio === 'contrato' ? 'el contrato' : 'la cotización'} a{' '}
            {cliente?.nombre ?? 'tu cliente'}?
          </p>
          {/* Al abrirla, sin haber apretado nada (2026-11-25): se dice por qué. */}
          {preguntaEnvio === 'cotizacion' && !viaEnvio && (
            <p className="mt-1 text-[14px] text-hueso/75">Está lista y todavía no figura como mandada.</p>
          )}
          <p className="mt-2 text-[14px] text-hueso/75">
            {preguntaEnvio === 'contrato'
              ? <>Queda anotado que se lo mandaste, y si no vuelve firmado te lo recuerdo arriba de Cotizaciones.</>
              : <>Pasa a <strong>Enviada</strong>: desde hoy corre su vigencia y aparece como posible
                  en el calendario de reservas.</>}
          </p>
          {/* **Si no se abrió, se abre de acá** (2026-11-12, lo reclamó el
              cliente: apretó WhatsApp y solo apareció esta pregunta). Pasa
              cuando el navegador no deja abrir otra pestaña; el mensaje se
              puede copiar y pegar a mano. */}
          {viaEnvio === 'whatsapp' && (() => {
            const contrato = preguntaEnvio === 'contrato';
            const url = contrato ? whatsappContrato : whatsapp;
            const texto = contrato ? textoWhatsappContrato : textoWhatsapp;
            return (
              <div className="mt-3 rounded-lg border border-hueso/20 bg-panel p-3">
                <p className="text-[15px] font-semibold">¿No se abrió WhatsApp?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer"
                      onClick={(e) => { e.preventDefault(); abrirWhatsApp(url); }}
                      className="tecla boton min-h-[44px]">💬 Abrir WhatsApp de nuevo</a>
                  )}
                  {texto && (
                    <button type="button" className="boton min-h-[44px]"
                      onClick={() => copiarConAviso(texto, 'Mensaje copiado: pégalo en WhatsApp', 'Copia esto:')}>
                      📋 Copiar el mensaje
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          {/* **El correo copia la dirección** (2026-11-25): para escribirlo
              hacen falta la dirección y el link, los dos a mano. */}
          {viaEnvio === 'correo' && (() => {
            const elLink = preguntaEnvio === 'contrato' ? linkContrato : link;
            return (
              <div className="mt-3 rounded-lg border border-hueso/20 bg-panel p-3">
                <p className="text-[15px] font-semibold">¿Te falta algo para el correo?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cliente?.correo && (
                    <button type="button" className="boton min-h-[44px]"
                      onClick={() => copiarConAviso(cliente.correo, 'Correo copiado', 'Copia este correo:')}>
                      ✉️ Copiar el correo
                    </button>
                  )}
                  {elLink && (
                    <button type="button" className="boton min-h-[44px]"
                      onClick={() => copiarConAviso(elLink, 'Link copiado', 'Copia este link:')}>
                      📋 Copiar el link
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="boton min-h-[48px]" onClick={() => setPreguntaEnvio('')}>
              Todavía no
            </button>
            <button type="button" autoFocus disabled={guardando} onClick={() => void confirmarEnvio()}
              className="boton boton-relleno min-h-[52px] px-6 text-[16px]">
              {preguntaEnvio === 'contrato' ? '✓ Sí, lo mandé' : '✓ Sí, la mandé'}</button>
          </div>
        </Dialogo>
      )}
      {/* **¿Marcarla ganada?** (2026-11-11). Sin anticipo pagado ni contrato
          firmado —una cotización con *Sin anticipo*— se puede igual, pero
          lo dice y ofrece ir a subir el contrato: *"¿tienes un contrato
          firmado? si es el caso, por favor, súbelo"*. */}
      {confirmandoGanar && p && (() => {
        const objetivo = alts.find((a) => a.id === confirmandoGanar) ?? p;
        const l = letraDe(objetivo, alternativas);
        // **Sin un peso y sin contrato** (2026-11-12, lo reclamó el cliente:
        // con *Sin anticipo* se ganaba sin preguntar). Lo pagado es del
        // evento —todas las alternativas—; el contrato, de la que se gana.
        const pagadoEvento = cobrosGrupo.reduce((n, c) => n + c.monto, 0);
        const contratoDeEsta = objetivo.id === p.id ? !!firmado : !!objetivo.contrato;
        const nada = ganaSinRespaldo(pagadoEvento, contratoDeEsta);
        const sinRespaldo = nada || !ganable(objetivo).ok || (objetivo.id === p.id && !anticipoPagado && !firmado
          && cond.pct > 0);
        const otras = vivas.filter((a) => a.id !== objetivo.id);
        return (
          <Dialogo titulo={alts.length > 1 ? `¿Ganó la ${l}?` : '¿Marcarla ganada?'}
            onCerrar={() => setConfirmandoGanar('')}>
            {/* **La letra en grande** (2026-11-12, lo pidió el cliente): se
                marcó ganada la A cuando era la B. Acá se ve cuál es antes de
                apretar, con su total, y qué pasa con las demás. */}
            {/* **En su marco de grupo** (2026-11-22): lo que pasa al ganarla,
                en verde; el aviso de sin anticipo, en su grupo ámbar. */}
            <div className={`mt-3 ${marcoGrupo('verde')} p-3`}>
            <p className={`${TITULO_GRUPO} text-verde-texto`}>Al marcarla ganada</p>
            {alts.length > 1 && (
              <div className="mt-3 flex items-center gap-4 rounded-xl border-2 border-verde-fuerte/60 bg-panel p-3">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-verde-fuerte
                                 text-[36px] font-extrabold text-tinta">{l}</span>
                <span>
                  <span className="block text-[18px] font-bold">Alternativa {l} · {enPesos(totalAlt(objetivo))}</span>
                  <span className="block text-[15px] text-hueso/80">{genteDe(objetivo)} personas</span>
                </span>
              </div>
            )}
            <p className="mt-3 text-[16px]">
              Se crea la reserva de <strong>{genteDe(objetivo)} personas</strong> y le toma el cupo
              al {esFecha(fechaReal) ? enPalabras(fechaReal) : 'día del evento'}.
            </p>
            {otras.length > 0 && (
              <p className="mt-2 text-[15px] text-hueso/85">
                {otras.map((a) => `La ${letraDe(a, alternativas)} (${enPesos(totalAlt(a))})`).join(' y ')}{' '}
                pasa{otras.length > 1 ? 'n' : ''} a <strong>No elegida</strong>.
                {cobrosOtras.length > 0 || (objetivo.id !== p.id && cobros.length > 0)
                  ? ` Los pagos anotados en otra alternativa pasan a la ${l}.` : ''}
              </p>
            )}
            </div>
            {sinRespaldo && (
              <div className={`mt-3 ${marcoGrupo('ambar')} p-3 text-[15px]`}>
                <p className={`${TITULO_GRUPO} text-ambar-texto`}>
                  {nada ? '✋ ¿Por qué la marcas ganada sin anticipo?' : 'No tienes el anticipo pagado ni contrato firmado.'}
                </p>
                <p className="mt-1 text-hueso/85">
                  {nada ? 'No hay ningún pago anotado ni contrato firmado. ' : ''}
                  ¿Tienes un contrato firmado? Si es así, súbelo antes de marcarla ganada.
                </p>
                {nada && (
                  <p className="mt-2 rounded-md border-2 border-dashed border-ambar-fuerte/70 p-2 text-hueso/90">
                    Si la marcas igual, la reserva queda <strong>sujeta a espacio</strong>: se trata como si no
                    hubiera pagado nada, igual que una reserva de Shopify sin pago. Si el día se llena con gente que
                    pagó, esa gente tiene preferencia.
                  </p>
                )}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="boton min-h-[48px]" onClick={() => setConfirmandoGanar('')}>
                Volver
              </button>
              {sinRespaldo && (
                <button type="button" className="boton min-h-[48px]"
                  onClick={() => { setConfirmandoGanar(''); setPaso(5); }}>
                  📎 Sí, ir a subir el contrato
                </button>
              )}
              <button type="button" autoFocus disabled={guardando} onClick={() => void ganar(objetivo.id)}
                className="tecla min-h-[52px] rounded-xl border-2 border-verde-fuerte bg-verde-fuerte px-6
                           text-[16px] font-bold text-tinta disabled:opacity-50">
                {sinRespaldo ? (nada ? 'No, marcarla ganada igual' : 'Sí, marcarla ganada igual')
                  : alts.length > 1 ? `✓ Sí, ganó la ${l}` : '✓ Sí, marcarla ganada'}
              </button>
            </div>
          </Dialogo>
        );
      })()}
      {corrigiendo && p && (
        <CorregirGanada p={p} letra={letra} gente={personasDelEvento}
          otras={vivasParaCorregir.map((a) => ({ id: a.id, letra: letraDe(a, alternativas), total: totalAlt(a) }))}
          onCerrar={() => setCorrigiendo(false)}
          onCancelarEvento={() => { setCorrigiendo(false); setCancelando(true); }}
          onListo={(hacia) => { setCorrigiendo(false); onCambio(); if (onAbrir) onAbrir(hacia || p.id, 4); else onCerrar(); }} />
      )}
      {textoDe !== null && vistas[textoDe] && (() => {
        const l = vistas[textoDe];
        const prod = productoDe(l.concepto, datos.menus);
        return (
          <TextoDeLinea concepto={l.concepto} esMenu={prod?.tipo === TIPO_PRODUCTO.menu}
            linea={{ descripcion: l.descripcion ?? '', bebestibles: l.bebestibles ?? '' }}
            producto={textosDelProducto(prod)}
            onCambio={(c) => cambiarLinea(textoDe, c)} onCerrar={() => setTextoDe(null)} />
        );
      })()}
      {aplicandoPromo && (
        <AplicarPromocion promociones={datos.promociones ?? []} catalogo={datos.menus} invitados={invitados}
          fecha={fechaReal} pasaPorEncima={pasaPorEncima} yaEstan={vistas} onCerrar={() => setAplicandoPromo(false)} onAplicar={aplicarPromocion} />
      )}
      {cayendo && p && (
        <SeCayo id={p.id} cliente={cliente?.nombre ?? p.cliente ?? ''}
          alternativas={alts.filter((a) => a.id === p.id || enCarrera(a)).length}
          antes={async () => { if (autoActivo) await auto.forzar(); }}
          onCerrar={() => setCayendo(false)}
          onListo={() => { setCayendo(false); onCambio(); onCerrar(); }} />
      )}
      {pidiendoCond && p && (
        <PedirCondiciones id={p.id} cliente={cliente?.nombre ?? p.cliente ?? ''} topes={topes} extras={extrasPedido}
          antes={async () => { if (autoActivo) await auto.forzar(); }}
          onCerrar={() => setPidiendoCond(false)}
          onListo={(m) => { setCondPedidas(m.condicionesPedidas); setCondMarca(m.condicionesEspeciales);
            setRecorteCond(''); setPidiendoCond(false); }} />
      )}
      {cancelando && p && (
        <CancelarEvento p={p} onCerrar={() => setCancelando(false)}
          onListo={() => { setCancelando(false); onCambio(); onCerrar(); }} />
      )}
      {notasAbiertas && p && (
        <NotasCotizacion p={{ ...p, recontactar }} grupo={grupoNotas} notas={datos.notas ?? []} hoy={datos.hoy}
          usuario={datos.usuario} onAnotado={setRecontactar}
          onCambio={() => { huboGuardado.current = true; onCambio(); }} onCerrar={() => setNotasAbiertas(false)} />
      )}
    </Dialogo>
  );
}

/**
 * **El pie de cada paso, igual en los cuatro** (2026-11-11, lo pidió el
 * cliente: *"estás con el botón abajo, ¿qué estoy haciendo?"*). Antes cada
 * paso terminaba distinto —*Seguir →*, *Seguir: productos →*, *Seguir:
 * enviar →*, este último gris y sonando a que se mandaba algo— y ninguno
 * volvía atrás.
 *
 * - **A la derecha, siempre el dorado**, y dice a dónde va: *Ir al paso 3:
 *   Productos →*.
 * - **Debajo, una línea solo si seguir hace algo más que cambiar de paso**:
 *   pasar de Evento a Productos guarda (`irA()`), y eso se dice antes.
 * - **A la izquierda, volver**, delineado.
 */
function PieDePaso({ paso, guardando, puede, porQueNo, aviso, medio, antesDeSeguir, onVolver, onSeguir }: {
  paso: number; guardando: boolean; puede: boolean; porQueNo: string; aviso: string;
  /** Lo que va en el pie **solo en el computador**, entre *volver* y *seguir*. */
  medio?: React.ReactNode;
  /**
   * Un botón clave al lado del dorado, en el computador y en el celular:
   * *✕ Se cayó…* (2026-11-22). En el celular comparte la fila con *volver*
   * y el dorado baja a todo el ancho, para no dejar un hueco.
   */
  antesDeSeguir?: React.ReactNode;
  onVolver: () => void; onSeguir: () => void;
}) {
  return (
    <div className="mt-4 border-t border-hueso/10 pt-3 lg:mt-2 lg:pt-2">
      <div className="flex flex-wrap items-center gap-2">
        {paso > 1 && (
          <button type="button" className="boton min-h-[48px] lg:min-h-[44px]" onClick={onVolver}>
            ← {paso - 1} · {PASOS[paso - 2]}
          </button>
        )}
        {medio && <div className="hidden min-w-0 flex-wrap items-center gap-2 lg:ml-2 lg:flex">{medio}</div>}
        <span className="flex-1" />
        {/* En el computador, la frase va en la fila, antes del botón. */}
        {(aviso || !puede) && (
          <span className={`hidden text-[14px] lg:inline ${puede ? 'text-hueso/70' : 'font-semibold text-ambar-texto'}`}>
            {puede ? aviso : porQueNo}
          </span>
        )}
        {antesDeSeguir}
        <button type="button" disabled={guardando || !puede} onClick={onSeguir}
          className={`boton boton-relleno min-h-[52px] px-5 text-[16px] disabled:opacity-50 lg:min-h-[44px] ${
            antesDeSeguir ? 'max-lg:basis-full' : ''}`}>
          {guardando ? 'Guardando…' : <>Ir al paso {paso + 1}: {PASOS[paso]} →</>}
        </button>
      </div>
      {(aviso || !puede) && (
        <p className={`mt-2 text-right text-[14px] lg:hidden ${puede ? 'text-hueso/70' : 'font-semibold text-ambar-texto'}`}>
          {puede ? aviso : porQueNo}
        </p>
      )}
    </div>
  );
}

/**
 * **Una sección de la cotización, con su color** (2026-11-11, lo pidió el
 * cliente: *"darle un distinto tono de fondo para que uno cacha: aquí estoy
 * en el pago del cliente, aquí en cambio de fecha y cancelación"*). El color
 * dice de qué se trata: verde la plata, cielo el contrato, rosado lo que
 * está por confirmarse.
 *
 * **Es el marco de un grupo** (2026-11-22, la regla *el marco de la tarjeta
 * manda sobre lo de adentro*): 3px en el tono fuerte (`marcoGrupo`) y el
 * título en negrita (`TITULO_GRUPO`), como un puesto en la ventana del
 * equipo. Lo de adentro —botones, campos, avisos— va con menos. Antes eran
 * 2px claros y el título chico en mayúsculas: el marco de la sección pesaba
 * lo mismo que un botón. La usan los pasos 2, 4 y 5.
 */
const TEXTO_TONO = {
  verde: 'text-verde-texto', cielo: 'text-cielo-texto', rosa: 'text-rosa-texto',
  ambar: 'text-ambar-texto', neutro: 'text-hueso'
} as const;
function Seccion({ tono, icono, titulo, ayuda, ayudaPc, children }: {
  tono: keyof typeof TEXTO_TONO; icono: string; titulo: string; ayuda?: string;
  /** Un `?` que va en el título solo en el computador (en el celular está junto a su campo). */
  ayudaPc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`space-y-4 ${marcoGrupo(tono)} p-4 lg:space-y-1.5 lg:p-3`}>
      <h3 className={`flex items-center ${TITULO_GRUPO} ${TEXTO_TONO[tono]}`}>
        <span aria-hidden className="mr-2 text-[18px]">{icono}</span>{titulo}
        {ayuda && <AyudaCorta tema={ayuda} />}
        {ayudaPc && <span className="hidden lg:inline"><AyudaCorta tema={ayudaPc} /></span>}
      </h3>
      {children}
    </section>
  );
}

/** El bloque del próximo hito: grande, con su color y lo que pasa al apretarlo. Un grupo, como las secciones. */
function Hito({ tono, titulo, bajada, children }: {
  tono: 'verde' | 'rosa' | 'ambar' | 'cielo'; titulo: string;
  /** Una frase de lo que pasa o lo que falta. El porqué va en su `?`, no acá. */
  bajada?: string; children?: React.ReactNode;
}) {
  const texto = TEXTO_TONO[tono];
  return (
    <div className={`space-y-3 ${marcoGrupo(tono)} p-4 lg:space-y-2 lg:p-3`}>
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Próximo paso</p>
        <p className={`text-[22px] font-extrabold leading-tight lg:text-[19px] ${texto}`}>{titulo}</p>
        {bajada && <p className="mt-1 text-[15px] text-hueso/80 lg:text-[14px]">{bajada}</p>}
      </div>
      {children}
    </div>
  );
}

/** Los hitos de la cotización, como trofeos: los cumplidos con su ✓. */
function Camino({ pasos }: { pasos: { nombre: string; listo: boolean }[] }) {
  const actual = pasos.findIndex((x) => !x.listo);
  return (
    <ol aria-label="Por dónde va" className="flex flex-wrap items-center gap-1.5">
      {pasos.map((x, i) => (
        <li key={x.nombre} className="flex items-center gap-1.5">
          <span className={`rounded-full border-2 px-3 py-1 text-[14px] font-semibold lg:py-0.5 ${x.listo
            ? 'border-verde-fuerte bg-verde-fuerte text-tinta'
            : i === actual ? 'border-oro text-oro' : 'border-hueso/20 text-hueso/55'}`}>
            {x.listo ? '✓ ' : i === actual ? '● ' : ''}{x.nombre}
          </span>
          {i < pasos.length - 1 && <span aria-hidden className="text-hueso/40">→</span>}
          {/* Su `?` (*En qué va*), pegado al último paso: así se dobla con él
              y no queda solo en un renglón en el celular (2026-11-23). */}
          {i === pasos.length - 1 && <AyudaCorta tema="estadoCotizacion" />}
        </li>
      ))}
    </ol>
  );
}



/**
 * WhatsApp, correo, link y el documento: los cuatro preguntan "¿la mandaste?"
 * (ver `mandar()`). `correo` es la dirección: el botón la copia (2026-11-25).
 */
function BotonesMandar({ link, whatsapp, correo, onMandar, grande = false, ver = 'Ver el documento' }: {
  link: string; whatsapp: string; correo: string;
  onMandar: (via: 'whatsapp' | 'correo' | 'link' | 'ver') => void; grande?: boolean;
  /** Qué dice el botón que abre el documento. */
  ver?: string;
}) {
  const clase = grande ? 'boton min-h-[56px] flex-1 text-[16px] font-semibold lg:min-h-[48px]' : 'boton min-h-[44px] lg:min-h-[40px]';
  return (
    <div className="flex flex-wrap gap-2">
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noreferrer" className={`tecla ${clase}`}
          onClick={(e) => { e.preventDefault(); abrirWhatsApp(whatsapp); onMandar('whatsapp'); }}>💬 WhatsApp</a>
      ) : <button type="button" className={clase} disabled>Falta su teléfono</button>}
      {correo ? (
        <button type="button" className={clase} title={`Copia ${correo}`} onClick={() => onMandar('correo')}>✉️ Copiar correo</button>
      ) : <button type="button" className={clase} disabled>Falta su correo</button>}
      <button type="button" className={clase} disabled={!link} onClick={() => onMandar('link')}>
        📋 Copiar link
      </button>
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className={`tecla ${clase}`} onClick={() => onMandar('ver')}>{ver}</a>
      )}
    </div>
  );
}

/** El botón grande de subir el contrato firmado, para el bloque del próximo paso. */
function SubirFirmado({ subiendo, onArchivo }: { subiendo: boolean; onArchivo: (f: File) => void }) {
  return (
    <label className={`tecla block min-h-[56px] w-full cursor-pointer rounded-xl border-2 border-verde-fuerte
                       px-5 text-center text-[17px] font-bold leading-[52px] text-verde-texto hover:bg-verde/10
                       ${subiendo ? 'opacity-60' : ''}`}>
      {subiendo ? 'Subiendo…' : '📎 Subir contrato firmado'}
      <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={subiendo}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArchivo(f); }} />
    </label>
  );
}
