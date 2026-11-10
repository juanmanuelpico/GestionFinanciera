# reportes-estadisticas Specification

## Purpose
Concentra en una sola pantalla el análisis histórico de la cartera: una solapa por módulo
(Ahorros, Movimientos, Deudas, Gastos Fijos y Control de Gastos) con gráficos, KPIs, medias y
rankings calculados sobre el período y la billetera que el usuario elija. Responde a preguntas de
tendencia que ni el Dashboard ni los listados de cada módulo muestran.

## Requirements

### Requirement: Pantalla "Reportes y Estadísticas" en el menú

El punto de menú "Reportes" en `/reports` DEBE (SHALL) abrir la pantalla de Reportes y
Estadísticas con cinco solapas, y NO DEBE (SHALL NOT) cambiar la etiqueta ni la posición del ítem
en el menú. La pantalla NO DEBE (SHALL NOT) mostrar el placeholder de "próximamente".

#### Scenario: Abrir la pantalla desde el menú

- **WHEN** el usuario autenticado elige "Reportes" en el menú
- **THEN** ve el título "Reportes y Estadísticas" con el subtítulo "Analizá tus finanzas por
  módulo: gráficos, promedios y rankings."

#### Scenario: Solapas por módulo

- **WHEN** se renderiza la pantalla
- **THEN** el grupo de solapas "Secciones de reportes" muestra, en este orden, Ahorros,
  Movimientos, Deudas, Gastos Fijos y Control de Gastos

#### Scenario: Solo se consulta la solapa visible

- **WHEN** el usuario entra en la pantalla sin abrir otras solapas
- **THEN** solo se consulta el reporte de la solapa activa y el contenido de las demás no se
  carga

### Requirement: Filtro global de período y billetera

Encima de las solapas DEBE (SHALL) haber una única barra de filtros: los presets "Últimos 3
meses", "Últimos 6 meses", "Últimos 12 meses" y "Este año", los selectores "Desde" y "Hasta", el
selector "Billetera" y el botón "Limpiar filtros". El filtro DEBE (SHALL) aplicarse a todas las
solapas menos a Control de Gastos.

#### Scenario: Valores iniciales

- **WHEN** el usuario entra a la pantalla sin filtros previos
- **THEN** el período activo es "Últimos 12 meses" (hace 11 meses hasta el mes actual), la
  billetera es la del encabezado y "Limpiar filtros" está deshabilitado

#### Scenario: Presets

- **WHEN** el usuario hace clic en "Últimos 3 meses"
- **THEN** la solapa activa se recalcula con `from` = hace 2 meses y `to` = mes actual, y ese
  preset queda resaltado

#### Scenario: "Este año"

- **WHEN** el usuario elige "Este año" en noviembre de 2026
- **THEN** el período consultado es `2026-01` a `2026-11`

#### Scenario: Selectores mes a mes

- **WHEN** el usuario abre "Desde" o "Hasta"
- **THEN** puede elegir cualquiera de los últimos 24 meses, mostrados como "nov 2026", y los
  selects están inhabilitados mientras no se leyeron sus preferencias

#### Scenario: El rango nunca se invierte en la pantalla

- **WHEN** el usuario elige en "Desde" un mes posterior al "Hasta" actual
- **THEN** "Hasta" se mueve a ese mes (y a la inversa, elegir un "Hasta" anterior a "Desde" mueve
  "Desde"), de modo que la consulta siempre tiene un rango válido

#### Scenario: Cambiar la billetera

- **WHEN** el usuario selecciona otra billetera habilitada
- **THEN** el selector solo ofrece las monedas habilitadas y todas las solapas se vuelven a
  consultar en esa moneda

#### Scenario: Limpiar filtros

- **WHEN** el usuario cambia el período o la billetera y pulsa "Limpiar filtros"
- **THEN** vuelven el preset "Últimos 12 meses" y la billetera del encabezado, y el botón queda
  deshabilitado

### Requirement: La solapa activa se comparte en la URL

La solapa visible DEBE (SHALL) leerse del parámetro `?tab=` de `/reports` y DEBE (SHALL)
escribirse al cambiar de solapa, con `ahorros` como valor por defecto.

#### Scenario: Enlace directo a una solapa

- **WHEN** el usuario abre `/reports?tab=deudas`
- **THEN** la solapa activa es Deudas y se consulta `GET /api/reports/debts/stats`

