/*
 * El cotizador de la página de promociones (2026-11-23).
 *
 * Lo pidió el cliente: "en cada página de promociones debe haber un
 * cotizador, según las reglas del sitio público elegante, simple". Eligió
 * que muestre el total en vivo, así que es JavaScript: **la cuarta excepción
 * a la regla de cero JS** del sitio, decidida explícitamente y que no sienta
 * precedente. Sin JavaScript, cada promoción sigue con su botón de WhatsApp.
 *
 * Lo que hace, y lo que no:
 *
 * - **No calcula nada.** Le pregunta al panel (`/api/publico/cotizar`), que
 *   cotiza con las mismas reglas que un vendedor —el show, el arriendo mínimo,
 *   el descuento de la promoción—. Acá solo se dibuja lo que vuelve: el sitio
 *   no puede decir un precio distinto del que va a quedar.
 * - **Las promociones salen del panel** (`/api/publico/promociones`): las que
 *   están conectadas a un bloque y con el cotizador encendido. Un bloque sin
 *   la suya se queda como estaba.
 * - **El lugar exclusivo** (2026-11-25, lo pidió el cliente: *"en el
 *   cotizador debe haber la posibilidad también de tener el botón quiero el
 *   lugar exclusivo"*): una casilla en el paso 1 que suma el arriendo del
 *   recinto **a su precio estándar**, el del catálogo del panel, sin el
 *   descuento de la promoción. Lo que se negocie después lo hace el vendedor.
 * - **Manda la cotización** al panel, que la deja enviada y a nombre de la
 *   vendedora de turno, y le ofrece al cliente el WhatsApp de Eventos.
 * - **Abre la promoción del link** (`promociones.html#gran-premio`): el link
 *   de campaña que se copia en el panel.
 * - **Decide qué promociones salen en la lista** (2026-11-24): en las
 *   direcciones reales, solo las marcadas con *Mostrar en el sitio* en el
 *   panel; las otras, con su link.
 * - **Fuera de las direcciones reales** (una versión de prueba, GitHub Pages,
 *   un computador) manda `prueba: true`: el panel calcula y no escribe. Es la
 *   misma regla de la tienda en `reserva.js`.
 *
 * Los textos viven en TEXTOS, en los tres idiomas: el de la página manda.
 */
