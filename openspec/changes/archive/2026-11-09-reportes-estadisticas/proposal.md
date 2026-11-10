# Propuesta: Reportes y Estadísticas

## Pedido

> Nuevo punto de menú que derive a una pantalla de Reportes y Estadísticas con una pestaña por
> cada módulo, con gráficos, listados e información relevante. Ahorros con gráfico por mes
> filtrable por períodos y una media del ahorro aproximado por mes; Movimientos con top N de
> categorías más usadas (N seleccionable en pantalla) con filtro Ingreso/Egreso y media de gasto
> de categorías por período/s seleccionados; para Deudas corroborar y plasmar estadísticas
> relevantes, ídem otros módulos.

Decisiones acordadas en la planificación:

1. Instalar **recharts** como librería de gráficos (autorización explícita del usuario: es la
   única dependencia nueva del cambio).
2. La multiplicidad de moneda se resuelve con **filtro por billetera** (default la del
   encabezado), **sin convertir importes**.
3. Cinco pestañas: Ahorros, Movimientos, Deudas, Gastos Fijos y Control de Gastos.
4. Filtro de **período global** arriba de las pestañas (presets Últimos 3/6/12 meses + Este año y
   selectores mes-a-mes Desde/Hasta de hasta 24 meses hacia atrás) que Control de Gastos ignora
   porque siempre muestra el mes actual.

## Por qué

Hoy el usuario ve su situación financiera de un día (Dashboard, header) o el listado crudo de
cada módulo, pero no puede responder preguntas de tendencia: cuánto ahorra por mes en promedio,
qué categorías usa más, si está cumpliendo con los vencimientos, quién le debe más. Una pantalla
de reportes con análisis por módulo evita exportar datos o hacer cuentas a mano.

## Qué cambia

- **Backend:** `ReportsModule` (antes vacío) pasa a tener `ReportsController` y `ReportsService`
  en `backend/src/modules/reports/`, con cinco endpoints de lectura:
  `GET /api/reports/savings/monthly`, `GET /api/reports/movements/top-categories`,
  `GET /api/reports/movements/category-averages`, `GET /api/reports/debts/stats` y
  `GET /api/reports/fixed-expenses/monthly`. DTOs compartidos en
  `dto/report-query.dto.ts` (`ReportQueryDto`, `TopCategoriesDto`). No hay cambios de esquema:
  solo lecturas/agregaciones sobre `saving_events`, `movements`, `debts`, `debt_installments`,
  `debt_settlements`, `fixed_expenses` y `fixed_expense_payments`.
- **Frontend:** `/reports` deja de ser `PagePlaceholder` y pasa a ser `ReportsPage`
  (`frontend/src/features/reports/`), con barra de filtros global, cinco solapas sincronizadas a
  `?tab=`, y una solapa por módulo (`components/*-report-tab.tsx`) más helpers de período
  (`report-period.ts`), estilos de gráfico (`report-charts.ts`), API (`reports-api.ts`), tipos
  (`types.ts`) y primitivos de presentación (`components/report-ui.tsx`). La solapa Control de
  Gastos reutiliza `GET /api/spending-control` sin parámetros.
- **Dependencias:** `recharts` `^3.10.1` en `frontend/package.json` (única dependencia nueva,
  autorizada por el usuario).
- **Sin cambios:** el ítem de menú "Reportes" y su ruta ya existían; `/dashboard/summary` y la
  capability `dashboard` no se tocan; la pantalla `/budgets` de Control de Gastos no se modifica.
- **Tests:** `backend/src/modules/reports/reports.service.spec.ts` (9) y
  `frontend/src/features/reports/pages/reports-page.test.tsx` (6). Se validó además con smoke e2e
  contra PostgreSQL real (aportes/retiros, top por cantidad con desempate por monto, KPIs de
  deudas con cobro parcial, serie de settlements, ranking, cumplimiento de gastos fijos y los 400
  de validación).

## Equivalencias de atributos

