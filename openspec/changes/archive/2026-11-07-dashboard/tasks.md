# Tareas: Dashboard por módulo y configuración de secciones

Estado al 7 de noviembre de 2026. Cada tarea enlaza sus requisitos en `specs/`.
T1–T5 están implementadas en el repositorio; T6 es este change, pendiente de aprobación.

## Backend

- [x] T1. Endpoint `GET /dashboard/summary` con resumen de ahorros, gastos fijos del mes y
  deudas propias y de terceros (dashboard: resumen por módulo) —
  `backend/src/modules/dashboard/dashboard.controller.ts`,
  `dashboard.service.ts`, `dashboard-calculations.ts`, `dashboard.module.ts`
- [x] T2. Preferencia `dashboardSections` por usuario: enum `DashboardSection`, migración
  y DTO/servicio de preferencias (configuracion: preferencia y propagación) —
  `backend/prisma/schema.prisma`,
  `backend/prisma/migrations/20261107010000_add_dashboard_sections`,
  `backend/src/common/dashboard-sections.ts`,
  `backend/src/modules/users/dto/update-user-preferences.dto.ts`,
  `backend/src/modules/users/users.service.ts`

## Frontend

- [x] T3. Cliente API, tipos y página del Dashboard con secciones, mensajes verdes en cero
  y franja compacta de cotizaciones (dashboard: resumen, mensajes y cotizaciones) —
  `frontend/src/features/dashboard/dashboard-api.ts`, `types.ts`,
  `pages/dashboard-page.tsx`, `components/dashboard-stat-card.tsx`,
  `components/dollar-quotes-strip.tsx`
- [x] T4. Configuración colapsable y sección "Dashboard" con checkboxes por módulo
  (configuracion: sección Dashboard y secciones colapsables) —
  `frontend/src/features/preferences/settings-section.tsx`,
  `dashboard-settings-card.tsx`, `dashboard-sections.ts`,
  `savings-settings-card.tsx`, `payment-methods-settings-card.tsx`,
  `pages/settings-page.tsx`
- [x] T5. Tests de los criterios en backend y frontend —
  `backend/src/modules/dashboard/dashboard-calculations.spec.ts`,
  `dashboard.service.spec.ts`, `backend/src/modules/users/users.service.spec.ts`,
  `frontend/src/features/dashboard/pages/dashboard-page.test.tsx`,
  `frontend/src/features/preferences/pages/settings-page.test.tsx`
- [x] T6. Change OpenSpec `openspec/changes/dashboard/` con proposal, tasks y deltas de
  `dashboard` y `configuracion` (S1–S9). Creado, validado y **aprobado por el usuario el
  7/11/2026**.

## Verificación

- [x] V1. Suites del repositorio ejecutadas el 7/11/2026: backend `npm test` 148/148,
  typecheck y lint limpios; frontend `npm test` 71/71, typecheck y lint limpios.
- [ ] V2. Verificación visual en navegador (320, 375, 390, 414 y 1280 px, claro y
  oscuro) de Dashboard y Configuración (S9).

## Aprobación

Nada de este change está aprobado todavía. `openspec/specs/` permanece sin cambios hasta
la aprobación del usuario y el archivado con `/opsx-archive`.
