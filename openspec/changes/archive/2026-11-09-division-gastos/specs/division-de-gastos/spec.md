# Spec Delta: División de Gastos

## Purpose

Permite registrar un gasto común indicando cuánto gastó cada persona (actor) y cuánto gastó el
usuario, para que el sistema genere automáticamente las deudas y movimientos que quedan
pendientes ("cuánto me deben / cuánto debo"). La división queda guardada con su historial en la
pestaña "División de Gastos" de la pantalla de Deudas y puede eliminarse restableciendo todo el
circuito generado.

## ADDED Requirements

### Requirement: Entidad de división de gastos

El sistema DEBE (SHALL) persistir cada división como una entidad propia (`debt_splits`) con
código `DG<n>` único por usuario, billetera, gasto total, parte del usuario, actor pagador
(si pagó un actor), descripción obligatoria y fecha de operación, con una fila por actor
(`debt_split_items`) única por división y actor. Cada deuda generada DEBE (SHALL) quedar
vinculada a su división mediante `debts.splitId`.

#### Scenario: Código único por usuario

- **WHEN** el usuario confirma divisiones en su cuenta
- **THEN** cada una recibe el siguiente `DG<n>` de una secuencia propia generada dentro de
  la transacción del alta, y la base garantiza la unicidad por (usuario, código)

#### Scenario: Deuda generada con su propio código

- **WHEN** una división genera deudas
- **THEN** cada deuda generada recibe además su código `DP`/`DT` según su tipo, con las
  reglas de la capability `deudas`

#### Scenario: Registro persistido con sus partes

- **WHEN** se confirma una división de 1.000 con parte del usuario de 400 y dos actores de 300
- **THEN** se guarda la división con su código (p. ej. `DG1`), total 1000.00, parte propia
  400.00 y dos ítems de 300.00 con su actor
- **THEN** la fecha de operación es el día del alta (la fija el servidor) y el vencimiento de
  las cuotas generadas es un mes después

#### Scenario: Actores repetidos en la misma división

- **WHEN** se envía el mismo actor en dos filas
- **THEN** el backend rechaza la operación con un error de validación en español

### Requirement: Registro de una división

El sistema DEBE (SHALL) crear la división y todo su circuito en una sola operación autenticada
(`POST /api/debt-splits`), validando todas las reglas en el servidor y ejecutando las escrituras
en una transacción con aislamiento serializable. La suma de "tu parte" más las partes de los
actores DEBE (SHALL) ser exactamente igual al gasto total, al centavo.

#### Scenario: Partes que no cierran con el total

- **WHEN** la suma de las partes es distinta del gasto total, aunque la diferencia sea un
  centavo
- **THEN** el backend rechaza la operación con 400 y no se crea ningún registro

#### Scenario: Límites de importes y cantidad de actores

- **WHEN** el total no es mayor a 0, alguna parte es negativa o tiene más de dos decimales o
  supera 9.999.999.999,99, o la división tiene menos de 1 o más de 50 actores
- **THEN** el backend rechaza la operación con un mensaje de validación en español

#### Scenario: Actores que no pueden participar

- **WHEN** algún actor no existe o pertenece a otro usuario, o es de tipo Tarjeta
- **THEN** el backend rechaza la operación (404 inexistentes/ajenos, 400 tarjetas) y no se crea
  la división

#### Scenario: Billetera no habilitada

- **WHEN** se registra una división en una moneda fuera del catálogo `ARS`/`USD`/`EUR` o no
  habilitada para el usuario
- **THEN** el backend rechaza la operación con 400

#### Scenario: Descripción obligatoria

- **WHEN** se confirma una división sin descripción o con solo espacios
- **THEN** el backend rechaza la operación con 400 y el mensaje "La descripción es
  obligatoria" y no se crea ningún registro
- **THEN** el formulario rotula el campo "Descripción del gasto *" obligatorio, muestra
  "Ingresá una descripción del gasto" y no llama a la API
- **WHEN** el usuario informa una descripción de hasta 500 caracteres
- **THEN** se recorta al trim y se guarda en la división
- **THEN** se propaga a las deudas y movimientos generados con un prefijo identificatorio
  que incluye los códigos de la división y de cada deuda (ver requisitos de circuito)

#### Scenario: Conflicto de serialización

- **WHEN** la transacción choca por serialización con otra operación financiera concurrente
- **THEN** el backend responde 409 con un mensaje que invita a reintentar

