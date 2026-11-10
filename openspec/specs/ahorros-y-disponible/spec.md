# ahorros-y-disponible Specification

## Purpose
Permite al usuario ahorrar en las monedas habilitadas (ARS, USD, EUR) manteniendo el
dinero disponible de cada billetera: el alta de un ahorro descuenta del disponible y
genera un egreso en la categoría "Ahorro", la devolución reintegra ese disponible con un
ingreso, y los ajustes y conversiones mueven el ahorro entre monedas sin tocar el
disponible. Cada acción queda registrada en un historial de eventos con el snapshot de la
cotización y del impacto en el dinero disponible del momento.

## Requirements

### Requirement: Disponible en el header

El sistema DEBE (SHALL) mostrar en el header el disponible de la billetera elegida
(ingresos menos egresos de esa moneda), centrado, con mayor jerarquía tipográfica y un
tratamiento sutilmente destacado. El combo de billeteras habilitadas (ARS por defecto)
DEBE (SHALL) mantenerse accesible por separado.

#### Scenario: Cambio de billetera del header

- **WHEN** el usuario cambia la billetera en el combo
- **THEN** se actualiza el disponible mostrado a la moneda elegida
- **THEN** la elección se guarda como preferencia del usuario

### Requirement: Configuración de Ahorros

El sistema DEBE (SHALL) permitir, en la sección "Ahorros" de Configuración, habilitar
monedas (ARS, USD, EUR) y elegir la billetera del header. Por defecto: ARS habilitada y
billetera ARS.

#### Scenario: Deshabilitar una moneda

- **WHEN** el usuario deshabilita una moneda en Configuración > Ahorros
- **THEN** la moneda se oculta del header y de los combos de alta
- **THEN** no se borra ni se bloquea ningún ahorro existente

### Requirement: Posición del menú Ahorros

El sistema DEBE (SHALL) mostrar "Ahorros" en el menú inmediatamente después de
"Movimientos".

#### Scenario: Orden del menú

- **WHEN** se renderiza el menú de navegación
- **THEN** "Ahorros" aparece inmediatamente después de "Movimientos"

### Requirement: Tabla de ahorros

El sistema DEBE (SHALL) persistir los ahorros en la tabla `savings` con: id, userId,
currency, amount, quoteType (BLUE, OFICIAL, MEP, MANUAL), quoteRate (null si ARS),
estimatedDebit, debitCurrency, purchaseDate, note, status (ACTIVO, CERRADO), createdAt,
updatedAt.

#### Scenario: Creación de la tabla por migración

- **WHEN** se aplica la migración de la feature
- **THEN** la tabla `savings` se crea con esos campos

### Requirement: Historial de ahorro

El sistema DEBE (SHALL) registrar las acciones sobre ahorros en la tabla
`savings_events`: id, userId, savingId, type (ALTA, AJUSTE_SUMA, AJUSTE_RESTA,
DEVOLUCION, CONVERSION), amount, currency, quoteType, quoteRate, walletImpactAmount,
walletImpactCurrency, note, createdAt.

#### Scenario: Snapshot por acción

- **WHEN** el usuario realiza una acción sobre un ahorro
- **THEN** se registra exactamente un evento con el snapshot de la cotización y del
  impacto en el dinero disponible del momento

### Requirement: Alta de ahorro

El sistema DEBE (SHALL) ofrecer la acción "Agregar ahorro" como botón clásico en el
extremo superior derecho del encabezado, con campos: moneda (combo, ARS por defecto),
cantidad, cotización (blue, oficial, MEP o manual, con label "Cotización"), billetera de
descuento (combo, ARS por defecto), estimado a descontar, fecha de compra, observación.

#### Scenario: Validaciones del alta

- **WHEN** la cantidad es menor o igual a 0, la moneda está fuera de ARS/USD/EUR o la
  fecha está vacía
- **THEN** el backend rechaza la operación

#### Scenario: Efectos del alta en una transacción

- **WHEN** el alta de ahorro es válida
- **THEN** en una transacción se crea o actualiza la posición activa de la moneda
- **THEN** se registra un EGRESO en la categoría "Ahorro" por el estimado en la billetera
  de descuento
- **THEN** se registra el evento ALTA

#### Scenario: Alta sobre una moneda con posición activa

- **WHEN** ya existe una posición activa en esa moneda
- **THEN** el alta suma el importe y recalcula la cotización promedio ponderada

### Requirement: Estimado a descontar

El sistema DEBE (SHALL) calcular el estimado a descontar según la billetera elegida:

