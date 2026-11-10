# Tareas: Reportes y Estadísticas

Estado verificado el 8 de noviembre de 2026 sobre el código ya implementado, con pruebas
unitarias de backend (9), pruebas de página en frontend (6) y smoke e2e contra PostgreSQL real.
Cada tarea enlaza su requisito en `specs/reportes-estadisticas/`.

## Backend

- [x] 1. `ReportsModule` con `ReportsController` y `ReportsService` registrados y montados en
  `AppModule` (reportes-estadisticas: Ahorro mensual con media aproximada por mes) —
  `backend/src/modules/reports/reports.module.ts`, `backend/src/app.module.ts`
- [x] 2. `ReportQueryDto` (`from`, `to` en `YYYY-MM`, `currency` del catálogo) y
  `TopCategoriesDto` (`type` opcional, `limit` entero 1–50 default 10), con mensajes de validación
  en español (reportes-estadisticas: Validación del período, la billetera y el top N) —
  `backend/src/modules/reports/dto/report-query.dto.ts`
- [x] 3. `resolveRange`: defaults de últimos 12 meses hasta el mes actual, `currency` default
  `headerCurrency` del usuario, 400 por rango invertido ("El rango de fechas no es válido") y por
  más de 48 meses, con la lista de meses del rango (reportes-estadisticas: Validación del período,
  la billetera y el top N) — `backend/src/modules/reports/reports.service.ts`
- [x] 4. `savingsMonthly`: agrupa `saving_events` por `createdAt`, `contributed` = `ALTA` +
  `AJUSTE_SUMA`, `returned` = `DEVOLUCION` + `AJUSTE_RESTA`, excluye `CONVERSION`, un punto por
  mes del rango aunque esté vacío, y `summary` con totales y medias sobre la cantidad de meses
  (reportes-estadisticas: Ahorro mensual con media aproximada por mes; Cada reporte analiza una
  sola billetera sin convertir importes) — `reports.service.ts`
- [x] 5. `movementsTopCategories`: `groupBy` de movimientos por `categoryId` + `type` con
  `movementDate` en el rango, orden por `count` y desempate por `totalAmount`, `limit`,
  `totalMovements` y `sharePercent` (reportes-estadisticas: Top N de categorías más usadas) —
  `reports.service.ts`
- [x] 6. `movementsCategoryAverages`: `monthlyAverage = total ÷ meses del rango`, orden por total
  descendente, sin tope de filas (reportes-estadisticas: Media de gasto mensual por categoría) —
  `reports.service.ts`
- [x] 7. `debtsStats`: KPIs foto al día de hoy por billetera (pendientes y vencidos de terceros y
  propios, cuotas vencidas impagas de terceros, `paidInstallmentsPercent` con `paidAt` sobre todas
  las cuotas y `null` si no hay), serie mensual de settlements `ACTIVA` (`received` = `TERCERO`,
  `paid` = `PROPIA`) y `topDebtors` de 5 por saldo pendiente (reportes-estadisticas: Estadísticas
  de deudas) — `reports.service.ts`
- [x] 8. `fixedExpensesMonthly`: `expected` con `isDueInPeriod` (`firstDueDate` +
  `intervalMonths`) de todos los gastos de la billetera, `paid` y `paidCount` de
  `fixed_expense_payments` agrupados por su `period`, `compliancePercent` topado al `dueCount` y
  `null` sin vencimientos, más `summary` (reportes-estadisticas: Gastos fijos esperados contra
  pagados por mes) — `reports.service.ts`
- [x] 9. Aislamiento por usuario en las cinco consultas y 401 por guard global JWT; fallback de
  nombre de categoría a "—" (reportes-estadisticas: Datos propios y acceso autenticado) —
  `reports.service.ts`, `backend/src/app.module.ts`
- [x] 10. Nueve pruebas de servicio: defaults y rejecting de rango, 48 meses, aportes/retiros y
  media, top con desempate, sin filtro de tipo, medias, KPIs + serie + ranking de deudas y
  esperado/pagado de gastos fijos — `backend/src/modules/reports/reports.service.spec.ts`

## Frontend

- [x] 11. `recharts` `^3.10.1` como dependencia (autorización explícita del usuario; única
  dependencia nueva del cambio) — `frontend/package.json`
- [x] 12. `ReportsPage` en `/reports` reemplazando el placeholder: título "Reportes y
  Estadísticas", subtítulo, barra de filtros global (presets, Desde/Hasta de 24 meses en "nov
  2026", Billetera con las habilitadas, Limpiar filtros) y cinco solapas con sincronía `?tab=`
  (default `ahorros`, sin parámetro al volver a Ahorros), guards de rango en la UI y estados de
  carga/error de preferencias (reportes-estadisticas: Pantalla "Reportes y Estadísticas" en el
  menú; Filtro global de período y billetera; La solapa activa se comparte en la URL) —
  `frontend/src/features/reports/pages/reports-page.tsx`
