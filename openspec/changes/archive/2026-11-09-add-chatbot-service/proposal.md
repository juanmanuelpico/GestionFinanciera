# Propuesta: add-chatbot-service

## Pedido

> Implementación de chatbot con LangChain al sistema. Para esto es necesario crear un nuevo
> proyecto en Python al mismo nivel de backend y frontend. Por el momento únicamente vamos a
> crear el proyecto y la estructura. El objetivo es crear un servidor Python que reciba el prompt
> y devuelva esa respuesta sólida, o bien consumir algún endpoint para dar de alta / modificar o
> eliminar algún registro.

Decisiones acordadas en la planificación:

1. Nuevo proyecto `chatbot/` (Python) al mismo nivel que `backend/` y `frontend/`, con su propia
   imagen y servicio en `docker-compose.yml`.
2. Se toma como referencia el proyecto `rag-chat-static`: mismo stack de LangChain
   (`langchain`, `langchain-community`, `langchain-chroma`, `langchain-huggingface`,
   `langchain-ollama`, `langchain-groq`, `langchain-text-splitters`, `chromadb`,
   `sentence-transformers`, `python-dotenv`) y mismas variables de entorno de proveedor.
3. Proveedor del LLM configurable por entorno: `ollama` (local) o `groq` (cloud), con embeddings
   `all-MiniLM-L6-v2` y ChromaDB persistente.
4. Se agrega capa de servidor (FastAPI + Uvicorn + httpx + pytest) sobre la referencia, que era de
   consola.
5. Las tools de alta/modificación/eliminación de registros contra la API de NestJS **no se
   implementan**: quedan como stub con sus firmas, en la próxima iteración.

## Por qué

El sistema hoy solo se consulta a mano, pantalla por pantalla. Un servicio de chat permite
preguntar en lenguaje natural y, más adelante, operar sobre los propios registros sin abrir
formularios. Separarlo en un proyecto Python permite usar LangChain y modelos locales sin tocar el
stack NestJS/React, y deja la inteligencia artificial fuera del ciclo de build de la API.

## Qué cambia

- **Nuevo proyecto `chatbot/`**: paquete `app/` con `main.py` (FastAPI + CORS + `GET /health`),
  `config.py` (Settings desde `.env`), `api/routes/chat.py` (`POST /chat`), `schemas/chat.py`
  (`ChatRequest`/`ChatResponse`), `core/` (`llm.py`, `embeddings.py`, `vectorstore.py`),
  `chains/rag.py` y `tools/backend_api.py` (stub), además de `scripts/ingest.py`,
  `tests/test_health.py`, `requirements.txt`, `env.example`, `Dockerfile`, `.gitignore` y
  `README.md`.
- **Comportamiento del chat**: si existe la base vectorial (`data/chroma_db`), la respuesta se
  construye con contexto RAG top-k (`used_rag: true` con sus `sources`); si no existe, responde
  solo el LLM (`used_rag: false`), de modo que el endpoint funciona desde el día 1.
- **`docker-compose.yml`**: servicio `chatbot` en `app-network` con `${CHATBOT_PORT:-8100}:8100`,
  montaje de `./chatbot`, volumen `chatbot_data` para la base vectorial, `extra_hosts` hacia el
  host para alcanzar Ollama, `BACKEND_API_URL=http://api:3000/api`, `depends_on: api` y
  `uvicorn --reload`.
- **`env.example` de la raíz**: se agregan `CHATBOT_PORT`, `LLM_PROVIDER`, `LLM_MODEL`,
  `GROQ_API_KEY` y `OLLAMA_BASE_URL`.
- **`README.md` de la raíz**: el chatbot pasa a la lista de servicios, a la tabla de puertos
  (8100 y `/docs`), a la estructura del repo y a los comandos (`logs`, `pytest`).
- **Sin cambios** en `backend/` ni en `frontend/`: no hay endpoints nuevos de NestJS, no hay
  pantalla de chat y no se consume `/chat` desde la interfaz.

## Capacidades

### Capacidades nuevas

- `chatbot`: servicio HTTP de chat con LangChain (healthcheck, `POST /chat`, proveedor de LLM por
  entorno, respuesta con RAG o solo LLM, ingesta Markdown, CORS, ejecución local/Docker,
  configuración por variables, tools de escritura como capacidad futura en stub y la ausencia de
  autenticación en esta etapa).

