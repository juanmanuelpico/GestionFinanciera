# dashboard Specification

## Purpose
El Dashboard resume de un vistazo la información clave de cada módulo: ahorros actuales en
cada moneda habilitada, gastos fijos del mes en curso (pagados, pendientes, vencidos y a
vencer), deudas propias, deudas de terceros y la cotización del dólar de DolarApi. Cada
indicador que llega a cero se celebra con un mensaje verde de éxito, y solo se muestran las
secciones que el usuario eligió en Configuración.

## Requirements

### Requirement: Resumen del Dashboard por secciones habilitadas

El sistema DEBE (SHALL) exponer el endpoint autenticado `GET /dashboard/summary`, que calcula
el resumen solo con los datos del usuario autenticado y solo de las secciones que tiene
habilitadas. Cada sección deshabilitada se devuelve como `null` y NO DEBE (SHALL NOT)
consultarse en el backend.

#### Scenario: Todas las secciones habilitadas

- **WHEN** un usuario autenticado con las cinco secciones habilitadas pide el resumen
- **THEN** `sections` devuelve las habilitadas en el orden canónico `savings`,
  `fixedExpenses`, `myDebts`, `thirdPartyDebts`, `dollarQuotes`
- **THEN** cada bloque trae sus indicadores calculados con datos de ese usuario

#### Scenario: Secciones deshabilitadas no se calculan

- **WHEN** el usuario tiene habilitada solo `savings`
- **THEN** `fixedExpenses`, `myDebts`, `thirdPartyDebts` y `dollarQuotes` se devuelven como `null`
- **THEN** el backend no consulta deudas ni la API de cotizaciones para esa petición

#### Scenario: Petición sin autenticación

- **WHEN** una petición al resumen llega sin token válido
- **THEN** el backend la rechaza con 401 y no calcula ningún resumen

### Requirement: Ahorros por moneda habilitada

El Dashboard DEBE (SHALL) mostrar el total de los ahorros en estado `ACTIVO` por cada moneda
habilitada en la billetera del usuario, en tarjetas "Ahorros en Pesos", "Ahorros en Dólar" y
"Ahorros en Euro". Los ahorros inactivos NO DEBEN (SHALL NOT) sumarse y una moneda habilitada
sin saldo DEBE (SHALL) mostrarse en `0`.

#### Scenario: Importe por moneda

- **WHEN** el usuario tiene ahorros activos por 1500 ARS y las monedas ARS y USD habilitadas
- **THEN** la tarjeta "Ahorros en Pesos" muestra 1.500,00 en formato ARS
- **THEN** la tarjeta "Ahorros en Dólar" muestra 0 con el mensaje verde "Sin ahorros."

#### Scenario: Solo cuentan los ahorros activos

- **WHEN** un ahorro del usuario no está en estado `ACTIVO`
- **THEN** su importe no se suma al indicador de la moneda

#### Scenario: Sin ningún ahorro

- **WHEN** ninguna moneda habilitada tiene saldo mayor que cero
- **THEN** la sección muestra una sola tarjeta con el mensaje verde "Todavía no registraste ahorros."

### Requirement: Gastos fijos del mes en curso

El Dashboard DEBE (SHALL) mostrar la cantidad de gastos fijos del usuario que vencen en el
período del mes en curso (`YYYY-MM`), clasificada en Pagados, Pendientes, Vencidos y A vencer
(los pendientes con vencimiento entre hoy y 3 días después, ambos extremos inclusive).

#### Scenario: Clasificación de los gastos del mes

- **WHEN** en el mes hay un gasto pagado, uno pendiente vencido el día 1, uno pendiente que
  vence el día 9 y uno pendiente que vence el día 20 (hoy es 6)
- **THEN** los indicadores muestran Pagados 1, Pendientes 3, Vencidos 1 y A vencer 1

#### Scenario: Un pagado solo cuenta como pagado

- **WHEN** un gasto con pago registrado en el período tenía vencimiento anterior a hoy
- **THEN** se cuenta en Pagados y NO se cuenta en Vencidos

#### Scenario: Vence hoy no es vencido

- **WHEN** un gasto pendiente del mes vence hoy
- **THEN** no se cuenta en Vencidos
- **THEN** se cuenta en A vencer (3 días o menos)

#### Scenario: Gastos que no vencen en el mes

- **WHEN** un gasto fijo no vence en el período en curso según su primer vencimiento y su
  frecuencia
