# Diseño: add-chatbot-service

Contenido no-delta. El pedido usa nombres en español ("chatbot", "base vectorial", "dar de alta /
modificar / eliminar registros"); la tabla los mapea a los identificadores reales del código del
servicio. Se documenta aparte porque el `delta spec` solo describe comportamiento observable.

## Equivalencias de atributos

| Nombre en español (pedido) | Identificador en código | Nota |
| --- | --- | --- |
| Proyecto nuevo al nivel de backend/frontend | `chatbot/` (paquete `app/`) | Python 3.11, `requirements.txt`, `Dockerfile` propio |
| Servidor que recibe el prompt | `app/main.py` (`app` FastAPI) + `app/api/routes/chat.py` (`POST /chat`) | Uvicorn, puerto interno 8100 |
| Mensaje / prompt del usuario | `ChatRequest.message` | 1–4000 caracteres |
| Respuesta sólida | `ChatResponse.answer` | texto del LLM con `temperature=0` |
| Proveedor del LLM | `Settings.llm_provider` → `get_llm()` | `LLM_PROVIDER`: `groq` → `ChatGroq`; cualquier otro valor → `ChatOllama` |
| Modelo | `Settings.llm_model` → `LLM_MODEL` | default `llama3.2` |
| Clave de Groq | `Settings.groq_api_key` → `GROQ_API_KEY` | ausente con provider `groq` → `RuntimeError` → HTTP 503 |
| Dirección de Ollama | `Settings.ollama_base_url` → `OLLAMA_BASE_URL` | en Docker: `http://host.docker.internal:11434` |
| Usó contexto o no | `ChatResponse.used_rag` | `True` solo si existe `data/chroma_db/chroma.sqlite3` (`vectorstore_exists()`) |
| Documentos de los que salió la respuesta | `ChatResponse.sources` | `metadata.source` de cada fragmento; `"contexto"` si no lo tiene |
| Base vectorial | `Settings.chroma_dir` → `chatbot/data/chroma_db` | `langchain_chroma.Chroma`, volumen `chatbot_data` |
| Ingesta | `scripts/ingest.py` | `TextLoader` → `RecursiveCharacterTextSplitter` (500/50) → `Chroma.from_documents` |
| Modelo de embeddings | `Settings.embedding_model` → `get_embeddings()` | `sentence-transformers/all-MiniLM-L6-v2`, compartido por ingesta y búsqueda |
| Fragmentos por pregunta | `Settings.top_k` → `RAG_TOP_K` | default 4 |
| Pipeline de recuperación + respuesta | `app/chains/rag.py` (`answer_question`) | cadena LCEL `prompt \| llm \| StrOutputParser` |
| Dar de alta un registro | `app/tools/backend_api.py: create_record(resource, payload, token)` | **stub**: `POST {BACKEND_API_URL}/{resource}`, `NotImplementedError` |
| Modificar un registro | `update_record(resource, record_id, payload, token)` | **stub**: `PATCH {BACKEND_API_URL}/{resource}/{id}`, `NotImplementedError` |
| Eliminar un registro | `delete_record(resource, record_id, token)` | **stub**: `DELETE {BACKEND_API_URL}/{resource}/{id}`, `NotImplementedError` |
| Cliente hacia NestJS | `get_client()` (`httpx.Client`, timeout 10 s) | base `Settings.backend_api_url` |
| Origen del frontend permitido | `Settings.cors_origin` → `CORS_ORIGIN` | default `http://localhost:5173`, `allow_credentials=True` |
| Puerto del chatbot | `CHATBOT_PORT` (mapeo `${CHATBOT_PORT:-8100}:8100`) | el proceso escucha siempre en 8100 |

## Decisiones de esta etapa

1. **Servicio aparte, no módulo de NestJS.** LangChain, ChromaDB y sentence-transformers viven en
   Python; el backend Node no se toca y el chat no compite con su ciclo de build. La integración
   hacia adentro (tools) se hará consumiendo la API pública de NestJS, no la base de datos.
2. **El endpoint responde desde el día 1 sin RAG.** `answer_question` verifica la existencia de la
   base persistida: con base, recupera top-k y arma el bloque `Contexto:`; sin base, usa el mismo
   chain con un contexto vacío. Evita que un despliegue nuevo falle por no haber ingerido
   documentos.
3. **Un solo modelo de embeddings compartido** (`get_embeddings()` con `lru_cache`) para que los
   vectores de ingesta y de consulta sean comparables.
4. **`/health` no depende de nada externo**, para que el healthcheck de Docker y del frontend
   funcione sin Ollama, sin Groq y sin base vectorial.
5. **Temperature 0** en ambos proveedores: el pedido pide respuestas estables, no creativas.
6. **Proveedores por if/else explícito**: `groq` es el único camino cloud; cualquier otro valor de
   `LLM_PROVIDER` se resuelve con Ollama, sin error de configuración.
7. **Tools como stub contractado.** Se deja el cliente HTTP y las tres firmas para que la próxima
   iteración solo tenga que implementar los reenvíos y envolverlos con `@tool`; en esta etapa
   `/chat` no puede escribir en la base de datos.

## Verificación de cumplimiento

| Escenario esperado | Evidencia |
| --- | --- |
| `GET /health` → 200 `ok` sin LLM | `chatbot/app/main.py`; `chatbot/tests/test_health.py` (pytest) |
| Swagger en `/docs` | FastAPI por defecto sobre `app` en `chatbot/app/main.py` |
| `POST /chat` devuelve `answer`, `provider`, `model`, `used_rag`, `sources` | `chatbot/app/schemas/chat.py`, `chatbot/app/api/routes/chat.py` |
| `message` vacío o >4000 → 422 | `Field(min_length=1, max_length=4000)` en `ChatRequest` |
| Groq sin `GROQ_API_KEY` → 503 con mensaje | `chatbot/app/core/llm.py` (`RuntimeError`) capturado en `chatbot/app/api/routes/chat.py` |
| `ollama` por defecto; cualquier valor ≠ `groq` usa Ollama | `get_llm()` en `chatbot/app/core/llm.py` |
| RAG si existe la base; si no, solo LLM con `used_rag: false` | `vectorstore_exists()` + `answer_question()` en `chatbot/app/chains/rag.py` |
| `RAG_TOP_K` controla la recuperación | `search_kwargs={"k": settings.top_k}` en `chatbot/app/chains/rag.py` |
| Ingesta 500/50 al mismo ChromaDB | `chatbot/scripts/ingest.py` |
| Archivo inexistente: aviso y nada se escribe | rama `if not Path(args.file).exists()` de `ingest.py` |
| Un origen CORS, con credenciales | `CORSMiddleware` en `chatbot/app/main.py` |
| Servicio en `app-network`, puerto `${CHATBOT_PORT:-8100}`, volumen y reload | bloque `chatbot` de `docker-compose.yml` y `chatbot/Dockerfile` |
| Configuración desde `.env` con defaults | `chatbot/app/config.py`, plantilla `chatbot/env.example` |
| Stubs sin efectos sobre los datos | `chatbot/app/tools/backend_api.py` (`NotImplementedError`, no importado por el chain) |
| `data/` y `.env` fuera de git | `chatbot/.gitignore` |
| Documentación del servicio | `chatbot/README.md` y `README.md` de la raíz |

## Pendientes técnicos (sin decisión de producto aún)

- Mapear los errores de conexión del proveedor (Ollama caído, timeout de Groq) a una respuesta 503
  en español; hoy la ruta solo captura `RuntimeError`.
- Definir cómo obtiene el chatbot el token de acceso del usuario para las tools (hoy `/chat` no
  recibe cabecera de autorización) y qué recursos de NestJS podrá tocar.
- Decidir si el script de ingesta limpia la colección antes de escribir (`Chroma.from_documents`
  hoy agrega chunks a la colección por defecto).
- Evaluar si `settings.chatbot_port` debe usarse al lanzar Uvicorn en local, en lugar de fijarlo en
  la línea de comandos.