### Requirement: Reparto automático en el formulario

El formulario DEBE (SHALL) completar por defecto la parte de cada actor repartiendo en partes
iguales el resto `(gasto total − tu parte) / cantidad de actores`, con los centavos sueltos
absorbidos por la última fila recalculada. Al editar el importe de un actor DEBE (SHALL)
recalcular en cascada solo las filas por debajo, y DEBE (SHALL) bloquear la confirmación mientras
las partes no sumen exactamente el total.

#### Scenario: Reparto por defecto

- **WHEN** el usuario carga un total de 100, "tu parte" de 40 y un único actor
- **THEN** la fila del actor se completa con 60.00 y el mensaje en vivo confirma que las partes
  suman exactamente el total

#### Scenario: Ajuste de centavos

- **WHEN** el resto a repartir no divide exactamente entre los actores
- **THEN** cada parte se trunca al centavo hacia abajo y la última fila recalculada absorbe la
  diferencia, de modo que la suma cierre al centavo

#### Scenario: Edición en cascada

- **WHEN** el usuario edita el importe de un actor intermedio de la lista
- **THEN** solo los actores por debajo se recalculan en partes iguales; la fila editada, las de
  arriba y "tu parte" quedan intactos
- **WHEN** el usuario edita el total o "tu parte"
- **THEN** se recalculan únicamente las filas todavía no fijadas

#### Scenario: Confirmación bloqueada

- **WHEN** la suma de las partes es distinta del gasto total
- **THEN** el botón "Confirmar división" está deshabilitado y se muestra en rojo cuánto falta o
  cuánto sobra respecto del total

### Requirement: Alta de persona desde el selector

Cada selector de actor de la división DEBE (SHALL) ofrecer la acción "Agregar persona", que abre
el formulario de creación de actor con el tipo bloqueado en "Persona" (no modificable). Al
confirmar la creación, el sistema DEBE (SHALL) preseleccionar la persona creada en esa fila del
formulario de división.

#### Scenario: Crear y preseleccionar

- **WHEN** el usuario presiona "Agregar persona" en una fila, completa nombre y apellido y crea
  la persona
- **THEN** el actor queda seleccionado en esa fila sin cerrar el formulario de división

#### Scenario: Tipo bloqueado

- **WHEN** se abre el formulario desde "Agregar persona"
- **THEN** el campo tipo aparece deshabilitado con el valor "Persona" y el título del diálogo es
  "Nueva persona"

### Requirement: Circuito generado según quién pagó la cuenta

El sistema DEBE (SHALL) registrar quién pagó el total de la cuenta —el usuario o uno de los
actores seleccionados— y generar el circuito correspondiente en la billetera de la división:
deudas de terceros con sus egresos si paga el usuario, o una única deuda propia sin movimientos
si paga un actor. El backend DEBE (SHALL) exigir que el pagador sea un actor de las filas.

#### Scenario: Paga el usuario

- **WHEN** se confirma una división de 1.000 (usuario 400, Juan 300, Ana 300) pagando el usuario
- **THEN** se crea una deuda `TERCERO` de 1 cuota, vinculada a la división, por cada actor con
  parte mayor a 0, con su movimiento inicial de egreso (rol `INICIAL`, categoría "Deudas")
- **THEN** la nota de cada deuda generada es `Deuda por división DG<n>: <descripción>`
- **THEN** la nota de cada egreso inicial es
  `<código de la deuda> — Préstamo a <actor> (por división DG<n>): <descripción>`
- **THEN** se crea un egreso de 400 sin deuda asociada por "tu parte", con la categoría
  "Gasto fijo" auto-creada o reutilizada, y se guarda ese movimiento en la división
- **THEN** la nota de ese egreso propio es `DG<n> — Mi parte de un gasto común: <descripción>`
- **THEN** el total del gasto se descuenta del disponible de la billetera

#### Scenario: Actor con parte en cero

- **WHEN** un actor de la división tiene parte 0
- **THEN** no se crea deuda ni movimiento para ese actor (su fila queda registrada en la
  división como historial)

#### Scenario: Disponible insuficiente

- **WHEN** paga el usuario y el total del gasto supera el disponible de la billetera
- **THEN** el backend rechaza la operación informando el disponible y el importe necesario, y
  no se crea nada

#### Scenario: Pagó un actor

- **WHEN** se confirma la misma división pagando Juan
- **THEN** se crea una única deuda `PROPIA` de 1 cuota hacia Juan por 400 ("tu parte"),
  vinculada a la división y sin generar ningún movimiento
