---
name: sitio-elegante
description: Las reglas del sitio público y los landings — elegante y sobrio, fotografía real como protagonista, tipografía Fraunces y Work Sans, dorado sobre papel tibio de día y negro de noche, cero JavaScript para interfaz, un solo lugar para precios y textos, cada sección cabe en una pantalla de cualquier tamaño, tres idiomas generados desde el español. Úsalo al diseñar o cambiar una página del sitio, un landing, el calendario de reserva o las traducciones.
---

# Sitio y landings: elegante y sobrio

Son las reglas del sitio de Brasas de Lo Pirque. Los colores, los precios y las
rutas son de ese proyecto; la manera de trabajar vale para otro sitio del mismo
estilo.

## Estética

- **Fotografía real como protagonista.** Solo fotos del propio negocio; nada
  de stock ni imágenes de terceros. Si aparece alguien que no es de la
  familia o del equipo, se pregunta antes de publicar.
- **Fraunces** (serif, itálica para números y precios) y **Work Sans** (todo
  lo demás), con fallback a fuentes del sistema.
- **Dorado** sobre papel tibio de día (`#FAF7F0`, tarjetas blancas, tinta
  casi negra cálida) y sobre negro de noche. De día el dorado se oscurece
  (`#8A6B12`) para que contraste. Sobre una foto el texto sigue claro.
- Los colores viven como variables (`--bg`, `--ink`, `--gold`, `--line`…) en
  una sola hoja de tema; se usan las variables, no valores a mano.
- **Voz**: español de Chile, tuteo, comercial pero sobrio. **Sin signos de
  exclamación ni superlativos.**

## Cero JavaScript para interfaz

Menú, tarjetas que giran, carruseles, desplegables y el selector de idiomas son
CSS o `<details>`. Las excepciones están decididas una por una (el calendario
de reserva con la tienda, la sugerencia de idioma y recordar día/noche) y **no
sientan precedente**. Un widget de terceros rompe la identidad visual y esta
regla.

## Lo que edita el cliente vive en un solo lugar

- **Los precios**, en un solo archivo (`precios.json`); un script los copia a
  todas las páginas en todos los idiomas, y se niega a generar si encuentra un
  precio escrito a mano.
- **Los textos**, en el español de la raíz. Los otros idiomas se generan con
  el script (`tools/traducir.py`) y **no se editan a mano**: lo que se les
  haga se pierde. Flujo: editar el español → correr el script → commitear las
  tres versiones juntas.
- Cada asset va con `?v=<hash del contenido>` que pone el script; tocar CSS o
  JS obliga a correrlo.

## Cada sección cabe en una pantalla, de cualquier tamaño

- El título de una sección y su grupo de tarjetas se ven juntos.
- **Los altos no son números fijos**: salen de `--alto-util` (alto de la
  ventana menos la barra y 24px de margen), y cada foto o tarjeta resta lo que
  ocupan su título y su texto, entre un mínimo y un máximo (`clamp()`).
- **En el celular**, una lista de tarjetas se desliza en un carrusel con
  `scroll-snap` en vez de apilarse.
- Se prueba en varios tamaños, **incluido el notebook del cliente 1262×573** y
  1280×650, 1366×600, 1280×720, 1440×800, 1920×950, 1024×600, 393×740,
  375×667, 390×844 y 360×640; en los tres idiomas; sin reversos cortados ni
  desborde lateral.

## La regla PlayStation también vale acá

Lo que se aprieta se ve que se aprieta, y no hay letra chica donde hay un
dato: botones de 44px, letra de 13px o más, estados que se distinguen por
forma y no solo por color. Ejemplo: el calendario de reserva (el día
reservable es una tecla con borde y relleno; el cerrado, un número suelto).

## Objetivo comercial

**La visita particular reserva y paga en el sitio**, no por WhatsApp. WhatsApp
es el canal de las empresas, agencias y socios, y queda como salida de
emergencia, en letra chica, para el público general. Todo *Reservar* del sitio
llega directo al formulario. Cada landing de empresa tiene su propio número de
contacto: no se unifican.

## Antes del PR

- [ ] `python3 tools/traducir.py --revisar` limpio (y `node
      tools/dossier_pdf.mjs` si cambió un landing con PDF).
- [ ] Probado en los tamaños de arriba y en los tres idiomas.
- [ ] Ningún precio escrito a mano.
- [ ] Capturas (computador y celular) y link de la preview al cliente;
      **preguntar antes de mergear**.
