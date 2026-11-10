# Tareas: Especificaciones de Deudas y Gastos fijos

Estado al 6 de noviembre de 2026.

## Documentación

- [x] 1. Leer el código de backend y frontend de Deudas y Gastos fijos.
- [x] 2. Escribir `specs/deudas/spec.md` como delta de la capability `deudas`.
- [x] 3. Escribir `specs/gastos-fijos/spec.md` como delta de la capability
  `gastos-fijos`, incluyendo los filtros de las tablas.
- [x] 4. Validar el cambio con `npx openspec validate specs-deudas-y-gastos-fijos
  --type change --strict`.

## Implementación asociada (ya completada)

- [x] 5. Filtros por gasto, categoría y estado en la previsión mensual.
- [x] 6. Filtros por gasto, categoría y estado en "Mis gastos fijos".
- [x] 7. Estados vacíos "No hay gastos que coincidan con los filtros" y acción
  "Limpiar filtros".
- [x] 8. Tests de filtros en `fixed-expenses-page.test.tsx`.
- [x] 9. Typecheck, lint, tests y build del frontend en verde.

## Aprobación y archivo

- [x] 10. Revisión y aprobación de los specs por parte del usuario (7/11/2026: "Aprobar todas
  las specs generadas hasta el momento").
- [x] 11. Resolver las decisiones pendientes de `proposal.md`: 1) fidelidad confirmada con la
  aprobación; 2) los filtros de las tablas quedaron implementados y aprobados como selección
  por texto de gasto, categoría y estado (no hace falta filtro por gasto puntual).
- [x] 12. Archivar el cambio para fusionar los deltas en `openspec/specs/` (7/11/2026).

Los commits los realiza el usuario.