- **THEN** la nota de la deuda es `Deuda con <actor> por división DG<n>: <descripción>`
- **THEN** no se descuenta nada del disponible y las partes de los demás actores no generan
  deudas

#### Scenario: Pagó un actor y tu parte es cero

- **WHEN** se envía `payer = ACTOR` con "tu parte" igual a 0
- **THEN** el backend rechaza la operación con un mensaje que exige parte mayor a 0

#### Scenario: Pagador fuera de la división

- **WHEN** el pagador informado no es uno de los actores de las filas
- **THEN** el backend rechaza la operación con 400

### Requirement: Listado de divisiones

El sistema DEBE (SHALL) listar las divisiones del usuario autenticado con paginación
(`GET /api/debt-splits`), más recientes primero, y DEBE (SHALL) aceptar el parámetro
opcional `search` para filtrar por nota o código sin distinguir mayúsculas. La pestaña DEBE
(SHALL) mostrarlas con estados de carga, error con reintento, vacío y paginación.

#### Scenario: Datos de cada división listada

- **WHEN** el usuario consulta sus divisiones
- **THEN** cada respuesta expone su `code`, billetera, total, "tu parte", pagador con su
  nombre para mostrar, nota, fecha de operación, partes por actor y las deudas generadas con
  su tipo e importe

#### Scenario: Presentación en la pestaña

- **WHEN** el usuario ve la pestaña "División de Gastos"
- **THEN** cada división muestra primero su código (p. ej. `DG2`), luego la nota (o
  "División de gastos" si el registro histórico no la tiene), la fecha, el total, el rótulo
  del pagador, una línea por parte incluida "Tu parte" y un badge con la cantidad de
  deudas generadas
- **THEN** la pestaña ofrece el campo "Buscar por descripción o código" (p. ej.
  "Ej: asado, DG1") que filtra el listado y reinicia la paginación
- **THEN** el listado pagina de a 20 con controles Anterior/Siguiente y total de divisiones

#### Scenario: Búsqueda por código

- **WHEN** el usuario escribe `DG1` en el buscador de la pestaña
- **THEN** se muestran solo las divisiones cuyo código contiene ese texto, sin distinguir
  mayúsculas

#### Scenario: Sin divisiones

- **WHEN** el usuario abre la pestaña sin divisiones registradas
- **THEN** ve el estado vacío que invita a usar el botón Agregar

### Requirement: Eliminación de una división con restablecimiento

El sistema DEBE (SHALL) permitir eliminar una división restableciendo todo el circuito generado
y recuperando el disponible de la billetera, y NO DEBE (SHALL)N permitir eliminarla si alguna
cuota de sus deudas ya tiene importes cobrados o pagados.

#### Scenario: Restablecimiento completo

- **WHEN** el usuario elimina una división pagada por él mismo sin cobros registrados
  (`DELETE /api/debt-splits/:id`, respuesta 204)
- **THEN** desaparecen las deudas vinculadas con sus cuotas, operaciones de cobro/pago y
  movimientos —incluidos los egresos iniciales de terceros y el egreso de la parte propia— junto
  con la división y sus ítems
- **THEN** el disponible de la billetera vuelve a incluir el total descontado

#### Scenario: Cuotas ya cobradas o pagadas

- **WHEN** alguna deuda generada tiene una cuota con importe cobrado o pagado
- **THEN** el backend rechaza la eliminación con un mensaje en español que exige deshacer los
  cobros o pagos primero y no elimina nada

#### Scenario: Confirmación en la interfaz

- **WHEN** el usuario presiona "Eliminar" en una división
- **THEN** se abre un diálogo de confirmación destructiva que informa la cantidad de deudas que
  se eliminarán y que se restablecerá el dinero descontado
- **THEN** al confirmar, la división sale del listado y se actualizan deudas, actores,
  disponible y movimientos

### Requirement: Aislamiento por usuario de las divisiones

Las divisiones de otro usuario NO DEBE (SHALL)N ser visibles ni modificables.

#### Scenario: Acceso a una división ajena

- **WHEN** un usuario elimina una división de otro usuario
- **THEN** el backend responde 404 y no modifica nada

#### Scenario: Actores ajenos en las filas

- **WHEN** una fila referencia a un actor que no pertenece al usuario
- **THEN** el backend rechaza el alta con 404
