# Spec Delta: Chat (pantalla del frontend)

## Purpose

Pantalla de conversación del frontend con el asistente del chatbot: permite consultar las finanzas
propias y registrar gastos o ingresos en lenguaje natural desde el navegador, autenticada con la
sesión del usuario. Define el acceso (menú y ruta), los estados de la conversación, el envío de
mensajes, el reintento ante sesión vencida, la sincronización de las vistas del sistema cuando el
chatbot registra un movimiento y la usabilidad mobile conforme al sistema de diseño.

## ADDED Requirements

### Requirement: Punto de menú "Chat" con acceso protegido

La navegación principal DEBE (SHALL) incluir el ítem "Chat" con ícono de burbuja de mensaje
(`MessageCircle`), colocado después de "Reportes" y antes de "Configuración". La ruta `/chat` DEBE
(SHALL) estar protegida: solo usuarios con sesión activa acceden a la pantalla dentro del layout
de la aplicación.

#### Scenario: Menú visible

- **WHEN** un usuario autenticado despliega la navegación
- **THEN** ve "Chat" luego de "Reportes" y llega a la pantalla al seleccionarlo

#### Scenario: Acceso sin sesión

- **WHEN** un visitante sin sesión intenta abrir `/chat`
- **THEN** el guard lo envía al flujo de inicio de sesión, como el resto de las rutas privadas

### Requirement: Pantalla de conversación con sus estados

La pantalla DEBE (SHALL) mostrar la conversación con burbujas diferenciadas para el usuario y el
asistente, etiquetas en español de las tools usadas en cada respuesta y errores con estilo
destructivo. DEBE (SHALL) señalar cuando el asistente está procesando y mantener la lista accesible
y autocorrespondida al pie.

#### Scenario: Mensajes diferenciados y accesibles

- **WHEN** la conversación tiene mensajes de ambos roles
- **THEN** los del usuario aparecen a la derecha con estilo primario y los del asistente a la
  izquierda sobre fondo suave; nuevas respuestas se anuncian a lectores de pantalla (`aria-live`)
  y la lista se desplaza al pie

#### Scenario: Indicador mientras espera

- **WHEN** una pregunta fue enviada y la respuesta todavía no llegó
- **THEN** el asistente muestra el indicador "Pensando…" mientras procesa

#### Scenario: Estado vacío con ejemplos

