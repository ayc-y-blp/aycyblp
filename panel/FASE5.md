# Fase 5: el panel para más de una empresa

Las notas de trabajo de la ampliación del panel a **Calicanto / Asados y
Corderos**, la otra empresa de la misma gerencia. Viven acá, aparte de
`CLAUDE.md` y `TRASPASO.md`, a propósito: Lo Pirque se sigue desarrollando en
paralelo y esos dos archivos son donde más chocan dos trabajos a la vez. Se
tocan solo al cerrar cada etapa.

Lo pidió el cliente el 2026-11-22: cada empresa con su base de datos y su
configuración; la gerencia mirando las dos; vendedores que venden los dos
lugares con **una sola cuenta**; y poder seguir con Lo Pirque mientras tanto,
*"pero que no quede la cagada cuando lo queremos unificar"*.

## Cómo se trabaja: sin rama larga

- **No hay una rama de la Fase 5.** Cada paso es un PR chico que parte del
  `main` de ese día y se mergea **apagado**: la segunda empresa existe solo
  si está configurada, y en producción no se configura hasta que el cliente
  lo diga.
- **Lo Pirque no espera ni se entera**: sus cambios siguen por PR chico, como
  siempre.
- **Lo que protege a Lo Pirque**: `npm run revisar` en cada PR, y que con una
  sola empresa configurada el panel haga lo mismo y gaste las mismas lecturas
  de Google (`npm run lecturas`).
- **Cada PR de la Fase 5 va por el camino *con prueba***: toca la planilla,
  las cuentas o los permisos, aunque no se vea.
- **Encender Calicanto es una decisión aparte**, no un merge grande.

## La propuesta (por confirmar con el cliente)

- **Una dirección por empresa, una sola cuenta.** La dirección dice en qué
  mundo se está; quien tiene las dos pasa de una a la otra con un botón, sin
  volver a entrar. Quien trabaja en una sola no ve el botón.
- **Los datos no se mezclan**: una planilla por empresa, como ya estaba
  decidido (`panel/CLAUDE.md`, "La empresa es la planilla"). Cada una con su
  `Config`, sus Productos y sus módulos encendidos o apagados.
- **El mismo código para las dos.** Lo distinto es un módulo que se enciende
  por empresa, no una copia del código.
