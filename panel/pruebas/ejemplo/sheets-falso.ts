/**
 * **La planilla de ejemplo de las capturas de la ayuda.** No la importa el
 * panel: `capturas.sh` la copia a una copia del panel, nunca al de verdad.
 *
 * Una planilla falsa en un JSON en disco: imita lo que el panel usa de la API
 * de Sheets (get, values.get/batchGet/append/update/clear, batchUpdate con
 * addSheet y deleteDimension). Se lee y se escribe el archivo en cada
 * llamada, así que lo escrito persiste entre peticiones e instancias.
 */
import fs from 'node:fs';

const ARCHIVO = process.env.PLANILLA_EJEMPLO ?? '';
if (!ARCHIVO) throw new Error('Falta PLANILLA_EJEMPLO: la planilla de ejemplo en JSON.');

type Libro = { orden: string[]; hojas: Record<string, string[][]> };

/**
 * **Una planilla por id** (2026-11-23, Fase 5): la de siempre es el archivo
 * de ejemplo; cualquier otro id —la segunda empresa— tiene el suyo al lado,
 * que nace vacío. `actual` lo fija cada llamada antes de leer.
 */
let actual = ARCHIVO;
function elegir(id: unknown) {
  const propio = !id || id === process.env.GOOGLE_SHEET_ID || id === process.env.COMENTARIOS_SHEET_ID;
  actual = propio ? ARCHIVO : `${ARCHIVO}.${String(id).replace(/[^a-z0-9-]/gi, '')}.json`;
  if (!fs.existsSync(actual)) fs.writeFileSync(actual, JSON.stringify({ orden: [], hojas: {} }));
}

function leer(): Libro {
  const crudo = JSON.parse(fs.readFileSync(actual, 'utf8'));
  const hojas: Record<string, string[][]> = crudo.hojas ?? crudo;
  const orden: string[] = crudo.orden ?? Object.keys(hojas);
  for (const k of Object.keys(hojas)) if (!orden.includes(k)) orden.push(k);
  return { orden, hojas };
}
function guardar(l: Libro) {
  const tmp = actual + '.tmp' + process.pid + Math.random().toString(36).slice(2);
  fs.writeFileSync(tmp, JSON.stringify({ orden: l.orden, hojas: l.hojas }, null, 1));
  fs.renameSync(tmp, actual);
}
const nombre = (r: string) => {
  const m = r.match(/^'((?:[^']|'')*)'/);
  if (m) return m[1].replace(/''/g, "'");
  return r.split('!')[0];
};
function hoja(l: Libro, r: string): string[][] {
  const n = nombre(r);
  const real = Object.keys(l.hojas).find((k) => k === n);
  if (!real) {
    const e = new Error(`Unable to parse range: ${r}`) as Error & { code?: number };
    e.code = 400;
    throw e;
  }
  return l.hojas[real];
}
const filaDe = (r: string) => { const m = r.match(/!A?(\d+)/); return m ? +m[1] : 1; };
const texto = (c: unknown) => {
  if (c == null) return '';
  const s = String(c);
  return s.startsWith("'") ? s.slice(1) : s;
};
const recortar = (t: string[][]) => t.map((f) => {
  const g = [...f]; while (g.length && g[g.length - 1] === '') g.pop(); return g;
});

const crudo = {
  spreadsheets: {
    get: async () => {
      const l = leer();
      return { data: { properties: { title: 'Panel de ejemplo' }, sheets: l.orden.map((t, i) => ({ properties: { title: t, sheetId: i } })) } };
    },
    batchUpdate: async ({ requestBody }: any) => {
      const l = leer();
      for (const q of requestBody.requests) {
        if (q.addSheet) {
          const t = q.addSheet.properties.title;
          if (l.hojas[t]) throw new Error(`addSheet: A sheet with the name "${t}" already exists`);
          l.hojas[t] = []; l.orden.push(t);
        }
        if (q.deleteDimension) {
          const r = q.deleteDimension.range;
          const t = l.orden[r.sheetId];
          l.hojas[t]?.splice(r.startIndex, r.endIndex - r.startIndex);
        }
      }
      guardar(l);
      return { data: {} };
    },
    values: {
      get: async ({ range }: any) => {
        const t = hoja(leer(), range);
        return { data: { values: /!1:1$/.test(range) ? t.slice(0, 1) : t } };
      },
      batchGet: async ({ ranges }: any) => {
        const l = leer();
        return { data: { valueRanges: ranges.map((r: string) => ({ values: hoja(l, r) })) } };
      },
      append: async ({ range, requestBody }: any) => {
        const l = leer();
        const t = hoja(l, range);
        // Como Sheets: después de la última fila con algo.
        let fin = t.length; while (fin > 0 && !(t[fin - 1] ?? []).some((c) => c !== '')) fin--;
        t.splice(fin, t.length - fin, ...requestBody.values.map((f: unknown[]) => f.map(texto)));
        guardar(l);
        return { data: {} };
      },
      update: async ({ range, requestBody }: any) => {
        const l = leer();
        const t = hoja(l, range);
        let n = filaDe(range);
        for (const f of requestBody.values) {
          while (t.length < n) t.push([]);
          t[n - 1] = f.map(texto); n++;
        }
        l.hojas[nombre(range)] = recortar(t);
        guardar(l);
        return { data: {} };
      },
      clear: async ({ range }: any) => {
        const l = leer();
        const t = hoja(l, range);
        const n = filaDe(range);
        t.splice(n - 1);
        guardar(l);
        return { data: {} };
      },
      // Vaciar varias pestañas de una vez (2026-11-18, el paso a producción).
      batchClear: async ({ requestBody }: any) => {
        const l = leer();
        for (const range of requestBody.ranges ?? []) {
          const t = hoja(l, range);
          t.splice(filaDe(range) - 1);
        }
        guardar(l);
        return { data: {} };
      }
    }
  }
};

/** Cada llamada elige su planilla por el `spreadsheetId` que trae. */
function conPlanilla<T extends object>(o: T): T {
  return new Proxy(o, {
    get(t, k) {
      const v = (t as Record<string | symbol, unknown>)[k];
      if (typeof v === 'function') {
        return (...a: unknown[]) => { elegir((a[0] as { spreadsheetId?: unknown } | undefined)?.spreadsheetId); return (v as (...x: unknown[]) => unknown)(...a); };
      }
      return v && typeof v === 'object' ? conPlanilla(v as object) : v;
    }
  }) as T;
}
export const sheetsFalso = conPlanilla(crudo);
