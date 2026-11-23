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
| 2 | Lo que el panel recuerda por instancia (pestañas, credencial, token de Shopify), guardado por empresa | — |
| 3 | Las cuentas compartidas y el rol por empresa | — |
| 4 | Una dirección por empresa y el paso de una a la otra | — |
| 5 | Calicanto: su planilla, sus productos y sus módulos | — |
| 6 | El contrato de matrimonio | — |
| 7 | El tablero de la gerencia | — |
| 8 | El simulador de evento (costos y margen) | Lógica propuesta al cliente el 2026-11-23 |

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