| Pedido (español) | Código | Nota |
| --- | --- | --- |
| Reportes y Estadísticas | `ReportsPage` en `/reports` (menú "Reportes") | el ítem ya existía |
| Período / Desde / Hasta | `from`, `to` (`'YYYY-MM'`) | presets `LAST_3`/`LAST_6`/`LAST_12`/`THIS_YEAR`; 24 meses en la UI, tope 48 en la API |
| Billetera | `currency` (`ARS` \| `USD` \| `EUR`) | default `headerCurrency`; sin conversión |
| Aportes / Retiros | `contributed` (`ALTA`+`AJUSTE_SUMA`) / `returned` (`DEVOLUCION`+`AJUSTE_RESTA`) | `CONVERSION` excluida; se agrupa por `createdAt` del evento |
| Neto del mes | `net` | `contributed − returned` |
| Media del ahorro aproximada por mes | `summary.averageMonthlyNet` / `averageMonthlyContributed` | total ÷ meses del rango |
| Top N de categorías más usadas | `/reports/movements/top-categories` (`limit` 1–50 default 10, `type` opcional) | orden por `count`, desempate por `totalAmount` |
| Participación de la categoría | `sharePercent` | sobre `totalMovements` del rango |
| Media de gasto de categorías por período | `/reports/movements/category-averages` → `monthlyAverage` | `totalAmount ÷ monthCount` |
| Te deben / Vos debés | `thirdOutstanding` / `ownOutstanding` | solo deudas `ACTIVA` |
| Vencido que no te pagaron | `thirdOverdueAmount` + `overdueInstallments` | cuota vencida impaga: `dueDate < hoy` y `paidAmount < amount` |
| Vos debés (vencido propio) | `ownOverdueAmount` | lo devuelve la API; la pantalla no lo muestra |
| Cumplimiento de cuotas | `paidInstallmentsPercent` | cuotas con `paidAt` sobre el total de cuotas históricas; `null` si no hay cuotas → "—" |
| Cobros y pagos por mes | `series[].received` (`TERCERO`) / `series[].paid` (`PROPIA`) | solo settlements `ACTIVA` por `paymentDate` |
| ¿Quién te debe más? | `topDebtors` (5) | saldo pendiente por actor, deudas `TERCERO` activas |
| Gastos fijos esperado vs pagado | `/reports/fixed-expenses/monthly` → `expected`, `paid`, `dueCount`, `paidCount`, `compliancePercent` | vencimiento por `firstDueDate` + `intervalMonths` (`isDueInPeriod`) |
| Control de Gastos (solapa) | `GET /api/spending-control` (existente) | ignora período y billetera del reporte |

## Capacidades

### Capacidades nuevas

- `reportes-estadisticas`: pantalla con filtro global de período y billetera, solapas por módulo,
  cinco endpoints de agregación y sus reglas de cálculo (aportes vs retiros, top N, medias,
  KPIs de deudas, esperado vs pagado), validaciones en español, estados de carga/error/vacío y
  presentación responsive con el tema.

### Capacidades modificadas

- Ninguna. El ítem de menú "Reportes" no tiene un requisito aprobado propio (solo se lo menciona
  de paso en `control-de-gastos`), la ruta `/reports` ya existía como placeholder y el Dashboard
  (`dashboard`, `/dashboard/summary`) no cambia su comportamiento ni sus endpoints. La solapa de
  Control de Gastos consume la capacidad `control-de-gastos` sin alterarla.

## Fuera de alcance

- Totales consolidados entre billeteras o conversión de monedas para un mismo gráfico.
- Exportables (CSV/PDF/PNG), impresión o envío de reportes.
- Comparación entre dos períodos (interanual/mensual), proyecciones ni metas.
- Snapshots de reportes guardados, programados o compartibles con otros usuarios.
- Pestañas de Cuentas y Categorías (el pedido cubrió Ahorros, Movimientos, Deudas, Gastos fijos y
  Control de Gastos).
- Cambios en la escritura de datos: el módulo es 100 % lectura.

## Supuestos

- "Media del ahorro aproximada por mes" = neto del período ÷ cantidad de meses del rango
  (los meses sin eventos cuentan en el denominador).
- Los eventos de ahorro se agrupan por la fecha de creación del evento (`createdAt`), igual que el
  historial ya especificado de la capability `ahorros-y-disponible`.
- Los KPIs de Deudas son una foto al día de hoy de la billetera seleccionada; el período solo
  afecta la serie de cobros/pagos.
- El preset "Este año" va de enero al mes actual; "Últimos N meses" incluye el mes actual.
- El cumplimiento de gastos fijos se agrupa por el `period` del pago (el mes al que corresponde),
  no por la fecha en que se registró el pago.

## Brechas y decisiones pendientes

1. **El KPI "Cumplimiento" de Gastos Fijos puede pasar 100 %.** El backend topa
   `compliancePercent` mes a mes (`min(paidCount, dueCount)`), pero la pantalla suma
   `paidCount`/`dueCount` de todo el rango sin tope: dos pagos del mismo gasto en un mes dan más
   de 100 %. Decidir si se topa el agregado o se muestra tal cual.
2. **Control de Gastos ignora también la Billetera**, no solo el período (llama
   `/spending-control` sin parámetros y muestra cada categoría en la moneda de su umbral), pero la
   nota en pantalla solo menciona el período. Confirmar el mensaje o hacer que respete el filtro.
3. **`ownOverdueAmount` no se muestra.** La API calcula el vencido de deudas propias y la solapa
   no lo usa. Decidir si se agrega un KPI o se deja de calcular.
4. **Desfase de rango UI vs API.** La UI ofrece 24 meses hacia atrás y la API acepta hasta 48
   (con `from`/`to` a mano). Confirmar si el tope de producto es 24.
5. **Ahorros, Deudas y Gastos Fijos nunca muestran estado vacío** (siempre KPIs en 0,00 y series
   en cero, salvo el ranking "Nadie te debe…"). Decidir si conviene un aviso de "sin datos" para
   usuarios nuevos.
6. **El top N ordena por cantidad, no por importe.** Con "Todos" los ingresos compiten con los
   egresos por las mismas posiciones. Confirmar que cantidad es el criterio pedido.
7. **`paidInstallmentsPercent` es histórico** (todas las cuotas de la billetera, incluidas deudas
   finalizadas), no del período. Validar que es la métrica que el usuario espera ver.
