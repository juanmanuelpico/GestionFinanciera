# Spec Delta: Control de Gastos

## Purpose

Permite al usuario definir un tope mensual de gasto por categoría (el "umbral máximo") y
ver de un vistazo cuánto lleva gastado del mes en curso, con estados de color y avisos
inmediatos cuando el egreso que acaba de registrar alcanza el 80 % del umbral o lo supera.
La capacidad cubre la pantalla "Control de Gastos", el endpoint de consulta y el aviso
inline que devuelven los flujos de gasto.

## ADDED Requirements

### Requirement: Punto de menú "Control de Gastos"

El sistema DEBE (SHALL) mostrar en el menú el punto "Control de Gastos" en la ruta
`/budgets`, reemplazando el placeholder "Presupuestos". La ruta `/budgets` DEBE (SHALL)
conservarse y NO DEBE (SHALL NOT) existir una pantalla "próximamente" en ella.

#### Scenario: Etiqueta y posición en el menú

- **WHEN** el usuario autenticado visualiza el menú de navegación
- **THEN** ve "Control de Gastos" entre "Categorías" y "Reportes" y ya no existe la
  entrada "Presupuestos"

#### Scenario: Misma ruta que el placeholder

- **WHEN** el usuario abre `/budgets`
- **THEN** se renderiza la pantalla con el título "Control de Gastos" y el subtítulo
  "Umbrales mensuales por categoría. Totales de <mes año en español>."

### Requirement: Grilla de umbrales del mes en curso

La pantalla DEBE (SHALL) listar todas y solo las categorías del usuario autenticado con
umbral máximo mayor que 0, ordenadas por nombre, con las columnas Categoría, Umbral / mes,
Gastado, Uso y Estado. Las categorías sin umbral NO DEBE (SHALL NOT) aparecer.

#### Scenario: Categorías con umbral

- **WHEN** el usuario tiene tres categorías con umbral y cinco sin umbral
- **THEN** la grilla muestra tres filas ordenadas alfabéticamente, cada una con su umbral
  formateado en la moneda del umbral

#### Scenario: Categoría con umbral y sin gastos del mes

- **WHEN** una categoría con umbral no tiene egresos en el mes
- **THEN** el gastado es 0,00 en la moneda del umbral, el uso es 0 % y el estado es
  "En control"

#### Scenario: Solo datos propios

- **WHEN** otro usuario tiene categorías con umbral
- **THEN** esas categorías no aparecen en la grilla ni en la respuesta de la consulta

### Requirement: Gasto acumulado del mes calendario por moneda del umbral

El gastado DEBE (SHALL) ser la suma de los movimientos de tipo egreso (`EGRESO`) de la
categoría, únicamente en la moneda del umbral, dentro del mes calendario UTC del día
actual. Ingresos, egresos en otras monedas y movimientos de otros meses NO DEBE (SHALL NOT)
computarse. La pantalla NO DEBE (SHALL NOT) ofrecer selector de período: siempre muestra el
mes en curso.

#### Scenario: Suma solo egresos de la moneda del umbral

- **WHEN** la categoría tiene umbral en ARS y en el mes hubo egresos por AR$ 120.000,
  un egreso de US$ 50 y un ingreso de AR$ 900.000
- **THEN** el gastado mostrado es AR$ 120.000,00

#### Scenario: Umbral en otra moneda

- **WHEN** la categoría tiene umbral de US$ 500 y en el mes hubo egresos de AR$ 30.000 y
  de US$ 100
- **THEN** el gastado mostrado es US$ 100,00 y el resto de los egresos no se tiene en cuenta

#### Scenario: Rolado del mes

- **WHEN** cambia el mes calendario UTC y el usuario vuelve a consultar
- **THEN** el período es el mes nuevo y el gastado se recalcula desde cero

### Requirement: Estados del umbral, porcentaje y colores

El estado DEBE (SHALL) ser "En control" (`OK`) mientras el gastado sea menor al 80 % del
umbral, "Al 80 % o más" (`WARNING`) desde el 80 % y "Umbral superado" (`EXCEEDED`) desde el
100 %. El estado DEBE (SHALL) calcularse sobre el importe exacto y el porcentaje DEBE (SHALL)
mostrarse truncado a un decimal.

#### Scenario: Verde por debajo del 80 %

