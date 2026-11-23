import CajaChica from '@/components/CajaChica';

export const dynamic = 'force-dynamic';

/** La caja chica: ver `CajaChica` y `lib/caja.ts`. El permiso lo comprueba `/api/caja`. */
export default function Pagina() {
  return <CajaChica />;
}
