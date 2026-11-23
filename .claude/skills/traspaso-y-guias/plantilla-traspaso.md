# Traspaso: <nombre del proyecto> (estado al <fecha>)

Para quien retoma el proyecto en un chat nuevo, sin haber visto los
anteriores. **Este archivo es el mapa**; el detalle de cada decisión vive en
`CLAUDE.md`, ordenado por tema y con fecha.

| Archivo | Qué tiene | Cuándo se carga |
|---|---|---|
| `CLAUDE.md` | Las reglas fijas y el detalle de cada decisión | Siempre (y este archivo, que importa) |
| `TRASPASO.md` | El mapa | Siempre |

Lo marcado **(por confirmar)** es algo que no quedó comprobado: hay que
preguntarlo o mirarlo antes de darlo por hecho.

> **Varios chats, de distintos modelos, trabajan a la vez en este proyecto.**
> Al empezar y antes de pedir el *"mergea"*: `git fetch origin main`. Al
> cerrar cada etapa: dejar acá una línea de lo que se hizo.

---

## 0. Estado en una mirada

- <Lo último que pasó, con su PR y fecha.>
- <Lo que está en un PR abierto, en preview hasta el *"mergea"*.>
- <Lo que sigue.>

---

## 1. El sistema

<Qué es, para quién, cómo se entrega. Los módulos, si los hay.>

## 2. Arquitectura y stack

- **El repo**: <dónde está, si es público y qué implica>.
- **Hosting**: <proyectos, direcciones, qué publica cada uno>.
- **Dominio**: <quién edita el DNS y dónde>.
- **Integraciones**: <qué se conecta con qué y para qué>.
- **Variables de entorno** (nombres, sin valores): <lista>.

## 3. Flujos críticos

<Lo que tiene que seguir funcionando, paso a paso.>

## 4. Lo que se hizo

| PR / etapa | Qué |
|---|---|
| <#n> | <qué cambió> |

## 5. Decisiones tomadas y por qué

- **<Decisión>** (<fecha>): <por qué>, con la frase del cliente si la hay.

## 6. Problemas conocidos y lo que no hay que romper

**Sin resolver o asumido**
- <…>

**Lo que no hay que romper**
- <…>

## 7. Pendientes, en orden

| # | Qué | Siguiente paso concreto | Quién |
|---|---|---|---|
| 1 | <…> | <…> | <Cliente / Claude> |

## 8. Convenciones del código

<Idioma, nombres, dónde va cada cosa, cómo se prueba, Git y PR.>

## 9. Las reglas

<Resumen; las completas están en `CLAUDE.md`.>

## 10. Mantener este archivo

Al terminar cada etapa se actualiza: el estado (sección 0), lo hecho (4), las
decisiones nuevas (5), los problemas (6) y los pendientes (7). Es el mapa:
corto donde puede, con el detalle en la sección de `CLAUDE.md` a la que
apunta. **Si hay una guía paso a paso en curso, acá se anota su nombre y de
qué trata.**
