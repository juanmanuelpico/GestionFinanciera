# header-financiero Specification

## Purpose
Definir cómo se presenta el dinero disponible en el encabezado de la aplicación para que
sea legible de un vistazo sin competir con la navegación ni las acciones de cuenta.

## Requirements

### Requirement: Dinero disponible centrado y destacado

El header SHALL mostrar el dinero disponible (ingresos menos egresos) de la billetera
elegida. El importe SHALL ubicarse en el centro del header, con mayor jerarquía tipográfica
que el resto del encabezado y un tratamiento visual sutilmente destacado.

#### Scenario: Importe visible al cargar

- **WHEN** el usuario autenticado abre la aplicación
- **THEN** el dinero disponible de la billetera elegida aparece centrado en el header con mayor tamaño que el texto secundario

#### Scenario: Actualización al cambiar de billetera

- **WHEN** el usuario cambia la billetera del header
- **THEN** el importe mostrado corresponde al disponible de la nueva billetera

#### Scenario: Sin desborde en mobile

- **WHEN** el header se muestra en un ancho de 320 px
- **THEN** el importe y los controles se acomodan sin generar scroll horizontal

### Requirement: Selector de billetera accesible

El header SHALL mantener el selector de billetera entre las monedas habilitadas, separado
del importe destacado.

#### Scenario: Selector disponible

- **WHEN** el usuario tiene más de una moneda habilitada
- **THEN** puede cambiar la billetera desde el header y el cambio se guarda como preferencia
