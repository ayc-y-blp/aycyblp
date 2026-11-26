# Traspaso: Brasas de Lo Pirque (estado al 25-11-2026)

Para quien retoma el proyecto en una sesión nueva, sin haber visto las
anteriores. **Este archivo es el mapa**; el detalle de cada decisión vive en
dos documentos, ordenado por tema y con fecha:

| Archivo | Qué tiene | Cuándo se carga |
|---|---|---|
| `CLAUDE.md` (raíz) | Las reglas fijas, el sitio público, los landings, la reserva con Shopify, Vercel, el dominio, Git | Siempre (y este archivo, que importa) |
| `panel/CLAUDE.md` | Todo el panel: reservas, cotizaciones, equipo, informe, roles, la regla PlayStation, el límite de Google | Al trabajar en `panel/` |
| `migracion-team/` | Las 18 variables de Vercel (sin valores), `verificar.sh`, el entorno de Claude Code | A mano |
| `panel/DESPLIEGUE.md` | Cómo se despliega el panel, los webhooks, la planilla | A mano |
| `panel/FASE5.md` | La ampliación a Calicanto: cómo se trabaja en paralelo, la propuesta, lo que falta decidir y los pasos | Al trabajar en la Fase 5 |

**Antes de tocar algo, busca su sección** en esos archivos (`grep -n` por la
palabra o el nombre de la función): casi todo lo que parece raro tiene una
razón escrita, con la frase del cliente que la pidió.

Lo marcado **(por confirmar)** es algo que no quedó comprobado en la
conversación: hay que preguntarlo o mirarlo antes de darlo por hecho.

---

## 0. Estado en una mirada

- **El sitio nuevo está publicado en `brasasdelopirque.cl` desde el
  22-11-2026** (el lanzamiento): el dominio pasó del sitio viejo de Shopify a
  Vercel, y `tienda.brasasdelopirque.cl` es el dominio principal de la
  tienda. Antes, ese mismo día, el cliente dejó la base en cero en producción
  e importó el CRM y los pedidos del sitio viejo. **Nada se mergea a
  producción sin un *"mergea"* del cliente** (sección 9, desde el
  22-11-2026). Comprobado desde el entorno al terminar: la
  portada, `reservas.html`, `/en/` y el sitemap responden desde Vercel;
  `/pages/ticket` y el link viejo del producto redirigen a reservas;
  `/cart/c/…` va a `tienda.`; `/CLAUDE.md` da 404; y el panel le entrega al
  sitio los días con su cupo, sin el domingo 22. El cliente dijo *"todo
  funcionando"*. **El cliente confirmó el mismo día** que `www` redirige a la
  raíz, que el tema de redirección está publicado en `tienda.` y que *Menú
  Tradiciones* salió de Tienda online. **Los webhooks de la tienda de
  desarrollo no se borraron, y no hace falta**: producción los rechaza con
  401 porque la firma no calza; borrarlos es solo orden (Shopify puede
  avisar por correo que fallan y con el tiempo los quita solo). Después del
  PR #297, `verificar.sh` dio 15 de 15, y la guía *Traspaso a producción*
  quedó al día con el lanzamiento.
- **La tienda real de Shopify ya está conectada** (PR #283, mergeado el
  20-11-2026 a las 23:16): `brasas-sitio.vercel.app` y, desde el
  lanzamiento, `brasasdelopirque.cl` **cobran de verdad**. Las versiones de
  prueba de un PR, GitHub Pages y `localhost` siguen contra la tienda de
  desarrollo, que no cobra.
- **El PR #285** (todo lo de las últimas horas, sección 4) **se mergeó el
  21-11-2026** con el OK del cliente, y el panel en producción quedó
  comprobado: `/login` 200, `/api/publico/fechas` 200 y el webhook sin firma
  401.
- **El PR #287 se mergeó el 21-11-2026**, cuando el cliente dijo *"mergea"*
  (había pedido *"déjalo en preview"*). El panel en producción quedó
  comprobado después: `/login` 200, `/api/publico/fechas` 200 y el webhook
  sin firma 401. Trajo *el computador, más
  compacto* —las dos capas—, los
  formularios alineados en todo el panel, **las ventanas que caben en la
  pantalla del computador** (de 21 que no cabían quedan 2), **corregir un
  día cerrado con una casilla y la lista de cambios**, sin motivo escrito, y
  cuatro retoques que marcó con fotos (el marco del puesto, el puesto
  habitual como desplegable, *falta su cuenta* como aviso y la pastilla
  *falta $…* que pisaba el botón de propina), **los nombres que se doblan en
  vez de cortarse** y **la casilla + lista también al editar o borrar una
  reserva de un día cerrado**.
  https://github.com/ayc-y-blp/aycyblp/pull/287
- **El PR #289 se mergeó el 21-11-2026**, cuando el cliente dijo *"mergea"*.
  Trajo: una cotización ganada cuya reserva está en un día cerrado ya se
  puede corregir, con la lista de cambios y su casilla; y el encabezado de la
  página del día en una línea, con el ancho repartido entre los azulejos. El
  panel en producción quedó comprobado después (`verificar.sh`, 15 de 15).
  Detalle en la sección 4.
  https://github.com/ayc-y-blp/aycyblp/pull/289
