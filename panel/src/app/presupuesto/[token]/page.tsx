/**
 * El presupuesto como lo ve el cliente.
 *
 * **Es un link, y se imprime a PDF desde el navegador.** Se eligió sobre
 * generar el archivo en el servidor: sin dependencias nuevas, sale un PDF
 * de verdad, se manda por WhatsApp como los otros links del panel, y si se
 * corrige un precio el mismo link ya muestra lo corregido — un adjunto
 * viejo, en cambio, nadie sabe que lo es. Ver `BotonImprimir`.
 *
 * **Es un componente de servidor y lee la planilla directo**, igual que
 * `/mi/`: así no existe ninguna ruta de API nueva que alguien pueda llamar
 * con un token prestado para sacar datos en bruto. Lo único que sale de acá
 * es el HTML de una cotización.
 *
 * **Un solo link para todas las alternativas** (2026-11-11, lo pidió el
 * cliente). Mientras se decide, la hoja muestra la A, la B y la C una debajo
 * de la otra, cada una con su tabla y sus condiciones; elegida una, el mismo
 * link muestra solo esa (`paraElLink()`). Cualquier token del grupo abre lo
 * mismo, así que no importa cuál se mandó.
 *
 * **Lo que NO tiene, a propósito: un botón de "acepto".** Sería una puerta
 * de escritura sin contraseña sobre un dato que mueve el cupo de un día. El
 * cliente responde por WhatsApp y el encargado lo marca en el panel.
 */
import { enEmpresaDeLaPagina } from '@/lib/empresaPagina';
import { leerPresupuestos, leerLineasPresupuesto, leerClientes, leerConfig, leerOtrasEmpresas } from '@/lib/datos';
import type { OtraEmpresa } from '@/lib/otrasEmpresas';
import { desglose, type ProductoDetallado } from '@/lib/detalle';
import QueIncluye, { Producto } from '@/components/QueIncluye';
import { porToken, lineasDe, gentePosible, cuentasDe,
         estadoVisible, folioDe, DOCUMENTO } from '@/lib/presupuestos';
import { clienteDe, grupoDe, letraDe, paraElLink } from '@/lib/cotizar';
import type { Presupuesto, LineaPresupuesto } from '@/lib/presupuestos';
import type { Config } from '@/lib/config';
import { condicionesDe } from '@/lib/cobros';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';
import BotonImprimir from '@/components/BotonImprimir';
import TablaCotizacion from '@/components/TablaCotizacion';
import { negocioDe } from '@/lib/negocio';
import { vistaPrevia } from '@/lib/vistaPrevia';

/** El título al llegar el link: ver `lib/vistaPrevia.ts`. */
export const metadata = vistaPrevia('Cotización', 'La cotización del evento, con su detalle y las condiciones de pago.');

export const dynamic = 'force-dynamic';