> Nota: la sugerencia del pedido era `chatbot-service`; se registra como `chatbot` para cumplir la
> convención del proyecto de capabilities en español, kebab-case y sin prefijos de tipo de
> artefacto (como `deudas`, `movimientos-categorias`). La carpeta del servicio sí se llama
> `chatbot/`.

### Capacidades modificadas

- Ninguna. No existe spec aprobada de infraestructura/despliegue: `docker-compose.yml`,
  `env.example` y `README.md` no están cubiertos por ninguna capability de `openspec/specs/`, y
  este cambio no altera el comportamiento de `deudas`, `movimientos-categorias`, `medios-de-pago`,
  `dashboard`, `configuracion`, `ahorros-y-disponible`, `experiencia-ahorros`, `gastos-fijos` ni
  `header-financiero`.

## Fuera de alcance

- Implementar las tools CRUD sobre la API de NestJS (alta, modificación, eliminación de registros).
- Pantalla de chat en el frontend, historial de conversaciones, streaming de respuestas o
  persistencia de mensajes.
- Autenticación del servicio, aislamiento por usuario y autorización de las operaciones.
- Cargar datos personales del usuario en la base vectorial (RAG hoy solo usa documentos Markdown
  ingeridos manualmente).
- Conversación multi-turno, memoria de sesión, agentes con planificación o uso de herramientas.
- Evaluación de calidad de respuestas, observabilidad, rate limits ni despliegue en producción.

## Supuestos

- "Respuesta sólida" = respuesta generada por el LLM con temperatura 0 y, cuando hay base
  vectorial, restringida al contexto recuperado.
- El modelo de embeddings de ingesta y de búsqueda es el mismo (`all-MiniLM-L6-v2`) para que los
  vectores sean comparables.
- El chatbot es de un solo usuario/despliegue local: la base vectorial es única para todo el
  servicio, no por usuario.
- `RAG_TOP_K` se aplica solo a la recuperación de fragmentos por pregunta.
- En Docker, Ollama corre en el host (de ahí `host.docker.internal`) y la API NestJS se alcanza
  por el nombre de servicio `api`.

## Brechas y decisiones pendientes

1. **Proveedor inaccesible devuelve 500.** `/chat` traduce a 503 solo los errores de
   configuración (`RuntimeError`, por ejemplo Groq sin clave). Si Ollama no está levantado, el
   error de conexión no se captura y el cliente recibe 500 sin mensaje útil. Decidir si se
   mapean todos los fallos del proveedor a 503 con texto en español.
2. **Sin noción de usuario ni token.** `/chat` es público y `create_record`/`update_record`/
   `delete_record` reciben un parámetro `token` que nadie rellena: la API de NestJS exige JWT, así
   que falta decidir cómo llega el token del usuario al chatbot y quién lo autoriza.
3. **Las tools no tienen endpoints contractados.** Faltan definir los recursos alcanzables
   (`movements`, `debts`, `fixed-expenses`, `savings`, …), el verbo de modificación (el stub
   predice `PATCH`) y qué campos son obligatorios, además del flujo de confirmación antes de
   borrar.
4. **RAG compartido entre usuarios.** Si más adelante se indexan datos del usuario, la base
   vectorial actual no tiene aislamiento; hay que decidir colección por usuario, filtro por
   metadatos o no usar RAG para datos personales.
5. **La ingesta no es idempotente.** `scripts/ingest.py` agrega chunks a la colección por defecto
   de ChromaDB sin limpiarla: ingester dos veces el mismo archivo duplica el contexto. Decidir si
   el script reinicia la colección o se versiona por documento.
6. **`CHATBOT_PORT` no gobierna el puerto del proceso.** Se lee en la configuración, pero el
   servidor escucha en el `--port` de la línea de comandos (o 8100 fijo en el `Dockerfile` y en
   compose); la variable solo mueve el mapeo del host. Confirmar si debe usarse también al lanzar
   Uvicorn.
7. **Sin integración en el frontend.** Ninguna pantalla llama a `/chat`: la UI del asistente, su
   punto de menú y su interacción con `ProtectedRoute` son una decisión de producto pendiente.
8. **El puerto 8100 queda expuesto sin autenticación en la red del host.** Validar si es aceptable
   en este entorno local o si el servicio debe publicarse solo a través de la API.
