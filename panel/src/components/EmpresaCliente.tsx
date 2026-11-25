/**
 * **La empresa del cliente, al lado de su nombre** (2026-11-25, lo pidió el
 * cliente: *"donde mostramos cotizaciones y mostramos el nombre del cliente,
 * debería mostrarse la empresa también"*). La misma forma que en *Clientes*:
 * después del nombre, un punto más chica y más clara. Nada si no tiene
 * empresa o si es lo mismo que el nombre (`empresaAparte()`).
 */
import { empresaAparte } from '@/lib/clientes';

export default function EmpresaCliente({ nombre, empresa, className = '' }: {
  nombre?: string; empresa?: string; className?: string;
}) {
  const e = empresaAparte(nombre, empresa);
  if (!e) return null;
  return <span className={`text-[14px] font-normal text-hueso/70 ${className}`}>{e}</span>;
}
