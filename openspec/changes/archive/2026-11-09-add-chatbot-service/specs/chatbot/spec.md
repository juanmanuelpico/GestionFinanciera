# Spec Delta: Chatbot

## Purpose

Define el servicio independiente de chat con LangChain (Python + FastAPI) que recibe el prompt
del usuario por HTTP y devuelve una respuesta sólida generada por un LLM local (Ollama) o cloud
(Groq), con contexto RAG cuando ya se ingirió documentación. Cubre la etapa de fundación del
servicio: estructura, endpoints, configuración, base vectorial y ejecución local o en Docker. Las
tools de alta, modificación y eliminación de registros contra la API de NestJS quedan contractadas
como capacidad futura. Las equivalencias con los identificadores del código y la verificación de
cumplimiento están en `design.md`.

## ADDED Requirements

### Requirement: Servicio HTTP propio, al mismo nivel que backend y frontend

El sistema DEBE (SHALL) exponer el chat como un servicio HTTP independiente (`chatbot/`, FastAPI,
puerto 8100 por defecto) con los endpoints `GET /health` y `POST /chat`. El servicio NO DEBE
(SHALL NOT) modificar la API de NestJS ni agregar una pantalla de chat en el frontend en esta etapa.

#### Scenario: Healthcheck sin depender del LLM

- **WHEN** se llama `GET /health` con Ollama apagado o sin base vectorial
- **THEN** responde 200 con `status: "ok"`, `service: "chatbot"`, y el `llm_provider` y
  `llm_model` configurados

#### Scenario: Documentación interactiva

- **WHEN** se abre `http://localhost:8100/docs`
- **THEN** Swagger muestra `GET /health` y `POST /chat` con sus esquemas de petición y respuesta

#### Scenario: Prueba de arranque

- **WHEN** se ejecuta `python -m pytest` dentro de `chatbot/` sin LLM disponible y sin base
  vectorial
- **THEN** pasa la prueba de humo de `/health` (200, `status: "ok"`, `service: "chatbot"`)

### Requirement: Contrato de POST /chat

`POST /chat` DEBE (SHALL) recibir `{ "message": "…" }` y DEBE (SHALL) responder
`{ answer, provider, model, used_rag, sources }`, donde `provider` y `model` reflejan la
configuración activa y `sources` es siempre una lista (vacía cuando no hubo recuperación).

#### Scenario: Pregunta respondida

- **WHEN** se envía `{"message": "¿Qué es un gasto fijo?"}`
- **THEN** responde 200 con `answer` no vacío, `provider` `ollama` o `groq` y `model` el del
  entorno

#### Scenario: Mensaje fuera de los límites

- **WHEN** `message` viene vacío o supera los 4000 caracteres
- **THEN** la petición se rechaza con 422 de validación y no se invoca al LLM

#### Scenario: Una llamada, una respuesta, sin historial

- **WHEN** el mismo cliente envía dos mensajes seguidos
- **THEN** cada uno se responde de forma independiente y el servicio NO DEBE (SHALL NOT)
  persistir conversaciones ni mensajes

### Requirement: Proveedor del LLM elegido por variable de entorno

El chatbot DEBE (SHALL) construir su modelo según `LLM_PROVIDER` (`groq`, u `ollama` para
cualquier otro valor) con el modelo indicado en `LLM_MODEL` y temperatura 0. Si
`LLM_PROVIDER=groq` y falta `GROQ_API_KEY`, DEBE (SHALL) responder 503 con un mensaje que indique
la variable faltante.

#### Scenario: Valores por defecto

- **WHEN** no se define `LLM_PROVIDER` ni `LLM_MODEL`
- **THEN** el provider es `ollama` y el modelo `llama3.2`

#### Scenario: Valor de provider no reconocido

- **WHEN** `LLM_PROVIDER=openai`
- **THEN** se usa Ollama, porque solo el valor `groq` activa el proveedor cloud

#### Scenario: Groq con clave

- **WHEN** `LLM_PROVIDER=groq` con `GROQ_API_KEY` definida
- **THEN** la respuesta se genera con Groq, con temperatura 0, y `/chat` devuelve ese `provider` y
  su `model`

