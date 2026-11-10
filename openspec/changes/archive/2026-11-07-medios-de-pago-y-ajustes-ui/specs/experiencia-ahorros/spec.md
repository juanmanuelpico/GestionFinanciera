# Spec Delta: Experiencia de ahorros

## Purpose

Mantener la acción de alta de ahorro visible y accesible desde el encabezado de la
pantalla y simplificar el etiquetado del formulario.

> Actualizado el 5 de noviembre de 2026: la acción de alta pasó del bloque de resumen
> al encabezado de la pantalla (extremo superior derecho).

## ADDED Requirements

### Requirement: Acción de alta en el encabezado

La pantalla de Ahorros SHALL ofrecer la acción "Agregar ahorro" como botón clásico en el
extremo superior derecho del encabezado. La pantalla NO SHALL mostrar el botón de alta
dentro del bloque de resumen ni el subtítulo "Resumen por moneda".

#### Scenario: Encabezado con acción de alta

- **WHEN** el usuario abre la pantalla de Ahorros
- **THEN** el encabezado muestra el botón "Agregar ahorro" a la derecha del título

#### Scenario: Alta desde el encabezado

- **WHEN** el usuario activa el botón "Agregar ahorro"
- **THEN** se abre el formulario de alta de ahorro

#### Scenario: Subtítulo eliminado

- **WHEN** el usuario abre la pantalla de Ahorros
- **THEN** no se muestra el subtítulo "Resumen por moneda"

### Requirement: Etiqueta del campo de cotización manual

El campo de cotización manual del formulario de alta de ahorro SHALL rotularse
"Cotización".

#### Scenario: Selección de cotización manual

- **WHEN** el usuario elige la cotización manual en el formulario de alta
- **THEN** el campo de importe de la cotización se muestra con la etiqueta "Cotización"
