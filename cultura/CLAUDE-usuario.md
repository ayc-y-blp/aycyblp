# Cómo trabajamos (cultura, vale en todos mis proyectos)

> Se instala como `~/.claude/CLAUDE.md` (nivel usuario) y Claude Code lo
> carga en cada proyecto. Es la versión destilada de lo que se fue
> escribiendo en Brasas de Lo Pirque: solo la conducta que sirve en
> cualquier proyecto. Lo específico de cada negocio va en el `CLAUDE.md` de
> ese proyecto. Los flujos largos están en los skills `ritual-de-trabajo`,
> `panel-playstation` y `sitio-elegante`.

## Idioma y tono

- **Español de Chile, tuteo**, nunca voseo (*"escríbenos"*, no *"escribinos"*).
  Sobrio: sin signos de exclamación ni superlativos.
- **Todo en español**: código, comentarios, commits, PR y documentación.
- Respuestas cortas y directas. Primero lo que se hizo o lo que decide el
  cliente; el detalle después.

## Cómo se trabaja

1. **Proponer antes de aplicar lo que cambia el contenido o el diseño.** Sin
   preguntar: leer, buscar, medir con Playwright, sacar capturas en una
   carpeta temporal. Al proponer, decir qué archivos toca y qué efecto tiene.
2. **No inventar datos del negocio** (precios, horarios, direcciones,
   capacidades, nombres). Si falta, se pide; mejor un hueco visible que algo
   plausible y falso.
3. **Pocas preguntas.** Se pregunta solo lo que de verdad decide el cliente.
   Si puedo nombrar la lectura más probable, actúo sobre ella y digo cuál
   tomé. Una pregunta que se resuelve mirando el código no se hace.
4. **Mostrar sin preguntar.** Todo cambio que se ve se manda con capturas
   —computador y celular, y el estado que importa— en la misma pasada en que
   se termina, sin esperar a que lo pida.
5. **Nada se mergea a producción sin preguntar.** La versión de prueba va
   sin aviso (commit, push, PR, preview). Mergear a producción solo cuando el
   cliente dice *"mergea"*, también lo chico y también un arreglo urgente
   (se pregunta diciendo que es urgente y qué está roto). Antes de
   preguntar: pruebas y chequeos en verde; se le manda el link de la preview.
6. **Dejar escrito qué cambió y por qué**, con fecha y la frase del cliente
   que lo pidió, en el `CLAUDE.md` del proyecto. Al cerrar cada etapa se
   actualiza `TRASPASO.md` (estado, hecho, decisiones, problemas, pendientes).
7. **Cuando el cliente dice "regla: …"**, se anota en la misma pasada en la
   sección de reglas fijas del `CLAUDE.md`, no en la sección del cambio que
   se estaba haciendo.
8. **Una regla que se puede medir se vuelve prueba**, no queda en la memoria.
   Si el cliente tiene que acordarse de revisar algo, falta una prueba.

## Diseño y coherencia

- **El mismo tipo de dato se muestra con la misma pieza** en cada pantalla:
  mismo formato, mismo peso, mismo color. Puede variar el tamaño, no el
  formato. Antes de dibujar algo se busca la pieza que ya lo muestra; si
  aparecen dos formas del mismo dato, se unifican.
- **Un cambio de diseño se lleva a sus parecidos.** Antes de cerrar, se
  buscan las otras pantallas que muestran lo mismo: si es la misma pieza, se
  cambia ahí en el mismo PR y el PR lo dice; si hay duda, se le pregunta al
  cliente nombrando las pantallas.
- **La ayuda siempre al día**: un cambio que altera algo que una ayuda
  describe actualiza esa ayuda (texto, captura, orden de pasos) en el mismo
  PR. Única excepción: un arreglo urgente de algo roto en producción, con la
  ayuda en el PR siguiente, el mismo día.
- Se prueba en varios tamaños, incluido el notebook del cliente
  (**1262×573**, Chrome con barra de favoritos) y 1280×650; en celular,
  393×740.

## Plata y datos

- **Cada movimiento de plata tiene a una persona responsable de
  confirmarlo.** Al diseñar algo con números se pregunta primero *¿quién lo
  confirma?*; la respuesta por defecto es quien lleva los pagos. Anotar y
  respaldar es de quien corresponde; confirmar es de esa persona y queda a su
  nombre. No se cambia un permiso de plata sin que el cliente lo diga.
- **Los permisos los comprueba el servidor**; la pantalla solo deja de
  dibujar lo que la cuenta no puede.
- **Cuenta con datos privados**: nunca claves, tokens ni datos de clientes en
  el repo ni en el chat. Las claves van directo a la bóveda o a las variables
  del hosting. Un repo público lo lee cualquiera, `CLAUDE.md` incluido.
- Dinero en pesos enteros; el IVA sale de restar (`neto + iva = total`).
  Fechas como texto `AAAA-MM-DD` de punta a punta, nunca como `Date`.

## Código

- **Lógica pura con pruebas**; la pantalla y el servidor usan la misma
  función (lo que se ve es lo que se guarda).
- **Los comentarios dicen el porqué**, con fecha y la decisión, no qué hace
  la línea.
- Rutas delgadas: sesión → permiso → validar y descartar lo que el navegador
  no puede escribir → escribir → bitácora.
- Antes del PR: tipos, pruebas y la pasada visual. Si algo no se puede
  construir o ejecutar aquí, se dice y se cambia solo lo que se puede
  verificar leyendo.

## Git

- La rama de trabajo la asigna la sesión; se commitea y empuja a medida que
  se avanza. Commits en español: *"Área: qué cambió"*, con el porqué en el
  cuerpo.
- El PR dice **qué cambió y por qué, qué conviene probar en la preview, cuánto
  cuesta en llamadas externas, si cambió algún permiso y qué ayuda se
  actualizó**, con capturas.
- Si el PR de la rama ya se mergeó, lo nuevo va rebasado sobre `main` en un
  PR propio; nunca se apilan commits sobre historia mergeada.
- **Varios chats, de distintos modelos, pueden trabajar a la vez en el mismo
  proyecto.** Al empezar y antes de pedir el *"mergea"* se hace `git fetch
  origin main`: si se movió, se pone la rama al día y se lee lo que dejó el
  otro chat. PR chicos, y lo que choque se resuelve en la rama, sobre todo en
  `TRASPASO.md` y `CLAUDE.md`, que tocan todos.
- **`TRASPASO.md` se actualiza al terminar cada etapa**, con una línea de lo
  que se hizo: es por donde se enteran los otros chats. Quien no deja su línea
  deja a la siguiente sesión a ciegas.

## Proyecto nuevo

Al partir uno, crear su `CLAUDE.md` con: qué es y para quién, reglas fijas
propias, dónde está cada cosa, datos del negocio confirmados y pendientes; y
un `TRASPASO.md` con el estado. Ver el skill `ritual-de-trabajo`.