#### Scenario: Groq sin clave

- **WHEN** `LLM_PROVIDER=groq` y `GROQ_API_KEY` está vacía
- **THEN** `/chat` responde 503 con el detalle "GROQ_API_KEY no está configurada: definila en
  chatbot/.env" y no devuelve `answer`

#### Scenario: Servidor Ollama remoto

- **WHEN** se define `OLLAMA_BASE_URL`
- **THEN** el modelo se invoca en esa URL; si se omite, se usa la que trae la librería

### Requirement: Respuesta con contexto RAG o solo con el LLM

Si existe la base vectorial en `chatbot/data/chroma_db`, `/chat` DEBE (SHALL) recuperar los
fragmentos más similares hasta `RAG_TOP_K` (4 por defecto), responder usando ese contexto y
devolver `used_rag: true` con sus `sources`. Si la base no existe, DEBE (SHALL) responder solo con
el LLM, con `used_rag: false` y `sources` vacía.

#### Scenario: Base disponible

- **WHEN** ya se corrió la ingesta y se pregunta por un tema documentado
- **THEN** `used_rag` es `true` y `sources` lista el archivo de origen de cada fragmento
  recuperado ("contexto" cuando el fragmento no lo tiene)

#### Scenario: Servicio recién instalado

- **WHEN** no existe `data/chroma_db`
- **THEN** `/chat` igual responde con el LLM, `used_rag: false` y `sources: []`

#### Scenario: Cantidad de contexto configurable

- **WHEN** se fija `RAG_TOP_K=2`
- **THEN** se recuperan y se entregan al modelo 2 fragmentos

#### Scenario: Respuesta atada al contexto

- **WHEN** se responde con RAG
- **THEN** el prompt instruye usar exclusivamente el contexto proporcionado y los fragmentos se
  unen en un solo bloque "Contexto:" antes de la pregunta

### Requirement: Ingesta de documentación Markdown

El servicio DEBE (SHALL) generar su base vectorial con `python scripts/ingest.py <archivo.md>`:
divide el documento en fragmentos de 500 caracteres con 50 de solapamiento, los vectoriza con el
mismo modelo de embeddings que usa la búsqueda (`sentence-transformers/all-MiniLM-L6-v2`,
configurable con `EMBEDDING_MODEL`) y persiste en `chatbot/data/chroma_db`.

#### Scenario: Ingesta correcta

- **WHEN** se ejecuta el script sobre un `.md` existente
- **THEN** imprime la cantidad de chunks generados y la ruta de destino, y la llamada siguiente a
  `/chat` responde con `used_rag: true`

#### Scenario: Archivo inexistente

- **WHEN** la ruta pasada al script no existe
- **THEN** imprime "Archivo no encontrado: <ruta>" y no crea ni modifica la base vectorial

#### Scenario: Base persistente y fuera del control de versiones

- **WHEN** se regenera el contenedor o se reinicia el servicio
- **THEN** la base sigue disponible porque `data/` no se versiona y en Docker vive en el volumen
  `chatbot_data`

### Requirement: Un único origen permitido para el navegador

El chatbot DEBE (SHALL) permitir las llamadas desde el navegador solo para el origen configurado
en `CORS_ORIGIN` (`http://localhost:5173` por defecto), con credenciales habilitadas y todos los
métodos y cabeceras.

#### Scenario: El frontend puede llamar

- **WHEN** una página del origen configurado llama a `POST /chat`
- **THEN** la respuesta incluye `Access-Control-Allow-Origin` con ese origen y el navegador la
  entrega al cliente

#### Scenario: Otro origen queda excluido

- **WHEN** una página de un origen distinto llama al servicio
- **THEN** la cabecera no devuelve ese origen y la lectura de la respuesta queda bloqueada

### Requirement: Ejecución local y como servicio de Docker Compose

El chatbot DEBE (SHALL) poder correr en local (`.venv` + `uvicorn app.main:app --reload --port
8100`) y como servicio `chatbot` del `docker-compose.yml`, dentro de `app-network`, con
`BACKEND_API_URL` apuntando a la API de NestJS (`http://api:3000/api`).