- Billetera = moneda del ahorro: estimado = cantidad.
- Billetera ARS: estimado = cantidad × cotización del ahorro.
- Otra billetera extranjera: estimado = cantidad × cotización del ahorro ÷ cotización
  manual de la billetera.

#### Scenario: Cálculo consistente entre backend y frontend

- **WHEN** se calcula el estimado a descontar
- **THEN** el backend lo calcula con dos decimales
- **THEN** el frontend muestra el mismo valor

### Requirement: Devolver al disponible

El sistema DEBE (SHALL) permitir devolver al disponible desde el totalizador de una
moneda, eligiendo el importe a devolver en esa moneda y la billetera destino (combo, ARS
por defecto). Si la billetera tiene otra moneda, se elige la cotización de la moneda del
ahorro (venta), igual que en el alta. La devolución genera un INGRESO en la categoría
"Ahorro" por el valor equivalente en esa billetera y resta ese importe de la posición.

#### Scenario: Límite del saldo en la devolución

- **WHEN** el usuario intenta devolver más que el saldo de la posición
- **THEN** la operación se rechaza

#### Scenario: Cierre de la posición por devolución total

- **WHEN** la devolución deja el saldo en 0
- **THEN** la posición pasa a CERRADO

#### Scenario: Impacto de la devolución en el disponible

- **WHEN** se concreta una devolución
- **THEN** el disponible de la billetera aumenta exactamente en el importe del INGRESO

#### Scenario: Cotización de origen elegible en la devolución

- **WHEN** el usuario devuelve un ahorro
- **THEN** la cotización de origen es seleccionable (DolarApi o manual) y por defecto usa
  la registrada en el ahorro
- **THEN** permite vender a un valor distinto del de compra

#### Scenario: Evento de devolución

- **WHEN** se concreta una devolución
- **THEN** se registra un evento DEVOLUCION con el importe, la cotización de origen
  elegida y el snapshot del impacto en el disponible

### Requirement: Convertir ahorro

El sistema DEBE (SHALL) permitir cambiar total o parcialmente la posición activa de una
moneda a otra moneda entre ARS, USD y EUR, eligiendo el importe a convertir y la
cotización de origen (venta) además de la de destino. La conversión NO DEBE (SHALL NOT)
generar movimientos ni cambiar el disponible, y DEBE (SHALL) generar un evento
CONVERSION.

#### Scenario: Validaciones de la conversión

- **WHEN** el importe a convertir no es mayor a 0 o supera el saldo de la posición
- **THEN** la operación se rechaza
- **WHEN** se intenta convertir a la misma moneda
- **THEN** la operación se rechaza

#### Scenario: Cotización de origen elegible en la conversión

- **WHEN** el usuario convierte un ahorro
- **THEN** la cotización de origen es seleccionable (DolarApi o manual) y por defecto usa
  la registrada en el ahorro
- **THEN** permite vender a un valor distinto del de compra

#### Scenario: Cálculo del importe convertido

- **WHEN** se realiza una conversión
- **THEN** el importe convertido = importe × cotización de origen ÷ cotización de destino
  (ARS = 1)

#### Scenario: Conversión parcial

- **WHEN** el importe a convertir es parcial
- **THEN** el resto queda en la moneda original

#### Scenario: Fusión con una posición activa destino

- **WHEN** ya existe una posición activa en la moneda destino
- **THEN** los importes se fusionan con cotización ponderada

### Requirement: Ajustar ahorro

El sistema DEBE (SHALL) permitir sumar o restar un importe a la posición activa de una
moneda sin cambiar el disponible, generando un evento AJUSTE_SUMA o AJUSTE_RESTA.

#### Scenario: Rechazo de resta excedida

- **WHEN** el usuario intenta restar más que el importe actual
- **THEN** la operación se rechaza

#### Scenario: Cierre de la posición por ajuste

- **WHEN** el ajuste deja el importe en 0
- **THEN** la posición pasa a CERRADO

### Requirement: Cotizaciones DolarApi

El sistema DEBE (SHALL) exponer desde el backend las cotizaciones blue, oficial y MEP de
DolarApi con caché de 5 minutos. Si DolarApi falla, DEBE (SHALL) responder error
controlado y el frontend DEBE (SHALL) permitir cotización manual.

#### Scenario: Visualización de cotizaciones

- **WHEN** el usuario consulta las cotizaciones en el frontend
- **THEN** se muestran compra y venta de las tres cotizaciones

#### Scenario: Falla de DolarApi

