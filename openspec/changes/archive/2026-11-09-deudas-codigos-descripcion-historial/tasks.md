# Tareas: Códigos, descripción y historial en Deudas

Estado verificado el 8 de noviembre de 2026 sobre el código ya implementado: pruebas de
backend 191/191, pruebas de frontend 99/99 y smoke real contra la API en Docker. Cada tarea
enlaza su requisito en `specs/deudas/spec.md` o, para los ajustes de división, en el delta
actualizado del change activo `division-gastos` (decisión en `design.md`).

## Datos

- [x] 1. `Debt.code` y `DebtSplit.code` (`VARCHAR(16)`, `@@unique([userId, code])`) y
  secuencias `users.debtProperSequence`/`debtThirdSequence`/`splitSequence` —
  `backend/prisma/schema.prisma` (deudas: Códigos únicos de deuda)
- [x] 2. Migración `20261109010000_add_debt_and_split_codes`: columnas nullable, backfill por
  usuario/tipo en orden `(createdAt, id)`, sincronización de contadores con el máximo usado,
  endurecimiento `NOT NULL` y índices únicos —
  `backend/prisma/migrations/20261109010000_add_debt_and_split_codes/migration.sql` (deudas:
  Deudas existentes asignadas por backfill; division-gastos: Código de división)

## Backend

- [x] 3. `nextDebtCode` (DP/DT por tipo) y `nextSplitCode` (DG) incrementando las secuencias
  dentro de la transacción del alta — `backend/src/modules/debts/debt-movements.ts` (deudas:
  Códigos únicos de deuda, Numeración por tipo)
- [x] 4. `CreateDebtDto.note` y `CreateDebtSplitDto.note` obligatorios: trim +
  `@MinLength(1)` "La descripción es obligatoria", máx. 500 —
  `backend/src/modules/debts/dto/create-debt.dto.ts`, `dto/create-debt-split.dto.ts` (deudas:
  Descripción obligatoria al registrar deudas; division-gastos: Descripción obligatoria)
- [x] 5. `QueryDebtsDto.description` (máx. 100) aplicado como `contains` insensible sobre
  `note` en `DebtsService.findAll` — `dto/query-debts.dto.ts`, `debts.service.ts` (deudas:
  Filtro por descripción de deuda)
- [x] 6. `QueryDebtSplitsDto.search` (nuevo DTO) aplicado como `contains` insensible sobre
  `note` O `code` en `DebtSplitsService.findAll`; `DebtSplitsController` pasa a tiparlo —
  `dto/query-debt-splits.dto.ts`, `debt-splits.controller.ts` (division-gastos: Búsqueda de
  divisiones)
- [x] 7. `DebtResponse` con `code`, `splitCode` (desde la relación `debt.split`) y
  `paymentProgress` derivado en `computeDebtSummary` (NONE/PARTIAL/FULL sobre la suma de
  importes pagados; sin enum persistente) — `debt-response.ts`, `debts.service.ts` (deudas:
  Estado de pago parcial derivado, Referencia a la división de origen, Resumen de una deuda)
- [x] 8. Notas de movimientos con código al inicio: creación
  `<código> — Préstamo a|recibido de <persona>`, cuota
  `<código> — <actor> · Pago|Cobro Cuota n/N`, reversa
  `<código> — <actor> · Reversa de pago|cobro Cuota n/N` — `debts.service.ts`,
  `debt-settlements.service.ts` (deudas: Código en la nota de los movimientos generados,
  Movimiento inicial automático MODIFIED)
- [x] 9. Circuitos de división con códigos: `splitNote` propaga la descripción recortada a
  500; deudas con nota `Deuda por división DG<n>: …` / `Deuda con X por división DG<n>: …`;
  egresos `DT<n> — Préstamo a X (por división DG<n>): …` y
  `DG<n> — Mi parte de un gasto común: …` — `debt-splits.service.ts` (division-gastos:
  Circuito generado, Descripción obligatoria)
