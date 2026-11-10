# Especificación: Gastos fijos

## Purpose

Permite registrar compromisos recurrentes (alquiler, servicios, impuestos), proyectarlos
mes a mes, pagar el período correspondiente generando el egreso automático y consultar el
historial de pagos. Complementa a Movimientos: el pago de un gasto fijo siempre produce un
movimiento de egreso.

## ADDED Requirements

### Requirement: Registro de gastos fijos

El sistema DEBE (SHALL) permitir crear, listar, editar y activar o desactivar gastos fijos del
usuario autenticado.

#### Scenario: Alta de un gasto fijo

- **WHEN** el usuario registra un gasto fijo con título, importe, moneda, categoría, primer
  vencimiento, frecuencia y estado
- **THEN** el gasto se guarda con el día habitual derivado del primer vencimiento
- **THEN** el estado por defecto es activo
- **THEN** el listado muestra el título, la categoría, la frecuencia, el próximo
  vencimiento, el importe y el estado

#### Scenario: Validaciones del alta

- **WHEN** el título está vacío o supera los 120 caracteres
- **THEN** el backend rechaza la operación
- **WHEN** el importe es menor o igual a 0 o tiene más de dos decimales
- **THEN** el backend rechaza la operación
- **WHEN** la frecuencia no es un entero entre 1 y 120 meses
- **THEN** el backend rechaza la operación
- **WHEN** la moneda no es `ARS`, `USD` o `EUR`, o no está habilitada para el usuario
- **THEN** el backend rechaza la operación
- **WHEN** la categoría no pertenece al usuario
- **THEN** el backend responde 404
- **WHEN** la categoría es de ingreso
- **THEN** el backend rechaza la operación porque debe ser de egreso o sin tipo

#### Scenario: Edición

- **WHEN** el usuario edita un gasto fijo
- **THEN** puede cambiar título, importe, moneda, categoría, primer vencimiento,
  frecuencia y estado
- **THEN** al cambiar el primer vencimiento se actualiza el día habitual

#### Scenario: Activación y desactivación

- **WHEN** el usuario desactiva un gasto fijo
- **THEN** el gasto deja de ofrecer el pago y su próximo vencimiento queda vacío
- **THEN** el gasto desactivado sigue visible en la previsión de los períodos en los que
  vence, identificado como "Inactivo"

### Requirement: Previsión mensual

El sistema DEBE (SHALL) calcular, para un período `YYYY-MM`, todos los gastos fijos que vencen en
ese período, incluyendo los inactivos, e indicar si ya fueron pagados.

#### Scenario: Vencimiento según frecuencia

- **WHEN** el usuario consulta un período
- **THEN** se incluyen los gastos cuyo primer vencimiento y frecuencia determinan que
  vencen en ese período
- **THEN** la fecha de vencimiento se recorta al último día del mes cuando el día habitual
  no existe en ese mes

#### Scenario: Estado de la previsión

- **WHEN** el gasto no tiene un pago registrado en el período
- **THEN** la previsión se muestra como `PENDIENTE`
- **WHEN** el gasto tiene un pago registrado en el período
- **THEN** la previsión se muestra como `PAGADO` con el importe y la moneda realmente
  pagados
- **WHEN** el gasto está inactivo y pendiente
- **THEN** se muestran las etiquetas "Pendiente" e "Inactivo" y no se ofrece pagar

#### Scenario: Pago de un gasto que ya no vence

- **WHEN** un gasto tiene un pago registrado en el período pero su definición actual ya no
  lo hace vencer en ese período
- **THEN** el pago igual se incluye en la previsión como `PAGADO`

#### Scenario: Período vacío

- **WHEN** ningún gasto fijo vence en el período consultado
- **THEN** la pantalla muestra un estado vacío con la opción de crear un gasto fijo

### Requirement: Pago de un período

El sistema DEBE (SHALL) permitir pagar un período de un gasto fijo activo y DEBE (SHALL) generar el
movimiento de egreso asociado en una sola transacción.

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

### Requirement: Historial de pagos

El sistema DEBE (SHALL) permitir consultar todos los pagos de un gasto fijo.

#### Scenario: Historial con datos

- **WHEN** el usuario abre el historial de un gasto fijo
- **THEN** ve el resumen del gasto (título, categoría, frecuencia, importe estimado,
  estado, próximo vencimiento y día habitual)
- **THEN** ve una tabla con período, vencimiento, fecha de pago, importe, medio de pago,
  categoría del egreso y número de movimiento
- **THEN** en mobile cada pago se muestra como tarjeta, sin desborde horizontal

#### Scenario: Historial vacío

- **WHEN** el gasto fijo todavía no tiene pagos
- **THEN** se muestra un estado vacío explicando que los pagos aparecerán al registrar el
  primero desde la previsión

### Requirement: Filtros de las tablas

Las tablas de la previsión mensual y de "Mis gastos fijos" DEBE (SHALL)N ofrecer filtros por
gasto, categoría y estado, aplicados en el cliente sobre los datos ya cargados.

#### Scenario: Filtros de la previsión mensual

- **WHEN** el usuario escribe en el filtro "Gasto"
- **THEN** se muestran solo las previsiones cuyo título contiene el texto, sin distinguir
  mayúsculas
- **WHEN** el usuario elige una categoría
- **THEN** se muestran solo las previsiones de esa categoría
- **WHEN** el usuario elige un estado
- **THEN** se muestran solo las previsiones "Pendiente" o "Pagado" según corresponda
- **THEN** el filtro de estado incluye la opción "Todos"

#### Scenario: Filtros de Mis gastos fijos

- **WHEN** el usuario filtra por gasto o categoría
- **THEN** se aplican las mismas reglas que en la previsión
- **WHEN** el usuario elige el estado "Activo" o "Inactivo"
- **THEN** se muestran solo los gastos con ese estado

#### Scenario: Sin resultados y limpieza

- **WHEN** los filtros no coinciden con ningún registro
- **THEN** se muestra el mensaje "No hay gastos que coincidan con los filtros" con una
  acción para limpiar
- **WHEN** el usuario presiona "Limpiar filtros"
- **THEN** se restablecen el texto, "Todas" las categorías y "Todos" los estados

#### Scenario: Filtros en mobile

- **WHEN** la pantalla se usa en un ancho de 320 a 414 px
- **THEN** los filtros se apilan en una columna, los controles mantienen 44 px de alto y
  no generan desborde horizontal

### Requirement: Aislamiento por usuario

Los gastos fijos, pagos y categorías de otro usuario NO DEBE (SHALL) (SHALL NOT)N ser visibles ni
modificables.

#### Scenario: Acceso a un gasto ajeno

- **WHEN** un usuario consulta o modifica un gasto fijo que pertenece a otro usuario
- **THEN** el backend responde 404
