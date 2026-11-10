# Diseño: Ahorros y dinero disponible

Notas de implementación y evidencia de verificación del cambio. No forman parte de la
delta spec (`specs/ahorros-y-disponible/spec.md`); las referencias `S1..S17` equivalen a
los requisitos de esa spec en el mismo orden.

## Desviaciones y decisiones de implementación

- **Cotización de billetera distinta:** cuando la billetera de descuento o devolución es otra moneda extranjera (no la del ahorro ni ARS), se ingresa una cotización manual de esa billetera. No se elige una cotización de DolarApi para la billetera, porque DolarApi solo da USD y la regla pedida es la cotización del ahorro.
- **Categoría "Ahorro" sin tipo fijo:** `type = null`, para poder registrar EGRESO (alta) e INGRESO (devolución) con la misma categoría.
- **Cotización ARS:** un ahorro en ARS guarda `quoteType = MANUAL` y `quoteRate = null`; la cotización no aplica.
- **Venta como referencia:** las cotizaciones de DolarApi se usan por `venta` (al comprar dólares se paga el precio de venta).
- **Estimado en dashboard:** total en pesos y dólares usa dólar oficial (venta). Sin cotización del euro manual, el total excluye euros o muestra "Sin cotización".
- **Monedas deshabilitadas:** se ocultan en el header y en los combos de alta/acciones. No se bloquea ni se borra ningún ahorro existente.
- **Una posición por moneda:** el alta suma sobre la posición activa y usa cotización promedio ponderada. Si hay filas activas duplicadas por datos viejos, se consolidan en la más antigua reasignando eventos y cerrando las extra (sin borrar datos).
- **Snapshot por evento:** `quoteType`, `quoteRate`, `walletImpactAmount`, `walletImpactCurrency` y `note` se guardan al crear cada evento. La migración hace backfill de las altas existentes; las devoluciones viejas quedan sin impacto recuperable y muestran `—`.
- **Cotización de origen en devolución:** se guarda en el evento DEVOLUCION. Si no se envía, el backend usa la cotización registrada del ahorro (compatibilidad). La billetera extranjera distinta de la del ahorro y de ARS sigue usando cotización manual.
- **Monto base en conversiones:** los eventos CONVERSION guardan `sourceAmount` y `sourceCurrency` (la porción convertida en la moneda de origen). Las conversiones anteriores a esta migración no tienen el dato recuperable y se muestran sin la línea secundaria.

## Verificación de cumplimiento

Estado al 5 de noviembre de 2026, por código y pruebas automatizadas.

| Req | Estado | Evidencia |
| --- | --- | --- |
| S1 | Cumple (sin test de UI) | `components/layout/wallet-selector.tsx`; `savings.service` `availableByCurrency` (test "calcula el disponible por billetera") |
| S2 | Cumple (sin test de UI) | `preferences/savings-settings-card.tsx`; `users.service.ts` valida header habilitado |
| S3 | Cumple | `components/layout/nav-items.test.ts` ("Ahorros" tras "Movimientos") |
| S4 | Cumple | `schema.prisma` modelo `Saving`; migración `20261104004427_add_savings_and_wallets` |
| S5 | Cumple | modelo `SavingEvent` con snapshots; migración `20261105005647_add_saving_event_snapshots`; tests de alta, ajuste y devolución |
| S6 | Cumple | `dto/savings.dto.ts`; tests "descuenta en ARS..." y "suma a la posición existente y recalcula la cotización ponderada" |
| S7 | Cumple | `savings-calculations.spec.ts` y `estimate.test.ts`; alta descuenta igual que la vista previa |
| S8 | Cumple | tests "devuelve un importe parcial...", "usa la cotización de origen elegida al devolver a otra moneda", "devolver todo cierra el ahorro" y "rechaza devolver más de lo ahorrado" |
| S9 | Cumple | tests de conversión ARS a USD, fusión con posición destino y rechazo de misma moneda |
| S10 | Cumple | tests de ajuste: resta excedida rechazada, suma sin movimientos, resta total cierra |
| S11 | Cumple (con mock) | `exchange-rates.service.spec.ts`: caché, expiración y error controlado. No probado contra la red real |
| S12 | Cumple | `savings-summary.spec.ts` (positions con cotización ponderada); `savings-page.test.tsx` |
| S13 | Cumple por código | `dashboard-page.tsx`; sin test |
| S14 | Cumple | test "devuelve 404 si no hay posición en esa moneda" |
| S15 | Cumple (revisión estática) | `mobile-ui` auditó 320/375/390/414 y 1280+; correcciones aplicadas. Verificación visual en navegador pendiente (tarea 28) |
| S16 | Cumple | `savings-totalizer-card.tsx`; endpoints `positions/:currency`; tests de servicio |
| S17 | Cumple | `savings-page.tsx`, `savings-history-filters.tsx`; tests "muestra cotización...", "muestra el monto y la moneda base en una conversión", "envía los filtros..." y "pagina el historial" |

Brechas abiertas: verificación visual en navegador (tarea 15), prueba en vivo contra DolarApi y flujo completo (tarea 16), y tests de UI para el combo del header y la sección de Configuración.
