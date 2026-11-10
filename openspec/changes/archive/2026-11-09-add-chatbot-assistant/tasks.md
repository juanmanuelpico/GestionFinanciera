# Tareas: add-chatbot-assistant

Estado verificado el 9 de noviembre de 2026 sobre el código ya implementado de la iteración 2 del
chatbot (agente con tools + autenticación), la pantalla Chat del frontend y su **sub-iteración 2.1**
(marca de origen `Registro chatbot` en la nota del alta + sincronización de vistas vía `events`).
Evidencias y equivalencias en `design.md`. Pruebas: `python -m pytest` en `chatbot/` (40/40) y `npm
run typecheck && npm run lint && npm test && npm run build` en `frontend/` (107/107), más un E2E
real con backend y Groq (también para las altas del chatbot con y sin nota).

## Chatbot: auth y contrato

- [x] 1. `POST /chat` con `Authorization: Bearer` obligatorio: 401 sin cabecera o con token
  vacío (detalles en español), 503 por config inválida del LLM, 502 por fallo del agente
  (chatbot: Autenticación obligatoria…; Contrato de POST /chat) — `chatbot/app/api/routes/chat.py`
- [x] 2. Esquemas nuevos: `ChatRequest` (`message` 1–4000 + `history[]` de `{role, content}` con
  máx. 40) y `ChatResponse` (`answer`, `provider`, `model`, `tools_used`; `events` se agrega en la
  sub-iteración 2.1, ver tarea 25); salen `used_rag` y `sources` — `chatbot/app/schemas/chat.py`
- [x] 3. `run_assistant`: `create_agent` con modelo + tools + `SYSTEM_PROMPT`, traducción del
  `history` a mensajes (últimos 20), extracción de `answer`, `tools_used` deduplicado en orden de
  invocación y canonización de la frase de rechazo (chatbot: Registro cerrado de nueve tools;
  Rechazo literal fuera del alcance; Contrato de POST /chat) — `chatbot/app/chains/assistant.py`
- [x] 4. `SYSTEM_PROMPT` con las 8 capacidades exactas, reglas duras (fechas obligatorias, ARS
  default, no inventar números, reformular ERROR) y `REJECTION_PHRASE` literal (chatbot: Rechazo
  literal fuera del alcance; Listado de movimientos con fechas obligatorias) —
  `chatbot/app/chains/assistant_prompt.py`

## Chatbot: cliente y tools

- [x] 5. Cliente NestJS real en reemplazo del stub: `api_get`/`api_post` con Bearer del usuario,
  timeout 15 s, desenvolvido del envelope `{success, data}`, `BackendError` y
  `UnauthorizedBackendError` (chatbot: Traducción de errores…; Autenticación obligatoria…) —
  `chatbot/app/tools/backend_api.py`
- [x] 6. Registro de 9 tools construido por request con el token, traduciendo excepciones a
  textos `ERROR …` para el modelo (chatbot: Registro cerrado de nueve tools) —
  `chatbot/app/tools/registry.py`
- [x] 7. Utilidades comunes: hoy UTC, período `YYYY-MM`, validación de fechas, normalización sin
  acentos, parseo de importes string y formateo de dinero/fecha (chatbot: Cálculos dentro de las
  tools) — `chatbot/app/tools/common.py`
- [x] 8. Movimientos: listado con `date_from`/`date_to` obligatorias derivadas a ISO, filtros de
  tipo/categoría/página y subtotales de página; alta con sinónimos GASTO→EGRESO y
  GANANCIA→INGRESO, resolución de categoría por nombre (existente, única, tipo compatible),
  billetera default ARS, fecha default hoy, medio de pago/note opcionales, informe del id creado y
  alerta de umbral (la marca de origen en la nota y el resultado estructurado se agregan en la
  sub-iteración 2.1, tarea 23); listado de categorías con id/tipo/umbral (chatbot: Listado de
  movimientos…; Alta de movimientos…; Consulta de…apoyo `listar_categorias`) —
  `chatbot/app/tools/movements.py`
- [x] 9. Ahorros: `GET /savings/available` + `GET /savings/summary` con filtro opcional de moneda
  y totales estimados sin filtro (chatbot: Consulta de ahorros y dólar) —
  `chatbot/app/tools/savings.py`
- [x] 10. Dólar: `GET /exchange-rates/dollar` con blue/oficial/MEP, compra y venta (chatbot:
  Consulta de ahorros y dólar) — `chatbot/app/tools/dollar.py`