- [x] 10. Specs de test actualizadas y verdes (191/191 backend): `debts.service.spec.ts`,
  `debt-splits.service.spec.ts`, `debt-settlements.service.spec.ts`

## Frontend

- [x] 11. Tipos y API: `Debt.code`/`splitCode`/`paymentProgress`, `DebtSplit.code`, parámetro
  `description` en `fetchDebts` y `search` en `fetchDebtSplits`; `note` requerida en los
  payloads de alta — `frontend/src/features/debts/types.ts`, `debts-api.ts`
- [x] 12. Formularios con descripción obligatoria: labels "Descripción *"/"Descripción del
  gasto *", validaciones "Ingresá una descripción" / "Ingresá una descripción del gasto" y
  bloqueo del envío — `components/debt-form-dialog.tsx`,
  `components/split-expense-dialog.tsx` (deudas: Alta sin descripción)
- [x] 13. Grilla y cards de deudas: columnas "Código" y "Descripción" (histórico sin nota →
  "—" en grilla, "Sin descripción" en card), referencia "de división DG2", badge
  "Parcialmente pagada/cobrada" (`ACTIVA` + `PARTIAL`), input "Descripción" como filtro con
  reset de página — `components/debts-tab.tsx` (deudas: Descripción en el listado, Filtro por
  descripción, Estado de pago parcial, Pantalla de deudas MODIFIED)
- [x] 14. Visualizar al click: fila desktop y encabezado de card mobile abren
  `DebtViewDialog` (solo lectura: código, actor, estado, descripción + división, billetera,
  total/pagado/restante, cuotas pagadas/total, fechas, lista de cuotas); botones de acción con
  `stopPropagation` — `components/debt-view-dialog.tsx` (nuevo), `debts-tab.tsx` (deudas:
  Visualizar una deuda al hacer click)
- [x] 14b. Código en los encabezados de acción: `DebtPaymentDialog` muestra
  "{Cobrar|Pagar} — {code} · {actor}" y `DebtReversalDialog`
  "Deshacer cobros y pagos — {code} · {actor}" (verificados con tests frontend 99/99,
  typecheck y lint verdes) — `components/debt-payment-dialog.tsx`,
  `components/debt-reversal-dialog.tsx` (deudas: Código visible en el diálogo de cobro o pago)
- [x] 15. Historial en el diálogo: creación con código y fecha, cada settlement con fecha,
  importe, números de cuota y badge "Pago/Cobro deshecho" si `REVERTIDA`, línea
  "Pagada/Cobrada en total" con la última operación vigente al estar `FULL`; carga con
  skeleton y error con reintento usando `GET /debts/:id` y `GET /debts/:id/settlements` —
  `debt-view-dialog.tsx` (deudas: Historial de una deuda)
- [x] 16. Solapa División de Gastos: campo "Buscar por descripción o código" (placeholder
  "Ej: asado, DG1") y código al inicio de cada card — `components/debt-splits-tab.tsx`
  (division-gastos: Búsqueda, Código en la presentación)
- [x] 17. Pruebas de página actualizadas y verdes (99/99 frontend):
  `pages/debts-page.test.tsx`

## Documentación

- [x] 18. Delta `specs/deudas/spec.md` de este change (ADDED + MODIFIED) y actualización en
  el lugar del delta de `division-gastos` (`specs/division-de-gastos/spec.md` + nota de
  mantenimiento en su `proposal.md`) — decisión y equivalencias en `design.md`

## Pendiente (no bloquea)

- [ ] 19. Al archivar: `division-gastos` primero y este change después (riesgo de regression
  del requisito `Pantalla de deudas` si se invierte el orden — decisión 2 del design).

> Resuelta: el código de la deuda se muestra en el encabezado del formulario de pago/cobro y
> del de deshacer (tarea 14b; brecha 1 original del pedido).