#### Scenario: Volver a Ahorros limpia el parámetro

- **WHEN** el usuario pasa de otra solapa a "Ahorros"
- **THEN** la URL queda en `/reports` sin `?tab=`

#### Scenario: Valor desconocido

- **WHEN** la URL trae `?tab=inexistentes` o un valor fuera de `ahorros`, `movimientos`,
  `deudas`, `gastos-fijos` o `control`
- **THEN** se muestra la solapa Ahorros sin error

### Requirement: Cada reporte analiza una sola billetera sin convertir importes

Toda métrica DEBE (SHALL) calcularse solo con datos de la billetera seleccionada y NO DEBE
(SHALL NOT) sumar, convertir ni mezclar importes de otras monedas.

#### Scenario: Movimientos de otra moneda

- **WHEN** el reporte está en ARS y en el período hubo egresos en USD
- **THEN** el top de categorías y las medias ignoran los montos en USD

#### Scenario: Conversión de ahorro

- **WHEN** el usuario convirtió un ahorro de ARS a USD dentro del período
- **THEN** esa operación no aparece como aporte en una moneda ni como retiro en la otra

#### Scenario: Gasto fijo de otra billetera

- **WHEN** un gasto fijo está en USD y el reporte es ARS
- **THEN** no aporta al `expected` ni al `paid` del período

### Requirement: Ahorro mensual con media aproximada por mes

`GET /api/reports/savings/monthly` DEBE (SHALL) responder un punto por cada mes del rango con
`contributed`, `returned` y `net`, más un `summary` con los totales y las medias mensuales. Las
medias DEBE (SHALL) calcularse dividiendo el total del período entre la cantidad de meses del
rango, incluidos los meses sin eventos.

#### Scenario: Aportes y retiros por mes

- **WHEN** el usuario hizo un aporte el 15 de marzo y una devolución el 20 de marzo
- **THEN** el punto `2026-03` suma el aporte a `contributed` y la devolución a `returned`, y su
  `net` es la diferencia

#### Scenario: Tipos de evento computados

- **WHEN** el rango tiene eventos `ALTA` y `AJUSTE_SUMA`, `DEVOLUCION` y `AJUSTE_RESTA`, además de
  una `CONVERSION`
- **THEN** `contributed` suma los dos primeros grupos, `returned` los dos segundos y la
  conversión no computa en ninguno

#### Scenario: Media del ahorro

- **WHEN** el neto de un rango de 12 meses es 12.000
- **THEN** `summary.averageMonthlyNet` es 1.000 y `averageMonthlyContributed` es el total aportado
  dividido entre 12

#### Scenario: Meses sin eventos

- **WHEN** un mes del rango no tiene movimientos de ahorro
- **THEN** igual aparece en la serie con `contributed`, `returned` y `net` en 0 y el gráfico lo
  muestra como mes vacío (esta solapa no tiene estado vacío)

#### Scenario: KPIs y gráfico de la solapa Ahorros

- **WHEN** se muestra la solapa Ahorros
- **THEN** aparecen las tarjetas "Ahorro promedio mensual (neto)" con la pista "Aportes menos
  retiros del período", "Aporte promedio mensual", "Aportes del período" y "Retiros del período"
  (este último en rojo), y el gráfico "Ahorros por mes" con barras "Aportes" y "Retiros" más la
  línea "Neto"

### Requirement: Top N de categorías más usadas

`GET /api/reports/movements/top-categories` DEBE (SHALL) devolver hasta `limit` categorías del
período ordenadas por cantidad de movimientos con `totalAmount` y `sharePercent`, y la solapa
DEBE (SHALL) dejar elegir en pantalla el tipo de movimiento y el N.

#### Scenario: Consulta inicial de la solapa

- **WHEN** el usuario abre la solapa Movimientos
- **THEN** se consulta con `type=EGRESO` y `limit=10` más el período y la billetera, bajo el
  título "Categorías más usadas" y la descripción "Top 10 categorías por cantidad de movimientos
  en la billetera ARS."

#### Scenario: Cambiar el N en pantalla

- **WHEN** el usuario elige "Top 5" en el selector "Top N" (opciones 5, 10 y 20)
- **THEN** se vuelve a consultar con `limit=5` y la descripción pasa a decir "Top 5 categorías…"

#### Scenario: Filtro de tipo