async function PaginaDeLaEmpresa({ params }: { params: { token: string } }) {
  const [lista, todas, clientes, cfg] = await Promise.all([
    leerPresupuestos(), leerLineasPresupuesto(),
    leerClientes().catch(() => []), leerConfig()
  ]);
  const negocio = negocioDe(cfg.empresa);
  const p = porToken(lista, decodeURIComponent(params.token ?? ''));

  // **El mismo mensaje para un link inventado y para uno que ya no está**,
  // igual que en `/mi/`: decir "ese presupuesto se borró" confirmaría que
  // existió, y a quien sí es cliente no le sirve de nada — la salida es la
  // misma, pedirlo de nuevo.
  if (!p) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">Este link no sirve</h1>
        <p className="mt-3 text-sm text-hueso/70">
          Puede estar mal copiado, o puede que te hayan mandado uno nuevo.
          Escríbenos y te lo reenviamos.
        </p>
      </section>
    );
  }

  const alts = paraElLink(p, lista);
  const varias = alts.length > 1;
  // Lo que es de la conversación —el cliente, el documento, la vigencia— se
  // lee de la primera que se muestra; lo de cada versión, de cada una.
  const q = alts[0];
  const lineas = lineasDe(todas, q.id);
  const personas = gentePosible(q, lineas);
  const cliente = clienteDe(q, clientes);
  // Con factura, los datos de facturación de la ficha van en la hoja.
  const ficha = q.documento === DOCUMENTO.factura
    ? clientes.find((c) => c.id === q.idCliente) : undefined;
  const estado = estadoVisible(q, hoy());
  // **Qué incluye** (2026-11-24, `lib/detalle.ts`): lo común arriba y lo
  // propio de cada alternativa en su caja. Lo que cobra otra empresa ya va
  // aparte, con su detalle, en la tabla.
  // Cada línea trae su texto, el que se escribió para esta cotización.
  const des = desglose(alts.map((a) => ({ id: a.id,
    lineas: lineasDe(todas, a.id).filter((l) => !String(l.loCobra ?? '').trim()) })));
  const vencido = estado === 'Vencida';
  // **Los datos de las otras empresas** (2026-11-24): se leen solo si alguna
  // alternativa trae algo que cobra otra empresa.
  const empresas: OtraEmpresa[] = alts.some((a) => lineasDe(todas, a.id).some((l) => String(l.loCobra ?? '').trim()))
    ? await leerOtrasEmpresas().catch(() => []) : [];

  return (
    <section className="documento mx-auto max-w-2xl">
      {/* Lo que no va al papel: el botón. Se esconde al imprimir. */}
      <div className="sin-imprimir mb-6 flex flex-wrap items-center gap-3">
        <BotonImprimir />
        <span className="text-[13px] text-hueso/60">
          Se abre la impresión del navegador: elige <strong>Guardar como PDF</strong>.
        </span>
      </div>

      {vencido && (
        <p className="mb-6 rounded border border-ambar/50 bg-ambar/5 px-3 py-2 text-sm
                      text-ambar-texto">
          <strong>Esta cotización venció</strong> el{' '}
          <span className="first-letter:uppercase">{enPalabras(q.validoHasta)}</span>. Escríbenos
          y te lo actualizamos con los precios de hoy.
        </p>
      )}

      <header className="border-b border-hueso/20 pb-5">
        <p className="text-sm font-bold uppercase tracking-widest text-oro">
          {negocio.nombre}
        </p>
        <h1 className="mt-3 text-2xl font-bold uppercase tracking-wide">Cotización</h1>
        {(negocio.razonSocial || negocio.rut) && (
          <p className="text-[13px] text-hueso/60">
            {[negocio.razonSocial, negocio.rut && `RUT ${negocio.rut}`].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="mt-1 text-[13px] text-hueso/60">
          N° {folioDe({ id: grupoDe(q) })}
          {!varias && letraDe(q, lista) && <> · Alternativa {letraDe(q, lista)}</>}
          {q.creado && <> · emitido el {q.creado.slice(0, 10)}</>}
        </p>
      </header>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            Para
          </p>
          <p className="mt-1 text-base font-semibold">{cliente.nombre}</p>
          {cliente.empresa && <p className="text-sm text-hueso/70">{cliente.empresa}</p>}
          {cliente.telefono && <p className="text-sm text-hueso/70">{cliente.telefono}</p>}
          {cliente.email && <p className="text-sm text-hueso/70">{cliente.email}</p>}
          {q.documento && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">{q.documento === DOCUMENTO.sin
                ? 'Sin documento' : `Con ${q.documento.toLowerCase()}`}</span>
            </p>
          )}
          {ficha && (ficha.rut || ficha.giro || ficha.domicilio) && (
            <div className="mt-1 text-sm text-hueso/70">
              {ficha.rut && <p>RUT {ficha.rut}</p>}
              {ficha.giro && <p>Giro: {ficha.giro}</p>}
              {ficha.domicilio && <p>{ficha.domicilio}</p>}
            </div>
          )}
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            Fecha del evento
          </p>
          <p className="mt-1 text-base font-semibold first-letter:uppercase">
            {q.fecha ? enPalabras(q.fecha) : `Por definir: ${q.periodo}`}
          </p>
          {q.tipoEvento && <p className="text-sm text-hueso/70">{q.tipoEvento}</p>}
          {!varias && personas > 0 && (
            <p className="text-sm text-hueso/70">
              {personas} {personas === 1 ? 'persona' : 'personas'}
            </p>
          )}
        </div>
      </div>

      <QueIncluye casa={des.casa} comunes={des.comunes} varias={varias} />

      {varias && (
        <p className="mt-7 rounded border border-oro/50 bg-oro/[0.06] p-3 text-[15px]">
          <strong>Te ofrecemos {alts.length} alternativas.</strong> Míralas con calma y
          cuéntanos con cuál te quedas: {alts.map((a) => letraDe(a, lista)).join(', ')}.
        </p>
      )}

      {alts.map((a) => (
        <Alternativa key={a.id} p={a} letra={varias ? letraDe(a, lista) : ''} propios={des.propios[a.id] ?? []}
          lineas={lineasDe(todas, a.id)} cfg={cfg} distintaFecha={varias && a.fecha !== q.fecha} empresas={empresas} />
      ))}

      <div className="mt-7 border-t border-hueso/20 pt-5 text-[13px] text-hueso/70">
        {q.validoHasta && !vencido && (
          <p>
            <strong>Válido hasta el{' '}
              <span className="first-letter:uppercase">{enPalabras(q.validoHasta)}</span>.</strong>{' '}
            La fecha del evento se confirma al aceptar esta cotización; mientras
            tanto no está reservada.
          </p>
        )}
        {!q.validoHasta && (
          <p>
            La fecha del evento se confirma al aceptar esta cotización; mientras
            tanto no está reservada.
          </p>
        )}
        <p className="mt-3">
          ¿Lo tomamos? Escríbenos por WhatsApp al{' '}
          <strong>{negocio.whatsapp}</strong> o a {negocio.email}.
        </p>
        <p className="mt-3 text-hueso/55">
          {negocio.nombre} · {negocio.direccion}
        </p>
      </div>
    </section>
  );
}

