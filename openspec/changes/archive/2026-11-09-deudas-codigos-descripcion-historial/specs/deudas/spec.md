# Spec Delta: Deudas

## Purpose

El módulo de deudas identifica cada deuda con un código único legible (`DP<n>` propias,
`DT<n>` de terceros), exige descripción en todas las altas, permite filtrar el listado por
esa descripción, deriva un estado "parcialmente pagada/cobrada" y agrega un diálogo de
visualización en solo lectura con el historial de pagos y cobros de la deuda. Los códigos
también encabezan la nota de los movimientos generados, para poder trazarse entre módulos.

## ADDED Requirements

### Requirement: Códigos únicos de deuda

Cada deuda DEBE (SHALL) tener un código único por usuario: `DP<n>` para deudas propias y
`DT<n>` para deudas de terceros, con numeración consecutiva independiente por usuario y
tipo, generada dentro de la misma transacción del alta. La base DEBE (SHALL) garantizar la
unicidad por (usuario, código). La respuesta de deuda DEBE (SHALL) exponer el campo `code`.

#### Scenario: Numeración por tipo

- **WHEN** el usuario registra su primera deuda propia y luego su primera deuda de tercero
- **THEN** reciben `DP1` y `DT1`, y cada tipo continúa su propia secuencia (`DP2`, `DT2`, …)

#### Scenario: Deudas existentes asignadas por backfill

- **WHEN** se aplica la migración de códigos a un usuario con deudas previas
- **THEN** se numeran por usuario y tipo en orden de creación y la secuencia del usuario
  continúa a partir del máximo ya usado, sin repetir códigos

### Requirement: Código visible en el diálogo de cobro o pago

La UI DEBE (SHALL) mostrar el código de la deuda en el encabezado de los diálogos de
liquidación y de reversión de operaciones.

#### Scenario: Abrir el formulario de pago o cobro

- **WHEN** el usuario abre "Cobrar" o "Pagar" desde una fila de deudas
- **THEN** el título del diálogo es "<Cobrar|Pagar> — <código> · <actor>", p. ej.
  "Cobrar — DT1 · Juan Pérez"
- **THEN** el actor se muestra con su nombre para mostrar (nombre y apellido en personas,
  alias en tarjetas)

#### Scenario: Abrir el diálogo de deshacer

- **WHEN** el usuario abre la reversión de cobros o pagos de una deuda
- **THEN** el título del diálogo es "Deshacer cobros y pagos — <código> · <actor>"

### Requirement: Descripción obligatoria al registrar deudas

Toda deuda nueva, incluidas las generadas por una división, DEBE (SHALL) tener una
descripción no vacía de como máximo 500 caracteres y el backend DEBE (SHALL) rechazar el
alta sin nota con el mensaje "La descripción es obligatoria". Las deudas históricas sin
nota NO DEBEN (SHALL NOT) desaparecer del listado: se muestran con un marcador de vacío.

#### Scenario: Alta sin descripción

- **WHEN** el usuario confirma el formulario de deuda sin descripción
- **THEN** el formulario muestra "Ingresá una descripción" y no llama a la API
- **WHEN** la API recibe una creación con `note` vacía o con solo espacios
- **THEN** responde 400 con "La descripción es obligatoria" y no crea la deuda

#### Scenario: Descripción guardada

- **WHEN** el alta incluye descripción
- **THEN** la nota se recorta al trim y se persiste con la deuda

#### Scenario: Descripción en el listado

- **WHEN** el usuario ve el listado de deudas
- **THEN** la columna "Descripción" de la grilla muestra la nota, o "—" si el registro
  histórico no la tiene
- **THEN** la tarjeta mobile muestra la nota en el encabezado, o "Sin descripción" si no
  la tiene

### Requirement: Filtro por descripción de deuda

`GET /api/debts` DEBE (SHALL) aceptar el parámetro opcional `description` y devolver solo
las deudas cuya nota lo contenga sin distinguir mayúsculas. La solapa de deudas DEBE
(SHALL) ofrecer un campo de entrada "Descripción" que combine con los filtros existentes y
reinicie la paginación al usarlo.

#### Scenario: Búsqueda por texto de la nota

