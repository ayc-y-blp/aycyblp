'use client';

/**
 * La configuración del negocio.
 *
 * Cada campo guarda al salir de él, como el resto del panel: no hay un botón
 * "Guardar" que se pueda olvidar. Lo que se escribe se valida en el servidor
 * antes de escribirse —ver /api/config— así que la respuesta trae los valores
 * ya corregidos y el formulario se redibuja con ellos. Si escribes un cupo en
 * cero, vas a ver que vuelve a 60: eso no es un error, es la validación.
 */
import AvisoFijo from './AvisoFijo';
import AyudaCorta from './AyudaCorta';
import { useEffect, useState } from 'react';
import Ayuda from './Ayuda';
import PasoAProduccion from './PasoAProduccion';
import ImportarCRM from './ImportarCRM';
import { usarSoloMira } from './SesionCliente';
import { Aviso } from './CalendarView';
import { deDiasSemana, idDeDrive, type Config } from '@/lib/config';

/**
 * Lo que se le manda a /api/config. `diasAbiertos` va como TEXTO, tal como
 * se escribe en el campo ("sáb,dom"), y la ruta lo interpreta: así la
 * tolerancia a tildes y abreviaturas vive en un solo lugar, el servidor, y
 * no duplicada acá.
 */
type Cambio = Partial<Omit<Config, 'diasAbiertos' | 'fechasSinExclusivo'>>
  & { diasAbiertos?: string; fechasSinExclusivo?: string };

const ENTRADA =
  'w-full min-h-[44px] rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

