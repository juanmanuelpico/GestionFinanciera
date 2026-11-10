# Tareas: Medios de pago y ajustes de interfaz

Estado al 4 de noviembre de 2026. Cada tarea enlaza sus requisitos en `specs/`.

## Backend

- [x] 1. Enum `PaymentMethod` en Prisma y migración con mapeo de valores existentes (medios-de-pago: catálogo) — `backend/prisma/schema.prisma`, `20261104120000_add_payment_methods`
- [x] 2. Preferencia `enabledPaymentMethods` en `User` y DTO de preferencias (medios-de-pago: Configuración) — `update-user-preferences.dto.ts`, `users.service.ts`
- [x] 3. DTO y servicio de movimientos con medio de pago validado por enum (medios-de-pago: catálogo, combobox) — `create-movement.dto.ts`, `movements.service.ts`
- [x] 4. Tests backend de preferencias y movimientos actualizados — 47/47

## Frontend

- [x] 5. Primitivo `components/ui/checkbox.tsx` con `@radix-ui/react-checkbox` (medios-de-pago: Configuración)
- [x] 6. Catálogo y etiquetas de medios de pago en `types/finance.ts` (medios-de-pago: catálogo)
- [x] 7. Combobox de medio de pago en el formulario de movimiento (medios-de-pago: combobox)
- [x] 8. Sección "Medios de pago" en Configuración con checkboxes (medios-de-pago: Configuración) — `payment-methods-settings-card.tsx`
- [x] 9. Ahorros: quitar botón y subtítulo, agregar "Agregar ahorro" al resumen (experiencia-ahorros: alta)
- [x] 10. Ahorros: label "Cotización" en el campo manual (experiencia-ahorros: etiqueta) — `quote-fields.tsx`
- [x] 11. Header: dinero disponible centrado, grande y destacado (header-financiero) — `available-balance.tsx`, `app-layout.tsx`
- [x] 12. Tests frontend afectados actualizados y test de la sección de medios de pago — 34/34
- [x] 13. Typecheck, lint, test y build en backend y frontend
- [x] 14. Revisión mobile con el agente `mobile-ui` (correcciones aplicadas)
- [x] 15. Verificación de cumplimiento de las specs

## Verificación

Backend:

- `npm test` → 9 archivos, 47 tests.
- `npm run typecheck`, `npm run lint`, `npm run build` → OK.

Frontend:

- `npm run typecheck` → OK.
- `npm run lint` → OK.
- `npm test` → 10 archivos, 34 tests.
- `npm run build` → OK (2396 módulos).

Mobile (agente `mobile-ui`): 320, 375, 390, 414 px y 1280+, claro y oscuro. Correcciones
aplicadas en header (dos filas por debajo de `lg`, `min-w-0`, `max-w-full`), tile de alta
de ahorro (`active:`, `touch-manipulation`), filas de checkboxes de 44 px y `min-w-0` en el
grid del modal de movimiento. Pendiente una pasada visual en navegador.

## Cumplimiento

| Req | Estado | Evidencia |
| --- | --- | --- |
| medios-de-pago: catálogo | Cumple | enum `PaymentMethod`; migración; `create-movement.dto.ts`; tests de movimientos |
| medios-de-pago: combobox | Cumple | `movement-form-dialog.tsx` + `schemas.ts`; test de modal en `movements-page.test.tsx` |
| medios-de-pago: Configuración | Cumple | `payment-methods-settings-card.tsx`; test "deshabilita un medio de pago y guarda la selección" |
| header-financiero: disponible centrado | Cumple | `available-balance.tsx`, `app-layout.tsx`; revisión mobile |
| header-financiero: selector accesible | Cumple | `wallet-selector.tsx` |
| experiencia-ahorros: alta en el resumen | Cumple | `savings-page.tsx`; tests de alta de ahorro |
| experiencia-ahorros: label "Cotización" | Cumple | `quote-fields.tsx` |
