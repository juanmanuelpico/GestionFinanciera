# Spec Delta: Dashboard

## Purpose

Completar la spec aprobada del Dashboard con el comportamiento responsive de la franja de
cotización del dólar: en teléfonos las tres cotizaciones se apilan en una columna y desde 640 px
vuelven a mostrarse lado a lado, sin desbordes horizontales.

## ADDED Requirements

### Requirement: La franja de cotizaciones se apila en una columna en mobile

Por debajo de 640 px la franja "Cotización del dólar" DEBE (SHALL) apilar Blue, Oficial y MEP en
una sola columna, cada una con su venta y su compra, sin desborde horizontal. Desde 640 px DEBE
(SHALL) mostrar las tres cotizaciones en tres columnas lado a lado, como antes.

#### Scenario: Pantalla estrecha

- **WHEN** el Dashboard se usa entre 320 y 414 px
- **THEN** el título y las tres cotizaciones se apilan en una columna sin scroll horizontal

#### Scenario: Desde 640 px

- **WHEN** el Dashboard se abre a 640 px o más
- **THEN** Blue, Oficial y MEP aparecen en tres columnas junto al título