- **Las cuentas, en una sola lista compartida** (una planilla chica de
  Cuentas), no en las dos bases sincronizadas. Cada cuenta dice qué rol tiene
  en cada empresa: el rol dice *qué*, la casilla dice *dónde* ("Rol para lo
  que se hace, alcance para dónde").
- **Gerencia: *Las dos***, una tercera opción del selector, con un tablero
  para mirar y filtrar. Para editar se entra a una empresa.
- **Un vendedor de los dos lugares** elige el lugar al cotizar; *Mías* junta
  lo suyo; su trato de comisión es uno por empresa. Un cliente que cotiza en
  los dos tiene dos fichas, que la gerencia ve juntas por RUT o teléfono.
- **Una cuenta de servicio de Google por empresa**: el límite de 60 lecturas
  por minuto es por cuenta.

## Lo que Calicanto necesita distinto

Sale de mirar el respaldo del CRM del socio (que no está en el repo):

| Qué | Qué hay que agregar |
|---|---|
| Es sobre todo matrimonios | El contrato de matrimonio: dos contratantes, dos firmas, el menú como anexo |
| Invitados *adultos*, *niños* y *después de la comida* | Un tercer tipo de invitado, con su precio |
| Arriendo con precio según día y temporada | Una tabla de arriendo, no un precio |
| Bar, cóctel, bajón, coordinación, transporte | Solo catálogo: se cargan en Productos |
| Eventos a domicilio y en otros lugares | Eventos fuera del recinto: sin cupo del local, con transporte |
| El arriendo aparte, con su cuenta y su porcentaje de reserva | Dos cobros separados en una cotización |
| Seguimiento de contactos, recontactos y visita al lugar | Seguimiento de candidatos más fuerte |
| De dónde llegó cada contacto | Un campo de origen, para las estadísticas |
| Un simulador de costos y margen de un matrimonio | Costeo del evento: módulo nuevo |
| Caja y pagos solicitados, con aprobación | Módulo nuevo |

Sirve tal cual: clientes, la cotización en cinco pasos, cobros con
comprobante, comisiones, equipo, turnos, propinas, informe y boletas.

## Lo que el cliente decidió (2026-11-22)

1. **Cada empresa con su dirección**, y una sola cuenta: *"que el que solo
   tenga acceso al panel de Asados y Corderos, arriba en la URL también ve
   estoy en Asados y Corderos… los mundos viven independientes y con sus
   URLs"*. La gerencia y los vendedores de los dos lugares pasan de un mundo
   al otro sin volver a entrar. Reemplaza la propuesta de una sola dirección
   con selector.
2. **Calicanto es solo eventos: no lleva la tienda de Shopify.** Todo lo
   demás sirve igual, también la recepción (*"en un matrimonio… se ven todos
   los asistentes"*) y el calendario de Google.
3. **El arriendo de Calicanto y la relación comercial entre Calicanto y
   Asados y Corderos se ven después.** De partida, el arriendo va como una
   cuenta aparte, como en el contrato del CRM.
4. **El costeo entra en esta fase, como un simulador de evento** que se
   propone desde acá (*"crear un simulador, me tinca… piensa en la lógica
   primero, después se rellena"*): el cliente no usaba el del CRM. Va en los
   pasos finales, porque cuelga de una cotización.
5. **La caja queda para después** (*"el flujo de caja, no, esto lo integramos
   después. Ahí tenemos que hacer otro trabajo antes. Pero mantenlo en
   recordatorio"*). No es de esta fase.

## Lo que falta que el cliente decida

- La dirección del panel de Asados y Corderos / Calicanto (qué dominio).
- Quién ve los costos y el margen del simulador.
- Si la recepción de un matrimonio necesita la lista de invitados uno por
  uno: hoy muestra reservas, no personas.

## Los pasos

| # | Paso | Estado |
|---|---|---|
| 1 | **La empresa como una pieza** (`lib/empresa.ts`): todo lo que es de la empresa —planilla, cuenta de servicio, calendario, tienda, CRM— se pregunta en un solo lugar. Sin cambio de comportamiento | PR abierto el 2026-11-22 |
| 2 | Lo que el panel recuerda por instancia (pestañas, credencial, token de Shopify), guardado por empresa | Hecho el 2026-11-23, en el PR abierto del simulador (#313). Ver "Paso 2" |
| 3 | Las cuentas compartidas y el rol por empresa | Hecho el 2026-11-23, apagado. Ver "Pasos 3 y 4" |
| 4 | Una dirección por empresa y el paso de una a la otra | Hecho el 2026-11-23, apagado. Ver "Pasos 3 y 4" |
| 5 | Calicanto: su planilla, sus productos y sus módulos | — |
| 6 | El contrato de matrimonio | — |
| 7 | El tablero de la gerencia | — |
| 8 | El simulador de evento (costos y margen) | Primera parte en un PR abierto el 2026-11-23: dentro de la cotización. Falta el simulador suelto, la comisión, los extras contratados y el gasto real |

**Recordatorio, fuera de esta fase**: la caja (flujo de caja por empresa,
pendientes con vencimiento y pagos solicitados con aprobación). El cliente
la quiere, pero hay otro trabajo antes.

### Paso 1, en detalle

- `empresaActual()` devuelve la única empresa de hoy, armada con las mismas
  variables de entorno. Se lee en cada llamada, sin guardar nada.
- La usan `sheets.ts`, `admin.ts`, `google-calendar.ts`, `crm-escribir.ts` y
  las rutas del webhook, del CRM y de la base en cero.
- **Una prueba** (`npm run prueba`) falla si otro archivo lee por su cuenta
  una de esas variables (`VARIABLES_DE_LA_EMPRESA`).
- No son de la empresa, y siguen donde estaban: la sesión, el administrador
  de emergencia, `CRON_SECRET`, la planilla de comentarios y el entorno de
  Vercel.
- **Ninguna lectura de Google más, ningún permiso, ninguna columna, nada que
  se vea.**

### El simulador de evento, primera parte (2026-11-23)

El cliente aprobó la lógica (*"sí a los dos, dale con el simulador"*): los
números los ven la gerencia, pagos y el administrador, el vendedor ve solo la
señal, y sirve también para Lo Pirque.

- **`lib/simulador.ts`** (pura, con pruebas): lo cobrado sin IVA menos lo que
  se sirve (el `Costo` de cada producto por su cantidad), el equipo (la regla
  *uno cada N personas* de cada puesto por el promedio de la jornada de
  quienes lo tienen de puesto habitual) y los gastos del evento. Da el margen,
  la señal —conviene, justo, no conviene, faltan datos— y cuánto habría que
  cobrar para llegar al mínimo.
- **No inventa**: un producto sin costo o un puesto sin jornada se nombran y
  la señal queda en *faltan datos*. El arriendo del recinto propio va en cero
  sin pedirlo.
- **Columna nueva `Costo` en `Menús`**, al final. Se carga en *Productos*,
  dentro de *En una cotización*.
- **Dos claves nuevas en `Config`**: `margen_minimo` (parte en 0) y
  `gastos_evento` (texto: *Hielo: 15000; Transporte: 800 pp*). En
  Configuración → Cotizaciones.
- **Permiso nuevo `costos`**: gerencia, pagos y administrador. El costo no
  viaja a quien no lo tiene (`sinCostos()` en `/api/presupuestos`,
  `/api/reservas` y `/api/menus`), y esa cuenta no lo puede borrar al guardar
  productos.
- **`/api/simulador`** (`POST`, con `presupuestos`): no escribe nada. Una
  tanda de lecturas (Menús, Puestos, Trabajadores y Config). A quien no tiene
  `costos` le responde solo `{senal}`.
- **`SimularEvento.tsx`**: el botón *🧮 Simular* en el pie del paso de
  productos de la cotización, con *¿Y si vienen…?* (− y + de a diez).
- **Ventanas**: escena `v-simulador` (524px a 1280×650).

**En pausa desde el 2026-11-23** (lo decidió el cliente: *"dejémoslo el
simulador ahora corto en standby y mejor concentrarse en seguir con la fase
5… dos empresas, roles"*). Antes pidió mover el botón: *"ahí donde está, no
tiene nada que ver. Mejor que esté en la última fila y un poco más
visible"*. *🧮 Simular* va ahora en el pie del paso de productos, al lado de
*✕ Se cayó…* y del dorado, con borde dorado y del mismo alto; en el celular
comparte una fila con *Se cayó…*, mitad y mitad.

**Lo que falta del simulador**, para cuando se retome: usarlo suelto, antes de cotizar; restar la
comisión del vendedor y del socio; sumar los extras contratados (show,
pintacaritas) por su monto habitual; anotar el gasto real después del evento;
y un editor de los gastos del evento mejor que un renglón de texto.

## Paso 2: la memoria de cada instancia, por empresa (2026-11-23)

**No cambia nada de lo que el panel hace hoy**: sigue habiendo una sola
empresa. Deja listo que, cuando haya dos, lo recordado de una no salga como
respuesta de la otra.

- **`porEmpresa(crear)`** en `lib/empresa.ts`: la memoria de la empresa en
  curso. La llave es su id, su planilla y su cuenta de servicio.
- **`conEmpresa(empresa, fn)`**: fija la empresa de una petición; todo lo que
  pregunte `empresaActual()` adentro —también después de esperar— recibe
  ésa. **Hoy solo lo usan las pruebas**; el paso 4 (*una dirección por
  empresa*) lo va a llamar al entrar a cada ruta.
- **Qué pasó a ir por empresa**: en `sheets.ts`, el cliente, la credencial,
  la lista de pestañas con sus ids, el nombre del libro y las lecturas en
  vuelo con su tanda; en `drive.ts`, el cliente; en `datos.ts`, si la
  bitácora ya tiene encabezado; en `admin.ts`, el token de Shopify, uno por
  tienda y por app.
- **Lo que queda para el paso 7** (el tablero de la gerencia con *Las dos*):
  lo leído dentro de una petición (`conLecturas()`) se guarda por nombre de
  pestaña, pensando en una empresa por petición. Una petición que lea las dos
  planillas tiene que abrir un ámbito por empresa.
- **Pruebas** (`npm run prueba`, *Lo que el panel recuerda va por empresa*):
  dos peticiones cruzadas no se mezclan, cada empresa tiene su memoria, y
  alternar entre dos tiendas no cruza ni vuelve a pedir el token.
- **Lecturas de Google**: ninguna más. **Ningún permiso cambió.** Ninguna
  variable nueva en Vercel.

## Decidido el 2026-11-23

- **La dirección del panel de Asados y Corderos: `panel.asadosycorderos.cl`.**
  Es la que usa el paso 4 para saber de qué empresa es cada petición.
- **La recepción de un matrimonio: con la posibilidad de la lista de
  invitados uno por uno.** Opcional: un evento puede seguir con solo el
  total. Va con el paso 5 (los módulos de Calicanto).

## Pasos 3 y 4: una cuenta, un rol por empresa y una dirección cada una (2026-11-23)

Lo aprobó el cliente (*"sí, dale así"*). **Queda apagado**: mientras no
exista `AYC_GOOGLE_SHEET_ID`, el panel es el de siempre y nada nombra a la
otra empresa.

- **La dirección dice la empresa** (`lib/empresas.ts`, sin nada de Node: la
  usa también el middleware). `panel.asadosycorderos.cl` es de Asados y
  Corderos; **cualquier otra dirección es de Lo Pirque** —las versiones de
  prueba, la dirección de Vercel, un computador—. Las direcciones se pueden
  cambiar con `PANEL_HOSTS` y `AYC_PANEL_HOSTS` (separadas por coma).
- **Dónde se fija**: `conLecturas()` (`sheets.ts`), por donde pasa toda ruta
  de `/api`, con la cabecera `host`. Las cinco páginas que leen la planilla
  por su cuenta —bitácora, link del trabajador, planilla semanal, cotización
  y contrato— usan `enEmpresaDeLaPagina()` (`lib/empresaPagina.ts`). **Una
  ruta nueva tiene que ir envuelta en `conLecturas()`**, aunque no precargue
  nada: si no, lee la casa.
- **Asados y Corderos** (`empresaPorId()` en `empresa.ts`): su planilla, su
  calendario y, si se le da, su propia cuenta de servicio (con su propio
  cupo de 60 lecturas); sin ella usa la de la casa. **Sin tienda**: es solo
  eventos.
- **La lista de cuentas es una sola y vive en la planilla de Lo Pirque**
  (`leerCuentas()`). Una columna nueva al final de `Usuarios`, **`Rol Asados
  y Corderos`**, que aparece recién cuando alguien tiene rol ahí. En blanco
  o mal escrito: no entra.
- **`leerUsuarios()` es esa lista vista desde la empresa en curso**
  (`vistaDeEmpresa()`): en la otra empresa trae solo a quienes entran ahí,
  con el rol que tienen ahí. Así entrar, la lista de vendedores y *Cambiar
  vendedor* contestan por la empresa en que se está sin saber que hay dos.
  **Esa vista no se guarda nunca**: guardar va siempre con `leerCuentas()`.
- **La sesión es de una empresa** (`Sesion.empresa`) y vale solo en su
  dirección: lo miran el middleware y `quienEs()`. Una sesión de antes, sin
  ese dato, es de Lo Pirque: nadie tiene que volver a entrar.
- **Pasar de una a la otra sin escribir la clave**: `POST /api/sesion/pasar`
  vuelve a mirar el rol en la cuenta y arma **un pase** firmado de un
  minuto; `GET /api/sesion/pase`, en la otra dirección, lo canjea por una
  sesión. Un pase no abre ninguna otra ruta, y vale solo para la empresa que
  nombra. Mirando como otro rol no se pasa.
- **Lo que se ve**: en la barra, una pastilla con el nombre de la empresa y
  *⇄ Ir a …* para quien tiene las dos; en Cuentas, bajo el rol, *En Asados y
  Corderos* con *— No entra* o el rol.
- **Las cuentas se cambian solo desde el panel de Lo Pirque.** En el otro se
  ven, con su rol de ahí, y guardar responde 409. Es una simplificación a
  propósito: un solo lugar donde se dan permisos.
- **El administrador de emergencia** (`PANEL_USUARIO`) lo es en las dos. La
  clave compartida de encargado, solo en Lo Pirque.
- **La planilla de comentarios** se escribe siempre con la cuenta de la casa.
- **Lo recordado dentro de una petición** va con su empresa en la llave: se
  resolvió acá lo que el paso 2 dejaba para el paso 7.
- **Lecturas de Google**: entrar y pasar, una (`Usuarios`, de la casa). En
  la otra empresa, una ruta que precarga `Usuarios` la lee de la casa aparte
  de su tanda: una lectura más en `/api/presupuestos` y `/api/clientes`
  **allá**. En Lo Pirque, ninguna más.
- **Permisos**: ninguno nuevo. La cuenta gana un rol por empresa.
- **Probado en el panel de ejemplo con las dos empresas** (`localhost` la
  casa y `127.0.0.1` la otra, con el Google falso sirviendo una planilla por
  id): la sesión de una da 401 en la otra; el pase entrega la sesión con el
  rol de allá y no abre en la casa; quien no tiene rol allá recibe 403 al
  pasar; las cotizaciones de una no salen en la otra; guardar cuentas desde
  la otra da 409.

### Para encenderla (lo hace el cliente, no es código)

1. **La planilla**: copiar la de Lo Pirque (lo propuso el cliente: *"copiar
   la planilla de Lo Pirque, vaciarla y trabajar a base de ella"*). Es el
   mejor camino: **el panel espera que las pestañas existan** —con una
   planilla vacía, el calendario falla por `Fechas Hábiles`—. Después, en el
   panel de Asados y Corderos, *Dejar la base en cero*, y a mano lo que ese
   botón conserva y es de Lo Pirque: `Menús`, `Config`, `Puestos`,
   `Trabajadores`, `Colaboradores`, `Vendedores` y `Usuarios` (esa pestaña
   allá no se usa: las cuentas viven en la de Lo Pirque).
2. **Compartirla** con la cuenta de servicio del panel, como editor.
3. **En Vercel**, proyecto `landing-pirque`: `AYC_GOOGLE_SHEET_ID` (en
   Preview, una copia de pruebas) y, si se quiere, `AYC_GOOGLE_CALENDAR_ID`.
4. **El dominio**: `panel.asadosycorderos.cl` agregado al proyecto en Vercel
   y un CNAME `panel` en el DNS de `asadosycorderos.cl`, con nube gris si
   está en Cloudflare.
5. En Cuentas, darle a cada persona su rol *En Asados y Corderos*.

