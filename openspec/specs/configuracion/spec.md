# configuracion Specification

## Purpose
Este delta cubre únicamente el comportamiento nuevo aportado por el change `dashboard`: la
sección "Dashboard" de Configuración, donde el usuario elige con un checkbox por módulo qué
información verá en el Dashboard (persistida por usuario en la preferencia
`dashboardSections`), y la posibilidad de contraer y expandir todas las secciones de
Configuración. Las preferencias preexistentes (Vista, Ahorros y Medios de pago) se describen
en sus propios cambios.

## Requirements

### Requirement: Sección Dashboard con un checkbox por módulo

Configuración DEBE (SHALL) mostrar una sección titulada "Dashboard" con un checkbox por
módulo — Ahorros, Gastos fijos, Mis deudas, Deudas de terceros y Cotización del dólar —
marcado según la preferencia guardada del usuario. El guardado DEBE (SHALL) ser inmediato al
alternar un checkbox, sin botón de guardar.

#### Scenario: Opciones de la sección

- **WHEN** el usuario abre la sección "Dashboard"
- **THEN** ve los cinco checkboxes con su etiqueta y una línea explicativa debajo de cada una
- **THEN** la descripción de la sección es "Elegí qué información de cada módulo querés ver en
  el Dashboard."

#### Scenario: Desmarcar un módulo

- **WHEN** el usuario desmarca "Ahorros" estando habilitadas las cinco secciones
- **THEN** se guarda `dashboardSections` con `savings` removido
- **THEN** el checkbox queda desmarcado al reflejarse la preferencia guardada

#### Scenario: Orden canónico de la lista enviada

- **WHEN** el usuario habilita un módulo que estaba deshabilitado
- **THEN** la lista `dashboardSections` se envía en el orden `savings`, `fixedExpenses`,
  `myDebts`, `thirdPartyDebts`, `dollarQuotes`, sin importar el orden de los clics

#### Scenario: Guardado en curso o fallido

- **WHEN** hay un guardado en ejecución
- **THEN** los checkboxes quedan temporalmente deshabilitados
- **WHEN** el backend rechaza la actualización
- **THEN** se muestra el mensaje de error devuelto por la API y los checkboxes conservan la
  última selección válida

### Requirement: Persistencia por usuario de dashboardSections

El sistema DEBE (SHALL) persistir la selección en `User.dashboardSections` (array del enum
`DashboardSection`) y exponerla en las preferencias del usuario autenticado vía
`GET`/`PATCH /users/me/preferences`. El valor por defecto DEBE (SHALL) ser las cinco secciones
habilitadas, tanto para usuarios nuevos como existentes, y NO DEBEN (SHALL NOT) aceptarse
secciones desconocidas.

#### Scenario: Usuario sin preferencias guardadas

- **WHEN** un usuario nunca modificó la selección de secciones
- **THEN** `dashboardSections` devuelve las cinco secciones habilitadas

#### Scenario: Desmarcar todas las secciones

- **WHEN** el usuario desmarca el último checkbox habilitado
- **THEN** se persiste una lista vacía, que la API acepta
- **THEN** el resumen del Dashboard deja de devolver secciones

#### Scenario: Valor no reconocido

- **WHEN** un `PATCH` incluye en `dashboardSections` un valor que no es una sección conocida
- **THEN** el backend rechaza la petición por validación

#### Scenario: Actualización parcial

- **WHEN** un `PATCH` solo envía `dashboardSections`
- **THEN** el color, el modo, las monedas y los medios de pago del usuario permanecen intactos

### Requirement: Propagación de las secciones al Dashboard

Las secciones guardadas por el usuario DEBEN (SHALL) determinar qué calcula
`GET /dashboard/summary` y qué renderiza el Dashboard: cada módulo deshabilitado no se
consulta en el backend ni aparece en la página. El Dashboard DEBE (SHALL) consultarse contra
la última selección guardada, de modo que cambiar la selección se refleje sin recargar.

#### Scenario: Deshabilitar Gastos fijos

- **WHEN** el usuario deshabilita "Gastos fijos" y luego abre el Dashboard
- **THEN** la sección "Gastos fijos del mes" no se muestra y el backend no calcula ese bloque

#### Scenario: Reactivar Cotización del dólar

- **WHEN** el usuario reactiva "Cotización del dólar" desde Configuración
- **THEN** la franja de cotizaciones vuelve a aparecer en el Dashboard con el último resumen

### Requirement: Secciones de Configuración colapsables

Todas las secciones de Configuración — Vista, Ahorros, Medios de pago y Dashboard — DEBEN
(SHALL) poder contraerse y expandirse desde un botón en el encabezado de su tarjeta, abiertas
por defecto. El estado abierto/cerrado NO DEBE (SHALL NOT) persistirse en el servidor.

#### Scenario: Contraer una sección

- **WHEN** el usuario pulsa el botón "Contraer Vista"
- **THEN** el contenido de la sección deja de renderizarse (por ejemplo, el grupo "Color del tema")
- **THEN** el botón pasa a llamarse "Expandir Vista" y su `aria-expanded` queda en `false`
- **THEN** el indicador (chevron) deja de rotar

#### Scenario: Expandir una sección

- **WHEN** la sección está contraída y el usuario pulsa "Expandir Vista"
- **THEN** el contenido vuelve a mostrarse con `aria-expanded` en `true`

#### Scenario: Estado no persistente

- **WHEN** el usuario contrae secciones, navega fuera de Configuración y regresa
- **THEN** todas las secciones vuelven a mostrarse expandidas y no se envió nada al servidor

### Requirement: Visualización responsive y con tema en Configuración

La sección "Dashboard" y los controles de colapso DEBEN (SHALL) funcionar entre 320 y 414 px
sin desborde horizontal, con áreas táctiles de al menos 44 px y textos largos que ajustan en
varias líneas. DEBEN (SHALL) usar únicamente tokens del sistema de diseño, correctos en modo
claro y oscuro.

#### Scenario: Opciones en pantalla estrecha

- **WHEN** Configuración se usa a 320–414 px
- **THEN** los cinco checkboxes se apilan en una columna, cada fila mide al menos 44 px de alto
  y su etiqueta tocable alterna el checkbox
- **THEN** los botones de contraer/expandir miden 44 px en mobile (40 px en escritorio)

#### Scenario: Contraste en modo oscuro

- **WHEN** la aplicación está en modo oscuro
- **THEN** la sección Dashboard, sus filas marcadas y sus mensajes de error usan tokens de
  color del sistema y conservan contraste legible
