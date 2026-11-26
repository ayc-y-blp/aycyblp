import TareasVista from '@/components/TareasVista';

export const dynamic = 'force-dynamic';

/** Las tareas internas: ver `TareasVista` y `lib/tareas.ts`. El permiso lo comprueba `/api/tareas`. */
export default function Pagina() {
  return <TareasVista />;
}
