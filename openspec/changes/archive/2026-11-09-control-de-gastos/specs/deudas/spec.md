# Spec Delta: Deudas

## Purpose

Pagar cuotas de una deuda propia genera un egreso en la billetera de la deuda, por lo que ese
egreso puede cruzar el umbral mensual de la categoría de deudas. Este delta agrega al requisito
de liquidación el aviso de umbral en la respuesta y su banner en la solapa correspondiente.

## MODIFIED Requirements

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
