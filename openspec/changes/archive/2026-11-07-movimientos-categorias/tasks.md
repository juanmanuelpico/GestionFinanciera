# Tareas: Movimientos y Categorías

Estado verificado al 3 de noviembre de 2026. Cada tarea enlaza sus requisitos en `specs/movimientos-categorias/spec.md`.

- [x] 1. Modelo y migración de `categories` y `movements` (S1, S3, S4, S6)
- [x] 2. API de categorías: CRUD, búsqueda y filtro por tipo (S2)
- [x] 3. API de movimientos: CRUD, filtros y paginación (S3, S4, S8, S10)
- [x] 4. Pantalla y popup de categorías (S2, S9)
- [x] 5. Pantalla y popup de movimientos con defaults y validaciones (S4, S5, S8, S9)
- [x] 6. Menú renombrado y reubicado (S7)
- [x] 7. Revisión mobile de ambas pantallas (AGENTS.md)
- [x] 8. Test backend: rechazo de alta sin `type`, `currency` o `movementDate` (S4) — `dto/create-movement.dto.spec.ts`
- [x] 9. Test frontend: muestra el motivo al borrar categoría con movimientos (S2) — `categories-page.test.tsx`
- [ ] 10. Verificación visual a 320, 375, 390 y 414 px y en 1024-1279 px (tabla de movimientos)
- [ ] 11. Commit de la funcionalidad (requiere autorización explícita)

Checks ejecutados: backend `npm test` 17/17, `npm run typecheck`, `npm run build`; frontend `npm run typecheck`, `npm run lint`, `npm test` 23/23, `npm run build`.
