'use client';
/**
 * **Productos → 🤝 Otras empresas** (2026-11-24, `lib/otrasEmpresas.ts`): las
 * que prestan y cobran directamente algo que se vende con el evento —el
 * karting, el taller de queso, un transfer—, con sus datos. Se eligen en un
 * producto (*Lo cobra otra empresa*) y salen en la cotización, en el contrato
 * y en el botón para coordinar por WhatsApp.
 *
 * - **Una tarjeta por empresa**, como las promociones: cerrada dice qué hace y
 *   sus datos; abierta, los campos en columnas.
 * - **Se guarda con su botón**, no sola: el nombre lo usan los productos y las
 *   cotizaciones, y **cambiarlo los arrastra** (lo dice antes de guardar).
 * - **Los nombres que un producto ya usa y no están** (el *Karting Pirque*
 *   escrito a mano antes de la lista) salen arriba, con *+ Agregar*.
 */
import { useEffect, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import BotonGuardar from './BotonGuardar';
import { Aviso } from './CalendarView';
import { avisar } from './AvisoFlotante';
import { CUERPO_ABIERTO, LISTA_TARJETAS, PieCerrar, SignoAbrir, marcoTarjeta } from './TarjetaLista';
import { normalizar } from '@/lib/columnas';
import { datosEnFrase, limpiarOtraEmpresa, type OtraEmpresa } from '@/lib/otrasEmpresas';

const BOTON = 'boton min-h-[40px] lg:min-h-[36px] lg:py-1';
const ENTRADA = 'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none lg:py-1.5';

/** Una empresa en la pantalla: con el nombre con que se cargó, para saber si se renombró. */
type EnPantalla = OtraEmpresa & { antes: string };

const CAMPOS: { k: keyof Omit<OtraEmpresa, 'activa'>; rotulo: string; placeholder: string; tipo?: string }[] = [
  { k: 'que', rotulo: 'Qué hace', placeholder: 'Karting, taller de queso, transfer…' },
  { k: 'rut', rotulo: 'RUT', placeholder: '76.111.222-3' },
  { k: 'contacto', rotulo: 'Contacto', placeholder: 'Con quién se habla' },
  { k: 'telefono', rotulo: 'Teléfono', placeholder: '+56 9 …', tipo: 'tel' },
  { k: 'correo', rotulo: 'Correo', placeholder: 'para mandarle el detalle', tipo: 'email' }
];

export default function OtrasEmpresasEditor({ soloMira, onGuardar }: {
  soloMira: boolean;
  /** Avisa la lista guardada, para que el catálogo la ofrezca al elegir quién cobra. */
  onGuardar?: (empresas: OtraEmpresa[]) => void;
}) {
  const [lista, setLista] = useState<EnPantalla[] | null>(null);
  const [sinFicha, setSinFicha] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);

  const cargar = (d: { empresas: OtraEmpresa[]; sinFicha?: string[] }) => {
    setLista(d.empresas.map((e) => ({ ...e, antes: e.nombre })));
    setSinFicha(d.sinFicha ?? []);
  };
  useEffect(() => {
    fetch('/api/otras-empresas').then((r) => r.json()).then((d) => {
      if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
      cargar(d);
    }).catch((e) => setError(String(e)));
  }, []);

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!lista) return <p className="text-hueso/50">Cargando…</p>;

  const cambiar = (i: number, cambio: Partial<EnPantalla>) => {
    setLista(lista.map((e, k) => (k === i ? { ...e, ...cambio } : e)));
    setSucio(true);
  };
  const agregar = (nombre = '') => {
    setLista([...lista, { ...limpiarOtraEmpresa({ nombre }), antes: '' }]);
    setAbierta(lista.length); setSucio(true);
  };
  /** Los cambios de nombre de lo que ya estaba guardado: arrastran productos y cotizaciones. */
  const renombradas = lista.filter((e) => e.antes && e.nombre.trim() && normalizar(e.antes) !== normalizar(e.nombre));

  async function guardar() {
    if (!lista) return;
    const sinNombre = lista.findIndex((e) => !e.nombre.trim());
    if (sinNombre !== -1) {
      setAbierta(sinNombre);
      avisar('Una empresa sin nombre no se guarda: escríbele uno.', 'atencion');
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch('/api/otras-empresas', {
        method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ empresas: lista })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); return; }
      cargar(d); setSucio(false);
      onGuardar?.(d.empresas);
      avisar(d.frase ? `Guardado: pasaron ${d.frase} al nombre nuevo` : 'Otras empresas guardadas');
    } finally { setGuardando(false); }
  }

  const botonGuardar = (
    <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => void guardar()} texto="Guardar empresas" />
  );

  return (
    <div>
      {sinFicha.length > 0 && !soloMira && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-ambar/50 bg-ambar/5 px-3 py-2">
          <p className="text-[14px] font-semibold text-ambar-texto">
            {sinFicha.length === 1 ? 'Un producto dice que lo cobra' : 'Hay productos que dicen que los cobra'} una
            empresa que no está en la lista:
          </p>
          {sinFicha.map((n) => (
            <button key={n} type="button" className={BOTON}
              onClick={() => { agregar(n); setSinFicha(sinFicha.filter((x) => x !== n)); }}>
              + {n}
            </button>
          ))}
        </div>
      )}
      <ul className={LISTA_TARJETAS}>
        {lista.map((e, i) => (
          <li key={`${e.antes || 'nueva'}-${i}`} className={marcoTarjeta(abierta === i)}>
            <button type="button" aria-expanded={abierta === i} onClick={() => setAbierta(abierta === i ? null : i)}
              className={`flex min-h-[52px] w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left
                          hover:bg-hueso/5 ${e.activa ? '' : 'opacity-60'}`}>
              <SignoAbrir abierta={abierta === i} tamano="h-6 w-6 text-[14px]" />
              <span className="text-[16px] font-semibold">
                🤝 {e.nombre.trim() || <span className="text-hueso/50">Sin nombre</span>}
              </span>
              {!e.activa && (
                <span className="rounded-full border border-hueso/40 px-2 py-0.5 text-[13px] font-semibold text-hueso/80">apagada</span>
              )}
              {e.que && <span className="text-[14px] text-hueso/80">{e.que}</span>}
              {datosEnFrase(e) && <span className="text-[14px] text-hueso/60">· {datosEnFrase(e)}</span>}
            </button>
            {abierta === i && (
              <fieldset disabled={soloMira} className={`${CUERPO_ABIERTO} space-y-2 p-3`}>
                <div className="fila-ficha sm:items-center">
                  <p className="rotulo-ficha">Nombre</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={e.nombre} maxLength={60} className={`${ENTRADA} min-w-0 flex-1 sm:max-w-md`}
                      placeholder="Como sale en la cotización" aria-label="Nombre de la empresa"
                      onChange={(ev) => cambiar(i, { nombre: ev.target.value })} />
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <button type="button" className={BOTON} onClick={() => cambiar(i, { activa: !e.activa })}>
                        {e.activa ? 'Apagar' : 'Encender'}
                      </button>
                      <button type="button" className={`${BOTON} hover:border-rojo-fuerte hover:text-rojo-texto`}
                        onClick={() => { setLista(lista.filter((_, k) => k !== i)); setAbierta(null); setSucio(true); }}>
                        Quitar
                      </button>
                      {sucio && botonGuardar}
                    </div>
                  </div>
                </div>
                {/* En el computador, en dos columnas: apilados dejaban media tarjeta vacía. */}
                <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2 lg:space-y-0">
                  {CAMPOS.map((c) => (
                    <div key={c.k} className="fila-ficha sm:items-center">
                      <p className="rotulo-ficha">{c.rotulo}</p>
                      <input value={e[c.k]} type={c.tipo ?? 'text'} className={`${ENTRADA} sm:max-w-md`}
                        placeholder={c.placeholder} aria-label={c.rotulo}
                        onChange={(ev) => cambiar(i, { [c.k]: ev.target.value } as Partial<EnPantalla>)} />
                    </div>
                  ))}
                </div>
                {e.antes && e.nombre.trim() && normalizar(e.antes) !== normalizar(e.nombre) && (
                  <p className="text-[14px] font-semibold text-ambar-texto">
                    Al guardar, {e.antes} pasa a llamarse {e.nombre.trim()} en sus productos y en las cotizaciones.
                  </p>
                )}
              </fieldset>
            )}
            {abierta === i && <PieCerrar nombre={e.nombre.trim()} onCerrar={() => setAbierta(null)} />}
          </li>
        ))}
        {!lista.length && (
          <li className="rounded border border-hueso/20 px-3 py-4 text-[15px] text-hueso/70">
            Todavía no hay otras empresas. Agrega la del karting, la del taller de queso o la de un transfer.
          </li>
        )}
      </ul>
      {!soloMira && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="boton min-h-[44px] border-oro font-semibold" onClick={() => agregar()}>
            + Empresa nueva
          </button>
          <AyudaCorta tema="otrasEmpresas" />
          {renombradas.length > 0 && abierta === null && (
            <span className="text-[14px] font-semibold text-ambar-texto">
              {renombradas.map((e) => `${e.antes} → ${e.nombre.trim()}`).join(' · ')}: arrastra sus productos y cotizaciones.
            </span>
          )}
          {sucio && abierta === null && botonGuardar}
        </div>
      )}
    </div>
  );
}