- **WHEN** el usuario elige "Todos" en "Tipo de movimiento"
- **THEN** la consulta se envía sin `type` y una categoría con movimientos de ambos tipos ocupa
  dos filas, una por tipo, cada una con su propio conteo y participación

#### Scenario: Orden y desempate

- **WHEN** dos categorías tienen la misma cantidad de movimientos
- **THEN** aparece primero la de mayor `totalAmount`, y `sharePercent` se calcula sobre el total
  de movimientos del rango (0 cuando no hay movimientos)

#### Scenario: Barras y tooltip

- **WHEN** el usuario pasa el cursor sobre una barra
- **THEN** las barras son horizontales con la categoría más usada arriba y el tooltip muestra el
  nombre, "N movimientos · Egreso" y "Total: AR$ … · X % del período"

#### Scenario: Sin movimientos

- **WHEN** el rango, la billetera y el tipo elegidos no tienen movimientos
- **THEN** aparece "Sin movimientos en el período" con la pista "Probá con otro período, billetera
  o tipo de movimiento."

### Requirement: Media de gasto mensual por categoría

`GET /api/reports/movements/category-averages` DEBE (SHALL) devolver por categoría y tipo el
conteo, el total del período y `monthlyAverage` (`totalAmount` dividido los meses del rango),
ordenados por total descendente, sin límite de filas.

#### Scenario: Promedio sobre todo el rango

- **WHEN** una categoría suma 3.000 en un rango de 3 meses y solo tuvo movimientos en uno
- **THEN** su `monthlyAverage` es 1.000

#### Scenario: Comparte el filtro de tipo

- **WHEN** el usuario cambia el tipo de movimiento
- **THEN** la media se recalcula con el mismo filtro, mientras que el "Top N" no la afecta

#### Scenario: Tabla en escritorio y lista en mobile

- **WHEN** la solapa se ve desde 1024 px
- **THEN** la tarjeta "Media de gasto por categoría" muestra la tabla con Categoría, Tipo,
  Movimientos, Total y "Promedio mensual"; por debajo de ese ancho es una lista con "N
  movimientos · total" y "promedio/mes"

#### Scenario: Sin datos para el promedio

- **WHEN** no hay ninguna categoría con movimientos en el filtro
- **THEN** aparece "Sin datos para el promedio" con la pista "Cargá movimientos o cambiá el filtro
  de tipo."

### Requirement: Estadísticas de deudas

`GET /api/reports/debts/stats` DEBE (SHALL) devolver KPIs de la billetera al día de hoy, una serie
mensual de cobros y pagos del período y el ranking de deudores. Los KPIs NO DEBE (SHALL NOT)
filtrarse por el período elegido.

#### Scenario: KPIs de la solapa Deudas

- **WHEN** se muestra la solapa Deudas
- **THEN** aparecen "Te deben (terceros)" con la pista "N deudas activas", "Vencido que no te
  pagaron" con "N cuotas vencidas impagas", "Vos debés" con sus deudas activas y "Cumplimiento de
  cuotas"

#### Scenario: Cuota vencida impaga

- **WHEN** una cuota de una deuda `ACTIVA` tiene fecha de vencimiento anterior a hoy y un
  `paidAmount` menor que su importe
- **THEN** su saldo pendiente cuenta en `thirdOverdueAmount` y en `overdueInstallments` para las
  deudas de terceros (las propias se calculan en `ownOverdueAmount`, que la pantalla no muestra)

#### Scenario: Los KPIs no dependen del período

- **WHEN** el usuario cambia el período con la solapa Deudas abierta
- **THEN** los cuatro KPIs mantienen sus valores y solo se recalcula la serie mensual

#### Scenario: Serie de cobros y pagos

- **WHEN** en el período hubo un cobro de una deuda de terceros y un pago de una deuda propia,
  ambos con estado `ACTIVA`
- **THEN** el gráfico "Cobros y pagos por mes" muestra "Cobros (te pagaron)" en `received` y
  "Pagos (pagaste)" en `paid` del mes de `paymentDate`; un settlement revertido no computa

#### Scenario: Ranking de deudores

- **WHEN** varias personas tienen saldo pendiente en deudas de terceros activas
- **THEN** "¿Quién te debe más?" lista hasta 5 por saldo descendente con una barra proporcional al
  mayor; si no hay nadie, dice "Nadie te debe en la billetera ARS."

