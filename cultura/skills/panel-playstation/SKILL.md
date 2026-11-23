---
name: panel-playstation
description: Las reglas de diseño y de producto para un panel de administración — estilo "PlayStation" (botones grandes y legibles, nada de letra chica), cada tarjeta o ventana cabe en una pantalla de notebook, formularios alineados, el marco de afuera manda sobre lo de adentro, los nombres se doblan en vez de cortarse, el espacio se usa bien, la explicación va en su "?", autoguardado por defecto y la plata la confirma pagos. Úsalo al diseñar o cambiar cualquier pantalla, ventana, ficha, lista o formulario de un panel, y antes de abrir su PR.
---

# Panel: lúdico, estilo PlayStation

Son las reglas que se fueron fijando en el panel de Brasas de Lo Pirque. Los
nombres de piezas y pruebas (`TarjetaLista`, `npm run ventanas`…) son de ese
proyecto: en uno nuevo se crean sus equivalentes, y **la regla es la misma**.
Lo que se puede medir, se mide con una prueba y no con la memoria.

## 1. Lo que se aprieta se ve que se aprieta

- Botones de **36px o más**; **44px** lo que se usa seguido; **40px en el
  celular**.
- **Letra de 13px o más** donde hay un dato. 9–11px son para una marca de
  agua, no para decir un estado.
- Un botón tiene borde o relleno: no es un texto gris que resulta ser un
  enlace.
- **Se distingue por forma y no solo por color**: una pastilla con borde se
  reconoce sin leerla; un cuadradito de 8px junto a una palabra, no.
- **Un solo botón relleno por vista**, y tres tamaños: hito, acción y
  secundario.
- **Contraste de verdad**: las opacidades bajas (`/35`, `/40`) son para lo
  secundario; un rótulo que se lee con sol va a `/60` o más.
- **Un aviso no se dibuja como botón**: lo que no se aprieta va sin borde
  grueso ni esquinas de botón (una pastilla fina).
- Los números que se miran de lejos van grandes.

## 2. Flujos simples

Pocos pasos, botones a la vista en vez de desplegables, y **una frase que
dice qué pasa al seguir**. Elegir de una lista que crece se hace con
**buscador**: dos botones, el directo (*No, directo*) y otro que abre la lista
con buscador (*Por un socio…*). Nunca un botón por persona.

## 3. Una tarjeta abierta cabe en una pantalla

- Se mide en **1280×650** (notebook con barra del navegador) y, donde se pueda,
  en **393×740**. Menos aire, el nombre al lado del campo, lo secundario
  plegado o en su `?`.
- Si no cabe sin romper la regla 1 (botones bajo 36px, letra bajo 13px),
  **gana la regla 1** y el PR dice que no cupo y cuánto mide.
- **Lo mide una prueba**: abre cada ficha y cada ventana a 1280×650 y falla si
  una que cabía deja de caber o aparece un campo corrido. Lo que aún no cabe
  se anota con su alto y **solo puede bajar**.
- **Una ventana o ficha nueva se agrega a la lista de escenas en el mismo
  PR**: lo que no está en la lista no se mide.
- En el computador, el espacio se gana quitando aire, no achicando botones ni
  letra. El celular tiene que medir lo mismo que antes.

## 4. Las tarjetas de una fila van parejas, y el espacio se usa bien

- En tarjetas lado a lado, **el mismo dato queda a la misma altura en todas**:
  nada baja de renglón en una y en la otra no. Se diseña con el peor caso (el
  número más largo, todas las pastillas); si falta ancho, cede lo secundario,
  no se dobla la fila.
- **Lo que cabe en una fila no se apila.** En el computador, un botón solo en
  su fila, una frase suelta bajo unos filtros o un rótulo sobre dos tarjetas
  chicas van en la fila de al lado. Lo que se deja así a propósito se anota con
  su porqué. En el celular las filas se apilan a propósito.
- Antes de cerrar un cambio en una tarjeta, se mira **una fila con tarjetas
  llenas y vacías juntas**.

## 5. Los formularios van alineados

Los **nombres de los campos van en una columna y los valores en otra**: todos
los nombres miden lo mismo, así que cada campo, valor y fila de botones parte
en la misma vertical. Nunca un campo pegado a su nombre porque la palabra es
más corta. Un segundo dato en la misma fila va a la derecha. Antes de cerrar un
cambio que toque un formulario, se mira en una captura que los bordes
izquierdos calcen.

