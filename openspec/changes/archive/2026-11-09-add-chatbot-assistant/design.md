# Diseño: add-chatbot-assistant

Iteración 2 del chatbot: agente LangChain (`create_agent`) con tool calling sobre Groq, JWT de
passthrough y pantalla de chat en el frontend, más su sub-iteración 2.1 (marca de origen
`Registro chatbot` en la nota del alta y sincronización de vistas del frontend vía `events`). No
introduce esquemas nuevos: consume los endpoints existentes de NestJS.

## Equivalencias de atributos

| Pedido (español) | Código / endpoint | Nota |
| --- | --- | --- |
| listado de movimientos con filtros | `listar_movimientos` → `GET /movements` | `type`, `categoryId`, `page`, `limit` ≤ 100 |
| desde/hasta del rango | `date_from`/`date_to` (`YYYY-MM-DD`) | se derivan `from=…T00:00:00.000Z` y `to=…T23:59:59.999Z` |
| gasto / salida / desembolso | `EGRESO` | mapa de sinónimos en `tools/movements.py` |
| ganancia / ingreso / entrada | `INGRESO` | ídem |
| billetera | `currency` (ARS/USD/EUR) | default `ARS` si el usuario no indica |
| fecha del alta | `movementDate` | default hoy (UTC) a las 12:00 ISO |
| categoría por nombre | `category_name` → id de `GET /categories` | normalizado sin acentos; coincidencia única; valida tipo |
| medio de pago / nota | `paymentMethod` / `note` | opcional; medio fuera del catálogo se omite; nota ≤ 500 |
| observación del registro del chatbot | `CHATBOT_NOTE_MARK` + `_compose_note` (`tools/movements.py`) | siempre `Registro chatbot`; con nota del usuario: `<nota> · Registro chatbot` (≤ 500) |
| marca de escritura confirmada | `MOVEMENT_CREATED_EVENT` = `movement-created` → `ChatResponse.events` | sink por request en `build_tools(token, events)`; solo en alta exitosa |
| "dinero disponible" refrescado desde el chat | `invalidateQueries(['savings'])`, `['movements']`, `['spending-control']` | el chip del header lee `['savings','available']`; `['categories']` no se invalida |
| información de ahorros (filtro moneda) | `ver_ahorros` → `GET /savings/available` + `GET /savings/summary` | moneda única opcional |
| cotización del dólar actual | `ver_dolar` → `GET /exchange-rates/dollar` | BLUE/OFICIAL/MEP, compra y venta |
| cuánto me deben / deudas de terceros | `listar_deudas kind=TERCERO` → `GET /debts` | total pendiente por moneda |
| deudas propias (con tarjeta) | `kind=PROPIA`, `actorType` `PERSONA`/`TARJETA` | `status` `ACTIVA`/`FINALIZADA` |
| persona específica | `search` | nombre reenviado al backend; resume vencidas por persona |
| deudas vencidas | cálculo en `tools/debts.py` | cuota impaga (`amount−paidAmount > 0`) con `dueDate` < hoy |
| gastos fijos pagados/pendientes/vencidos | `ver_gastos_fijos` → `GET /fixed-expenses/projections?period=YYYY-MM` | VENCIDO se deriva (pendiente con vencimiento pasado) |
| historial de un gasto fijo | `ver_gasto_fijo` → `GET /fixed-expenses` + `GET /fixed-expenses/:id/payments` | título resuelto normalizado; últimos 12 pagos |
| control de gastos (umbral / >80%) | `ver_control_gastos` → `GET /categories` + `GET /reports/movements/category-averages` | EXCEEDED ≥ 100 %, WARNING ≥ 80 %, OK; porcentaje truncado como el backend |
| "no puede responder…" | `REJECTION_PHRASE` (`chains/assistant_prompt.py`) | canonizada en `_canonicalize_rejection` |
| punto de menú "Chat" | `nav-items.ts` → `/chat` (`features/chat`) | ícono `MessageCircle`, tras Reportes |
| URL del chatbot | `VITE_CHATBOT_URL` | raíz `env.example`/`.env` y `web` de `docker-compose.yml` |