- [x] 13. Utilidades de período (`presetPeriod`, `activePreset`, `recentMonthOptions`,
  `monthOptionLabel`) y helper `shiftMonthValue` — `frontend/src/features/reports/report-period.ts`
- [x] 14. Cliente de API y tipos de los cinco reportes, enviando `from`/`to`/`currency` y, en
  `top-categories`, `type` y `limit` — `frontend/src/features/reports/reports-api.ts`,
  `frontend/src/features/reports/types.ts`
- [x] 15. Primitivos compartidos: `KpiCard`, `ChartCard` y `ReportBoundary` (esqueletos, error con
  "Reintentar", estado vacío), y tokens de color/tooltip/formateo de ejes vía variables CSS del
  tema (reportes-estadisticas: Gráficos legibles en mobile, con tema y color primario configurable;
  Estados de carga, error y vacío en cada solapa) — `components/report-ui.tsx`,
  `report-charts.ts`
- [x] 16. Solapa Ahorros: cuatro KPIs (media neta con pista, media de aporte, aportes, retiros en
  rojo) y `ComposedChart` con barras Aportes/Retiros y línea Neto (reportes-estadisticas: Ahorro
  mensual con media aproximada por mes) — `components/savings-report-tab.tsx`
- [x] 17. Solapa Movimientos: selector Tipo (Todos/Egreso/Ingreso, default Egreso) y Top N
  (5/10/20, default 10), barras horizontales por cantidad con tooltip de cantidad, total y
  participación, más la media mensual por categoría en tabla (≥ `lg`) y lista (mobile) con sus
  estados vacíos (reportes-estadisticas: Top N de categorías más usadas; Media de gasto mensual
  por categoría) — `components/movements-report-tab.tsx`
- [x] 18. Solapa Deudas: cuatro KPIs con pistas ("N deudas activas", "N cuotas vencidas impagas",
  cumplimiento o "—"), barras de cobros/pagos por mes y ranking "¿Quién te debe más?" con barras
  proporcionales y su texto vacío (reportes-estadisticas: Estadísticas de deudas) —
  `components/debts-report-tab.tsx`
- [x] 19. Solapa Gastos Fijos: KPIs esperado/pagado/cumplimiento con conteos y barras Esperado vs
  Pagado por mes (reportes-estadisticas: Gastos fijos esperados contra pagados por mes) —
  `components/fixed-expenses-report-tab.tsx`
- [x] 20. Solapa Control de Gastos: reutiliza `GET /api/spending-control` sin parámetros con la
  nota de que siempre muestra el mes en curso, barras por categoría en `primary-500`/`warning`/
  `destructive` e insignias de estado (reportes-estadisticas: La solapa Control de Gastos siempre
  muestra el mes actual) — `components/spending-control-report-tab.tsx`
- [x] 21. Revisión mobile y de tema: `ResponsiveContainer` en todos los gráficos, tabs con
  `overflow-x-auto`, grillas de KPIs 1 → `sm:2` → `lg:4`, selects/botones `h-11`/`sm:h-10`, ticks
  ≥ 12 px, colores solo por variables CSS (claro/oscuro y `data-theme-color`) sin desborde
  horizontal del body (reportes-estadisticas: Gráficos legibles en mobile, con tema y color
  primario configurable)
- [x] 22. Seis pruebas de página: solapa inicial con período por defecto, presets que cambian la
  consulta, Top N en Movimientos, KPIs/serie/ranking de Deudas, solapa desde la URL y Gastos
  Fijos — `frontend/src/features/reports/pages/reports-page.test.tsx`
- [x] 23. Smoke e2e contra PostgreSQL real: cifras de aportes/retiros, top por cantidad con
  desempate por monto, KPIs con cobro parcial, serie de settlements, ranking y cumplimiento de
  gastos fijos, y los cuatro 400 de validación

## Pendiente

^- [x] 24. Aprobación del usuario sobre el delta y archivado (`/opsx-archive`); `openspec/specs/`
  queda sin cambios hasta entonces.
- [ ] 25. Decisión de producto sobre las brechas de `proposal.md` (cumplimiento agregado de gastos
  fijos que puede superar 100 %, Control de Gastos que también ignora la Billetera,
  `ownOverdueAmount` sin usar en la UI, tope de 24 vs 48 meses, falta de estados vacíos en
  Ahorros/Deudas/Gastos Fijos, criterio de orden del top N y alcance histórico de
  `paidInstallmentsPercent`).