- **WHEN** el usuario escribe "asado" en el campo Descripción de la solapa
- **THEN** el listado muestra solo las deudas del tipo activo cuya nota contenga "asado"
  (sin distinguir mayúsculas)
- **THEN** el filtro se aplica junto con estado, billetera, tipo de actor y búsqueda por
  actor, y el resultado pagina desde la primera página

### Requirement: Código en la nota de los movimientos generados

Todo movimiento creado por el módulo de deudas DEBE (SHALL) iniciar su nota con el código
de la deuda y el separador ` — `, seguido del texto descriptivo. Los movimientos históricos
creados antes de este cambio NO DEBEN (SHALL) modificarse.

#### Scenario: Movimiento de creación

- **WHEN** se registra una deuda de tercero con una persona (p. ej. código `DT8`)
- **THEN** el egreso inicial tiene la nota `DT8 — Préstamo a Ana Garcia`
- **WHEN** se registra una deuda propia recibida de una persona (p. ej. `DP1`)
- **THEN** el ingreso inicial tiene la nota `DP1 — Préstamo recibido de <persona>`

#### Scenario: Cobro o pago de cuotas

- **WHEN** el usuario liquida cuotas de una deuda de tercero (p. ej. `DT8`)
- **THEN** cada ingreso tiene la nota `DT8 — <actor> · Cobro Cuota <n>/<total>`
- **WHEN** el usuario liquida cuotas de una deuda propia
- **THEN** cada egreso tiene la nota `DP<n> — <actor> · Pago Cuota <n>/<total>`

#### Scenario: Reversa de una operación

- **WHEN** el usuario deshace un cobro o pago
- **THEN** cada movimiento inverso tiene la nota `<código> — <actor> · Reversa de cobro Cuota <n>/<total>` (o "Reversa de pago" para deudas propias)

### Requirement: Referencia a la división de origen