#### Scenario: Cumplimiento de cuotas

- **WHEN** la billetera tiene cuotas marcadas como pagadas (`paidAt`) sobre el total de cuotas
  registradas
- **THEN** "Cumplimiento de cuotas" muestra ese porcentaje y muestra "—" cuando no existe ninguna
  cuota

### Requirement: Gastos fijos esperados contra pagados por mes

`GET /api/reports/fixed-expenses/monthly` DEBE (SHALL) responder por mes del rango lo esperado,
lo pagado, la cantidad de vencimientos, la cantidad de pagos y el cumplimiento, más el resumen
`totalExpected` y `totalPaid` del rango.

#### Scenario: Series de vencimiento

- **WHEN** un gasto de 12.000 tiene su primer vencimiento en `2026-01` y se repite cada 3 meses
- **THEN** `expected` suma 12.000 en los puntos `2026-01`, `2026-04`, `2026-07` y `2026-10` del
  rango

#### Scenario: Pago agrupado por su período

- **WHEN** se paga el período `2026-03` de un gasto con un movimiento de 12.000
- **THEN** `paid` de `2026-03` suma 12.000 y `paidCount` aumenta en 1, aunque el pago se haya
  registrado en otra fecha

#### Scenario: Cumplimiento mensual

- **WHEN** un mes tiene 2 vencimientos y 3 pagos registrados
- **THEN** `compliancePercent` es 100 (los pagos se topan a la cantidad de vencimientos) y un mes
  sin vencimientos devuelve `compliancePercent` en `null`

#### Scenario: KPIs y gráfico de la solapa Gastos Fijos

- **WHEN** se muestra la solapa Gastos Fijos
- **THEN** aparecen "Esperado en el período" con "N vencimientos en los meses del rango", "Pagado
  en el período" y "Cumplimiento" con "X de Y vencimientos pagados" ("—" si Y es 0), y el gráfico
  "Gastos fijos por mes" con las barras "Esperado" y "Pagado"

### Requirement: La solapa Control de Gastos siempre muestra el mes actual

La solapa Control de Gastos DEBE (SHALL) reutilizar `GET /api/spending-control` sin parámetros y
DEBE (SHALL) avisar en pantalla que no usa el período global. NO DEBE (SHALL NOT) duplicar las
reglas del umbral de la categoría.

#### Scenario: Encabezado con el período real

- **WHEN** el usuario abre la solapa Control de Gastos
- **THEN** ve el título "Umbrales del mes actual" y la descripción "Período Noviembre 2026 · esta
  pestaña siempre muestra el mes en curso, no el período seleccionado."

#### Scenario: Los filtros globales no la afectan

- **WHEN** el usuario cambia el período o la billetera con la solapa abierta
- **THEN** no se vuelve a llamar a `/spending-control` y la lista no cambia

#### Scenario: Barras de consumo por estado

- **WHEN** una categoría tiene 90 % de su umbral consumido
- **THEN** su barra usa el color de advertencia, la insignia dice "Al 80 % o más" y el importe se
  formatea en la moneda del umbral; por debajo del 80 % la barra es del color primario con
  "En control" y al superarlo usa el color destructivo con "Umbral superado"

#### Scenario: Sin categorías con umbral

- **WHEN** el usuario no tiene ningún umbral configurado
- **THEN** aparece "Sin categorías con umbral" con la pista "Configurá un umbral mensual en
  Categorías para ver el consumo acá."

### Requirement: Validación del período, la billetera y el top N

Los endpoints de reporte DEBE (SHALL) validar `from` y `to` en formato `YYYY-MM`, la moneda dentro
del catálogo y `limit` entre 1 y 50, y responder 400 con el mensaje en español que corresponda.

#### Scenario: Formato de período

- **WHEN** se envía `from=2026-1`
- **THEN** la respuesta es 400 "El período debe tener el formato YYYY-MM"

#### Scenario: Rango invertido

- **WHEN** `from` es posterior a `to`
- **THEN** la respuesta es 400 "El rango de fechas no es válido"

#### Scenario: Rango demasiado largo

- **WHEN** el rango supera los 48 meses
- **THEN** la respuesta es 400 "El período no puede superar los 48 meses"

#### Scenario: Top N fuera de rango

