'use client';

/**
 * **La ficha de un cliente, para editarla: una sola pieza** (2026-11-23, lo
 * pidió el cliente: *"agregar botón editar cliente en cotización"*). La usan
 * la lista de *Clientes* y la ventana de cotizar (*✎ Editar cliente*, en el
 * paso Cliente). Los campos vivían dentro de `ClientesEditor`, y para
 * corregir un teléfono o un correo desde una cotización había que salir de
 * ella e ir a *Clientes*.
 *
 * - **Todo se guarda solo, salvo el nombre**, que se confirma con su botón:
 *   es el nombre de algo que otros usan (regla del autoguardado).
 * - **El servidor comprueba que la ficha sea de quien la toca**
 *   (`/api/clientes`, PATCH): un vendedor, solo las de sus clientes.
 * - **Si cambian el nombre, el teléfono o el correo**, el servidor corrige
 *   solo las reservas de sus cotizaciones ganadas.
 * - **La ficha de un cliente de otro vendedor** llega con el contacto tapado
 *   (`privacidad.ts`) y no se edita.
 *
 * Los campos y el componente viven fuera de todo componente a propósito: uno
 * declarado dentro de otro pierde el foco a la primera letra (ver `Campo`).
 */
import { useEffect, useState, type ReactNode } from 'react';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import CampoRut from './CampoRut';
import AyudaCorta from './AyudaCorta';
import AvisoGuardado from './AvisoGuardado';
import { avisar } from './AvisoFlotante';
import { usarGuardadoPorFicha } from './usarGuardadoPorFicha';
import { marcoGrupo, TITULO_GRUPO } from './TarjetaLista';
import { avisoCorreo } from '@/lib/contacto';
import type { Cliente, DatosCliente } from '@/lib/clientes';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

export const CLIENTE_VACIO: DatosCliente = {
  nombre: '', empresa: '', rut: '', domicilio: '', giro: '', telefono: '', correo: '', notas: ''
};

const CAMPOS: (keyof DatosCliente)[] =
  ['nombre', 'empresa', 'rut', 'domicilio', 'giro', 'telefono', 'correo', 'notas'];

/** Lo que se edita de una ficha. */
export const datosDeCliente = (c: Cliente): DatosCliente =>
  Object.fromEntries(CAMPOS.map((k) => [k, c[k] ?? ''])) as DatosCliente;

/**
 * Los campos de una ficha, iguales para crear y para editar. En una página
 * ancha van cuatro por fila (2026-11-21: con dos, la ficha abierta no entraba
 * en la pantalla); en una ventana, dos, con las notas al lado del giro para
 * que no quede un campo solo en su fila.
 */
export function CamposCliente({ datos, poner, quien, columnas = 4 }: {
  datos: DatosCliente;
  poner: (k: keyof DatosCliente, v: string) => void;
  /** Para el nombre accesible del teléfono: *Teléfono de …*. */
  quien: string;
  columnas?: 2 | 4;
}) {
  const grilla = columnas === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2';
  const todo = columnas === 4 ? 'sm:col-span-2 lg:col-span-4' : '';
  return (
    <div className={`grid grid-cols-1 gap-3 ${grilla}`}>
      <Campo etiqueta="Nombre" ancho="w-full">
        <input type="text" value={datos.nombre} className={ENTRADA}
          placeholder="Nombre y apellido, o de la empresa"
          onChange={(e) => poner('nombre', e.target.value)} />
      </Campo>
      <Campo etiqueta="Empresa del cliente" ancho="w-full">
        <input type="text" value={datos.empresa} className={ENTRADA}
          placeholder="Si es una empresa: su razón social"
          onChange={(e) => poner('empresa', e.target.value)} />
      </Campo>
      <Campo etiqueta="Teléfono" ancho="w-full">
        <CampoTelefono valor={datos.telefono} className={ENTRADA}
          etiqueta={`Teléfono de ${quien}`} onCambio={(v) => poner('telefono', v)} />
      </Campo>
      <Campo etiqueta="Correo" ancho="w-full">
        <input type="email" value={datos.correo} className={ENTRADA}
          placeholder="nombre@correo.cl"
          onChange={(e) => poner('correo', e.target.value)} />
        {avisoCorreo(datos.correo) && (
          <p className="mt-0.5 text-[13px] text-ambar-texto">{avisoCorreo(datos.correo)}</p>
        )}
      </Campo>
      <Campo etiqueta="RUT" ancho="w-full">
        <CampoRut valor={datos.rut} className={ENTRADA} etiqueta="RUT"
          placeholder="Lo pide el contrato, no la cotización"
          onCambio={(v) => poner('rut', v)} />
      </Campo>
      <Campo etiqueta="Domicilio" ancho="w-full">
        <input type="text" value={datos.domicilio} className={ENTRADA}
          placeholder="Lo pide el contrato"
          onChange={(e) => poner('domicilio', e.target.value)} />
      </Campo>
      <Campo etiqueta="Giro" ancho="w-full">
        <input type="text" value={datos.giro} className={ENTRADA}
          placeholder="Lo pide la factura"
          onChange={(e) => poner('giro', e.target.value)} />
      </Campo>
      <Campo etiqueta="Notas" ancho={`w-full ${todo}`}>
        <textarea value={datos.notas} rows={2} className={ENTRADA}
          placeholder="Lo que conviene saber: cómo llegó, qué le importa"
          onChange={(e) => poner('notas', e.target.value)} />
      </Campo>
    </div>
  );
}

