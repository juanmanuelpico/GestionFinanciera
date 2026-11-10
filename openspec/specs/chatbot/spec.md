# chatbot Specification

## Purpose
Define el servicio independiente de chat con LangChain (Python + FastAPI) que recibe el prompt
del usuario por HTTP y devuelve una respuesta sólida generada por un LLM local (Ollama) o cloud
(Groq), con contexto RAG cuando ya se ingirió documentación. Cubre la etapa de fundación del
servicio: estructura, endpoints, configuración, base vectorial y ejecución local o en Docker. Las
tools de alta, modificación y eliminación de registros contra la API de NestJS quedan contractadas
como capacidad futura. Las equivalencias con los identificadores del código y la verificación de
cumplimiento están en `design.md`.

## Requirements

### Requirement: Servicio HTTP propio, al mismo nivel que backend y frontend

El sistema DEBE (SHALL) exponer el chat como un servicio HTTP independiente (`chatbot/`, FastAPI,
puerto 8100 por defecto) con los endpoints `GET /health` y `POST /chat`. El servicio NO DEBE
(SHALL NOT) modificar la API de NestJS. La pantalla de chat del navegador pasó a ser parte del
producto y se especifica en la capability `chat`.

#### Scenario: Healthcheck sin depender del LLM

- **WHEN** se llama `GET /health` con Ollama apagado o sin base vectorial
- **THEN** responde 200 con `status: "ok"`, `service: "chatbot"`, y el `llm_provider` y
  `llm_model` configurados

#### Scenario: Documentación interactiva

- **WHEN** se abre `http://localhost:8100/docs`
- **THEN** Swagger muestra `GET /health` y `POST /chat` con sus esquemas vigentes: petición
  `{message, history}` y respuesta `{answer, provider, model, tools_used, events}`

#### Scenario: Prueba de arranque

- **WHEN** se ejecuta `python -m pytest` dentro de `chatbot/` sin LLM disponible
- **THEN** pasa la prueba de humo de `/health` (200, `status: "ok"`, `service: "chatbot"`) junto
  con las pruebas de routes, asistente y tools, que no requieren servicios reales

### Requirement: Contrato de POST /chat