/**
 * Una alternativa en la hoja: su tabla y sus condiciones. Con varias lleva su
 * letra y su total arriba, para que el cliente pueda decir "la B" sin tener
 * que sumar nada.
 *
 * **Las *Notas internas* no salen acá** (2026-11-25, lo marcó el cliente con
 * una foto: *"la cotización no tiene que contener la nota del CRM… eso es
 * interno"*). El campo se llama *Notas internas* en el panel, pero esta hoja
 * —la del link, el WhatsApp y el PDF— lo imprimía al final; con el importador
 * del CRM, que deja ahí su resumen, salía en todas las importadas. Una prueba
 * de `lib/prueba.ts` fija que esta página no lo vuelva a mostrar.
 */
function Alternativa({ p, letra, lineas, cfg, distintaFecha, propios, empresas }: {
  p: Presupuesto; letra: string; lineas: LineaPresupuesto[]; cfg: Config; distintaFecha: boolean;
  empresas: OtraEmpresa[];
  /** Lo que tiene esta alternativa y las otras no, con su detalle. */
  propios: ProductoDetallado[];
}) {
  // **Las cuentas como en una cotización** (Fase 2): cada línea en neto, el
  // descuento sobre el total, y el IVA encima. Ver `cuentasDe()`.
  const cuentas = cuentasDe(lineas, p.descuento);
  const cond = condicionesDe(p, cuentas.total, cfg);
  // **Un plazo que ya pasó no se ofrece** (regla B, 2026-11-23): con el evento
  // más cerca que el plazo del saldo, todo se paga al reservar, como dice el
  // contrato. Decir *"hasta el lunes pasado"* no le sirve a nadie.
  const saldoVencido = !!cond.saldoHasta && cond.saldoHasta < hoy();
  const personas = gentePosible(p, lineas);
  return (
    <div className={letra ? 'mt-7 break-inside-avoid rounded-lg border-2 border-hueso/20 p-4' : 'mt-7'}>
      {letra && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-hueso/15 pb-2">
          <h2 className="text-lg font-bold uppercase tracking-wide">Alternativa {letra}</h2>
          <p className="text-base font-semibold">{enPesos(cuentas.total)}</p>
          <p className="w-full text-sm text-hueso/70">
            {distintaFecha && <span className="first-letter:uppercase inline-block">
              {p.fecha ? enPalabras(p.fecha) : `Por definir: ${p.periodo}`}</span>}
            {distintaFecha && personas > 0 && ' · '}
            {personas > 0 && `${personas} ${personas === 1 ? 'persona' : 'personas'}`}
          </p>
        </div>
      )}
      {propios.length > 0 && (
        <div className="mb-4 break-inside-avoid rounded border border-oro/40 bg-oro/[0.05] p-3">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-oro">Lo que cambia en la {letra}</p>
          {propios.map((x, i) => <Producto key={x.nombre} p={x} primero={i === 0} />)}
        </div>
      )}
      <TablaCotizacion lineas={lineas} cuentas={cuentas} descuento={p.descuento}
        uf={p.uf} fechaUF={p.fechaUF} empresas={empresas} />

      {/* **Las condiciones de pago**, de la misma función que usa la
          pantalla (y el contrato después): no pueden decir cosas distintas. */}
      {cuentas.total > 0 && (
        <div className="mt-5 rounded border border-hueso/15 p-3 text-sm">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
            Condiciones de pago
          </p>
          {cond.pct > 0 ? (
            <p className="mt-1">
              Anticipo{cond.fijo ? '' : ` ${cond.pct}%`}: <strong>{enPesos(cond.anticipo)}</strong> para reservar la fecha.
              Saldo: <strong>{enPesos(cond.saldo)}</strong>
              {saldoVencido
                ? <> al reservar, porque el evento es antes del plazo de {cond.dias} días.</>
                : cond.saldoHasta
                ? <> hasta el <span>{enPalabras(cond.saldoHasta)}</span>.</>
                : <>, {cond.dias} días antes del evento.</>}
            </p>
          ) : (
            <p className="mt-1">
              Sin anticipo. Total <strong>{enPesos(cond.saldo)}</strong>
              {saldoVencido
                ? <> al reservar, porque el evento es antes del plazo de {cond.dias} días.</>
                : cond.saldoHasta
                ? <> hasta el <span>{enPalabras(cond.saldoHasta)}</span>.</>
                : <>, {cond.dias} días antes del evento.</>}
            </p>
          )}
          {cfg.empresa.transferencia && (
            <p className="mt-1 text-hueso/70">Datos para transferir: {cfg.empresa.transferencia}</p>
          )}
        </div>
      )}

    </div>
  );
}

/** La dirección dice de qué empresa es lo que se lee (ver `empresaPagina.ts`). */
export default function Pagina(props: Parameters<typeof PaginaDeLaEmpresa>[0]) {
  return enEmpresaDeLaPagina(() => PaginaDeLaEmpresa(props));
}
