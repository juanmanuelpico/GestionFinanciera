# Propuesta: Definición de presupuestos y sistema de alertas (Control de Gastos)

## Pedido

> "Definición de presupuestos y sistema de alertas (Control de Gastos)": cada categoría puede
> declarar un umbral máximo de gasto mensual con su moneda, la pantalla **Control de Gastos**
> (que reemplaza al placeholder **Presupuestos**) muestra el acumulado del mes de cada categoría
> con su porcentaje y estado, y el sistema avisa cuando un egreso recién registrado lleva el
> acumulado al 80 % o por encima del umbral.

## Por qué

Sin un tope por categoría el usuario solo ve el gasto acumulado en los listados, tarde y sin
señal. El umbral convierte "¿cuánto gasté?" en "¿me estoy pasando?" y el aviso en el momento del
registro es lo que hace el control útil: el usuario se entera cuando todavía puede reaccionar
(80 %) y cuando ya se pasó (100 %).

## Qué cambia

- **Datos:** `Category` agrega `thresholdAmount` (`Decimal(12,2)` opcional) y `thresholdCurrency`
  (`VarChar(3)` opcional). Migración `20261107041427_add_category_spending_limits`.
- **Categorías:** el popup de alta/edición tiene el campo "Umbral máximo" y el combo de moneda;
  la lista muestra la columna "Umbral". Validaciones en backend y en el formulario (ver delta
  `movimientos-categorias`).
- **Nueva capacidad `control-de-gastos`:** endpoint `GET /api/spending-control`, pantalla con
  grilla de estados (verde/ámbar/rojo), filtros, estados vacíos y presentación mobile, más el
  aviso inline en los tres flujos que generan egresos.
- **Movimientos:** la respuesta del alta de un egreso puede traer `spendingAlert`; la pantalla
  lo muestra como banner bajo el encabezado.
- **Gastos fijos:** el pago de un período devuelve `spendingAlert` y la pantalla lo muestra
  (delta `gastos-fijos`).
- **Deudas:** el pago de cuotas de una deuda propia devuelve `spendingAlert`; los cobros de
  terceros no (delta `deudas`).
- **Sistema de diseño:** nuevo token `--warning` (ámbar) con variante oscura en `index.css`,
  registrado en `docs/ui/design-system.md` §1.3: las advertencias usan `text-warning` y
  `destructive` queda reservado para el exceso real (≥ 100 %).

## Equivalencias de atributos

| Pedido (español) | Código | Nota |
| --- | --- | --- |
| Umbral máximo | `Category.thresholdAmount` | Decimal(12,2) nullable; `0` o vacío = sin control |
| Moneda del umbral | `Category.thresholdCurrency` | `ARS`, `USD` o `EUR`; obligatoria si el umbral es > 0 |
| Gastado del mes | `spentAmount` | suma de `EGRESO` en la moneda del umbral, mes calendario UTC |
| Uso (%) | `percent` | truncado a 1 decimal (floor), no redondeado |
| Estado | `status` | `OK` (< 80 %), `WARNING` (≥ 80 %), `EXCEEDED` (≥ 100 %) |
| Período | `period` | `YYYY-MM` del mes calendario UTC |
| Aviso de umbral | `spendingAlert` | `categoryId`, `categoryName`, `currency`, `period`, `thresholdAmount`, `spentAmount`, `percent`, `status` |
| Alerta (banner) | `SpendingAlertBanner` | ámbar `WARNING` / rojo `EXCEEDED`, `role="status"` |

## Capacidades

### Capacidades nuevas

- `control-de-gastos`: umbrales por categoría y moneda, grilla del mes en curso, estados y
  colores, filtros, endpoint y avisos inline en Movimientos, Gastos fijos y Deudas.

### Capacidades modificadas

- `movimientos-categorias`: `Tabla Categoria` y `CRUD de Categoría (API y UI)` ahora con umbral
  máximo y su moneda.
- `gastos-fijos`: `Pago de un período` responde con aviso de umbral.
- `deudas`: `Cobro y pago de cuotas` responde con aviso de umbral en pagos propios.

## Fuera de alcance

- Presupuestos por período (no hay montos distintos por mes ni herencia de un mes a otro).
- Historial o consulta de meses cerrados, reportes y exportaciones del control.
- Conversión de monedas: el umbral en USD no acumula egresos en ARS.
- Notificaciones fuera de la pantalla (email, push, banner en el Dashboard) y avisos persistidos.
- Umbrales agregados (por grupo de categorías, por mes, por billetera).

## Supuestos

- "Mes" = mes calendario UTC del día actual para la grilla; para el aviso, el mes de la fecha
  del egreso.
- El umbral es un tope de gasto mensual de la categoría, no un saldo: no descuenta ni bloquea
  el registro del egreso, solo avisa.
- El nombre del menú y la ruta que ve el usuario es "Control de Gastos" sobre `/budgets`, para
  no romper enlaces existentes del placeholder.

## Brechas y decisiones pendientes

1. **Moneda del umbral sin validación de preferencias.** `thresholdCurrency` solo valida
   `ARS`/`USD`/`EUR`; a diferencia de movimientos y gastos fijos, no exige que la moneda esté
   habilitada para el usuario, y el combo del formulario ofrece las tres siempre. Decidir si se
   filtra por `enabledCurrencies` y se valida en el backend.
2. **Umbral en una categoría de tipo Ingreso.** Se acepta y la fila aparece en la grilla con
   0 % porque nunca habrá egresos en esa categoría. Decidir si el backend debe rechazar el
   umbral en categorías `INGRESO`.
3. **`PATCH /api/categories/:id` parcial.** Si el pedido informa solo `thresholdCurrency` sin
   `thresholdAmount`, el umbral queda limpiado (ambos campos a `null`). La UI siempre envía los
   dos campos, así que no se observa en la pantalla; puede sorprender a un cliente de API.
4. **Aviso retroactivo vs. grilla del mes actual.** El aviso evalúa el mes de la fecha del
   egreso y la grilla siempre muestra el mes en curso: un egreso con fecha de un mes cerrado
   puede mostrar un aviso que luego no se ve en Control de Gastos. Decidir si el aviso debe
   limitarse al mes en curso.
5. **Cálculo del aviso después de la transacción.** El acumulado del aviso se lee recién
   confirmado el alta; con dos egresos en paralelo el porcentaje mostrado puede incluir el
   egreso de la otra operación. No afecta al importe registrado, pero el aviso no es
   estrictamente "el estado justo después de MI egreso".
6. **Porcentaje no localizado.** `percentLabel` imprime decimales con punto (`79.9 %`) mientras
   los importes usan formato `es-AR` con coma. Decidir el formato definitivo.
7. **Revisión mobile visual.** La pantalla tiene tabla/tarjetas y controles responsive, pero la
   pasada visual en 320/375/390/414 px en claro y oscuro la debe confirmar el agente principal.
