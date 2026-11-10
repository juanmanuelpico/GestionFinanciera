# Propuesta: División de Gastos

## Pedido

> "División de Gastos": pestaña dentro de la pantalla de Deudas para registrar cuánto gastó
> cada persona en un gasto común y cuánto me deben o debo. Formulario con billetera, gasto
> total, "tu parte", filas de actores (solo personas) y nota opcional; reparto automático en
> partes iguales con ajuste de centavos y recálculo en cascada; bloqueo de confirmación si las
> partes no suman exactamente el total; campo "¿Quién pagó el total de la cuenta?" que decide
> el circuito generado (deudas de terceros + egresos si pago yo, o una única deuda propia sin
> movimientos si pagó un actor); listado con paginación y eliminación que restablece todo el
> circuito, bloqueada si ya hubo cobros o pagos.

## Por qué

Un gasto común entre varias personas hoy debe cargarse a mano como deudas separadas, sin
registro del reparto real. La división captura el gasto una sola vez, genera automáticamente
las deudas y los movimientos correctos, y deja evidencia histórica del reparto por persona.

## Qué cambia

- **Datos:** nuevas entidades `DebtSplit` (`debt_splits`) y `DebtSplitItem`
  (`debt_split_items`, únicas por `splitId` + `actorId`); `Debt` pasa a tener `splitId`
  opcional que vincula las deudas generadas. Migración
  `backend/prisma/migrations/20261108184058_add_debt_splits/`.
- **Backend:** nuevo módulo en `debts`: `DebtSplitsController` con
  `GET /api/debt-splits` (paginado), `POST /api/debt-splits` y `DELETE /api/debt-splits/:id`
  (204), más `DebtSplitsService` que crea y deshace el circuito en una transacción
  `Serializable`. En `debt-movements.ts` se agregan `SPLIT_EXPENSE_CATEGORY_NAME`
  ("Gasto fijo"), `ensureSplitExpenseCategory` y `createSplitShareMovement`.
- **Circuitos generados:** si paga el usuario, una deuda `TERCERO` de 1 cuota por actor con
  parte > 0 con su egreso inicial (categoría "Deudas") más un egreso sin deuda por la parte
  propia (categoría auto-creada "Gasto fijo"), descontando el total del disponible de la
  billetera; si paga un actor, una única deuda `PROPIA` de 1 cuota hacia ese actor por "tu
  parte", sin movimientos. Las deudas generadas se cobran/pagan con los flujos ya
  especificados de la capability `deudas`.
- **Frontend:** cuarta pestaña "División de Gastos" en la pantalla de Deudas
  (`?tab=division`), con `DebtSplitsTab` (listado paginado de 20, eliminación con
  confirmación destructiva) y `SplitExpenseDialog` (formulario de alta). `ActorSearchSelect`
  gana la acción "Agregar persona" (`onCreate`) y `ActorFormDialog` los props `lockType` y
  `onCreated` para crear la persona con el tipo bloqueado y preseleccionarla en la fila.
- **Tests:** `backend/src/modules/debts/debt-splits.service.spec.ts` (12) y 6 tests de
  división en `frontend/src/features/debts/pages/debts-page.test.tsx`.

## Equivalencias de atributos