Cuando una deuda fue generada por una división de gastos, la respuesta de deuda DEBE
(SHALL) exponer `splitCode` con el código `DG` de la división, y las deudas nuevas
generadas por una división DEBEN (SHALL) incluir ese código en su nota ("Deuda por
división DG2: …" o "Deuda con <actor> por división DG2: …"). La pantalla DEBE (SHALL)
mostrar la referencia bajo la descripción de la grilla y de la tarjeta ("de división
DG2") y en el diálogo de visualización ("· división DG2").

#### Scenario: Deuda nacida de una división

- **WHEN** el usuario consulta las deudas y una proviene de la división `DG2`
- **THEN** su respuesta trae `splitCode = "DG2"` y la pantalla muestra "de división DG2"
- **WHEN** una deuda no proviene de ninguna división
- **THEN** `splitCode` es nulo y no se muestra la referencia

### Requirement: Estado de pago parcial derivado

La respuesta de deuda DEBE (SHALL) exponer `paymentProgress` (`NONE`, `PARTIAL` o `FULL`)
calculado de los importes pagados sin persistirse como estado nuevo. La grilla y las
tarjetas DEBEN (SHALL) mostrar un badge de progreso parcial cuando la deuda está activa.

#### Scenario: Umbrales del progreso

- **WHEN** el importe pagado de una deuda es 0
- **THEN** `paymentProgress` es `NONE`
- **WHEN** es mayor que 0 y menor que el total
- **THEN** `paymentProgress` es `PARTIAL`
- **WHEN** alcanza o supera el total
- **THEN** `paymentProgress` es `FULL`

#### Scenario: Cobro parcial de una deuda de tercero

- **WHEN** el usuario cobra un importe mayor a 0 pero menor al total de una deuda de
  tercero
- **THEN** la respuesta trae `paymentProgress = "PARTIAL"` y la deuda muestra el badge
  "Parcialmente cobrada" en lugar de "Activa"
- **WHEN** el avance parcial ocurre en una deuda propia
- **THEN** el badge se rotula "Parcialmente pagada"

#### Scenario: Deshacer devuelve la deuda a parcial

- **WHEN** se revierte una liquidación de una deuda que conserva importes pagados
- **THEN** la deuda queda `ACTIVA` con `paymentProgress` coherente con el saldo pagado
  restante y muestra el badge correspondiente

#### Scenario: Deuda totalmente liquidada

- **WHEN** una deuda queda pagada o cobrada en su totalidad
- **THEN** `paymentProgress` es `FULL` y el listado muestra el estado de la deuda
  ("Finalizada"), no el badge parcial

### Requirement: Visualizar una deuda al hacer click

Al hacer click sobre una fila de la grilla (desktop) o sobre el encabezado de la tarjeta
(mobile) DEBE (SHALL) abrirse un diálogo de visualización de la deuda en solo lectura. Los
botones de acción de la fila NO DEBEN (SHALL NOT) abrir ese diálogo.

#### Scenario: Contenido del diálogo

- **WHEN** el usuario abre la visualización de una deuda
- **THEN** muestra código, actor, badge de estado, descripción (o "—" si el registro
  histórico no tiene nota) y su referencia de división
- **THEN** muestra billetera y total, importe pagado o cobrado, restante y cuotas pagadas
  sobre el total
- **THEN** muestra la fecha de la operación, el primer vencimiento o cobro y el próximo
  pendiente solo si la deuda está activa
- **THEN** lista las cuotas con su estado de pago

#### Scenario: Click en una fila

- **WHEN** el usuario hace click en una fila de la grilla o en el encabezado de la tarjeta
- **THEN** se abre el diálogo cargando el detalle de la deuda
- **THEN** el diálogo no ofrece acciones de edición, cobro, pago ni deshacer

#### Scenario: Acciones de la fila

- **WHEN** el usuario presiona "Pagar"/"Cobrar" o el botón de deshacer dentro de la fila
- **THEN** se abre el formulario correspondiente sin abrir el diálogo de visualización

### Requirement: Historial de una deuda

El diálogo de visualización DEBE (SHALL) incluir una sección "Historial" de la deuda
derivada de los datos existentes, sin endpoint nuevo.

#### Scenario: Registros del historial

- **WHEN** el usuario abre el historial de una deuda
- **THEN** ve la creación de la deuda con su código y fecha
- **THEN** ve cada cobro o pago con fecha, importe y los números de cuota incluidos
- **THEN** si una operación fue revertida, muestra el badge "Pago deshecho" (propias) o
  "Cobro deshecho" (terceros)

#### Scenario: Historial de una deuda liquidada

- **WHEN** el progreso de la deuda es `FULL`
- **THEN** el historial cierra con "Pagada en total" (o "Cobrada en total") y la fecha de
  la última operación vigente

#### Scenario: Deuda sin movimientos

- **WHEN** el usuario visualiza una deuda que todavía no tuvo cobros ni pagos
- **THEN** el historial muestra únicamente la creación y la nota de que todavía no hay
  cobros o pagos registrados

## MODIFIED Requirements

### Requirement: Movimiento inicial automático

Al registrar una deuda con una Persona, el sistema DEBE (SHALL) crear el movimiento inicial
que refleja el dinero involucrado, con la nota encabezada por el código de la deuda. Las
deudas con Tarjeta NO DEBEN (SHALL NOT) generar movimiento inicial.

#### Scenario: Deuda propia con persona

- **WHEN** el usuario registra una deuda propia con una Persona
- **THEN** se crea un movimiento de ingreso por el total en la billetera de la deuda
- **THEN** la nota es `<código> — Préstamo recibido de <persona>` (p. ej.
  `DP1 — Préstamo recibido de Juan Pérez`)

#### Scenario: Deuda de tercero con persona

- **WHEN** el usuario registra una deuda de tercero con una Persona
- **THEN** se crea un movimiento de egreso por el total en la billetera de la deuda
- **THEN** la nota es `<código> — Préstamo a <persona>` (p. ej.
  `DT8 — Préstamo a Ana Garcia`)

#### Scenario: Categoría automática

- **WHEN** se registra el movimiento inicial y el usuario no tiene una categoría de deudas
- **THEN** el sistema crea o reutiliza la categoría "Deudas" del usuario

#### Scenario: Deuda con tarjeta

- **WHEN** el usuario registra una deuda con un actor de tipo Tarjeta
- **THEN** la deuda y sus cuotas se crean sin movimiento inicial
- **THEN** la fecha del primer vencimiento se sugiere a partir del día de cierre y del día
  de pago de la tarjeta

### Requirement: Listado, filtros y detalle

El sistema DEBE (SHALL) listar las deudas del usuario separadas por tipo y DEBE (SHALL)
permitir filtrar y paginar los resultados, incluida la búsqueda por descripción de la
nota. La respuesta DEBE (SHALL) incluir el código de la deuda, la referencia a la división
de origen y el progreso de pago derivado.

#### Scenario: Filtros del listado

- **WHEN** el usuario consulta deudas
- **THEN** el tipo de deuda es obligatorio
- **THEN** puede filtrar por estado, tipo de actor, billetera, texto de búsqueda sobre el
  actor y texto de descripción sobre la nota, ambos sin distinguir mayúsculas
- **THEN** las deudas activas se muestran antes que las finalizadas y, dentro de cada
  grupo, las más recientes primero

#### Scenario: Resumen de una deuda

- **WHEN** el usuario consulta una deuda
- **THEN** la respuesta incluye sus cuotas y el resumen con cuotas pagadas, importe
  pagado, saldo restante y próximo vencimiento pendiente
- **THEN** la respuesta incluye además `code`, `splitCode` (nulo si la deuda no proviene
  de una división) y `paymentProgress` (`NONE`/`PARTIAL`/`FULL`)
- **THEN** el próximo vencimiento solo se informa para deudas activas
- **THEN** se indica si la deuda tiene una operación de cobro o pago activa

### Requirement: Pantalla de deudas

La pantalla DEBE (SHALL) ofrecer cuatro solapas: "Deudas Propias", "Deudas de Terceros",
"División de Gastos" y "Actores", manteniendo la solapa activa en la URL. Las solapas de
deudas DEBEN (SHALL) mostrar código y descripción en el listado, el badge de pago parcial y
abrir la visualización de la deuda al hacer click.

#### Scenario: Alta según la solapa activa

- **WHEN** el usuario presiona "Agregar" en "Deudas Propias", "Deudas de Terceros" o
  "Actores"
- **THEN** se abre el formulario correspondiente con el tipo de deuda o de actor
  precargado
- **WHEN** el usuario presiona "Agregar" en "División de Gastos"
- **THEN** se abre el formulario de nueva división de gastos de la capability
  `division-de-gastos`

#### Scenario: Solapa en la URL

- **WHEN** el usuario cambia de solapa o recarga la pantalla
- **THEN** la solapa activa se conserva en el parámetro `tab` de la URL (`propias`,
  `terceros`, `division` o `actores`) y al volver desde "Deudas Propias" se limpia el
  parámetro

#### Scenario: Listado y acciones

- **WHEN** el usuario ve el listado de deudas
- **THEN** cada deuda muestra código, actor, descripción (o "—" en la grilla /
  "Sin descripción" en la tarjeta si el registro histórico no tiene nota), importe,
  cuotas pagadas sobre total, restante, próximo cobro o vencimiento y estado
- **THEN** una deuda activa parcialmente pagada muestra el badge "Parcialmente pagada"
  ("Parcialmente cobrada" para terceros) en lugar de "Activa"
- **THEN** una deuda generada por una división muestra la referencia "de división DG<n>"
  bajo la descripción
- **THEN** la acción se rotula "Cobrar" para deudas de terceros y "Pagar" para deudas
  propias
- **THEN** las acciones de cobro, pago y deshacer solo están disponibles para deudas
  activas con operaciones activas
- **THEN** en mobile el listado se presenta como tarjetas, sin desborde horizontal

#### Scenario: Filtro de descripción

- **WHEN** el usuario escribe en el campo "Descripción" de la solapa
- **THEN** el listado se filtra por la nota de la deuda sin distinguir mayúsculas,
  combinado con los demás filtros

#### Scenario: Formulario de pago

- **WHEN** el usuario abre el formulario de cobro o pago
- **THEN** puede elegir la cantidad de cuotas pendientes y la fecha real de la operación
- **THEN** para deudas con personas puede editar el importe de cada cuota seleccionada
- **THEN** el formulario impide importes inválidos y un total mayor al saldo restante
- **THEN** si el egreso de una deuda propia supera el disponible, se muestra una
  advertencia antes de confirmar