- [x] 11. Deudas: `GET /debts` con `kind` PROPIA/TERCERO, status/actorType/currency/search;
  totales pendientes por moneda y VENCIDAS calculadas por cuotas impagas con vencimiento pasado;
  detalle por deuda y vencidas por persona (chatbot: Consulta de deudas…) —
  `chatbot/app/tools/debts.py`
- [x] 12. Gastos fijos: `GET /fixed-expenses/projections` por período con PAGADO (fecha de pago),
  PENDIENTE (vencimiento) y VENCIDO (derivado), resumen por estado; historial `GET /:id/payments`
  resolviendo el título con `GET /fixed-expenses` (chatbot: Consulta de gastos fijos…) —
  `chatbot/app/tools/fixed_expenses.py`
- [x] 13. Control de gastos: `GET /categories` (umbrales) + `GET /reports/movements/
  category-averages` (EGRESO del período); UMBRAL SUPERADO ≥ 100 %, CERCA DE SUPERAR ≥ 80 %, EN
  CONTROL, porcentaje truncado como el backend, todas las categorías o una (chatbot: Consulta de
  control de gastos…) — `chatbot/app/tools/spending.py`

## Chatbot: configuración y pruebas

- [x] 14. `env.example`/`.env` con modelo Groq de tool calling verificado
  (`LLM_MODEL=openai/gpt-oss-20b`; nota: `llama-3.3-70b-versatile` fue retirado) (chatbot:
  Proveedor del LLM…) — `chatbot/env.example`, `chatbot/.env`
- [x] 15. Suite pytest: 33 tests de routes (401/503/502/422, contract, history), asistente
  (extracción, canonización, dedup de tools) y tools (los 9 módulos y el registro) — hoy 40 con los
  de la sub-iteración 2.1 (tarea 28) — `chatbot/tests/test_chat_route.py`,
  `tests/test_assistant.py`, `tests/test_tools.py`
- [x] 16. README del servicio: contracto `/chat` con token, tabla de tools y sus endpoints, frase
  de límite de alcance — `chatbot/README.md`

## Frontend: pantalla Chat

- [x] 17. Tipos y API del chat: `ChatMessage`/`TOOL_LABELS` en español; `sendChatMessage` a
  `VITE_CHATBOT_URL` con Bearer, timeout 90 s y `ChatAuthError` en 401 (chat: Historial en el
  pedido…; Configuración VITE_CHATBOT_URL; Renovación de sesión…) — `frontend/src/features/chat/`
- [x] 18. `ChatPage`: estado vacío con 5 preguntas ejemplo, burbujas con chips de tools, errores
  destructivos, indicador "Pensando…", composer Enter/Shift+Enter, `history` de los últimos 20
  mensajes visibles sin errores, refresh de sesión único ante 401 con mensaje de sesión vencida,
  zona `aria-live` con autocorrespondido (chat: Punto de menú…; Pantalla de conversación…;
  Composer…; Renovación…) — `frontend/src/features/chat/pages/chat-page.tsx` y
  `components/message-bubble.tsx`
- [x] 19. Navegación y ruta: ítem "Chat" (`MessageCircle`) tras "Reportes" en `nav-items.ts` y
  ruta `chat` bajo `ProtectedRoute`/`AppLayout` (chat: Punto de menú "Chat"…) —
  `frontend/src/components/layout/nav-items.ts`, `frontend/src/app/router.tsx`
- [x] 20. Mobile-first con el sistema de diseño: alturas `dvh`, targets ≥ 44 px, textarea 16 px en
  mobile, `break-words` sin overflow horizontal, tokens primario/muted/destructivo en claro y
  oscuro (chat: Mobile-first…) — `frontend/src/features/chat/pages/chat-page.tsx`
- [x] 21. Tests de la pantalla: 7 tests (`chat-page.test.tsx`) y suite frontend completa
  (typecheck, lint, 106 tests, build) — `frontend/`

## Compose y entorno raíz

- [x] 22. `VITE_CHATBOT_URL` en `env.example` y `.env` de la raíz, inyectada al servicio `web` de
  `docker-compose.yml`; README raíz documenta la variable (chat: Configuración VITE_CHATBOT_URL;
  chatbot: Ejecución local y como servicio de Docker Compose) — `docker-compose.yml`,
  `env.example`, `README.md`

## Sub-iteración 2.1: origen del alta y sincronización de vistas