- **WHEN** la conversación todavía no tiene mensajes
- **THEN** se muestran cinco preguntas de ejemplo ("¿Cuánto está el dólar?", "¿Cuánto ahorro
  tengo?", "¿Cuánto me deben?", "¿Cómo van mis gastos fijos este mes?", "¿Qué categorías pasaron
  el umbral?") y elegir una la envía directamente

#### Scenario: Respuesta con tools

- **WHEN** una respuesta llegó con `tools_used` no vacío
- **THEN** debajo del texto aparecen los chips con la etiqueta en español de cada tool

#### Scenario: Error en la respuesta

- **WHEN** la llamada falla (por ejemplo 502 del chatbot)
- **THEN** se muestra un mensaje destructivo con el detalle devuelto por el servicio o, si no
  hay detalle, "No pudimos comunicarnos con el asistente. Intentá de nuevo."

### Requirement: Composer con Enter para enviar

El campo de mensaje DEBE (SHALL) permitir hasta 4000 caracteres; Enter DEBE (SHALL) enviar el
texto y Shift+Enter DEBE (SHALL) agregar un salto de línea sin enviar. Mientras hay una respuesta
en curso, el envío DEBE (SHALL) estar bloqueado y el botón de enviar DESHABILITADO si el texto
está vacío.

#### Scenario: Enviar con Enter

- **WHEN** el usuario presiona Enter con texto
- **THEN** el mensaje se agrega a la conversación y se limpia el campo

#### Scenario: Multilínea

- **WHEN** el usuario presiona Shift+Enter
- **THEN** el cursor baja de línea y no se envía nada

#### Scenario: Bloqueo durante el envío

- **WHEN** el asistente está procesando una pregunta
- **THEN** no se puede enviar otra hasta recibir la respuesta

### Requirement: Historial en el pedido, sin persistencia local

La pantalla DEBE (SHALL) enviar en cada pedido el mensaje actual más los últimos 20 mensajes
visibles sin error, como `history`. NO DEBE (SHALL NOT) persistir la conversación: al recargar la
página vuelve a empezar vacía. La llamada va directa al chatbot (`VITE_CHATBOT_URL`, otro origen)
con `Authorization: Bearer <token>` de la sesión y un tiempo máximo de espera de 90 segundos.

#### Scenario: Contexto para la fecha pedida

- **WHEN** el asistente pidió fechas y el usuario responde en el siguiente mensaje
- **THEN** el pedido lleva el `history` previo y el chatbot resuelve el rango sin repetirlo en el
  mensaje actual

#### Scenario: Recarga de la página

- **WHEN** el usuario recarga o vuelve a entrar a `/chat`
- **THEN** la conversación aparece vacía; nada quedó guardado en el navegador ni en el chatbot

### Requirement: Renovación de sesión ante 401

Ante un 401 del chatbot, la pantalla DEBE (SHALL) intentar una única renovación de la sesión y
reenviar el mismo mensaje con el token nuevo. Si la renovación falla, DEBE (SHALL) mostrar el
error "Tu sesión venció. Volvé a iniciar sesión para continuar." Los mensajes de error NO DEBEN
(SHALL NOT) formar parte del `history` que se reenvía.

#### Scenario: Token vencido con refresh exitoso

- **WHEN** el chatbot responde 401 y el refresh obtiene una sesión nueva
- **THEN** el mensaje se reenvía una sola vez y la respuesta se muestra normalmente

#### Scenario: Sin sesión recuperable

- **WHEN** el refresh no devuelve sesión
- **THEN** aparece el mensaje de sesión vencida y no hay más reintentos automáticos

### Requirement: Configuración VITE_CHATBOT_URL

El frontend DEBE (SHALL) leer la URL del chatbot de `VITE_CHATBOT_URL` (definida en `env.example`
y en el `web` de `docker-compose.yml`). Sin esa variable la aplicación DEBE (SHALL) fallar al
arranque con un error explícito que indique configurarla, en lugar de ofrecer una pantalla de chat
muda.

#### Scenario: Variable presente

- **WHEN** `VITE_CHATBOT_URL=http://localhost:8100`
- **THEN** los pedidos de chat se envían a `POST <url>/chat`

#### Scenario: Variable ausente

- **WHEN** el build o el dev server corren sin `VITE_CHATBOT_URL`
- **THEN** la app no carga y el error menciona la variable y `env.example`

### Requirement: Mobile-first con el sistema de diseño

La pantalla DEBE (SHALL) construirse con los primitivos y tokens del sistema de diseño (`primary`,
`muted`, `border`, `destructive`, `card`) y verse correcta de 320 a 1280 px en claro y en oscuro:
alto del chat en `dvh`, destinos táctiles de al menos 44 px, campo de texto de 16 px en mobile,
burbujas que rompen palabras largas sin overflow horizontal.

#### Scenario: Ancho 320 px

- **WHEN** la pantalla se abre a 320 px
- **THEN** no aparece scroll horizontal y enviar, ejemplos y burbujas siguen siendo táctiles

#### Scenario: Texto largo

- **WHEN** una respuesta o un mensaje contiene una palabra o URL muy larga
- **THEN** la burbuja la rompe dentro de su ancho máximo sin deformar la lista

#### Scenario: Tema oscuro

- **WHEN** la app está en modo oscuro
- **THEN** burbujas, chips, indicador y composer mantienen contraste con los tokens del tema

#### Scenario: Área segura inferior del composer

- **WHEN** el chat se usa en un dispositivo con área segura inferior (barra de inicio)
- **THEN** el composer reserva ese espacio y el campo de mensaje y el botón de enviar no quedan
  cubiertos por la barra del sistema

### Requirement: Sincronizar las vistas del sistema tras un alta del chatbot

Cuando la respuesta del chatbot trae `events` con la marca `movement-created`, la pantalla DEBE
(SHALL) invalidar las consultas `['savings']`, `['movements']` y `['spending-control']`, para que
el chip "Dinero disponible" del header y las listas afectadas queden actualizadas igual que al
crear un movimiento desde la pantalla Movimientos. Sin esa marca NO DEBE (SHALL NOT) invalidar
nada, y `events` NO DEBE (SHALL) mostrarse al usuario: es una señal interna.

#### Scenario: Alta registrada desde la conversación

- **WHEN** el usuario pide "anotá un gasto de 3500 en comida" y recibe la respuesta con
  `events: ["movement-created"]`
- **THEN** el chip "Dinero disponible" —que lee la consulta `['savings', 'available']`— muestra el
  saldo recalculado sin recargar la página ni salir del chat, y los listados de movimientos y el
  control de gastos se vuelven a consultar

#### Scenario: Respuesta sin escrituras

- **WHEN** la respuesta llega con `events` vacío (consulta, saludo, rechazo, error o un alta que no
  se concretó)
- **THEN** la pantalla no dispara ninguna invalidación y mantiene los datos en caché

#### Scenario: Las categorías conservan su caché

- **WHEN** se invalidan las vistas tras una alta confirmada del chatbot
- **THEN** la caché de categorías NO se invalida: el chatbot no puede crear categorías, así que ese
  listado no cambia

#### Scenario: El evento no aparece en la burbuja

- **WHEN** una respuesta con `movement-created` se muestra en la conversación
- **THEN** el usuario ve el texto del asistente y el chip de la tool "Movimiento registrado", sin
  ninguna referencia visible a la marca interna
