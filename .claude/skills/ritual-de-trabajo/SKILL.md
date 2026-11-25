---
name: ritual-de-trabajo
description: El ritual de trabajo con este cliente, de la propuesta al merge — proponer, cambiar, medir, mostrar capturas, buscar parecidos, actualizar la ayuda, dejar escrito el porqué, abrir el PR de prueba y preguntar antes de mergear a producción. También cómo anotar una "regla: …" del cliente y cómo arrancar un proyecto nuevo con su CLAUDE.md y TRASPASO.md. Úsalo al terminar cualquier cambio, al abrir un PR, cuando el cliente dice "regla:" o "mergea", y al partir un proyecto.
---

# El ritual de trabajo

Es el orden que se repite en cada cambio. Las reglas de fondo están en el
`CLAUDE.md` de usuario; esto es el paso a paso.

## 1. Antes de tocar nada

- Leer lo que haga falta (sin preguntar). Buscar la sección del `CLAUDE.md`
  del proyecto que habla del tema: casi todo lo que parece raro tiene una
  razón escrita, con la frase del cliente.
- **Proponer** si el cambio es de contenido o de diseño: qué archivos toca y
  qué efecto tiene. Si el pedido es claro y chico, se hace y se dice qué
  lectura se tomó.
- **Una captura no es un sí.** Si el cliente manda una foto o pregunta
  *"¿qué pasó?"*, se diagnostica y se propone (qué cambiaría, qué archivos y
  qué otras pantallas toca) y se espera su sí explícito antes de editar. Lo
  de *"claro y chico, se hace"* vale solo cuando pidió el cambio con
  palabras.
- Si hay una pregunta que decide el cliente, una sola y con nombre y
  apellido.

## 2. Hacer el cambio

- Buscar primero **la pieza que ya existe** para ese dato; reutilizarla.
- Si dos pantallas tienen el mismo dibujo copiado, esta es la vez de pasarlo
  a una pieza.
- Lógica pura con prueba; comentarios con el porqué y la fecha.

## 3. Revisar, en este orden

1. **Pruebas y tipos del proyecto** (en Brasas: `npm run revisar`).
2. **Pasada visual** en celular (393×740) y computador (1280×650 y el
   notebook del cliente, 1262×573). Con el estado que importa: la pregunta
   antes de confirmar, el caso más largo, la fila con tarjetas llenas y
   vacías.
3. **¿Se parece a algo que ya existe?** Buscar las otras pantallas que
   muestran lo mismo. Misma pieza → se cambia en el mismo PR. Duda → se
   pregunta nombrando las pantallas.
4. **¿Cambió algo que una ayuda describe?** Texto, captura, puntos, orden de
   pasos: se actualiza en el mismo PR.
5. **¿Es una ventana, ficha o pantalla nueva?** Se agrega a la lista de lo
   que mide la prueba.
6. **¿Hay plata de por medio?** ¿Quién la confirma?

## 4. Dejar escrito

En el `CLAUDE.md` del proyecto (o el de la carpeta si lo hay): **qué
cambió y por qué**, con fecha y la frase del cliente. Una sección con
título, no una nota suelta. Si afecta el estado general, el pendiente o una
decisión, actualizar también `TRASPASO.md`.

## 5. Publicar la versión de prueba (sin aviso)

- Commit en español: `Área: qué cambió`, con el porqué en el cuerpo.
- Push a la rama de trabajo y abrir el PR.
- El PR lleva: qué cambió y por qué · qué conviene probar en la preview ·
  cuánto cuesta en llamadas externas (lecturas, cuotas) · si cambió algún
  permiso · qué ayuda se actualizó · capturas.
- Esperar a que los chequeos del hosting estén en verde. Un chequeo verde solo
  dice que construyó; no que funcione.

## 6. Preguntar el merge (siempre)

Mandar **las capturas y el link de la preview** y preguntar *"¿mergeo?"*.
**Nada va a producción sin el "mergea" del cliente**, también lo chico.
Un arreglo urgente de algo roto en producción también se pregunta, diciendo
que es urgente y qué está roto.

Tras el *"mergea"*: mergear, esperar el despliegue y **comprobar en
producción** que lo importante responde (en Brasas: `/login` 200,
`/api/publico/fechas` 200 y el webhook sin firma 401). Si el panel no
responde, se revierte primero y se investiga después.

## Cuando el cliente dice "regla: …"

1. Anotarla **en la misma pasada** en la lista de *Reglas fijas* del
   `CLAUDE.md` (y en la del panel o sitio que corresponda), con la fecha y su
   frase entre comillas.
2. No en la sección del cambio que se estaba haciendo.
3. Si se puede medir, proponer la prueba que la vigile.
4. Decírselo en una línea: *"anotada como regla"*.

## Arrancar un proyecto nuevo

1. Preguntar solo lo que no se puede deducir: qué es, para quién, qué se
   entrega, dónde se publica.
2. Crear **`CLAUDE.md`** con estas secciones, en este orden: *qué es* · *reglas
   fijas propias* (las de la cultura ya vienen del nivel usuario) · *dónde está
   cada cosa* · *datos del negocio confirmados* · *decisiones abiertas* ·
   *cómo previsualizar* · *Git*.
3. Crear **`TRASPASO.md`** con la plantilla del skill `traspaso-y-guias`
   (`plantilla-traspaso.md`): estado en una mirada, el sistema, flujos
   críticos, lo hecho, decisiones y por qué, problemas conocidos y lo que no
   hay que romper, pendientes en orden, convenciones y reglas. Se importa desde
   `CLAUDE.md` con `@TRASPASO.md`. Cuando venga un paso grande (migrar,
   lanzar), ese mismo skill dice cómo se arma la guía paso a paso.
4. Si el proyecto es un panel de administración, cargar el skill
   `panel-playstation`; si es un sitio público, `sitio-elegante`.
5. Anotar qué es público y qué no, antes del primer commit: un repo público
   lo lee cualquiera.