## Verificación de cumplimiento

Estado al 9 de noviembre de 2026, verificando el código implementado, las suites y una prueba E2E
real contra backend y Groq (también las altas de la sub-iteración 2.1). `R<n>` = ADDED,
`M<n>` = MODIFIED, `X<n>` = REMOVED (capability `chatbot`); `C<n>` = ADDED (capability `chat`).
Suites al momento de la verificación: `pytest` 40/40 y frontend 107/107 (typecheck y lint en
verde).

| Req | Estado | Evidencia |
| --- | --- | --- |
| R1 | Cumple | `test_chat_sin_token_devuelve_401`, `test_chat_token_vacio_devuelve_401`; E2E `/chat` sin token → 401 |
| R2 | Cumple | `test_registry_expone_nueve_tools`; E2E "¿Cuánto está el dólar?" → `tools_used: ["ver_dolar"]` |
| R3 | Cumple | regla en `SYSTEM_PROMPT` y docstring de la tool; E2E "¿Cuántos movimientos tengo?" → pregunta sin tools; con `history` dando fechas → `listar_movimientos` (41 movimientos) |
| R4 | Cumple | `test_crear_movimiento_default_ars_y_hoy`, `…_nota_combinada`, `…_error_no_trae_created`, `…_categoria_inexistente…`, `…_tipo_de_categoria…`, `…_alerta_de_umbral`; E2E "gasto de 3500 en comida con efectivo" → movimiento #58 ARS con fecha de hoy |
| R5 | Cumple | `test_ahorros_todas_las_monedas`, `test_ahorros_filtro_moneda`, `test_ahorros_moneda_invalida`, `test_dolar_formatea_tres_cotizaciones` |
| R6 | Cumple | `test_deudas_totales_y_vencidas`, `test_deudas_busqueda_por_persona`; E2E deudas → total 340.100 ARS con vencidas calculadas |
| R7 | Cumple | `test_gastos_fijos_clasifica_pagado_pendiente_vencido`, `test_gastos_fijos_periodo_invalido`, `test_historia_gasto_fijo_resuelve_titulo` |
| R8 | Cumple | `test_control_gastos_estados_por_umbral`, `test_control_gastos_una_categoria`; E2E control → estados EN CONTROL con umbrales |
| R9 | Cumple | subtotales/totales/vencidos/percent en `common.py` y módulos de tools; `test_list_movimientos_agrega_tipos_y_lista` |
| R10 | Cumple | `test_run_assistant_canoniza_la_frase_de_rechazo`; E2E "¿en qué cripto invierto?" y "borrame todos los movimientos" → frase literal |
| R11 | Cumple | `test_registry_convierte_errores_en_texto` (`UnauthorizedBackendError` → aviso de relogin) |
| R12 | Cumple (2.1) | `test_crear_movimiento_default_ars_y_hoy` (nota = `Registro chatbot`) y `test_crear_movimiento_nota_combinada` (`Supermercado · Registro chatbot`); E2E: mov. #64 sin nota → `Registro chatbot`, mov. #63 con nota → `bonus de octubre · Registro chatbot` |
| R13 | Cumple (2.1) | `test_event_movement_created_solo_en_exito`, `test_event_no_se_emite_cuando_falla_la_alta`, `test_event_no_se_emite_con_error_de_categoria`, `test_run_assistant_propaga_events_del_sink`, `test_chat_propaga_el_event_de_movimiento_creado`; E2E: alta → `events: ["movement-created"]`, categoría inexistente y consulta de dólar → `events: []` |
| M1 | Cumple | `test_chat_devuelve_respuesta_del_agente`, `test_chat_reenvia_el_historial`, `test_chat_rechaza_mensaje_vacio`, `test_chat_sin_api_key_groq_devuelve_503`, `test_chat_fallo_del_agente_devuelve_502`; E2E Groq real — `events` en el esquema desde la 2.1 (ver R13) |
| M2 | Cumple | `core/llm.py` + `env.example` (`LLM_PROVIDER=groq`, `LLM_MODEL=openai/gpt-oss-20b`); E2E con tool calling |
| M3 | Cumple | `test_health` (smoke `/health`); suite completa `pytest` 40/40 sin servicios externos |
| X1–X4 | Removido | código RAG/ingesta dormido (no usado por `/chat`); stub `create/update/delete_record` reemplazado por `api_get`/`api_post` + registro real |
| C1 | Cumple | `nav-items.ts` ("Chat" tras "Reportes"), `nav-items.test.ts`, `router.tsx` bajo `ProtectedRoute` |
| C2 | Cumple | `chat-page.tsx` (estado vacío con 5 ejemplos, "Pensando…", `aria-live`), `message-bubble.tsx` (chips `TOOL_LABELS`, error destructivo); `chat-page.test.tsx` (8 tests) |
| C3 | Cumple | `onKeyDown` Enter/Shift+Enter, `maxLength` 4000, botón deshabilitado; `chat-page.test.tsx` |
| C4 | Cumple | `chat-api.ts` (`history`, `Authorization`, timeout 90 s, `VITE_CHATBOT_URL`); filtro `!isError` + `slice(-20)` en `chat-page.tsx`; suite frontend 107/107 |
| C5 | Cumple | `ChatAuthError` + `store.refresh()` con un único reintento; texto "Tu sesión venció…"; `chat-page.test.tsx` |
| C6 | Cumple | `docker-compose.yml` (`web.VITE_CHATBOT_URL`), `env.example`/`.env` raíz; `docker compose config` válido |
| C7 | Cumple | alturas en `dvh`, `min-h-11`/`size-11` (44 px), `text-base` en mobile, `break-words` sin overflow; revisión mobile (320–414 px) y temas claro/oscuro |
| C8 | Cumple (2.1) | `syncDataAfterMovementCreated(response.events)` en `chat-page.tsx` invalida `['savings']`, `['movements']` y `['spending-control']` con `movement-created` (mismo efecto que `invalidateLists` de `movements-page.tsx` al crear, salvo `['categories']`); sin `events` no invalida — `chat-page.test.tsx` ("refresca disponible, movimientos y control de gastos tras una alta confirmada" y la respuesta sin `events` sin invalidaciones) |

