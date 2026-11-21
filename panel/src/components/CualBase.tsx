/**
 * **Cuál base es, dicho arriba** (2026-11-21, lo pidió el cliente: ensayar
 * primero en la base de prueba y después en producción). La versión de
 * prueba de un PR está conectada a la copia *Pruebas* y producción a la
 * planilla real: con el nombre de la planilla y la palabra *Producción* o
 * *Versión de prueba* a la vista, no hay cómo confundir una con la otra.
 *
 * Es una pieza porque la usan las dos ventanas de Mantención que escriben de
 * verdad: *Dejar la base en cero* e *Importar del CRM*.
 */
export default function CualBase({ entorno, nombre }: { entorno?: 'produccion' | 'prueba' | ''; nombre?: string }) {
  return (
    // Es un aviso, no un botón: fino y redondo, como las demás pastillas.
    <p className={`inline-flex flex-wrap items-center gap-x-2 rounded-full border px-3 py-0.5 text-[14px] font-semibold ${
      entorno === 'produccion' ? 'border-rojo-fuerte text-rojo-texto'
        : entorno === 'prueba' ? 'border-cielo/70 text-cielo-texto' : 'border-hueso/30 text-hueso/80'}`}>
      <span>{entorno === 'produccion' ? '🔴 Producción: la planilla real'
        : entorno === 'prueba' ? '🧪 Versión de prueba: no es la planilla real' : 'Planilla'}</span>
      {nombre && <span className="font-bold">«{nombre}»</span>}
    </p>
  );
}