- **THEN** no se cuenta en ninguno de los cuatro indicadores

### Requirement: Resumen de deudas propias

El Dashboard DEBE (SHALL) mostrar, sobre las deudas propias (`PROPIA`) del usuario, las
personas a las que les debe, las personas con deuda activa, las deudas vencidas y las cuotas
vencidas. Una cuota está vencida cuando no tiene fecha de pago y su vencimiento es anterior a
hoy; los actores de tipo `TARJETA` NO DEBEN (SHALL NOT) contarse como personas.

#### Scenario: Indicadores con datos

- **WHEN** el usuario debe a una persona una deuda activa con una cuota impaga vencida el mes
  pasado
- **THEN** "Personas a las que les debés" muestra 1, "Personas con deuda activa" muestra 1,
  "Deudas vencidas" muestra 1 y "Cuotas vencidas" muestra 1

#### Scenario: Una persona cuenta una sola vez

- **WHEN** la misma persona figura en varias deudas propias activas
- **THEN** se cuenta una única vez en las personas
- **THEN** cada deuda y cada cuota se cuentan por separado

#### Scenario: Las tarjetas no son personas

- **WHEN** el usuario solo tiene deudas propias contra tarjetas de crédito
- **THEN** "Personas a las que les debés" muestra 0 con el mensaje verde "No le debés a nadie."
- **THEN** las cuotas vencidas de esas deudas igual se cuentan

#### Scenario: Cuota que vence hoy no está vencida

- **WHEN** una deuda propia activa solo tiene cuotas impagas con vencimiento hoy
- **THEN** no se cuenta como "Deudas vencidas" ni aporta a "Cuotas vencidas"

### Requirement: Resumen de deudas de terceros

El Dashboard DEBE (SHALL) mostrar, sobre las deudas de terceros (`TERCERO`) del usuario: las
personas distintas que le deben (aunque alguna deuda esté finalizada), las personas con al
menos una deuda activa con cuotas impagas vencidas, la cantidad de deudas activas y la
cantidad de cuotas impagas vencidas de esas deudas activas.

#### Scenario: Personas con vencimientos impagos

- **WHEN** una persona le debe al usuario en una deuda activa con dos cuotas impagas vencidas
- **THEN** cuenta 1 en "Personas con vencimientos impagos" y 2 en "Cuotas vencidas"

#### Scenario: Deuda finalizada no aporta cuotas

- **WHEN** una deuda de terceros está finalizada
- **THEN** la persona sigue contada en "Personas que te deben"
- **THEN** la deuda no se cuenta en "Deudas activas" ni sus cuotas en "Cuotas vencidas"

#### Scenario: Nadie debe

- **WHEN** no existe ninguna deuda de terceros con actor persona
- **THEN** "Personas que te deben" muestra 0 con el mensaje verde "Nadie te debe dinero."

### Requirement: Mensajes de éxito en verde cuando el indicador es cero

Todo indicador numérico del Dashboard que valga cero DEBE (SHALL) mostrar debajo del número un
mensaje en verde de éxito con el texto fijo asignado a ese indicador. Con valor mayor que cero
NO DEBE (SHALL NOT) mostrarse el mensaje.

#### Scenario: Catálogo de mensajes de los indicadores

- **WHEN** el indicador vale 0
- **THEN** "Pagados" muestra "Todavía no pagaste ninguno."
- **THEN** "Pendientes" muestra "Pagaste todos tus gastos fijos del mes."
- **THEN** "Vencidos" (gastos fijos) muestra "Ninguno vencido."
- **THEN** "A vencer (3 días o menos)" muestra "Ninguno por vencer."
- **THEN** "Personas a las que les debés" muestra "No le debés a nadie."
- **THEN** "Personas con deuda activa" muestra "No tenés personas con deuda activa."
- **THEN** "Deudas vencidas" muestra "No tenés deudas vencidas."
- **THEN** "Cuotas vencidas" (propias y de terceros) muestra "No tenés cuotas vencidas."
- **THEN** "Personas que te deben" muestra "Nadie te debe dinero."
- **THEN** "Personas con vencimientos impagos" muestra "Nadie tiene vencimientos impagos."
- **THEN** "Deudas activas" (de terceros) muestra "No tenés deudas de terceros activas."

#### Scenario: Indicador con valor positivo

- **WHEN** un indicador vale 2
- **THEN** la tarjeta muestra solo el número, sin mensaje verde

### Requirement: Franja compacta de cotización del dólar

