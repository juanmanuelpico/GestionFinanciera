# Especificación: Movimientos y Categorías

## Purpose

Permite registrar los movimientos financieros (ingresos y egresos) de cada usuario y las
categorías que los clasifican, con CRUD completo en API y UI, listado con filtros y paginación,
alta en popup y aislamiento total por usuario. Las equivalencias entre los nombres en español del
pedido (`proposal.md`) y los identificadores del código, junto con la verificación de cumplimiento
realizada, se conservan en `design.md`.

## ADDED Requirements

### Requirement: Tabla Categoria

El sistema DEBE (SHALL) contar con una entidad independiente de categorías para clasificar los
movimientos, con `id` autonumerado como clave primaria, `name`, `type` opcional (`INGRESO` o
`EGRESO`) y timestamps de auditoría `createdAt`/`updatedAt`.

#### Scenario: Modelo de datos de categorías

- **WHEN** se aplica el esquema de la base de datos
- **THEN** existe la tabla `categories` con los campos `id`, `name`, `type` (opcional),
  `createdAt` y `updatedAt`

### Requirement: CRUD de Categoría (API y UI)

El sistema DEBE (SHALL) permitir crear, listar, editar y eliminar las categorías del usuario
autenticado, tanto en la API como en la interfaz.

#### Scenario: Operaciones sobre las propias categorías

- **WHEN** el usuario autenticado usa la API `/categories` o la pantalla `/categories`
- **THEN** puede crear, listar, editar y eliminar sus categorías

#### Scenario: Borrado de una categoría en uso

- **WHEN** se intenta eliminar una categoría que tiene movimientos asociados
- **THEN** la eliminación se rechaza y la categoría sigue existiendo

### Requirement: Tabla Movimientos con PK compuesta

El sistema DEBE (SHALL) almacenar los movimientos con clave primaria compuesta `(userId, id)`,
donde `id` es autonumerado por usuario.

#### Scenario: Numeración independiente por usuario

- **WHEN** usuarios distintos registran movimientos
- **THEN** la clave primaria de cada movimiento es `(userId, id)`
- **THEN** el contador de `id` es independiente por usuario

### Requirement: Campos obligatorios del movimiento

El sistema DEBE (SHALL) exigir `type`, `amount`, `categoryId`, `movementDate` y `currency` para
registrar un movimiento.

#### Scenario: Rechazo en el backend

- **WHEN** falta el tipo, la moneda o la fecha al dar de alta un movimiento
- **THEN** el backend rechaza la operación y no guarda el movimiento

#### Scenario: Bloqueo en la interfaz

- **WHEN** algún campo obligatorio está vacío en el formulario de alta
- **THEN** la UI bloquea el guardado y muestra la validación de forma visible

### Requirement: Valores por defecto

El sistema DEBE (SHALL) inicializar el popup de alta con `currency` = `ARS` (etiqueta
"Pesos (ARS)") y `movementDate` con la fecha y hora actual.

#### Scenario: Apertura del popup de alta

- **WHEN** el usuario abre el popup de alta de un movimiento
- **THEN** la moneda aparece preseleccionada en "Pesos (ARS)"
- **THEN** la fecha del movimiento trae la fecha y hora actual del sistema

### Requirement: Campos opcionales

El sistema DEBE (SHALL) aceptar `paymentMethod` y `note` como campos opcionales (nullable).
`paymentMethod` DEBE (SHALL) usar el catálogo fijo `PaymentMethod` (Efectivo, Débito, Crédito,
Transferencia, Mercado Pago, Otro).

#### Scenario: Alta sin campos opcionales

- **WHEN** un movimiento se registra sin medio de pago ni observación
- **THEN** la operación es válida y ambos campos quedan vacíos

#### Scenario: Selección del medio de pago

- **WHEN** el usuario elige el medio de pago del movimiento
- **THEN** solo se ofrecen las opciones del catálogo fijo `PaymentMethod`

### Requirement: Navegación

El sistema DEBE (SHALL) mostrar en el menú el punto "Movimientos" (renombrado desde
"Transacciones") inmediatamente después de "Dashboard".

#### Scenario: Rótulo y posición en el menú

- **WHEN** el usuario visualiza el menú de navegación
- **THEN** ve "Movimientos" justo después de "Dashboard" y ya no existe la entrada
  "Transacciones"

### Requirement: Listado con filtros y paginación

El sistema DEBE (SHALL) abrir la pantalla de movimientos con el listado paginado y filtros por
rango de fechas, categoría y tipo.

#### Scenario: Vista inicial del listado

- **WHEN** el usuario abre la pantalla de movimientos
- **THEN** ve sus movimientos en una tabla paginada

#### Scenario: Filtros de búsqueda

- **WHEN** el usuario aplica el rango de fechas, la categoría y/o el tipo
- **THEN** el listado muestra solo los movimientos que coinciden con los filtros

### Requirement: Creación en popup

El sistema DEBE (SHALL) ofrecer en la pantalla de consulta un botón principal que abre el
formulario de alta en un modal.

#### Scenario: Alta desde el listado

- **WHEN** el usuario presiona el botón principal de la pantalla de movimientos
- **THEN** se abre el formulario de alta en un popup (modal)

### Requirement: Autorización por usuario

Los movimientos y categorías de otro usuario NO DEBE (SHALL NOT) ser visibles ni modificables.

#### Scenario: Acceso a registros ajenos

- **WHEN** un usuario consulta o intenta modificar un movimiento o una categoría de otro usuario
- **THEN** el backend responde 404 y el registro ajeno no se expone ni se modifica