- [x] 23. Marca de origen en la nota del alta: `crear_movimiento` estampa SIEMPRE `Registro
  chatbot` en el `note` enviado al `POST /movements` — sin nota del usuario la marca sola; con nota
  propia, combinada `<nota> · Registro chatbot`, truncada a 500 caracteres — desde el código de la
  tool, sin depender de lo que escriba el LLM. La función pasa a devolver
  `{"message": str, "created": dict | None}` con id, tipo, importe, billetera, fecha y categoría
  solo en éxito (chatbot: Marca de origen "Registro chatbot" en la observación del alta; Alta de
  movimientos como única escritura) — `chatbot/app/tools/movements.py`
- [x] 24. Sink de eventos por request: `build_tools(token, events=None)` recibe la lista del
  `run_assistant` y el wrapper de `crear_movimiento` agrega `movement-created` **solo** cuando
  `created` vino exitoso; nada en errores de validación, `BackendError` ni 401 del backend
  (chatbot: Marcas de escrituras confirmadas en la respuesta; Registro cerrado de nueve tools) —
  `chatbot/app/tools/registry.py`
- [x] 25. `events` en el contrato HTTP: `run_assistant` crea el sink, lo pasa a `build_tools` y lo
  devuelve como `result["events"]`; `ChatResponse` agrega `events: list[str]` (default `[]`) y la
  ruta lo reenvía (chatbot: Contrato de POST /chat; Marcas de escrituras confirmadas en la
  respuesta) — `chatbot/app/chains/assistant.py`, `chatbot/app/schemas/chat.py`,
  `chatbot/app/api/routes/chat.py`
- [x] 26. Refrescado desde la pantalla Chat: `ChatApiResponse.events: string[]` y, si la respuesta
  trae `movement-created`, `ChatPage` invalida `['savings']` —que cubre `['savings','available']`
  del chip "Dinero disponible" del header—, `['movements']` y `['spending-control']`, las mismas
  vistas que Movimientos al crear salvo `['categories']` (el chatbot no crea categorías); sin
  `events` no invalida nada y la marca no se muestra al usuario (chat: Sincronizar las vistas del
  sistema tras un alta del chatbot) — `frontend/src/features/chat/types.ts`,
  `frontend/src/features/chat/pages/chat-page.tsx`
- [x] 27. README del chatbot: contrato de `/chat` con `events` y regla de la nota combinada
  `Registro chatbot` (chatbot: Contrato de POST /chat; Marca de origen…) — `chatbot/README.md`
- [x] 28. Pruebas de la sub-iteración: chatbot 40/40 — `test_crear_movimiento_default_ars_y_hoy`
  (nota por defecto), `test_crear_movimiento_nota_combinada`,
  `test_crear_movimiento_error_no_trae_created`, `test_event_movement_created_solo_en_exito`,
  `test_event_no_se_emite_cuando_falla_la_alta`,
  `test_event_no_se_emite_con_error_de_categoria`,
  `test_run_assistant_propaga_events_del_sink`, `test_chat_propaga_el_event_de_movimiento_creado`;
  frontend 107/107 con typecheck y lint — `refresca disponible, movimientos y control de gastos tras
  una alta confirmada` y la respuesta sin `events` no invalida ninguna query; E2E real con Groq y
  backend: alta con nota → mov. #63 `bonus de octubre · Registro chatbot` con
  `events: ["movement-created"]`; alta sin nota → mov. #64 `Registro chatbot` con event; categoría
  inexistente y consulta de dólar → `events: []`

## Pendiente

^- [x] 29. Aprobación del usuario sobre las deltas de `chatbot` y `chat`; `openspec/specs/` queda
  sin cambios hasta el archivado (`/opsx-archive`). Orden de archivado: primero
  `add-chatbot-service`, luego este change (los MODIFIED/REMOVED apuntan a requisitos de la
  iteración 1).
- [ ] 30. Decisión de producto sobre las brechas de `proposal.md`: RAG dormido (eliminar o
  reactivar), default sin `.env` (ollama/llama3.2 no verificado para tool calling), descripción
  OpenAPI de `main.py` desactualizada, docstring de `assistant.py` con modelo retirado y totales
  consolidados de rango en el listado de movimientos.
- [ ] 31. E2E con el stack completo para deudas, gastos fijos e historial de un gasto (ya
  cubiertas por la suite unitaria; el E2E real verificó movimientos —incluidas las altas del
  chatbot con y sin nota—, dólar, control de gastos y rechazos).
