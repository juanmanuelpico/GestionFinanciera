# Propuesta: Asistente de chat con tools (chatbot iteración 2) y pantalla Chat

## Pedido

> El chatbot debe tener acceso a endpoints GET informativos del backend: listado de movimientos
> con filtros — si no se le indica una fecha debe pedirla y no ejecutar ninguna acción;
> información de ahorros con filtro opcional de moneda; cotización del dólar actual; deudas
> (cuánto me deben en total, por persona específica, activas, vencidas, propias incluyendo
> tarjeta o personas — todo con el GET de deudas propias/terceros); gastos fijos (pagados con
> importe y fecha de pago, pendientes con vencimiento, vencidos — con el GET del listado);
> control de gastos (todas las categorías o una, estado umbral superado / cerca de superar
> (>80%) / en control). Si es necesario obtener algún endpoint de reportes para facilitar alguna
> consulta, permitido. Todas las consultas son por usuario. También permitir el POST de
> movimientos: gasto o ganancia de cierta cantidad en cierta categoría, billetera default ARS
> salvo indicación contraria. Limitar únicamente a esa información; si el usuario desea otra
> acción o tema no cubierto, responder "No puedo responder o aplicar tu consulta porque sobrepasa
> los limites establecidos". Además: nuevo punto de menú en el frontend llamado "Chat" que
> deriva a una pantalla de chat con el chatbot.

Decisiones confirmadas por el usuario:

- **Alta directa**: el registro de un movimiento se ejecuta sin pedir confirmación y luego el
  asistente informa lo registrado.
- **Fecha del alta default HOY**; **billetera default ARS** salvo indicación contraria.
- **Passthrough de JWT**: el chatbot recibe `Authorization: Bearer` del usuario y lo reenvía al
  backend; no tiene credenciales propias ni inicia sesión.
- **Modelo con tool calling sobre Groq**: en la práctica `openai/gpt-oss-20b` (verificado);
  `llama-3.3-70b-versatile` fue retirado de Groq y no puede usarse.
- **Marca de origen en la observación (sub-iteración 2.1)**: todo movimiento dado de alta desde el
  chatbot lleva `Registro chatbot` en la nota, estampada por el código de la tool (no por el
  modelo). Si el usuario dictó su propia nota, la observación queda **combinada**:
  `<nota> · Registro chatbot`, truncada a 500 caracteres.
- **Refrescado del disponible desde el chat (sub-iteración 2.1)**: la respuesta de `/chat` incluye
  `events` —marcas de escrituras confirmadas por código, hoy `movement-created`— y la pantalla Chat
  invalida las mismas consultas que la pantalla Movimientos al crear, para que el chip "Dinero
  disponible" del header se actualice sin recargar.

## Por qué

La iteración 1 fundó el servicio de chat pero no lo conectó con los datos del usuario: respondía
texto genérico, sin autenticación, con RAG y tools en stub. El valor real aparece cuando el chat
consulta y opera el backend: responder en lenguaje natural cuánto me deben, cómo van los gastos
fijos o el control de gastos, y registrar un gasto sin abrir formularios, siempre sobre los datos
del usuario autenticado.

## Qué cambia

- **`POST /chat` redefine su contrato (chatbot: reemplazo)**: pasa de `{message}` anónimo con
  respuesta RAG/LLM (`used_rag`, `sources`) a `{message, history[]}` con `Authorization: Bearer`
  obligatorio y respuesta `{answer, provider, model, tools_used, events}`. Errores: 401 sin token o
  token vacío, 503 por configuración inválida del LLM, 502 por fallo del agente.
- **Asistente con tools**: LangChain `create_agent` + prompt de sistema con las 8 capacidades y
  la frase literal de rechazo; registro cerrado de **9 tools** (`listar_movimientos`,
  `crear_movimiento`, `ver_ahorros`, `ver_dolar`, `listar_deudas`, `ver_gastos_fijos`,
  `ver_gasto_fijo`, `ver_control_gastos`, `listar_categorias`) construidas por request con el
  token del usuario.
- **Cliente real hacia NestJS**: `api_get`/`api_post` con Bearer reenviado, desenvolvido del
  envelope `{success, data}` y errores traducidos (`BackendError`, `UnauthorizedBackendError`);
  reemplaza el stub de la iteración 1.
- **Cálculos en Python**: totales por moneda, cuotas vencidas, estados de gastos fijos y
  porcentajes de umbral (≥100% superado, ≥80% cerca, truncado como el backend) se calculan dentro
  de las tools; el modelo recibe texto compacto y no hace aritmética.
- **Única escritura**: `POST /movements` (con resolución de categoría por nombre normalizado,
  validación de tipo, default ARS/hoy y alerta de umbral). Modificar, eliminar o crear otros
  registros queda fuera y dispara la frase literal de rechazo, canonizada por código.
- **Sub-iteración 2.1 — origen del alta y sincronización de vistas**: `crear_movimiento` estampa
  `Registro chatbot` en la nota del POST (sola, o combinada `<nota> · Registro chatbot`, ≤500
  caracteres) desde el código de la tool y devuelve los datos estructurados del movimiento creado
  solo en éxito; `registry.build_tools(token, events)` recibe un sink por request que emite
  `movement-created`; `run_assistant` lo expone como `events` y `ChatResponse` lo agrega al
  contrato. El frontend, al ver `movement-created`, invalida `['savings']`, `['movements']` y
  `['spending-control']` —sin recargar la página— de modo que el chip "Dinero disponible" del
  header quede actualizado como al crear desde Movimientos. Sin `events`, no invalida nada y la
  caché de categorías no se toca porque el chatbot no crea categorías.
