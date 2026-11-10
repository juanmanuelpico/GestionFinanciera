# Propuesta: Dashboard por módulo y configuración de secciones

## Por qué

El Dashboard existe como scaffold: muestra tarjetas de ejemplo y no resume la situación
financiera real. El usuario necesita ver de un vistazo lo importante de cada módulo
(ahorros, deudas propias, deudas de terceros y gastos fijos del mes), celebrar los
indicadores en cero con un mensaje de éxito en verde y elegir qué módulos quiere ver.
Hoy esa selección no existe y Configuración no permite contraer sus secciones.

## Pedido original (textual, resumido de `odd/tasks/dashboard.md`)

> Se requiere poder visualizar información clave de cada módulo: ahorros actuales en las
> diferentes monedas habilitadas; cantidad de personas que te deben, personas a las que se
> les venció la fecha límite de pago, personas a las que les debés y deudas vencidas;
> cantidad de gastos fijos pagados, pendientes, vencidos y "a vencer" (3 días o menos).
> Si numericamente el valor es CERO mostrar un mensajito en verde success indicando la
> situación, por ejemplo "Pagaste todas tus deudas del mes". También mostrar la información
> de DolarApi más pequeña y visualmente más llamativa. En Configuración crear un apartado
> con un checkbox por módulo (ahorros, gastos fijos, mis deudas, deudas de terceros,
> cotización del dólar) y todas las secciones de Configuración deben ser colapsables.

## Qué cambia

- **Dashboard real:** nueva página alimentada por `GET /dashboard/summary`, con secciones
  de ahorros, gastos fijos del mes, deudas propias y deudas de terceros.
- **Ahorros:** importe actual por cada moneda habilitada del usuario, considerando solo
  ahorros activos. Una moneda habilitada sin saldo muestra `0` con el mensaje verde
  "Sin ahorros.".
- **Deudas propias:** personas a las que se les debe, personas con deuda activa, deudas
  vencidas y cuotas vencidas. Las tarjetas no cuentan como personas.
- **Deudas de terceros:** personas que deben, personas con vencimientos impagos, deudas
  activas y cuotas vencidas.
- **Gastos fijos del mes:** pagados, pendientes, vencidos y a vencer (vencen en 3 días o
  menos, incluido hoy).
- **Mensajes de éxito:** todo indicador numérico en cero se acompaña de un mensaje en
  verde con el token `success` que explica la situación.
- **Cotizaciones:** franja compacta con fondo primario y tipografía menor que la tarjeta
  de Ahorros, con Blue, Oficial y MEP (venta y compra).
- **Configuración:** nueva sección "Dashboard" con un checkbox por módulo
  (`savings`, `fixedExpenses`, `myDebts`, `thirdPartyDebts`, `dollarQuotes`), persistida
  por usuario en `User.dashboardSections`; el endpoint solo calcula lo habilitado.
- **Configuración colapsable:** las secciones Vista, Ahorros, Medios de pago y Dashboard
  se pueden contraer y expandir.
- **Responsive y tema:** correcto en 320–414 px y escritorio, en claro y oscuro, usando
  tokens y primitivos del sistema de diseño.

## Capacidades

### Capacidades nuevas

- `dashboard`: resumen por módulo, mensajes de éxito en cero, franja de cotizaciones y
  respeto de las secciones habilitadas.
- `configuracion`: sección Dashboard con checkboxes por módulo, persistencia de
  `dashboardSections` y secciones colapsables.

### Capacidades modificadas

Ninguna. `openspec/specs/` está vacío y las capacidades de los cambios activos
(`ahorros-y-disponible`, `medios-de-pago-y-ajustes-ui`, `movimientos-categorias`,
`specs-deudas-y-gastos-fijos`) no se modifican.

## Fuera de alcance

- Nuevos cálculos de ahorro, deuda o gasto fijo: el Dashboard reutiliza las reglas
  existentes de cada módulo.
- Elegir el orden de las secciones del Dashboard.
- Persistir en el servidor el estado abierto/cerrado de las secciones de Configuración.
- Histórico o comparación entre meses en el Dashboard.

## Supuestos

- Las cinco secciones del Dashboard quedan habilitadas por defecto para usuarios nuevos y
  existentes (migración `20261107010000_add_dashboard_sections`).
- Se permite desmarcar todas las secciones; el Dashboard queda vacío y ofrece un acceso a
  Configuración.
- Una deuda o cuota vence hoy no se considera vencida; la deuda propia con cuotas
  impagas vencidas se cuenta como deuda vencida.
- Si DolarApi no responde, la sección de cotizaciones muestra un aviso pero el resto del
  Dashboard se renderiza normalmente.

## Equivalencias de atributos (pedido en español → código)

Capability `dashboard`:

| Nombre del pedido | Identificador en código | Nota |
| --- | --- | --- |
| ahorros | `savings` (`DashboardSection.SAVINGS`) | tarjeta "Ahorros" |
| gastos fijos | `fixedExpenses` (`DashboardSection.FIXED_EXPENSES`) | sección "Gastos fijos del mes" |
| mis deudas / deudas propias | `myDebts` (`DashboardSection.MY_DEBTS`) | deudas de tipo `PROPIA` |
| deudas de terceros | `thirdPartyDebts` (`DashboardSection.THIRD_PARTY_DEBTS`) | deudas de tipo `TERCERO` |
| cotización del dólar | `dollarQuotes` (`DashboardSection.DOLLAR_QUOTES`) | Blue, Oficial y MEP de DolarApi |
| pagados / pendientes / vencidos / a vencer | `paid` / `pending` / `overdue` / `dueSoon` | gastos fijos del período `YYYY-MM` en curso |
| personas que te deben / a las que les debés | `peopleWhoOwe` / `peopleOwed` | personas distintas (actor de tipo `PERSONA`) |
| cuotas vencidas | `overdueInstallments` | cuotas sin pagar con vencimiento anterior a hoy |

Capability `configuracion`:

| Nombre del pedido | Identificador en código | Nota |
| --- | --- | --- |
| etiquetas de los checkboxes | `savings` = "Ahorros", `fixedExpenses` = "Gastos fijos", `myDebts` = "Mis deudas", `thirdPartyDebts` = "Deudas de terceros", `dollarQuotes` = "Cotización del dólar" | orden canónico de la lista |
| selección persistida | `User.dashboardSections` (`DashboardSection[]`) | array de enum en Prisma |

## Estado de aprobación

Este change queda **pendiente de aprobación del usuario**. `openspec/specs/` no se
modifica hasta que el usuario apruebe y el cambio se archive con `/opsx-archive`.