## 6. El marco de la tarjeta manda sobre lo de adentro

El borde de afuera es **el más grueso y el más oscuro**, y su título va en
negrita; lo de adentro —otra tarjeta, un botón, un campo, un aviso— va siempre
con menos. Tres escalones: el grupo (3px oscuro), la tarjeta de adentro (2px),
botones y campos (2px claros). Se ve de un vistazo en qué tarjeta estás.

## 7. Un nombre se dobla, no se corta

En una lista, el nombre de una persona, un cliente o un producto ocupa los
renglones que necesite: *Matías P…* no dice quién es. Los botones de la fila no
se mueven; el nombre ocupa lo que sobra y la fila crece. Con "…" quedan solo un
título entre flechas, un código y el texto de un botón.

## 8. Lo que explica va en su `?`

A la vista quedan el dato y la acción. El porqué y el cómo funciona van en la
ayuda corta o en el `?` de la pantalla, porque la gente se capacita y el texto
constante molesta. Un texto que se lee una vez es un aviso con su ✕. Una frase
que dice qué pasa al apretar un botón sí se queda.

## 9. Autoguardado por defecto

Todo lo que se escribe se guarda solo, con el estado a la vista (*Guardando… /
✓ Guardado*, y *Reintentar* en rojo si falla). **Se confirma a mano solo** lo
que:

1. mueve plata (pagos, cobros, devoluciones);
2. toma o libera cupo (ganar, cancelar, soltar, ampliar, abrir o cerrar un día);
3. cierra o corrige un día;
4. aprueba o rechaza algo;
5. le llega al cliente (mandar la cotización o el contrato);
6. borra, desactiva o saca a alguien;
7. toca cuentas, roles o links;
8. cambia el nombre de algo que otros usan, o la configuración que afecta al
   sitio público.

Lo manual pregunta con una ventana que dice qué va a pasar; si pide motivo,
queda en la bitácora. **Corregir un día cerrado no pide un motivo escrito**: el
panel arma la lista de lo que cambió, se confirma con una casilla y esa lista
es lo que queda en la bitácora.

## 10. Coherencia entre pantallas

- **El mismo dato, la misma pieza, el mismo peso** en cada pantalla (lo cotizado,
  el estado del día, *hoy*, *Mías*, un aviso, una fecha, un precio). Varía el
  tamaño, no el formato.
- **Un cambio de diseño se lleva a sus parecidos**: si es la misma pieza, en el
  mismo PR; si hay duda, se pregunta nombrando las pantallas. Lo que mejor
  cumple esto es una pieza compartida: el cambio llega solo a todas partes.
- Mantener una **lista de piezas compartidas** en el `CLAUDE.md` del panel (dato
  → pieza) y buscarla antes de dibujar algo.

## 11. La plata y los permisos

- **La plata la cierra una persona responsable** (el encargado de pagos).
  Anotar y respaldar es de quien corresponde; **confirmar** —revisado, pagado,
  devuelto— es suyo y queda a su nombre en la bitácora. Sin frenar a los demás:
  ganar una cotización sigue dependiendo del cobro anotado, no del revisado.
- **Al diseñar algo con números**: *¿quién lo confirma?*
- **Los permisos los comprueba el servidor.** La pantalla solo deja de dibujar lo
  que la cuenta no puede. Ningún permiso de plata cambia sin que el cliente lo
  diga.
- **Las lecturas a servicios externos son un presupuesto** (en Brasas, 60 por
  minuto a Google): nada nuevo lee por su cuenta; se suma a la tanda que la ruta
  ya precarga, y el PR dice cuánto cuesta.

## 12. Antes del PR

- [ ] Pruebas, tipos y la prueba de ventanas/alineación/espacio.
- [ ] Pasada visual a 393 y 1280 px, más 1262×573.
- [ ] ¿Cambió algo que una ayuda describe? Se actualiza en el mismo PR (texto,
      captura y puntos; las capturas se rehacen con el script, contra datos de
      ejemplo, nunca contra datos reales).
- [ ] ¿Es una ventana o ficha nueva? ¿Está en la lista de escenas?
- [ ] ¿Se parece a otra pantalla? ¿Se llevó el cambio a sus parecidos?
- [ ] ¿Hay plata? ¿Quién la confirma?
- [ ] Capturas y link de la preview al cliente; **preguntar antes de mergear**.