Cuando la sección `dollarQuotes` esté habilitada, el Dashboard DEBE (SHALL) mostrar las
cotizaciones de DolarApi — Blue, Oficial y MEP — con su venta y su compra en ARS, en una
franja compacta de fondo de color primario, situada antes que las demás secciones y con
tipografía más pequeña que la de las tarjetas de Ahorros.

#### Scenario: Cotizaciones disponibles

- **WHEN** DolarApi responde con las tres cotizaciones
- **THEN** la franja "Cotización del dólar" muestra Blue, Oficial y MEP con su venta y su línea
  "Compra …", en un tamaño de letra menor que el importe de la tarjeta de Ahorros

#### Scenario: DolarApi no responde

- **WHEN** la obtención de cotizaciones falla
- **THEN** el campo `dollarQuotes` de la respuesta vale `null`
- **THEN** la franja muestra el aviso "No pudimos obtener la cotización del dólar." y el resto
  del Dashboard se renderiza con normalidad

### Requirement: Respeto de las secciones elegidas en Configuración

El Dashboard DEBE (SHALL) renderizar únicamente las secciones habilitadas por el usuario, en
el orden: franja de cotización, Ahorros, Gastos fijos del mes, Mis deudas y Deudas de
terceros. Si ninguna sección está habilitada, DEBE (SHALL) mostrarse un estado vacío con
acceso a Configuración.

#### Scenario: Secciones deshabilitadas no aparecen

- **WHEN** el usuario tiene habilitada solo `savings`
- **THEN** no se muestran "Gastos fijos del mes" ni la franja "Cotización del dólar"

#### Scenario: Todas deshabilitadas

- **WHEN** la lista de secciones habilitadas está vacía
- **THEN** el Dashboard muestra "No elegiste ninguna sección para mostrar en el Dashboard." con
  el botón "Elegir secciones" que lleva a Configuración

#### Scenario: La selección se reconsulta

- **WHEN** cambian las secciones habilitadas del usuario
- **THEN** el resumen se vuelve a pedir y la página refleja la nueva selección sin recargar

### Requirement: Estados de carga y de error del resumen

Mientras se cargan las preferencias o el resumen, el Dashboard DEBE (SHALL) mostrar el texto
"Cargando resumen…". Si la carga del resumen falla, DEBE (SHALL) mostrar el mensaje "No
pudimos cargar el resumen del Dashboard." con un botón "Reintentar" que vuelve a pedirlo.

#### Scenario: Falla la carga

- **WHEN** la petición del resumen devuelve un error
- **THEN** aparece el mensaje de error y el botón "Reintentar"
- **THEN** al presionar Reintentar se vuelve a consultar el resumen

### Requirement: Visualización responsive y con tema en el Dashboard

El Dashboard DEBE (SHALL) mostrarse entre 320 y 414 px sin desborde horizontal: tarjetas
apiladas en una columna en mobile, dos columnas desde 640 px y tres o cuatro en escritorio
ancho, botones de acción de ancho completo y 44 px de alto en mobile, y textos largos que
ajustan en varias líneas. Toda la paleta DEBE (SHALL) usar los tokens del sistema de diseño,
correctos en modo claro y oscuro.

#### Scenario: Pantalla estrecha

- **WHEN** el Dashboard se usa a 320–414 px
- **THEN** las tarjetas de cada sección se apilan en una columna y los botones "Reintentar" y
  "Elegir secciones" ocupan el ancho completo con 44 px de alto

#### Scenario: Escritorio

- **WHEN** el Dashboard se usa desde 1280 px
- **THEN** los indicadores de cada sección se distribuyen en cuatro columnas y las tarjetas de
  Ahorros en tres

### Requirement: La franja de cotizaciones se apila en una columna en mobile

Por debajo de 640 px la franja "Cotización del dólar" DEBE (SHALL) apilar Blue, Oficial y MEP en
una sola columna, cada una con su venta y su compra, sin desborde horizontal. Desde 640 px DEBE
(SHALL) mostrar las tres cotizaciones en tres columnas lado a lado, como antes.

#### Scenario: Pantalla estrecha

- **WHEN** el Dashboard se usa entre 320 y 414 px
- **THEN** el título y las tres cotizaciones se apilan en una columna sin scroll horizontal

#### Scenario: Desde 640 px

- **WHEN** el Dashboard se abre a 640 px o más
- **THEN** Blue, Oficial y MEP aparecen en tres columnas junto al título
