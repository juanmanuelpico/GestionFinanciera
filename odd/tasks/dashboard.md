# Dashboard — información clave por módulo y configuración

Objetivo: convertir el scaffold del Dashboard en un resumen real por módulo, con
mensajes de éxito cuando un indicador vale cero y configuración por usuario.
Rama: `master` (sin commits todavía; el usuario decide cuándo commitear).
Entrega: implementación directa inline, un change OpenSpec pendiente de aprobación.
Runner: backend `npm test` (vitest) / frontend `npm test` (vitest).

## Specs

S1. El Dashboard muestra los ahorros actuales en las diferentes monedas habilitadas.
S2. El Dashboard muestra información de las deudas propias: cantidad de personas a las
que se les debe, cantidad de personas con deuda activa, cantidad de deudas vencidas y
cantidad de cuotas vencidas.
S3. El Dashboard muestra información de las deudas de terceros: cantidad de personas
que te deben, cantidad de personas con vencimientos impagos, cantidad de deudas activas
y cantidad de cuotas vencidas.
S4. El Dashboard muestra, para el mes en curso, cantidad de gastos fijos pagados,
pendientes, vencidos y "a vencer" (los que vencen en 3 días o menos).
S5. Si un indicador numérico vale cero, el Dashboard muestra un mensaje en verde de
éxito indicando la situación, por ejemplo "Pagaste todos tus gastos fijos del mes." o
"Nadie te debe dinero.".
S6. El Dashboard muestra la información de DolarApi más pequeña y visualmente más
llamativa que la tarjeta de Ahorros.
S7. Configuración agrega un apartado "Dashboard" con un checkbox por módulo: ahorros,
gastos fijos, mis deudas, deudas de terceros y cotización del dólar. La selección se
persiste por usuario y el Dashboard la respeta.
S8. Todas las secciones de Configuración son colapsables.
S9. Todo se ve correcto en mobile (320–414 px) y escritorio, en claro y oscuro, usando
solo tokens y primitivos del sistema de diseño.

## Tasks

- [x] T1 — Backend: endpoint `GET /dashboard/summary` (S1–S5). Inline.
- [x] T2 — Backend: preferencia `dashboardSections` + migración + DTO/servicio (S7). Inline.
- [x] T3 — Frontend: API/tipos del dashboard y página con secciones y mensajes verdes (S1–S6, S9). Inline.
- [x] T4 — Frontend: Configuración colapsable + sección Dashboard con checkboxes (S7–S9). Inline.
- [x] T5 — Tests backend/frontend de los criterios (S1–S8). Inline.
- [ ] T6 — Change OpenSpec `openspec/changes/dashboard/` con delta spec, proposal y tasks (S1–S9). Pendiente de aprobación.

## Log

L2 (2026-11-07): T1–T5 implementadas y verificadas con suites: backend 148/148 tests +
typecheck + lint limpios; frontend 71/71 tests + typecheck + lint limpios. Pendiente V2
(verificación visual en navegador) y aprobación del change OpenSpec (T6).

## Log

L1 (2026-11-06): "Modulo Dashboard: El dashboard esta creado pero nunca se armo un plan
especifico. Por lo tanto se define el modulo Dashboard: - Se requiere poder visualizar
informacion clave de cada modulo: Modulo de ahorros: Ahorros actuales en las diferentes
monedas habilitadas: Modulos de dudas: Mostrar la información relevante por ejemplo:
Cantidad de personas que te deben en numero, cantidad de personas a las que se les venció
la fecha limite de pago, cantidad de personas a las que le debo, la cantidad de deudas que
se me vencieron e informacion que consideres. -Modulo de gastos fijos: Cantidad de gastos
fijos pagados en el mes, cantidad de pendientes, cantidad de vencidos, cantidad de "A
vencer" si vencen a partir de 3 dias o menos. Si numericamente el valor es CERO como en
los casos de que no le debo a nadie, nadie me debe, ya pague todos los gastos fijos del
mes, etc mostrar un mensajito en verde succes indicando la situacion en el dashboard, por
ejemplo "Pagaste todas tus deudas del mes". En el dashboard tambien mostrar la información
del dolarapi pero mas pequeña y visualmente mas llamativa. Además, en la configuración
crear un nuevo apartado que permita parametrizar cual es la informacion de los modulos que
desea ver el usuario en el dashboard con un checkbox para modulo ahorros, gastos fijos,
mis deudas, deudas de terceros, cotización del dolar. Todas las secciones de la
configuracion tienen que se collapsables"
