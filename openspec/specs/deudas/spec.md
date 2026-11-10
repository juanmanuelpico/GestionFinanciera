# deudas Specification

## Purpose
Permite registrar deudas propias (préstamos recibidos, compras en cuotas con tarjeta) y
deudas de terceros (dinero prestado a otras personas), con su calendario de cuotas, el
cobro o pago parcial, la reversión de operaciones y el impacto automático en la billetera
y en los movimientos del usuario.

## Requirements

### Requirement: Actores de deuda

El sistema DEBE (SHALL) permitir crear, listar, buscar, editar y eliminar actores de deuda del
usuario autenticado. Cada actor DEBE (SHALL) ser de tipo Persona o Tarjeta y DEBE (SHALL) tener un nombre
para mostrar derivado de sus datos.

#### Scenario: Alta de una persona

- **WHEN** el usuario crea un actor de tipo Persona con nombre y apellido
- **THEN** el actor se guarda y su nombre para mostrar es "nombre apellido"
- **THEN** el teléfono y el email son opcionales y el email se normaliza a minúsculas

#### Scenario: Datos obligatorios de una persona

- **WHEN** se intenta crear una Persona sin nombre o sin apellido
- **THEN** el backend rechaza la solicitud con un error de validación en español

#### Scenario: Alta de una tarjeta

- **WHEN** el usuario crea un actor de tipo Tarjeta con alias, banco o emisor, marca, día
  de cierre y día de vencimiento
- **THEN** el actor se guarda y su nombre para mostrar es el alias
- **THEN** los últimos cuatro dígitos son opcionales y, si se informan, DEBE (SHALL)N ser
  exactamente cuatro dígitos
- **THEN** la billetera predeterminada es obligatoria y DEBE (SHALL) ser una moneda habilitada
  para el usuario

#### Scenario: Datos obligatorios de una tarjeta

- **WHEN** se intenta crear una Tarjeta sin alias, sin banco, sin marca, sin días de
  cierre y vencimiento o con una billetera no habilitada
- **THEN** el backend rechaza la solicitud con un error de validación en español

#### Scenario: Edición de un actor con deudas

- **WHEN** el usuario edita un actor que ya tiene deudas asociadas e intenta cambiar su
  tipo
- **THEN** el backend rechaza el cambio con un mensaje explicativo

#### Scenario: Eliminación de un actor con deudas

- **WHEN** el usuario intenta eliminar un actor que tiene deudas asociadas
- **THEN** el backend responde 409 y no elimina el actor

#### Scenario: Búsqueda y paginación de actores

- **WHEN** el usuario lista actores con un texto de búsqueda y un tipo
- **THEN** se filtran por nombre, apellido, alias, banco o marca sin distinguir
  mayúsculas
- **THEN** la respuesta incluye la cantidad de deudas de cada actor y la paginación

### Requirement: Registro de una deuda

El sistema DEBE (SHALL) crear una deuda con su calendario completo de cuotas en una sola
operación. Cada deuda DEBE (SHALL) tener tipo, actor, billetera, importe total, cantidad de
cuotas, fecha de operación y primer vencimiento.

#### Scenario: Compatibilidad entre tipo de deuda y actor

- **WHEN** se intenta registrar una deuda de tercero con un actor que no es Persona
- **THEN** el backend rechaza la operación
- **WHEN** se intenta registrar una deuda propia con un actor de tipo Tarjeta y un tipo
  distinto de `PROPIA`
- **THEN** el backend rechaza la operación

#### Scenario: Validaciones del alta

- **WHEN** el importe es menor o igual a 0 o tiene más de dos decimales
- **THEN** el backend rechaza la operación
- **WHEN** la cantidad de cuotas no es un entero entre 1 y 120
- **THEN** el backend rechaza la operación
- **WHEN** la billetera no está habilitada para el usuario o no es `ARS`, `USD` o `EUR`
- **THEN** el backend rechaza la operación
- **WHEN** falta la fecha de operación o la del primer vencimiento
- **THEN** el backend rechaza la operación

#### Scenario: Deuda de tercero con saldo insuficiente

- **WHEN** el usuario registra una deuda de tercero por un importe mayor al dinero
  disponible de la billetera elegida
- **THEN** el backend rechaza la operación e informa el disponible y el importe necesario

### Requirement: Calendario de cuotas

El sistema DEBE (SHALL) generar una cuota por cada mes indicado y DEBE (SHALL) repartir el importe total
sin perder centavos.

#### Scenario: Reparto del importe

- **WHEN** se registra una deuda de 1000 en 3 cuotas
- **THEN** las primeras cuotas toman el importe base redondeado hacia abajo
- **THEN** la última cuota absorbe la diferencia y la suma de las cuotas es exactamente el
  total

#### Scenario: Vencimientos mensuales

- **WHEN** el primer vencimiento cae en un día que no existe en un mes posterior
- **THEN** el vencimiento de ese mes se recorta al último día del mes

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

### Requirement: Cobro y pago de cuotas

