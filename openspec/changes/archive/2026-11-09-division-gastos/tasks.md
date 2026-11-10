# Tareas: División de Gastos

Estado verificado el 8 de noviembre de 2026 sobre el código ya implementado y con pruebas
(unitarias de backend y de página en frontend). Cada tarea enlaza su requisito en
`specs/division-de-gastos/` o `specs/deudas/`.

## Backend

- [x] 1. Entidades `DebtSplit` (`debt_splits`) y `DebtSplitItem` (`debt_split_items`, única por
  `splitId`+`actorId`) y vínculo `Debt.splitId` con índice
  (division-de-gastos: Entidad de división de gastos) — `backend/prisma/schema.prisma`,
  migración `backend/prisma/migrations/20261108184058_add_debt_splits/`
- [x] 2. `CreateDebtSplitDto` / `CreateDebtSplitItemDto` con validaciones en español: moneda del
  catálogo, total > 0, partes ≥ 0 con 2 decimales y tope 9.999.999.999,99, 1–50 ítems, pagador
  `USER`/`ACTOR`, nota opcional de 500 caracteres
  (division-de-gastos: Registro de una división) — `backend/src/modules/debts/dto/create-debt-split.dto.ts`
- [x] 3. `DebtSplitsService.create`: billetera habilitada, actores propios de tipo `PERSONA`,
  suma de partes igual al total al centavo, transacción `Serializable` con 409 por conflicto de
  serialización (division-de-gastos: Registro de una división) —
  `backend/src/modules/debts/debt-splits.service.ts`
- [x] 4. Circuito cuando paga el usuario: deuda `TERCERO` de 1 cuota por actor con parte > 0 con
  su egreso inicial `INICIAL` en categoría "Deudas", egreso adicional sin deuda por la parte
  propia con categoría auto-creada "Gasto fijo" (`userShareMovement`) y validación del
  disponible contra el total (division-de-gastos: Circuito generado según quién pagó la cuenta) —
  `debt-splits.service.ts`, `debt-movements.ts` (`ensureSplitExpenseCategory`,
  `createSplitShareMovement`, `SPLIT_EXPENSE_CATEGORY_NAME`)
- [x] 5. Circuito cuando paga un actor: única deuda `PROPIA` de 1 cuota hacia el pagador por "tu
  parte" (> 0 exigido), sin movimientos; pagador validado entre los actores de las filas
  (division-de-gastos: Circuito generado según quién pagó la cuenta) — `debt-splits.service.ts`
- [x] 6. `GET /api/debt-splits` paginado más recientes primero con partes por actor, pagador y
  deudas generadas (division-de-gastos: Listado de divisiones) —
  `backend/src/modules/debts/debt-splits.controller.ts`, `debt-splits.service.ts`
- [x] 7. `DELETE /api/debt-splits/:id` (204) que restablece el circuito: operaciones de
  cobro/pago, cuotas, movimientos (incluido el egreso de la parte propia) y deudas vinculadas,
  recuperando el disponible; bloqueo con 400 si alguna cuota tiene importes cobrados/pagados;
  404 para divisiones ajenas (division-de-gastos: Eliminación de una división con
  restablecimiento, Aislamiento por usuario) — `debt-splits.service.ts`
- [x] 8. Registro del controller y el service en el módulo de deudas — `debts.module.ts`
- [x] 9. Suite unitaria de 12 casos (alta por ambos pagadores, partes en cero, cierre de sumas,
  disponible, validaciones de actores/pagador/moneda, restablecimiento y bloqueo de eliminación)
  — `backend/src/modules/debts/debt-splits.service.spec.ts`

## Frontend

- [x] 10. Tipos de la división: `DebtSplit`, `DebtSplitItem`, `PaginatedDebtSplits`,
  `CreateDebtSplitPayload`, `SplitPayer` (division-de-gastos: Entidad de división, Listado) —
  `frontend/src/features/debts/types.ts`
- [x] 11. Cliente de API `fetchDebtSplits` / `createDebtSplit` / `deleteDebtSplit`
  (division-de-gastos: Listado, Registro) — `frontend/src/features/debts/debts-api.ts`
- [x] 12. Cuarta pestaña "División de Gastos" en Deudas con `?tab=division` en la URL y botón
  Agregar que abre el formulario de división; refresco cruzado de deudas, actores, divisiones,
  disponible y movimientos (deudas: Pantalla de deudas) —
  `frontend/src/features/debts/pages/debts-page.tsx`
- [x] 13. `SplitExpenseDialog` con billetera habilitada + disponible visible, gasto total, "tu
  parte", filas de actores e importe, y nota opcional (division-de-gastos: Registro, Circuito) —
  `frontend/src/features/debts/components/split-expense-dialog.tsx`
- [x] 14. Reparto por defecto `(total − tu parte) / N` con ajuste de centavos en la última fila y
  recálculo en cascada solo de las filas por debajo de la editada (division-de-gastos: Reparto
  automático) — `split-expense-dialog.tsx` (`redistribute`, `shareRemainingCents`)
- [x] 15. Bloqueo de "Confirmar división" hasta que las partes sumen exactamente el total, con
  mensaje en vivo de falta/sobra (division-de-gastos: Reparto automático) —
  `split-expense-dialog.tsx`
- [x] 16. Selector de pagador "¿Quién pagó el total de la cuenta?" con "Yo" o un actor
  seleccionado, ayuda dinámica y reinicio a "Yo" si se elimina la fila del pagador
  (division-de-gastos: Circuito generado) — `split-expense-dialog.tsx`
- [x] 17. Acción "Agregar persona" en cada selector de actor, con formulario de tipo bloqueado en
  "Persona" y preselección del actor creado en la fila (division-de-gastos: Alta de persona desde
  el selector) — `actor-search-select.tsx` (`onCreate`), `actor-form-dialog.tsx` (`lockType`,
  `onCreated`), export de `displayNameOf` en `debt-actors.service.ts`
- [x] 18. `DebtSplitsTab` con listado paginado (20/página), líneas por parte, etiqueta del
  pagador, badge de deudas generadas, carga/error/vacío y eliminación con confirmación
  destructiva y mensaje del backend visible (division-de-gastos: Listado, Eliminación) —
  `frontend/src/features/debts/components/debt-splits-tab.tsx`
- [x] 19. Seis tests de página: listado, apertura del formulario, creación con reparto por
  defecto, bloqueo por suma incompleta, alta de persona con preselección y eliminación con
  confirmación (division-de-gastos: varios; deudas: Pantalla de deudas) —
  `frontend/src/features/debts/pages/debts-page.test.tsx`

## Pendiente

^- [x] 20. Aprobación del usuario sobre el delta y archivado (`/opsx-archive`); `openspec/specs/`
  queda sin cambios hasta entonces.
- [ ] 21. Decisión de producto sobre las brechas listadas en `proposal.md` (tope de 50 actores en
  la UI, nombre de la categoría "Gasto fijo", criterio de bloqueo de eliminación).