- **WHEN** `limit` es 51
- **THEN** la respuesta es 400 "El top N no puede superar 50"; si `limit` se omite se analizan 10
  categorías

#### Scenario: Moneda inválida o ausente

- **WHEN** se envía `currency=BRL`
- **THEN** la respuesta es 400 "La moneda no es válida"; si `currency` se omite se usa la moneda
  del encabezado del usuario

#### Scenario: Período por defecto

- **WHEN** se consulta cualquier endpoint sin `from` ni `to`
- **THEN** se analizan los últimos 12 meses hasta el mes actual y la serie devuelve los 12 puntos
  en orden cronológico

### Requirement: Datos propios y acceso autenticado

Las consultas de reporte DEBE (SHALL) filtrarse siempre por el usuario autenticado y NO DEBE
(SHALL NOT) exponer datos de otros usuarios.

#### Scenario: Sin sesión

- **WHEN** se llama a cualquier `/api/reports/*` sin token de acceso
- **THEN** el backend responde 401 y no devuelve datos

#### Scenario: Aislamiento por usuario

- **WHEN** otro usuario tiene movimientos, ahorros, deudas o gastos fijos en las mismas categorías
  y período
- **THEN** esos datos no entran en ninguna métrica del reporte

#### Scenario: Categoría sin nombre disponible

- **WHEN** un movimiento referencia una categoría que ya no pertenece al usuario
- **THEN** la fila se devuelve con el nombre "—" en lugar de fallar la consulta

### Requirement: Estados de carga, error y vacío en cada solapa

Cada solapa DEBE (SHALL) mostrar esqueletos mientras carga, el mensaje del backend con botón
"Reintentar" cuando la consulta falla y su propio estado vacío cuando el reporte no tiene datos.

#### Scenario: Carga

- **WHEN** una consulta de reporte está pendiente
- **THEN** se muestran tres bloques de esqueleto con la etiqueta "Cargando …" de la solapa y, al
  entrar a la pantalla, un esqueleto de gráfico mientras se leen las preferencias

#### Scenario: Error de un reporte

- **WHEN** la consulta de una solapa falla
- **THEN** se ve el mensaje del backend en color destructivo con rol `alert` y el botón
  "Reintentar" vuelve a consultar

#### Scenario: Error al leer las preferencias

- **WHEN** fallan las preferencias del usuario
- **THEN** la pantalla muestra solo el título, el mensaje de error y "Reintentar", sin la barra de
  filtros ni las solapas

#### Scenario: Solapas que no muestran vacío

- **WHEN** Ahorros, Deudas o Gastos Fijos no tienen datos en el filtro
- **THEN** muestran igual sus KPIs en 0,00 y las series en cero; el único aviso de vacío de estas
  solapas es "Nadie te debe en la billetera ARS."

### Requirement: Gráficos legibles en mobile, con tema y color primario configurable

Las visualizaciones DEBE (SHALL) ocupar todo el ancho disponible, usar exclusivamente las
variables CSS del tema y mantener textos de al menos 12 px sin desborde horizontal del body entre
320 y 414 px.

#### Scenario: Modo oscuro y `data-theme-color`

- **WHEN** el usuario activa el modo oscuro o cambia el color primario
- **THEN** barras, líneas, ejes, grillas y tooltips siguen leyendo del tema (aportes, neto,
  pagado y ranking del color primario; retiros y vencidos del ámbar; cobros del verde; pagos de
  deudas y errores del rojo) sin perder contraste

#### Scenario: Ejes con poco ancho

- **WHEN** el gráfico se ve en un ancho chico
- **THEN** las etiquetas de mes se alternan sin superponerse, los importes del eje Y se abrevian
  en formato compacto y los meses se leen como "nov 2026"

#### Scenario: Layout responsive

- **WHEN** la pantalla está entre 320 y 414 px
- **THEN** las tarjetas KPI se apilan en una columna (2 desde `sm` y 4 desde `lg`), los selects y
  botones miden 44 px de alto (40 en escritorio) y el grupo de solapas tiene scroll horizontal
  propio sin que desborde la página

#### Scenario: Gráfico más angosto que la pantalla

- **WHEN** el ancho disponible de la card queda por debajo del ancho mínimo legible del gráfico
  (360 px)
- **THEN** solo el gráfico scrollea horizontalmente dentro de su marco; el body y la card no
  scrollean y recuperan el 100 % del ancho desde `sm`
