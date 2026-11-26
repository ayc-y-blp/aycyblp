'use client';

/**
 * **Traer los comentarios de *Gran Testeo*** (2026-11-26), en Configuración →
 * Mantención. Solo el administrador (`mantencion`).
 *
 * Los comentarios pasaron a la planilla del panel; esto copia una vez los que
 * quedaron allá (`/api/comentarios/traer`). *Gran Testeo* solo se lee, y
 * apretarlo de nuevo no duplica nada. Sin `COMENTARIOS_SHEET_ID` —como en una
 * versión de prueba— no hay de dónde traerlos y no se dibuja.
 */
import { useEffect, useState } from 'react';
import { usarPuede } from './SesionCliente';

export default function TraerComentarios() {
  const puede = usarPuede('mantencion');
  const [vista, setVista] = useState<{ nombre?: string; total?: number; faltan?: number; sinVariable?: boolean } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState('');

  const leer = async () => {
    try {
      const r = await fetch('/api/comentarios/traer');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo leer Gran Testeo.');
      setVista(j);
    } catch (e) {
      setAviso((e as Error).message);
    }
  };
  useEffect(() => { if (puede) void leer(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!puede || !vista || vista.sinVariable) return null;

  const traer = async () => {
    setTrabajando(true);
    setAviso('');
    try {
      const r = await fetch('/api/comentarios/traer', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo traer.');
      setAviso(`✓ ${j.traidos === 1 ? 'Se trajo 1 comentario' : `Se trajeron ${j.traidos} comentarios`}.`);
      await leer();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="mt-6 border-t border-hueso/10 pt-4">
      <div className="lg:flex lg:items-center lg:gap-4">
        <div className="min-w-0">
          <p className="text-[16px] font-bold">💬 Traer los comentarios de Gran Testeo</p>
          <p className="mt-1 max-w-2xl text-[14px] text-hueso/75">
            {vista.nombre ? <><b>{vista.nombre}</b>: </> : null}
            {vista.total} comentarios, {vista.faltan ? `${vista.faltan} todavía no están en el panel` : 'todos ya están en el panel'}.
            Allá solo se lee.
          </p>
          {aviso && <p className="mt-1 text-[14px] font-semibold" role="status">{aviso}</p>}
        </div>
        {!!vista.faltan && (
          <button type="button" onClick={() => void traer()} disabled={trabajando}
            className="boton mt-3 min-h-[44px] shrink-0 lg:mt-0">
            {trabajando ? 'Trayendo…' : `💬 Traer ${vista.faltan}`}
          </button>
        )}
      </div>
    </div>
  );
}
