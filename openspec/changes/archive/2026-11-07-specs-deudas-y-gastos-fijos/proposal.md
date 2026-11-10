# Propuesta: Especificaciones de Deudas y Gastos fijos

## Contexto

Los módulos de Deudas y Gastos fijos ya están implementados en backend y frontend, pero
sus comportamientos no estaban registrados en OpenSpec. Además, Gastos fijos incorporó
filtros por gasto, categoría y estado en sus dos tablas.

Esta propuesta documenta ese comportamiento como delta specs de las capabilities `deudas`
y `gastos-fijos`, para que el usuario las revise y apruebe antes de que se incorporen a
`openspec/specs/`.

## Alcance

- Documentar en `specs/deudas/spec.md` el comportamiento actual del módulo de deudas:
  actores, alta de deudas, calendario de cuotas, movimiento inicial, cobro y pago,
  reversión, listado, pantalla y aislamiento por usuario.
- Documentar en `specs/gastos-fijos/spec.md` el comportamiento actual del módulo de gastos
  fijos: alta y edición, previsión mensual, pago con egreso automático, historial,
  filtros de las tablas y aislamiento por usuario.
- Incluir los filtros por gasto, categoría y estado agregados en las tablas de previsión
  mensual y "Mis gastos fijos".

## Fuera de alcance

- Cambios de comportamiento o de código para Deudas.
- Nuevos filtros o columnas en el historial de pagos (corresponde a un solo gasto).
- Modificaciones al flujo de Movimientos, Ahorros o Presupuestos.

## Equivalencias de atributos

### Deudas

| Término del producto | Código | Nota |
| --- | --- | --- |
| Deuda propia | `Debt.kind = PROPIA` | Dinero que el usuario debe |
| Deuda de tercero | `Debt.kind = TERCERO` | Dinero que le deben al usuario |
| Persona / Tarjeta | `DebtActor.type = PERSONA \| TARJETA` | Actores de deuda |
| Cuota | `DebtInstallment` | Calendario mensual de la deuda |
| Cobro / pago | `DebtSettlement` | Operación que liquida una o más cuotas |
| Billetera | `Debt.currency` / `DebtSettlement.walletCurrency` | `ARS`, `USD`, `EUR` |

### Gastos fijos

| Término del producto | Código | Nota |
| --- | --- | --- |
| Gasto fijo | `FixedExpense` | Definición recurrente |
| Título | `FixedExpense.title` | Máx. 120 caracteres |
| Importe estimado | `FixedExpense.amount` | Mayor a 0, hasta 2 decimales |
| Frecuencia | `FixedExpense.intervalMonths` | 1 a 120 meses |
| Día habitual | `FixedExpense.dueDay` | Se deriva del primer vencimiento |
| Estado | `FixedExpense.active` | Activo / Inactivo |
| Pago | `FixedExpensePayment` | Un pago por gasto y período |
| Período | `FixedExpensePayment.period` | Formato `YYYY-MM` |

## Estado

- Implementación: completa y verificada (backend y frontend en verde).
- Specs: escritas como delta, **pendientes de aprobación del usuario**.
- Al aprobar: archivar el cambio para fusionar los deltas en `openspec/specs/`.

## Decisiones pendientes de confirmación

1. ¿Los specs describen fielmente el comportamiento esperado de Deudas y Gastos fijos?
2. ¿Los filtros de las tablas deben ser solo por texto en "Gasto" o también por selección
   de un gasto puntual?