- **WHEN** DolarApi falla
- **THEN** el backend responde error controlado
- **THEN** el frontend permite cotización manual

### Requirement: Resumen por moneda

El sistema DEBE (SHALL) mostrar en la pantalla de ahorros un totalizador por moneda y un
estimado convertido a ARS y USD usando la cotización oficial (venta) de DolarApi; el euro
usa cotización manual ingresada en la pantalla. Cada totalizador DEBE (SHALL) incluir las
acciones Ajustar, Devolver y Convertir. El bloque NO DEBE (SHALL) mostrar el subtítulo
"Resumen por moneda"; la acción "Agregar ahorro" vive en el encabezado.

#### Scenario: Falta la cotización necesaria para el estimado

- **WHEN** no hay cotización disponible para el estimado
- **THEN** el estimado muestra "sin cotización" en lugar de un número

#### Scenario: Acciones de un totalizador sin saldo

- **WHEN** un totalizador no tiene saldo
- **THEN** sus acciones están deshabilitadas

### Requirement: Disponible y ahorros en el dashboard

El sistema DEBE (SHALL) mostrar en el dashboard el disponible por billetera habilitada y
el total de ahorros.

#### Scenario: Carga del dashboard

- **WHEN** el usuario abre el dashboard
- **THEN** se muestra el disponible de cada billetera habilitada
- **THEN** se muestra el total de ahorros

### Requirement: Autorización por usuario

Los ahorros, eventos y cotizaciones de un usuario NO DEBEN (SHALL NOT) ser visibles para
otros usuarios.

#### Scenario: Acceso a datos de otro usuario

- **WHEN** un usuario consulta ahorros, eventos o cotizaciones de otro usuario
- **THEN** el backend responde 404

### Requirement: Diseño de las pantallas de ahorros

Toda pantalla nueva DEBE (SHALL) usar los tokens del sistema de diseño
(`docs/ui/design-system.md`), ser correcta en claro y oscuro, y pasar la revisión mobile
de `mobile-ui`.

#### Scenario: Revisión de una pantalla de la feature

- **WHEN** se crea o modifica una pantalla de ahorros
- **THEN** usa los tokens del sistema de diseño
- **THEN** se muestra correcta en modo claro y oscuro
- **THEN** pasa la revisión mobile de `mobile-ui`

### Requirement: Totalizadores accionables

El sistema DEBE (SHALL) mostrar por cada moneda habilitada un único totalizador con su
saldo, con las acciones Ajustar, Devolver y Convertir en ese totalizador. NO DEBE (SHALL
NOT) mostrarse la grilla de ahorros individuales.

#### Scenario: Las acciones operan sobre la posición activa

- **WHEN** el usuario usa Ajustar, Devolver o Convertir desde un totalizador
- **THEN** la acción opera sobre la posición activa de esa moneda

#### Scenario: Una posición activa por moneda

- **WHEN** existen posiciones activas duplicadas por datos viejos
- **THEN** se consolidan en la más antigua

### Requirement: Historial único, filtros y paginación

El sistema DEBE (SHALL) mostrar en la pantalla de ahorros una sola tabla "Historial" con
las columnas Fecha, Ahorro, Tipo, Importe, Cotización y Movimiento Dinero Disponible.

#### Scenario: Columna Cotización con snapshot del evento

- **WHEN** se muestra un evento en la columna Cotización
- **THEN** se muestra el snapshot del evento
- **THEN** en conversiones prioriza la cotización de la moneda extranjera (origen o destino)
- **THEN** muestra `—` cuando no aplica

#### Scenario: Visualización de conversiones en Ahorro e Importe

- **WHEN** el evento es una conversión
- **THEN** la columna Ahorro muestra la dirección (`origen → destino`)
- **THEN** la celda Importe agrega una línea secundaria con el monto y la moneda base
  (`desde 10,00 ARS`)

#### Scenario: Columna Movimiento Dinero Disponible

- **WHEN** se muestra el impacto del evento en el dinero disponible
- **THEN** el alta muestra `−` en rojo
- **THEN** la devolución muestra `+` en verde
- **THEN** ajustes y conversiones muestran `—`

#### Scenario: Filtros del historial

- **WHEN** el usuario filtra el historial
- **THEN** puede filtrar por rango de fechas, tipo, moneda y búsqueda por observación

#### Scenario: Paginación del historial

- **WHEN** se consulta el historial
- **THEN** la tabla se pagina de a 20
- **THEN** se muestran metadatos de total y página
