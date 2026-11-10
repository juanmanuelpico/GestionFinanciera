# Design: Códigos, descripción y historial en Deudas

## Decisiones

### 1. Dónde vive cada requisito

- `deudas` está aprobada en `openspec/specs/`: todos los comportamientos nuevos del lado de
  las deudas van como delta (`## ADDED` + `## MODIFIED`) en
  `openspec/changes/deudas-codigos-descripcion-historial/specs/deudas/spec.md`.
- `division-de-gastos` NO está aprobada: la fuente de verdad de sus requisitos es el delta
  del change activo `division-gastos`. MODIFIED sobre ella sería inválido (no hay baseline) y
  duplicar los requisitos en este change crearía dos versiones contradictorias al archivar.
  Decisión: los ajustes de división (código `DG`, descripción obligatoria, búsqueda por nota o
  código, formato de notas con códigos) **se aplicaron editando en el lugar**
  `openspec/changes/division-gastos/specs/division-de-gastos/spec.md`, con nota de
  mantenimiento en su `proposal.md`. Este change solo especifica el lado `deudas`, incluida
  la referencia `splitCode` que expone la API de deudas.

### 2. Orden de archivado

Archivar `division-gastos` ANTES que este change. `division-gastos` aporta el delta
`Pantalla de deudas` (cuatro solapas); este change vuelve a escribir ese requisito en
`## MODIFIED` con cuatro solapas MÁS columnas/badge/click — es decir, describe el estado real
del código hoy. Al archivar en ese orden, la versión final queda en `openspec/specs/deudas/`
sin perder el botón "Agregar" de la solapa División. Si se archivara al revés, el sync de
`division-gastos` volvería a escribir la variante vieja del requisito.

### 3. Patrón de código: secuencias por usuario, no offsets

`DP<n>`/`DT<n>`/`DG<n>` se numeran por usuario y tipo con las columnas
`users.debtProperSequence`, `users.debtThirdSequence`, `users.splitSequence`, incrementadas
con `UPDATE … RETURNING` dentro de la misma transacción `Serializable` del alta — el mismo
patrón probado de `users.movementSequence` para IDs de movimientos. Evita contar filas
(cobros/deshacer no liberan números) y es seguro bajo concurrencia: el choque de serialización
se traduce en 409 accionable (`rethrowAsConflict`). Unicidad además garantizada en la base por
`@@unique([userId, code])`. El backfill de la migración numera los registros existentes por
`(userId, kind)` / `userId` en orden `(createdAt, id)` y sincroniza los contadores con el
máximo usado antes de endurecer las columnas a `NOT NULL`.

### 4. Estado parcial derivado, no persistido

`paymentProgress` se calcula sobre la suma de `installments.paidAmount`
(0 → `NONE`, 0<pagado<total → `PARTIAL`, ≥total → `FULL`) y se agrega al resumen de la
respuesta sin tocar `DebtStatus`. Al deshacer una operación los importes vuelven a bajar y el
badge queda coherente sin migraciones ni enums nuevos.

### 5. Código en la nota, no en columna del movimiento

Los movimientos siguen teniendo una sola `note`; el código se escribe al inicio con el
separador ` — ` en el momento de generar el movimiento (creación, cuota, reversa, circuitos
de división). Los movimientos y deudas históricos conservan su texto: la migración solo
agrega códigos a `debts`/`debt_splits`, nunca reescribe notas. **Implementado (2026-11-08):**
el encabezado del diálogo de pago/cobro (`{Cobrar|Pagar} — {código} · {actor}`) y el del
diálogo de reversión (`Deshacer cobros y pagos — {código} · {actor}`) muestran el código,
resolviendo la brecha 1 original; especificado como "Código visible en el diálogo de cobro o
pago".

### 6. Historial sin endpoint nuevo

El `DebtViewDialog` compone su sección "Historial" con `GET /api/debts/:id` (creación,
cuotas, `paymentProgress`) y `GET /api/debts/:id/settlements` (cada operación con ítems de
cuota y estado `ACTIVA`/`REVERTIDA`). "Pagada/Cobrada en total" usa la última operación
`ACTIVA` por fecha de pago cuando el progreso es `FULL`. No se agrega API ni tabla.

## Equivalencias de atributos (pedido en español → código)

| Pedido (español) | Código | Nota |
| --- | --- | --- |
| Descripción de la deuda / del gasto | `Debt.note` / `DebtSplit.note` | Obligatoria en DTOs (`@MinLength(1)`), trim, máx. 500; nullable en base (histórico) |
| Filtro "Descripción" (deudas) | `GET /api/debts?description` → `QueryDebtsDto.description` | `contains` insensible sobre `note`; máx. 100 |
| Búsqueda (divisiones) | `GET /api/debt-splits?search` → `QueryDebtSplitsDto.search` | `note` O `code`, insensible; máx. 100 |
| Código de deuda propia / de terceros | `Debt.code` (`DP<n>` / `DT<n>`) | `nextDebtCode`; único por `(userId, code)`; `VARCHAR(16)` |
| Código de división | `DebtSplit.code` (`DG<n>`) | `nextSplitCode`; único por `(userId, code)` |
| Secuencias de códigos | `users.debtProperSequence` / `debtThirdSequence` / `splitSequence` | Backfill: migración `20261109010000_add_debt_and_split_codes` |
| Referencia "de división DG2" | `DebtResponse.splitCode` (desde `debts.splitId`) | Nulo si la deuda no proviene de división |
| Estado "Parcialmente pagada/cobrada" | `paymentProgress` (`NONE`/`PARTIAL`/`FULL`) | Derivado de sumas pagadas; sin enum persistente |
| Nota del movimiento inicial | `${debt.code} — Préstamo a X` / `Préstamo recibido de X` | `debts.service.create` (solo con Persona) |
| Nota de cuota / reversa | `<código> — <actor> · Pago\|Cobro Cuota n/N` / `· Reversa de pago\|cobro Cuota n/N` | `debt-settlements.service.pay` / `reverse` |
| Notas de división | `Deuda por división DG<n>: <desc>` / `Deuda con X por división DG<n>: <desc>` / `DT<n> — Préstamo a X (por división DG<n>): <desc>` / `DG<n> — Mi parte de un gasto común: <desc>` | `debt-splits.service` + `splitNote` (recorte a 500) |
| Visualizar al click | `DebtViewDialog` (nuevo) | Fila desktop / encabezado card mobile; acciones con `stopPropagation` |
| Código en encabezado de acciones | `DebtPaymentDialog` title `{Cobrar\|Pagar} — {code} · {actor}` / `DebtReversalDialog` title `Deshacer cobros y pagos — {code} · {actor}` | Brecha 1 resuelta; `actor` = `displayName` |
| Historial | detalle + settlements existentes | Badge "Pago/Cobro deshecho" si `REVERTIDA`; "Pagada/Cobrada en total" al `FULL` |

## Riesgos

- Cambios de formato de nota en movimientos nuevos pueden afectar integraciones que parseen
  la nota; ningún consumo interno depende del texto (usan `debtId`/`debtMovementRole`).
- El badge parcial reemplaza a "Activa" en grilla/cards; los diálogos de acción siguen
  filtrando por `status === 'ACTIVA'`, no por progreso.
