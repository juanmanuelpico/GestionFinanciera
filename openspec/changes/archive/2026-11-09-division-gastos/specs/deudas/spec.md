# Spec Delta: Deudas

## Purpose

La pantalla de Deudas incorpora la pestaña "División de Gastos" (capability `division-de-gastos`)
entre "Deudas de Terceros" y "Actores". Este delta actualiza el requisito de la pantalla para
cuatro solapas y el comportamiento del botón "Agregar" en la nueva; las deudas generadas por una
división se administran con los requisitos ya aprobados de cobro, pago y deshacer.

## MODIFIED Requirements

### Requirement: Pantalla de deudas

La pantalla DEBE (SHALL) ofrecer cuatro solapas: "Deudas Propias", "Deudas de Terceros",
"División de Gastos" y "Actores", manteniendo la solapa activa en la URL.

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
- **THEN** la solapa activa se conserva en el parámetro `tab` de la URL
  (`propias`, `terceros`, `division` o `actores`) y al volver desde "Deudas Propias" se
  limpia el parámetro

#### Scenario: Listado y acciones

- **WHEN** el usuario ve el listado de deudas
- **THEN** cada deuda muestra actor, importe, cuotas, próximo cobro o vencimiento y estado
- **THEN** la acción se rotula "Cobrar" para deudas de terceros y "Pagar" para deudas
  propias
- **THEN** las acciones de cobro, pago y deshacer solo están disponibles para deudas
  activas con operaciones activas
- **THEN** en mobile el listado se presenta como tarjetas, sin desborde horizontal

#### Scenario: Formulario de pago

- **WHEN** el usuario abre el formulario de cobro o pago
- **THEN** puede elegir la cantidad de cuotas pendientes y la fecha real de la operación
- **THEN** para deudas con personas puede editar el importe de cada cuota seleccionada
- **THEN** el formulario impide importes inválidos y un total mayor al saldo restante
- **THEN** si el egreso de una deuda propia supera el disponible, se muestra una
  advertencia antes de confirmar