- **WHEN** el gastado no alcanza el 80 % del umbral
- **THEN** el importe gastado aparece subrayado en verde (`text-success`) y la insignia dice
  "En control"

#### Scenario: Naranja al alcanzar el 80 %

- **WHEN** el gastado llega exactamente al 80 % del umbral (o a un valor entre 80 % y 100 %)
- **THEN** el importe gastado aparece subrayado en ámbar (`text-warning`) y la insignia dice
  "Al 80 % o más"

#### Scenario: Rojo al alcanzar el 100 %

- **WHEN** el gastado iguala o supera el umbral
- **THEN** el importe gastado aparece subrayado en rojo (`text-destructive`) y la insignia
  dice "Umbral superado"

#### Scenario: El porcentaje truncado no anticipa el aviso

- **WHEN** el gastado es 799,99 sobre un umbral de 1.000
- **THEN** el uso se muestra como 79.9 % con estado "En control" y nunca se muestra un 80 %
  con estado "En control"

### Requirement: Endpoint GET /api/spending-control

El sistema DEBE (SHALL) exponer el endpoint autenticado `GET /api/spending-control`, que DEBE
(SHALL) responder `{ period, rows }` con `period` en formato `YYYY-MM` del mes calendario UTC
actual y cada fila con `categoryId`, `categoryName`, `thresholdAmount`, `thresholdCurrency`,
`spentAmount`, `percent` y `status`. Los importes DEBE (SHALL) devolverse como texto con dos
decimales.

#### Scenario: Consulta del mes en curso

- **WHEN** el usuario autenticado llama a `GET /api/spending-control`
- **THEN** recibe el período del mes actual y una fila por cada categoría propia con umbral
  mayor que 0, con su gastado, porcentaje truncado y estado

#### Scenario: Sin categorías con umbral

- **WHEN** el usuario no tiene ninguna categoría con umbral
- **THEN** la respuesta trae el período y `rows` vacío

#### Scenario: Consulta sin sesión

- **WHEN** se llama al endpoint sin token de acceso
- **THEN** el backend responde 401 y no expone ningún umbral

### Requirement: Filtros y estados de la pantalla

La pantalla DEBE (SHALL) ofrecer un filtro de texto sobre el nombre de la categoría y un
filtro por estado, aplicados en el cliente sobre las filas ya cargadas, más un botón
"Limpiar filtros" que DEBE (SHALL) estar deshabilitado cuando no hay filtros activos.
También DEBE (SHALL) mostrar estados de carga, de error con reintento y vacío.

#### Scenario: Búsqueda por nombre

- **WHEN** el usuario escribe "oci" en "Buscar categoría"
- **THEN** quedan solo las filas cuyo nombre contiene ese texto, sin distinguir mayúsculas

#### Scenario: Filtro por estado

- **WHEN** el usuario elige "Al 80 % o más" en el combo Estado
- **THEN** solo se muestran las filas con estado `WARNING`; las opciones son "Todos",
  "En control", "Al 80 % o más" y "Umbral superado"

#### Scenario: Sin resultados con los filtros

- **WHEN** los filtros no coinciden con ninguna fila
- **THEN** aparece "Sin resultados con estos filtros" con la aclaración "Solo se muestran
  categorías con umbral máximo."

#### Scenario: Ninguna categoría con umbral

- **WHEN** el usuario no cargó ningún umbral
- **THEN** aparece el estado vacío "Ninguna categoría con umbral" invitando a cargar el
  umbral máximo en Categorías

#### Scenario: Error al consultar

- **WHEN** la consulta falla
- **THEN** se muestra el mensaje del backend y un botón "Reintentar" que vuelve a consultar

### Requirement: Presentación responsive y en claro/oscuro

La grilla DEBE (SHALL) mostrarse como tabla desde el ancho `lg` y como tarjetas apiladas por
debajo, sin desborde horizontal entre 320 y 414 px. Los filtros DEBE (SHALL) apilarse en una
columna en mobile y todos los colores DEBE (SHALL) usar los tokens del sistema de diseño
(`success`, `warning`, `destructive`) para verse correctos en claro y en oscuro.

#### Scenario: Tabla en escritorio

- **WHEN** la pantalla se usa a 1280 px o más
- **THEN** las filas se muestran en una tabla con las cinco columnas alineadas (importes a
  la derecha)