/**
 * La ficha abierta de un cliente: sus campos, el estado del guardado y, si
 * se cambió el nombre, el botón para confirmarlo. `pie` va a la derecha de
 * esa última fila (en *Clientes*, el código y *Cambiar vendedor*).
 *
 * En una ventana (*✎ Editar cliente*) los campos van en su marco de grupo con
 * `titulo`, como las demás ventanitas de la cotización, y `onListo` pone
 * *✓ Listo* al final de la fila, fuera del marco. Va relleno salvo que haya
 * un nombre por confirmar: ahí el relleno es *Guardar el nombre* (un solo
 * botón relleno por vista).
 */
export default function EditarCliente({
  cliente, onClientes, columnas = 4, soloMira = false, pie, titulo, onListo
}: {
  cliente: Cliente;
  /** La lista de fichas como quedó en el servidor, después de cada guardado. */
  onClientes: (lista: Cliente[]) => void;
  columnas?: 2 | 4;
  soloMira?: boolean;
  pie?: ReactNode;
  titulo?: ReactNode;
  onListo?: () => void;
}) {
  const [edicion, setEdicion] = useState<DatosCliente>(() => datosDeCliente(cliente));
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  // Otra ficha: parte de nuevo. Solo por el id: si se reiniciara con cada
  // lista nueva del servidor, lo que se está escribiendo se pisaría.
  useEffect(() => {
    setEdicion(datosDeCliente(cliente));
    setAviso('');
  }, [cliente.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fichas = usarGuardadoPorFicha<Partial<DatosCliente>>(async (id, cambios) => {
    const r = await fetch('/api/clientes', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...cambios })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) return d.error || 'No se pudo guardar.';
    if (d.clientes) onClientes(d.clientes);
    if (d.parecidos?.length) {
      avisar(`Ojo: se parece a ${d.parecidos.map((x: Cliente) => x.nombre).join(', ')}`, 'atencion');
    }
  }, 1200);

  /** El nombre: el único campo de la ficha que se confirma. */
  async function guardarNombre() {
    const nombre = edicion.nombre.trim();
    if (!nombre || !confirm(`¿Cambiar el nombre de ${cliente.nombre} a ${nombre}? `
      + 'Se corrige también en sus cotizaciones y reservas.')) return;
    setGuardando(true); setAviso('');
    try {
      const r = await fetch('/api/clientes', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: cliente.id, nombre })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) return setAviso(d.error || 'No se pudo guardar.');
      onClientes(d.clientes);
      const guardado = (d.clientes as Cliente[]).find((x) => x.id === cliente.id);
      if (guardado) setEdicion((e) => ({ ...e, nombre: guardado.nombre }));
      if (d.parecidos?.length) {
        avisar(`Guardado. Ojo: se parece a ${d.parecidos.map((x: Cliente) => x.nombre).join(', ')}`,
          'atencion');
      } else avisar(`Ahora se llama ${nombre}`);
    } finally { setGuardando(false); }
  }

  const cambiaNombre = edicion.nombre.trim() !== cliente.nombre;
  const { estado, error: falla } = fichas.estadoDe(cliente.id);

  const campos = cliente.contactoTapado ? (
    <p className="flex flex-wrap items-center gap-1.5 rounded-lg border border-hueso/15 px-3 py-2.5 text-[15px] text-hueso/75">
      🔒 Es un cliente de otro vendedor{cliente.telefono ? ` · ${cliente.telefono}` : ''}. <AyudaCorta tema="clienteDeOtro" />
    </p>
  ) : (
    <fieldset disabled={soloMira} className="m-0 min-w-0 border-0 p-0">
      <CamposCliente datos={edicion} columnas={columnas} quien={cliente.nombre} poner={(k, v) => {
        setEdicion((e) => ({ ...e, [k]: v }));
        // El nombre espera su botón; lo demás se guarda solo.
        if (k !== 'nombre') fichas.programar(cliente.id, { [k]: v });
      }} />
    </fieldset>
  );

  return (
    <>
      {titulo ? (
        <div className={`${marcoGrupo()} p-3`}>
          <p className={`mb-3 flex flex-wrap items-center gap-x-2 ${TITULO_GRUPO}`}>{titulo}</p>
          {campos}
        </div>
      ) : campos}
      {aviso && <p className="mt-3 text-[15px] text-rojo-texto">{aviso}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {cambiaNombre && !soloMira && !cliente.contactoTapado && (
          <>
            <span className="text-[14px] text-ambar-texto">Cambiaste el nombre.</span>
            <button type="button" className="boton boton-relleno"
              disabled={!edicion.nombre.trim() || guardando}
              onClick={() => void guardarNombre()}>Guardar el nombre</button>
            <button type="button" className="boton"
              onClick={() => setEdicion((e) => ({ ...e, nombre: cliente.nombre }))}>Deshacer</button>
          </>
        )}
        <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(cliente.id)} />
        <span className="flex-1" />
        {pie}
        {onListo && (
          <button type="button" onClick={onListo}
            className={`boton min-h-[44px] px-5 ${cambiaNombre ? '' : 'boton-relleno'}`}>✓ Listo</button>
        )}
      </div>
    </>
  );
}
