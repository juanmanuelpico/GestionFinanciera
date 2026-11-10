# medios-de-pago Specification

## Purpose
Definir un catálogo fijo de medios de pago, su uso en el formulario de movimientos y la
posibilidad de habilitar solo los que cada usuario utiliza.

## Requirements

### Requirement: Catálogo fijo de medios de pago

El sistema SHALL exponer un catálogo cerrado de medios de pago con los valores Efectivo,
Débito, Crédito, Transferencia, Mercado Pago y Otro. Todo movimiento SHALL registrar su
medio de pago con un valor de ese catálogo o sin medio de pago.

#### Scenario: Rechazo de un valor fuera del catálogo

- **WHEN** se intenta guardar un movimiento con un medio de pago que no pertenece al catálogo
- **THEN** el backend rechaza la solicitud con un error de validación

#### Scenario: Movimiento sin medio de pago

- **WHEN** se guarda un movimiento sin seleccionar medio de pago
- **THEN** el movimiento se crea con el medio vacío

#### Scenario: Etiqueta legible

- **WHEN** se listan movimientos con medio de pago
- **THEN** cada medio se muestra con su etiqueta legible en español, no con el identificador interno

### Requirement: Combobox de medio de pago en el formulario

El formulario de alta y edición de movimientos SHALL presentar el medio de pago como un
combobox con los medios habilitados por el usuario. El campo SHALL seguir siendo opcional.

#### Scenario: Opciones limitadas a los medios habilitados

- **WHEN** el usuario abre el formulario de movimiento
- **THEN** el combobox ofrece únicamente los medios que el usuario tiene habilitados

#### Scenario: Edición de un movimiento con medio deshabilitado

- **WHEN** se edita un movimiento cuyo medio de pago ya no está habilitado
- **THEN** ese valor se mantiene visible y seleccionado para no alterar el registro

### Requirement: Sección de medios de pago en Configuración

Configuración SHALL incluir una sección "Medios de pago" con un checkbox por cada medio del
catálogo. La selección SHALL persistirse por usuario y SHALL mantener al menos un medio
habilitado. Por defecto, todos los medios SHALL estar habilitados.

#### Scenario: Persistencia de la selección

- **WHEN** el usuario marca o desmarca un medio de pago
- **THEN** la preferencia se guarda y se conserva al volver a iniciar sesión

#### Scenario: Intento de deshabilitar el último medio

- **WHEN** el usuario intenta desmarcar el único medio habilitado
- **THEN** el sistema rechaza la acción y muestra un mensaje explicativo

#### Scenario: Propagación al formulario de movimientos

- **WHEN** el usuario cambia los medios habilitados
- **THEN** el combobox del formulario de movimientos refleja la nueva selección