- **RAG desactivado del chat**: `POST /chat` ya no usa la base vectorial; el código de
  ingesta/RAG queda dormido (ver brechas).
- **Frontend (capability nueva `chat`)**: pantalla `/chat` (menú "Chat" con ícono MessageCircle
  tras Reportes, ruta protegida), burbujas con chips de tools en español, estado vacío con 5
  preguntas de ejemplo, indicador "Pensando…", composer Enter/Shift+Enter, historial de 20
  mensajes visibles, reintento único con refresh de sesión ante 401, sincronización de las vistas
  afectadas cuando la respuesta confirma un alta, y `VITE_CHATBOT_URL`.
- **Compose/entorno**: `docker-compose.yml` (servicio `web`), `env.example` y `.env` de la raíz
  exponen `VITE_CHATBOT_URL`; README raíz y README del chatbot documentan el nuevo contrato, la
  tabla de tools y el límite de alcance.
- **Sin cambios en `backend/`**: el asistente consume exclusivamente endpoints existentes
  (incluido `GET /reports/movements/category-averages`, permitido por el pedido).

## Relación con `add-chatbot-service` (iteración 1, sin archivar)

Se crea un change **nuevo** en lugar de editar `add-chatbot-service` porque la iteración 1 quedó
implementada y verificada como fundación del servicio (estructura, `/health`, Docker, config,
CORS) y debe conservar su registro histórico. La delta de este change redefine por nombre los
requisitos de `/chat` que quedaron obsoletos: al archivar, **`add-chatbot-service` debe archivarse
primero** (funda la capability `chatbot` en `openspec/specs/`) y luego este change aplica sus
`MODIFIED`/`REMOVED` sobre esa base. Si se archivaran en otro orden o en un solo paso, los
`MODIFIED`/`REMOVED` no encontrarían los requisitos base y OpenSpec los rechazaría.

## Capacidades afectadas

- `chatbot` (MODIFIED/ADDED/REMOVED): autenticación obligatoria, contrato de `/chat` con agente,
  `tools_used` y `events`, registro cerrado de 9 tools, regla de fechas para listados, alta de
  movimientos con marca de origen `Registro chatbot` en la nota, marcas de escrituras confirmadas,
  consultas de ahorros/dólar/deudas/gastos fijos/control de gastos, cálculos en tools, rechazo
  literal fuera de alcance y traducción de errores.
- `chat` (ADDED): punto de menú, pantalla de conversación, composer, historial en el pedido,
  renovación de sesión ante 401, sincronización de disponible/listas tras un alta confirmada,
  `VITE_CHATBOT_URL` y mobile-first con el sistema de diseño.

## Equivalencias y verificación

La tabla de equivalencias entre los nombres en español del pedido y los identificadores del
código, la numeración de requisitos (R1…R13, M1…M3, X1…X4, C1…C8) y la verificación de
cumplimiento ejecutada están en `design.md`. `R12` (marca de origen), `R13` (events) y `C8`
(refrescado de vistas) corresponden a la sub-iteración 2.1.

## Fuera de alcance

- Modificar o eliminar registros, o crear cualquier cosa distinta de movimientos (deudas,
  ahorros,
  gastos fijos, categorías).
- Endpoints nuevos de NestJS exclusivos para el chatbot.
- Persistencia de conversaciones, streaming de respuestas, cuentas de usuario del chatbot.
- Reencender el RAG en `/chat`, borrado del módulo dormido o nuevo uso (decisión pendiente).
- Rate limiting, auditoría de llamadas y despliegue público del servicio.

## Supuestos

- "Por usuario": el backend NestJS filtra todo por `CurrentUser` a partir del JWT reenviado; el
  chatbot no implementa autorización propia.
- "Hoy" se evalúa en UTC (`today_utc()`), consistente con el resto del servicio.
- El pedido exige máximo un POST (`/movements`); las tools de lectura usan solo los GET
  existentes.
- La respuesta del chatbot es texto plano; la UI lo renderiza con saltos de línea sin Markdown.

## Brechas y decisiones pendientes

1. **RAG dormido**: `chains/rag.py`, `core/vectorstore.py` y `scripts/ingest.py` siguen en el
   repo pero `/chat` no los usa. Decidir eliminarlos o darles otro uso; mientras tanto este
   change remueve sus requisitos de la capability.
2. **Arranque sin `.env`**: el default del código sigue siendo `ollama`/`llama3.2` (no verificado
   para tool calling); `/chat` puede fallar con 502. Decidir si se cambia el default o se exige
   configuración.
3. **Docstring desactualizada**: `assistant.py` menciona `llama-3.3-70b-versatile` (retirado de
   Groq); el modelo usado es el de `.env` (`openai/gpt-oss-20b`).
4. **Totales paginados**: el listado de movimientos informa subtotales de la página mostrada
   (el total completo puede seguir en más páginas); el asistente debe aclararlo. Decidir si se
   agregan totales consolidados de rango al backend o se recorre la paginación en la tool.
5. **Descripción OpenAPI desactualizada**: `main.py` todavía describe el servicio con "contexto
   RAG" y tools futuras; conviene alinearla al contrato real.
