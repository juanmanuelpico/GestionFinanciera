# Diseño: Movimientos y Categorías

Contenido no-delta movido desde `specs/movimientos-categorias/spec.md` al reconvertir la
especificación al formato delta canónico de OpenSpec. El comportamiento especificado no cambia:
las equivalencias de atributos y la verificación de cumplimiento se conservan íntegras. Cada
requisito de la spec corresponde al pedido original (`proposal.md`); los nombres en español del
pedido se mapean a los identificadores del código según la tabla siguiente.

## Equivalencias de requisitos (S<n> → Requirement)

`tasks.md` y la "Verificación de cumplimiento" referencian los requisitos por su número
histórico `S<n>`. La delta spec los nombra así:

| S<n> | Requirement en la delta spec |
| --- | --- |
| S1 | Tabla Categoria |
| S2 | CRUD de Categoría (API y UI) |
| S3 | Tabla Movimientos con PK compuesta |
| S4 | Campos obligatorios del movimiento |
| S5 | Valores por defecto |
| S6 | Campos opcionales |
| S7 | Navegación |
| S8 | Listado con filtros y paginación |
| S9 | Creación en popup |
| S10 | Autorización por usuario |

## Equivalencias de atributos

| Pedido | Código | Nota |
| --- | --- | --- |
| id (Categoria) | `Category.id` | Autoincremental global |
| nombre | `Category.name` | Único por usuario, sin distinguir mayúsculas |
| tipo (Categoria) | `Category.type` | Opcional: `INGRESO` / `EGRESO` |
| userId + id (Movimientos) | `Movement.userId` + `Movement.id` | PK compuesta; `id` sale de `User.movementSequence` |
| tipo (Movimiento) | `Movement.type` | Obligatorio |
| importe | `Movement.amount` | Decimal(12,2), obligatorio |
| categoriaId | `Movement.categoryId` | Obligatorio, FK a `categories` |
| fechaMovimiento | `Movement.movementDate` | Obligatorio |
| moneda | `Movement.currency` | Obligatorio, por defecto `ARS` |
| medioPago | `Movement.paymentMethod` | Opcional, enum `PaymentMethod` (ver cambio `medios-de-pago-y-ajustes-ui`) |
| observacion | `Movement.note` | Opcional, máx. 500 |

## Verificación de cumplimiento

Estado al 3 de noviembre de 2026, verificado leyendo el código y ejecutando las suites. Las
filas `S<n>` se corresponden con los requisitos de la delta spec según la tabla de equivalencias
de requisitos.

| Req | Estado | Evidencia |
| --- | --- | --- |
| S1 | Cumple | `schema.prisma` modelo `Category`; migración `20261103020452_add_categories_and_movements` |
| S2 | Cumple (API y UI); falta prueba de UI de borrado con movimientos asociados | `categories.controller.ts`, `categories-page.tsx`; `categories.service.spec.ts` "no elimina categorías con movimientos asociados" |
| S3 | Cumple | `@@id([userId, id])`; `movements.service.spec.ts` "crea el movimiento con el siguiente contador del usuario" |
| S4 | Cumple por código; sin prueba automatizada del rechazo | `create-movement.dto.ts` (`IsEnum`, `IsIn`, `IsDateString`) + `ValidationPipe` en `main.ts`; `schemas.ts` (zod `min(1)`) |
| S5 | Cumple | `movement-form-dialog`/`schemas.ts` `movementToFormValues`; `movements-page.test.tsx` "Pesos (ARS)" |
| S6 | Cumple | `schema.prisma` campos `String?`; DTO `IsOptional` |
| S7 | Cumple | `frontend/src/components/layout/nav-items.ts` (Dashboard, Movimientos, ...) |
| S8 | Cumple | `query-movements.dto.ts` (`type`, `categoryId`, `from`, `to`, paginación); `movements-page.tsx` |
| S9 | Cumple | `movimientos-page.tsx` + `movement-form-dialog.tsx` |
| S10 | Cumple | `movements.service.spec.ts` "devuelve 404 si el movimiento no pertenece al usuario"; `categories.service.spec.ts` "rechaza actualizar una categoría de otro usuario" |

Brechas cerradas (tests añadidos):
- S4: `backend/src/modules/movements/dto/create-movement.dto.spec.ts` ejecuta el `ValidationPipe` de `main.ts` y comprueba el rechazo sin `type`, `currency` o `movementDate`.
- S2: `categories-page.test.tsx` comprueba que se muestra el motivo del 409 al borrar una categoría con movimientos.

Brechas abiertas: solo la verificación visual mobile (tarea 10 de `tasks.md`).
