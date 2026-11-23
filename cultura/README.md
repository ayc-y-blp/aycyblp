# La cultura de trabajo, para llevarla a otro proyecto

Es la versión destilada y portable de las reglas que se fueron escribiendo en
Brasas de Lo Pirque (`CLAUDE.md`, `panel/CLAUDE.md` y `TRASPASO.md` tienen
~15.000 líneas con la historia completa; esto son ~500 con lo que se lleva).

| Archivo | Qué es | Dónde vive |
|---|---|---|
| `cultura/CLAUDE-usuario.md` | La conducta que vale en **todos** los proyectos | Se pega en el `CLAUDE.md` de cada proyecto nuevo (o en `~/.claude/CLAUDE.md` si algún día trabajas en un computador) |
| `.claude/skills/ritual-de-trabajo/` | El paso a paso de un cambio, del PR de prueba al *"mergea"*; cómo anotar una *"regla: …"*; cómo arrancar un proyecto | En el repo: Claude Code lo carga solo |
| `.claude/skills/panel-playstation/` | Las reglas de diseño y de producto de un panel de administración | ídem |
| `.claude/skills/sitio-elegante/` | Las reglas del sitio público y los landings | ídem |

## En este proyecto

No hay que instalar nada: los skills están en `.claude/skills/` y cada chat
nuevo los tiene. `CLAUDE.md` (sección *La cultura de trabajo…*) dice cuándo
usar cada uno, para que se usen siempre sin que se lo pidas.

## En un proyecto nuevo

Trabajando solo desde la web, no hay carpeta de usuario que sirva: el
contenedor de cada sesión es temporal. Lo que viaja es el repo. Dos caminos:

1. **Un repo plantilla de GitHub** (recomendado): un repo con `.claude/skills/`
   y un `CLAUDE.md` base que incluya `CLAUDE-usuario.md` y la línea *"si el
   proyecto es nuevo, pregúntale al cliente si quiere usar la cultura de
   trabajo"*. Cada proyecto nuevo parte de ahí con *Use this template*.
2. **Copiar a mano** al partir: la carpeta `.claude/skills/` y el contenido de
   `cultura/CLAUDE-usuario.md` dentro del `CLAUDE.md` del proyecto nuevo.

Un repo vacío no trae nada por sí solo: sin una de las dos cosas, Claude no
sabe que existe esta cultura.

## En un computador (si algún día)

Los skills se pueden enlazar para que un `git pull` los actualice:

```bash
mkdir -p ~/.claude/skills
for s in ritual-de-trabajo panel-playstation sitio-elegante; do
  ln -sfn "$PWD/.claude/skills/$s" ~/.claude/skills/$s
done
```

## Mantenerlo al día

Hay **una sola copia de cada skill**, la de `.claude/skills/`. Se cambia ahí, con
PR. Cuando el cliente dice *"regla: …"*, se anota en el `CLAUDE.md` del proyecto
**y**, si vale para todos los proyectos, también en `CLAUDE-usuario.md` o en el
skill que corresponda. Si algo de acá se queda atrás de Brasas, la fuente de
verdad es el `CLAUDE.md` de Brasas.

## Lo que NO se llevó, a propósito

Lo específico de Brasas queda en Brasas: precios, Shopify y las dos tiendas, el
dominio, Cloudflare, las cotizaciones, las comisiones, el equipo y la propina,
Calicanto. Si un proyecto nuevo es parecido (otra empresa en el mismo panel,
por ejemplo), se parte de las secciones de `panel/CLAUDE.md` que correspondan.