El sistema DEBE (SHALL) permitir liquidar la cantidad de cuotas pendientes consecutivas que el
usuario indique, con la fecha real de cobro o pago. El pago de una deuda propia DEBE (SHALL)
informar en la respuesta cuando el egreso cruza el umbral mensual de la categoría de deudas.

#### Scenario: Límite de cuotas

- **WHEN** el usuario intenta liquidar más cuotas que las pendientes
- **THEN** el backend rechaza la operación e informa cuántas quedan
- **WHEN** la deuda ya está finalizada o no tiene cuotas pendientes
- **THEN** el backend rechaza la operación

#### Scenario: Deuda con persona

- **WHEN** el usuario liquida cuotas de una deuda con una Persona
- **THEN** DEBE (SHALL) informar un importe mayor a 0 y con hasta dos decimales por cada cuota
  seleccionada
- **THEN** la suma de los importes NO DEBE (SHALL) (SHALL NOT) superar el saldo restante de la deuda
- **WHEN** falta el importe de alguna cuota seleccionada
- **THEN** el backend rechaza la operación

#### Scenario: Deuda con tarjeta

- **WHEN** el usuario liquida cuotas de una deuda con Tarjeta
- **THEN** cada cuota se cobra o paga por su importe original
- **WHEN** se envían importes personalizados para una tarjeta
- **THEN** el backend rechaza la operación

#### Scenario: Impacto en la billetera

- **WHEN** se liquida una deuda propia
- **THEN** se verifica que el dinero disponible alcance y se crea un egreso por el total
  liquidado
- **WHEN** se liquida una deuda de tercero
- **THEN** se crea un ingreso por el total cobrado
- **THEN** cada movimiento queda asociado a la deuda y a la cuota liquidada, usando la
  categoría "Deudas" y la billetera de la deuda

#### Scenario: Finalización de la deuda

- **WHEN** se liquida la última cuota pendiente
- **THEN** la deuda pasa a estado `FINALIZADA`

#### Scenario: Aviso de umbral al pagar una deuda propia

- **WHEN** el pago de cuotas de una deuda propia deja el acumulado del mes calendario UTC de
  la fecha de pago, en la billetera de la deuda, en el 80 % o más del umbral de la categoría
  "Deudas"
- **THEN** la respuesta incluye `spendingAlert` con `status` `WARNING` o `EXCEEDED` y la
  solapa "Deudas Propias" muestra el banner ámbar o rojo
- **WHEN** se cobra una cuota de una deuda de terceros
- **THEN** la respuesta se devuelve sin `spendingAlert` y la solapa no muestra ningún banner
- **WHEN** la categoría "Deudas" no tiene umbral, o su umbral está en una moneda distinta de
  la billetera de la deuda
- **THEN** el pago se registra igual y sin aviso

### Requirement: Deshacer un cobro o pago

El sistema DEBE (SHALL) permitir revertir una operación de cobro o pago activa, dejando la deuda
y los movimientos en un estado consistente.

#### Scenario: Reversión de una operación activa

- **WHEN** el usuario deshace una operación de cobro o pago
- **THEN** se crean movimientos inversos por cada cuota liquidada
- **THEN** las cuotas vuelven a quedar pendientes y la deuda vuelve a estado `ACTIVA`
- **THEN** la operación original queda marcada como `REVERTIDA` con fecha de reversión

#### Scenario: Operación ya revertida

- **WHEN** el usuario intenta deshacer una operación que ya fue revertida
- **THEN** el backend rechaza la operación con un mensaje explicativo

#### Scenario: Saldo insuficiente al deshacer un cobro

- **WHEN** deshacer una operación de cobro de un tercero exige crear un egreso y el
  disponible de la billetera no alcanza
- **THEN** el backend rechaza la reversión e informa el disponible y el importe necesario

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

### Requirement: Aislamiento por usuario

Las deudas y los actores de otro usuario NO DEBE (SHALL) (SHALL NOT)N ser visibles ni modificables.

#### Scenario: Acceso a un recurso ajeno

- **WHEN** un usuario consulta o modifica una deuda o un actor que pertenece a otro usuario
- **THEN** el backend responde 404

### Requirement: Los diálogos de Deudas caben en la ventana mobile

Los diálogos de Deudas DEBEN (SHALL) limitar su alto al 90 % del viewport dinámico y hacer scroll
su propio contenido en lugar de agrandar la página. Su base DEBE (SHALL) reservar el área segura
inferior del dispositivo para que los botones de acción NO DEBAN (SHALL NOT) quedar cubiertos por
la barra de inicio.

#### Scenario: Diálogo largo en teléfono

- **WHEN** se abre el formulario de deuda en 375 × 667 px con todos los campos visibles
- **THEN** el diálogo ocupa como máximo el 90 % de la ventana y sus campos scrollean dentro de él

#### Scenario: Acciones sobre el área segura

- **WHEN** un dispositivo con barra de inicio abre el diálogo de pago de una deuda
- **THEN** el botón de confirmación queda legible y tocable, con padding extra sobre la barra

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
