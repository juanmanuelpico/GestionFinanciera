# Tareas: Filtros colapsables en mobile

Estado verificado el 9 de noviembre de 2026 sobre el código ya implementado: `npm run
typecheck`, `npm run lint`, `npm test` (110 pruebas) y `npm run build` en verde. Cada tarea
enlaza su requisito en `specs/`.

## Componente y primitivos

- [x] 1. `CollapsibleFilters`: botón "Filtros" de 44 px con `aria-expanded`/`aria-controls`,
  chevron girable, badge de `activeCount` (`aria-label` "N filtros activo(s)") y panel oculto
  hasta abrir en mobile; siempre visible desde `sm` (filtros-mobile: Panel de filtros plegado
  por defecto en mobile, Despliegue y replegado accesibles, Badge de filtros activos, Escritorio
  sin plegado) — `frontend/src/components/ui/collapsible-filters.tsx`
- [x] 2. Prueba unitaria del componente: render inicial, apertura/cierre con `aria-expanded` y
  badge de cantidad — `frontend/src/components/ui/collapsible-filters.test.tsx`
- [x] 3. `SelectTrigger`: altura default `data-[size=default]:h-10` → `h-10` simple para que la
  convención táctil del consumidor (`h-11 sm:h-10`) gane en cascada sin alterar alturas sin
  override ni la variante pequeña (filtros-mobile: Campos de filtros con altura táctil) —
  `frontend/src/components/ui/select.tsx`

## Integraciones (solo envolver; campos y consultas sin cambios)

- [x] 4. Movimientos: Desde/Hasta/Tipo/Categoría + "Limpiar filtros" dentro del panel, conteo
  campo a campo (filtros-mobile: Pantallas con panel plegable, Aplicación en vivo) —
  `frontend/src/features/movements/pages/movements-page.tsx`
- [x] 5. Categorías: Buscar/Tipo + Limpiar, deshabilitado sin filtros —
  `frontend/src/features/categories/pages/categories-page.tsx`
- [x] 6. Historial de ahorros: Desde/Hasta/Tipo/Moneda/Buscar + Limpiar (`canClear`) —
  `frontend/src/features/savings/components/savings-history-filters.tsx`
- [x] 7. Gastos fijos: `FilterBar` (Gasto/Categoría/Estado + Limpiar) usado por ambas secciones —
  `frontend/src/features/fixed-expenses/pages/fixed-expenses-page.tsx`
- [x] 8. Control de gastos: Buscar/Estado + Limpiar —
  `frontend/src/features/spending-control/pages/spending-control-page.tsx`
- [x] 9. Deudas y Agentes de deuda: Buscar/Descripción/Estado/Billetera/Origen (y Buscar/Tipo en
  agentes) + Limpiar; "Origen" solo cuenta en deudas propias —
  `frontend/src/features/debts/components/debts-tab.tsx`,
  `frontend/src/features/debts/components/actors-tab.tsx`
- [x] 10. Reportes: presets de Período + Desde/Hasta (cuentan como 1 filtro) + Billetera +
  Limpiar — `frontend/src/features/reports/pages/reports-page.tsx`

## Auditoría mobile-ui

- [x] 11. Diálogos de Deudas (alta/edición, visualización, pago, reversión, división, agente):
  `max-h-[90dvh]` con scroll interno y `padding-bottom` con `env(safe-area-inset-bottom)`
  (deudas: Los diálogos de Deudas caben en la ventana móvil) —
  `frontend/src/features/debts/components/*.tsx`
- [x] 12. `ChartFrame` en Reportes: ancho mínimo legible de 360 px con scroll horizontal solo
  del gráfico dentro de la card; 100 % de ancho desde `sm` — escenario agregado al delta activo
  `reportes-estadisticas` ("Gráficos legibles en mobile...") —
  `frontend/src/features/reports/components/report-ui.tsx` y sus tabs
- [x] 13. Chat: composer con `pb-[max(0.75rem,env(safe-area-inset-bottom))]` — escenario
  agregado al delta activo `chat` ("Mobile-first con el sistema de diseño") —
  `frontend/src/features/chat/pages/chat-page.tsx`
- [x] 14. Control de gastos: tabla desde `lg` y lista apilada por debajo; el delta activo decía
  `md`, se corrigió a `lg` para coincidir con el código —
  `frontend/src/features/spending-control/pages/spending-control-page.tsx`
- [x] 15. Dashboard: franja de cotizaciones en 1 columna bajo `sm` y 3 desde `sm`
  (dashboard: La franja de cotizaciones se apila en una columna en mobile) —
  `frontend/src/features/dashboard/components/dollar-quotes-strip.tsx`

## Spec

- [x] 16. Delta `filtros-mobile`, `dashboard` y `deudas` creados; escenarios en los deltas
  activos de `reportes-estadisticas`, `chat` y corrección `md`→`lg` en `control-de-gastos`;
  validado con `npx openspec validate filtros-colapsables-mobile --type change --strict`