export default function ConfigEditor() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardando, setGuardando] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [resumen, setResumen] = useState('');
  /** Vista gerencia sin `configurar`: se mira y no se toca. */
  const soloMira = usarSoloMira('configurar');

  /**
   * Le pide a Shopify los pedidos recientes y anota lo que falte.
   *
   * Es la misma reconciliación que corre sola una vez al día, y vive acá y
   * no en el calendario porque **no es una herramienta de gestión**: la
   * gestión pasa por el panel y las reservas llegan solas por el webhook.
   * Esto se aprieta cuando se sospecha que algo falta, que es de vez en
   * cuando y no todos los días.
   *
   * Es seguro apretarlo de más: guardarPedido() es idempotente.
   */
  async function revisarShopify() {
    setRevisando(true);
    setResumen('');
    try {
      const r = await fetch('/api/shopify/sincronizar');
      const d = await r.json();
      setResumen(d.error
        ? d.error
        : `${d.revisados} pedidos revisados · ${d.creadas} nuevas · ${d.actualizadas} al día`
          + (d.omitidas ? ` · ${d.omitidas} ya canceladas, sin anotar` : ''));
    } catch (e) {
      setResumen(String(e));
    } finally {
      setRevisando(false);
    }
  }

  async function cargar() {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
    else setConfig(d.config);
  }
  useEffect(() => { cargar(); }, []);

  async function guardar(cambio: Cambio, campo: string) {
    setGuardando(campo);
    try {
      const r = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cambio)
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
      else { setConfig(d.config); setError(''); }
    } finally {
      setGuardando('');
    }
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!config) return <p className="text-hueso/50">Cargando…</p>;

  /**
   * Un campo: el título y su explicación a la izquierda, la caja a la
   * derecha. A la regla del panel: 15px el título y 13px la ayuda, nada más
   * chico.
   */
  const campo = (
    nombre: string, titulo: string, ayuda: string, entrada: React.ReactNode
  ) => (
    <div key={nombre} className="border-t border-hueso/10 py-4 first:border-t-0
                                 sm:grid sm:grid-cols-[1fr_14rem] sm:gap-6 lg:py-2">
      {/* **La explicación de cada campo, en su `?`** (2026-11-21, regla *lo que
          explica va en su ?*): a la vista, el nombre del campo y su caja. */}
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-semibold">{titulo}</span>
        {ayuda && <AyudaCorta titulo={titulo}>{ayuda}</AyudaCorta>}
      </div>
      <div className="mt-2 sm:mt-0">
        {entrada}
        {guardando === nombre && (
          <span className="mt-1 block text-[13px] text-hueso/60">guardando…</span>
        )}
      </div>
    </div>
  );

  const numerico = (
    nombre: string, valor: number, aplicar: (n: number) => Cambio,
    rango?: { min: number; max: number; unidad?: string }
  ) => (
    <div className="flex items-center gap-2">
      <input type="number" defaultValue={valor} min={rango?.min} max={rango?.max}
        className={ENTRADA}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (n === valor) return;
          guardar(aplicar(n), nombre);
        }} />
      {rango?.unidad && <span className="shrink-0 text-[14px] text-hueso/70">{rango.unidad}</span>}
    </div>
  );

  /** Un tramo del arriendo mínimo: hasta cuántas personas y el mínimo, en la columna de los valores. */
  type CampoNumero = 'arriendoPrivadoHasta1' | 'arriendoPrivadoMinimo1' | 'arriendoPrivadoHasta2'
    | 'arriendoPrivadoMinimo2' | 'arriendoExclusivoHasta1' | 'arriendoExclusivoMinimo1'
    | 'arriendoExclusivoHasta2' | 'arriendoExclusivoMinimo2';
  const tramoArriendo = (nombre: string, titulo: string, ayuda: string, hasta: CampoNumero, minimo: CampoNumero) =>
    campo(nombre, titulo, ayuda, (
      <div className="grid gap-2">
        {numerico(hasta, config![hasta], (n) => ({ [hasta]: n }) as Cambio, { min: 0, max: 100000, unidad: 'personas o menos' })}
        {numerico(minimo, config![minimo], (n) => ({ [minimo]: n }) as Cambio, { min: 0, max: 1000000000, unidad: '+ IVA' })}
      </div>
    ));

  const textoLibre = (
    nombre: string, valor: string, aplicar: (t: string) => Cambio, ejemplo = ''
  ) => (
    <input type="text" defaultValue={valor} placeholder={ejemplo} className={ENTRADA}
      onBlur={(e) => e.target.value !== valor && guardar(aplicar(e.target.value), nombre)} />
  );

  const empresa = (k: keyof Config['empresa'], titulo: string, ayuda: string, ejemplo = '') =>
    campo(`empresa-${k}`, titulo, ayuda, textoLibre(`empresa-${k}`, config.empresa[k],
      (t) => ({ empresa: { [k]: t } }) as unknown as Cambio, ejemplo));

  /**
   * **Un grupo dentro de una sección** (2026-11-23, lo pidió el cliente al
   * crecer Configuración: *"esta sección ya va a ser bastante amplia. Hay que
   * organizarlo de forma muy buena y muy entendible"*). Un subtítulo con su
   * raya y sus campos debajo, en las mismas dos columnas de la sección.
   */
  const grupo = (titulo: string, cuerpo: React.ReactNode) => (
    <div key={titulo} data-grupo className="border-t-2 border-hueso/15 pb-1 pt-3 first:border-t-0 lg:col-span-2">
      <h3 className="text-[15px] font-bold text-hueso/90">{titulo}</h3>
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-10 lg:[&>*:nth-child(2)]:border-t-0">{cuerpo}</div>
    </div>
  );

  /**
   * **Las secciones de la página** (2026-11-10, lo pidió el cliente: *"ya
   * estamos ampliando mucho esa parte"*). Cada una es una tarjeta con su
   * título y una línea que dice para qué sirve, y arriba hay un índice con
   * un botón por sección. Ordenadas por quién las usa: primero lo que ve el
   * cliente del sitio, después el panel, después la venta de eventos.
   */
  const secciones: { id: string; titulo: string; para: string; cuerpo: React.ReactNode }[] = [
    {
      id: 'sitio', titulo: 'Reservas del sitio',
      para: 'Qué días y a qué hora se abre, cuánta gente cabe y qué fechas ofrece el sitio público.',
      cuerpo: <>
        {campo('dias', 'Días que se abre',
          'Separados por coma: “sáb,dom” y “sabado domingo” son lo mismo. Estos días se abren ' +
          'solos cada mañana, públicos y con el cupo normal, hasta los días hacia adelante. Un día ' +
          'que ya está en el calendario no se toca: para que uno no se abra, ciérralo.',
          textoLibre('dias', deDiasSemana(config.diasAbiertos), (t) => ({ diasAbiertos: t })))}
        {campo('apertura', 'Hora de apertura',
          'Una sola jornada por día, sin bloques.',
          textoLibre('apertura', config.horaApertura, (t) => ({ horaApertura: t }), '13:00'))}
        {campo('cierre', 'Hora de cierre',
          'También es el horario que propone el contrato si la cotización no dice otro.',
          textoLibre('cierre', config.horaCierre, (t) => ({ horaCierre: t }), '18:00'))}
        {campo('cupo', 'Cupo normal de un día',
          'Las personas que caben en una jornada, niños incluidos. Es el cupo con que se abre ' +
          'solo cada día nuevo; cada día se puede cambiar aparte.',
          numerico('cupo', config.cupoNormal, (n) => ({ cupoNormal: n }), { min: 1, max: 5000, unidad: 'personas' }))}
        {campo('maxima', 'Capacidad máxima del recinto',
          'El tope al ampliar el cupo de un día cuando entraron reservas pagadas sobre reservas ' +
          'sin pagar. Más allá de esto hay que soltar una reserva sin pagar.',
          numerico('maxima', config.capacidadMaxima, (n) => ({ capacidadMaxima: n }), { min: 1, max: 100000, unidad: 'personas' }))}
        {campo('futuro', 'Días hacia adelante',
          'Hasta cuántos días en el futuro se ofrecen fechas en el sitio, para no tomar ' +
          'reservas a un año plazo. Hasta ahí se abren solos los días que se abre.',
          numerico('futuro', config.diasAFuturo, (n) => ({ diasAFuturo: n }), { min: 1, max: 730, unidad: 'días' }))}
        {campo('pocos', 'Aviso de “últimos lugares”',
          'Desde cuántos lugares libres el sitio avisa que quedan pocos. Más arriba el ' +
          'visitante no ve ningún número.',
          numerico('pocos', config.avisoPocosLugares, (n) => ({ avisoPocosLugares: n }), { min: 0, max: 1000, unidad: 'lugares' }))}
      </>
    },
    {
      id: 'calendario', titulo: 'Calendario del panel',
      para: 'Los colores y avisos que ve el equipo. El visitante del sitio no los ve.',
      cuerpo: <>
        {campo('amarillo', 'Semáforo: pasa a amarillo',
          'Porcentaje de ocupación desde el que un día se ve amarillo.',
          numerico('amarillo', Math.round(config.cortes.amarillo * 100),
            (n) => ({ cortes: { ...config.cortes, amarillo: n / 100 } }), { min: 1, max: 100, unidad: '%' }))}
        {campo('rojo', 'Semáforo: pasa a rojo',
          'Tiene que ser mayor que el amarillo; si no, vuelven los dos a 60 y 85.',
          numerico('rojo', Math.round(config.cortes.rojo * 100),
            (n) => ({ cortes: { ...config.cortes, rojo: n / 100 } }), { min: 1, max: 100, unidad: '%' }))}
        {campo('grupo', 'Grupo grande',
          'Desde cuántas personas una reserva se avisa en la línea de la semana. En 0 no avisa.',
          numerico('grupo', config.grupoGrande, (n) => ({ grupoGrande: n }), { min: 0, max: 1000, unidad: 'personas' }))}
      </>
    },
    {
      id: 'cotizaciones', titulo: 'Cotizaciones',
      para: 'Cómo se trabaja una cotización: cuánto vale desde que se manda, cuándo el panel ' +
            'pregunta cómo va, y dónde se guardan los comprobantes. Lo que se le ofrece al ' +
            'cliente está en Condiciones para el cliente.',
      cuerpo: <>
        {campo('vigencia', 'Vigencia',
          'Cuántos días vale una cotización desde que se manda al cliente. Nunca pasa del día ' +
          'antes del evento. En 0 no vence.',
          numerico('vigencia', config.vigenciaPresupuesto, (n) => ({ vigenciaPresupuesto: n }), { min: 0, max: 365, unidad: 'días' }))}
        {campo('seguimientoDias', 'Seguimiento: sin respuesta',
          'A cuántos días de mandada una cotización, sin moverse, el panel pregunta "¿y?". ' +
          'Cada cotización lo puede cambiar. En 0 no pregunta.',
          numerico('seguimientoDias', config.seguimientoDias, (n) => ({ seguimientoDias: n }), { min: 0, max: 365, unidad: 'días' }))}
        {campo('avisoEvento', 'Seguimiento: antes del evento',
          'Cuántos días antes del evento pregunta si se ganó o se perdió. Cada cotización lo ' +
          'puede cambiar. En 0 no pregunta.',
          numerico('avisoEvento', config.avisoEvento, (n) => ({ avisoEvento: n }), { min: 0, max: 365, unidad: 'días antes' }))}
        {campo('driveComprobantes', 'Carpeta de comprobantes',
          'La unidad compartida de Google Drive donde se guardan los comprobantes y los ' +
          'contratos firmados. Pega el link de la unidad. La cuenta del panel tiene que ser ' +
          'miembro con rol Gestor de contenido.',
          <input type="text" defaultValue={config.driveComprobantes} className={ENTRADA}
            placeholder="https://drive.google.com/drive/folders/…"
            onBlur={(e) => e.target.value.trim() !== config.driveComprobantes &&
              guardar({ driveComprobantes: idDeDrive(e.target.value) }, 'driveComprobantes')} />)}
      </>
    },
    {
      // **Condiciones para el cliente** (2026-11-23, regla A, `condiciones.ts`):
      // lo que antes estaba repartido entre Cotizaciones y Contrato, junto,
      // porque es una sola idea: lo más generoso que se le ofrece al cliente.
      id: 'condiciones', titulo: 'Condiciones para el cliente',
      para: 'Lo más generoso que un vendedor puede ofrecerle a un cliente sin pedir permiso: el ' +
            'anticipo, el saldo, los descuentos, los cambios de fecha y la cancelación. Cada ' +
            'cotización nueva parte con estos valores y el vendedor los puede endurecer —más ' +
            'anticipo, menos devolución—, no ablandar. Para algo más generoso pide condiciones ' +
            'especiales en la cotización, y lo aprueba la gerencia general, el encargado de pagos ' +
            'o el administrador. Lo que el cliente ya recibió y los contratos firmados no cambian.',
      cuerpo: <>
        {grupo('El pago', <>
          {campo('anticipoPct', 'Anticipo',
            'El % del total que se paga al firmar para reservar la fecha. Sin él pagado la ' +
            'cotización no pasa a ganada. Es el mínimo: el vendedor no puede pedir menos. En 0 ' +
            'no hay anticipo.',
            numerico('anticipoPct', config.anticipoPct, (n) => ({ anticipoPct: n }), { min: 0, max: 100, unidad: '%' }))}
          {campo('saldoDias', 'Saldo',
            'Hasta cuántos días antes del evento se paga el resto. Es el mínimo: el vendedor no ' +
            'puede dejarlo para más tarde. Si el evento ya está más cerca que esto, el contrato ' +
            'dice que todo se paga al firmar.',
            numerico('saldoDias', config.saldoDias, (n) => ({ saldoDias: n }), { min: 0, max: 365, unidad: 'días antes' }))}
        </>)}
        {grupo('Descuentos', <>
          {campo('descuentos', 'Descuentos con botón',
            'Los que se ofrecen con un toque, por línea y sobre el total. Separados por coma. El ' +
            'más alto es el tope: uno mayor se pide como condición especial.',
            textoLibre('descuentos', config.descuentos.join(', '),
              (t) => ({ descuentos: t }) as unknown as Cambio, '5, 10, 15'))}
        </>)}
        {grupo('Cambios de fecha y cancelación', <>
          {campo('cambiosFecha', 'Cambios de fecha',
            'Cuántas veces el cliente puede cambiar la fecha del evento, por fuerza mayor y si ' +
            'la nueva está libre. Es el máximo que ofrece un vendedor. En 0 el contrato no ' +
            'ofrece cambios.',
            numerico('cambiosFecha', config.cambiosFecha, (n) => ({ cambiosFecha: n }), { min: 0, max: 10, unidad: 'veces' }))}
          {campo('cambiosFechaDias', 'Aviso para cambiar la fecha',
            'Con cuántos días de anticipación, como mínimo, el cliente puede pedir cambiar la ' +
            'fecha. Con el evento más cerca, el contrato no ofrece el cambio y en el panel la ' +
            'fecha de una ganada solo la mueve la gerencia, el encargado de pagos o el ' +
            'administrador. En 0, sin plazo.',
            numerico('cambiosFechaDias', config.cambiosFechaDias, (n) => ({ cambiosFechaDias: n }), { min: 0, max: 365, unidad: 'días antes' }))}
          {campo('cancelacionDias', 'Cancelación',
            'Hasta cuántos días antes del evento el cliente puede cancelar con devolución. Es lo ' +
            'menos que ofrece un vendedor: no puede dejar cancelar más tarde. Con el evento más ' +
            'cerca, el contrato no ofrece cancelar. En 0 el contrato no ofrece cancelar.',
            numerico('cancelacionDias', config.cancelacionDias, (n) => ({ cancelacionDias: n }), { min: 0, max: 365, unidad: 'días antes' }))}
          {campo('reembolsoPct', 'Devolución al cancelar',
            'Qué % de lo que el cliente ya pagó se le devuelve si cancela a tiempo. Es el máximo ' +
            'que ofrece un vendedor. En 0, sin devolución.',
            numerico('reembolsoPct', config.reembolsoPct, (n) => ({ reembolsoPct: n }), { min: 0, max: 100, unidad: '% de lo pagado' }))}
        </>)}
      </>
    },
    {
      // **Extras y arriendo** (2026-11-20, lo pidió el cliente): las reglas de
      // lo que se cotiza aparte del menú. El show ecuestre en un día privado
      // y, desde el 2026-11-23, el arriendo mínimo.
      id: 'extras-arriendo', titulo: 'Extras y arriendo',
      para: 'Los mínimos del show ecuestre y del arriendo en las cotizaciones. Rigen para el ' +
            'vendedor y el encargado de operaciones; la gerencia general, el encargado de pagos y ' +
            'el administrador pueden pasar por encima.',
      cuerpo: <>
        {grupo('Show ecuestre', <>
        {campo('showGratisDesde', 'Show ecuestre sin costo desde',
          'En un día privado o exclusivo, desde cuántas personas de la cotización se puede ' +
          'dejar el show incluido sin costo. En un día público va siempre incluido. En 0 ' +
          'no hay mínimo.',
          numerico('showGratisDesde', config.showGratisDesde, (n) => ({ showGratisDesde: n }), { min: 0, max: 100000, unidad: 'personas' }))}
        {campo('showMinimo', 'Show ecuestre: mínimo bajo ese número',
          'Lo menos que se cobra por el show cuando son menos personas, neto: se le suma el ' +
          'IVA. Si el show no va en la cotización, no se cobra. En 0 no hay mínimo.',
          numerico('showMinimo', config.showMinimo, (n) => ({ showMinimo: n }), { min: 0, max: 100000000, unidad: '+ IVA' }))}
        </>)}
        {grupo('Arriendo mínimo', <>
        {/* **El arriendo mínimo** (2026-11-23, lo pidió el cliente). Cada tramo
            en una fila: hasta cuántas personas y el mínimo, uno bajo el otro
            en la columna de los valores. Ver `reglaArriendoDe()`. */}
        {tramoArriendo('arriendoPrivado1', 'Día no público: 1er tramo',
          'Un día que no está abierto al público —cerrado, privado o fuera del calendario, en la ' +
          'práctica de lunes a viernes—: hasta esta gente, el arriendo cuesta al menos este monto, ' +
          'neto. Cubre lo que cuesta abrir el día para el grupo. Si ese día ya tiene otras reservas, ' +
          'no hay mínimo. En 0 se apaga el tramo.',
          'arriendoPrivadoHasta1', 'arriendoPrivadoMinimo1')}
        {tramoArriendo('arriendoPrivado2', 'Día no público: 2º tramo',
          'El tramo siguiente, para un grupo un poco más grande. Desde aquí, sin mínimo. En 0 se apaga.',
          'arriendoPrivadoHasta2', 'arriendoPrivadoMinimo2')}
        {tramoArriendo('arriendoExclusivo1', 'Exclusivo en día público: 1er tramo',
          'Un evento exclusivo en un sábado, domingo o feriado abierto al público: hasta esta ' +
          'gente, el arriendo cuesta al menos este monto, neto. Repone lo que deja el público ese ' +
          'día. Un grupo que se suma al público sin exclusividad no paga arriendo. En temporada ' +
          'alta conviene subirlo. En 0 se apaga el tramo.',
          'arriendoExclusivoHasta1', 'arriendoExclusivoMinimo1')}
        {tramoArriendo('arriendoExclusivo2', 'Exclusivo en día público: 2º tramo',
          'El tramo siguiente. Desde aquí, sin mínimo. En 0 se apaga.',
          'arriendoExclusivoHasta2', 'arriendoExclusivoMinimo2')}
        </>)}
        {grupo('Eventos exclusivos', <>
        {campo('exclusivoDias', 'Liberar un día con reservas',
          'Hasta cuántos días antes del evento se puede pedir liberar un día que ya tiene ' +
          'reservas, para un evento exclusivo. Con menos, va como caso especial y quien ' +
          'aprueba anota el motivo.',
          numerico('exclusivoDias', config.exclusivoDias, (n) => ({ exclusivoDias: n }), { min: 0, max: 365, unidad: 'días antes' }))}
        {campo('fechasSinExclusivo', 'Días sin arriendo exclusivo',
          'Las fechas en que no se arrienda en exclusiva porque el público deja más que cualquier ' +
          'arriendo: Día de la Madre, del Padre, Fiestas Patrias. Separadas por coma, como ' +
          '2027-05-09 o 9-5-2027. Ahí el vendedor no puede marcar el evento exclusivo; lo decide la ' +
          'gerencia, el encargado de pagos o el administrador.',
          textoLibre('fechasSinExclusivo', config.fechasSinExclusivo.join(', '),
            (t) => ({ fechasSinExclusivo: t }), '2027-05-09, 2027-06-20'))}
        </>)}
      </>
    },
    {
      id: 'empresa', titulo: 'La empresa',
      para: 'Quién vende: sale en el encabezado de la cotización y del contrato, y donde se ' +
            'firma. Este panel es de una sola empresa; la otra tendrá el suyo.',
      cuerpo: <>
        {empresa('nombre', 'Nombre comercial', 'Como la conocen los clientes.')}
        {empresa('razonSocial', 'Razón social', 'Como figura en el SII.')}
        {empresa('rut', 'RUT de la empresa', '')}
        {empresa('domicilio', 'Domicilio', '')}
        {empresa('representante', 'Representante legal', 'Su nombre completo, como firma el contrato.')}
        {empresa('ciRepresentante', 'Cédula del representante', 'Su RUT, para el contrato.')}
        {empresa('ciudadFirma', 'Ciudad de firma', 'El contrato empieza “En …, a”.', 'Pirque')}
        {empresa('whatsapp', 'WhatsApp de ventas', 'El que va al pie de la cotización.')}
        {empresa('transferencia', 'Datos para transferir',
          'Banco, tipo y número de cuenta, para el anticipo y el saldo de los clientes.')}
      </>
    },
    {
      id: 'mantencion', titulo: 'Mantención',
      para: 'Lo que se toca cuando algo parece faltar, no a diario.',
      cuerpo: (
        <div className="py-4 lg:col-span-2 lg:py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={revisarShopify} disabled={revisando} className="boton min-h-[44px]">
              {revisando ? 'Revisando…' : 'Revisar Shopify ahora'}
            </button>
            <AyudaCorta titulo="Revisar Shopify ahora">
              Las reservas llegan solas apenas se paga en Shopify, y una vez al día se revisa que no falte
              ninguna. Este botón hace esa revisión ahora: sirve si sospechas que una reserva no apareció.
              Apretarlo de más no duplica nada.
            </AyudaCorta>
            {resumen && <span className="text-[14px] text-hueso/70">{resumen}</span>}
          </div>
          <ImportarCRM />
          <PasoAProduccion />
        </div>
      )
    }
  ];

  return (
    <section>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
        Configuración<Ayuda tema="configuracion" />
      </h1>
      <AvisoFijo clave="config-intro" className="mb-4 max-w-2xl">
        Cada campo se guarda solo al salir de él. Estos valores viven en la pestaña{' '}
        <code className="text-hueso/80">Config</code> de la planilla, así que cambiarlos no
        necesita un despliegue.
      </AvisoFijo>

      {/* El índice: un botón por sección, para no recorrer la página entera. */}
      <nav aria-label="Secciones" className="mb-6 flex flex-wrap gap-2 lg:mb-4">
        {secciones.map((x) => (
          <a key={x.id} href={`#${x.id}`} className="boton tecla min-h-[40px]">{x.titulo}</a>
        ))}
      </nav>

      <div className="space-y-6 lg:space-y-4">
        {secciones.map((x) => (
          <section key={x.id} id={x.id} aria-labelledby={`t-${x.id}`}
            className="scroll-mt-4 rounded-lg border border-hueso/15 bg-panel px-4 pt-4 sm:px-5 lg:pt-3">
            {/* Para qué sirve la sección, en su `?`. */}
            <h2 id={`t-${x.id}`} className="flex items-center gap-2 text-base font-bold uppercase tracking-wide text-oro">
              {x.titulo} <AyudaCorta titulo={x.titulo}>{x.para}</AyudaCorta>
            </h2>
            {/* Con vista gerencia, los campos se ven apagados: `fieldset
                disabled` los apaga todos de una vez. */}
            {/* **En el computador, los campos van en dos columnas** (2026-11-21,
                el computador más compacto): cada uno es un nombre y una caja
                angosta, y a todo el ancho la página medía el doble. La segunda
                columna parte sin línea arriba, como la primera. */}
            <fieldset disabled={soloMira}
              className="m-0 mt-2 min-w-0 border-0 border-t border-hueso/15 p-0
                         lg:grid lg:grid-cols-2 lg:gap-x-10 lg:[&>*:nth-child(2):not([data-grupo])]:border-t-0">
              {x.cuerpo}
            </fieldset>
          </section>
        ))}
      </div>

      <AvisoFijo clave="config-clave" className="mt-6 max-w-2xl">
        La clave del panel no se cambia acá: vive en Vercel como variable de
        entorno. Guardarla en la planilla sería dejar la contraseña del panel en
        un documento compartido.
      </AvisoFijo>
    </section>
  );
}
