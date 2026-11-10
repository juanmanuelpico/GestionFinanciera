# Chatbot — Gestión Financiera

Servidor Python + LangChain para el chat de Gestión Financiera. Recibe prompts por
HTTP, responde con contexto RAG (ChromaDB) y, en próximas iteraciones, ejecuta tools
que consumen la API de NestJS para dar de alta / modificar / eliminar registros.

Estructura tomada del demo `rag-chat-static` (mismas librerías y variables de entorno),
adaptada a un paquete `app/` con servidor FastAPI.

## Requisitos

- Python 3.11+
- (Opcional) [Ollama](https://ollama.ai) con un modelo descargado, si usás provider local
- (Opcional) API key de [Groq](https://console.groq.com), si usás provider cloud

## Instalación local

```bash
cd chatbot
python -m venv .venv

# Windows:
.venv\Scripts\Activate.ps1
# Mac o Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp env.example .env   # y editá las variables
```

## Configuración

| Variable | Default | Descripción |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | `ollama` (local) o `groq` (cloud, requiere API key) |
| `LLM_MODEL` | `llama3.2` | Nombre del modelo según el provider |
| `GROQ_API_KEY` | — | Solo necesaria si usás Groq |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL del servidor Ollama (en Docker: `http://host.docker.internal:11434`) |
| `BACKEND_API_URL` | `http://localhost:3000/api` | API de NestJS para las futuras tools CRUD |
| `CHATBOT_PORT` | `8100` | Puerto del servidor (local) |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido (frontend) |
| `RAG_TOP_K` | `4` | Fragmentos recuperados por pregunta |

## Uso

### 1. Levantar el servidor

```bash
uvicorn app.main:app --reload --port 8100
```

> Nota (Windows): en esta máquina `WatchFiles` a veces no detecta cambios en
> `app/tools` o `app/chains` (solo re-carga `main.py`). Si una respuesta no refleja
> el último código, reiniciar el proceso de uvicorn (matando también el worker).

- Health: `http://localhost:8100/health`
- Docs (Swagger): `http://localhost:8100/docs`

### 2. Chatear

El endpoint `/chat` requiere el token del usuario (las consultas son por usuario;
el backend NestJS filtra los datos con ese JWT):

```bash
curl -X POST http://localhost:8100/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"message": "¿cuánto está el dólar?", "history": []}'
```

- `message`: prompt actual (1–4000 caracteres).
- `history` (opcional): mensajes previos `[{role: "user"|"assistant", content}]` — el
  chatbot no guarda sesión; el cliente (pantalla Chat del frontend) reenvía el historial.
- Respuesta: `{answer, provider, model, tools_used, events}`. `tools_used` informa qué
  herramientas del backend se invocaron (vacío si no hizo falta). `events` trae marcas
  estructurales de escrituras confirmadas por código (hoy solo `"movement-created"`);
  la pantalla Chat del frontend la usa para refrescar el dinero disponible del header,
  los movimientos y el control de gastos, igual que al crear desde el sistema.
- Sin token o con token vencido del backend → `401`; LLM inaccesible → `502`.

## Asistente con tools (alcance limitado por diseño)

El agente (LangChain `create_agent` + function calling) SOLO puede:

| Tool | Capacidad |
|---|---|
| `listar_movimientos` | listado con filtros; **fechas `date_from`/`date_to` obligatorias**: sin fechas el asistente pregunta y no ejecuta |
| `crear_movimiento` | alta de gasto/ingreso: resuelve la categoría por nombre, billetera default `ARS`, fecha default hoy, ejecuta directo e informa. La **observación siempre lleva la marca `Registro chatbot`** (sola, o combinada: `"nota del usuario · Registro chatbot"`) y la respuesta HTTP incluye el event `movement-created` |
| `ver_ahorros` | disponible por billetera y ahorro, filtro opcional por moneda |
| `ver_dolar` | cotización blue / oficial / MEP |
| `listar_deudas` | propias/terceros, activas/finalizadas, por persona, totales pendientes y vencidas (agregado en Python) |
| `ver_gastos_fijos` / `ver_gasto_fijo` | pagados/pendientes/vencidos del mes e historial de pagos |
| `ver_control_gastos` | estado por categoría con umbral: superado (≥100%), cerca (≥80%), en control |
| `listar_categorias` | ids, tipos y umbrales del usuario |

Cualquier otro pedido (modificar/eliminar registros, crear deudas, otras consultas)
recibe la respuesta literal:
*"No puedo responder o aplicar tu consulta porque sobrepasa los limites establecidos"*.

Agregaciones (totales, vencidos, porcentajes de umbral) se calculan en Python dentro
de las tools; el LLM nunca hace aritmética sobre el JSON del backend.

### Modelo LLM para el agente

Necesita un modelo con **tool calling**. En Groq (probado): `openai/gpt-oss-20b`.
Los viejos `llama-3.3-70b-versatile` fueron retirados de Groq: si `LLM_MODEL` no
existe, `/chat` devuelve `502 NotFoundError`.

### 3. Tests

```bash
python -m pytest
```

## Docker

El servicio `chatbot` está definido en el `docker-compose.yml` de la raíz:

```bash
docker compose up --build -d chatbot
```

Nota: dentro del contenedor, Ollama se alcanza con
`OLLAMA_BASE_URL=http://host.docker.internal:11434` (el compose ya lo configura por
defecto) y el backend con `BACKEND_API_URL=http://api:3000/api`.

## Estructura

```
chatbot/
├── app/
│   ├── main.py                  # FastAPI: app, CORS, /health
│   ├── config.py                # Settings desde .env (mismas vars que la referencia)
│   ├── api/routes/chat.py       # POST /chat
│   ├── schemas/chat.py          # ChatRequest / ChatResponse (Pydantic)
│   ├── core/
│   │   ├── llm.py               # get_llm() ollama|groq
│   │   ├── embeddings.py        # HuggingFaceEmbeddings compartido
│   │   └── vectorstore.py       # ChromaDB persistente (data/chroma_db)
│   ├── chains/rag.py            # Pipeline RAG (LCEL) — disponible, no usado por /chat
│   ├── chains/assistant.py      # Agente con tools (create_agent + function calling)
│   ├── chains/assistant_prompt.py # Prompt: capacidades, reglas de fechas y límite literal
│   └── tools/                   # Cliente httpx → NestJS + tools por dominio
│       ├── backend_api.py       #   api_get/api_post con Bearer token, unwrap {success,data}
│       ├── registry.py          #   build_tools(token): las 9 tools del asistente
│       └── movements|savings|dollar|debts|fixed_expenses|spending|common.py
├── scripts/ingest.py            # Ingesta MD → ChromaDB
├── tests/
├── data/                        # base vectorial (gitignoreada)
├── env.example                  # plantilla de .env
├── requirements.txt
└── Dockerfile
```