#### Scenario: Tarjetas en mobile

- **WHEN** la pantalla se usa entre 320 y 414 px
- **THEN** cada categoría es una tarjeta con nombre, insignia de estado, umbral y el par
  gastado · porcentaje, sin scroll horizontal

#### Scenario: Modo oscuro

- **WHEN** el usuario activa el modo oscuro
- **THEN** el subrayado, las insignias y los banner de aviso mantienen contraste y siguen
  usando los mismos tokens semánticos

### Requirement: Aviso de umbral en la respuesta del egreso que lo cruza

Cuando un egreso recién registrado lleva el acumulado de su categoría al 80 % o más del umbral
en la moneda del umbral, la respuesta de la operación DEBE (SHALL) incluir `spendingAlert`.
Mientras esté por debajo del 80 % la respuesta NO DEBE (SHALL NOT) incluir aviso.

#### Scenario: Contenido del aviso

- **WHEN** una respuesta incluye `spendingAlert`
- **THEN** trae `categoryId`, `categoryName`, `currency`, `period`, `thresholdAmount`,
  `spentAmount`, `percent` y `status` con valor `WARNING` o `EXCEEDED`, calculados sobre el mes
  calendario UTC de la fecha del egreso

#### Scenario: Egreso que llega al 80 %

- **WHEN** se registra un egreso de AR$ 84.000 en una categoría con umbral de AR$ 100.000
  y es el acumulado del mes
- **THEN** la respuesta del egreso incluye `spendingAlert` con `status` `WARNING`,
  `percent` 84 y el `period` del mes de la fecha del egreso

#### Scenario: Egreso que supera el umbral

- **WHEN** el egreso registrado lleva el acumulado a un valor igual o mayor que el umbral
- **THEN** `spendingAlert.status` es `EXCEEDED`

#### Scenario: Categoría sin umbral o moneda distinta

- **WHEN** el egreso es de una categoría sin umbral, o su moneda no coincide con la moneda
  del umbral
- **THEN** el egreso se registra igual y la respuesta no incluye `spendingAlert`

#### Scenario: Ingresos, ediciones y borrados no avisan

- **WHEN** el usuario registra un ingreso, o edita o elimina un movimiento existente
- **THEN** la respuesta no incluye aviso de umbral y el acumulado vuelve a calcularse recién
  al consultar la grilla

### Requirement: Banner de aviso inline en los tres flujos de gasto

El `spendingAlert` DEBE (SHALL) mostrarse como banner inline en la pantalla que originó la
operación —Movimientos (alta de egreso), Gastos fijos (pago de un período) y Deudas (pago de
cuotas propias)—, en ámbar para `WARNING` y en rojo para `EXCEEDED`, indicando categoría,
porcentaje, gastado y umbral. El aviso NO DEBE (SHALL NOT) bloquear, revertir ni repetir la
operación ni quedarse guardado entre pantallas.

#### Scenario: Banner ámbar tras un egreso

- **WHEN** el alta de un egreso devuelve `spendingAlert` con `status` `WARNING`
- **THEN** la pantalla de Movimientos muestra un banner con `text-warning`, el texto
  "Vas por el 84 % del umbral de «Alimentos»" y "AR$ 84.000,00 gastados de AR$ 100.000,00
  este mes."

#### Scenario: Banner rojo al superar el umbral

- **WHEN** la operación devuelve `status` `EXCEEDED`
- **THEN** el banner se muestra en rojo (`text-destructive`) con el texto "Superaste el
  umbral de «Alimentos»" y el mismo detalle de importes

#### Scenario: Aviso tras pagar un gasto fijo

- **WHEN** el pago de un período cruza el umbral de la categoría del gasto
- **THEN** la pantalla de Gastos fijos muestra el banner y el pago queda registrado
  normalmente

#### Scenario: Aviso tras pagar cuotas propias

- **WHEN** el pago de cuotas de una deuda propia cruza el umbral de la categoría de deudas
- **THEN** la solapa de Deudas muestra el banner; en un cobro de deuda de terceros no se
  muestra ningún banner

#### Scenario: El aviso se reemplaza o se limpia

- **WHEN** el usuario realiza otra operación que no devuelve aviso (por ejemplo editar un
  movimiento) o recarga la pantalla
- **THEN** el banner anterior desaparece: el aviso solo refleja la última operación
