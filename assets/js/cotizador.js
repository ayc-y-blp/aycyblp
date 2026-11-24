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
 * - **Manda la cotización** al panel, que la deja enviada y a nombre de la
 *   vendedora de turno, y le ofrece al cliente el WhatsApp de Eventos.
 * - **Abre la promoción del link** (`promociones.html#gran-premio`): el link
 *   de campaña que se copia en el panel.
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
      paso1: '¿Cuántos y qué día?', paso2: '¿Qué menú?', paso3: 'Tu cotización', quiero: 'Quiero esta cotización', volver: '← Ver el detalle',
      personas: 'Personas', adultos: 'Adultos', ninos: 'Niños', dia: 'Día del evento',
      menos: 'Uno menos', mas: 'Uno más', menuFijo: 'Menú', incluye: 'Incluye', suma: 'Se puede sumar',
      porPersona: 'por persona', fijo: 'una vez', masIva: '+ IVA', loCobra: 'lo cobra',
      neto: 'Neto', descuento: 'Descuento', iva: 'IVA 19%', total: 'Total', incluido: 'incluido',
      totalPersona: 'por persona, IVA incluido',
      aparte: '{c}: {m}, aparte. Lo cobra {e}.',
      publico: 'Día abierto al público: el show va incluido.',
      arriendo: 'Ese día el recinto es para ustedes: lleva arriendo desde',
      faltaDia: 'Elige el día para ver el total.',
      calculando: 'Calculando…',
      minimo: 'Esta promoción es desde {n} personas.',
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
      desde: 'desde', porPersonaIva: '+ IVA por persona', enAdelante: 'personas en adelante'
    },
    en: {
      locale: 'en-US', moneda: ' CLP',
      titulo: 'Get a quote online', bajada: 'Choose and see the total right away. We send you the formal quote and contact you today.',
      paso1: 'How many and which day?', paso2: 'Which menu?', paso3: 'Your quote', quiero: 'I want this quote', volver: '← See the details',
      personas: 'People', adultos: 'Adults', ninos: 'Children', dia: 'Event date',
      menos: 'One less', mas: 'One more', menuFijo: 'Menu', incluye: 'Includes', suma: 'You can add',
      porPersona: 'per person', fijo: 'one time', masIva: '+ VAT', loCobra: 'charged by',
      neto: 'Net', descuento: 'Discount', iva: 'VAT 19%', total: 'Total', incluido: 'included',
      totalPersona: 'per person, VAT included',
      aparte: '{c}: {m}, separately. Charged by {e}.',
      publico: 'Open to the public that day: the show is included.',
      arriendo: 'The venue is all yours that day: venue rental from',
      faltaDia: 'Choose the date to see the total.',
      calculando: 'Calculating…',
      minimo: 'This offer starts at {n} people.',
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
      desde: 'from', porPersonaIva: '+ VAT per person', enAdelante: 'people and up'
    },
    pt: {
      locale: 'pt-BR', moneda: ' CLP',
      titulo: 'Faça seu orçamento online', bajada: 'Escolha e veja o total na hora. Enviamos o orçamento formal e entramos em contato hoje.',
      paso1: 'Quantos e em que dia?', paso2: 'Qual cardápio?', paso3: 'Seu orçamento', quiero: 'Quero este orçamento', volver: '← Ver o detalhe',
      personas: 'Pessoas', adultos: 'Adultos', ninos: 'Crianças', dia: 'Data do evento',
      menos: 'Um a menos', mas: 'Um a mais', menuFijo: 'Cardápio', incluye: 'Inclui', suma: 'Você pode somar',
      porPersona: 'por pessoa', fijo: 'uma vez', masIva: '+ IVA', loCobra: 'cobrado por',
      neto: 'Líquido', descuento: 'Desconto', iva: 'IVA 19%', total: 'Total', incluido: 'incluído',
      totalPersona: 'por pessoa, IVA incluído',
      aparte: '{c}: {m}, à parte. Cobrado por {e}.',
      publico: 'Dia aberto ao público: o show está incluído.',
      arriendo: 'Nesse dia o espaço é só de vocês: aluguel a partir de',
      faltaDia: 'Escolha o dia para ver o total.',
      calculando: 'Calculando…',
      minimo: 'Esta promoção é a partir de {n} pessoas.',
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
      desde: 'a partir de', porPersonaIva: '+ IVA por pessoa', enAdelante: 'pessoas ou mais'
    }
  };

  var idioma = (document.documentElement.lang || 'es').slice(0, 2);
  var T = TEXTOS[idioma] || TEXTOS.es;
  var CLAVES = ['fin-de-ano', 'combate', 'gran-premio', 'dia-de-campo', 'ia', 'directorio'];

  /* ---------- el link de campaña: abrir la promoción del # ---------- */

  function radioDe(clave) { return document.querySelector('.promo-radio[data-promo="' + clave + '"]'); }

  function abrirDelLink() {
    var clave = decodeURIComponent((location.hash || '').slice(1));
    if (CLAVES.indexOf(clave) === -1) return;
    var r = radioDe(clave);
    if (r) r.checked = true;
  }
  abrirDelLink();
  window.addEventListener('hashchange', abrirDelLink);
  // Al elegir otra, el link de la barra la nombra: así se puede compartir.
  Array.prototype.forEach.call(document.querySelectorAll('.promo-radio[data-promo]'), function (r) {
    r.addEventListener('change', function () {
      if (r.checked && history.replaceState) history.replaceState(null, '', '#' + r.getAttribute('data-promo'));
    });
  });

  /* ---------- con quién habla ---------- */

  var esReal = CONFIG.direccionesReales.indexOf(location.hostname) !== -1;
  var panel = CONFIG.panel;
  // En un computador, `?panel=http://localhost:3125` lo prueba contra el panel de ejemplo.
  var pedido = new URLSearchParams(location.search).get('panel');
  if (pedido && /^http:\/\/localhost:\d+$/.test(pedido) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) panel = pedido;

  var cajas = document.querySelectorAll('.cotizador[data-promo]');
  if (!cajas.length || !window.fetch) return;

  fetch(panel + '/api/publico/promociones')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      (d.promociones || []).forEach(function (p) {
        var caja = document.querySelector('.cotizador[data-promo="' + p.sitio + '"]');
        if (caja) montar(caja, p);
      });
    })
    .catch(function () { /* sin panel, cada promoción sigue con su WhatsApp */ });

  /* ---------- utilidades ---------- */

  function pesos(n) { return '$' + Math.round(n).toLocaleString(T.locale) + T.moneda; }
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function manana() {
    var d = new Date(); d.setDate(d.getDate() + 1);
    var m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function precioDe(x) {
    return pesos(x.precio) + (x.masIva ? ' ' + T.masIva : '') + ' ' + (x.fijo ? T.fijo : T.porPersona);
  }

  /** El contador de − y +, de 44px, como el de la reserva. */
  function contador(rotulo, valor, minimo, alCambiar) {
    var fila = el('div', 'cot-contador');
    var nombre = el('span', 'cot-rotulo', rotulo);
    var menos = el('button', 'cot-tecla', '−'); menos.type = 'button'; menos.setAttribute('aria-label', T.menos + ' · ' + rotulo);
    var campo = el('input', 'cot-numero'); campo.type = 'number'; campo.min = String(minimo); campo.value = String(valor);
    campo.setAttribute('aria-label', rotulo); campo.inputMode = 'numeric';
    var mas = el('button', 'cot-tecla', '+'); mas.type = 'button'; mas.setAttribute('aria-label', T.mas + ' · ' + rotulo);
    function poner(n) { n = Math.max(minimo, Math.min(2000, Math.round(Number(n) || 0))); campo.value = String(n); alCambiar(n); }
    menos.addEventListener('click', function () { poner(Number(campo.value) - 1); });
    mas.addEventListener('click', function () { poner(Number(campo.value) + 1); });
    campo.addEventListener('change', function () { poner(campo.value); });
    var teclas = el('div', 'cot-teclas'); teclas.append(menos, campo, mas);
    fila.append(nombre, teclas);
    return fila;
  }

  /* ---------- el cotizador de una promoción ---------- */

  function montar(caja, promo) {
    var estado = {
      adultos: promo.minimo, ninos: 0, fecha: '',
      menu: promo.menus.length === 1 ? promo.menus[0].nombre : '', suma: []
    };
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

    // 1. Cuántos y qué día.
    var p1 = paso(1, T.paso1);
    p1.appendChild(contador(promo.ninos ? T.adultos : T.personas, estado.adultos, 0, function (n) { estado.adultos = n; calcular(); }));
    if (promo.ninos) p1.appendChild(contador(T.ninos, 0, 0, function (n) { estado.ninos = n; calcular(); }));
    var dia = el('label', 'cot-dia');
    dia.appendChild(el('span', 'cot-rotulo', T.dia));
    var fecha = el('input', 'cot-campo'); fecha.type = 'date'; fecha.min = manana();
    fecha.addEventListener('change', function () { estado.fecha = fecha.value; calcular(); });
    dia.appendChild(fecha); p1.appendChild(dia);

    // 2. Qué menú y qué se suma.
    var p2 = paso(2, T.paso2);
    if (promo.menus.length === 1) {
      var fijo = el('p', 'cot-fijo');
      fijo.append(el('span', 'cot-rotulo', T.menuFijo), el('strong', '', promo.menus[0].nombre),
        el('span', 'cot-precio', precioDe(promo.menus[0])));
      p2.appendChild(fijo);
    } else {
      var grupo = el('div', 'cot-opciones'); grupo.setAttribute('role', 'radiogroup'); grupo.setAttribute('aria-label', T.paso2);
      promo.menus.forEach(function (m) {
        var o = el('label', 'cot-opcion');
        var r = el('input'); r.type = 'radio'; r.name = 'cot-menu-' + promo.sitio; r.value = m.nombre;
        r.addEventListener('change', function () { estado.menu = m.nombre; calcular(); });
        var texto = el('span', 'cot-opcion-texto'); texto.append(el('strong', '', m.nombre), el('span', 'cot-precio', precioDe(m)));
        o.append(r, texto); grupo.appendChild(o);
      });
      p2.appendChild(grupo);
    }
    // Lo que incluye va en el paso 1, que tiene espacio: así el paso 2 no
    // crece y el cotizador cabe en una pantalla.
    if (promo.incluye.length) {
      var inc = el('p', 'cot-incluye'); inc.append(el('span', 'cot-rotulo', T.incluye), document.createTextNode(promo.incluye.join(' · ')));
      p1.appendChild(inc);
    }
    if (promo.suma.length) {
      p2.appendChild(el('p', 'cot-rotulo cot-rotulo-suelto', T.suma));
      promo.suma.forEach(function (s) {
        var o = el('label', 'cot-opcion');
        var c = el('input'); c.type = 'checkbox'; c.value = s.nombre;
        c.addEventListener('change', function () {
          estado.suma = c.checked ? estado.suma.concat(s.nombre) : estado.suma.filter(function (x) { return x !== s.nombre; });
          calcular();
        });
        var texto = el('span', 'cot-opcion-texto');
        texto.append(el('strong', '', s.nombre), el('span', 'cot-precio', precioDe(s) + (s.loCobra ? ' · ' + T.loCobra + ' ' + s.loCobra : '')));
        o.append(c, texto); p2.appendChild(o);
      });
    }

    // 3. La boleta y el envío.
    var p3 = paso(3, T.paso3);
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

    function textoError(codigo, minimo) {
      if (codigo === 'minimo') return T.minimo.replace('{n}', minimo);
      return T[codigo] || (codigo === 'sinPrecio' || codigo === 'promocion' ? T.sinCotizar : T.error);
    }

    function dibujar(r) {
      boleta.innerHTML = '';
      ultima = r && r.ok ? r : null;
      boton.disabled = !ultima; quiero.disabled = !ultima;
      if (!ultima) verDatos(false);
      if (!r) { boleta.appendChild(el('p', 'cot-aviso', T.faltaDia)); return; }
      if (!r.ok) { boleta.appendChild(el('p', 'cot-aviso cot-aviso-alerta', textoError(r.codigo, r.minimo))); return; }
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
      if (r.publico) boleta.appendChild(el('p', 'cot-nota', T.publico));
      else if (r.arriendo > 0) boleta.appendChild(el('p', 'cot-nota', T.arriendo + ' ' + pesos(r.arriendo) + ' ' + T.masIva + '.'));
    }

    function calcular() {
      clearTimeout(reloj);
      if (!estado.fecha) { dibujar(null); return; }
      if (!estado.menu) { dibujar({ ok: false, codigo: 'menu' }); return; }
      if (estado.adultos + estado.ninos < promo.minimo) { dibujar({ ok: false, codigo: 'minimo', minimo: promo.minimo }); return; }
      boton.disabled = true; quiero.disabled = true;
      boleta.innerHTML = ''; boleta.appendChild(el('p', 'cot-aviso', T.calculando));
      // Se pregunta cuando se deja de mover los números: cada pregunta lee la planilla.
      reloj = setTimeout(function () {
        var q = new URLSearchParams({
          promo: promo.sitio, adultos: String(estado.adultos), ninos: String(estado.ninos),
          menu: estado.menu, suma: estado.suma.join('|'), fecha: estado.fecha
        });
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
          promo: promo.sitio, adultos: estado.adultos, ninos: estado.ninos, menu: estado.menu, suma: estado.suma,
          fecha: estado.fecha, nombre: nombre, empresa: fEmpresa.value.trim(), telefono: telefono, correo: correo,
          web: trampa.value, idioma: idioma, prueba: !esReal
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok) {
          var t = d.codigo === 'nombre' ? T.faltaNombre : d.codigo === 'telefono' ? T.faltaTelefono
            : d.codigo === 'correo' ? T.faltaCorreo : d.codigo === 'tope' ? T.tope : textoError(d.codigo, d.minimo);
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
