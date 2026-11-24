import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_PUESTOS, HOJA_TRABAJADORES } from '@/lib/equipo';
import { HOJA_COLABORADORES } from '@/lib/extras';
import { leerPuestos, leerTrabajadores, leerColaboradores, renombrarEnPlanilla, anotar, leerOtrasEmpresas } from '@/lib/datos';
import { cuentaDeCambios, fraseDeCambios, type QueSeRenombra } from '@/lib/renombrar';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import type { Accion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Quién puede reenganchar cada cosa: el mismo permiso que la cambia. */
const PERMISO: Record<QueSeRenombra, Accion> = {
  trabajador: 'equipo',
  colaborador: 'extras',
  puesto: 'puestos',
  empresa: 'configurar'
};

const QUE: Record<QueSeRenombra, string> = {
  trabajador: 'el equipo', colaborador: 'los colaboradores', puesto: 'los puestos', empresa: 'las otras empresas'
};

/**
 * **Reengancha un nombre suelto a una ficha o a un puesto** (2026-11-24, lo
 * pidió el cliente: *"en equipo sale correcto con Christopher Acevedo pero
 * en los turnos me aparece como Christipher Acevedo"*).
 *
 * Un nombre suelto es el que está en lo guardado —turnos, días de un
 * colaborador— y no en la lista: se corrigió directo en la planilla, o se
 * renombró antes de que el cambio de nombre arrastrara lo guardado. *Es…* (o
 * *Pasar a…* para un puesto) lo pasa al de la lista con `lib/renombrar.ts`,
 * igual que un cambio de nombre.
 *
 * - `de` **tiene que estar suelto**: si está en la lista, es otra ficha, y
 *   juntar dos fichas no se hace por acá.
 * - `a` **tiene que estar en la lista**.
 * - Si alguien queda dos veces el mismo día, se dice qué días: se saca de uno
 *   en la ventana del día (cada fila puede traer su asistencia o un ajuste).
 */
export const POST = conLecturas([HOJA_PUESTOS, HOJA_TRABAJADORES, HOJA_COLABORADORES],
  async function POST(req: Request) {
    try {
      const b = await req.json();
      const tipo = String(b?.tipo ?? '') as QueSeRenombra;
      if (!(tipo in PERMISO)) return NextResponse.json({ error: 'No se sabe qué reenganchar.' }, { status: 400 });
      const no = await exigir(req, PERMISO[tipo]);
      if (no) return no;
      const de = String(b?.de ?? '').trim();
      const aPedido = String(b?.a ?? '').trim();
      if (!de || !aPedido) return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });

      const lista = tipo === 'puesto' ? (await leerPuestos()).map((p) => p.nombre)
        : tipo === 'trabajador' ? (await leerTrabajadores()).map((t) => t.nombre)
        : tipo === 'empresa' ? (await leerOtrasEmpresas()).map((e) => e.nombre)
        : (await leerColaboradores()).map((c) => c.nombre);
      if (lista.some((n) => normalizar(n) === normalizar(de))) {
        return NextResponse.json({
          error: `${de} está en ${QUE[tipo]}: no está suelto. Para cambiarle el nombre, hazlo en su ficha.`
        }, { status: 409 });
      }
      // El nombre como está escrito en la lista, no como vino.
      const a = lista.find((n) => normalizar(n) === normalizar(aPedido));
      if (!a) return NextResponse.json({ error: `${aPedido} no está en ${QUE[tipo]}.` }, { status: 404 });

      const { celdas, repetidos } = await renombrarEnPlanilla(tipo, [{ de, a }]);
      const frase = fraseDeCambios(cuentaDeCambios(celdas));
      await anotar({ ...(await quienEs(req)),
        accion: tipo === 'puesto' ? 'Pasó los turnos de un puesto suelto' : 'Reenganchó un nombre suelto',
        detalle: `${de} → ${a}${frase ? ` · pasaron ${frase}` : ' · no había nada'}` });
      return NextResponse.json({ de, a, frase, repetidos });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  });
