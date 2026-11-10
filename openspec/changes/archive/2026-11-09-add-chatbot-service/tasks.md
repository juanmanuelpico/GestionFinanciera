# Tareas: add-chatbot-service

Estado verificado el 9 de noviembre de 2026 sobre el código ya implementado del servicio
`chatbot/` (estructura completa + lógica base de chat). Las pruebas se limitan al smoke test de
`/health`: `python -m pytest` dentro de `chatbot/`. Cada tarea enlaza su requisito en
`specs/chatbot/`.

## Proyecto y dependencias

- [x] 1. Proyecto Python nuevo al mismo nivel que `backend/` y `frontend/`, con su propio
  `.gitignore` (`.venv/`, `__pycache__/`, `.env`, `data/`) — chatbot: Servicio HTTP propio, al
  mismo nivel que backend y frontend — `chatbot/.gitignore`
- [x] 2. `requirements.txt` con el stack de la referencia `rag-chat-static` (langchain,
  langchain-community, langchain-chroma, langchain-huggingface, langchain-ollama, langchain-groq,
  langchain-text-splitters, chromadb, sentence-transformers, python-dotenv) más la capa de
  servidor (fastapi, uvicorn[standard], httpx) y pytest — `chatbot/requirements.txt`

## Configuración

- [x] 3. `Settings` congelado (dataclass) que carga `chatbot/.env` con defaults: `ollama` /
  `llama3.2`, `BACKEND_API_URL=http://localhost:3000/api`, `CHATBOT_PORT=8100`,
  `CORS_ORIGIN=http://localhost:5173`, embeddings `all-MiniLM-L6-v2`, `RAG_TOP_K=4` y
  `chroma_dir=data/chroma_db` (chatbot: Configuración centralizada en variables de entorno;
  Proveedor del LLM elegido por variable de entorno; Respuesta con contexto RAG o solo con el
  LLM) — `chatbot/app/config.py`
- [x] 4. Plantilla `env.example` con las siete variables del servicio y `EMBEDDING_MODEL` /
  `RAG_TOP_K` opcionales comentadas — `chatbot/env.example`

## Servidor y endpoints

- [x] 5. App FastAPI con CORS de un único origen (`CORS_ORIGIN`, credenciales habilitadas) y
  `GET /health` que devuelve `status`, `service`, `llm_provider` y `llm_model` sin tocar el LLM
  (chatbot: Servicio HTTP propio…; Un único origen permitido para el navegador) —
  `chatbot/app/main.py`
- [x] 6. Esquemas `ChatRequest` (`message` de 1 a 4000 caracteres) y `ChatResponse` (`answer`,
  `provider`, `model`, `used_rag`, `sources` con lista vacía por defecto) —
  `chatbot/app/schemas/chat.py`
- [x] 7. `POST /chat` que delega en `answer_question`, responde los cinco campos y traduce los
  errores de configuración del proveedor en HTTP 503 con el detalle en español (chatbot: Contrato
  de POST /chat; Proveedor del LLM elegido por variable de entorno) —
  `chatbot/app/api/routes/chat.py`

## LLM, embeddings y base vectorial

- [x] 8. `get_llm()` con `ChatGroq(model, temperature=0)` si `LLM_PROVIDER=groq` —y error claro si
  falta `GROQ_API_KEY`— o `ChatOllama(model, temperature=0, base_url?)` para cualquier otro valor
  (chatbot: Proveedor del LLM elegido por variable de entorno) — `chatbot/app/core/llm.py`
- [x] 9. Embeddings compartidos `HuggingFaceEmbeddings` con cache, mismo modelo en ingesta y en
  búsqueda — `chatbot/app/core/embeddings.py`
- [x] 10. ChromaDB persistente con `vectorstore_exists()` sobre `data/chroma_db/chroma.sqlite3`
  (chatbot: Respuesta con contexto RAG o solo con el LLM; Base persistente y fuera del control de
  versiones) — `chatbot/app/core/vectorstore.py`
