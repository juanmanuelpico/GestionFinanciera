# Spec Delta: Gastos fijos

## Purpose

El pago de un gasto fijo genera un egreso, así que también puede cruzar el umbral mensual de
la categoría. Este delta modifica el requisito de pago para exigir que la respuesta informe el
aviso de umbral y que la pantalla lo muestre, sin cambiar el resto del flujo.

## MODIFIED Requirements

### Requirement: Pago de un período

El sistema DEBE (SHALL) permitir pagar un período de un gasto fijo activo y DEBE (SHALL) generar el
movimiento de egreso asociado en una sola transacción. Tras el pago, la respuesta DEBE (SHALL)
informar el aviso de umbral cuando el egreso cruza el umbral mensual de la categoría del gasto.

#### Scenario: Validaciones del pago

- **WHEN** el gasto está inactivo
- **THEN** el backend rechaza el pago e indica que debe reactivarlo
- **WHEN** el gasto no vence en el período informado
- **THEN** el backend rechaza el pago
- **WHEN** el período es futuro
- **THEN** el backend rechaza el pago
- **WHEN** la categoría del gasto es de ingreso
- **THEN** el backend rechaza el pago

#### Scenario: Movimiento generado

- **WHEN** el usuario paga un período
- **THEN** se crea un egreso por el importe real pagado, en la moneda del gasto, con la
  categoría del gasto, la fecha de pago y el medio de pago elegido
- **THEN** la observación incluye el detalle del usuario, el título del gasto y el período
- **THEN** el pago queda asociado al gasto, al período y al movimiento generado

#### Scenario: Pago duplicado

- **WHEN** ya existe un pago para ese gasto y período
- **THEN** el backend responde 409 e informa que el período ya fue pagado

#### Scenario: Conflicto de concurrencia

- **WHEN** otra operación financiera interfiere con el pago
- **THEN** el backend responde 409 y sugiere reintentar

#### Scenario: Aviso de umbral al pagar

- **WHEN** el egreso del pago deja el acumulado del mes calendario UTC de la fecha de pago,
  en la moneda del gasto, en el 80 % o más del umbral de la categoría
- **THEN** la respuesta del pago incluye `spendingAlert` con `status` `WARNING` o `EXCEEDED`
  y la pantalla Gastos fijos muestra el banner ámbar o rojo bajo el encabezado
- **WHEN** la categoría no tiene umbral, el umbral está en otra moneda o el acumulado sigue
  por debajo del 80 %
- **THEN** el pago se registra igual y la respuesta no incluye aviso