#### Scenario: Subida con Compose

- **WHEN** se ejecuta `docker compose up --build -d chatbot`
- **THEN** `/health` responde en el puerto `${CHATBOT_PORT:-8100}` del host y el servicio se levanta
  después de `api`

#### Scenario: Ollama que corre en el host

- **WHEN** el contenedor necesita un modelo local
- **THEN** usa `OLLAMA_BASE_URL` por defecto `http://host.docker.internal:11434`, habilitado con
  `extra_hosts: host.docker.internal:host-gateway`

#### Scenario: Cambios en el código sin rebuild

- **WHEN** se edita el código de `chatbot/` con el contenedor arriba
- **THEN** `uvicorn --reload` recarga el servicio, porque `./chatbot` está montado en `/app` y la
  base vectorial queda en el volumen `chatbot_data`

### Requirement: Configuración centralizada en variables de entorno

Toda la configuración del servicio DEBE (SHALL) leerse del entorno desde `chatbot/.env`, cuya
plantilla es `chatbot/env.example`, con defaults documentados. Las claves, como `GROQ_API_KEY`,
NO DEBEN (SHALL NOT) versionarse.

#### Scenario: Plantilla completa

- **WHEN** se copia `env.example` a `.env`
- **THEN** quedan definidas `LLM_PROVIDER`, `LLM_MODEL`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`,
  `BACKEND_API_URL`, `CHATBOT_PORT`, `CORS_ORIGIN`, y de forma opcional `EMBEDDING_MODEL` y
  `RAG_TOP_K`

#### Scenario: Arranque sin archivo .env

- **WHEN** no existe `chatbot/.env`
- **THEN** el servicio usa ollama/`llama3.2`, backend `http://localhost:3000/api`, CORS
  `http://localhost:5173`, top-k 4 y escucha en 8100

#### Scenario: Variables de la raíz para Compose

- **WHEN** se levanta el stack completo
- **THEN** el `.env` de la raíz provee `CHATBOT_PORT`, `LLM_PROVIDER`, `LLM_MODEL`,
  `GROQ_API_KEY` y `OLLAMA_BASE_URL`, y el puerto interno del contenedor permanece en 8100

### Requirement: Tools de alta, modificación y eliminación de registros (capacidad futura)

El chatbot DEBE (SHALL) contractar las operaciones sobre registros de NestJS como
`create_record(resource, payload, token)`, `update_record(resource, record_id, payload, token)` y
`delete_record(resource, record_id, token)` sobre un cliente HTTP con la base `BACKEND_API_URL`.
En esta etapa NO DEBEN (SHALL NOT) estar conectadas al chain ni ejecutarse desde `/chat`: son
stubs.

#### Scenario: Pedir una operación no tiene efectos

- **WHEN** el usuario escribe "dame de alta un gasto de 1000 pesos" en `/chat`
- **THEN** el servicio solo devuelve texto y no se crea, modifica ni elimina ningún registro de la
  base de datos

#### Scenario: Invocar el stub

- **WHEN** se llama directamente a una de las tres firmas
- **THEN** falla con `NotImplementedError` ("Falta implementar contra los endpoints del backend")

#### Scenario: Cliente hacia el backend

- **WHEN** se construye el cliente HTTP del módulo
- **THEN** usa como base la URL configurada del backend NestJS y un tiempo de espera de 10 segundos

### Requirement: Sin autenticación ni datos personales en esta etapa

`/health` y `/chat` DEBEN (SHALL) atender sin token de sesión, y el chat NO DEBE (SHALL NOT) leer
ni escribir datos de ningún usuario: su único contexto son los documentos que se hayan
ingerido. El aislamiento por usuario queda pendiente para la iteración de las tools.

#### Scenario: Petición anónima

- **WHEN** se llama a `/chat` sin ningún token
- **THEN** responde 200 con la respuesta del modelo (el servicio no valida sesión)

#### Scenario: Ningún dato del usuario se expone

- **WHEN** se responde con contexto RAG
- **THEN** `answer` y `sources` solo contienen lo ingerido en la base vectorial, nunca registros
  de `movements`, `debts` u otras tablas del backend
