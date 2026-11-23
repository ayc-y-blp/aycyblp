import { headers } from 'next/headers';
import Entrada from '@/components/Entrada';
import { empresaDe, fichaDe } from '@/lib/empresas';

export const dynamic = 'force-dynamic';

export default function Pagina() {
  // A qué empresa se entra: la de esta dirección (o la elegida, en una
  // versión de prueba).
  return <Entrada empresa={fichaDe(empresaDe(headers(), process.env), process.env).nombre} />;
}
