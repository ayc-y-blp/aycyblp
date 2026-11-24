'use client';
/**
 * **Otra empresa nueva, sin salir del producto** (2026-11-24, lo pidió el
 * cliente: *"se agrega una empresa nueva, pero termina en otra página. Tienes
 * que ingresar la página, guardar… solo un botón, guardar… que el usuario
 * pueda entrar en una nueva empresa que cobra y al final termina en su pop
 * correcto, en su flujo correcto"*).
 *
 * Se abre desde *Lo cobra → Otra empresa…* de un producto. Sus datos, **un solo
 * botón** —*Guardar empresa*—, y al guardar la empresa queda en *🤝 Otras
 * empresas* y elegida en ese producto; la ventanita se cierra y se sigue en el
 * mismo producto. Lo guarda `POST /api/otras-empresas`.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { avisar } from './AvisoFlotante';
import { limpiarOtraEmpresa, type OtraEmpresa } from '@/lib/otrasEmpresas';

const ENTRADA = 'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] focus:border-oro focus:outline-none lg:py-1.5';

/** Los campos de una empresa: los mismos de *🤝 Otras empresas*. */
export const CAMPOS_EMPRESA: { k: keyof Omit<OtraEmpresa, 'activa'>; rotulo: string; placeholder: string; tipo?: string }[] = [
  { k: 'nombre', rotulo: 'Nombre', placeholder: 'Como sale en la cotización' },
  { k: 'que', rotulo: 'Qué hace', placeholder: 'Karting, taller de queso, transfer…' },
  { k: 'rut', rotulo: 'RUT', placeholder: '76.111.222-3' },
  { k: 'contacto', rotulo: 'Contacto', placeholder: 'Con quién se habla' },
  { k: 'telefono', rotulo: 'Teléfono', placeholder: '+56 9 …', tipo: 'tel' },
  { k: 'correo', rotulo: 'Correo', placeholder: 'para mandarle el detalle', tipo: 'email' }
];

export default function EmpresaNueva({ producto, onCerrar, onGuardada }: {
  /** El producto desde donde se abre: para decir dónde queda elegida. */
  producto: string;
  onCerrar: () => void;
  /** La lista guardada y el nombre de la empresa, para elegirla en el producto. */
  onGuardada: (empresas: OtraEmpresa[], nombre: string) => void;
}) {
  const [e, setE] = useState<OtraEmpresa>(limpiarOtraEmpresa({}));
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!e.nombre.trim()) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/otras-empresas', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ empresa: e })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
      avisar(d.yaEstaba ? `${d.nombre} ya estaba: quedó elegida` : `${d.nombre} quedó guardada y elegida`);
      onGuardada(d.empresas, d.nombre);
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo="🤝 Otra empresa nueva" onCerrar={onCerrar} ancho="max-w-xl">
      <div className={`${marcoGrupo(false)} p-3`}>
        <p className={TITULO_GRUPO}>La empresa que cobra{producto ? ` ${producto}` : ''}</p>
        <div className="mt-2 space-y-2">
          {CAMPOS_EMPRESA.map((c) => (
            <div key={c.k} className="fila-ficha sm:items-center">
              <p className="rotulo-ficha">{c.rotulo}</p>
              <input value={e[c.k]} type={c.tipo ?? 'text'} className={ENTRADA} placeholder={c.placeholder}
                aria-label={c.rotulo} autoFocus={c.k === 'nombre'}
                onChange={(ev) => setE({ ...e, [c.k]: ev.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <span className="mr-auto text-[14px] text-hueso/75">
          {e.nombre.trim()
            ? `Queda en 🤝 Otras empresas y elegida${producto ? ` en ${producto}` : ''}.`
            : 'Escríbele un nombre para guardarla.'}
        </span>
        <button type="button" disabled={!e.nombre.trim() || guardando} onClick={() => void guardar()}
          className="boton boton-relleno min-h-[44px] disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar empresa'}
        </button>
      </div>
    </Dialogo>
  );
}
