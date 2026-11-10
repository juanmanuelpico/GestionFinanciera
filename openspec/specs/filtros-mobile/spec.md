# filtros-mobile Specification

## Purpose
Hacer que las barras de filtros de todas las pantallas financieras sean usables en un teléfono:
panel plegado por defecto detrás de un botón "Filtros" con badge de cantidad de filtros activos,
aplicación en vivo sin botón "Aplicar" y campos con altura táctil de 44 px. En escritorio el
comportamiento y la grilla de campos quedan exactamente como antes. Las equivalencias entre los
nombres en español de cada pantalla y los identificadores del código se conservan en
`proposal.md`.

## Requirements

### Requirement: Panel de filtros plegado por defecto en mobile

En pantallas de menos de 640 px cada barra de filtros DEBE (SHALL) iniciarse plegada mostrando
solo el botón "Filtros", de ancho completo y 44 px de alto. Los campos NO DEBEN (SHALL NOT)
estar visibles hasta que el usuario toque ese botón; al tocarlo, la grilla de campos DEBE (SHALL)
desplegarse debajo del botón.

#### Scenario: Inicio en 375 px

- **WHEN** se abre la pantalla de Movimientos en un ancho de 375 px
- **THEN** solo se ve el botón "Filtros" y los campos Desde, Hasta, Tipo y Categoría están ocultos

#### Scenario: Abrir el panel

- **WHEN** el usuario toca "Filtros"
- **THEN** aparece la grilla de campos del módulo y el botón queda encima de ella

### Requirement: Despliegue y replegado accesibles

El botón "Filtros" DEBE (SHALL) exponer `aria-expanded` con el estado del panel y `aria-controls`
que lo referencia, y girar su flecha al abrir. Tocarlo otra vez DEBE (SHALL) plegar el panel sin
alterar los filtros ya aplicados.

#### Scenario: Alternar el panel

- **WHEN** se toca el botón y luego se vuelve a tocar
- **THEN** `aria-expanded` pasa de `false` a `true` y de vuelta a `false`, con el panel visible y
  oculto en consecuencia y la flecha rotada

#### Scenario: Replegar conserva lo aplicado

- **WHEN** el usuario pliega el panel después de aplicar filtros
- **THEN** los resultados siguen filtrados y el botón conserva su badge con la cantidad

### Requirement: Badge de cantidad de filtros activos

Cuando al menos un filtro tiene un valor distinto del de defecto, el botón "Filtros" DEBE (SHALL)
mostrar un badge con la cantidad de filtros activos, anunciado "N filtros activos" (uno: "1 filtro
activo"). Con cero filtros NO DEBE (SHALL) mostrar badge. Un filtro cuenta cuando su texto no está
vacío, su selector no está en "Todos" o su fecha está puesta; en Reportes un período no de defecto
cuenta como uno solo aunque se muevan Desde y Hasta.

#### Scenario: Conteo en Movimientos

- **WHEN** se fijan "Tipo = Egreso" y una categoría en Movimientos a 375 px
- **THEN** el badge muestra 2 con el texto accesible "2 filtros activos"

#### Scenario: Sin filtros

- **WHEN** todos los campos están en su valor de defecto
- **THEN** el botón "Filtros" se muestra sin badge

#### Scenario: Período de Reportes cuenta uno

- **WHEN** en Reportes se cambia el período moviendo Desde y Hasta a la vez
- **THEN** el badge cuenta el período como un único filtro activo, más la Billetera si está
  elegida

### Requirement: Aplicación en vivo sin botón "Aplicar"

Cada cambio de campo DEBE (SHALL) aplicar el filtro inmediatamente y volver a consultar los
resultados. NO DEBE (SHALL NOT) existir un botón "Aplicar" ni un estado borrador: plegar el panel
NO DEBE (SHALL NOT) descartar los cambios realizados.

#### Scenario: Cambio que reconsulta

- **WHEN** se cambia cualquier campo del panel (por ejemplo Estado en Deudas)
- **THEN** el listado se actualiza sin ningún paso extra de confirmación

#### Scenario: Filtro aplicado con panel cerrado

- **WHEN** se aplica un filtro y se pliega el panel
- **THEN** la lista sigue filtrada y el badge visible sobre el botón

### Requirement: "Limpiar filtros" dentro del panel

El botón "Limpiar filtros" DEBE (SHALL) quedar dentro del panel junto a los campos, permanecer
deshabilitado cuando no hay ningún filtro activo y, al presionarlo, devolver todos los campos a
su valor de defecto y dejar el badge en cero.

#### Scenario: Deshabilitado sin filtros

- **WHEN** se abre el panel con todos los campos en su valor de defecto
- **THEN** "Limpiar filtros" aparece deshabilitado

#### Scenario: Restablecer todo

- **WHEN** se presiona "Limpiar filtros" con varios filtros aplicados
- **THEN** los campos vuelven a "Todos" o quedan vacíos, el botón queda deshabilitado y el badge
  desaparece

### Requirement: Escritorio sin plegado

Desde 640 px el panel de filtros DEBE (SHALL) estar siempre visible, NO DEBE (SHALL NOT)
mostrarse el botón "Filtros" y la grilla de campos DEBE (SHALL) conservar las columnas y el
comportamiento previos al cambio.

#### Scenario: Ancho de escritorio

- **WHEN** una pantalla con filtros se abre a 1280 px
- **THEN** los campos aparecen directamente en su grilla multicoluna sin botón de plegado

### Requirement: Pantallas con panel plegable

Las barras de filtros de Movimientos, Categorías, Historial de ahorros, Gastos fijos (ambas
secciones), Control de gastos, Deudas, Agentes de deuda y Reportes DEBEN (SHALL) usar el plegado
móvil. Los campos, las consultas y las etiquetas de cada pantalla NO DEBEN (SHALL NOT) cambiar por
esta integración.

#### Scenario: Botón en las ocho pantallas

- **WHEN** cualquiera de esas 8 pantallas se abre a 375 px
- **THEN** muestra su botón "Filtros" con los campos correspondientes dentro del panel y su
  conteo de activos

#### Scenario: Búsqueda de Categorías cuenta en el badge

- **WHEN** se escribe en "Buscar" de la pantalla de Categorías
- **THEN** la búsqueda aplica el filtro en vivo y suma al badge como cualquier otro campo

### Requirement: Campos de filtros con altura táctil

Los campos de las barras de filtros DEBEN (SHALL) medir 44 px de alto en mobile cuando la pantalla
les aplica la convención táctil, y 40 px desde 640 px. El control de selección base NO DEBE (SHALL
NOT) imponer su altura de defecto cuando la pantalla le define una propia, ni cambiar su altura
cuando no la tiene.

#### Scenario: Select con convención táctil

- **WHEN** un select de filtros con altura táctil declarada se renderiza a 375 px
- **THEN** mide 44 px de alto, y 40 px a 1280 px

#### Scenario: Select sin altura propia

- **WHEN** un select no define una altura propia
- **THEN** mide 40 px, igual que antes de este cambio

#### Scenario: Variante pequeña

- **WHEN** un select usa su variante pequeña (formularios y controles compactos)
- **THEN** mantiene 32 px de alto en cualquier ancho
