# Propuesta: Códigos, descripción y historial en Deudas

## Pedido

> Ajuste en módulo de deudas: descripción obligatoria en los tres formularios (deuda propia,
> de terceros y división de gastos) con columna "Descripción" en la grilla y "—" para
> registros históricos; filtro por descripción en "Descripción" (deudas) y búsqueda por nota o
> código en la solapa División de Gastos; códigos únicos `DP<n>`/`DT<n>`/`DG<n>` por usuario y
> tipo con backfill; el código encabeza la nota de los movimientos generados; las deudas de
> división referencian su `DG`; estado derivado "Parcialmente pagada/cobrada"; visualización de
> la deuda al click con historial de pagos/cobros en solo lectura.

## Por qué

Sin códigos, una deuda solo se identifica por "el actor + importe", que se repite cuando hay
varias deudas con la misma persona y rompe la trazabilidad con los movimientos. Sin
descripción obligatoria, los listados eran incomprensibles meses después. Y para auditar una
deuda había que abrir formularios de acción: faltaba una vista de solo lectura con su
historial.

## Qué cambia

- **Datos:** `debts.code` y `debt_splits.code` (`VARCHAR(16)`, únicos por `(userId, code)`) y
  las secuencias `users.debtProperSequence` / `users.debtThirdSequence` /
  `users.splitSequence` (patrón del existente `movementSequence`). Migración
  `backend/prisma/migrations/20261109010000_add_debt_and_split_codes/` con backfill por
  usuario, tipo y orden de creación, sincronización de contadores y endurecimiento `NOT NULL`.
  `note` sigue nullable en la base: los registros históricos no se tocan.
- **Backend (`debts`):** generación de códigos en la transacción Serializable del alta
  (`nextDebtCode`/`nextSplitCode` en `debt-movements.ts`); `note` obligatoria en
  `CreateDebtDto` y `CreateDebtSplitDto` (`@MinLength(1)`, "La descripción es obligatoria");
  `GET /api/debts` acepta `description` (contains sobre la nota, case-insensitive) y
  `GET /api/debt-splits` acepta `search` (nota O código, nuevo `QueryDebtSplitsDto`); la
  respuesta de deuda agrega `code`, `splitCode` y `paymentProgress` (`NONE`/`PARTIAL`/`FULL`,
  derivado, sin enum persistente); todas las notas de movimientos generados empiezan con el
  código (`DT8 — Préstamo a Ana Garcia`, `DT8 — Ana Garcia · Cobro Cuota 1/2`,
  `… · Reversa de cobro Cuota 1/2`, `DG2 — Mi parte de un gasto común: …`,
  `DT9 — Préstamo a X (por división DG2): …`). Los movimientos históricos no se modifican.
- **Frontend (`features/debts`):** campos "Descripción"/"Descripción del gasto" obligatorios
  con validación propia ("Ingresá una descripción" / "Ingresá una descripción del gasto");
  grilla con columnas Código y Descripción (o "—"/"Sin descripción"), referencia
  "de división DG2", badge "Parcialmente pagada/cobrada"; fila (desktop) y encabezado de card
  (mobile) abren el nuevo `DebtViewDialog` de solo lectura con datos, cuotas e "Historial"
  (creación, cada settlement con badge "Pago/Cobro deshecho" si fue revertido, "Pagada/Cobrada
  en total"); el encabezado de `DebtPaymentDialog` muestra "{Cobrar|Pagar} — {código} · {actor}"
  y el de `DebtReversalDialog` "Deshacer cobros y pagos — {código} · {actor}"; solapa de deudas
  con input "Descripción" y solapa de divisiones con "Buscar por descripción o código".
- **Tests:** specs de backend actualizadas (`debts`, `debt-splits`, `debt-settlements`) y
  pruebas de página en frontend; verificación completa: backend 191/191, frontend 99/99 y
  smoke real contra la API en Docker.

## Capacidades

### Capacidades modificadas

- `deudas` (aprobada): delta en `specs/deudas/spec.md` — códigos `DP`/`DT`, descripción
  obligatoria, filtro por descripción, código en notas de movimientos, referencia `splitCode`,
  estado parcial derivado, visualizar al click e historial por deuda.
- `division-de-gastos` (change activo `division-gastos`, aún no aprobada): sus comportamientos
  nuevos (código `DG`, búsqueda, descripción obligatoria, notas con códigos) se documentaron
  **editando el delta de ese change** en vez de duplicarlos acá. Ver `design.md`.

## Fuera de alcance

- Editar o eliminar deudas (como antes: la reversión se resuelve deshaciendo cobros/pagos).
- Números persistentes de estado parcial: `paymentProgress` es derivado, no reemplaza a
  `DebtStatus`.
- Reescribir notas de movimientos o deudas históricas (backfill solo asigna códigos).
- Búsqueda por código en la solapa de deudas (el filtro nuevo de deudas es por descripción;
  la búsqueda por código existe solo en divisiones).

## Brechas y decisiones pendientes

1. **Marcador de vacío distinto por breakpoint**: la grilla usa "—" y la card mobile usa
   "Sin descripción". El delta documenta ambos; confirmar si se unifica.
2. **Orden de archivado**: `division-gastos` debe archivarse ANTES que este change; el delta
   de `deudas` reescribe `Pantalla de deudas` ya con las cuatro solapas y las columnas nuevas
   (es la verdad actual del código). Ver `design.md`.

> Resuelta: el formulario de pago/cobro y el de deshacer ahora sí muestran el código de la
> deuda en el encabezado (`{Cobrar|Pagar} — DT1 · Juan Pérez`); especificado en
> `specs/deudas/spec.md` (requisito "Código visible en el diálogo de cobro o pago").