| Pedido (español) | Código | Nota |
| --- | --- | --- |
| División de gastos | `DebtSplit` / tabla `debt_splits` / `/api/debt-splits` | |
| Gasto total | `totalAmount` | Decimal(14,2), > 0, máx. 2 decimales |
| Tu parte | `userAmount` | ≥ 0; debe ser > 0 si pagó un actor |
| Filas de actores | `items[]` → `DebtSplitItem` (`actorId`, `amount`) | 1 a 50, actores distintos, solo `PERSONA` |
| ¿Quién pagó el total? | `payer` (`USER` \| `ACTOR`) + `payerActorId` / `DebtSplit.paidByActorId` | El pagador debe ser un actor de la división |
| Descripción / nota | `note` | **Obligatoria** (ajuste 2026-11-08), trim, máx. 500 caracteres; se propaga con prefijo y códigos a deudas y movimientos |
| Código de división | `DebtSplit.code` / secuencia `users.splitSequence` | `DG<n>` único por (usuario, código); backfill en orden de creación; buscable con `search` |
| Billetera | `currency` | De `debtCurrencies` y habilitada para el usuario |
| Fecha del gasto | `DebtSplit.operationDate` | La fija el servidor (hoy); vencimiento de la cuota = +1 mes |
| Deudas generadas | `Debt.splitId` → `DebtSplit.debts` | `TERCERO` por actor o `PROPIA` al pagador, 1 cuota |
| Egreso de mi parte | `DebtSplit.userShareMovement` (`userShareMovementId`) | Solo cuando paga el usuario y la parte > 0 |
| Categoría "Gasto fijo" | `SPLIT_EXPENSE_CATEGORY_NAME` | Auto-creada/reutilizada por usuario |
| Categoría "Deudas" | `DEBT_CATEGORY_NAME` | Reutilizada para los egresos iniciales de terceros |

## Capacidades

### Capacidades nuevas

- `division-de-gastos`: registro de la división, reparto automático con cascada, alta de
  persona desde el selector, circuito según quién pagó, listado con paginación, eliminación
  con restablecimiento y aislamiento por usuario.

### Capacidades modificadas

- `deudas`: `Pantalla de deudas` pasa de tres solapas a cuatro con "División de Gastos" y su
  botón Agregar correspondiente.

## Fuera de alcance

- Edición de una división existente: solo alta y eliminación (se rehace y se registra de nuevo).
- Dividir un gasto con tarjetas o con actores de otro usuario.
- Conversión de monedas entre billeteras o reparto en monedas distintas.
- Cálculo automático de "tu parte" por cantidad de personas (el reparto por defecto es
  `(total − tu parte) / N`, pero la parte del usuario siempre la ingresa el usuario).
- Reembolsos parciales entre participantes o cierre de una división sin borrarla.

## Supuestos

- La fecha de operación es la fecha del servidor en el alta; no la elige el usuario.
- "Ajuste de centavos" = partes iguales redondeadas hacia abajo y la última fila recalculada
  absorbe la diferencia, de modo que la suma cierre al centavo.
- El recálculo en cascada deja intactas las filas en o por encima de la fila editada
  (incluida "tu parte", que nunca se recalcula).
- Si paga un actor, el disponible de la billetera no se toca en el alta: el gasto ya salió de
  la wallet de esa persona; el egreso propio recién ocurre al pagar la deuda generada.

## Brechas y decisiones pendientes

1. **Máximo de 50 actores solo en el backend.** La UI no limita la cantidad de filas: el 51°
   actor se rechaza al confirmar con el mensaje de la API. Decidir si el botón "Agregar actor"
   debe deshabilitarse en la fila 50.
2. **Categoría "Gasto fijo" convive con categorías del usuario.** Se auto-crea una categoría
   EGRESO neutra (`type: null`) y se reutiliza si el usuario ya tiene una categoría con ese
   nombre (upsert por `userId_name`); el umbral de Control de Gastos que pudiera tenerla no se
   documenta aquí. Decidir si conviene un nombre menos confundible (p. ej. "Divisiones").
3. **Bloqueo de eliminación por cobros revertidos.** La comprobación usa
   `installment.paidAmount > 0`; una operación revertida deja el saldo en cero y la división
   vuelve a ser eliminable aunque haya historial de operaciones. Parece correcto (el dinero ya
   se restituyó), pero conviene confirmarlo como regla de producto.

## Actualización de artefactos (2026-11-08)

El cambio `deudas-codigos-descripcion-historial` ajustó esta capability sobre el código, la
descripción obligatoria, la búsqueda y el formato de las notas generadas (códigos `DG`/`DT`/`DP`
al inicio). Como estas requirements aún no están en `openspec/specs/` (el change no fue
archivado), los comportamientos se describieron editando este mismo delta en vez de duplicarlos
en el cambio nuevo. Decisión documentada en
`openspec/changes/deudas-codigos-descripcion-historial/design.md`.
