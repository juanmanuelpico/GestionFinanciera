# Tareas: Control de Gastos (umbrales y alertas)

Estado verificado el 7 de noviembre de 2026 sobre el código ya implementado. Cada tarea enlaza
su requisito en `specs/`.

## Backend

- [x] 1. Campos `thresholdAmount` / `thresholdCurrency` en `Category` y migración
  (movimientos-categorias: Tabla Categoria) — `backend/prisma/schema.prisma`,
  `migrations/20261107041427_add_category_spending_limits`
- [x] 2. DTO de categoría con umbral, moneda y decimales validados
  (movimientos-categorias: CRUD de Categoría) — `dto/create-category.dto.ts`
- [x] 3. `CategoriesService.normalizeThreshold`: 0/vacío sin control, >0 sin moneda 400, negativo
  400; la edición sin campos de umbral conserva el valor (movimientos-categorias: CRUD de
  Categoría) — `categories.service.ts`
- [x] 4. Utilidad de evaluación del umbral: estado `OK`/`WARNING`/`EXCEEDED`, porcentaje truncado,
  mes calendario UTC (control-de-gastos: Estados, Gasto acumulado) — `spending-control/spending-limit.ts`
- [x] 5. `GET /api/spending-control` con `period` y `rows` de las categorías propias con umbral > 0
  (control-de-gastos: Endpoint, Grilla) — `spending-control.controller.ts`, `spending-control.service.ts`
- [x] 6. `computeSpendingAlert` y `spendingAlert` en la respuesta del alta de egresos
  (control-de-gastos: Aviso de umbral) — `spending-control/spending-alert.ts`,
  `movements/movements.service.ts`
- [x] 7. `spendingAlert` en el pago de un período de gasto fijo (gastos-fijos: Pago de un período)
  — `fixed-expenses/fixed-expenses.service.ts`
- [x] 8. `spendingAlert` en el pago de cuotas de deuda propia, sin aviso en cobros de terceros
  (deudas: Cobro y pago de cuotas) — `debts/debt-settlements.service.ts`

## Frontend

- [x] 9. Token `--warning` con variante oscura y registro en el sistema de diseño
  (control-de-gastos: Estados y colores) — `frontend/src/index.css`, `docs/ui/design-system.md` §1.3
- [x] 10. Campo "Umbral máximo" + combo de moneda en el popup de categoría, con validaciones
  (movimientos-categorias: CRUD de Categoría) — `categories/components/category-form-dialog.tsx`,
  `categories/schemas.ts`
- [x] 11. Columna "Umbral" en la lista de categorías (tabla y tarjetas)
  (movimientos-categorias: CRUD de Categoría) — `categories/pages/categories-page.tsx`
- [x] 12. Pantalla "Control de Gastos" en `/budgets` y menú que reemplaza a "Presupuestos"
  (control-de-gastos: Punto de menú) — `spending-control/pages/spending-control-page.tsx`,
  `app/router.tsx`, `components/layout/nav-items.ts`
- [x] 13. Grilla con gastado subrayado por estado, uso y badge; filtro de texto y de estado
  aplicados en el cliente; carga, error con reintento y vacío (control-de-gastos: Grilla,
  Estados, Filtros) — `spending-control-page.tsx`, `spending-control/types.ts`,
  `spending-control/spending-control-api.ts`
- [x] 14. Banner `SpendingAlertBanner` ámbar/rojo con el texto de aviso
  (control-de-gastos: Banner de aviso inline) — `spending-control/components/spending-alert-banner.tsx`
- [x] 15. Banner en Movimientos tras el alta de egreso, sin aviso en ingresos/edición/borrado
  (control-de-gastos: Ingresos, ediciones y borrados no avisan) — `movements/pages/movements-page.tsx`,
  `movements/components/movement-form-dialog.tsx`
- [x] 16. Banner en Gastos fijos tras el pago (gastos-fijos: Aviso de umbral al pagar) —
  `fixed-expenses/pages/fixed-expenses-page.tsx`, `components/pay-fixed-expense-dialog.tsx`
- [x] 17. Banner en la solapa de Deudas tras el pago propio (deudas: Aviso de umbral al pagar una
  deuda propia) — `debts/components/debts-tab.tsx`, `components/debt-payment-dialog.tsx`
- [x] 18. Presentación responsive sin desborde y tokens válidos en claro/oscuro
  (control-de-gastos: Presentación responsive) — `spending-control-page.tsx`, `debts-tab.tsx`,
  `movements-page.tsx`

## Tests y checks

- [x] 19. Tests backend: `spending-control.spec.ts`, `spending-limit.spec.ts` y pruebas de aviso en
  `movements.service.spec.ts`, `fixed-expenses.service.spec.ts`, `debt-settlements.service.spec.ts`,
  `categories.service.spec.ts` — `npm test` → 19 archivos, 170/170
- [x] 20. Tests frontend: `spending-control-page.test.tsx`, `spending-alert-banner.test.tsx` y
  `categories-page.test.tsx` (umbral) — `npm test` → 17 archivos, 82/82
- [x] 21. `npm run typecheck`, `npm run lint` y `npm run build` en backend y frontend → OK
- [x] 22. Delta specs del change y validación con `npx openspec validate control-de-gastos --type
  change --strict`
^- [x] 23. Revisión mobile visual de la pantalla (320, 375, 390 y 414 px, claro y oscuro) a cargo
  del agente principal (AGENTS.md)
^- [x] 24. Aprobación del usuario y archivado del change (`/opsx-archive`): `openspec/specs/` sigue
  sin cambios hasta entonces
- [ ] 25. Commit de la funcionalidad (requiere autorización explícita)

## Cumplimiento

| Req | Estado | Evidencia |
| --- | --- | --- |
| control-de-gastos: menú /budgets | Cumple | `nav-items.ts` ("Control de Gastos"), `router.tsx` |
| control-de-gastos: grilla de umbrales | Cumple | `spending-control.service.ts` (filtro `thresholdAmount gt 0`); test "muestra las categorías con umbral y su estado" |
| control-de-gastos: acumulado por moneda | Cumple | `groupBy` por `categoryId`+`currency` solo `EGRESO`; test "evalúa cada categoría con umbral contra los egresos del mes" |
| control-de-gastos: estados y colores | Cumple | `spending-limit.ts` + `spendingStatusAmountClasses`; tests `spending-limit.spec.ts` y "subraya el gastado según el estado" |
| control-de-gastos: endpoint | Cumple | `GET /api/spending-control` con guard global JWT |
| control-de-gastos: filtros y estados | Cumple | `spending-control-page.tsx`; tests de filtro por texto y estado vacío |
| control-de-gastos: responsive y oscuro | Cumple (código) | tabla `hidden md:block` + `<ul className="md:hidden">`; tokens `text-warning`/`dark` |
| control-de-gastos: aviso en la respuesta | Cumple | `spending-alert.ts`; tests de aviso en movimientos, gastos fijos y deudas |
| control-de-gastos: banner inline | Cumple | `spending-alert-banner.tsx`; tests "avisa al alcanzar el 80 %" y "marca el exceso en rojo" |
| movimientos-categorias: umbral en Categoría | Cumple | `create-category.dto.ts`, `categories.service.ts`, `category-form-dialog.tsx`, `schemas.ts` |
| gastos-fijos: aviso al pagar | Cumple | `fixed-expenses.service.ts` (`spendingAlert` en el pago) |
| deudas: aviso al pagar propio | Cumple | `debt-settlements.service.ts` (`isOutgoing`), sin aviso en cobros |