- **Las compras de prueba en la tienda real pasaron** (lo dijo el cliente el
  21-11-2026: *"han pasado varias pruebas exitosas de pago y de solo
  reservar"*). **Lo que sigue es la base en cero** y después importar los
  contactos del CRM: pendientes 1 y 10 de la sección 7.
- **El PR #291 se mergeó el 21-11-2026**, cuando el cliente dijo *"funcionó
  en pruebas, así mergea"*: ensayó *Dejar la base en cero* en la versión de
  prueba, sobre la planilla "Pruebas", y salió bien. Trajo: la pestaña
  `Ajustes sueltos` entra en lo que se vacía —no estaba—; una prueba obliga
  a decidir cada pestaña nueva; la ventana dice arriba cuál planilla es y si
  es producción o una versión de prueba; y un pedido de Shopify cancelado o
  devuelto que no está anotado ya no se anota.
  Detalle en `panel/CLAUDE.md`, "La revisión antes de apretarlo".
  https://github.com/ayc-y-blp/aycyblp/pull/291
- **El PR #293 se mergeó el 22-11-2026**, cuando el cliente dijo *"mergea"*,
  después de ensayarlo en la versión de prueba (base en cero e importe sobre
  "BBDD Prueba", revisados con el conector de Drive). El panel en producción
  quedó comprobado después (`verificar.sh`, 15 de 15). Trajo **el
  importador** —*Importar del CRM*, en Configuración → Mantención: las fichas
  de los clientes de Lo Pirque, lo que viene a futuro como candidato,
  borrador o ganada con su reserva, y los pedidos del sitio viejo—, y lo de
  abajo. Detalle en la sección 4 y en `panel/CLAUDE.md`, "Importar del CRM y
  del sitio viejo". https://github.com/ayc-y-blp/aycyblp/pull/293
- **En el mismo PR #293, el 22-11-2026**: el Excel se sube desde el
  formulario (sin Google Drive); un vendedor del CRM calza con la cuenta que
  lleva su apodo; y **cambiar el vendedor de un cliente o de una cotización**
  (permiso nuevo `asignarVendedor`: gerencia, pagos y administrador). De paso
  se corrigió que el importador escribía el usuario y no el nombre de la
  cuenta como dueño. Detalle en `panel/CLAUDE.md`, "Cambiar el vendedor de un
  cliente o de una cotización".
- **Los días *sin cupo* de la versión de prueba, resuelto el 22-11-2026**:
  Sheets guardaba las fechas como número en una pestaña recién vaciada y el
  panel no las reconocía. Ahora las fechas y las horas se escriben como
  texto (`valorSeguro()`). **Importa para producción**: habría pasado igual
  después de la base en cero. Detalle en `panel/CLAUDE.md`, "Las fechas se
  escriben como texto".
- **El cliente dejó "BBDD Prueba" en cero e importó ahí el 22-11-2026**, con
  el arreglo de las fechas ya puesto, y compartió las dos planillas (*BBDD
  Prueba* y *BBDD Produccion*) con la cuenta del conector. Mirada la de
  prueba: las fechas quedaron como texto, 29 días, 128 fichas y 101
  cotizaciones, con el nombre de la cuenta como dueño. El conector muestra el
  encabezado y las primeras filas de cada pestaña, no todas.
- **Clientes tiene filtro *Míos / Todos*** (22-11-2026, en el PR #293). **Desde
  el PR siguiente al #309 se ve siempre**, también con *Míos (0)*: escondido,
  al cliente le parecía que faltaba.
- **El cliente autorizó mirar las dos planillas con el conector de Google
  Drive** (22-11-2026): la de pruebas y la de producción. Para diagnosticar,
  sin escribir. Ver `CLAUDE.md`, "Cómo trabajar con este proyecto".
- **Los dos Excel se le mandaron al cliente por el chat** (no están en el
  repo): el que se sube a la planilla y el de lo que hay que decidir. Se
  arman con un script que tampoco está en el repo; si llega un respaldo o un
  export nuevo, se vuelven a armar.
- **Regla nueva del 22-11-2026, con su prueba**: *el espacio se usa bien: lo
  que cabe en una fila no se apila*. `revisarEspacio()` pasa por las 18
  pantallas dentro de `npm run ventanas` y falla con dos filas que cabrían en
  una. La primera pasada arregló Cotizaciones → Lista, Equipo, Turnos,
  Configuración y Cuentas. Detalle en `panel/CLAUDE.md`, "El espacio se usa
  bien".
- **SEO del sitio, PR #298, mergeado y publicado el 22-11-2026**: canonical,
  vista previa al compartir y los datos del negocio para Google, comprobados
  en `brasasdelopirque.cl`. Lo que no es código está paso a paso en el
  documento *Traspaso a producción*, sección *SEO*.
- **PR #300 (22-11-2026, camino chico)**: en las tarjetas de Reservas y
  Cotizaciones, *HOY* ya no baja el estado (*EXCLUSIVO*) a otro renglón, con
  una prueba que mide el peor caso (`revisarLineaDeLaFecha()`); y la lista de
  cotizaciones va por fecha del evento, con la fecha como *SÁB 21 nov 2026*.
  Después, **en el PR siguiente**: *Ganado por mes* pasó a *Ganado mes a mes · Todo el
  equipo* (o el vendedor o socio elegido) y sale solo mirando *Todo*; lo
  aprobó el cliente (*"dale con tu recomendación"*).
- **PR #305, mergeado el 22-11-2026** con el *"mergea"* del cliente: la regla
  *nada se mergea a producción sin preguntar* y **la bandeja de lo que revisa
  pagos en dos renglones** (la pastilla del pago con su nota al lado; 247 →
  176px en el computador). `verificar.sh` dio 15 de 15 después. Detalle en
  `panel/CLAUDE.md`, "La bandeja de lo que revisa pagos, en dos renglones".
- **PR #307, mergeado el 22-11-2026** con el *"mergea"* del cliente: la
  página del día con los marcos de la regla (*← Calendario* con presencia, la
  bandeja como grupo) y, en *Productos*, el nombre de un producto nuevo ya no
  se bloquea al escribir el de uno vendido. Para *A Brasas Abiertas* de
  empresas se recomendó **no crear un segundo producto**: activar *Se puede
  cotizar* con $70.000 + IVA en el mismo (lo hace el cliente en *Productos*).
- **PR #308, mergeado el 22-11-2026** con el *"mergea"* del cliente: **✕ Se
  cayó…**, dar por perdida una cotización con su motivo, desde cualquier paso,
  la lista o *Esperando respuesta*. Ver `panel/CLAUDE.md`.
- **PR #310, mergeado el 22-11-2026**: en Clientes, *Míos / Todos* se ve
  siempre, también con *Míos (0)*.
- **El arriendo mínimo en las cotizaciones** (PR #312, el cliente dijo
  *"mergea"* el 23-11-2026): un día
  que no está abierto al público con poca gente, o un exclusivo en un día
  público, lleva arriendo sí o sí, con un mínimo por tramo de personas que
  vive en Configuración → *Extras y arriendo*. Se revisa al guardar y al
  ganar (también el show), y pasan por encima la gerencia, pagos y el
  administrador. Salió del documento de costos de mayo a septiembre, en
  versión agresiva. En el mismo PR: ganar en un sábado que todavía no está en
  el calendario lo crea público si no es exclusivo, y el paso 3 de cotizar se
  compactó (la nota del show sube a la fila de los extras). La presentación para la gerencia es un artifact privado
  del cliente. Ver `panel/CLAUDE.md`, "El arriendo mínimo en las
  cotizaciones".
- **Lo que el vendedor puede prometer** (23-11-2026, PR #318, mergeado con el
  *"mergea"* del cliente): las condiciones para el cliente —anticipo,
  saldo, descuentos, cambios de fecha, cancelación y devolución— tienen su tope
  en Configuración (regla A); algo más generoso se pide con *✋ Pedir
  condiciones especiales…* y lo aprueban la gerencia, pagos o el administrador
  desde la bandeja. Y lo que el calendario ya no permite (regla B): la vigencia
  no pasa del día antes del evento, el contrato no ofrece una cancelación o un
  cambio de fecha fuera de plazo y cobra el saldo al firmar si ya venció, un
  evento pasado no se gana, y hay un plazo nuevo para cambiar la fecha.
  Configuración se reordenó en grupos, con la sección nueva *Condiciones para
  el cliente* (la de *Contrato* se fue). Dos columnas nuevas en
  `Presupuestos`. Ver `panel/CLAUDE.md`, "Lo que el vendedor puede prometer".
- **Los otros siete casos** (23-11-2026, PR #326, mergeado con el
  *"mergea"* del cliente; `verificar.sh` dio 15 de 15 después): un horario que pasa del cierre se avisa como
  recomendación; los acuerdos adicionales le llegan a pagos (✓ Visto, y
  vuelven si cambian); *sin documento* se avisa y queda en la bitácora; la
  vigencia la renueva el vendedor una vez y la segunda se pide; y el show o el
  arriendo bajo su mínimo se piden con *✋ Pedir condiciones especiales…*. Los
  precios y ganar sin anticipo quedan como estaban. Dos columnas nuevas en
  `Presupuestos` (`Acuerdos revisados`, `Renovaciones`). La presentación para
  la gerencia se rehízo con todas las reglas. Ver `panel/CLAUDE.md`, "Los
  otros casos".
- **La agenda del vendedor** (23-11-2026, PR #333, mergeado con el
  *"mergea"* del cliente): *🗒 Notas* en cada
  cotización (qué se conversó y cuándo volver a contactarlo; las leen su
  vendedor y la gerencia), *✍ Prometiste mandarla antes del* en el paso
  Evento, y la agenda —*Tus pendientes* y *📋 Lista → 🗓 Agenda*— con
  *📞 Contactar* y *✍ Por redactar*. *Esperando respuesta* se fusionó ahí.
  Pestaña nueva `Notas` y dos columnas al final de `Presupuestos`
  (`Recontactar el`, `Redactar antes del`). **En el paso Envío, al pie de
  *Seguimiento y envío***: cuántos contactos van, el próximo contacto y la
  última nota (lo pidió el cliente con una foto). **En producción, *📅
  Elegir…* no abría el calendario en Chrome** y, con el evento mañana, no
  quedaba ningún atajo: arreglado en el PR siguiente (`showPicker()` y
  *Hoy*). Ver `panel/CLAUDE.md`, "La agenda del vendedor".
- **El encargado de turno corrige un día cerrado** (23-11-2026, lo pidió el
  cliente; PR #333): se sumó al permiso `corregir`. Hasta ese día cerraba
  y le pedía la corrección a operaciones o a pagos. Ver `panel/CLAUDE.md`,
  "Corrigen el administrador y quien paga".
- **Los encargados mandan el link personal** (23-11-2026, lo pidió el
  cliente, también el de operaciones; PR #333): permiso nuevo `enviarLink` —crear, copiar y renovar
  el link de un trabajador o un colaborador—, para los dos encargados, pagos,
  la gerencia y el administrador. Quitarlo sigue en `links`. Ver
  `panel/CLAUDE.md`, "Los encargados mandan el link personal".
- ***✎ Editar cliente*, desde la cotización** (23-11-2026, PR #331,
  mergeado con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después): en el paso Cliente, la ficha del cliente en una ventanita, sin
  salir de la cotización. Es la misma pieza de *Clientes* (`EditarCliente`):
  se guarda sola y el nombre se confirma. Ningún permiso ni columna nueva.
  Ver `panel/CLAUDE.md`, "*✎ Editar cliente*, desde la cotización".
- **El periodo en un marco** (22-11-2026, PR #309, mergeado con el *"mergea"*
  del cliente): en
  Cotizaciones → *Lista*, en Estadísticas, en Vendedores y en el Informe, el periodo, ◀ ▶ y por qué fecha van juntos en
  un marco dorado (`ElegirPeriodo`); la Lista parte en el mes en curso, se fue
  la frase *Mostrando: …* y las tarjetas de números son más compactas. Ver
  `panel/CLAUDE.md`, "El periodo en un marco".
- **La reserva en tres pasos, PR #314, mergeado el 23-11-2026** con el
  *"mergea"* del cliente: el formulario de `reservas.html` en pasos
  numerados, entero en una pantalla de computador (510px en 1280×650), con
  el resumen de la fecha, *Ahorras $…* en *Pagar ahora* y una barra fija en
  el celular; *Reservar* relleno en los cierres del sitio, y todo
  *Reservar* —menú, pie y portada— llega directo al formulario. Ver `CLAUDE.md`, "La reserva en tres pasos".
- **El sitio público, el 23-11-2026, todo mergeado con el *"mergea"* del
  cliente** (sesión de Lo Pirque, solo sitio y landings, sin tocar el panel):
  - **#316 y #317, la reserva**: los nombres de los menús en Fraunces, y
    cada paso en su tarjeta, los tres lado a lado en el computador, con un
    tic en el paso listo, el borde dorado en el que sigue y el detalle del
    pedido como una boleta en el paso 3.
  - **#320, cada sección cabe en una pantalla de cualquier tamaño**: regla
    nueva en `CLAUDE.md`. Los altos salen de `--alto-util` (la ventana menos
    la barra y 24px), y en el celular las listas de tarjetas se deslizan en
    carrusel. **El notebook del cliente mide 1262×573** (Chrome con
    favoritos): se prueba con esa medida, no solo con 1280×650.
  - **#320 y #321, el desayuno y la once**: fuera de Experiencias y
    Promociones; quedan en Eventos, Socios y Dossier.
  - **#322, la foto del show** en Actividades, encuadrada con el jinete,
    la bailarina y la bandera enteros.
  - **La foto del karting**, con los dos karts enteros, en Actividades
    y en los tres landings (#329).
  - **Promociones con seis ofertas que se eligen en la cabecera** (fin de
    año y los cinco productos de empresa), #332, **publicado con precios y
    mínimos de ejemplo** y su etiqueta a la vista, porque el cliente dijo
    *"mergea"*. Falta que confirme los precios y la condición especial de
    cada uno (pendiente 13). Ver `CLAUDE.md`, "Seis
    promociones que se eligen en la cabecera".
  - **#323, el título de los bloques foto + texto** (`.split-titulo`), más
    grande en el computador, en la portada, Actividades y Eventos.
  - El detalle de cada uno, en `CLAUDE.md`, sección "Sitio público".
- **La Fase 5 partió el 22-11-2026** (el panel para Calicanto / Asados y
  Corderos): sin rama larga, en PR chicos que se mergean apagados. El plan,
  lo que el cliente tiene que decidir y los pasos están en
  **`panel/FASE5.md`**. Paso 1, *la empresa como una pieza*
  (`lib/empresa.ts`), mergeado el 23-11-2026 (PR #311). El cliente decidió:
  una dirección por empresa con una sola cuenta, Calicanto sin Shopify, y la
  caja para después. **El simulador de evento**, primera parte (permiso nuevo
  `costos`, columna `Costo` en `Menús`, *🧮 Simular* en el pie del paso de
  productos), y **el paso 2, la memoria de cada instancia por empresa**
  (`porEmpresa()`, `conEmpresa()`): PR #313, el cliente dijo *"mergea"* el
  23-11-2026. **El simulador queda en pausa**: primero las dos empresas.
  Decidido ese día: el panel de Asados y Corderos va en
  **`panel.asadosycorderos.cl`**, y en un matrimonio la recepción **puede**
  llevar la lista de invitados uno por uno (opcional).
- **Fase 5, pasos 3 y 4, en un PR abierto (23-11-2026)**: una dirección por
  empresa, una sola lista de cuentas con un rol por empresa y el botón para
  pasar de una a la otra sin clave. **Apagado** hasta que exista
  `AYC_GOOGLE_SHEET_ID`. Para encenderlo, el cliente copia la planilla de Lo
  Pirque, la vacía y agrega el dominio: pasos en `panel/FASE5.md`, "Para
  encenderla". **Regla para las dos sesiones**: una ruta nueva va envuelta en
  `conLecturas()`, y lo que un archivo recuerda de la planilla o la tienda va
  con `porEmpresa()` (ver `panel/CLAUDE.md`, "Dos empresas en el mismo
  panel").
- **Asados y Corderos se prueba en las versiones de prueba, sin producción**
  (23-11-2026): en la entrada de una versión de prueba hay un botón por
  empresa. El cliente creó las dos planillas (*AyC BBDD Produccion* y *AyC
  BBDD Prueba*) y puso `AYC_GOOGLE_SHEET_ID` en Vercel. El DNS de
  `asadosycorderos.cl` está en Netlify. Ver `panel/FASE5.md`, "Probar Asados
  y Corderos sin pasar a producción".
- **La cultura de trabajo, empaquetada para otros proyectos** (23-11-2026, lo
  pidió el cliente: *"cómo me puedo llevar toda esta cultura… a otro proyecto
  nuevo"*): carpeta **`cultura/`** con un `CLAUDE.md` de usuario destilado
  (conducta que vale en cualquier proyecto) y un `README`, y **tres skills en
  `.claude/skills/`** —`ritual-de-trabajo`, `panel-playstation`,
  `sitio-elegante` y `traspaso-y-guias` (cómo se mantiene este archivo entre
  chats y cuándo se arma una guía paso a paso, con la plantilla de
  `TRASPASO.md`; pedido por el cliente el 23-11-2026)—. **Viven en el repo y no en `~/.claude/`** porque el
  cliente trabaja solo desde la web y el contenedor de cada sesión es
  temporal: cada chat nuevo de este proyecto los tiene, y `CLAUDE.md` dice
  cuándo usar cada uno. **Un proyecto nuevo no los tiene solo**: hace falta un
  repo plantilla con `.claude/skills/` o copiarlos al partir (pendiente del
  cliente). Es una **copia destilada**: la fuente de verdad sigue siendo
  `CLAUDE.md` y `panel/CLAUDE.md`. **Cuando el cliente diga "regla: …" y valga
  para todos los proyectos, se anota también en el skill o en `cultura/`.** Es
  solo documentación: no toca el sitio ni el panel, sin lecturas de Google ni
  permisos. PR #325 y el siguiente. Ver `cultura/README.md`.
- **La caja chica, el cobro en la mesa y la jornada de preparación**
  (23-11-2026, PR #335, mergeado con el *"mergea"* del cliente;
  `verificar.sh` dio 15 de 15 después): la encargada de turno cobra lo que
  falta de una mesa —efectivo, transferencia con su foto o tarjeta— y la deja
  pagada (a Shopify no se le toca nada); el efectivo entra a la **caja chica**
  (menú *Caja*), que se entrega a operaciones con *✓ Recibí*, se deposita o se
  gasta con su foto, y pagos revisa. **Al estrenarla se anota el saldo
  inicial: $7.000** (lo dijo el cliente). Y un segundo monto de jornada para
  los días de preparación. Dos permisos nuevos (`caja`, `recibirCaja`), la
  pestaña `Caja chica`, tres columnas al final de `Reservas` y una de
  `Trabajadores`. Ver `panel/CLAUDE.md`, "El cobro en la mesa y la caja chica"
  y "La jornada de preparación".
- **Filtrar por de dónde viene la reserva** (23-11-2026, PR #336, mergeado
  con el *"luego mergea"* del cliente; `verificar.sh` dio 15 de 15 después):
  *🛒 Shopify · ✍ A mano · 🤝 Cotización*, en Estadísticas (reemplaza a
  *Visitas · Eventos*, y va en la fila de *Volver* para que el marco del
  periodo quepa en una) y en la página del día, al lado de *Mías*. Ver
  `panel/CLAUDE.md`, "Filtrar por de dónde viene la reserva".
- **Las promociones del sitio y su cotizador** (23 y 24-11-2026, PR #338,
  mergeado el 24-11-2026 con el *"prepara todo en PR y mergea"* del cliente;
  todo lo de abajo hasta *🤝 Otras empresas* va en ese PR): *Productos → 🎁 Promociones* (una promoción es
  una receta de productos, con su descuento, y se conecta a un bloque de
  `promociones.html`), *Lo cobra otra empresa* en el catálogo (el karting va
  aparte del total, con su detalle, y la vendedora lo ve *🤝 por coordinar*),
  *Las del sitio van a* en Configuración, las rutas públicas del cotizador, la
  ventana que avisa al vendedor y el link de campaña por promoción, **y el
  cotizador en `promociones.html`** (`assets/js/cotizador.js`, la cuarta
  excepción de JavaScript del sitio, decidida por el cliente: *total en
  vivo*). En el mismo PR: mientras no haya promociones conectadas en el panel
  de producción, la página queda igual que hoy. Ver `panel/CLAUDE.md`, "Las
  promociones del sitio", y `CLAUDE.md`, "El cotizador de promociones".
  **Decidido el 24-11-2026**: un bloque nuevo (como *Karting*) es un PR chico
  del sitio, no se crea desde el panel. Los precios y datos de verdad los
  llena el cliente después, cuando se decidan.
- **Cambiar un nombre arrastra lo guardado** (24-11-2026, en el mismo PR
  #338, lo encontró el cliente: un puesto renombrado dejaba a su gente en un
  recuadro aparte, y *Christipher* seguía en los turnos después de corregir
  la ficha). Los turnos guardan el nombre escrito, no un número de ficha:
  ahora renombrar una persona, un colaborador o un puesto reescribe sus
  turnos, días, pagos, boletas, ajustes y puestos habituales, y lo que ya
  quedó suelto se reengancha con *Es…* / *Pasar a…* en Equipo y Extras. **Lo
  que se corrige directo en la planilla no se entera**: para eso es *Es…*.
  Ver `panel/CLAUDE.md`, "Cambiar un nombre arrastra lo guardado".
- **El link personal del vendedor** (24-11-2026, en el mismo PR #338, lo
  pidió el cliente): *🔗 Copiar link* también en la tarjeta de un vendedor;
  su página muestra su trato renglón por renglón, lo que ganó con el sueldo
  fijo, lo que viene, lo que se le pagó y el bruto que escribe en la boleta.
  Ver `panel/CLAUDE.md`, "El link personal del vendedor".
- **Turnos dice lo que cuesta el equipo de cada día** (24-11-2026, en el
  mismo PR #338, lo pidió el cliente): una pastilla con el monto al lado de
  *👥 8 en el equipo*, y arriba de la ventana del día; el mismo número de la
  tarjeta de Reservas, sin la propina. Ver `panel/CLAUDE.md`, "Turnos: lo que
  cuesta el equipo de cada día".
- **Los links personales abren en el mes, con su boleta** (24-11-2026, en el
  mismo PR #338, lo pidió el cliente): trabajador, colaborador, vendedor y
  socio, con *📅 Mes · Semana* y ◀ ▶ en un marco (sin JavaScript). Ver
  `panel/CLAUDE.md`, "Los links personales abren en el mes".
- **Copiar para Mercado Pago, en dos botones** (24-11-2026, en el mismo PR
  #338, lo pidió el cliente): en el Informe, *📋 Sueldo* y *📋 Propina* copian
  solo el monto, y *🏦 Datos bancarios* la cuenta con el nombre de cada campo,
  para el ✨ del formulario de cuenta nueva. Ver `panel/CLAUDE.md`, "Copiar,
  en dos botones". **El formulario es el correcto** (lo confirmó el cliente el
  24-11-2026): los campos y su orden quedan como están.
- **Caja → Entregar, a la vista** (24-11-2026, en el mismo PR #338, lo pidió
  el cliente: *"tienen que estar el encargado de operaciones y los tres
  gerentes… todos estos nombres tengo que poder elegir"*): un botón por cada
  encargado de operaciones, gerencia y pagos, con su rol, y operaciones
  elegido de partida; sin buscador. El administrador (la cuenta general) no
  aparece. El permiso `recibirCaja` no cambió. **(Por confirmar)** que los
  tres gerentes de producción tengan el rol *Gerencia general* o *Encargado de
  pagos*: si alguno tiene otro, no sale. Ver `panel/CLAUDE.md`, "El cobro en
  la mesa y la caja chica".
- **Qué incluye cada producto, en la cotización** (24-11-2026, en el mismo
  PR #338, lo pidió el cliente): arriba el menú de la casa y lo común, y en
  cada alternativa lo que la distingue, con los textos del sitio
  (`lib/detalle.ts`); y la tabla de precios cabe entera en el teléfono. Ver
  `panel/CLAUDE.md`, "Qué incluye cada producto, en la cotización". **También
  en el contrato**, bajo la tabla del precio (lo pidió el cliente).
- **Vende quien cotiza, tenga el rol que tenga** (24-11-2026, en el mismo PR
  #338, lo pidió el cliente: Cristóbal, operaciones, no salía en Vendedores):
  `cuentasQueVenden()` en la lista, el Informe, el link personal y el congelado
  de la comisión. Su trato parte en 0% y sin ficha la comisión no se congela.
  Ver `panel/CLAUDE.md`, "Vende quien cotiza".
- **La ficha de una promoción, ordenada** (24-11-2026, en el mismo PR #338,
  lo marcó el cliente con una foto): secciones *Menús* (adultos y niños, cada
  menú una vez), *Extras* (cada uno con *No · Incluido · Se suma*; el show con
  la regla de Configuración) y *Condición* en tramos con *+ Otro tramo*
  (columna nueva `Más tramos`). Ver `panel/CLAUDE.md`, "La ficha, ordenada".
- **🚐 Fuera del local y la cabecera de cotizar en dos filas** (24-11-2026,
  en el mismo PR #338, lo pidió el cliente): lo que cobra otra empresa va en
  su grupo, en la promoción y en el paso Productos; los pasos en una fila y
  las alternativas con *🗒 Notas* grande debajo. **Los pasos 3, 4 y 5 ya no
  caben en 1280×650** (698, 665 y 681px), anotados en `NO_CABEN`: el cliente
  aceptó perder espacio. Ver `panel/CLAUDE.md`, "*Fuera del local* y la
  cabecera…".
- **🎁 Promoción… en la cotización del vendedor** (24-11-2026, en el mismo PR
  #338, lo pidió el cliente): aplica una promoción activa —su menú reemplaza
  al de adulto, suma lo que incluye y pone su descuento—, y todo queda
  editable. **Su descuento vale aunque pase el tope del vendedor** (lo decidió
  el cliente) y su arriendo se perdona como diga, también al ganar. Columna
  nueva `Promoción` en `Presupuestos`; las del sitio nacen con la suya. Ver
  `panel/CLAUDE.md`, "*🎁 Promoción…*".
- **🤝 Otras empresas** (24-11-2026, en el mismo PR #338, lo pidió el
  cliente; *"no paga comisión, sí va en una línea del contrato"*): una lista
  en *Productos* con RUT, contacto, teléfono y correo; se eligen en el
  producto (*Lo cobra*); salen en la cotización, en la cláusula *Servicios de
  otras empresas* del contrato y en *💬 Escribirle* para coordinar. Cambiar
  el nombre arrastra productos y cotizaciones. Pestaña nueva `Otras
  empresas`. Ver `panel/CLAUDE.md`, "*🤝 Otras empresas*".
- **Un producto nuevo se guarda con su botón** (24-11-2026, lo pidió el
  cliente: un producto sin nombre *"queda ahí dando vuelta"*): borrador con
  *Guardar producto* y *Cancelar*; sin nombre, se descarta al cerrarlo. Ver
  `panel/CLAUDE.md`, "Un producto nuevo se guarda con su botón". En el mismo
  PR: **un solo botón de guardar a la vista**; **otra empresa nueva se crea
  desde el producto** en una ventanita con un solo botón y queda elegida; y
  **las promociones llevan varios menús de niños a la vez** (*Niños* y
  *Pequeños*), con un contador por cada uno en el cotizador del sitio. **PR
  #340, mergeado el 24-11-2026** con el *"mergea"* del cliente; `verificar.sh`
  dio 15 de 15 después.
- **Traer los datos de producción a la prueba** (24-11-2026, lo pidió el
  cliente: *"sincronizar la base de datos de prueba con la base de datos de
  producción… para poder seguir probando a base de lo que hay hoy"*): en
  Configuración → Mantención de una **versión de prueba**, deja *BBDD Prueba*
  igual a *BBDD Produccion* —las pestañas del panel, las cuentas incluidas—,
  conservando la carpeta de comprobantes de la prueba. Producción solo se
  lee, con la variable nueva **`GOOGLE_SHEET_ID_PRODUCCION`, solo en
  Preview**, que pone el cliente (pendiente 17). Ver
  `panel/CLAUDE.md`, "Traer los datos de producción a la prueba". **PR #341,
  mergeado el 24-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15
  de 15 después.
- **El calendario de Reservas se filtra por origen** (24-11-2026, lo pidió el
  cliente: *"poder filtrar por Shopify, a mano y cotizados"*): los mismos
  botones de la página del día; cada tarjeta cuenta solo esas reservas y el
  día abre con el filtro puesto. Ninguna lectura más. **PR #342, mergeado el
  24-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después. Ver `panel/CLAUDE.md`, "También en el calendario de Reservas".
- **Qué incluye cada producto, escrito en su ficha** (24-11-2026, lo pidió el
  cliente: un menú especial con su propio detalle, *"en dos campos, uno para el
  menú y uno para bebestibles"*): *Qué incluye* y *Bebestibles* en *Productos*;
  cada uno reemplaza su parte del texto del sitio en la cotización y el
  contrato (en un menú de adulto, *Qué incluye* reemplaza el menú de la casa).
  Dos columnas nuevas al final de `Menús`. **El texto queda fijo en cada
  cotización** (lo pidió el cliente el mismo día: *"este texto solo
  corresponde a esta cotización… si lo cambio para esta cotización, lo guarda
  con el texto correspondiente a esta cotización"*): lo del producto es la
  propuesta y se copia a la línea al agregarlo; en la cotización se cambia con
  el 📝 de cada línea, y cambiar el producto no toca las cotizaciones hechas.
  Dos columnas nuevas al final de `Presupuesto Líneas`. **PR #343, mergeado
  el 24-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después. Ver `panel/CLAUDE.md`, "Qué
  incluye cada producto, escrito en su ficha" y "Y en cada cotización, su
  propio texto".
- **Promociones: solo salen las marcadas, y con el link se ve igual**
  (24-11-2026, lo pidió el cliente; eligió el modo *estricto*): casilla
  *☑ Mostrar en el sitio* en cada promoción del panel y *🔗 Copiar link* en la
  tarjeta cerrada. En el sitio de verdad, `promociones.html` lista solo las
  marcadas; una sin marcar se abre con su link; un bloque sin promoción o con
  la suya apagada no sale. **Antes de mergear conviene revisar en el panel de
  producción qué promociones hay y marcar las que deben salir**: hoy solo
  Gran Premio tiene el cotizador encendido, y Fin de año saldría solo si tiene
  su promoción. Columna nueva al final de `Promociones`. **PR #344, mergeado
  el 24-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después. **Así quedó producción**: el panel manda solo Gran Premio (en la
  lista), así que `promociones.html` abre en Gran Premio, sin fila de
  pastillas, y Fin de año no sale ni con su link. Para que salgan las otras,
  hay que crearlas en *Productos → 🎁 Promociones* de producción, conectarlas
  a su bloque y marcarlas. Ver `CLAUDE.md`, "El cotizador de promociones", y
  `panel/CLAUDE.md`.
- **Lo que se suma, para cuántos** (24-11-2026, lo pidió el cliente: *"de los
  22 que quieren menú, solo 15 quieren andar en go-kart"*): en el cotizador
  de `promociones.html`, un extra por persona que se suma muestra *¿Cuántos?*
  al marcarlo, con el grupo entero, y se baja; viaja al panel en `cuantos`,
  aparte de `suma`. Lo *Incluido* sigue para todos. **Lo que el
  cliente vio ese día —el karting desapareció al pasarlo a *Se suma*— era la
  respuesta guardada 5 minutos en Vercel**: al rato ya salía. **En el mismo
  PR, los días de anticipación de cada promoción** (lo pidió el cliente: el
  karting o el taller de queso no se organizan sin tiempo): *⏳ Anticipación*
  en la ficha; el sitio no ofrece un día antes y el vendedor no la aplica
  dentro del plazo (la gerencia, pagos y el administrador sí). Columna nueva
  al final de `Promociones`. **PR #345, mergeado el 24-11-2026** con el
  *"mergea"* del cliente; `verificar.sh` dio 15 de 15 después, y en
  `brasasdelopirque.cl` el Gran Premio ya muestra *¿Cuántos?* al marcar el
  karting. **Ninguna promoción de producción tiene días de anticipación
  todavía**: los pone el cliente en *⏳ Anticipación*. Ver `CLAUDE.md`, "El
  cotizador de promociones", y `panel/CLAUDE.md`.
- **El calendario de Reservas va al pasado** (24-11-2026, lo pidió el
  cliente): *Lo que viene · Semana · Mes* con ◀ ▶ (`ElegirPeriodo`), en el
  computador y en el celular; del pasado salen los días que se abrieron o
  tuvieron reservas, y *← Calendario* vuelve al mismo periodo. Ver
  `panel/CLAUDE.md`, "El calendario de Reservas va al pasado". En el mismo
  PR, **✓ Vino / ✕ No vino en la línea de cada reserva de la página del día**
  (cerrada o abierta), para el encargado de turno hacia arriba, desde la
  apertura; en un día cerrado, con la casilla de la corrección. Y al abrir una
  reserva, **lo acordado en Fudo y la mesa lado a lado** en el computador.
  Ver "Quién vino, también desde la página del día". **PR #347, mergeado el
  24-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después.
- **El bloque *Equipo* de la página del día, reorganizado** (24-11-2026, lo
  pidió el cliente con una foto): los puestos en tres columnas a todo el
  ancho y, al pie, lo que costó, lo que falta, *Equipo y cuentas del día* y la
  propina. Ver `panel/CLAUDE.md`. **PR #348, mergeado el 24-11-2026** con el
  *"mergea"* del cliente; `verificar.sh` dio 15 de 15 después.
- **El calendario de Cotizaciones también va al pasado** (24-11-2026, lo pidió
  el cliente): el mismo marco *Lo que viene · Semana · Mes*, con la cuenta
  compartida en `lib/periodoCalendario.ts`. Un día pasado se mira y no se
  cotiza. Ver `panel/CLAUDE.md`. **PR #349, mergeado el 24-11-2026** con el
  *"mergea"* del cliente; `verificar.sh` dio 15 de 15 después.
- **El lugar exclusivo en el cotizador de promociones** (25-11-2026, lo pidió el
  cliente: *"debe haber… el botón quiero el lugar exclusivo… el arriendo… usa el
  valor estándar, no con el descuento aplicado"*): una casilla en el paso ① que
  suma el arriendo del recinto a su precio estándar, **sin el descuento de la
  promoción** (que pasa a ir línea por línea, dejando afuera el arriendo), y la
  cotización llega marcada exclusiva. Toca el sitio (`cotizador.js`, en los tres
  idiomas) y el panel (`lib/promociones.ts`, la ruta pública y la pastilla de la
  promoción). **En un PR, en preview hasta el *"mergea"*.** El precio de lunes a
  viernes es un número en Configuración (*Arriendo de lunes a viernes*, en 0 vale
  el del catálogo): el cliente tiene que escribir $1.500.000 allí, igual que el
  sitio (ver `CLAUDE.md`, "El cotizador de promociones", y `panel/CLAUDE.md`, "El lugar
  exclusivo en el cotizador").
- **Con boleta, lo que gana es líquido** (25-11-2026, lo pidió el cliente con la
  tarjeta de Carmen Barros: sueldo $550.000 líquido, se le transfieren $550.000 y
  la boleta va por $648.968): la ficha pregunta solo *Con retención / Sin
  retención* (la factura no cambia) y las comisiones quedan como estaban. Ver
  `panel/CLAUDE.md`, "Con boleta, lo que gana es líquido". **Las fotos de la ayuda
  de Vendedores e Informe se rehicieron el mismo día.**
- **La rotación de las cotizaciones del sitio** (25-11-2026, lo pidió el cliente):
  casilla *Participa en la rotación* en cada vendedor; cada cotización del sitio le
  toca al que sigue (`lib/rotacion.ts`); sin nadie marcado, vale *Las del sitio van
  a*. Columna nueva `Rotación del sitio` en `Vendedores`. Ver `panel/CLAUDE.md`,
  "La rotación de las cotizaciones del sitio".
- **El 25-11-2026, mergeado con el *"mergea"* del cliente** (`verificar.sh`, 15
  de 15 después):
  - **#353, el buscador en una columna angosta**: en Configuración → *Las del
    sitio van a*, los nombres salían de a una letra por renglón; `BuscarEnLista`
    deja que el nombre y su detalle se doblen. Ver `panel/CLAUDE.md`, "El
    buscador, en una columna angosta".
  - **#354, regla nueva *Una captura no es un sí***: una foto o un *"¿qué
    pasó?"* se contesta con el diagnóstico y una propuesta, y no se edita nada
    hasta el sí explícito (*"nunca más hagas cambios de esta magnitud en el
    sitio sin preguntarme explícitamente"*). Nació porque el arreglo de #353 se
    aplicó a partir de una captura sin proponerlo antes. Está en `CLAUDE.md`,
    `cultura/` y el skill `ritual-de-trabajo`.
  - **#354, una línea fina entre *Adultos* y *Niños*** en la ficha de una
    promoción (pedido con palabras). Ver `panel/CLAUDE.md`, "La ficha, ordenada".
- **La ficha de una promoción: el link en su fila y el cotizador en su marco**
  (25-11-2026, lo pidió el cliente): marco dorado *🧮 Cotizador* con Menús,
  Condición, Extras, Fuera del local y Anticipación. Mide 677px en 1280×650, 27
  más que la pantalla, anotado en `NO_CABEN`. Ver `panel/CLAUDE.md`, "La ficha,
  ordenada".
- **El catálogo de Productos se filtra por tipo** (25-11-2026): *Menú · Extra ·
  Arriendo · Show* arriba de la lista. Ver `panel/CLAUDE.md`. **Y regla nueva:
  el link de prueba, siempre**, con las capturas (sección 9).
- **El cotizador de promociones: la fecha en un calendario y los títulos más
  marcados** (25-11-2026, lo pidió el cliente): cuatro pasos (*¿Qué día?* primero,
  con un calendario como el de la reserva, donde los días antes del plazo no se
  aprietan), y los títulos y marcos de los pasos más marcados, también en
  `reservas.html`. En el notebook del cliente el cotizador pasa del margen
  seguro por 25 a 70px. Ver `CLAUDE.md`, "El cotizador de promociones".
- **El `?` de cada producto, en el cotizador y en la reserva** (25-11-2026, lo
  pidió el cliente): abre debajo una caja corta con los cuatro tiempos y los
  bebestibles, o la línea del extra; se cierra con el mismo botón, Escape o
  tocando fuera. Los textos están escondidos en la página, para que se
  traduzcan. Y **regla nueva de estilo del sitio: fácil de leer, con
  jerarquía** (sección 9). Ver `CLAUDE.md`, "El cotizador de promociones".
- **El `?` del cotizador muestra lo escrito en *Productos*** (25-11-2026, lo
  preguntó el cliente con el karting; eligió las dos recomendaciones): en la
  página en español, *Qué incluye* y *Bebestibles* de cada producto reemplazan
  el texto del sitio, con la regla de la cotización; en inglés y portugués
  sigue el del sitio, traducido. La reserva no cambia. Ver `CLAUDE.md`, "El
  cotizador de promociones".
- **El descuento por grupo en `promociones.html`** (25-11-2026, lo pidió el
  cliente; frase *Mientras más son, menos paga cada uno*): los tramos de cada
  promoción del panel, en tarjetas, y *hasta −N% por grupo* bajo el precio;
  *Se puede sumar* sale del panel. Ver `CLAUDE.md`, "El cotizador de
  promociones".
- **La foto nueva del castillo inflable, en Actividades** (25-11-2026, lo
  pidió el cliente); las otras fotos que mandó esperan dónde van. Ver
  `CLAUDE.md`, "La foto del castillo inflable en Actividades".
- **El cotizador con fondo propio** (25-11-2026, lo pidió el cliente): dorado
  suave de día y de noche, con los pasos claros encima. Ver `CLAUDE.md`, "El
  cotizador de promociones".
- **💬 Coméntame solo en producción** (25-11-2026, lo decidió el cliente: *"solo
  comentarán en producción"*): en una versión de prueba no aparece porque
  `COMENTARIOS_SHEET_ID` está solo en Production, y así se queda. No es un
  error: no se agrega a Preview.
- **Los precios de las cinco promociones, en pausa** (25-11-2026, el cliente:
  *"por ahora olvídate"*): siguen de ejemplo y no se le recuerdan hasta que él
  los traiga (pendiente 13).
- **Reservas de Shopify: no se repiten, *✕ Se cayó…* se queda y lo cambiado
  en el panel también** (25-11-2026, lo encontró el cliente con dos fotos: un
  pedido *"2 veces en la planilla"* —no se cobró doble: es el mismo número de
  pedido— y una reserva borrada que *"hoy reapareció"*). Un pedido recién hecho
  lo agrega solo el aviso de *pedido nuevo*; la fila de más se limpia desde el
  aviso (*🧹 Limpiar la fila de más*). *✕ Se cayó…* va en su columna (`Se
  cayó`), con motivo, y la reserva pasa a *Se cayeron*, plegado al final;
  **Borrar, solo el administrador y en una anotada a mano** (lo decidió el
  cliente). Lo que se cambia en el panel de una de Shopify ya no lo reescribe
  la tienda (`Cambiado en el panel`). Cada cambio manda el id de la reserva. La
  ventana *Editar reserva*, con las reglas. **PR #361, mergeado el
  25-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después. Para la de Ismael Barros, hoy: si se cayó, cancelar el pedido
  en Shopify. Ver `panel/CLAUDE.md`, "Reservas de Shopify: no se repiten…".
- **Fotos nuevas** (25-11-2026, lo pidió el cliente): subió 10 fotos grandes; quedan achicadas en `assets/gallery/` y solo se usa la de la carne en la estaca, en la promoción *Combate de Parrillas*. Faltan 3 que no llegaron. Ver `CLAUDE.md`, "Seis promociones…".
- **El karting ya no se repite en *Se puede sumar* del Gran Premio** (25-11-2026, lo pidió el cliente): la frase esconde lo que el *Incluye* del bloque ya dice; en el panel sigue como *Se suma* y el cotizador lo ofrece con *¿Cuántos?*. Ver `CLAUDE.md`, "El cotizador de promociones".
- **El recontacto y la última nota, en todas partes** (25-11-2026, lo pidió el
  cliente: unas 20 cotizaciones de Carmen importadas del CRM no salían en la
  Lista —abría en el mes en curso y sus eventos son de diciembre en adelante—,
  y la última nota no salía —dos del mismo minuto empataban—). La Lista abre en
  *Lo que viene*; la tarjeta *Recontactar* muestra todas las que tienen un día
  para volver a contactarlas; la pastilla 📞 va en la Lista y en Clientes (con
  el filtro *📞 Por contactar*); lo del CRM antiguo es la primera nota; la
  última va en el botón *🗒 Notas* de la cotización, en la Agenda y en la ficha
  del cliente, que suma *📝 Anotar* en cada cotización y las notas filtrables
  por cotización; y en *Anotar*, elegir *Llamada* llama, *WhatsApp* abre el
  chat y *Correo* copia el correo. **La pastilla 📞 va en la primera fila de
  cada cotización de la lista, al centro, ámbar hasta el día y roja desde el
  día** (lo pidió el cliente con una foto); lo mismo en Clientes, la tarjeta
  *Recontactar* y el botón *🗒 Notas*. **Y la empresa del cliente al lado de
  su nombre** donde se muestra una cotización (`EmpresaCliente`, lo pidió el
  cliente). Ningún permiso, columna ni lectura nueva. **PR #366, mergeado el
  25-11-2026.** Ver `panel/CLAUDE.md`, "El recontacto y la
  última nota, en todas partes".
- **PR #366, mergeado el 25-11-2026** con el *"mergea"* del cliente: el
  recontacto, la última nota y la empresa del cliente, en todas partes (arriba).
- **En *Productos*, *Qué incluye* y *Bebestibles* traen el texto del sitio al
  apretar adentro** (25-11-2026, lo pidió el cliente): se trabaja desde esa
  base; si se sale sin cambiarlo, vuelve a blanco y sigue al sitio. **PR #367,
  mergeado el 25-11-2026** con el *"mergea"* del cliente, junto con lo de abajo.
  Ver `panel/CLAUDE.md`, "Qué incluye cada producto, escrito en su ficha".
- **Clientes: *👤 Por vendedor…*** (25-11-2026, lo pidió el cliente): pagos, la
  gerencia y el administrador filtran los clientes de un vendedor. En el mismo
  PR que lo del texto de *Productos*. Ver `panel/CLAUDE.md`, "Clientes:
  filtrar por vendedor". **Solo esos tres** (lo confirmó el cliente: operaciones
  no). En el mismo PR, **la frase del recontacto en la Agenda y en *Lo
  conversado*, ámbar hasta el día y roja desde el día**, como la pastilla 📞.
- **Arreglo urgente (25-11-2026): las *Notas internas* ya no salen en la
  cotización del cliente.** La hoja del link las imprimía, y con el importador
  del CRM salía su resumen en todas las importadas. Lo marcó el cliente con una
  foto y dijo *"sí, hazlo y luego mergea"*. Una prueba lo fija. Ver
  `panel/CLAUDE.md`, "Las *Notas internas* no salen en la cotización del
  cliente". **PR #368, mergeado el 25-11-2026.**
- **Clientes en dos secciones** (25-11-2026, lo pidió el cliente): arriba *📞 Por
  contactar*, por el día de recontacto, y abajo *Los demás*, de la A a la Z. **PR
  #369, mergeado el 25-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio
  15 de 15 después. Ver `panel/CLAUDE.md`, "El recontacto y
  la última nota, en todas partes".
- **Cotizaciones: los botones de arriba no se bajan** (25-11-2026, lo marcó el
  cliente con una foto del computador de un vendedor: *📋 Lista* había bajado sola
  a una segunda fila). Si *Tus pendientes* no caben al lado, bajan enteros y los
  botones fijos se quedan en su fila; una prueba nueva (`revisarFilaFija()`) lo
  mide. **PR #370, mergeado el 25-11-2026** con el *"sí, hazlo y mergea"* del
  cliente; `verificar.sh` dio 15 de 15 después. Ver `panel/CLAUDE.md`,
  "Cotizaciones: los botones de arriba no se bajan".
- **Confirmar el envío y las nuevas del sitio** (25-11-2026, lo pidió el cliente
  con la foto de la N° 693616, lista y en borrador): *Ver el documento* también
  pregunta *¿La mandaste?*; la pregunta sale al abrir una lista sin confirmar y
  en la ventana al entrar; la marca *✉ ¿La mandaste?* en las listas, la Agenda y
  Clientes; y, para la gerencia, pagos y el administrador, *✉ N sin confirmar el
  envío* en el calendario de Cotizaciones. Arriba de Cotizaciones y de Clientes,
  *🆕 Nuevas del sitio* / *🆕 Nuevos*: las del sitio sin ningún contacto
  anotado. En el paso 4, *✉️ Copiar correo* copia la dirección. **PR #371, mergeado
  el 26-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15 de 15
  después. Ver `panel/CLAUDE.md`, "Confirmar el envío y las nuevas del sitio".
- ***Ver bebestibles* en las tarjetas de las experiencias** (26-11-2026, lo pidió
  el cliente): en Experiencias y en los tres landings; se apriete el botón o
  cualquier parte, la tarjeta gira y muestra los bebestibles. Cero JavaScript.
  **PR #372, mergeado el 26-11-2026** con el *"mergea"* del cliente;
  `verificar.sh` dio 15 de 15 y `brasasdelopirque.cl/experiencias.html` ya trae
  los botones. Ver `CLAUDE.md`, "*Ver bebestibles* en las tarjetas de las
  experiencias".
- **Promociones: el rótulo de la oferta de fin de año dice *¿11? Me chupo los
  dedos entonces…*** (26-11-2026, lo pidió el cliente), en vez de *Bienestar y
  eventos corporativos*. **PR #373, mergeado el 26-11-2026**; `verificar.sh` dio
  15 de 15 y `brasasdelopirque.cl/promociones.html` ya lo trae.
- **La línea de cada reserva dice de dónde viene** (26-11-2026, lo pidió el
  cliente con una foto de la página del día): *🛒 Shopify · N°*, *✍ A mano ·
  MANUAL-…* o *🤝 Cotización N° … · empresa · vendió … · socio …*. **PR #374,
  mergeado el 26-11-2026** con el *"mergea"* del cliente; `verificar.sh` dio 15
  de 15 después. Ver `panel/CLAUDE.md`, "La línea de cada reserva dice
  de dónde viene".
- ***✕ Se cayó…* al final de la fila** (26-11-2026, lo pidió el cliente): en la
  fila de cada cotización y en la Agenda, después del N° y a la derecha; las
  filas sin él dejan su lugar, así los montos quedan en columna. Ver
  `panel/CLAUDE.md`.
- **PR #375, mergeado el 26-11-2026** con el *"luego mergea"* del cliente;
  `verificar.sh` dio 15 de 15 después. Trajo *Se cayó* al final, cada dato
  abre la cotización en su paso, *se cae sola* al día siguiente del evento,
  las filas de Cotizaciones y Clientes en columnas y la regla nueva *el mismo
  dato va en la misma columna* con `revisarColumnas()` (abajo).
- **Cada dato abre la cotización en su paso** (26-11-2026, lo pidió el
  cliente: *"el botón sin confirmar el envío debería terminar en paso 4
  envío, no en productos… preguntarme al tiro"*): ✉ abre el Envío con la
  pregunta, también para la gerencia (*¿Ya se le mandó…?*); en una fila, la
  fecha abre en Evento, el total en Productos y el estado, el 📞 o *falta
  cobrar* en Envío; y los pendientes, la bandeja, la página del día y el aviso
  al entrar abren en el paso de lo apretado (`lib/pasos.ts`). En el mismo PR
  que *Se cayó* al final. Ver `panel/CLAUDE.md`, "Cada dato abre la cotización
  en su paso".
- **Se cae sola al día siguiente del evento** (26-11-2026, lo preguntó el
  cliente y dijo *"sí, hazlo así"*): una cotización en carrera con día exacto,
  sin ganar, se ve perdida con *se cayó: pasó el evento*; no se escribe nada y
  vuelve sola si se le cambia el día (`pasoElEvento()`). **Y las filas de
  cotizaciones van en columnas** (lo pidió el cliente: las pastillas 📞 y ✉,
  centradas en una sola columna, como *Se cayó* a la derecha), **también en
  Clientes** (✉ *sin confirmar el envío* en la columna central). En el mismo PR
  #375, con la regla nueva *el mismo dato va en la misma columna* y su prueba,
  `revisarColumnas()`. Ver `panel/CLAUDE.md`.
- **Lo que sigue**: lo de después del lanzamiento (pendientes 5, 7, 9 y 10 de
  la sección 7).
- **El cliente mira el panel en su notebook y va mandando fotos** de lo
  que quiere más junto o más alineado. Preguntó
  por qué tenía que pedir él cada revisión: desde ese día **`npm run
  ventanas` mide cada ficha y cada ventana y es parte de `npm run
  revisar`** (sección 8). Lo que queda está en el pendiente 2 (sección 7).
- Lo que falta antes y después del lanzamiento está en la sección 7, en
  orden.

---

## 1. El sistema

**Brasas de Lo Pirque** es un restaurante campestre y centro de eventos en
Pirque (Región Metropolitana, Chile). Abre al público **sábados y domingos
desde las 13:00** (una sola jornada, sin bloques de hora) y hace eventos
privados: empresas, agencias de turismo, matrimonios.

### Para quién

| Público | Por dónde entra | Cómo cierra |
|---|---|---|
| Visitas particulares (familias, grupos chicos) | Sitio público, `reservas.html` | **Reserva y paga en Shopify**, no por WhatsApp. Es el objetivo comercial del sitio |
| Empresas, agencias, municipalidades | Landings: socios comerciales, promociones, dossier | WhatsApp de Eventos → un vendedor cotiza en el panel |
| El equipo interno (anfitriona, encargados, pagos, gerencia, vendedores) | El panel, con cuenta y rol | — |
| Trabajadores y colaboradores externos | Su **link personal** (`/mi/<token>`) y la planilla semanal (`/semana/<token>`) | Sin cuenta |

Hay **dos WhatsApp, distintos a propósito**: Reservas `+56 9 4009 6228`
(público) y Eventos `+56 9 3385 8575` (empresas). No se unifican.

### Dos entregables en un repo

1. **El sitio** (raíz del repo): HTML y CSS planos, sin build, en tres
   idiomas (español en la raíz; `en/` y `pt/` generados). Diez páginas:
   `index`, `experiencias`, `actividades`, `eventos`, `reservas`, `404`,
   `contacto` (redirige a reservas), y tres landings de empresa:
   `landing-afiliados` (socios, con comisiones), `promociones` (con 11% de
   descuento) y `dossier` (para una empresa que cotiza), cada uno con su PDF.
2. **El panel** (`panel/`): Next.js en Vercel, sobre una planilla de Google
   del cliente. Es el sistema de reservas propio: **Shopify cobra, el panel
   agenda.**

### Los módulos del panel

| Módulo | Pantallas | Qué hace | Detalle en `panel/CLAUDE.md` |
|---|---|---|---|
| **Reservas y calendario** | `/` (calendario), `/dia/<fecha>`, `/recepcion` | Días abiertos con su cupo, reservas de Shopify y a mano, estado del pago, sobrecupo, la caja *Cómo ingresarla en Fudo*, la mesa (agregados y valor final), rectificación, recepción de la anfitriona (*Llegó / No vino*) | "Las reservas en el panel", "Quien paga tiene preferencia", "La mesa", "El rol de anfitrión" |
| **Cotizaciones** | `/presupuestos` (menú *Cotizaciones*), `/clientes`, `/presupuesto/<token>`, `/contrato/<token>` | Fichas de clientes, cotización en 5 pasos, alternativas A/B/C, cobros con comprobante en Drive, contrato, ganar → reserva | "Los presupuestos", "Las cotizaciones" y siguientes |
| **Vendedores y socios comerciales** | `/vendedores` | Ficha por vendedor o socio, comisión por etapas + bono + monto por evento, la parte del vendedor cuando viene con socio, documento (boleta o factura), resumen | "El equipo de ventas", "Los socios comerciales" |
| **Equipo y turnos** | `/equipo`, `/turnos` | Trabajadores, puestos con regla *uno cada N personas*, planificar el día, *Vino / No vino*, cerrar y corregir el día, planilla semanal | "El equipo de trabajadores (panel)" |
| **Actividades extras** | `/extras` | Colaboradores externos (show ecuestre, castillo inflable, pintacaritas…), agendar, confirmar, ajustes | "Las actividades extras" (dentro de equipo) |
| **Propinas** | Ventana del día | El encargado escribe el total del día y el panel lo reparte | "La propina" |
| **Informe y pagos** | `/informe` | Sueldos, propinas, comisiones; pagos registrados; boletas; transferencia masiva; planillas descargables; ajuste desde la tarjeta | "El informe, ordenado y más compacto", "Pagar: sueldo y propina por separado" |
| **Boletas** | Informe y link personal | Cuánto boletear en bruto y en neto, con la retención del año | "La boleta: cuánto boletear" |
| **Estadísticas** | `/estadisticas` | De reservas y del equipo (sueldos por puesto, propinas, ventas) | "Las estadísticas de reservas", "Las estadísticas del equipo" |
| **Administración** | `/config`, `/usuarios` (*Cuentas*), `/bitacora`, `/menus` (*Productos*) | Configuración por secciones, cuentas y roles, bitácora, catálogo, *Ver como*, bandeja de aprobaciones, *Dejar la base en cero* | "La página de Configuración", "Cuentas con nombre y sesión", "La bitácora" |
| **Ayuda** | `?` de cada pantalla, `?` chicos, misiones con capturas, botón 💬 Comentar | Se explica sola; las fotos se rehacen con un script | "El panel se explica solo", "Las misiones de la ayuda" |

---

## 2. Arquitectura y stack

### El repo

**`ayc-y-blp/aycyblp`**, rama por defecto `main`. **Es público a propósito**
(decidido el 19-11-2026): todo lo que se escribe acá lo puede leer
cualquiera. **Nunca una clave, un dato de un cliente ni algo que el negocio
no quiera mostrar.** `main` está protegida (no se borra ni se reescribe),
**sin aprobaciones ni chequeos obligatorios**, a propósito.

```
/                       el sitio público (HTML plano, sin build)
├── index.html … dossier.html   las páginas en español: la fuente de verdad
├── en/  pt/            GENERADAS por tools/traducir.py: no se editan
├── assets/
│   ├── css/site.css, tema.css   estilos del sitio y la vista diurna
│   ├── js/reserva.js   calendario y carrito de Shopify (CONFIG al inicio)
│   ├── js/idioma.js    sugerencia de idioma
│   ├── js/tema.js      recuerda Diurno / Nocturno
│   └── imgs/ imgs2/ gallery/    fotos reales del negocio
├── precios.json        TODOS los precios del sitio, en un solo lugar
├── traducciones/       en.json y pt.json (llave = el texto en español)
├── tools/
│   ├── traducir.py     genera en/ y pt/, los ?v=, los precios y sitemap.xml
│   ├── publicar_sitio.sh   Build Command del sitio en Vercel (lista PUBLICO)
│   └── dossier_pdf.mjs genera dossier.pdf y socios.pdf en los tres idiomas
├── robots.txt, sitemap.xml
├── migracion-team/     variables de Vercel, verificar.sh, entorno
├── backend/README.md   por qué se jubiló el Apps Script
└── panel/              la aplicación Next.js
    ├── vercel.json     las tres tareas diarias (crons)
    ├── src/app/        páginas (una carpeta por pantalla) y api/
    ├── src/components/ componentes React ('use client')
    ├── src/lib/        lógica pura y acceso a la planilla (con pruebas)
    ├── src/middleware.ts   autentica; cada ruta autoriza
    ├── pruebas/        letra-chica, lecturas, webhook, ajuste, playstation,
    │                   capturas-ayuda.mjs y el panel de ejemplo (ejemplo/)
    └── public/ayuda/   las capturas de las misiones y puntos.json
```

### Vercel (equipo *Ayc y Blp*, plan pagado)

| Proyecto | Sale de | URL | Notas |
|---|---|---|---|
| **`landing-pirque`** (el panel) | Root Directory `panel`, Next.js | `landing-pirque-alpha.vercel.app` y `panel.brasasdelopirque.cl` | Las 18 variables. Las dos direcciones sirven; los links que el panel copia salen de `window.location.origin` |
| **`brasas-sitio`** (el sitio) | La raíz, preset *Other*, Build Command `bash tools/publicar_sitio.sh` | `brasas-sitio.vercel.app`; `brasasdelopirque.cl` desde el lanzamiento | Ninguna variable. El script escribe `.vercel/output` con **la lista de lo público** (`PUBLICO`) y las redirecciones 301 del sitio viejo |

- **Cada PR dispara dos chequeos**, `Vercel – landing-pirque` y
  `Vercel – brasas-sitio`, y cada uno trae su versión de prueba (preview).
  **Se espera a que los dos digan `success`** antes de mergear.
- **Tres tareas diarias** (`panel/vercel.json`, protegidas por
  `CRON_SECRET`, solo en Production): `/api/fechas/regla` 08:23 UTC (abre los
  días de la regla), `/api/shopify/sincronizar` 09:17 UTC (reconciliación de
  pedidos) y `/api/crm/publicar` 11:41 UTC (con el CRM apagado, retira lo que
  se había publicado allá).
- **GitHub Pages** también publica el repo entero en
  `ayc-y-blp.github.io/aycyblp/`: es para revisar, no para clientes.

### El dominio (Cloudflare)

El DNS de `brasasdelopirque.cl` se edita en **Cloudflare** (NIC Chile solo
registra). Todo lo que apunta a Vercel o Shopify va con **nube gris (DNS
only)**. Los 5 MX y 2 TXT de Google (el correo) **no se tocan nunca**.

| Registro | Hoy | Desde el lanzamiento |
|---|---|---|
| `@` | A a Shopify | CNAME a Vercel (el valor está en `CLAUDE.md`, "El dominio en Cloudflare") |
| `www` | CNAME `shops.myshopify.com` | CNAME a Vercel; Vercel lo redirige a la raíz (el sitio va **sin www**) |
| `panel` | CNAME a Vercel | igual |
| `tienda` | CNAME `shops.myshopify.com` | igual; pasa a ser el **dominio principal** de la tienda |

### Google Sheets como base de datos

**Una planilla por empresa** (`GOOGLE_SHEET_ID`), leída y escrita por una
cuenta de servicio. **Production usa la planilla real; Preview, una copia
llamada "Pruebas"**, para que una versión de prueba nunca escriba en lo
real. Los parámetros del negocio viven en la pestaña `Config`, no en Vercel.

**Reglas de la planilla que no se rompen**:

- **Las columnas se leen por nombre**, sin distinguir mayúsculas ni tildes;
  los nombres de pestaña se resuelven una vez (`nombreReal()`). Las columnas
  nuevas **van al final** y se agregan solas (`asegurarColumna()`,
  `asegurarHoja()`).
- **Las fechas son texto `AAAA-MM-DD` de punta a punta**, nunca `Date`.
- **60 lecturas por minuto para todo el panel** (sección 9).
- `/api/diagnostico` dice columna por columna qué falta.

| Pestaña | Una fila es | Columnas clave | Se relaciona con |
|---|---|---|---|
| `Reservas` | una reserva | `ID Orden` (id de Shopify, `MANUAL-…` a mano), `Fecha Reserva`, `Nombre`, `Email`, `Teléfono`, `Menú`, `Personas`, `Monto`, `Tipo Pago` (solo Shopify: *Pago directo / Solo reserva*), `Estado Pago Shopify` (`paid`, `pending`, `partially_paid`, `cancelled`, `refunded`, `voided`), `Asistencia`, `Nota de pago`, `Abonado`, `Se cayó por cupo`, `Anotada por`, `Pago anotado`, `Pago revisado`, `Agregados`, `Valor final`, `Mesa cerrada`, `Cobrado en el local`, `Comprobante del cobro`, `Cobro cerrado`… | `Fechas Hábiles` por fecha; `Presupuestos.ID Reserva` |
| `Fechas Hábiles` | un día del calendario | `Fecha`, `Capacidad Máx`, `Hora Apertura`, `Estado` (*Abierta / Privada / Privada exclusiva / Cerrada*), `Notas`, `Cupo pedido` | `Reservas`, `Turnos`, `Actividades` por fecha |
| `Config` | un parámetro | `Clave` · `Valor` (días que se abre, cupo, vigencia, descuentos, anticipo, mínimo del show, datos de la empresa, carpeta de Drive…) | todo |
| `Menús` (pantalla *Productos*) | un producto del catálogo | `Menú` (nombre, **igual que en Shopify**), `Precio en línea`, `Precio en el local`, `Tipo` (*Menú / Extra / Arriendo / Show*), `Sitio público`, `Cotización`, `Cobro`, `Precio cotización`, `IVA`, `Moneda`, `Activo`, `Bono vendedor`, `Costo`, `Lo cobra`, `Descripción`, `Bebestibles` | Reservas (por nombre), líneas de cotización |
| `Clientes` | una ficha | `ID` (`C-0001`), `Nombre`, `Empresa del cliente`, `RUT`, `Domicilio`, `Teléfono`, `Correo`, `Giro`, `Creado por` | `Presupuestos.ID Cliente` |
| `Presupuestos` | una cotización (o una alternativa) | `ID`, `Fecha`, `Estado`, `Válido hasta`, `Token`, `ID Reserva`, `ID Cliente`, `Invitados`, `Grupo` (las alternativas comparten grupo), `Descuento total`, `Documento`, `Anticipo %`, `Anticipo monto`, `Saldo días antes`, `UF`, `Exclusivo`, `Exclusividad`, `Contrato firmado`, `Enviada`, `Comisión vendedor`, `Socio comercial`, `Comisión socio`, `Show bajo el mínimo`, `Recontactar el`, `Redactar antes del`, `Origen` (*Sitio · …*), `Aviso del sitio visto`, `Otras empresas coordinadas`, `Promoción` (la aplicada, su ID), `Creado por`… | `Presupuesto Líneas`, `Cobros`, `Clientes`, `Reservas`, `Notas` |
| `Presupuesto Líneas` | una línea de una cotización | `ID Presupuesto`, `Concepto`, `Cantidad`, `Precio unitario`, `Personas`, `Descuento`, `IVA`, `Precio UF`, `Lo cobra` (otra empresa: va aparte del total), `Descripción` y `Bebestibles` (qué incluye en esta cotización; en blanco, el texto del sitio) | `Presupuestos` |
| `Cobros` | un pago del cliente de una cotización | `ID`, `ID Presupuesto`, `Fecha de pago`, `Concepto` (*Anticipo / Saldo / Otro*), `Monto`, `Medio`, `Comprobante` (id en Drive), `Revisado por`, `Revisado` | `Presupuestos` |
| `Puestos` | un puesto | `Puesto`, `Uno cada N personas` | `Turnos`, `Trabajadores` |
| `Trabajadores` | una ficha | `Nombre` (es la identidad), `Puesto habitual`, `Activo`, `Token de acceso`, `Modalidad` (*por turno / contratado*), `Pago por jornada`, `Valor hora extra`, `Participa en propina` (en blanco = sí), `Nota de pago` (datos bancarios), `Por confirmar`, `Pago jornada preparación` | `Turnos.Trabajador` por nombre |
| `Turnos` | una persona un día | `Fecha`, `Trabajador`, `Puesto`, `Asistencia` (*Sí / No* / en blanco = sin marcar), `Modalidad`, `Propina` (su parte), `Pago jornada`, `Horas extra`, `Valor hora`, `Ajuste` (varios con `\|`: `-20000\|5000`), `Motivo del ajuste` (`Adelanto · Transferencia\|Feriado`) | `Trabajadores`, `Cierres` |
| `Ajustes sueltos` | un ajuste fuera de turno | `ID`, `Fecha`, `Trabajador`, `Monto`, `Motivo`, `Anotado por`, `Cuándo` | se suma al informe como un turno sin día |
| `Cierres` | un día cerrado | `Fecha`, `Cerrado por`, `Cuándo` | un día cerrado no se edita: se corrige, y la lista de lo que cambió queda en la bitácora |
| `Colaboradores` | un colaborador externo | `Nombre`, `Actividad`, `Activo`, `Monto habitual`, `Nota de pago`, `Token de acceso`, `Por confirmar` | `Actividades` |
| `Actividades` | un colaborador un día | `Fecha`, `Colaborador`, `Actividad`, `Vino`, `Monto`, `Ajuste`, `Motivo del ajuste` (mismo formato que `Turnos`) | `Colaboradores` |
| `Pagos` | un pago registrado al equipo | `ID`, `Fecha de pago`, `Trabajador`, `Periodo desde`, `Periodo hasta`, `Monto`, `Concepto` (sueldo o propina), `Registrado por` | informe |
| `Boletas` | una boleta recibida | `Trabajador`, `Periodo desde`, `Periodo hasta`, `Registrado por`, `Cuándo`, `Monto neto` | informe y link personal |
| `Vendedores` | un vendedor o un socio comercial | `Usuario` (la cuenta; `S-0001` un socio, que no tiene cuenta), `Nombre`, `Tipo`, `Sueldo fijo mensual`, `Comisión %`, `Etapa 1 desde`, `Etapa 2 desde/%`, `Etapa 3 desde/%`, `Bono premium (puntos)`, `Monto por evento`, `Base comisión`, `Con socio cobra %`, `Documento`, `Impuesto`, datos de factura, `Token de acceso` | `Presupuestos.Creado por` y `Socio comercial` |
| `Usuarios` | una cuenta del panel | `Nombre`, `Usuario`, `Rol`, `Activo`, `Clave (huella)`, `Vista gerencia`, `Avisos leídos` | `Bitácora`, permisos |
| `Notas` | una nota de un vendedor sobre una cotización (su grupo) | `ID`, `ID Presupuesto`, `ID Cliente`, `Cuándo`, `Quién`, `Medio`, `Nota`. Las leen su vendedor y la gerencia; no se borran | `Presupuestos` por grupo |
| `Promociones` | una promoción del sitio (desde el 23-11-2026) | `ID`, `Nombre`, `En el sitio` (la clave del bloque), `Activa`, `Menús`, `Menú de niños`, `Incluye`, `Se puede sumar`, `Mínimo de personas`, `Descuento` (el primer tramo), `Arriendo`, `Cotizador`, `Más tramos` (`50:15 \| 80:20`), `Mostrar en el sitio` (en blanco, sí), `Días de anticipación` (en blanco, sin plazo) | `Menús` por nombre |
| `Otras empresas` | una empresa que cobra directo algo del evento (desde el 24-11-2026) | `Nombre` (la identidad: lo usan `Menús.Lo cobra` y `Presupuesto Líneas.Lo cobra`), `RUT`, `Contacto`, `Teléfono`, `Correo`, `Qué hace`, `Activa` | `Menús` y `Presupuesto Líneas` por nombre |
| `Caja chica` | un movimiento de la caja (desde el 23-11-2026) | `ID`, `Fecha`, `Cuándo`, `Tipo` (*Saldo inicial / Cobro / Gasto / Entrega / Depósito / Compra*), `Monto`, `Detalle`, `Quién`, `Para`, `Recibido`, `Comprobante` (id en Drive), `Reserva`, `Revisado` | `Reservas` por `ID Orden` (un cobro en efectivo) |
| `Bitácora` | una acción | `Cuándo`, `Quién`, `Rol`, `Acción`, `Detalle` | — |
| `Comentarios` | (en **otra** planilla, `COMENTARIOS_SHEET_ID`) lo que manda el botón 💬 | — | — |

### Shopify

- **Dos tiendas**: la **real** (`lo-pirque.myshopify.com`) y la de
  **desarrollo** (`brasas-de-lo-pirque-development.myshopify.com`), que solo
  procesa pagos de prueba. **La real solo en las direcciones reales.**
- **El sitio usa la Storefront API** (versión `2026-10`) desde
  `assets/js/reserva.js`: `CONFIG.tiendas.real` y `.prueba`, cada una con
  dominio, token **público** de Storefront e IDs de variante por menú y
  modalidad; `tiendaDeEstaPagina()` elige por `location.hostname` contra
  `CONFIG.direccionesReales`. **Un token de Admin API jamás va en el sitio.**
- **Ocho variantes por tienda**: 4 menús (Tradiciones, A Brasas abiertas,
  Niños, Pequeños) × 2 modalidades (*Pago directo* = paga en línea, más
  barato; *Solo reserva* = paga en el local). **La fecha no es una
  variante**: viaja como propiedad de línea `_booking_date` (y
  `_cowlendar_date`, que se mantiene a propósito).
- **El panel usa la Admin API** (`read_orders`) para la reconciliación y
  *Revisar Shopify ahora*: en la tienda real, con `SHOPIFY_CLIENT_ID` +
  `SHOPIFY_CLIENT_SECRET` pide un token de 24 h (`tokenDeAcceso()` en
  `lib/admin.ts`); en Preview, el token fijo `SHOPIFY_ADMIN_TOKEN`.
- **Webhooks** `orders/create`, `orders/updated` y `orders/cancelled` a
  `/api/shopify/webhook`, firmados con HMAC (`lib/firma.ts`) con el secreto
  de *Notificaciones → Webhooks* (no el de la app).
- **Quién paga cómo lo decide el checkout**: una regla de la tienda oculta
  los medios de pago según el SKU (`pago-directo-<menú>` /
  `solo-reserva-<menú>`). Si deja de aplicar no avisa; la señal es una fila
  *Pago directo / por pagar* en el panel.
- **El checkout sale en español para todos** (`es-us`), lo fija la tienda.

### Otras integraciones

| Qué | Para qué | Dónde |
|---|---|---|
| Google Calendar | El panel anota las reservas como eventos (opcional, `GOOGLE_CALENDAR_ID`) | `lib/google-calendar.ts` |
| Google Drive | Comprobantes de pago y contratos firmados, en una unidad compartida del Workspace, carpeta en `Config` (`drive_comprobantes`); alcance `drive.file`; nunca por link público | `lib/drive.ts` |
| UF del día | Productos en UF en las cotizaciones (api.boostr.cl, respaldo mindicador.cl, se guarda 6 h solo un valor bueno) | `lib/uf.ts`, `lib/ufRed.ts`, `/api/uf` |
| Pronóstico | MET Norway (`api.met.no`), con cita de la fuente y User-Agent | `lib/clima.ts` |
| CRM del socio | **Apagado desde el 10-11-2026** (`CRM_APAGADO` en `lib/crm.ts`); el código queda | `lib/crm.ts`, `lib/crm-escribir.ts` |
| Fudo | El sistema de caja del restaurante. **No hay integración**: el panel dice cómo ingresar cada reserva (`lib/fudo.ts`) | — |
| WhatsApp | Enlaces `wa.me` / WhatsApp Web con el mensaje firmado (`saludoAlCliente()`) | `lib/contacto.ts`, `BotonWhatsApp` |

### Variables de entorno del panel (nombres, sin valores)

Los valores están en la bóveda de la empresa y en Vercel → `landing-pirque`
→ Settings → Environment Variables. **Nunca en el chat ni en el repo.** El
detalle de cada una (qué es, en qué entorno, cómo recuperarla) está en
`migracion-team/variables-vercel.md`.

| Variable | Production / Preview |
|---|---|
| `GOOGLE_SHEET_ID` | planilla real / copia "Pruebas" |
| `GOOGLE_SHEET_ID_PRODUCCION` | — / la planilla real, **solo para leerla** (opcional, desde el 24-11-2026: *Traer los datos de producción a la prueba*) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | iguales |
| `GOOGLE_CALENDAR_ID` | solo Production (opcional) |
| `PANEL_USUARIO`, `PANEL_CLAVE` | iguales (administrador de emergencia; cambiar la clave cierra todas las sesiones) |
| `SESION_SECRETO` | igual (firma las sesiones) |
| `PANEL_ENCARGADO_USUARIO`, `PANEL_ENCARGADO_CLAVE` | opcionales, de antes de las cuentas |
| `SHOPIFY_DOMINIO` | tienda real / tienda de desarrollo. **(Por confirmar)** que en Production ya diga `lo-pirque.myshopify.com`: debía ponerse justo antes del merge del PR #283 |
| `SHOPIFY_VERSION` | `2026-10` |
| `SHOPIFY_ADMIN_TOKEN` | no se usa en la real / token de la tienda de desarrollo |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | solo Production (app *Reservas Pirque* del Dev Dashboard) |
| `SHOPIFY_WEBHOOK_SECRET` | secreto de la real / de la de desarrollo |
| `CRON_SECRET` | igual |
| `COMENTARIOS_SHEET_ID` | solo Production, a propósito: se comenta solo en producción (25-11-2026). Sin ella no aparece el botón 💬 |
| `CRM_API_KEY` | solo Production (opcional; el CRM está apagado) |

El proyecto del sitio no lleva variables: es estático.

---

## 3. Flujos críticos

### A. Una compra en Shopify se vuelve reserva

1. **El calendario del sitio** (`reservas.html` + `reserva.js`) pide las
   fechas a `/api/publico/fechas` del panel. El contrato es **chico a
   propósito** y no se engorda: `{ fecha, quedan, pocos, quedanPagando }` y
   un `error` si algo falló. `quedanPagando` es lo que queda para quien paga
   ahora (puede ser más que `quedan`). El recorte vive en `lib/publico.ts`.
2. **El formulario**: **un solo contador de adultos** y una casilla que sube
   a todos a *A Brasas abiertas* (bar abierto: no se puede servir a 2 de 5),
   más niños y pequeños, que nunca suben. Dos botones con su total:
   *Pagar ahora $X* / *Solo reservar $Y*. Los precios de las filas los
   escribe `traducir.py` desde `precios.json`.
3. **`cartCreate`** contra la tienda de esa dirección, una línea por menú
   con cantidad > 0, cada una con `_booking_date` y `_cowlendar_date`.
   Redirige al `checkoutUrl`.
4. **El checkout de Shopify** cobra (o deja *pago en el local*, según el SKU).
5. **El webhook** llega a `/api/shopify/webhook`: verifica la firma (401 si
   no calza); **si el pedido no trae `_booking_date` lo descarta antes de
   leer la planilla** y deja una línea en los registros de Vercel (así se
   ignoran los pedidos del sitio viejo). Si la trae, `aReserva()` arma la
   fila: el menú por el nombre del producto (`canonizar()`), la modalidad por
   la variante (`tipoPagoDe()`), el estado por `financial_status`, el
   teléfono de los cuatro lugares posibles (`telefonoDe()`). **El `ID Orden`
   es el id del pedido y evita duplicados.**
6. **La reconciliación diaria** (`/api/shopify/sincronizar`, también el botón
   *Revisar Shopify ahora*) rellena lo que un webhook haya perdido.
7. **El cupo**: `ocupaLugar()` (todo menos cancelada, reembolsada, anulada o
   *Se cayó por cupo*) descuenta del día; `tienePrioridad()` (pagada o
   abonada) define `quedanPagando`. **Una reserva sin pagar queda sujeta a
   espacio**: si un pago entra encima, el día queda en **sobrecupo** y
   alguien decide en la página del día entre *Ampliar el cupo* o *Soltar* una
   sin pagar.
8. Si está configurado, el panel crea el evento en Google Calendar.

**Reserva a mano**: desde el panel, con `ID Orden = MANUAL-…`; sin
modalidad (eso es solo de Shopify), con estado *Pagada / Abonada / Por
pagar*, monto sugerido desde `Menús` y editable.

### B. Una cotización de un vendedor se vuelve reserva

1. **Paso 1 · Cliente**: buscar la ficha o crearla (nombre + teléfono o
   correo); el servidor avisa si hay parecidos por RUT, teléfono o correo.
2. **Paso 2 · Evento**: fecha (o *todavía no hay día exacto*), invitados con
   − y +, tipo. Al seguir se crea la cotización y desde ahí **se guarda
   sola**.
3. **Paso 3 · Productos**: del catálogo (`Menús` con *Cotización = sí*), en
   dos filas: Menús (son gente) y Extras y arriendo. El precio se propone y
   se negocia; descuento por línea y sobre el total; IVA estándar (líneas en
   neto, abajo neto, IVA 19% y total). Reglas en `prepararLineas()`
   (`lib/cotizar.ts`), la misma función en pantalla y servidor: un producto
   va una sola vez, solo los Menú suman personas, el show va incluido a $0 en
   un día público y con mínimo $100.000 + IVA en un privado bajo 25 personas.
   Con arriendo pregunta si el día es **exclusivo**.
4. **Paso 4 · Envío**: documento (boleta, factura o sin documento),
   condiciones (anticipo 30% y saldo 3 días antes por defecto, editables),
   cobros del cliente con comprobante a Drive (los revisa pagos), mandarla
   por WhatsApp o correo → *Enviada*, y desde ahí corre la vigencia (15
   días). **Solo lo mandado cuenta como gente posible en el calendario
   principal**, y **nunca ocupa cupo**.
5. **Paso 5 · Contrato**: datos legales, horario, Ley 20.393, acuerdos,
   cambios de fecha y cancelación; se imprime desde `/contrato/<token>`, se
   firma en papel y **se sube el firmado** a Drive.
6. **Ganar** (`/api/presupuestos/convertir`): pide anticipo pagado **o**
   contrato firmado (`puedeGanar()`); sin ninguno de los dos pregunta en
   serio y la reserva nace *sujeta a espacio*. Comprueba el cupo
   (`cupoParaGanar()`) y la exclusividad. **Escribe primero la reserva y
   después el vínculo** (`ID Reserva`): si falla lo segundo, se ve doble y se
   nota; al revés, la gente desaparecería sin que nadie se entere. La reserva
   (`reservaDesdePresupuesto()`) lleva el **total negociado**, solo las
   líneas con personas en `Menú`, y su estado sale de los cobros
   (`pagoPorCobros()`). Abre el día si hace falta (como privado). Las otras
   alternativas pasan a *No elegida* y sus cobros a la ganadora.
7. **Después**: editar la ganada reescribe su reserva
   (`sincronizarReserva()`); esa reserva **no se edita a mano** salvo lo del
   día. Cancelar calcula la devolución; *Corregir la ganada* deshace.
8. **En la recepción y la página del día**, la caja *Cómo ingresarla en Fudo*
   muestra lo acordado línea por línea con su valor en Fudo con IVA.

Estados: **Candidato → Borrador → Enviada → Negociación → Ganada / Perdida
(con motivo) / No elegida**; *Vencida* se deduce de la fecha.

### C. Cómo se calcula lo de cada trabajador

- **Un turno** (`pagoDe()` en `lib/equipo.ts`): si vino, **jornada** (cero
  si es contratado) **+ horas extra × valor hora + ajustes**, nunca bajo
  cero. Sin marcar o *No vino*, cero. Un ajuste fuera de turno
  (`Ajustes sueltos`) suma tal cual, también negativo.
- **Un extra**: su monto más sus ajustes, si vino.
- **La propina** (`repartirPropina()`, la regla vive solo ahí): el encargado
  escribe el **total del día** y se reparte **en partes iguales entre quienes
  vinieron y participan** (`Participa en propina`, en blanco = sí; quien no
  tiene ficha participa). **Hasta el último peso**: el resto va de a un peso a
  los primeros. **Se guarda la parte de cada uno en su turno**, no el pozo.
  **La propina no es sueldo**: no entra en `pagoDe()` ni en el costo del día,
  va en su columna, y nunca en la boleta.
- **Cerrar el día** lo congela; después se corrige: el panel arma la lista
  de lo que cambió, se confirma con una casilla y queda en la bitácora.
- **El informe** suma por periodo (día, semana, mes, rango); **pagos**
  registra lo transferido (`Pagos`, sueldo y propina por separado) y marca
  boletas.
- **La boleta** (`lib/boletas.ts`): el neto es el sueldo o servicio sin
  propina; **un *Adelanto* no la baja**, lo demás sí; el **bruto** es
  `neto ÷ (1 − tasa)` redondeado hacia arriba, con la tasa de la **Ley
  21.133 del año en que se emite** (15,25% en 2026, 16% en 2027, 17% desde
  2028). Una boleta cubre días, así que se puede boletear por semana o por
  mes. Un contratado no tiene caja; un socio factura con IVA.

### D. Cómo se calcula una comisión

`comisionDe()` en `lib/vendedores.ts` (modelo A, elegido por el cliente):

```
comisión = % de la etapa × base del evento
         + puntos de bono × base de las líneas de productos con "Bono vendedor"
         + monto por evento
```

- **Etapas por personas del evento**: rige la más alta que alcance. Bajo
  el *desde* de la etapa 1 no hay comisión.
- **La base** es el neto (sin IVA) o el total, según la ficha. Va en %, así
  que un descuento baja la comisión.
- **Con un socio comercial**: el socio cobra **su comisión completa**,
  aparte, según su trato (de partida **5% desde 22 personas, 10% desde 55 y
  15% desde 77, sobre el neto**); el vendedor cobra **un % de su propia
  comisión** (`Con socio cobra %`, 50% de partida).
- **Se congela** cuando el cliente terminó de pagar **y pagos revisó los
  cobros** (`congelarComision()`), en `Comisión vendedor` / `Comisión socio`
  con la frase de cómo se calculó. Desde ahí no cambia aunque cambie la
  ficha.
- El **sueldo fijo mensual** entra a fin de mes. Se paga desde el informe,
  con boleta o factura según el documento de la ficha.

---

## 4. Lo que se hizo en esta conversación (19 al 21-11-2026)

### Mergeado a `main`

| PR | Qué |
|---|---|
| #262, #263 | Migración: el repo pasó a `ayc-y-blp/aycyblp`, el panel al equipo *Ayc y Blp* de Vercel (pagado), `main` protegida |
| #264 → #267 | **Incidente**: un `.vercelignore` en la raíz dejó el panel en 404 de 16:59 a 17:41 UTC; se retiró de urgencia. Lección en sección 6 |
| #265 | El sitio abre en la **vista diurna** |
| #266, #268 | El sitio como proyecto propio `brasas-sitio`, con `tools/publicar_sitio.sh` y dos chequeos por PR |
| #269, #272 | Variables del panel separadas por entorno (Preview contra la planilla "Pruebas") y el secreto de los webhooks |
| #270 | El repo queda público, a propósito |
| #271 | Redirecciones 301 de las direcciones del sitio viejo |
| #273 | **Dos tiendas**: la real solo en la dirección real |
| #274 | Lo acordado en una cotización, en la caja de Fudo |
| #275 | La pastilla de lo pendiente se dobla en el teléfono |
| #276 | Mínimo del show en un día privado chico; menús y extras en dos filas |
| #277 | Ajustes del día: **− Descontar / + Sumar**, con motivo y medio |
| #278 | Boletas: bruto, neto, retención y filtro *Sin boleta* |
| #279 | Regla de los dos caminos para mergear desde el lanzamiento |
| #280, #281 | Vendedores y socios como lista de tarjetas con buscador; agregarlos con su boleta o factura |
| #282 | El dominio en Cloudflare y `panel.brasasdelopirque.cl` |
| #283 | **Tienda real conectada**; token por credenciales del Dev Dashboard; el webhook descarta sin leer la planilla; fuera los formularios de novedades (no guardaban nada); `robots.txt` y `sitemap.xml` |
| #284 | A la tienda solo lo que Shopify muestra sin su tema (pedidos, checkout, carrito con código) |

### PR #285, mergeado el 21-11-2026 (camino *con prueba*, con el OK del cliente)

| Commit | Qué |
|---|---|
| `81b9912`, `392288a` | Datos de transferencia en el orden y formato del formulario del banco; copiar solo los valores, uno por línea |
| `40eead5`, `daff068`, `b1796e3` | **Ajuste desde el informe** (− Descontar / + Sumar en la tarjeta del trabajador, con permiso `pagar`), *Hoy* fuera de turno en la pestaña nueva `Ajustes sueltos` |
| `2a380fa` | Informe ordenado (con plata / falta marcar / sin nada), filtro *Sin marcar*, bordes de 3px, celular un 10-15% más chico, transferencia masiva plegada |
| `bc1b425` | **Estadísticas del equipo**: sueldos por puesto, propinas y ventas |
| `2785bb7`, `3a231ba` | Informe en el computador: ajuste arriba de los pagos, boleta compacta, **una línea por persona (62px)** y la tarjeta abierta entera en 1280×650 |
| `2afeb73` | **`TarjetaLista`**: una sola tarjeta para todas las listas que se abren; regla *un cambio de diseño se lleva a sus parecidos* |
| `d4927ba` | Los puestos de la ventana del equipo con `marcoGrupo` |
| `d7df3bb`, `7657ec3` | Se saca el aviso *Hay N turnos sin cerrar*: basta con el filtro *Sin marcar* |
| `119445d` | **`LineaDelDia`**: la misma línea para el equipo y los extras, más compacta; **los extras con varios ajustes** |
| `ab9403b`, `10549ab` | Turnos: el porqué de los días por cerrar va a su `?`; **el ajuste se guarda con ✓ Guardar y se pliega**; hoy con el fondo iluminado; reglas *la tarjeta cabe en una pantalla* y *lo que explica va en su `?`* |
| `da65844`, `8901445`, `2ebee77`, `7f2bfa3`, `bc622ad` | **Lo que explica, a su `?`**, en todo el panel (cuatro tandas) |

Archivos que toca: `CLAUDE.md`, `panel/CLAUDE.md`; en `panel/src/lib/`:
`ayudas.ts`, `banco.ts`, `boletas.ts`, `datos.ts`, `equipo.ts`,
`estadisticasEquipo.ts`, `extras.ts`, `misiones.ts`, `poderes.ts`,
`prueba.ts`, `remuneraciones.ts`; rutas `api/equipo/ajuste`,
`api/estadisticas`, `api/extras/dia`, `api/informe`, `mi/[token]`,
`bitacora`; `globals.css`; componentes nuevos `TarjetaLista.tsx`,
`LineaDelDia.tsx`, `AjusteInforme.tsx`, `EstadisticasEquipo.tsx`, y
cambios en `InformeEquipo`, `CajaBoleta`, `EquipoDialogo`, `ExtrasDialogo`,
`EquipoEditor`, `CalendarioExtras`, `CalendarioEquipo`, `FechaDia`,
`ClientesEditor`, `MenusEditor`, `ResumenVendedor`, `RecepcionVista`,
`DayView`, `ReservasDelDia`, `ReservaForm`, `MesaReserva`, `Correccion`,
`CotizacionDialogo`, `CotizacionesVista`, `Pendientes`, `BloqueSobrecupo`,
`AvisoSobrecupo`, `BloqueLiberar`, `BloqueCancelada`, `AgregarVendedor`,
`CamposDocumento`, `FichaTrabajador`, `FichaColaborador`, `ConfigEditor`,
`UsuariosEditor`, `VerComo`, `Cabecera`, `CalendarView`, `DiaEditor`,
`Estadisticas`, `Dialogo`; pruebas `ajuste.mjs`, `capturas-ayuda.mjs`,
`lecturas/google-falso.mjs`, `letra-chica.mjs`; y las fotos de
`public/ayuda/`. **Ninguna columna nueva salvo la pestaña `Ajustes
sueltos`; ningún permiso cambió.**

### PR #287, mergeado el 21-11-2026 (estuvo en preview hasta que el cliente dijo *"mergea"*)

Lo pidió el cliente el 21-11-2026: *"se puede compactar todas las vistas en
el computador un poco más, sin perder la regla PlayStation y… el aspecto
jugable, intuitivo en el panel"*. Se midieron las 15 pantallas a 1280×650:
el título aparecía recién a los 202–209px. **Lo que sobra es aire entre
piezas, no tamaño de botones ni de letra.**

- **Capa 1, en este PR**: el marco común, **solo desde 1024px** (`lg:`). La
  barra baja de 109 a 97px, la tira *¿Primera vez acá?* de 61 a 49px y el
  margen sobre la página de 32 a 16px; el título de cada pantalla sube unos
  40px. Los botones del menú siguen en 36px y ninguna letra baja. **El
  celular y las páginas que se mandan afuera** (link personal, planilla
  semanal, cotización, contrato, entrada) **quedan igual**: la barra del
  panel lleva `data-marco="panel"` y el `<main>` sube solo cuando la ve.
- La capa 1 toca `layout.tsx`, `Cabecera`, `Recorrido` y `BandaSeccion`.
  Sin lecturas de Google, sin permisos, sin fotos de la ayuda que rehacer
  (se sacan a 400px de ancho).
- **Capa 2, en el mismo PR** (*"dale con la capa 2"*), pantalla por
  pantalla y también solo en el computador:
  - **Los calendarios de Reservas y Cotizaciones, con zoom** (*"demasiado
    ampliado todo… como hacer un zoom… que ninguna de las informaciones
    desaparezca"*): cinco tarjetas por fila, la de Reservas de 285 a 236px
    y la de Cotizaciones de 215 a 170, sin sacar ningún dato.
  - **Lo que ocupaba varias filas, en una** (*"esto puede ser una fila en el
    computador, un campo bien organizado… revisa si hay otros casos"*): el
    encabezado de la página del día es un solo campo con el día, el tiempo,
    *Al día*, *Qué preparar* y *Cómo viene el pago*; lo mismo en el equipo
    del día, Calendario, Cotizaciones, Recepción y Equipo. Configuración va
    en dos columnas y Cuentas con el rol en una fila.
  - **Los formularios, alineados** (regla nueva): en la línea del día del
    equipo y de los extras, todos los nombres miden lo mismo
    (`COLUMNA_ROTULO`) y los valores parten en la misma vertical. Esto vale
    también en el celular.
- **El celular mide lo mismo que antes** en las 15 pantallas. Sin lecturas
  de Google ni permisos; las fotos de la ayuda no cambian.
- **Los formularios alineados, en todo el panel** (commit `84a6267`): el
  `?` chico ya no mueve a sus vecinos (se ve de 24px y se aprieta en 36),
  `rejilla-campos` y `fila-ficha` para las fichas, *Correo comprobante* y
  *Hora extra* en un renglón, ***sin propina*** y ***sin jornada*** en la
  línea del día, y **+ Cliente nuevo** arriba en el paso 1 de cotizar.
- **Las ventanas caben en la pantalla del computador** (commit `0c01035`,
  *"todas las pestañas se pueden organizar para que queden dentro de una
  pantalla"*): `Dialogo` parte arriba en el computador; cotizar es ancha,
  con el paso 3 como tabla y el 4 en tres columnas con lo secundario
  plegado; el equipo del día en tres columnas parejas; y en columnas la
  reserva nueva, agregar vendedor, el trato, *Ver como*, *Comentar*,
  *Dejar la base en cero* y las fichas de cliente, producto y vendedor. La
  tabla con las medidas está en `panel/CLAUDE.md`, "Las ventanas caben en
  la pantalla del computador". **No cupieron dos**, las dos del equipo del
  día: con el formulario de un ajuste abierto (839px) y la cara de
  reservas, que es una lista (859px).
- **Corregir un día cerrado sin motivo escrito** (*"haz una casilla,
  confirmar, y luego la lista de los cambios… y luego guardar"*):
  `lib/correccion.ts` arma la lista, `PieCorreccion` la muestra con su
  casilla, y esa lista queda en la bitácora. En el equipo y en los extras.
- **`npm run ventanas`** (`pruebas/ventanas.mjs` y `alineacion.mjs`): 43
  escenas a 1280×650. Va dentro de `npm run revisar`.
- En el celular las ventanas miden lo mismo, salvo tres que bajaron unos
  pixeles a propósito (la ficha de un producto, el paso 5 de cotizar y la
  corrección). Sin lecturas de Google ni permisos. Las fotos de la ayuda se
  rehicieron todas.
- **Cuatro retoques que el cliente marcó con fotos** (detalle en
  `panel/CLAUDE.md`, "El marco del puesto manda…"):
  - **El marco del puesto es el más marcado** de la ventana del equipo del
    día: 3px oscuro y el título en negrita; las personas, adentro, con 2px
    (`marcoGrupo`, `TITULO_GRUPO`, `marcoTarjeta(…, dentro)`). Lo mismo en
    *Actividades del día* de los extras.
  - **El puesto habitual se elige de los puestos que existen**
    (`ElegirPuesto`), también en la ficha que se abre desde el día, que era
    texto libre.
  - ***Falta su cuenta* es un aviso, igual en todas partes**
    (`Pastilla tipo="falta"`): en el Informe dejó de parecer un botón y va
    en el renglón del detalle, como en Vendedores, Equipo y Extras.
  - **La pastilla *falta $119.883* ya no pisa el botón de propina**: la
    columna del total del Informe tenía ancho fijo y ahora es un mínimo.
  - **`npm run ventanas` falla si una escena no encuentra qué medir** (antes
    decía *ok · nada de 0px*, y así estuvo la del cliente nuevo). Un
    formulario que no es ventana ni tarjeta se marca con `data-ficha`.
- **Las dos preguntas que quedaban**, contestadas por el cliente en una línea
  dictada: *"¿las listas? Sí, se doblan en vez de cortarse"*. **Se leyó como
  dos sí y van en dos commits separados** (`61a4b69` y `907619a`), por si lo
  de la reserva no era lo que quiso decir. Detalle en `panel/CLAUDE.md`, "Los
  nombres se doblan, y la reserva de un día cerrado se corrige con casilla":
  - **Los nombres se doblan en vez de cortarse con "…"**, en la ventana del
    equipo y en las demás listas (extras, reservas del día, recepción,
    buscadores, informe, estadísticas). `revisarPlayStation()` avisa de un
    texto cortado.
  - **Editar o borrar una reserva de un día cerrado** muestra la lista de lo
    que cambia y una casilla, en vez de pedir un motivo escrito
    (`cambiosDeLaReserva()`, `PieCorreccion` con `modo`). El teléfono y el
    correo se nombran sin su valor. La bitácora dice *cambios: …*.
  - **El formulario de una reserva no estaba en la prueba de ventanas** (la
    escena abría *Editar actividades*). Medido, el más largo daba 760px; en
    el computador ahora mide 589.

### PR #293, mergeado el 22-11-2026 (*con prueba*): el importador del CRM y del sitio viejo

Lo pidió el cliente el 21-11-2026 (*"una importación lo más completa posible
para que los chicos no tienen que hacer muchas cosas de forma manual.
Controlarlo, claro"*; *"si hay una cotización ganada en el CRM, entonces se
puede guardar como ganada"*), y después mandó el export de pedidos de Shopify
preguntando si servía para preparar la producción.

- **`lib/importar.ts`** (pura, con pruebas): arma el plan desde tres pestañas
  de la planilla —`Importar clientes`, `Importar cotizaciones` e `Importar
  reservas`— contra lo que ya hay en el panel.
- **`/api/mantencion/importar`**: `GET` es la vista previa (sin datos de
  clientes), `PUT` sube el Excel y `POST` importa, solo con `mantencion` y
  con la casilla marcada.
- **El Excel se sube desde el mismo formulario** (lo pidió el cliente al
  ensayarlo: mandarlo a Google Sheets lo dejó frente a un *pide acceso*):
  `lib/xlsx.ts` lee el `.xlsx` en el navegador, sin librería, y el panel
  copia sus hojas a las tres pestañas.
- **`ImportarCRM.tsx`**, en Configuración → Mantención, y **`CualBase`**, la
  pastilla de cuál planilla es, que pasó a ser una pieza.
- **En `datos.ts`**: `agregarImportados()`, `agregarReservas()`,
  `abrirDiasSiHaceFalta()` y `ganarImportadas()`, todas en lote.
- **En `sheets.ts`**: una tanda que pregunta por varias pestañas que no
  existen mira el libro una sola vez.
- **`DE_PASO`** en `lib/produccion.ts`: las tres pestañas no se vacían ni se
  conservan con la base en cero.
- **El panel de ejemplo** trae las tres pestañas con gente inventada, y hay
  una escena nueva en `npm run ventanas` (son 45).
- **Ninguna columna nueva, ningún permiso cambió.** La vista previa cuesta
  una tanda de lecturas (dos si faltan pestañas).

**Lo que salió de mirar los dos archivos del cliente**, que no es código:

- **El export de Shopify venía incompleto**: 50 pedidos seguidos, que es una
  página. Hay que exportar *todos los pedidos* para no dejar afuera a quien
  compró antes para una fecha futura.
- **Las compras de prueba en la tienda real seguían vivas** en ese export:
  hay que devolverlas o cancelarlas antes de la base en cero.
- **El sitio viejo tenía bloqueado el domingo 22-11** y vendía tres días que
  no son fin de semana (4, 8 y 11 de diciembre): ver el pendiente 1.
- **Dos de las tres ganadas a futuro del CRM no calzan con su propia
  cotización** (la fecha en una, la gente en la otra): quedaron como borrador
  en el Excel hasta que el cliente diga cuál vale. Lo va a ver con los
  vendedores; está anotado en la guía *Traspaso a producción*, en *Lo que
  falta*, junto con cerrar el domingo 22, abrir los tres días de diciembre y
  ver el anticipo de las ganadas importadas.
- **Las compras de prueba vivas: el cliente dijo que se ignoran** (21-11-2026).
- **Para que cada vendedor del CRM quede dueño de lo suyo, tiene que existir
  una cuenta del panel con su nombre** (o su primer nombre, si es de una sola
  cuenta): si no, sale *sin cuenta* en la vista previa. Los nombres se los
  di al cliente por el chat.

### PR #289, mergeado el 21-11-2026: una cotización ganada en un día cerrado, y el encabezado del día

Era lo que quedaba sin dónde confirmarse. Se le preguntó al cliente: *"Sí,
también debería poder corregirse."*

- **Guardar una ganada cuyo día está cerrado** —o que se mueve a uno
  cerrado— abre la lista de lo que cambió, con su casilla y *Guardar
  corrección* (`PieCorreccion`, la misma pieza). Antes el servidor la
  rechazaba y la ventana no tenía dónde confirmar.
- **`cambiosDeLaCotizacion()`** en `lib/correccion.ts`, con pruebas: el día,
  los invitados, cada producto y el total van con su valor; las notas, el
  contrato y los datos de facturación se nombran sin su valor.
- **En un día cerrado se sigue de paso sin guardar** y se confirma una sola
  vez.
- `/api/presupuestos` manda los días cerrados y si la cuenta puede corregir.
  **Ninguna lectura de Google más, ningún permiso cambió, ninguna columna
  nueva.** La bitácora dice *cambios: …*.
- Toca `lib/correccion.ts`, `lib/prueba.ts`, `lib/ayudas.ts`,
  `api/presupuestos/route.ts`, `CotizacionDialogo.tsx` y
  `pruebas/ventanas.mjs` (escena `v-cotizar-ganada-dia-cerrado`; son 44).
- **En el mismo PR, el encabezado del día en una línea** (lo pidió el
  cliente con una foto: *"todo puedes dejarlo en una línea, solo tienes que
  achicar todo un poco"*). En el computador, el título y los azulejos son un
  poco más chicos, y las dos filas de azulejos **se angostan antes de
  bajar**: se dobla una nota en vez de mandar una fila abajo. `Azulejo` pasó
  a ser una pieza (`components/Azulejo.tsx`). El celular mide lo mismo. Y el
  ancho que sobra **se reparte entre los azulejos**, que llegan al borde
  derecho y miden el mismo alto (*"más equitativo"*).
  Detalle en `panel/CLAUDE.md`, "El encabezado del día, en una línea".
- **La guía *Traspaso a producción* quedó al día** (21-11-2026, lo pidió el
  cliente): marcado lo hecho el 20 y 21, y los pasos del domingo reordenados
  sin lo que se adelantó. Es un documento fuera del repo.
- **Las variables del panel son 18**, no 17: se sumaron `SHOPIFY_CLIENT_ID`
  y `SHOPIFY_CLIENT_SECRET` con la tienda real y la cuenta no se había
  corregido.

---

## 5. Decisiones tomadas y por qué

Cada una tiene su sección con fecha en `CLAUDE.md` o `panel/CLAUDE.md`.

**Del sistema**

- **Shopify cobra, el panel agenda.** Se descartaron **Cowlendar y toda app
  de reservas** (13-10-2026): ninguna se integra por API al 100% con el
  diseño del sitio, y un widget de terceros rompe la identidad visual y la
  regla de cero JS. La pregunta *"¿y si instalamos una app?"* está contestada
  mientras el requisito sea integración por API.
- **El Apps Script se jubiló** (21-10-2026) por el panel en Next.js: los Web
  Apps no dan cabeceras (imposible verificar el HMAC de Shopify), una
  pestaña de Sheets no tiene botones y sus diálogos fallaban.
- **Webhook + reconciliación diaria**, las dos: más robusto que cualquiera
  sola.
- **Google Sheets como base**, porque es la planilla del cliente, legible
  por una persona. **Una planilla por empresa** (Calicanto tendrá la suya) en
  vez de una columna *empresa* en todo: así no se pueden mezclar el cupo ni
  las reservas de dos recintos.
- **Las cotizaciones en el panel**, no en el CRM del socio (10-11-2026): el
  CRM tenía errores de lógica y otra base de datos. La conexión está
  apagada; el código queda.
- **Dos tiendas, la real solo en la dirección real** (20-11-2026): una
  versión de prueba nunca puede cobrar. Olvidarse de algo cae en la de
  prueba.
- **Repo público** (19-11-2026) entre tres opciones: privado costaba la
  protección de `main` o GitHub Team, cambiar el autor de los commits para
  Vercel y apagar GitHub Pages.
- **`main` protegida sin chequeos obligatorios**: con Vercel obligatorio, un
  Vercel desconectado bloquea todos los merges.
- **El sitio publica una lista de lo público** (`publicar_sitio.sh` →
  `.vercel/output`), no una de lo privado: lo que no está en la lista no
  sale. El `.vercelignore` se descartó porque Vercel lo aplica también al
  panel.
- **Sin www**, al revés de lo que propone Vercel, porque así están los
  `hreflang` y las redirecciones.
- **Los pedidos del sitio viejo para fechas futuras se anotan a mano**
  (21-11-2026); no se le enseña al panel a leer el modelo viejo (una
  variante por fecha). Ese mismo día quedó cómo anotarlos de una vez, desde
  el export de pedidos, con *Importar del CRM*.
- **El importador arma su plan desde pestañas de la planilla** (21-11-2026):
  lo que va a entrar queda a la vista, y la etapa de cada fila está escrita
  en una columna que el cliente puede cambiar antes de importar.
- **El Excel se sube desde el formulario, no en Google Sheets**
  (21-11-2026): quien importa no siempre está con la cuenta de Google de la
  planilla. El panel lo lee sin librería —un `.xlsx` es un zip con XML y el
  navegador ya descomprime— y lo copia a esas pestañas, todo como texto.
- **Una ganada del CRM entra ganada, con su reserva** (21-11-2026, lo decidió
  el cliente), aunque deje el día sobre su cupo: se avisa antes y el panel lo
  muestra como sobrecupo. Entra **por pagar**, porque el CRM no enlaza los
  pagos con cada cliente.
- **Nada se importa como *Enviada***: correría la vigencia y contaría gente
  posible por un link que el cliente nunca vio.
- **Un producto del CRM calza con el del catálogo aunque se llame un poco
  distinto** (21-11-2026, lo pidió el cliente: *"estos productos existen,
  solo tienen un poco otro nombre"*): un nombre dentro del otro, o el único
  producto de tipo Arriendo. Solo si calza uno, y la vista previa dice cuál
  eligió. El Excel lleva los nombres del CRM y el panel los resuelve.
- **Una ganada importada se escribe primero como borrador y se gana al
  final**: si se corta, *Marcar ganada* la termina sin duplicar la reserva.
- **Las reservas importadas como pagadas le llegan a pagos sin revisar**,
  aunque importe alguien con `pagar`: importar en lote no es mirar cada pago.

**Del sitio**

- **Cero JavaScript para interfaz**, con cuatro excepciones decididas que no
  sientan precedente: `reserva.js`, `idioma.js`, `tema.js` y `cotizador.js`
  (el cotizador de promociones, 2026-11-23). Menú,
  tarjetas que giran, carruseles y selector de idiomas son CSS o
  `<details>`.
- **Tres idiomas generados por `traducir.py`** en vez de duplicar a mano
  (tres ediciones por cambio) o un selector en JS (rompe la regla y Google
  indexa solo el español).
- **`?v=` con el hash del archivo** en cada asset: arregla el error del
  14-10-2026 en que un `reserva.js` viejo en caché dejaba el calendario
  vacío sin un error en consola.
- **Un solo lugar para los precios**, `precios.json`, con una guarda que se
  niega a generar si encuentra un precio escrito a mano.
- **Sugerir idioma, no redirigir** (Google lo desaconseja y atrapa).
- **La vista diurna abre** (19-11-2026, antes de publicar el dominio, que era
  el momento barato); la noche queda a un toque.
- **Los adultos van todos al mismo menú** (02-11-2026), garantizado por la
  forma del formulario: no hay un segundo contador.
- **Paneles plegables `<details>`** en los landings en vez de una ventana a
  pantalla completa (sin JS no hay Escape, foco ni botón Atrás).
- **Los formularios de novedades se sacaron** (21-11-2026): descartaban el
  correo y quien lo dejaba creía que quedó anotado.

**Del panel**

- **Quien paga tiene preferencia** (12-11-2026): una reserva sin pagar
  queda sujeta a espacio; antes, reservas sin un peso podían dejar a quien
  paga con "no hay cupo".
- **Lo cotizado nunca ocupa cupo**: es una tercera categoría (*todavía no se
  sabe*), en su propio color (rosado), y lo apaga tener reserva, no la
  palabra *Aceptado*.
- **El precio de una cotización se propone, no se impone**, y al ganar pasa
  el negociado.
- **PDF con `window.print()`** en vez de una librería en el servidor
  (megas, fuentes, triple trabajo), y el link sigue vivo.
- **Comprobantes en Google Drive**, no Vercel Blob, porque el dominio del
  correo es Google Workspace.
- **El contrato se firma en papel y se sube el firmado**: que esté subido es
  lo que dice *firmado*.
- **Comisión modelo A**, elegido entre tres: etapas + bono premium + monto
  por evento.
- **La propina en partes iguales**, guardando lo repartido.
- **La tasa de retención en el código**, como el IVA: la fija la ley, no el
  cliente.
- **El ajuste fuera de turno en su propia pestaña**, no en `Turnos`: un turno
  inventado le habría quitado propina a los que vinieron.
- **Autoguardado por defecto**, y se confirma a mano solo una lista cerrada
  de casos (sección 9).
- **Las piezas compartidas** (`TarjetaLista`, `LineaDelDia`, `Pastilla`,
  `FechaDia`, `CajaBoleta`, `Azulejo`…) en vez de copias: un cambio llega solo a todas
  partes.
- **Los extras guardan varios ajustes en las mismas dos columnas** de
  siempre, con el formato de `Turnos`: ninguna columna nueva.
- **El aviso *Hay N turnos sin cerrar* se sacó** (21-11-2026): lo dicen el
  filtro *Sin marcar* y cada tarjeta.
- **Lo que explica va en su `?`** (21-11-2026): el equipo se capacita y el
  texto constante molesta.
- **El computador se compacta quitando aire, no achicando** (21-11-2026):
  solo desde 1024px, lo que cabe en una fila no se apila y se baja la
  separación; los botones no bajan de 36px (44 lo que se usa seguido) ni la
  letra de 13, y el celular tiene que medir lo mismo. En dos capas.
- **El zoom de los calendarios es con las tarjetas, no con la letra**
  (21-11-2026): cinco por fila y los números grandes a 22px. Seis por fila
  no cupieron: los botones del pie, con su ícono, piden más ancho.
- **Los nombres de los campos, en una columna de ancho fijo**
  (21-11-2026), en vez de que cada uno mida lo que su palabra: así los
  valores y los botones quedan alineados sin calcular nada.
- **Una regla que se puede medir es una prueba** (21-11-2026): *cabe en una
  pantalla* y *los campos van alineados* estaban escritas y dependían de
  acordarse; el cliente tuvo que marcar las ventanas una por una. Ahora las
  mide `npm run ventanas`, dentro de `npm run revisar`, y lo que todavía no
  cabe está anotado con su alto (`NO_CABEN`) y solo puede bajar.
- **Las ventanas se compactan en columnas y plegando lo que se llena una
  vez**, no con una barra de desplazamiento adentro: lo que no se ve en una
  lista con scroll propio se pierde. Si una lista crece más que la pantalla
  (las líneas de una cotización, la gente de un día), crece la ventana.
- **Lo plegado en el computador es una clase, no otro flujo**: en el celular
  los mismos campos siguen a la vista, así que ahí no cambió nada.
- **Los puestos del equipo se reparten en columnas con una cuenta fija**
  (`enColumnas()`), no con columnas que se balancean solas: al abrir una
  línea nada salta de lugar.
- **La corrección de un día cerrado guarda lo que cambió, no por qué**: cada
  cambio ya trae su porqué (un ajuste lleva su motivo). El servidor sigue
  rechazando una corrección sin ese texto.
- **Una cotización ganada de un día cerrado se confirma una sola vez, al
  guardar** (21-11-2026), no al pasar de un paso a otro: así la lista sale
  completa —los invitados junto con los menús— y queda una sola entrada en
  la bitácora. Sus renglones no repiten *"Cotización de …"*: la ventana ya
  dice de quién es.
- **El `?` chico se ve de 24px y se aprieta en 36**: a 30px agrandaba su
  renglón y corría el campo de al lado.
- **El marco de afuera es el más marcado** (21-11-2026): el del puesto nació
  más claro que las tarjetas de las personas y se leía al revés. Tres
  escalones: el grupo 3px oscuro, la tarjeta de adentro 2px, botones y
  campos 2px claros.
- **Un ancho fijo en una columna alineada a la derecha no corta lo que no
  cabe: lo saca por el otro lado**, encima del vecino. Donde va un monto, va
  un mínimo (la columna del total del Informe).
- **Un aviso no se dibuja como botón**: *falta su cuenta* es una pastilla
  fina, una sola pieza para las cuatro pantallas que la muestran.
- **Un nombre se dobla, no se corta** (21-11-2026): *Matías P…* no dice quién
  es. La fila crece un renglón y los botones no se mueven.
- **La lista de cambios de una reserva no lleva el teléfono ni el correo**,
  solo que cambiaron: queda en la bitácora, y el contacto se recorta por rol.
- **Una escena de la prueba tiene que apretar el botón que dice, no el
  primero que se le parece**: dos escenas de `ventanas` midieron por semanas
  otra cosa (*nada*, y la ventana de los extras). Si una escena deja de medir
  lo suyo, ahora falla o se nota en su medida.
- **El encargado de turno no ve cotizaciones; el vendedor ve todo y toca lo
  suyo; el contacto de los clientes se recorta por rol en el servidor**
  (`lib/privacidad.ts`).
- **El vendedor ofrece igual o menos que Configuración, nunca más**
  (23-11-2026, lo decidió el cliente: *"aplica regla A tal cual, pero deja la
  opción de solicitar otro monto"*): lo más generoso se pide y lo aprueban la
  gerencia, pagos o el administrador. Al editar, solo pasa por el tope lo que
  cambia: lo que el cliente ya vio no cambia solo.
- **El contrato se lee con la fecha de la firma, o la de hoy** (23-11-2026): no
  ofrece lo que ya no se alcanza a usar.
- **Avisar, pedir o dejar libre** (23-11-2026, lo decidió el cliente caso por
  caso): lo que puede costar plata sin que nadie lo vea se pide (los mínimos,
  la segunda renovación); lo que conviene vender igual se avisa (el horario
  extra, *sin documento*) o le llega a pagos para que lo mire (los acuerdos);
  el precio de cada producto sigue libre.
- **Esperando respuesta y la agenda son una sola lista** (23-11-2026, lo
  decidió el cliente): los dos responden *¿a quién tengo que hablarle hoy?*.
  El día que elige el vendedor manda; si no eligió, el recordatorio de
  siempre. **Las notas se anotan, no se autoguardan**: una nota es algo que
  pasó. **Las lee solo su vendedor y la gerencia** (y el administrador).
- **El arriendo mínimo cubre lo que cuesta el evento, no el costo fijo del
  día** (23-11-2026, lo decidió el cliente: *"queremos ser un poco más
  agresivos"*): tres filtros y dos tramos por caso en vez de la tabla del
  documento; el costo fijo se paga con volumen. La temporada alta se maneja
  subiendo los números en Configuración, sin lógica propia.

---

## 6. Problemas conocidos y lo que no hay que romper

### Sin resolver o asumido

- **Se puede sobrevender por un margen chico**: entre que alguien llega al
  checkout y paga, otro puede tomar los últimos lugares.
- **El panel no manda correos** (la confirmación es de Shopify) **ni
  cancela en Shopify**: una reserva soltada deja el pedido vivo allá, a
  cancelar a mano (la app no tiene permiso de escritura).
- **El idioma del checkout lo fija la tienda** y cambió dos veces en un día
  sin aviso: un visitante en inglés paga en español. Tres idiomas de verdad
  sería Shopify Markets.
- **Los pedidos del sitio viejo** con fecha posterior al lanzamiento **no
  descuentan cupo** hasta que alguien los anote a mano o los importe.
- **Una ganada importada no tiene preferencia hasta que se anote su
  anticipo**: entra por pagar, así que el sitio sigue ofreciendo ese día a
  quien paga ahora. La ventana lo avisa antes y después de importar.
- **Un día creado por la importación nace privado**, como al anotar a mano:
  el sitio no lo ofrece, y la regla diaria no lo toca porque ya tiene fila.
  Si se quiere seguir vendiendo, se pasa a público desde el calendario.
- **El importador no trae cobros, ni marca días exclusivos, ni trae lo de
  Calicanto u otros lugares.**
- **Límite de 60 lecturas por minuto** de Google para todo el panel; si
  vuelve a aparecer con uso normal, lo siguiente es pedir más cupo en Google
  Cloud (gratis). Cuándo dejar la planilla por una base de datos: pendiente
  16 (sección 7).
- **Los `?` chicos se ven de 24px** y se aprietan en 36 (un área invisible
  alrededor): `revisarPlayStation()` los sigue listando, porque mide lo que
  se ve. **(Por confirmar)** si el cliente los quiere más grandes a la vista.
- **Dos ventanas no caben en 1280×650** y están anotadas en `NO_CABEN`: el
  equipo del día con el formulario de un ajuste abierto, y su cara de
  reservas. Las dos crecen con lo que tenga el día; con más gente o más
  puestos que el ejemplo, la de trabajadores también pasa de una pantalla.
- **Cambiar el nombre de un cliente desde su ficha** reescribe sus reservas
  ganadas sin pasar por la guarda del día cerrado. Ya era así. **(Por
  confirmar)** si importa: es solo el nombre y el contacto.
- **La casilla + lista para la reserva de un día cerrado** salió de una
  respuesta dictada (*"¿las listas? Sí…"*) que se leyó como un sí. Se le
  dijo así al cliente, con las capturas, y después dijo *"mergea"*. Si al
  usarla no era lo que quería, se revierte el commit `907619a` en un PR
  aparte: los nombres doblados no dependen de él.
- **Varias piezas se dibujan dos veces en el HTML** (una para el celular y
  otra para el computador): en una prueba se pide la que se ve
  (`button:visible`, `locator('visible=true')`).
- **Queda letra bajo 13px heredada** en algunos archivos, anotada en `HABIA`
  de `pruebas/letra-chica.mjs`: solo puede bajar.
- **Las traducciones al inglés y portugués no las revisó un hablante
  nativo.**
- **El recargo de *Solo reserva* del menú de pequeños es $3.000**, no
  $5.000 como los otros: lo fija la tienda. **(Por confirmar)** si fue a
  propósito.
- **Supuesto sin confirmar**: que el mínimo de 25 personas no rige para la
  venta directa del sitio.
- ~~**El nombre del negocio no calza**~~: **resuelto el 22-11-2026**, la
  ficha de Maps pasa a *Brasas de Lo Pirque*, como el sitio. Horario para
  Google: sábados y domingos de 13:00 a 19:00.
- **La tarea diaria del CRM sigue programada** con la conexión apagada:
  retira lo publicado y no hace nada más (según `panel/CLAUDE.md`).
- **Desde el entorno de Claude Code no se abren** `brasas-sitio.vercel.app`,
  `panel.` ni `tienda.`, y Drive no deja bajar fotos. Se agregan en *Allowed
  domains* del entorno si hace falta. **La Storefront API de la tienda real
  (`lo-pirque.myshopify.com`) sí responde desde acá** (comprobado el
  21-11-2026 con `migracion-team/verificar.sh`, que desde ese día prueba las
  dos tiendas).

### Lo que no hay que romper

- **Nada en la raíz del repo que configure Vercel** (`.vercelignore`,
  `vercel.json`): lo leen los dos proyectos. Así se cayó el panel 40
  minutos.
- **Después de mergear algo que toque cómo se despliega**, comprobar en
  producción: `/login` 200, `/api/publico/fechas` 200 y el webhook sin firma
  401 (`migracion-team/verificar.sh`). Si el panel no responde, se revierte
  primero y se investiga después. **Un chequeo verde de Vercel solo dice que
  construyó.**
- **El contrato del sitio con el panel**: `{fecha, quedan, pocos,
  quedanPagando, error}`. Cada campo nuevo es uno que cualquier backend
  futuro tendrá que imitar.
- **`_booking_date` (y `_cowlendar_date`) en cada línea del carrito**: es la
  única forma en que la fecha llega al pedido.
- **`tiendaDeEstaPagina()` y `CONFIG.direccionesReales`**: la tienda real
  solo en el dominio, `www` y `brasas-sitio.vercel.app`.
- **La firma del webhook**, y descartar sin fecha **antes** de leer la
  planilla.
- **Fechas como texto**, columnas por nombre y las nuevas al final.
- **`ID Orden`** es la llave de los pedidos; `MANUAL-…` las de a mano.
- **Una reserva que nace de una cotización no se edita ni se borra a mano.**
- **`en/` y `pt/` no se editan**: se corre `python3 tools/traducir.py` después
  de tocar el HTML, el CSS, el JS o `precios.json`, y se commitean las tres
  versiones juntas. Si cambia el dossier o un precio de empresa, también
  `node tools/dossier_pdf.mjs`. `--revisar` delata lo que quedó viejo.
- **Un precio cambia en `precios.json` y también en Shopify**: los menús se
  cobran con el precio de la tienda.
- **El nombre de un menú tiene que ser idéntico en `Menús` y en Shopify**
  (`canonizar()` perdona mayúsculas, tildes y espacios).
- **No cachear lecturas entre peticiones**: en Vercel cada ruta corre aparte
  y se leen datos viejos.
- **Los hooks de React van arriba, antes de cualquier `return`**, y **no se
  declara un componente dentro de otro** (se pierde el foco al escribir).
- **Una pestaña que se reescribe entera borra lo que sobra.**
- **Los permisos y el recorte de datos los hace el servidor**; la pantalla
  solo deja de dibujar.
- **Las claves**: nunca en el chat ni en el repo; van directo a la bóveda y a
  Vercel. **No apretar *Rotar*** en las credenciales de la app de Shopify ni
  ***Crear secreto nuevo*** en los webhooks. **No tocar la app *Sitio
  Brasas*.** No desinstalar ni reinstalar apps sin avisar. El token de
  Storefront es público; uno de Admin (`shpat_…`) jamás va en el sitio.
- **No se ponen datos personales** del cliente ni de sus clientes en el repo
  ni en pedidos a servicios externos. El Excel del CRM se sube al chat,
  nunca al repo.

---

## 7. Pendientes, en orden

| # | Qué | Siguiente paso concreto | Quién |
|---|---|---|---|
| 1 | ~~La base en cero, en producción~~ | **Hecha el 22-11-2026**, con el importe después. Quedan de su lista: abrir a mano el vie 4, mar 8 y vie 11 de diciembre si se van a seguir vendiendo, y anotar el anticipo de la ganada importada. Lo de abajo queda como referencia. El ensayo en la versión de prueba (planilla "Pruebas") salió bien el 21-11-2026 y el PR #291 está mergeado. **Antes de apretar el botón en producción**: (a) en Shopify, devolver las compras de prueba pagadas y cancelar las de *solo reserva* —una que siga pagada o por pagar vuelve al día siguiente ocupando cupo; devuelta o cancelada ya no vuelve—; (b) confirmar que no hay nada real en lo que se borra (turnos, pagos, cotizaciones, días abiertos a mano); (c) copia de la planilla real. En la ventana tiene que decir *🔴 Producción* con el nombre de la planilla real, y **no** tiene que salir el aviso ámbar de Shopify (si sale, falta `SHOPIFY_DOMINIO`). Después: **cerrar o dejar privado el domingo 22-11** (el sitio viejo lo tenía bloqueado y la regla lo abre público), abrir a mano los días que el sitio viejo vendía y no son fin de semana (**vie 4, mar 8 y vie 11 de diciembre**), e importar (pendientes 7 y 10) | Cliente |
| 2 | **Lo que quedó de las ventanas** | (a) **Hecho**: editar y borrar una reserva de un día cerrado ya van con casilla y lista; está en producción desde el merge del PR #287. (b) Las dos de `NO_CABEN` (el ajuste abierto en la línea de una persona, y la cara de reservas): solo si el cliente las marca. (c) Cuentas entre 1024 y 1279px, con la columna del rol angosta. (d) Lo que siga marcando con fotos desde la versión de prueba. Detalle en `panel/CLAUDE.md`, "Las ventanas caben en la pantalla del computador" | Claude propone; cliente decide |
| 3 | ~~Compras de prueba en la tienda real~~ | **Hecho el 21-11-2026**, lo dijo el cliente: pasaron varias de pago y de solo reserva. Queda devolverlas o cancelarlas en Shopify antes de la base en cero (pendiente 1) | — |
| 4 | **`SHOPIFY_DOMINIO` de Production** | **(Por confirmar)** que diga `lo-pirque.myshopify.com`; si no, ponerlo y hacer Redeploy; comprobar con *Revisar Shopify ahora* | Cliente |
| 5 | **El link de estado de un pedido viejo** | Abrir uno `brasasdelopirque.cl/<id>/orders/…?key=…` después del lanzamiento y ver que llegue a `tienda.` con su `?key=` | Cliente |
| 6 | ~~Base en cero~~ | Pasó a ser el pendiente 1 | — |
| 7 | **Pedidos del sitio viejo** | **Exportar de Shopify *todos* los pedidos** (el export del 21-11 traía solo la última página, 50) y subirlo al chat: se rearma la pestaña `Importar reservas` y entran con el importador (pendiente 10). El producto viejo vendía hasta el 27-12 | Cliente sube; Claude arma |
| 8 | ~~Lanzamiento~~ | **Hecho el 22-11-2026, y confirmado por el cliente**: `www` redirige a la raíz, el *Hydrogen Redirect Theme* está publicado y *Menú Tradiciones* salió de Tienda online. Opcional: borrar los webhooks de la tienda de desarrollo (producción los rechaza con 401; no hacen daño). Los pasos, como referencia. En orden: (1) en Shopify, `tienda.` como dominio principal; (2) en Cloudflare, borrar el A de `@`, crear el CNAME a Vercel y cambiar `www`; (3) Vercel muestra *Valid Configuration*; (4) publicar el *Hydrogen Redirect Theme* con Hostname `brasasdelopirque.cl`, sin redirects ni cuentas (**recién después del DNS**); (5) comprobar: `tienda.` lleva al sitio nuevo, el link viejo del producto a reservas, una compra abre el checkout en `tienda.`, *ver pedido* abre; (6) sacar *Menú Tradiciones* de Tienda online; (7) borrar los webhooks de la tienda de desarrollo. **Vuelta atrás**: los registros a sus valores de antes y `brasasdelopirque.cl` de nuevo como principal | Cliente, con Claude |
| 9 | **Después del lanzamiento** | Links en Maps, Instagram y WhatsApp; enviar el sitemap en Google Search Console; productos en Fudo; mirar en Vercel → Logs que las tres tareas diarias corran en 200. **SEO** (22-11-2026): lo técnico del sitio está hecho (canonical, vista previa al compartir, datos del negocio para Google; ver `CLAUDE.md`, "Lo que el sitio le dice a Google"); lo que falta —Search Console, la ficha de Google Maps, medir visitas, las palabras clave y los enlaces— está paso a paso en el documento *Traspaso a producción*, sección *SEO* | Cliente |
| 10 | **Importar el CRM y los pedidos del sitio viejo** | El importador está en producción desde el 22-11-2026 (PR #293). **Importado en producción el 22-11-2026**, después de la base en cero. Queda: (a) el cliente decide las dos ganadas que no calzan (fecha y gente) y revisa la columna *Estado* del Excel; (b) y (c) hechos: lo ensayó y se mergeó; (d) en producción, **después de la base en cero**: *Ver qué entra* → sube el Excel, importa, y anota el anticipo de cada ganada en su cotización; (e) borra las tres pestañas `Importar …` de la planilla. **El Excel se sube con *⬆ Subir el Excel…* en la misma ventana**, sin abrir Google Sheets | Cliente, con Claude |
| 11 | **Política de privacidad y condiciones de reserva** | No existen; son del negocio y conviene que las vea un abogado. Anotado en la guía *Traspaso a producción* (documento fuera del repo) | Cliente |
| 12 | **Migración, pasos que quedan** | Pruebas a mano de punta a punta, respaldo de claves en la bóveda y apagar lo de la cuenta personal (`migracion-team/README.md`) | Cliente |
| 13 | **Decisiones abiertas** | Si un contrato firmado sin pago da preferencia (gerencia); el recargo de pequeños; el mínimo de 25 en venta directa; el desayuno y la once a $8.000 + IVA; **aclarar el tema del taller de queso** (lo pidió el cliente el 22-11-2026; hoy figura como actividad adicional en *Actividades* y en los tres landings de empresa); pintacaritas y castillo inflable en *Productos* (¿+ IVA o IVA incluido?). **Los precios, los mínimos y la condición especial de los cinco productos de promociones** (hoy de ejemplo, ver `CLAUDE.md`, "Seis promociones…"; **en pausa desde el 25-11-2026**: no se le recuerdan hasta que el cliente los traiga), y una foto de una charla para IA a las Brasas. Los dos últimos, también en la guía *Traspaso a producción* | Cliente |
| 14 | **En pausa por datos** | Video del hero (sigue vivo en el CDN de Shopify, 63 MB); logo en SVG recoloreable; fotos de cabalgatas y de la cancha de beach tenis; Calicanto y el contrato de matrimonio (Fase 5) | Cliente |
| 15 | ~~Ganar en un sábado que todavía no está en el calendario~~ | **Hecho el 23-11-2026** (el cliente: *"sí, cambia lo del sábado"*): nace público si la cotización no es exclusiva (`diaParaGanar()`). Las reservas a mano y lo importado siguen creándolo privado | — |
| 16 | **Cuándo pasar a una base de datos de verdad** (23-11-2026, lo preguntó el cliente) | **Hoy no hace falta.** Se cambia cuando pase **cualquiera** de estas: (a) errores del límite de lecturas de Google con uso normal, aun después de pedir más cupo (es gratis); (b) más o menos 10 a 15 personas usando el panel a la vez; (c) cambios que se pisan: algo guardado que se pierde, una reserva duplicada o un día sobrevendido; (d) algo que la planilla no puede hacer: apartar un cupo mientras alguien paga en Shopify, informes de varios años o que crucen las dos empresas. **Antes, lo barato**: pedir más cupo en Google Cloud y pasar la bitácora de cada año a otra planilla. **Se revisa con un número cuando Asados y Corderos esté en uso real**: las dos empresas usan la misma cuenta del panel y comparten el límite. **Cuando toque**: Postgres desde la pestaña *Storage* de Vercel (hoy es Neon, por el Marketplace): se cobra en la misma cuenta, conecta sus variables al panel solo y cada versión de prueba puede tener su copia de la base, como hoy la planilla "Pruebas". No Blob ni Edge Config: guardan archivos y configuración, no datos. Los precios se revisan ese día. Lo que se pierde es abrir la planilla: conviene dejar una copia diaria de solo lectura en Google Sheets. Es un proyecto propio, en un mes tranquilo; lo facilita que todo pasa por `lib/sheets.ts` | Cliente decide; Claude mide |
| 17 | **Encender *Traer los datos de producción a la prueba*** (24-11-2026) | En Vercel → `landing-pirque` → Settings → Environment Variables: agregar `GOOGLE_SHEET_ID_PRODUCCION` **solo en Preview**, con el id de *BBDD Produccion* (el mismo `GOOGLE_SHEET_ID` de Production: lo que va entre `/d/` y `/edit` en su link). Después, *Redeploy* de la versión de prueba y apretarlo en Configuración → Mantención. El valor no se pega en el chat | Cliente |

---

## 8. Convenciones del código

**Idioma**: todo en **español de Chile** —nombres, comentarios, commits,
PR, documentación—, con tuteo y sin voseo.

**Nombres**

| Qué | Cómo | Ejemplos |
|---|---|---|
| Funciones | verbo o sustantivo en español, camelCase | `leerReservas()`, `guardarLineas()`, `asegurarColumna()`, `pagoDe()`, `comisionDe()`, `esContratado()`, `puedeGanar()`, `tienePrioridad()` |
| Componentes | PascalCase, por lo que son | `BloqueSobrecupo`, `AvisoFijo`, `BotonGuardar`, `CalendarioEquipo`, `EquipoDialogo`, `ConfigEditor`, `TarjetaLista` |
| Constantes | MAYÚSCULAS | `HOJA_TURNOS`, `COL_RESERVAS`, `ESTADO_DIA`, `MOTIVOS_AJUSTE`, `MARCO_HOY` |
| Pestañas y columnas | constantes `HOJA_*` y objetos `COL_*`, nunca el texto suelto | `COL_TURNOS.ajuste` |

**Dónde va cada cosa**

- `src/lib/`: **lógica pura con pruebas** en `lib/prueba.ts` (`npm run
  prueba`). Las cuentas de plata, fechas, cupo, comisiones y boletas viven
  ahí, y la pantalla y el servidor usan **la misma función** (lo que se ve
  es lo que se guarda).
- `src/app/api/<área>/route.ts`: rutas delgadas. El patrón: leer la sesión
  → `puede(rol, 'permiso')` (si no, 403) → `conLecturas()` con la tanda de
  pestañas precargada → validar y **descartar los campos que el navegador no
  puede escribir** (token, `ID Reserva`, `Tipo Pago`, las marcas de pagos) →
  escribir → **bitácora**.
- `src/components/`: `'use client'`. Primero se busca la **pieza que ya
  existe** (tabla en `panel/CLAUDE.md`, "Coherencia").
- La planilla, solo por `lib/sheets.ts` (`leerHoja(hoja, fresco)`,
  `batchGet`, `conLecturas()`); para saber en qué fila escribir se lee
  fresco.

**Estilo**

- **Los comentarios dicen por qué**, con la fecha, la frase del cliente y la
  decisión en negrita (`**…**`), no qué hace la línea.
- **Plata en pesos enteros**, `Math.round`; el IVA sale de restar
  (`neto + iva === total` siempre); formato `'$' + n.toLocaleString('es-CL')`.
- **Tailwind con colores en variables CSS** (tema claro y oscuro):
  `bg-panel`, `text-hueso`, `text-oro`, `verde`, `rojo`, `ambar`, `cielo`,
  `rosa`, `morado`… Botones con `.boton`, `.boton-relleno`, `.tecla`
  (`globals.css`, capa de componentes); campos con `ENTRADA`.
- **Ayudas**: `AyudaCorta` con `tema` (texto en `AYUDAS_CORTAS` de
  `lib/ayudas.ts`) o con `titulo` + `children`; el `?` grande de cada
  pantalla en `AYUDAS`; las misiones en `lib/misiones.ts`.

**Cómo se prueba**

- `npm run revisar` en `panel/`: tipos, lógica, lecturas de Google, letra
  chica, comentarios, webhook, ajuste **y las ventanas**. **Antes de cada
  PR.** Tarda unos minutos más desde el 21-11-2026, porque levanta el panel
  de ejemplo.
- **`npm run ventanas`**: abre las 57 fichas y ventanas del panel de ejemplo
  a 1280×650 y falla si una no cabe o tiene un campo corrido. **Una ventana
  o una ficha nueva se agrega a `ESCENAS` de `pruebas/ventanas.mjs` en el
  mismo PR.** Con el panel de ejemplo ya andando, se corre directo y más
  rápido: `AYUDA_URL=http://localhost:3125 AYUDA_SESIONES=<carpeta>/sesiones.json
  node pruebas/ventanas.mjs [escenas]`. `VENTANAS_FOTOS=<carpeta>` deja una
  foto de cada una (es lo que se mira para reorganizar una ventana);
  `VENTANAS_ANCHO=393 VENTANAS_ALTO=740 VENTANAS_MEDIDAS=<archivo>` mide en
  el celular, para comparar antes y después; `VENTANAS_PLAYSTATION=1` lista
  lo de `revisarPlayStation()`.
- **El panel de ejemplo**, con una planilla en memoria:
  `AYUDA_TRABAJO=<carpeta> bash pruebas/ejemplo/capturas.sh --servidor` lo
  levanta en el puerto 3125 con las sesiones de cada rol en
  `<carpeta>/sesiones.json`. Copia el panel al arrancar: después de un
  cambio hay que reiniciarlo.
- **Playwright** a 393 y 1280 con `revisarPlayStation()` de
  `pruebas/playstation.mjs`, y **medir que una tarjeta abierta quepa en
  1280×650**.
- **Las fotos de la ayuda**: `bash pruebas/ejemplo/capturas.sh <escenas>`
  (con el servidor apagado). Si una escena no encuentra lo que busca, la
  ayuda quedó atrás. **Se sacan a 400px de ancho**: un cambio que rige solo
  desde 1024px (`lg:`) no las cambia.
- **En una sesión nueva en la nube**, `panel/node_modules` no existe: primero
  `npm ci` en `panel/`. Playwright es el del entorno, no el del panel: en un
  script propio se trae con `createRequire('/')('playwright')` y
  `NODE_PATH=$(npm root -g)`.
- **Antes de proponer un cambio de cómo se ve**, se puede probar en la copia
  que arma el panel de ejemplo (`<carpeta>/panel`), que no es el repo: sirve
  para mandar capturas de antes y después sin haber tocado nada.
- **Un cambio "solo del computador" se comprueba en el celular**: el largo
  de cada pantalla y de cada ventana a 393px tiene que salir igual que antes
  del cambio. Es la forma rápida de saber que ningún `lg:` se escapó. Para
  las ventanas: medir con `VENTANAS_ANCHO=393`, guardar los cambios con
  `git stash`, medir de nuevo y comparar los dos archivos.
- **El reloj del panel de ejemplo está fijo** (viernes 13-11-2026, 14:25 de
  Chile). Un script propio con Playwright tiene que fijar el del navegador
  igual (`ctx.clock.install`), o *hoy* no calza y React avisa en rojo.
- **El panel de ejemplo se apaga solo** si se lanza en segundo plano sin un
  tiempo largo. Las fotos de la ayuda se pueden sacar con el servidor de
  pruebas andando si van por otro puerto (`AYUDA_PUERTO=3126`).
- **El sitio**: `python3 -m http.server` y Playwright; `python3
  tools/traducir.py --revisar`.

**Git y PR**

- La rama la asigna cada sesión (`claude/…`). Se commitea y empuja a medida
  que se avanza, y **al terminar un lote se abre el PR en la misma pasada**.
- Commits en español: título *"Área: qué cambió"*, cuerpo con el porqué.
- **El PR dice qué cambió y por qué, qué conviene probar en la preview,
  cuántas lecturas de Google cuesta, si cambió algún permiso y qué ayuda se
  actualizó**, con capturas.
- **Abrir el PR va sin aviso; mergearlo a `main` es publicar en producción
  y espera el *"mergea"* del cliente** (22-11-2026), también lo chico.
- Si el PR de la rama ya se mergeó, lo nuevo va rebasado sobre `main` en un
  PR propio. Nunca commits nuevos sobre historia ya mergeada.
- **Varias sesiones, de distintos modelos, trabajan en paralelo en este mismo
  proyecto** (lo dijo el cliente el 23-11-2026: *"estoy trabajando en
  distintos modelos… otros chats también están mergeando"*). Por eso **este
  archivo se actualiza siempre, al terminar cada etapa**, y **antes de
  empezar y antes de pedir el *"mergea"* se hace `git fetch origin main`**:
  si `main` se movió, la rama se pone al día primero y se lee lo que dejó el
  otro chat. Una sesión que no deja su línea acá deja a la siguiente a ciegas.
- **Dos sesiones trabajan en paralelo desde el 22-11-2026**: una sigue con
  Lo Pirque y otra con la Fase 5 (Calicanto / Asados y Corderos, notas en
  `panel/FASE5.md`). Las dos en PR chicos desde el `main` del día. **Antes de
  pedir el *"mergea"*, se trae `main` y se resuelve ahí lo que choque**,
  sobre todo `TRASPASO.md`, `CLAUDE.md` y `lib/prueba.ts`, que son los que
  tocan las dos. Cada una deja escrito acá lo suyo al cerrar cada etapa: es
  por donde se enteran una de la otra.
- **Cada cambio deja escrito en `CLAUDE.md` o `panel/CLAUDE.md` qué cambió y
  por qué**, con fecha y la frase del cliente.

---

## 9. Las reglas

Están completas en el bloque *"Reglas fijas"* al inicio de `CLAUDE.md` y en
`panel/CLAUDE.md`. Cuando el cliente dice *"regla: …"*, se anota ahí en la
misma pasada.

### Siempre

- **Proponer antes de aplicar.** Sin preguntar: leer, buscar, medir con
  Playwright, capturas en una carpeta temporal. **Con confirmación**:
  editar, commits, push, PR, todo lo que toque GitHub. Al proponer, decir qué
  archivos toca y qué efecto tiene.
- **Una captura no es un sí** (25-11-2026): una foto o un *"¿qué pasó?"* se
  contesta con el diagnóstico y una propuesta —qué archivos, qué otras
  pantallas toca— y se espera el sí explícito antes de editar.
- **El link de prueba, siempre** (25-11-2026): cada cambio terminado va con el
  link de la versión de prueba y las capturas, salvo uno chico que el cliente ya
  mandó a mergear directo.
- **No inventar datos del negocio** (precios, horarios, capacidades,
  direcciones): si falta, se pide; mejor un hueco visible que algo plausible
  y falso.
- **Español de Chile, tuteo, sobrio.**
- **Mostrar sin preguntar**: todo cambio que se ve se manda con capturas
  —computador y celular, y el estado que importa— en la misma pasada. Pocas
  preguntas: solo lo que de verdad decide el cliente.
- **Nada se mergea a producción sin preguntar** (22-11-2026, reemplaza a
  los *dos caminos*): la versión de prueba va sin aviso —commit, push y PR—,
  y **mergear a `main` solo con un *"mergea"* del cliente**, también lo
  chico y también un arreglo urgente (se pregunta diciendo que es urgente).
  Antes de preguntar, `npm run revisar` y los dos chequeos de Vercel en
  verde; se le mandan las capturas y el link de la preview.
- **Coherencia**: el mismo tipo de dato con la misma pieza y el mismo peso
  en todas las pantallas; puede cambiar el tamaño, no el formato.
- **Un cambio de diseño se lleva a sus parecidos**: en el mismo PR si es la
  misma pieza, o se le pregunta al cliente nombrando las pantallas.
- **La ayuda siempre al día**: lo que cambia algo que una ayuda describe la
  actualiza en el mismo PR (texto, captura, puntos).

### Panel: lúdico, estilo PlayStation

- **Lo que se aprieta se ve que se aprieta**: botones de **36px o más**
  (**44px** lo que se usa seguido; **40px en el celular**), **letra de 13px o
  más** donde hay un dato, se distingue por forma y no solo por color, **un
  solo botón relleno por vista**, y tres tamaños: hito, acción y secundario.
- **Flujos simples**: pocos pasos, botones a la vista en vez de
  desplegables, una frase que dice qué pasa al seguir.
- **Una tarjeta abierta cabe en una pantalla**: se mide en 1280×650 (y,
  donde se pueda, 393×740). Si no cabe sin romper la regla de arriba, gana
  la de arriba y el PR dice cuánto mide. **Lo mide `npm run ventanas`**, y
  una ventana nueva se agrega a sus escenas en el mismo PR.
- **Lo que explica va en su `?`**, no fijo en la pantalla. A la vista, el
  dato y la acción; un texto que se lee una vez puede ser `AvisoFijo` (con
  ✕).
- **El marco de la tarjeta manda sobre lo de adentro** (21-11-2026): el
  borde de afuera es el más grueso y oscuro y su título va en negrita; lo de
  adentro —otra tarjeta, un botón, un campo— va con menos. Y un aviso no se
  dibuja como botón.
- **Un nombre se dobla, no se corta con "…"** (21-11-2026): en una lista, el
  nombre ocupa los renglones que necesite.
- **El espacio se usa bien** (22-11-2026): en el computador, lo que cabe en
  una fila no se apila. Lo mide `revisarEspacio()` dentro de `npm run
  ventanas`; una pantalla o vista nueva se agrega a `PANTALLAS`.
- **En una lista, el mismo dato va en la misma columna** (26-11-2026): una
  pastilla, un monto, un N° o un botón en la misma vertical en todas las
  filas; cada fila deja su lugar aunque esté vacío. Lo mide
  `revisarColumnas()` dentro de `npm run ventanas` (`data-columnas` /
  `data-columna`).
- **Los formularios van alineados** (21-11-2026): los nombres de los campos
  en una columna y los valores en otra, todos partiendo en la misma
  vertical; nunca un campo pegado a su nombre porque la palabra es más
  corta. Se mira con una captura antes de cerrar el cambio, y lo mide
  `revisarAlineacion()` dentro de `npm run ventanas`.
- **Elegir de una lista que crece se hace con buscador** (`BuscarEnLista`):
  el botón directo y otro que abre la lista. Nunca un botón por persona.
- **Autoguardado por defecto**, con *Guardando… / ✓ Guardado /
  Reintentar*. **Se confirma a mano solo** lo que mueve plata, toma o libera
  cupo, cierra o corrige un día, aprueba o rechaza, le llega al cliente,
  borra o saca a alguien, toca cuentas, roles o links, o renombra algo que
  otros usan (y la Configuración).
- **Las lecturas de Google son un presupuesto**: 60 por minuto para todo el
  panel. Nada nuevo lee por su cuenta: se suma a la tanda que la ruta
  precarga (`conLecturas()`), y el PR dice cuánto cuesta (`npm run lecturas`
  lo fija).
- **Los permisos los comprueba el servidor.**
- **La plata la cierra el encargado de pagos**: anotar y respaldar es de
  quien corresponde; **confirmar** (revisado, pagado, devuelto) es del
  permiso `pagar`, a su nombre. Sin frenar el trabajo de los demás. No se
  cambia un permiso de plata sin que el cliente lo diga.
- **Antes del PR**: `npm run revisar` (con las ventanas adentro),
  Playwright a 393 y 1280 con `revisarPlayStation()`, *¿cambió algo que una
  ayuda describe?* y, si se creó una ventana o una ficha, *¿está en
  `ESCENAS`?*

### Sitio y landings: elegante y sobrio

- Fotografía real como protagonista (solo fotos del negocio, sin stock),
  **Fraunces** y **Work Sans**, dorado sobre papel tibio de día y sobre negro
  de noche, **sin signos de exclamación ni superlativos**.
- **Fácil de leer, con jerarquía** (25-11-2026): aire entre párrafos, lo clave
  a la vista (rótulo chico dorado, texto en Work Sans, lo suelto en cursiva
  Fraunces, una línea fina entre grupos); sobrio pero notable.
- **Cero JavaScript para interfaz** (las cuatro excepciones no sientan
  precedente).
- **Lo que edita el cliente vive en un solo lugar**: los precios en
  `precios.json`, los textos en el español de la raíz.
- **El sitio público vende dos experiencias** (Tradiciones y A Brasas
  abiertas, IVA incluido); **los landings de empresa, tres** (Lo Pirque,
  Brasas, Sommelier, **+ IVA**).

---

## 10. Mantener este archivo

Al terminar cada etapa, se actualiza **este archivo**: el estado (sección
0), lo hecho (4), las decisiones nuevas (5), los problemas (6) y los
pendientes (7). Es el mapa: corto donde puede, y con el detalle en la
sección de `CLAUDE.md` o `panel/CLAUDE.md` a la que apunta.
