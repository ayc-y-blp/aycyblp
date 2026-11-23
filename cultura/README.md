# La cultura de trabajo, para llevarla a otro proyecto

Es la versión destilada y portable de las reglas que se fueron escribiendo en
Brasas de Lo Pirque (`CLAUDE.md`, `panel/CLAUDE.md` y `TRASPASO.md` tienen
~15.000 líneas con la historia completa; esto son ~500 con lo que se lleva).

| Archivo | Qué es | Dónde se instala |
|---|---|---|
| `CLAUDE-usuario.md` | La conducta que vale en **todos** los proyectos | `~/.claude/CLAUDE.md` |
| `skills/ritual-de-trabajo/` | El paso a paso de un cambio, del PR de prueba al *"mergea"*; cómo anotar una *"regla: …"*; cómo arrancar un proyecto | `~/.claude/skills/ritual-de-trabajo/` |
| `skills/panel-playstation/` | Las reglas de diseño y de producto de un panel de administración | `~/.claude/skills/panel-playstation/` |
| `skills/sitio-elegante/` | Las reglas del sitio público y los landings | `~/.claude/skills/sitio-elegante/` |

## Instalar en tu computador

Desde una copia del repo:

```bash
mkdir -p ~/.claude/skills
cp cultura/CLAUDE-usuario.md ~/.claude/CLAUDE.md
cp -r cultura/skills/* ~/.claude/skills/
```

Si ya tienes un `~/.claude/CLAUDE.md`, no lo pises: pega el contenido de
`CLAUDE-usuario.md` al final. Después, en una sesión nueva, `/ritual-de-trabajo`,
`/panel-playstation` y `/sitio-elegante` aparecen como skills; Claude también
los carga solo cuando el trabajo lo pide (por la `description` de cada uno).

## Cómo se reparte

- **Cultura** (`~/.claude/CLAUDE.md`): siempre cargada, corta a propósito.
- **Skills**: se cargan solo cuando corresponde, así no gastan contexto en
  cada sesión. El panel y el sitio son skills porque no todos los proyectos
  los necesitan.
- **Cada proyecto**: su `CLAUDE.md` con lo suyo (negocio, datos, decisiones,
  reglas propias) y su `TRASPASO.md` con el estado.

## Mantenerlo al día

Cuando el cliente dice *"regla: …"*, se anota en el `CLAUDE.md` del proyecto
**y**, si vale para todos los proyectos, también acá (en `CLAUDE-usuario.md` o
en el skill que corresponda). Si algo de acá se queda atrás de Brasas, la
fuente de verdad es el `CLAUDE.md` de Brasas.

## Lo que NO se llevó, a propósito

Lo específico de Brasas queda en Brasas: precios, Shopify y las dos tiendas, el
dominio, Cloudflare, las cotizaciones, las comisiones, el equipo y la propina,
Calicanto. Si un proyecto nuevo es parecido (otra empresa en el mismo panel,
por ejemplo), se parte de las secciones de `panel/CLAUDE.md` que correspondan.