`POST /chat` DEBE (SHALL) recibir `{ "message": "…", "history": [ {role, content}, … ] }` —
`history` opcional, hasta 40 mensajes — y responder
`{ answer, provider, model, tools_used, events }` (`events`: ver "Marcas de escrituras confirmadas
en la respuesta"; default `[]`). Los campos `used_rag` y `sources` de la iteración anterior DEBEN
(SHALL NOT) seguir existiendo: la respuesta ya no usa RAG. Errores: 401 sin token, 503 por
configuración inválida del LLM, 502 por fallo del agente.

#### Scenario: Pregunta respondida

- **WHEN** se envía `{"message": "¿Cuánto está el dólar?"}` con token válido
- **THEN** responde 200 con `answer` no vacío, `provider` y `model` de la configuración activa y
  `tools_used` con las herramientas realmente invocadas (orden de uso, sin repetidos)

#### Scenario: Mensaje fuera de los límites

- **WHEN** `message` viene vacío o supera los 4000 caracteres, o `history` trae más de 40
  mensajes o alguno vacío o de más de 4000 caracteres
- **THEN** la petición se rechaza con 422 de validación y no se invoca al agente

#### Scenario: Una llamada, una respuesta, sin historial

- **WHEN** el mismo cliente envía dos mensajes seguidos
- **THEN** cada uno se responde de forma independiente y el servicio NO DEBE (SHALL NOT)
  persistir conversaciones ni mensajes: el contexto proviene solo de `history`

#### Scenario: Sin autorización

- **WHEN** falta `Authorization` o el token va vacío
- **THEN** responde 401 con detalle en español antes de cualquier ejecución (ver requisito de
  autenticación)

#### Scenario: Configuración inválida del LLM

- **WHEN** `LLM_PROVIDER=groq` y falta `GROQ_API_KEY`
- **THEN** `/chat` responde 503 con el detalle de la variable faltante y no genera `answer`

#### Scenario: Fallo del agente

- **WHEN** el modelo no existe, no soporta tool calling o la ejecución del agente cae
- **THEN** `/chat` responde 502 con "No se pudo generar la respuesta (…). Intentá de nuevo."

### Requirement: Proveedor del LLM elegido por variable de entorno

El chatbot DEBE (SHALL) construir su modelo según `LLM_PROVIDER` (`groq`, u `ollama` para
cualquier otro valor) con el modelo indicado en `LLM_MODEL` y temperatura 0; con `groq`, el modelo
DEBE (SHALL) soportar tool calling —`openai/gpt-oss-20b` es el verificado— porque el asistente
opera exclusivamente mediante tools. Si `LLM_PROVIDER=groq` y falta `GROQ_API_KEY`, DEBE (SHALL)
responder 503 con un mensaje que indique la variable faltante.

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

#### Scenario: Modelo sin tool calling o retirado

- **WHEN** `LLM_MODEL` es un modelo que no soporta llamadas a herramientas o fue retirado del
  proveedor (ej. `llama-3.3-70b-versatile` en Groq)
- **THEN** la ejecución del agente falla y `/chat` responde 502 con mensaje claro; la plantilla
  `env.example` recomienda `openai/gpt-oss-20b` para `LLM_PROVIDER=groq`

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

### Requirement: Autenticación obligatoria con el token del usuario

`POST /chat` DEBE (SHALL) exigir la cabecera `Authorization: Bearer <JWT>` de un usuario de la
app. El chatbot NO DEBE (SHALL NOT) tener credenciales propias ni iniciar sesión: reutiliza ese
token en cada llamada al backend, que filtra los datos por usuario autenticado.

#### Scenario: Pedido sin cabecera de autorización

- **WHEN** se llama `POST /chat` sin `Authorization` o con un esquema distinto de Bearer
- **THEN** responde 401 con el detalle "Falta el token de acceso: enviá Authorization: Bearer
  <token> del usuario." y no se invoca al agente

#### Scenario: Token vacío

- **WHEN** la cabecera es `Bearer` seguida de un token vacío o solo espacios
- **THEN** responde 401 con "El token de acceso está vacío."

#### Scenario: Datos aislados por usuario

- **WHEN** dos usuarios consultan el chatbot con sus propios tokens
- **THEN** cada respuesta refleja solo los registros que el backend devuelve para ese token

### Requirement: Registro cerrado de nueve tools

El asistente DEBE (SHALL) construirse por request con el token incrustado y exactamente las nueve
tools del registro: `listar_movimientos`, `crear_movimiento`, `ver_ahorros`, `ver_dolar`,
`listar_deudas`, `ver_gastos_fijos`, `ver_gasto_fijo`, `ver_control_gastos` y `listar_categorias`.
NO DEBEN (SHALL NOT) existir otras herramientas alcanzables desde `/chat`.

#### Scenario: Consulta resuelta con tools

- **WHEN** el usuario pregunta "¿Cuánto está el dólar?" con token válido
- **THEN** el agente invoca `ver_dolar` y `tools_used` lista `["ver_dolar"]`

#### Scenario: Saludo sin tools

- **WHEN** el usuario saluda o agradece
- **THEN** el asistente responde cordialmente en español y `tools_used` queda vacío

#### Scenario: Categorías como herramienta de apoyo

- **WHEN** hace falta resolver el id o el nombre de una categoría antes de otra consulta
- **THEN** el agente puede invocar `listar_categorias`, que devuelve las categorías del usuario
  con id, tipo y umbral

### Requirement: Listado de movimientos con fechas obligatorias

`listar_movimientos` DEBE (SHALL) exigir `date_from` y `date_to` en formato `YYYY-MM-DD`,
convertidas al rango ISO que acepta el backend (`from` = 00:00, `to` = fin del día), con filtros
opcionales de tipo y categoría. Si el usuario no indicó fecha, el asistente NO DEBE (SHALL NOT)
ejecutar ninguna tool: DEBE (SHALL) preguntar el rango y esperar la respuesta.

#### Scenario: Sin fechas: preguntar y no ejecutar

- **WHEN** el usuario pregunta "¿Cuántos movimientos tengo?" sin indicar fechas
- **THEN** no se invoca ninguna tool (`tools_used` vacío) y el asistente pregunta qué fechas
  quiere consultar

#### Scenario: Fechas respondidas en el mensaje siguiente

- **WHEN** el usuario contesta el rango en el mensaje siguiente y el pedido incluye el `history`
  de la conversación
- **THEN** el asistente llama a `listar_movimientos` con `date_from` y `date_to` de ese rango

#### Scenario: Fechas inválidas

- **WHEN** la tool recibe una fecha que no es `YYYY-MM-DD`
- **THEN** devuelve "ERROR: fechas inválidas. Usá formato YYYY-MM-DD." sin llamar al backend

#### Scenario: Listado con filtros y paginación

- **WHEN** se pide un rango con `movement_type` (INGRESO/EGRESO) o `category_id`, o hay más
  resultados que una página
- **THEN** la respuesta lista los movimientos (id, fecha, tipo, importe con moneda, categoría,
  nota), total y subtítulos de la página, con aviso de que hay más páginas disponibles

### Requirement: Alta de movimientos como única escritura

`crear_movimiento` DEBE (SHALL) registrar INGRESO o EGRESO mediante `POST /movements` con monto
positivo, categoría resuelta por nombre del usuario, y único punto de escritura del chatbot. La
billetera (`currency`) default es ARS si el usuario no indica otra; la fecha default es hoy si no
informa otra. DEBE (SHALL) ejecutarse directamente, sin pedir confirmación, e informar lo
registrado.

#### Scenario: Gasto con billetera default y fecha hoy

- **WHEN** el usuario pide "anotá un gasto de 3500 en comida" sin fecha ni moneda
- **THEN** se crea un EGRESO de 3500 ARS con fecha de hoy y el asistente informa el id, el
  importe, la categoría y la fecha

#### Scenario: Sinónimos en español

- **WHEN** el modelo solicita el tipo "gasto", "salida" o "desembolso"
- **THEN** la tool lo traduce a EGRESO; "ganancia" o "entrada" se traducen a INGRESO

#### Scenario: Importe o tipo inválidos

- **WHEN** el monto no es mayor a 0 o el tipo no es INGRESO/EGRESO ni un sinónimo
- **THEN** la tool devuelve un ERROR con la alternativa válida y no se crea ningún movimiento

#### Scenario: Categoría inexistente

- **WHEN** el nombre de categoría no coincide con ninguna del usuario (normalizado, sin acentos)
- **THEN** la tool devuelve ERROR listando las categorías disponibles y el asistente lo reformula

#### Scenario: Categoría ambigua o de tipo incompatible

- **WHEN** el nombre coincide con varias categorías, o la categoría tiene un tipo distinto del
  movimiento pedido
- **THEN** no se crea nada: en el primer caso se pide precisión, en el segundo se explica que la
  categoría no admite ese tipo

#### Scenario: Categoría sin tipo

- **WHEN** la categoría resuelta no tiene tipo definido
- **THEN** el movimiento se registra igualmente, con el tipo pedido por el usuario

#### Scenario: Medio de pago y nota opcionales

- **WHEN** el usuario menciona un medio de pago del catálogo (EFECTIVO, DEBITO, CREDITO,
  TRANSFERENCIA, MERCADO_PAGO, OTRO) o una nota
- **THEN** el medio se envía en el alta —uno fuera del catálogo se omite sin bloquear el
  registro— y la nota se guarda combinada con la marca `Registro chatbot` dentro de los 500
  caracteres

#### Scenario: Alerta de umbral al registrar

- **WHEN** el backend responde el movimiento creado con una alerta de superación de umbral
- **THEN** el asistente informa además lo gastado contra el umbral de la categoría en el mes

### Requirement: Consulta de ahorros y dólar

`ver_ahorros` DEBE (SHALL) consumir `GET /savings/available` y `GET /savings/summary` e informar
disponible y ahorro registrado por moneda (ARS, USD, EUR), con filtro opcional de moneda única;
si no se filtra, incluye también los totales estimados convertidos. `ver_dolar` DEBE (SHALL)
consumir `GET /exchange-rates/dollar` y devolver blue, oficial y MEP con compra y venta.

#### Scenario: Ahorros sin filtro

- **WHEN** el usuario pregunta cuánto ahorro tiene sin indicar moneda
- **THEN** se muestran disponible y ahorro de las tres billeteras más los totales estimados en
  ARS y USD

#### Scenario: Filtro por moneda

- **WHEN** la consulta menciona una billetera (por ejemplo USD)
- **THEN** solo se informa esa moneda, sin los totales convertidos

#### Scenario: Moneda inválida

- **WHEN** se pide una moneda fuera de ARS/USD/EUR
- **THEN** la tool devuelve ERROR con las billeteras válidas

#### Scenario: Dólar actual

- **WHEN** el usuario pregunta por la cotización del dólar
- **THEN** se listan Dólar Blue, Oficial y MEP con compra, venta y fecha de actualización; si el
  backend no trae ninguna, se informa que no se pudieron obtener

### Requirement: Consulta de deudas con totales y vencidas

`listar_deudas` DEBE (SHALL) consumir `GET /debts` con `kind` PROPIA o TERCERO (obligatorio) y
filtros opcionales de estado (`ACTIVA`/`FINALIZADA`), actor (`PERSONA`/`TARJETA`), moneda y
búsqueda por persona, y calcular en la tool el total pendiente por moneda y las deudas VENCIDAS.

#### Scenario: Cuánto me deben en total

- **WHEN** el usuario pregunta cuánto le deben
- **THEN** se usa `kind=TERCERO` y la respuesta informa el total pendiente por moneda y el
  detalle de cada deuda (código, persona, estado, restante sobre total, próximo vencimiento)

#### Scenario: Deuda propia incluyendo tarjeta

- **WHEN** el usuario pregunta por sus deudas propias o las de su tarjeta
- **THEN** se usa `kind=PROPIA`, con `actorType=TARJETA` si solo menciona tarjetas

#### Scenario: Cuotas vencidas calculadas

- **WHEN** una deuda activa tiene cuotas impagas con `dueDate` anterior a hoy
- **THEN** el total pendiente marca cuánto está VENCIDA y, si la consulta era por persona, se
  lista a quién le corresponde; una deuda sin cuotas vencidas NO DEBE (SHALL NOT) marcarse como
  vencida

#### Scenario: Búsqueda por persona específica

- **WHEN** el usuario pregunta cuánto le debe una persona concreta
- **THEN** la tool reenvía ese nombre como `search` al backend y resume las deudas encontradas

### Requirement: Consulta de gastos fijos del período e historial

`ver_gastos_fijos` DEBE (SHALL) consumir `GET /fixed-expenses/projections` para un período
`YYYY-MM` (default el mes actual) y clasificar cada ítem en PAGADO (con fecha de pago), PENDIENTE
(con vencimiento) o VENCIDO (pendiente con vencimiento anterior a hoy), con resumen por estado.
`ver_gasto_fijo` DEBE (SHALL) resolver el título del gasto sobre `GET /fixed-expenses` y listar su
historial de pagos (`GET /fixed-expenses/:id/payments`, últimos 12).

#### Scenario: Gastos fijos del mes

- **WHEN** el usuario pregunta cómo van sus gastos fijos este mes
- **THEN** se listan con importe y estado —pagados con fecha de pago, pendientes con vencimiento,
  vencidos con la fecha que pasó— y un resumen de sumas y cantidades por estado

#### Scenario: Período inválido

- **WHEN** el período no es `YYYY-MM`
- **THEN** la tool devuelve ERROR con el formato correcto

#### Scenario: Historial de un gasto específico

- **WHEN** el usuario pide el historial de un gasto fijo por su nombre
- **THEN** se muestran los importes y fechas de pago de los últimos 12 períodos, con el día de
  vencimiento de cada uno

#### Scenario: Título inexistente o ambiguo

- **WHEN** ningún título coincide (normalizado, sin acentos), o coinciden varios
- **THEN** la tool devuelve ERROR con los nombres disponibles o pide precisión, sin inventar un
  gasto

### Requirement: Consulta de control de gastos por umbral

`ver_control_gastos` DEBE (SHALL) combinar `GET /categories` (umbrales) con
`GET /reports/movements/category-averages` del período (EGRESO de la billetera pedida, default
ARS) y estado UMBRAL SUPERADO (porcentaje ≥ 100), CERCA DE SUPERAR (≥ 80) o EN CONTROL, con el
porcentaje truncado como el backend. Puede consultarse todas las categorías con umbral o una por
nombre.

#### Scenario: Tres estados por categoría

- **WHEN** el usuario pide el control de gastos del mes
- **THEN** cada categoría con umbral muestra gastado, umbral, porcentaje y su estado, ordenadas
  por gravedad, con resumen de cuántas están superadas, cerca o en control

#### Scenario: Una categoría específica

- **WHEN** la consulta menciona una categoría
- **THEN** el reporte se filtra a las categorías cuyo nombre (normalizado) la contiene

#### Scenario: Sin umbrales configurados

- **WHEN** no hay categorías con umbral en la billetera pedida
- **THEN** se informa que no hay categorías configuradas para monitorear, sin improvisar estados

### Requirement: Cálculos dentro de las tools

Los totales, porcentajes, vencimientos y clasificaciones que responde el asistente DEBEN (SHALL)
calcularse en Python dentro de las tools, que devuelven texto compacto y legible. El modelo NO
DEBE (SHALL NOT) hacer aritmética sobre datos crudos paginados ni inventar números: reutiliza los
importes, fechas y estados ya calculados.

#### Scenario: Vencidas sin aritmética del modelo

- **WHEN** hay que determinar cuánto está vencido en deudas o clasificar un gasto fijo
- **THEN** la tool ya devuelve el importe vencido y el estado calculados con la fecha de hoy

#### Scenario: Subtotales de página

- **WHEN** un listado supera una página
- **THEN** la herramienta aclara que los subtotales corresponden a los ítems mostrados

### Requirement: Rechazo literal fuera del alcance

Cualquier pedido que salga de las capacidades del asistente (modificar o eliminar registros,
crear deudas/ahorros/gastos fijos/categorías, exportar, otros temas o monedas, datos de otras
personas) DEBE (SHALL) responder exactamente, sin agregar nada y sin ejecutar tools:
"No puedo responder o aplicar tu consulta porque sobrepasa los limites establecidos". El sistema
DEBE (SHALL) canonizar la frase aunque el modelo la devuelva con tildes o puntuación distintas.

#### Scenario: Tema no cubierto

- **WHEN** el usuario pregunta "¿en qué cripto invierto?"
- **THEN** la respuesta es la frase literal, sin herramientas invocadas

#### Scenario: Pedido de eliminación

- **WHEN** el usuario pide "borrame todos los movimientos"
- **THEN** la respuesta es la frase literal canonizada y no ocurre ninguna acción sobre los datos

#### Scenario: Variante ortográfica del modelo

- **WHEN** el modelo devuelve el rechazo con acentos o punto final agregados
- **THEN** el chatbot reemplaza la respuesta por la frase literal de producto

### Requirement: Traducción de errores del backend al usuario

Las tools DEBEN (SHALL) traducir los fallos del backend a texto legible: un 401 de NestJS visto
por una tool DEBE (SHALL) convertirse en aviso de sesión vencida para que el asistente pida
reloguearse; el resto de los errores, en "ERROR DEL SISTEMA" con el detalle del envelope
`{success, data}`; una desconexión, en un mensaje claro sin credenciales expuestas.

#### Scenario: Token vencido durante una consulta

- **WHEN** una tool recibe 401 del backend
- **THEN** el texto devuelto al modelo indica que la sesión expiró y el asistente pide al usuario
  que vuelva a iniciar sesión en la app

#### Scenario: Error de negocio del backend

- **WHEN** una tool recibe 4xx/5xx con un envelope de error de NestJS
- **THEN** el modelo recibe "ERROR DEL SISTEMA" con el mensaje legible del backend y lo reformula
  al usuario

### Requirement: Marca de origen "Registro chatbot" en la observación del alta

La observación (`note`) que el chatbot envía en `POST /movements` DEBE (SHALL) llevar siempre la
marca `Registro chatbot`, estampada por el código de la tool y no a merced del texto que genere el
modelo. Cuando el usuario no dictó una nota, la observación es exactamente esa marca; cuando dio la
suya, DEBE (SHALL) guardarse combinada como `<nota> · Registro chatbot`, con el resultado truncado
a 500 caracteres.

#### Scenario: Sin nota del usuario: solo la marca

- **WHEN** el usuario pide un alta sin dictar ninguna observación
- **THEN** el movimiento queda registrado con la nota exactamente "Registro chatbot"

#### Scenario: Con nota: marca combinada

- **WHEN** el usuario pide el alta e indica su propia nota (por ejemplo "bonus de octubre")
- **THEN** el movimiento se registra con la nota "bonus de octubre · Registro chatbot", sin que el
  modelo pueda omitir la marca ni cambiarla de orden

### Requirement: Marcas de escrituras confirmadas en la respuesta

`POST /chat` DEBE (SHALL) devolver en `events` las marcas de las escrituras confirmadas por el
**código** del chatbot, no por el texto del modelo. La única marca hoy es `movement-created`, que
se emite SOLO cuando el backend devolvió el movimiento creado con sus datos (id, tipo, importe,
billetera, fecha, categoría); los errores de alta, las consultas y los rechazos NO DEBEN (SHALL
NOT) emitir ninguna marca.

#### Scenario: Alta confirmada reporta su evento

- **WHEN** el pedido termina en un movimiento creado por `crear_movimiento`
- **THEN** la respuesta incluye `events: ["movement-created"]` junto con `answer`, `provider`,
  `model` y `tools_used`; el `answer` sigue siendo texto legible para el usuario

#### Scenario: Consultas y rechazos sin marcas

- **WHEN** el pedido es una consulta, un saludo o un rechazo fuera de alcance
- **THEN** `events` vuelve vacío (`[]`)

#### Scenario: Alta que no se concretó

- **WHEN** el alta falla por validación propia, categoría inexistente o ambigua, error del backend
  o token vencido
- **THEN** `events` vuelve vacío: ninguna marca se emite sin escritura confirmada