- [x] 11. Cadena de respuesta: prompt que exige usar solo el `Contexto:` provisto, top-k del
  retriever cuando hay base (`used_rag: true` con `sources` del metadata) y respuesta directa del
  LLM cuando no (`used_rag: false`, `sources: []`) (chatbot: Respuesta con contexto RAG o solo con
  el LLM) — `chatbot/app/chains/rag.py`

## Ingesta

- [x] 12. `scripts/ingest.py`: argumento de archivo, aviso "Archivo no encontrado: <ruta>" sin
  tocar la base, `TextLoader` (utf-8), `RecursiveCharacterTextSplitter` de 500 con 50 de
  solapamiento y escritura en el directorio persistido, con conteo de chunks impreso (chatbot:
  Ingesta de documentación Markdown) — `chatbot/scripts/ingest.py`

## Tools hacia NestJS (stub de esta etapa)

- [x] 13. Cliente `httpx.Client` con base `BACKEND_API_URL` y timeout de 10 s, más las firmas
  `create_record` / `update_record` / `delete_record` con `NotImplementedError` y sin estar
  conectadas al chain, de modo que `/chat` no puede escribir registros (chatbot: Tools de alta,
  modificación y eliminación de registros (capacidad futura); Sin autenticación ni datos personales
  en esta etapa) — `chatbot/app/tools/backend_api.py`

## Tests y documentación

- [x] 14. Smoke test de `/health` con `TestClient`, que pasa sin LLM ni base vectorial (chatbot:
  Prueba de arranque) — `chatbot/tests/test_health.py`
- [x] 15. `README.md` del servicio con requisitos, instalación en venv, tabla de variables,
  uso de `/health`, `/chat`, ingesta, tests, Docker y el árbol del proyecto (chatbot: Ejecución
  local y como servicio de Docker Compose) — `chatbot/README.md`

## Docker y repo

- [x] 16. `Dockerfile` `python:3.11-slim` con caché de dependencias, `PYTHONUNBUFFERED`, `EXPOSE
  8100` y `uvicorn app.main:app --host 0.0.0.0 --port 8100` — `chatbot/Dockerfile`
- [x] 17. Servicio `chatbot` en el compose: build desde `./chatbot`, `app-network`,
  `${CHATBOT_PORT:-8100}:8100`, montaje del código, volumen `chatbot_data`,
  `extra_hosts: host.docker.internal:host-gateway`, `BACKEND_API_URL=http://api:3000/api`,
  `depends_on: api` y comando con `--reload` (chatbot: Ejecución local y como servicio de Docker
  Compose) — `docker-compose.yml`
- [x] 18. Variables del chatbot en el `.env` de ejemplo de la raíz: `CHATBOT_PORT`,
  `LLM_PROVIDER`, `LLM_MODEL`, `GROQ_API_KEY`, `OLLAMA_BASE_URL` (chatbot: Variables de la raíz
  para Compose) — `env.example`
- [x] 19. El chatbot aparece en la descripción de servicios, la tabla de puertos (8100 y `/docs`),
  la estructura del repo y los comandos de Docker del README raíz — `README.md`

## Pendiente

^- [x] 20. Aprobación del usuario sobre el delta y archivado (`/opsx-archive`);
  `openspec/specs/` queda sin cambios hasta entonces.
- [ ] 21. Decisión de producto sobre las brechas de `proposal.md`: error del proveedor inaccesible
  (hoy 500), token y autorización del chatbot hacia NestJS, recursos y verbos de las tools,
  aislamiento del RAG por usuario, idempotencia de la ingesta, uso real de `CHATBOT_PORT` y
  exposición del puerto 8100 sin autenticación.
- [ ] 22. Implementar las tools de alta/modificación/eliminación sobre los endpoints de NestJS y
  exponerlas como `@tool` de LangChain dentro del chain (con confirmación previa en operaciones
  destructivas).
- [ ] 23. Iteración siguiente de producto, fuera de este cambio: pantalla de chat en el frontend
  que consuma `POST /chat`, historial de conversación y manejo de errores del proveedor.
- [ ] 24. Endurecer la verificación: pruebas de `/chat` con proveedor y base vectorial simuladas
  (hoy solo existe el smoke test de `/health`).