(function () {
  'use strict';

  var CONFIG = {
    panel: 'https://landing-pirque-alpha.vercel.app',
    direccionesReales: ['brasasdelopirque.cl', 'www.brasasdelopirque.cl', 'brasas-sitio.vercel.app'],
    // WhatsApp de Eventos, el mismo de los botones de la página.
    whatsapp: '56933858575'
  };

  var TEXTOS = {
    es: {
      locale: 'es-CL', moneda: '',
      titulo: 'Cotiza en línea', bajada: 'Elige y ve el total al tiro. Te la mandamos formal y te contactamos hoy.',
      pasoDia: '¿Qué día?', pasoCuantos: '¿Cuántos son?', paso2: '¿Qué menú?', paso3: 'Tu cotización', quiero: 'Quiero esta cotización', volver: '← Ver el detalle',
      personas: 'Personas', adultos: 'Adultos', ninos: 'Niños', dia: 'Día del evento',
      menos: 'Uno menos', mas: 'Uno más', menuFijo: 'Menú', incluye: 'Incluye', suma: 'Se puede sumar', cuantos: '¿Cuántos?',
      porPersona: 'por persona', fijo: 'una vez', masIva: '+ IVA', loCobra: 'lo cobra',
      neto: 'Neto', descuento: 'Descuento', iva: 'IVA 19%', total: 'Total', incluido: 'incluido',
      totalPersona: 'por persona, IVA incluido',
      aparte: '{c}: {m}, aparte. Lo cobra {e}.',
      publico: 'Día abierto al público: el show va incluido.',
      arriendo: 'Ese día el recinto es para ustedes: lleva arriendo desde',
      faltaDia: 'Elige el día para ver el total.',
      calculando: 'Calculando…',
      minimo: 'Esta promoción es desde {n} personas.',
      anticipacion: 'Esta promoción se cotiza con al menos {n} días de anticipación: elige un día más adelante.',
      queIncluye: 'Qué incluye', cerrarDetalle: 'Cerrar el detalle',
      conAnticipacion: 'Con al menos {n} días de anticipación: desde el {f}.', mesAnterior: 'Mes anterior', mesSiguiente: 'Mes siguiente',
      fecha: 'Elige un día desde mañana.',
      tomado: 'Ese día ya está tomado. Prueba con otro.',
      menu: 'Elige un menú.',
      sinCotizar: 'Esta promoción se cotiza por WhatsApp.',
      error: 'No pudimos calcular ahora. Escríbenos por WhatsApp.',
      nombre: 'Tu nombre', empresa: 'Empresa', telefono: 'WhatsApp', correo: 'Correo (opcional)',
      enviar: 'Recibir la cotización', enviando: 'Enviando…',
      envioNota: 'Queda a tu nombre y un ejecutivo te contacta hoy.',
      faltaNombre: 'Escribe tu nombre.', faltaTelefono: 'Escribe un WhatsApp para contactarte.',
      faltaCorreo: 'Revisa el correo.', tope: 'Ya recibimos tus cotizaciones de hoy. Te escribimos pronto.',
      listo: 'Listo. Tu cotización N°', ver: 'Ver la cotización', whatsapp: 'Escríbenos por WhatsApp',
      prueba: 'Versión de prueba: se calculó, pero no se mandó.',
      mensaje: 'Hola, cotizé {promo} en el sitio. N° {n}.',
      desde: 'desde', porPersonaIva: '+ IVA por persona', enAdelante: 'personas en adelante',
      soloLink: 'solo con el link', noSale: 'no sale en el sitio',
      exclusivo: 'Quiero el lugar exclusivo', exclusivoPrecio: '{m} · precio estándar',
      arriendoEstandar: 'Arriendo a precio estándar, sin descuento de la promoción. Tu ejecutivo lo conversa contigo.',
      arriendoIncluido: 'El arriendo del recinto va incluido en esta promoción ese día.',
      sinExclusivo: 'Ese día el recinto no se arrienda en exclusiva. Prueba con otro día.'
    },
    en: {
      locale: 'en-US', moneda: ' CLP',
      titulo: 'Get a quote online', bajada: 'Choose and see the total right away. We send you the formal quote and contact you today.',
      pasoDia: 'Which day?', pasoCuantos: 'How many?', paso2: 'Which menu?', paso3: 'Your quote', quiero: 'I want this quote', volver: '← See the details',
      personas: 'People', adultos: 'Adults', ninos: 'Children', dia: 'Event date',
      menos: 'One less', mas: 'One more', menuFijo: 'Menu', incluye: 'Includes', suma: 'You can add', cuantos: 'How many?',
      porPersona: 'per person', fijo: 'one time', masIva: '+ VAT', loCobra: 'charged by',
      neto: 'Net', descuento: 'Discount', iva: 'VAT 19%', total: 'Total', incluido: 'included',
      totalPersona: 'per person, VAT included',
      aparte: '{c}: {m}, separately. Charged by {e}.',
      publico: 'Open to the public that day: the show is included.',
      arriendo: 'The venue is all yours that day: venue rental from',
      faltaDia: 'Choose the date to see the total.',
      calculando: 'Calculating…',
      minimo: 'This offer starts at {n} people.',
      anticipacion: 'This offer needs at least {n} days\u2019 notice: choose a later date.',
      queIncluye: 'What\u2019s included', cerrarDetalle: 'Close the details',
      conAnticipacion: 'At least {n} days in advance: from {f}.', mesAnterior: 'Previous month', mesSiguiente: 'Next month',
      fecha: 'Choose a date from tomorrow on.',
      tomado: 'That day is already booked. Try another one.',
      menu: 'Choose a menu.',
      sinCotizar: 'This offer is quoted on WhatsApp.',
      error: 'We could not calculate right now. Write to us on WhatsApp.',
      nombre: 'Your name', empresa: 'Company', telefono: 'WhatsApp', correo: 'Email (optional)',
      enviar: 'Get the quote', enviando: 'Sending…',
      envioNota: 'It is saved under your name and an executive contacts you today.',
      faltaNombre: 'Write your name.', faltaTelefono: 'Write a WhatsApp number to reach you.',
      faltaCorreo: 'Check the email.', tope: 'We already have your quotes for today. We will write to you soon.',
      listo: 'Done. Your quote No.', ver: 'See the quote', whatsapp: 'Write to us on WhatsApp',
      prueba: 'Test version: calculated, but not sent.',
      mensaje: 'Hi, I quoted {promo} on the website. No. {n}.',
      desde: 'from', porPersonaIva: '+ VAT per person', enAdelante: 'people and up',
      soloLink: 'link only', noSale: 'hidden on the site',
      exclusivo: 'I want the venue exclusively', exclusivoPrecio: '{m} · standard price',
      arriendoEstandar: 'Standard rental price, without the offer discount. Your executive goes over it with you.',
      arriendoIncluido: 'Venue rental is included in this offer that day.',
      sinExclusivo: 'The venue cannot be rented exclusively that day. Try another day.'
    },
    pt: {
      locale: 'pt-BR', moneda: ' CLP',
      titulo: 'Faça seu orçamento online', bajada: 'Escolha e veja o total na hora. Enviamos o orçamento formal e entramos em contato hoje.',
      pasoDia: 'Que dia?', pasoCuantos: 'Quantos são?', paso2: 'Qual cardápio?', paso3: 'Seu orçamento', quiero: 'Quero este orçamento', volver: '← Ver o detalhe',
      personas: 'Pessoas', adultos: 'Adultos', ninos: 'Crianças', dia: 'Data do evento',
      menos: 'Um a menos', mas: 'Um a mais', menuFijo: 'Cardápio', incluye: 'Inclui', suma: 'Você pode somar', cuantos: 'Quantos?',
      porPersona: 'por pessoa', fijo: 'uma vez', masIva: '+ IVA', loCobra: 'cobrado por',
      neto: 'Líquido', descuento: 'Desconto', iva: 'IVA 19%', total: 'Total', incluido: 'incluído',
      totalPersona: 'por pessoa, IVA incluído',
      aparte: '{c}: {m}, à parte. Cobrado por {e}.',
      publico: 'Dia aberto ao público: o show está incluído.',
      arriendo: 'Nesse dia o espaço é só de vocês: aluguel a partir de',
      faltaDia: 'Escolha o dia para ver o total.',
      calculando: 'Calculando…',
      minimo: 'Esta promoção é a partir de {n} pessoas.',
      anticipacion: 'Esta promoção precisa de pelo menos {n} dias de antecedência: escolha uma data mais adiante.',
      queIncluye: 'O que inclui', cerrarDetalle: 'Fechar o detalhe',
      conAnticipacion: 'Com pelo menos {n} dias de antecedência: a partir de {f}.', mesAnterior: 'Mês anterior', mesSiguiente: 'Próximo mês',
      fecha: 'Escolha um dia a partir de amanhã.',
      tomado: 'Esse dia já está reservado. Tente outro.',
      menu: 'Escolha um cardápio.',
      sinCotizar: 'Esta promoção é orçada pelo WhatsApp.',
      error: 'Não conseguimos calcular agora. Fale conosco pelo WhatsApp.',
      nombre: 'Seu nome', empresa: 'Empresa', telefono: 'WhatsApp', correo: 'E-mail (opcional)',
      enviar: 'Receber o orçamento', enviando: 'Enviando…',
      envioNota: 'Fica no seu nome e um executivo entra em contato hoje.',
      faltaNombre: 'Escreva seu nome.', faltaTelefono: 'Escreva um WhatsApp para contato.',
      faltaCorreo: 'Confira o e-mail.', tope: 'Já recebemos seus orçamentos de hoje. Escreveremos em breve.',
      listo: 'Pronto. Seu orçamento nº', ver: 'Ver o orçamento', whatsapp: 'Fale conosco pelo WhatsApp',
      prueba: 'Versão de teste: calculado, mas não enviado.',
      mensaje: 'Olá, fiz um orçamento de {promo} no site. Nº {n}.',
      desde: 'a partir de', porPersonaIva: '+ IVA por pessoa', enAdelante: 'pessoas ou mais',
      soloLink: 'só com o link', noSale: 'oculta no site',
      exclusivo: 'Quero o espaço exclusivo', exclusivoPrecio: '{m} · preço padrão',
      arriendoEstandar: 'Aluguel pelo preço padrão, sem o desconto da promoção. Seu executivo conversa com você.',
      arriendoIncluido: 'O aluguel do espaço está incluído nesta promoção nesse dia.',
      sinExclusivo: 'Nesse dia o espaço não é alugado com exclusividade. Tente outro dia.'
    }
  };

  var idioma = (document.documentElement.lang || 'es').slice(0, 2);
  var T = TEXTOS[idioma] || TEXTOS.es;
  var CLAVES = ['fin-de-ano', 'combate', 'gran-premio', 'dia-de-campo', 'ia', 'directorio'];

  /* ---------- con quién habla ---------- */

  var esReal = CONFIG.direccionesReales.indexOf(location.hostname) !== -1;
  var panel = CONFIG.panel;
  // En un computador, `?panel=http://localhost:3125` lo prueba contra el panel de ejemplo.
  var pedido = new URLSearchParams(location.search).get('panel');
  if (pedido && /^http:\/\/localhost:\d+$/.test(pedido) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) panel = pedido;

  /* ---------- qué promociones salen, y el link de campaña (2026-11-24) ----------
     **El modo estricto**, que eligió el cliente: "en producción solo se
     muestran si yo doy un chequeo mostrar en el sitio… si tengo el link con
     el hashtag, lo puedo ver igual". En las direcciones reales, las pastillas
     y las flechas traen solo los bloques que el panel marca `lista`; los que
     marca `link` se ven solo con su link (`promociones.html#combate`), y uno
     que no está —sin promoción, o con la suya apagada— no sale. Mientras se
     decide, la fila de pastillas no se ve (`.promo-nav` sin `.promo-lista`).
     Si el panel no responde, sale solo la del link, o la primera: nunca una
     oculta. En una versión de prueba se ven las seis, con una marca en las que
     no salen en el sitio. */

  var nav = document.querySelector('.promo-nav');
  var ultimo = null, decidido = false;

  function radioDe(clave) { return document.querySelector('.promo-radio[data-promo="' + clave + '"]'); }
  function claveDelLink() {
    var clave = decodeURIComponent((location.hash || '').slice(1));
    return CLAVES.indexOf(clave) === -1 ? '' : clave;
  }
  function abrirDelLink() {
    var r = radioDe(claveDelLink());
    if (r) r.checked = true;
  }
  /** Deja en la lista solo `ver` (y `abierta`), con las flechas entre ellas. */
  function mostrarSolo(ver, abierta) {
    var lista = CLAVES.filter(function (c) { return ver.indexOf(c) !== -1 || c === abierta; });
    CLAVES.forEach(function (c, i) {
      var se = lista.indexOf(c) !== -1;
      var r = radioDe(c);
      if (r) r.disabled = !se;
      var pastilla = document.querySelector('.promo-pill.pp' + i);
      if (pastilla) pastilla.hidden = !se;
    });
    if (abierta && radioDe(abierta)) radioDe(abierta).checked = true;
    var n = lista.length;
    lista.forEach(function (c, k) {
      var i = CLAVES.indexOf(c);
      var ant = document.querySelector('.promo-flecha.fa' + i), sig = document.querySelector('.promo-flecha.fs' + i);
      if (ant) ant.htmlFor = 'promo-' + CLAVES.indexOf(lista[(k - 1 + n) % n]);
      if (sig) sig.htmlFor = 'promo-' + CLAVES.indexOf(lista[(k + 1) % n]);
    });
    if (nav) nav.classList.toggle('promo-sola', n < 2);
  }
  /**
   * En una versión de prueba: la marca de las que en el sitio no salen en la
   * lista. Un ícono y el borde punteado, no una palabra: con seis pastillas
   * la fila se doblaba. El texto entero va al pasar el mouse y para un
   * lector de pantalla.
   */
  function marcar(bloques) {
    CLAVES.forEach(function (c, i) {
      var pastilla = document.querySelector('.promo-pill.pp' + i);
      if (!pastilla) return;
      var marca = pastilla.querySelector('.promo-oculta');
      var como = bloques[c] === 'lista' ? '' : bloques[c] === 'link' ? 'link' : 'no';
      pastilla.classList.toggle('promo-solo-link', como === 'link');
      pastilla.classList.toggle('promo-no-sale', como === 'no');
      if (!como) { if (marca) marca.remove(); pastilla.removeAttribute('title'); return; }
      var texto = como === 'link' ? T.soloLink : T.noSale;
      if (!marca) { marca = document.createElement('span'); marca.className = 'promo-oculta'; pastilla.appendChild(marca); }
      marca.innerHTML = '';
      var icono = document.createElement('span');
      icono.setAttribute('aria-hidden', 'true');
      icono.textContent = como === 'link' ? '🔗' : '⊘';
      var dicho = document.createElement('span');
      dicho.className = 'promo-oculta-texto';
      dicho.textContent = ' (' + texto + ')';
      marca.append(icono, dicho);
      pastilla.title = texto;
    });
  }
  /**
   * `b`: los bloques que manda el panel; `'todo'`, las seis (una versión de
   * prueba, o un panel de antes que no los manda); `null`, el panel no respondió.
   */
  function aplicar(b) {
    ultimo = b; decidido = true;
    var link = claveDelLink();
    if (!esReal || b === 'todo') {
      mostrarSolo(CLAVES, link);
      if (!esReal && b && typeof b === 'object') marcar(b);
    } else if (b) {
      var lista = CLAVES.filter(function (c) { return b[c] === 'lista'; });
      mostrarSolo(lista, link && b[link] ? link : (lista[0] || CLAVES[0]));
    } else {
      mostrarSolo([], link || CLAVES[0]);
    }
    if (nav) nav.classList.add('promo-lista');
  }

  abrirDelLink();
  window.addEventListener('hashchange', function () { if (decidido) aplicar(ultimo); else abrirDelLink(); });
  // Al elegir otra, el link de la barra la nombra: así se puede compartir.
  Array.prototype.forEach.call(document.querySelectorAll('.promo-radio[data-promo]'), function (r) {
    r.addEventListener('change', function () {
      if (r.checked && history.replaceState) history.replaceState(null, '', '#' + r.getAttribute('data-promo'));
    });
  });

  /* ---------- las promociones del panel ---------- */

  if (!esReal) aplicar('todo');
  if (!window.fetch) { if (esReal) aplicar(null); return; }
  // Un panel que tarda más de 5 segundos cuenta como que no respondió.
  var espera = esReal ? setTimeout(function () { if (!decidido) aplicar(null); }, 5000) : 0;
  var cajas = document.querySelectorAll('.cotizador[data-promo]');

  fetch(panel + '/api/publico/promociones')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      clearTimeout(espera);
      aplicar(d && d.bloques && typeof d.bloques === 'object' ? d.bloques : (d && !d.error ? 'todo' : null));
      if (!cajas.length) return;
      (d.promociones || []).forEach(function (p) {
        var caja = document.querySelector('.cotizador[data-promo="' + p.sitio + '"]');
        if (caja) montar(caja, p);
      });
    })
    .catch(function () { clearTimeout(espera); if (esReal) aplicar(null); });

  /* ---------- utilidades ---------- */

  function pesos(n) { return '$' + Math.round(n).toLocaleString(T.locale) + T.moneda; }
  /**
   * **El ? de cada producto** (2026-11-25, lo pidió el cliente: *"en un
   * pequeño signo de interrogación debería mostrar los detalles de cada
   * producto, menú, bebestibles, corto, compacto… estiloso, no invasivo, muy
   * fácil de salir… muy intuitivo"*). La misma pieza en cotizador.js y en
   * reserva.js: si cambia una, se cambia la otra.
   *
   * - Los textos están escondidos en la página (#detalles-productos), así que
   *   se traducen con el resto. Si un producto no tiene detalle, no hay ?.
   * - Al apretarlo, una caja corta justo debajo de esa opción, sin tapar
   *   nada; el ? pasa a ✕. Se cierra con el mismo botón, con Escape, tocando
   *   fuera o abriendo otro: hay una sola abierta a la vez.
   */
  var DETALLES = document.getElementById('detalles-productos');
  var detalleAbierto = null;
  function normalDetalle(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function detalleDeProducto(nombre) {
    if (!DETALLES || !nombre) return null;
    var n = normalDetalle(nombre), sinMenu = n.replace(/^menu (de )?/, '');
    var todos = Array.prototype.slice.call(DETALLES.querySelectorAll('[data-producto]'));
    var nombres = function (e) { return e.getAttribute('data-producto').split('|'); };
    var exacto = todos.filter(function (e) { return nombres(e).some(function (a) { return a === n || a === sinMenu; }); });
    if (exacto.length) return exacto[0];
    // Un nombre dentro del otro, por palabras: "Desayuno" calza con "desayuno de campo".
    var cerca = todos.filter(function (e) {
      return nombres(e).some(function (a) {
        return (' ' + sinMenu + ' ').indexOf(' ' + a + ' ') >= 0 || (' ' + a + ' ').indexOf(' ' + sinMenu + ' ') >= 0;
      });
    });
    return cerca.length === 1 ? cerca[0] : null;
  }
  function cerrarDetalle(devolverFoco) {
    if (!detalleAbierto) return;
    var b = detalleAbierto.boton;
    detalleAbierto.caja.remove();
    b.setAttribute('aria-expanded', 'false'); b.textContent = '?';
    b.setAttribute('aria-label', T.queIncluye + ' · ' + detalleAbierto.nombre);
    detalleAbierto = null;
    if (devolverFoco) b.focus();
  }
  /**
   * El ? de un producto. `nombre()` dice cuál es hoy; `poner(caja)` la deja en
   * su lugar; `etiqueta()`, si va, es como se lee (la fila de la reserva busca
   * por su clave, "tradiciones", y se lee "Menú Tradiciones").
   */
  function botonDetalle(nombre, poner, etiqueta) {
    var leer = etiqueta || nombre;
    if (!detalleDeProducto(nombre())) return null;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'detalle-btn'; b.textContent = '?';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', T.queIncluye + ' · ' + leer());
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var eraEste = detalleAbierto && detalleAbierto.boton === b;
      cerrarDetalle(false);
      if (eraEste) return;
      var d = detalleDeProducto(nombre());
      if (!d) return;
      var caja = document.createElement('div');
      caja.className = 'detalle-caja';
      caja.setAttribute('role', 'note');
      var parrafos = [];
      if (d.hasAttribute('data-casa')) {
        var casa = DETALLES.querySelector('[data-casa-lineas]');
        if (casa) parrafos = parrafos.concat(Array.prototype.slice.call(casa.querySelectorAll('p')));
      }
      var propios = Array.prototype.slice.call(d.querySelectorAll('p'));
      parrafos.concat(propios).forEach(function (p, k) {
        // "Entrada: …": el rótulo, chico y dorado, y el texto al lado. Una
        // línea sin rótulo ("De 4 a 12 años") va en la cursiva de los precios.
        var t = p.textContent, i = t.indexOf(': ');
        var linea = document.createElement('p');
        if (i > 0 && i < 28) {
          var rot = document.createElement('span'); rot.className = 'detalle-rotulo'; rot.textContent = t.slice(0, i);
          var txt = t.slice(i + 2);
          linea.append(rot, document.createTextNode(' ' + txt.charAt(0).toUpperCase() + txt.slice(1)));
        } else { linea.className = 'detalle-suelto'; linea.textContent = t; }
        // Lo propio del producto, después del menú de la casa, con un respiro y una línea.
        if (parrafos.length && k === parrafos.length) linea.classList.add('detalle-propio');
        caja.appendChild(linea);
      });
      poner(caja);
      b.setAttribute('aria-expanded', 'true'); b.textContent = '✕';
      b.setAttribute('aria-label', T.cerrarDetalle + ' · ' + leer());
      detalleAbierto = { boton: b, caja: caja, nombre: leer() };
    });
    return b;
  }
  document.addEventListener('click', function (e) {
    if (detalleAbierto && !detalleAbierto.caja.contains(e.target) && e.target !== detalleAbierto.boton) cerrarDetalle(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && detalleAbierto) cerrarDetalle(true);
  });

  /** El nombre de un producto con su ? al lado, en un renglón que no los separa. */
  function nombreConDetalle(nombre, poner) {
    var n = el('span', 'detalle-nombre');
    n.appendChild(el('strong', '', nombre));
    var b = botonDetalle(function () { return nombre; }, poner);
    if (b) n.appendChild(b);
    return n;
  }
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  /** `AAAA-MM-DD` de dentro de `n` días, en la hora del navegador. */
  function diaEn(n) {
    var d = new Date(); d.setDate(d.getDate() + n);
    var m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  /** Una fecha AAAA-MM-DD en palabras, en el idioma de la página: "sábado 12 de diciembre". */
  function fechaLarga(f) {
    var p = f.split('-').map(Number);
    try { return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(idioma, { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return f; }
  }

  /**
   * **El calendario del cotizador** (2026-11-25): la misma forma que el de la
   * reserva (`reserva.js`, clases `cal-*`). La semana parte en lunes; los días
   * antes de `minimo` son un número suelto (un `<span>`: el teclado no pasa por
   * ellos) y los que se pueden elegir, teclas. Abre en el mes del primer día
   * posible, y no deja ir a un mes anterior a ese. Las fechas son texto
   * AAAA-MM-DD de punta a punta, como en la reserva.
   */
  function calendario(minimo, alElegir) {
    var caja = el('div', 'calendario cot-cal');
    var mesMin = minimo.slice(0, 8) + '01';
    var mes = mesMin, elegida = '';
    var hoy = diaEn(0);
    function correr(m, n) {
      var p = m.split('-').map(Number), k = p[1] - 1 + n;
      var y = p[0] + Math.floor(k / 12); k = ((k % 12) + 12) % 12;
      return y + '-' + String(k + 1).padStart(2, '0') + '-01';
    }
    var mesMax = correr(mesMin, 18);
    function dibujar() {
      caja.innerHTML = '';
      var p = mes.split('-').map(Number);
      var cab = el('div', 'cal-cab');
      function flecha(n, etiqueta, puede) {
        var b = el('button', 'cal-nav', n < 0 ? '\u2039' : '\u203A');
        b.type = 'button'; b.setAttribute('aria-label', etiqueta); b.title = etiqueta; b.disabled = !puede;
        b.addEventListener('click', function () { mes = correr(mes, n); dibujar(); });
        return b;
      }
      var nombre = mes;
      try { nombre = new Date(p[0], p[1] - 1, 1).toLocaleDateString(idioma, { month: 'long', year: 'numeric' }); } catch (e) { /* queda AAAA-MM */ }
      cab.append(flecha(-1, T.mesAnterior, mes > mesMin), el('strong', 'cal-mes', nombre), flecha(1, T.mesSiguiente, mes < mesMax));
      caja.appendChild(cab);
      var grilla = el('div', 'cal-grilla');
      for (var i = 0; i < 7; i++) {
        var ini;
        try { ini = new Date(2024, 0, 1 + i).toLocaleDateString(idioma, { weekday: 'narrow' }); } catch (e) { ini = 'LMMJVSD'[i]; }
        var wd = el('span', 'cal-wd', ini); wd.setAttribute('aria-hidden', 'true'); grilla.appendChild(wd);
      }
      var desde = (new Date(p[0], p[1] - 1, 1).getDay() + 6) % 7;
      for (var h = 0; h < desde; h++) grilla.appendChild(el('span', 'cal-dia vacio'));
      var dias = new Date(p[0], p[1], 0).getDate();
      for (var d = 1; d <= dias; d++) {
        var f = mes.slice(0, 8) + String(d).padStart(2, '0');
        var marcaHoy = f === hoy ? ' hoy' : '';
        if (f < minimo) { grilla.appendChild(el('span', 'cal-dia cerrado' + marcaHoy, String(d))); continue; }
        var b = el('button', 'cal-dia abierto' + marcaHoy + (f === elegida ? ' elegido' : ''), String(d));
        b.type = 'button'; b.setAttribute('aria-label', fechaLarga(f));
        if (f === elegida) b.setAttribute('aria-current', 'date');
        b.addEventListener('click', (function (fecha) {
          return function () { elegida = fecha; dibujar(); alElegir(fecha); };
        })(f));
        grilla.appendChild(b);
      }
      caja.appendChild(grilla);
    }
    dibujar();
    return caja;
  }
  function precioDe(x) {
    return pesos(x.precio) + (x.masIva ? ' ' + T.masIva : '') + ' ' + (x.fijo ? T.fijo : T.porPersona);
  }

  /**
   * El contador de − y +, de 44px, como el de la reserva. `maximo`, si va,
   * es una función: el tope se mueve con el grupo. `fila.fijar(n)` cambia el
   * número sin avisar (lo usa quien lo sigue desde afuera).
   */
  function contador(rotulo, valor, minimo, alCambiar, maximo) {
    var fila = el('div', 'cot-contador');
    var nombre = el('span', 'cot-rotulo', rotulo);
    var menos = el('button', 'cot-tecla', '−'); menos.type = 'button'; menos.setAttribute('aria-label', T.menos + ' · ' + rotulo);
    var campo = el('input', 'cot-numero'); campo.type = 'number'; campo.min = String(minimo); campo.value = String(valor);
    campo.setAttribute('aria-label', rotulo); campo.inputMode = 'numeric';
    var mas = el('button', 'cot-tecla', '+'); mas.type = 'button'; mas.setAttribute('aria-label', T.mas + ' · ' + rotulo);
    function poner(n) {
      n = Math.max(minimo, Math.min(maximo ? maximo() : 2000, Math.round(Number(n) || 0)));
      campo.value = String(n); alCambiar(n);
    }
    menos.addEventListener('click', function () { poner(Number(campo.value) - 1); });
    mas.addEventListener('click', function () { poner(Number(campo.value) + 1); });
    campo.addEventListener('change', function () { poner(campo.value); });
    var teclas = el('div', 'cot-teclas'); teclas.append(menos, campo, mas);
    fila.append(nombre, teclas);
    fila.fijar = function (n) { campo.value = String(n); };
    return fila;
  }

  /* ---------- el cotizador de una promoción ---------- */

  function montar(caja, promo) {
    // **Los menús de niños, uno o varios** (2026-11-24: Niños y Pequeños a la
    // vez). El panel de antes mandaba uno solo, o nada.
    var menusNinos = Array.isArray(promo.ninos) ? promo.ninos : (promo.ninos ? [promo.ninos] : []);
    var estado = {
      adultos: promo.minimo, ninos: menusNinos.map(function () { return 0; }), fecha: '',
      menu: promo.menus.length === 1 ? promo.menus[0].nombre : '', suma: [], exclusivo: false,
      // Para cuántos va cada extra sumado que se cobra por persona, y si el
      // cliente ya lo movió: mientras no lo toque, sigue al grupo.
      cuantos: {}, tocado: {}
    };
    function invitados() { return estado.adultos + estado.ninos.reduce(function (a, n) { return a + n; }, 0); }
    var siguen = [];
    /** El grupo cambió: lo sumado sin tocar va para todos, y nada pasa del grupo. */
    function grupoCambio() {
      var n = Math.max(1, invitados());
      siguen.forEach(function (x) {
        var c = estado.tocado[x.nombre] ? Math.min(estado.cuantos[x.nombre] || n, n) : n;
        estado.cuantos[x.nombre] = c; x.fila.fijar(c);
      });
      calcular();
    }
    var reloj = null, ultima = null;

    // Los datos del bloque dicen lo del panel: desde cuánto y desde cuántas personas.
    var bloque = caja.closest('.promo-bloque');
    var datoPrecio = bloque && bloque.querySelector('[data-cot="precio"]');
    if (datoPrecio && promo.desde > 0) {
      datoPrecio.innerHTML = '';
      var b = el('b'); b.appendChild(el('i', 'monto', T.desde + ' ' + pesos(promo.desde)));
      datoPrecio.append(b, el('span', '', T.porPersonaIva));
    }
    // El precio de niños de ejemplo se va: los niños se cotizan en el cotizador.
    if (bloque) Array.prototype.forEach.call(bloque.querySelectorAll('[data-cot="ocultar"]'), function (x) { x.hidden = true; });
    var datoMinimo = bloque && bloque.querySelector('[data-cot="minimo"]');
    if (datoMinimo) {
      datoMinimo.innerHTML = '';
      datoMinimo.append(el('b', '', String(promo.minimo)), el('span', '', T.enAdelante));
    }

    var raiz = el('section', 'cot');
    raiz.setAttribute('aria-label', T.titulo);
    var cabeza = el('div', 'cot-cabeza');
    cabeza.append(el('h3', 'cot-titulo', T.titulo), el('p', 'cot-bajada', T.bajada));
    var pasos = el('div', 'cot-pasos');
    raiz.append(cabeza, pasos);

    function paso(n, titulo) {
      var p = el('div', 'cot-paso');
      var t = el('p', 'cot-paso-titulo'); t.append(el('span', 'cot-num', String(n)), document.createTextNode(titulo));
      p.appendChild(t); pasos.appendChild(p);
      return p;
    }

    // 1. Qué día. **En un calendario, como el de la reserva** (2026-11-25, lo
    // pidió el cliente: *"que intuitivamente el usuario entiende qué próxima
    // fecha es elegible y que no le deja elegir fecha inferior a la fecha de
    // anticipación"*). Con el campo de fecha del navegador, los días antes del
    // plazo apenas se veían grises y se podían escribir a mano. Acá son un
    // número suelto, sin caja, y los que se pueden elegir son teclas: la forma
    // del calendario de reservas.html. Va primero, como en la reserva.
    var plazo = Math.max(1, Number(promo.anticipacion) || 0);
    var minimo = diaEn(plazo);
    var alCambiarFecha = [];
    var p1 = paso(1, T.pasoDia);
    p1.appendChild(calendario(minimo, function (f) {
      estado.fecha = f;
      alCambiarFecha.forEach(function (fn) { fn(); });
      calcular();
    }));
    if (plazo > 1) p1.appendChild(el('p', 'cot-plazo', T.conAnticipacion.replace('{n}', plazo).replace('{f}', fechaLarga(minimo))));

    // 2. Cuántos son, lo que incluye y el lugar exclusivo.
    var pc = paso(2, T.pasoCuantos);
    pc.appendChild(contador(menusNinos.length ? T.adultos : T.personas, estado.adultos, 0, function (n) { estado.adultos = n; grupoCambio(); }));
    // Con un solo menú de niños, el contador dice "Niños"; con varios, el nombre de cada menú.
    menusNinos.forEach(function (m, k) {
      pc.appendChild(contador(menusNinos.length === 1 ? T.ninos : m.nombre, 0, 0, function (n) { estado.ninos[k] = n; grupoCambio(); }));
    });

    // 3. Qué menú y qué se suma.
    var p2 = paso(3, T.paso2);
    if (promo.menus.length === 1) {
      var fijo = el('p', 'cot-fijo');
      fijo.append(el('span', 'cot-rotulo', T.menuFijo),
        nombreConDetalle(promo.menus[0].nombre, function (c) { fijo.after(c); }),
        el('span', 'cot-precio', precioDe(promo.menus[0])));
      p2.appendChild(fijo);
    } else {
      var grupo = el('div', 'cot-opciones'); grupo.setAttribute('role', 'radiogroup'); grupo.setAttribute('aria-label', T.paso2);
      promo.menus.forEach(function (m) {
        var o = el('label', 'cot-opcion');
        var r = el('input'); r.type = 'radio'; r.name = 'cot-menu-' + promo.sitio; r.value = m.nombre;
        r.addEventListener('change', function () { estado.menu = m.nombre; calcular(); });
        var texto = el('span', 'cot-opcion-texto');
        texto.append(nombreConDetalle(m.nombre, function (c) { o.after(c); }), el('span', 'cot-precio', precioDe(m)));
        o.append(r, texto); grupo.appendChild(o);
      });
      p2.appendChild(grupo);
    }
    // Lo que incluye va en el paso de cuántos son, que tiene espacio: así el
    // del menú no crece y el cotizador cabe en una pantalla.
    if (promo.incluye.length) {
      var inc = el('p', 'cot-incluye'); inc.appendChild(el('span', 'cot-rotulo', T.incluye));
      promo.incluye.forEach(function (x, k) {
        if (k) inc.appendChild(document.createTextNode(' · '));
        var b = botonDetalle(function () { return x; }, function (c) { inc.after(c); });
        var cosa = el('span', 'detalle-nombre', x); if (b) cosa.appendChild(b);
        inc.appendChild(cosa);
      });
      pc.appendChild(inc);
    }
    // **El lugar exclusivo** (2026-11-25): suma el arriendo del recinto a su
    // precio estándar, sin el descuento de la promoción. Solo si el panel manda
    // el arriendo (un panel de antes no lo manda: sin casilla, como siempre).
    // Va en el paso 1, que tiene espacio. Si la promoción nunca cobra arriendo,
    // dice que va incluido.
    if (promo.arriendo) {
      var exCaja = el('div', 'cot-extra cot-exclusivo');
      var exO = el('label', 'cot-opcion');
      var exC = el('input'); exC.type = 'checkbox';
      var exTexto = el('span', 'cot-opcion-texto');
      var exPrecio = el('span', 'cot-precio');
      // El precio estándar depende del día: de lunes a viernes puede ser otro
      // (Configuración → arriendoSemana). Se reescribe al cambiar la fecha.
      var precioExclusivo = function () {
        if (promo.arriendoIncluido) return T.incluido;
        var p = promo.arriendo.precio;
        if (estado.fecha) {
          // Sábado y domingo, el precio de un día público; de lunes a viernes, el de semana.
          var d = new Date(estado.fecha + 'T12:00:00').getDay();
          if (d >= 1 && d <= 5) { if (promo.arriendoSemana > 0) p = promo.arriendoSemana; }
          else if (promo.arriendoFinde > 0) p = promo.arriendoFinde;
        }
        return T.exclusivoPrecio.replace('{m}', pesos(p) + (promo.arriendo.masIva ? ' ' + T.masIva : ''));
      };
      exPrecio.textContent = precioExclusivo();
      alCambiarFecha.push(function () { exPrecio.textContent = precioExclusivo(); });
      exTexto.append(el('strong', '', T.exclusivo), exPrecio);
      exO.append(exC, exTexto); exCaja.appendChild(exO);
      exC.addEventListener('change', function () { estado.exclusivo = exC.checked; calcular(); });
      pc.appendChild(exCaja);
    }
    if (promo.suma.length) {
      p2.appendChild(el('p', 'cot-rotulo cot-rotulo-suelto', T.suma));
      // **Lo que se cobra por persona, para cuántos** (2026-11-24, lo pidió el
      // cliente: *"de los 22 que quieren menú, solo 15 quieren andar en
      // go-kart"*): al marcarlo aparece *¿Cuántos?*, con todo el grupo; se
      // baja, y no pasa del grupo. Un monto fijo, solo la casilla.
      promo.suma.forEach(function (s) {
        var caja = el('div', 'cot-extra');
        var o = el('label', 'cot-opcion');
        var c = el('input'); c.type = 'checkbox'; c.value = s.nombre;
        // El nombre y su precio en un renglón, como los menús; quién lo cobra, debajo.
        var texto = el('span', 'cot-opcion-texto');
        texto.append(nombreConDetalle(s.nombre, function (cj) { o.after(cj); }), el('span', 'cot-precio', precioDe(s)));
        if (s.loCobra) texto.appendChild(el('span', 'cot-cobra', T.loCobra + ' ' + s.loCobra));
        o.append(c, texto); caja.appendChild(o);
        var fila = null;
        if (!s.fijo) {
          fila = contador(T.cuantos, invitados(), 1, function (n) {
            estado.cuantos[s.nombre] = n; estado.tocado[s.nombre] = n < invitados(); calcular();
          }, function () { return Math.max(1, invitados()); });
          fila.classList.add('cot-cuantos'); fila.hidden = true;
          fila.querySelector('.cot-numero').setAttribute('aria-label', T.cuantos + ' · ' + s.nombre);
          siguen.push({ nombre: s.nombre, fila: fila });
          caja.appendChild(fila);
        }
        c.addEventListener('change', function () {
          estado.suma = c.checked ? estado.suma.concat(s.nombre) : estado.suma.filter(function (x) { return x !== s.nombre; });
          if (fila) {
            // Al marcarlo, para todo el grupo.
            estado.cuantos[s.nombre] = Math.max(1, invitados()); estado.tocado[s.nombre] = false;
            fila.fijar(estado.cuantos[s.nombre]); fila.hidden = !c.checked;
          }
          calcular();
        });
        p2.appendChild(caja);
      });
    }

    // 3. La boleta y el envío.
    var p3 = paso(4, T.paso3);
    p3.classList.add('cot-final');
    var boleta = el('div', 'cot-boleta'); boleta.setAttribute('aria-live', 'polite');
    var aviso = el('p', 'cot-aviso', T.faltaDia);
    boleta.appendChild(aviso);
    p3.appendChild(boleta);

    // Con el total a la vista, *Quiero esta cotización* cambia la boleta por
    // los datos: en el computador caben tres pasos lado a lado en una
    // pantalla, y los datos se piden cuando ya se vio el precio.
    var quiero = el('button', 'btn cot-quiero', T.quiero); quiero.type = 'button'; quiero.disabled = true;
    p3.appendChild(quiero);
    // El resumen y *← Ver el detalle* en un renglón, arriba de los datos.
    var filaResumen = el('div', 'cot-resumen-fila'); filaResumen.hidden = true;
    var resumen = el('p', 'cot-resumen');
    var volver = el('button', 'cot-volver', T.volver); volver.type = 'button';
    filaResumen.append(resumen, volver);
    var form = el('form', 'cot-form'); form.noValidate = true; form.hidden = true;
    p3.append(filaResumen, form);
    function verDatos(si) {
      boleta.hidden = si; quiero.hidden = si; filaResumen.hidden = !si; form.hidden = !si;
      if (si && ultima) {
        resumen.textContent = T.total + ' ' + pesos(ultima.cuentas.total) + ' · ' + ultima.invitados + ' '
          + T.personas.toLowerCase() + ' · ' + estado.fecha.split('-').reverse().join('-');
        fNombre.focus();
      }
    }
    quiero.addEventListener('click', function () { verDatos(true); });
    volver.addEventListener('click', function () { verDatos(false); });
    function campo(nombre, rotulo, tipo, auto) {
      var l = el('label', 'cot-etiqueta'); l.appendChild(el('span', 'cot-rotulo', rotulo));
      var i = el('input', 'cot-campo'); i.name = nombre; i.type = tipo; if (auto) i.autocomplete = auto;
      l.appendChild(i); form.appendChild(l); return i;
    }
    var fNombre = campo('nombre', T.nombre, 'text', 'name');
    var fEmpresa = campo('empresa', T.empresa, 'text', 'organization');
    var fTelefono = campo('telefono', T.telefono, 'tel', 'tel');
    var fCorreo = campo('correo', T.correo, 'email', 'email');
    // La trampa: una persona no la ve ni la llena.
    var trampa = el('input', 'cot-trampa'); trampa.name = 'web'; trampa.tabIndex = -1; trampa.autocomplete = 'off';
    trampa.setAttribute('aria-hidden', 'true'); form.appendChild(trampa);
    var boton = el('button', 'btn cot-enviar', T.enviar); boton.type = 'submit'; boton.disabled = true;
    var mensaje = el('p', 'cot-mensaje', T.envioNota);
    form.append(boton, mensaje);

    caja.innerHTML = ''; caja.appendChild(raiz); caja.hidden = false;
    // El botón de WhatsApp del bloque pasa a ser la segunda opción.
    if (bloque) Array.prototype.forEach.call(bloque.querySelectorAll('.btn-whatsapp'), function (w) { w.classList.add('cot-secundario'); });

    function textoError(codigo, minimo, dias) {
      if (codigo === 'minimo') return T.minimo.replace('{n}', minimo);
      if (codigo === 'anticipacion') return T.anticipacion.replace('{n}', dias || plazo);
      if (codigo === 'sinExclusivo') return T.sinExclusivo;
      return T[codigo] || (codigo === 'sinPrecio' || codigo === 'promocion' ? T.sinCotizar : T.error);
    }

    function dibujar(r) {
      boleta.innerHTML = '';
      ultima = r && r.ok ? r : null;
      boton.disabled = !ultima; quiero.disabled = !ultima;
      if (!ultima) verDatos(false);
      if (!r) { boleta.appendChild(el('p', 'cot-aviso', T.faltaDia)); return; }
      if (!r.ok) { boleta.appendChild(el('p', 'cot-aviso cot-aviso-alerta', textoError(r.codigo, r.minimo, r.dias))); return; }
      var lista = el('ul', 'cot-lineas');
      r.lineas.forEach(function (l) {
        var li = el('li');
        li.append(el('span', '', (l.cantidad > 1 ? l.cantidad + ' × ' : '') + l.concepto),
          el('span', 'cot-monto', l.incluido ? T.incluido : pesos(l.neto)));
        lista.appendChild(li);
      });
      boleta.appendChild(lista);
      var cuentas = el('dl', 'cot-cuentas');
      function fila(dt, dd, clase) { var d = el('div', clase || ''); d.append(el('dt', '', dt), el('dd', '', dd)); cuentas.appendChild(d); }
      fila(T.neto, pesos(r.cuentas.subtotal));
      if (r.cuentas.descuento > 0) fila(T.descuento + ' ' + r.descuento + '%', '−' + pesos(r.cuentas.descuento));
      fila(T.iva, pesos(r.cuentas.iva));
      fila(T.total, pesos(r.cuentas.total), 'cot-total');
      boleta.appendChild(cuentas);
      boleta.appendChild(el('p', 'cot-por-persona', pesos(r.porPersona) + ' ' + T.totalPersona));
      (r.otras || []).forEach(function (o) {
        boleta.appendChild(el('p', 'cot-aparte', T.aparte.replace('{c}', o.conceptos.join(', '))
          .replace('{m}', pesos(o.total)).replace('{e}', o.empresa)));
      });
      // Con el lugar exclusivo, la nota es la del arriendo estándar (o la de que va incluido).
      if (r.exclusivo) boleta.appendChild(el('p', 'cot-nota', T.arriendoEstandar));
      else if (r.exclusivoGratis) boleta.appendChild(el('p', 'cot-nota', T.arriendoIncluido));
      else if (r.publico) boleta.appendChild(el('p', 'cot-nota', T.publico));
      else if (r.arriendo > 0) boleta.appendChild(el('p', 'cot-nota', T.arriendo + ' ' + pesos(r.arriendo) + ' ' + T.masIva + '.'));
    }

    /**
     * Para cuántos va cada extra sumado, en el orden de `suma`; 0 es para todo
     * el grupo (un monto fijo). Va aparte de `suma`: un panel de antes lo
     * ignora y cobra para todos, en vez de no reconocer el extra.
     */
    function cuantos() {
      return estado.suma.map(function (n) { return estado.cuantos[n] || 0; });
    }

    function calcular() {
      clearTimeout(reloj);
      if (!estado.fecha) { dibujar(null); return; }
      // Un día escrito a mano antes del plazo: se dice sin preguntarle al panel.
      if (estado.fecha < minimo) { dibujar({ ok: false, codigo: plazo > 1 ? 'anticipacion' : 'fecha', dias: plazo }); return; }
      if (!estado.menu) { dibujar({ ok: false, codigo: 'menu' }); return; }
      var ninos = estado.ninos.reduce(function (a, n) { return a + n; }, 0);
      if (estado.adultos + ninos < promo.minimo) { dibujar({ ok: false, codigo: 'minimo', minimo: promo.minimo }); return; }
      boton.disabled = true; quiero.disabled = true;
      boleta.innerHTML = ''; boleta.appendChild(el('p', 'cot-aviso', T.calculando));
      // Se pregunta cuando se deja de mover los números: cada pregunta lee la planilla.
      reloj = setTimeout(function () {
        var q = new URLSearchParams({
          promo: promo.sitio, adultos: String(estado.adultos), ninos: estado.ninos.join(','),
          menu: estado.menu, suma: estado.suma.join('|'), cuantos: cuantos().join('|'), fecha: estado.fecha
        });
        // Solo si lo pidió: así la misma pregunta de antes sigue siendo la misma.
        if (estado.exclusivo) q.set('exclusivo', '1');
        fetch(panel + '/api/publico/cotizar?' + q.toString())
          .then(function (r) { return r.json(); })
          .then(dibujar)
          .catch(function () { dibujar({ ok: false, codigo: 'error' }); });
      }, 600);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ultima) return;
      var nombre = fNombre.value.trim(), telefono = fTelefono.value.trim(), correo = fCorreo.value.trim();
      if (nombre.length < 2) { mensaje.textContent = T.faltaNombre; mensaje.className = 'cot-mensaje cot-aviso-alerta'; fNombre.focus(); return; }
      if (telefono.replace(/\D/g, '').length < 8) { mensaje.textContent = T.faltaTelefono; mensaje.className = 'cot-mensaje cot-aviso-alerta'; fTelefono.focus(); return; }
      boton.disabled = true; boton.textContent = T.enviando;
      fetch(panel + '/api/publico/cotizar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          promo: promo.sitio, adultos: estado.adultos, ninos: estado.ninos, menu: estado.menu, suma: estado.suma, cuantos: cuantos(),
          exclusivo: estado.exclusivo, fecha: estado.fecha, nombre: nombre, empresa: fEmpresa.value.trim(), telefono: telefono, correo: correo,
          web: trampa.value, idioma: idioma, prueba: !esReal
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok) {
          var t = d.codigo === 'nombre' ? T.faltaNombre : d.codigo === 'telefono' ? T.faltaTelefono
            : d.codigo === 'correo' ? T.faltaCorreo : d.codigo === 'tope' ? T.tope : textoError(d.codigo, d.minimo, d.dias);
          mensaje.textContent = t; mensaje.className = 'cot-mensaje cot-aviso-alerta';
          boton.disabled = false; boton.textContent = T.enviar;
          return;
        }
        listo(d);
      }).catch(function () {
        mensaje.textContent = T.error; mensaje.className = 'cot-mensaje cot-aviso-alerta';
        boton.disabled = false; boton.textContent = T.enviar;
      });
    });

    function listo(d) {
      var hecho = el('div', 'cot-listo');
      hecho.appendChild(el('p', 'cot-listo-titulo', d.prueba ? T.prueba : '✓ ' + T.listo + ' ' + d.numero));
      var acciones = el('div', 'cot-listo-acciones');
      if (d.link) {
        var ver = el('a', 'btn', T.ver); ver.href = d.link; ver.target = '_blank'; ver.rel = 'noopener';
        acciones.appendChild(ver);
      }
      var wa = el('a', 'btn btn-ghost', T.whatsapp);
      wa.href = 'https://wa.me/' + CONFIG.whatsapp + '?text=' +
        encodeURIComponent(T.mensaje.replace('{promo}', promo.nombre).replace('{n}', d.numero || ''));
      wa.target = '_blank'; wa.rel = 'noopener';
      acciones.appendChild(wa);
      hecho.appendChild(acciones);
      form.replaceWith(hecho); volver.hidden = true;
    }
  }
})();
