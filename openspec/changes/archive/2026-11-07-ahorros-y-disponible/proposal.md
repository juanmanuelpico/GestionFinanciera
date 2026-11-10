# Propuesta: Ahorros y dinero disponible

## Pedido (resumen fiel)

- Header con el dinero disponible (ingresos menos egresos) de una billetera, elegida en un combo con las billeteras habilitadas. Por defecto ARS.
- Configuración > sección "Ahorros": elegir las monedas a utilizar (ARS, USD, EUR) y la billetera del header.
- Nuevo punto de menú "Ahorros" después de "Movimientos".
- Pantalla principal de ahorros: ahorros por moneda, estimado de conversión entre monedas, historial de movimientos de ahorro (agregar o quitar), listado y alta.
- Alta de ahorro: moneda, cantidad, cotización, estimado a descontar del disponible, fecha de compra, observación, billetera de descuento. Persiste createdAt/updatedAt.
- Cada alta descuenta del disponible y genera un EGRESO en la categoría "Ahorro" de Movimientos.
- Devolver un ahorro al disponible (INGRESO en la billetera elegida) o convertirlo a otra moneda (ARS, USD o EUR).
- Ajustar un ahorro (sumar o restar) sin tocar el disponible, con historial.
- Cotizaciones de DolarApi: blue, oficial y MEP, visibles en la pantalla de ahorros. El euro es manual.

## Decisiones confirmadas por el usuario

1. Disponible por billetera: un solo combo en el header; por defecto ARS.
2. Combo de billetera para descontar y devolver; por defecto ARS.
3. Cotización al descontar: igual que al sumar (blue, oficial, MEP o manual).
4. Conversión: solo entre ARS, USD y EUR.
5. Moneda deshabilitada: se oculta del header; no bloquea ni borra ahorros existentes.
6. Fuente de cotizaciones: DolarApi únicamente (`/v1/dolares/blue`, `/v1/dolares/oficial`, `/v1/dolares/bolsa`). Euro manual.

## Supuestos (aceptados al ejecutar el plan)

- La cotización es pesos por unidad de la moneda (ARS = 1).
- Cuando la billetera de descuento o devolución es distinta de la moneda del ahorro y de ARS, se pide una cotización manual de la billetera.
- La categoría "Ahorro" se crea por usuario sin tipo fijo (`type = null`), para poder registrar EGRESO (alta) e INGRESO (devolución).
- Un ahorro devuelto queda en estado CERRADO con importe 0 y su historial.

## Fuera de alcance

- Intereses, rendimientos o plazos fijos.
- Historial de cotizaciones.
- Conversión que genere movimientos de disponible.
