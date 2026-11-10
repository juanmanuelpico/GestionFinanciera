# Spec Delta: Movimientos y Categorías

## Purpose

Extiende las categorías existentes con el "Umbral máximo" mensual (importe + moneda) que
usa la pantalla de Control de Gastos: el campo se guarda, se valida en la API y se edita
desde el popup de categoría. Los requisitos modificados reproducen el texto aprobado y le
agregan el umbral.

## MODIFIED Requirements

### Requirement: Tabla Categoria

El sistema DEBE (SHALL) contar con una entidad independiente de categorías para clasificar los
movimientos, con `id` autonumerado como clave primaria, `name`, `type` opcional (`INGRESO` o
`EGRESO`), un `thresholdAmount` decimal opcional (umbral máximo de egresos por mes, con hasta
dos decimales) con su `thresholdCurrency` opcional (`ARS`, `USD` o `EUR`) y timestamps de
auditoría `createdAt`/`updatedAt`.

#### Scenario: Modelo de datos de categorías

- **WHEN** se aplica el esquema de la base de datos
- **THEN** existe la tabla `categories` con los campos `id`, `name`, `type` (opcional),
  `thresholdAmount` (opcional), `thresholdCurrency` (opcional), `createdAt` y `updatedAt`

### Requirement: CRUD de Categoría (API y UI)

El sistema DEBE (SHALL) permitir crear, listar, editar y eliminar las categorías del usuario
autenticado, tanto en la API como en la interfaz. El alta y la edición DEBE (SHALL) aceptar
el umbral máximo (`thresholdAmount`, no negativo y con hasta dos decimales) y su moneda
(`thresholdCurrency`). Umbral vacío o `0` deja la categoría sin control; un umbral mayor que
`0` sin moneda y un umbral negativo son rechazados por el backend con 400.

#### Scenario: Operaciones sobre las propias categorías

- **WHEN** el usuario autenticado usa la API `/categories` o la pantalla `/categories`
- **THEN** puede crear, listar, editar y eliminar sus categorías

#### Scenario: Borrado de una categoría en uso

- **WHEN** se intenta eliminar una categoría que tiene movimientos asociados
- **THEN** la eliminación se rechaza y la categoría sigue existiendo

#### Scenario: Alta con umbral máximo y moneda

- **WHEN** el usuario crea la categoría "Alimentos" con umbral 50000 y moneda ARS
- **THEN** la categoría se guarda con `thresholdAmount` "50000.00" y `thresholdCurrency`
  "ARS"
- **THEN** la columna "Umbral" de la pantalla de categorías muestra "AR$ 50.000,00 / mes"

#### Scenario: Umbral vacío deja la categoría sin control

- **WHEN** el usuario deja el campo "Umbral máximo" vacío o informa `0` (en la UI o en la
  API)
- **THEN** `thresholdAmount` y `thresholdCurrency` quedan `null`, la columna muestra "Sin
  umbral" y la categoría no aparece en Control de Gastos

#### Scenario: Umbral sin moneda rechazado

- **WHEN** se informa un umbral mayor que `0` sin moneda del umbral
- **THEN** la UI bloquea el guardado con "Elegí la moneda del umbral"
- **THEN** el backend responde 400 con "El umbral máximo requiere una moneda (ARS, USD o
  EUR)"

#### Scenario: Umbral negativo o con más de dos decimales rechazado

- **WHEN** el umbral es negativo
- **THEN** la UI muestra "El umbral debe ser un importe mayor o igual a 0" y el backend
  responde 400 con "El umbral máximo no puede ser negativo"
- **WHEN** el umbral tiene más de dos decimales o supera el máximo permitido
- **THEN** la UI muestra "El umbral debe tener como máximo 2 decimales" y el backend rechaza
  la operación con 400

#### Scenario: Moneda del umbral fuera del catálogo

- **WHEN** se envía una `thresholdCurrency` distinta de `ARS`, `USD` o `EUR`
- **THEN** el backend rechaza la operación con 400 y la categoría no se modifica

#### Scenario: Edición que no menciona el umbral conserva el valor

- **WHEN** una actualización de categoría informa solo el nombre o el tipo, sin campos de
  umbral
- **THEN** el umbral y la moneda existentes se mantienen sin cambios
