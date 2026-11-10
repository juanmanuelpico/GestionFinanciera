# Especificación: Deudas

## Purpose

Permite registrar deudas propias (préstamos recibidos, compras en cuotas con tarjeta) y
deudas de terceros (dinero prestado a otras personas), con su calendario de cuotas, el
cobro o pago parcial, la reversión de operaciones y el impacto automático en la billetera
y en los movimientos del usuario.

## ADDED Requirements

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

Al registrar una deuda con una Persona, el sistema DEBE (SHALL) crear el movimiento inicial que
refleja el dinero involucrado. Las deudas con Tarjeta NO DEBE (SHALL) (SHALL NOT)N generar movimiento
inicial.

#### Scenario: Deuda propia con persona

- **WHEN** el usuario registra una deuda propia con una Persona
- **THEN** se crea un movimiento de ingreso por el total en la billetera de la deuda
- **THEN** la observación indica que es un préstamo recibido de esa persona

#### Scenario: Deuda de tercero con persona

- **WHEN** el usuario registra una deuda de tercero con una Persona
- **THEN** se crea un movimiento de egreso por el total en la billetera de la deuda
- **THEN** la observación indica que es un préstamo a esa persona

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
usuario indique, con la fecha real de cobro o pago.

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

El sistema DEBE (SHALL) listar las deudas del usuario separadas por tipo y DEBE (SHALL) permitir filtrar
y paginar los resultados.

#### Scenario: Filtros del listado

- **WHEN** el usuario consulta deudas
- **THEN** el tipo de deuda es obligatorio
- **THEN** puede filtrar por estado, tipo de actor, billetera y texto de búsqueda sobre el
  actor
- **THEN** las deudas activas se muestran antes que las finalizadas y, dentro de cada
  grupo, las más recientes primero

#### Scenario: Resumen de una deuda

- **WHEN** el usuario consulta una deuda
- **THEN** la respuesta incluye sus cuotas y el resumen con cuotas pagadas, importe
  pagado, saldo restante y próximo vencimiento pendiente
- **THEN** el próximo vencimiento solo se informa para deudas activas
- **THEN** se indica si la deuda tiene una operación de cobro o pago activa

### Requirement: Pantalla de deudas

La pantalla DEBE (SHALL) ofrecer tres solapas: "Deudas Propias", "Deudas de Terceros" y
"Actores", manteniendo la solapa activa en la URL.

#### Scenario: Alta según la solapa activa

- **WHEN** el usuario presiona "Agregar" en "Deudas Propias", "Deudas de Terceros" o
  "Actores"
- **THEN** se abre el formulario correspondiente con el tipo de deuda o de actor
  precargado

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

### Requirement: Aislamiento por usuario

Las deudas y los actores de otro usuario NO DEBE (SHALL) (SHALL NOT)N ser visibles ni modificables.

#### Scenario: Acceso a un recurso ajeno

- **WHEN** un usuario consulta o modifica una deuda o un actor que pertenece a otro usuario
- **THEN** el backend responde 404
