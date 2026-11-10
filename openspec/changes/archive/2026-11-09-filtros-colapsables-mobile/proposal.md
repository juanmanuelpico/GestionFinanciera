# Propuesta: Filtros colapsables en mobile

## Por qué

Las barras de filtros muestran todos sus campos siempre visibles; en un teléfono (<640 px)
ocupan media pantalla y empujan el listado fuera de vista. Además, los `SelectTrigger` sin
altura explícita medían 40 px, por debajo del mínimo táctil recomendado (44 px), y la convención
del proyecto `h-11 sm:h-10` no funcionaba porque el primitivo imponía su altura default con un
selector de atributo de mayor especificidad. El usuario pidió usar los filtros con una mano
desde el celular sin perder la aplicación en vivo que ya existía en escritorio.

## Qué cambia

1. Componente nuevo `CollapsibleFilters` (`frontend/src/components/ui/collapsible-filters.tsx`
   con test): en mobile nace plegado detrás de un botón "Filtros" (44 px, `aria-expanded`,
   `aria-controls`, chevron girable) con badge de cantidad de filtros activos; desde 640 px el
   panel queda siempre visible, igual que antes. Sin botón "Aplicar" ni estado borrador —los
   filtros siguen aplicándose en vivo—, decisión explícita del usuario. "Limpiar filtros" sigue
   dentro del panel con su comportamiento actual.
2. Integración en las 8 barras de filtros existentes (solo se envuelve; campos y consultas
   intactos): Movimientos, Categorías, Historial de ahorros, Gastos fijos (ambas secciones),
   Control de gastos, Deudas, Agentes de deuda y Reportes.
3. Corrección sistémica en `SelectTrigger` (`frontend/src/components/ui/select.tsx`): la altura
   default pasa de `data-[size=default]:h-10` a `h-10` simple, para que una altura explícita del
   consumidor (convención táctil `h-11 sm:h-10`, ~101 instancias) gane en cascada. Donde no hay
   override la altura computada no cambia; `size="sm"` (32 px) intacto; escritorio intacto.
4. Auditoría mobile-ui de 4 módulos, ya implementada: Deudas (diálogos en 90 % del viewport
   dinámico con scroll interno y margen de safe-area inferior), Reportes (`ChartFrame`: el
   gráfico conserva 360 px mínimos legibles y scrollea solo él dentro de su marco), Chat
   (composer con `env(safe-area-inset-bottom)`), Control de Gastos (tabla → lista apilada bajo
   `lg`) y Dashboard (franja de cotizaciones en 1 columna bajo `sm`).

## Decisión: un solo change en lugar de dos

Se evaluó separar la corrección del primitivo `SelectTrigger` en un change propio. Se decide NO
hacerlo: el cambio al primitivo no tiene comportamiento observable autónomo (ninguna altura
computada cambia donde no hay override) y su única razón de ser es habilitar los 44 px táctiles
de las barras de filtros de este pedido. Separarlos crearía dos changes interdependientes que
habría que archivar juntos para que la spec de mobile fuera coherente.

## Capabilities

- `filtros-mobile` (nueva, delta): plegado por defecto en mobile, despliegue/replegado
  accesible, badge de conteo, aplicación en vivo, "Limpiar filtros", escritorio sin plegado,
  cobertura de las 8 pantallas y altura táctil de los campos (incluye el efecto del primitivo).
- `dashboard` (delta contra spec aprobada): franja de cotizaciones en una columna en mobile —
  comportamiento del código que la spec aprobada no describía.
- `deudas` (delta): diálogos del módulo adaptados al viewport dinámico con safe-area — no
  descrito en la spec aprobada ni en los changes activos de `deudas` (verificados sin menciones
  de `dvh`/safe-area).
- Behaviors de capabilities de changes activos **no duplicados aquí**, incorporados a sus
  deltas (los dueños del comportamiento de esas pantallas):
  - `reportes-estadisticas`: escenario nuevo "Gráfico más angosto que la pantalla" para
    `ChartFrame`.
  - `chat` (en `add-chatbot-assistant`): escenario nuevo de safe-area del composer.
  - `control-de-gastos`: corrección del texto `md` → `lg` (el delta activo decía "tabla desde
    `md`" y el código renderiza la tabla desde `lg`; se alinea a la realidad implementada).

## Equivalencias de atributos

| Nombre en la UI (español) | Identificador en el código |
| --- | --- |
| Botón "Filtros" | toggle de `CollapsibleFilters` (`aria-expanded`/`aria-controls`) |
| Badge de cantidad | prop `activeCount`, variable `activeFilterCount` por pantalla |
| Desde / Hasta (Movimientos, Historial) | `from` / `to` |
| Desde / Hasta (Reportes) | `period.from` / `period.to` — cuentan como 1 (período no default) |
| Tipo | `typeFilter` / `type` ('ALL' = Todos, valor de defecto) |
| Categoría | `categoryFilter` (Movimientos), `categoryId` (Gastos fijos) |
| Buscar | `search` (Categorías, Deudas, Agentes, Control de gastos, Historial) |
| Gasto | `search` de la barra de Gastos fijos |
| Descripción | `description` (Deudas) |
| Estado | `status` (Gastos fijos), `statusFilter` (Deudas, Control de gastos) |
| Billetera | `currencyFilter` (Deudas), `currencyChoice` (Reportes) |
| Moneda | `currency` (Historial de ahorros) |
| Origen | `actorTypeFilter` (Deudas; solo cuenta en deudas propias) |
| "Limpiar filtros" | `onClear` con deshabilitado por `hasFilters` / `canClear` |

## Impacto

- Frontend únicamente: componente nuevo + test, `select.tsx`, 8 páginas/componentes de filtros
  y los ajustes puntuales de la auditoría (diálogos de Deudas, `ChartFrame`, chat-page,
  spending-control-page, dollar-quotes-strip).
- Sin cambios de backend, de campos, de consultas ni de comportamiento en escritorio.
- Verificado con `npm run typecheck`, `npm run lint`, `npm test` (110 pruebas) y `npm run build`
  en verde.
