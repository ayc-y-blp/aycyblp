/**
 * **El periodo de un link personal, en un marco** (2026-11-24, lo pidió el
 * cliente: *"en el link personal, tanto de los trabajadores como de los
 * vendedores, quiero que por defecto se muestra el mes y con el valor de la
 * boleta del mes. Y ahí por elección se puede bajar a semanal"*).
 *
 * La misma pieza en los tres links —trabajador, colaborador de las
 * actividades extras y vendedor o socio comercial—: arriba **Mes · Semana**,
 * y debajo ◀ el mes o la semana ▶, sin tope. Es la idea de `ElegirPeriodo`
 * del panel (el periodo y sus flechas juntos en un marco dorado), hecha con
 * enlaces: estas páginas son de servidor y no llevan JavaScript.
 *
 * El elegido va con tinte y borde dorado, no relleno: el relleno de la página
 * es la pestaña *Lo que gané*.
 */
import { etiquetaSemana, rangoDelPeriodo, semanaParaElMes, mesDeLaSemana } from '@/lib/equipo';
import { mesEnPalabras, rangoEnPalabras, sumarDias, sumarMeses, type Fecha } from '@/lib/fechas';

/**
 * La etiqueta de una semana: *En curso*, *Semana pasada*, *Próxima semana*…
 *
 * **Cada una con su color**, que es lo que la hace reconocible sin leerla:
 * la en curso va **rellena de dorado y con un punto que late** —es la que
 * corre—, la pasada en verde porque es la que te pagan, las que vienen en
 * celeste. Y con borde, para que se distingan por forma y no solo por color.
 */
export function EtiquetaSemana({ texto }: { texto: string }) {
  const tono = texto === 'En curso'
    ? 'border-oro bg-oro text-tinta'
    : texto === 'Semana pasada'
      ? 'border-verde-fuerte/60 bg-verde/10 text-verde-texto'
      : texto.startsWith('En ') || texto === 'Próxima semana'
        ? 'border-cielo-fuerte/60 bg-cielo/10 text-cielo-texto'
        : 'border-hueso/25 text-hueso/70';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full
                      border-2 px-2.5 py-0.5 text-[13px] font-bold ${tono}`}>
      {texto === 'En curso' && (
        <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-tinta" />
      )}
      {texto}
    </span>
  );
}

/** Una flecha del navegador del periodo: 48px, para el dedo. */
export function Flecha({ href, children, etiqueta }: {
  href: string; children: React.ReactNode; etiqueta: string;
}) {
  return (
    <a href={href} aria-label={etiqueta} title={etiqueta}
       className="tecla flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
                  border-2 border-hueso/25 bg-panel text-xl font-bold text-hueso/85
                  hover:border-oro hover:text-oro">
      {children}
    </a>
  );
}

function Modo({ href, elegido, children }: { href: string; elegido: boolean; children: React.ReactNode }) {
  return (
    <a href={href} aria-current={elegido ? 'page' : undefined}
       className={`tecla flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 px-3
                   text-[15px] font-bold ${elegido
         ? 'border-oro bg-oro/15 text-hueso'
         : 'border-hueso/25 bg-panel text-hueso/75 hover:border-oro/60'}`}>
      {children}
    </a>
  );
}

/**
 * El marco del periodo. `enlace(q)` arma la dirección del link con la
 * consulta (`?p=…`), conservando el token.
 */
export default function ElegirPeriodoLink({ periodo, ahora, enlace }: {
  periodo: string; ahora: Fecha; enlace: (q: string) => string;
}) {
  const esMes = periodo.length === 7;
  const { desde, hasta } = rangoDelPeriodo(periodo);
  const mes = esMes ? periodo : mesDeLaSemana(desde);
  const esteMes = ahora.slice(0, 7);
  // El mes en curso va sin `?p=`: es la dirección limpia del link.
  const aMes = (m: string) => enlace(m === esteMes ? '' : `?p=${m}`);
  return (
    <div className="mt-5 rounded-2xl border-2 border-oro/60 bg-oro/[0.06] p-2.5">
      <nav aria-label="Ver por" className="flex gap-2">
        <Modo href={aMes(mes)} elegido={esMes}>📅 Mes</Modo>
        <Modo href={enlace(`?p=${esMes ? semanaParaElMes(periodo, ahora) : desde}`)} elegido={!esMes}>Semana</Modo>
      </nav>
      <div className="mt-2.5 flex items-center gap-2">
        {esMes ? (
          <>
            <Flecha href={aMes(sumarMeses(periodo, -1))} etiqueta="Mes anterior">◀</Flecha>
            <p className="min-w-0 flex-1 text-center text-[17px] font-bold first-letter:uppercase">{mesEnPalabras(periodo)}</p>
            <Flecha href={aMes(sumarMeses(periodo, 1))} etiqueta="Mes siguiente">▶</Flecha>
          </>
        ) : (
          <>
            <Flecha href={enlace(`?p=${sumarDias(desde, -7)}`)} etiqueta="Semana anterior">◀</Flecha>
            <div className="min-w-0 flex-1 text-center">
              <EtiquetaSemana texto={etiquetaSemana(desde, ahora)} />
              <p className="mt-1 text-[17px] font-bold leading-tight first-letter:uppercase">
                {rangoEnPalabras([desde, hasta])}
              </p>
            </div>
            <Flecha href={enlace(`?p=${sumarDias(desde, 7)}`)} etiqueta="Semana siguiente">▶</Flecha>
          </>
        )}
      </div>
    </div>
  );
}