## Decisiones técnicas de la iteración

- Token por request: `build_tools(token, events)` captura el JWT y el sink de eventos; nada se
  guarda entre llamadas.
- Tool calling con Groq: `openai/gpt-oss-20b` verificado; `llama-3.3-70b-versatile` retirado del
  proveedor. Las tools devuelven texto plano compacto para evitar aritmética del modelo.
- Ventanas: `history` máx. 40 mensajes (esquema) → los últimos 20 se reenvían al agente; la UI
  manda los últimos 20 visibles sin errores.
- Rechazo: la frase exacta vive en `REJECTION_PHRASE`; `_canonicalize_rejection` la restaura ante
  variantes de acentuación/puntuación del modelo.
- Marca de origen (2.1): `_compose_note` estampa `Registro chatbot` en el `note` del POST desde el
  código de la tool — el prompt no puede omitirla ni reemplazarla; con nota del usuario queda
  `<nota> · Registro chatbot` (≤500, decisión de producto: nota combinada).
- Eventos confirmados por código (2.1): `create_movement` devuelve `{"message", "created"}` y solo
  un `created` no nulo agrega `movement-created` al sink del request; los errores (`_create_error`,
  `BackendError`, 401) devuelven `created: None` y no emiten marca. El frontend no interpreta el
  texto del `answer` para saber si hubo escritura.
- Refrescado (2.1): la pantalla Chat invalida exactamente `['savings']` (incluye
  `['savings','available']`, el chip del header), `['movements']` y `['spending-control']`; deja
  fuera `['categories']` porque el chatbot no crea categorías.
