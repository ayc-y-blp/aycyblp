/**
 * **La empresa de una página del servidor** (2026-11-23, Fase 5). Las rutas
 * de `/api` la fijan en `conLecturas()`; una página que lee la planilla por
 * su cuenta —la bitácora, el link de un trabajador, la planilla semanal, una
 * cotización o un contrato— la fija con esto, por la dirección en que se
 * abrió. Va aparte de `empresa.ts` porque importa `next/headers`, que las
 * pruebas no pueden cargar.
 */
import { headers } from 'next/headers';
import { conEmpresa, empresaDeLaPeticion } from './empresa';

export function enEmpresaDeLaPagina<R>(fn: () => R): R {
  return conEmpresa(empresaDeLaPeticion({ headers: headers() }), fn);
}
