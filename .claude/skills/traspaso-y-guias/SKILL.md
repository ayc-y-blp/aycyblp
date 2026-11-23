---
name: traspaso-y-guias
description: Cómo se trabaja entre distintos chats y modelos en un mismo proyecto, y cómo se documentan los pasos grandes. Todo proyecto lleva un TRASPASO.md (el mapa: estado, flujos, decisiones, pendientes) que se actualiza al cerrar cada etapa; y cuando viene un paso grande —una migración, un lanzamiento, un cambio de dominio o de tienda— se arma una guía paso a paso, mirando hacia adelante, con quién hace cada paso, cómo se comprueba y cómo se vuelve atrás. Úsalo al partir un proyecto, al cerrar una etapa, al empezar un chat nuevo en un proyecto con TRASPASO.md, y cuando el cliente hable de migrar, lanzar, mudar o pasar a producción.
---

# Traspaso entre chats y guías de los pasos grandes

Dos documentos distintos, para dos cosas distintas:

| | Para qué sirve | Mira hacia | Dónde vive | Quién lo lee |
|---|---|---|---|---|
| **`TRASPASO.md`** | Que un chat nuevo retome el proyecto sin haber visto los anteriores | Atrás y al presente: qué es, cómo está armado, en qué estado está | En la raíz del repo | Claude, en cada chat |
| **Guía paso a paso** | Que el cliente (y Claude) ejecuten un paso grande sin perderse | **Adelante**: qué falta y en qué orden | Un documento compartido que el cliente abre | El cliente, con Claude al lado |

## 1. `TRASPASO.md`: el mapa para los demás chats

**Por qué existe.** Varios chats, a veces de distintos modelos, trabajan a la
vez en el mismo proyecto y todos mergean. Ninguno ve lo que hizo el otro. Este
archivo es por donde se enteran. Un chat que no deja su línea deja al
siguiente a ciegas.

**Cómo se crea.** Al partir el proyecto, con la estructura de
`plantilla-traspaso.md` (en esta misma carpeta). Se importa desde `CLAUDE.md`
con `@TRASPASO.md`, para que cada chat lo cargue solo.

**Cuándo se actualiza.** **Al cerrar cada etapa**, en la misma pasada que el
cambio, no al final del día. Y **al empezar y antes de pedir el *"mergea"* se
hace `git fetch origin main`**: si se movió, se pone la rama al día y se lee
primero lo que dejó el otro chat. Lo que choque se resuelve en la rama, sobre
todo en este archivo y en `CLAUDE.md`, que tocan todos.

**Qué lleva** (en este orden, las secciones de la plantilla):

0. **Estado en una mirada**: lo último que pasó, lo que está en un PR abierto,
   lo que sigue. Es lo único que se lee siempre; se mantiene corto.
1. El sistema: qué es, para quién, los módulos.
2. Arquitectura y stack: dónde vive cada cosa, los proyectos de hosting, el
   dominio, las integraciones, **los nombres de las variables de entorno (sin
   valores)**.
3. Flujos críticos: lo que tiene que seguir funcionando.
4. Lo que se hizo (por etapa o por PR).
5. Decisiones tomadas **y por qué**, con la frase del cliente.
6. Problemas conocidos y **lo que no hay que romper**.
7. Pendientes, **en orden**, con el siguiente paso concreto y de quién es.
8. Convenciones del código y cómo se prueba.
9. Las reglas (un resumen; las completas están en `CLAUDE.md`).
10. Cómo mantener el archivo.

**Reglas del archivo**
- **Es un mapa, no una bitácora.** Corto donde puede; el detalle vive en la
  sección de `CLAUDE.md` a la que apunta.
- Lo que no quedó comprobado se marca **(por confirmar)**, no se da por hecho.
- **Nunca** claves, datos de clientes ni nada que el negocio no quiera mostrar:
  si el repo es público, lo lee cualquiera.
- Lo que se mergeó lleva su número de PR y la fecha; lo que está en una rama,
  dice que está en preview hasta el *"mergea"*.

## 2. La guía paso a paso, para los pasos grandes

**Cuándo se crea.** No para cada detalle: cuando viene un **paso grande** que
tiene varias partes, quién hace cada una, algo que puede salir mal y un orden
que importa. Ejemplos: migrar de cuenta o de hosting, mover un dominio,
lanzar el sitio, conectar la tienda real, dejar la base en cero, importar datos,
SEO de lanzamiento. Si cabe en tres líneas, va en `TRASPASO.md`, no en una guía.

**Cómo se hace** (se arma con el cliente, mirando hacia adelante):

1. **Para qué es y cuándo** en dos líneas: qué cambia para el negocio y la
   fecha o el momento.
2. **Antes de empezar**: lo que tiene que estar listo, y una **copia o
   respaldo** de lo que se va a tocar.
3. **Pasos numerados, en el orden en que se hacen.** Cada uno con:
   - **Quién** lo hace (*Cliente*, *Claude* o *los dos*).
   - **Qué se hace**, en una o dos frases, con la captura o el valor que
     importa (sin claves).
   - **Cómo se comprueba** que quedó bien.
4. **Lo que no se puede hacer antes de tal paso** (los órdenes que importan,
   dicho explícito: *"recién después del DNS"*).
5. **La vuelta atrás**: cómo se deshace si algo sale mal, paso por paso.
6. **Lo que falta**: lo que queda abierto después, en orden.

**Cómo se mantiene**
- **Se marca lo hecho** y se reordena lo que falta: la guía enseña el camino
  que queda, no la historia del que ya se hizo.
- Cuando cambia el plan, se actualiza la guía **en la misma pasada** en que
  cambia, y se le dice al cliente qué cambió.
- Al terminar el paso grande, **lo importante pasa a `TRASPASO.md`** (estado,
  decisión, problema) y la guía queda como referencia.

**Dónde vive.** En un **documento compartido** que el cliente abra sin tocar
el repo (un Google Doc, un Claude Doc o una página publicada), con capturas.
**Si el repo es público, la guía no lleva claves ni datos de clientes**; esas
van a la bóveda. En `TRASPASO.md` se anota **el nombre de la guía y de qué
trata**, para que otro chat sepa que existe y la busque.

**Al ejecutarla con el cliente:** un paso a la vez, diciendo qué viene, y
comprobando antes de pasar al siguiente. Después de algo que toque cómo se
despliega, se comprueba en producción que lo importante responde.

## Antes de cerrar una etapa

- [ ] `TRASPASO.md` tiene la línea de lo que se hizo (sección 0 y, si
      corresponde, 4, 5, 6 y 7).
- [ ] Si hay una guía en curso, está al día: lo hecho marcado y lo que falta
      en orden.
- [ ] `git fetch origin main` antes de pedir el *"mergea"*.
