# Propuesta: remove-menu-cuentas

## Por qué

El menú de navegación de la aplicación incluye un punto "Cuentas" que enlaza a una
pantalla aún en construcción (placeholder). Aparecer en el menú sugiere una
funcionalidad disponible que el usuario todavía no puede usar, y ocupa espacio en
la barra horizontal de mobile.

## Qué cambia

- Se elimina la entrada "Cuentas" del menú de navegación. El paso único `navItems`
  alimenta tanto el sidebar de escritorio como la barra de navegación horizontal de
  mobile, así que la entrada desaparece de ambas superficies.
- El menú queda con exactamente nueve puntos, en este orden: Dashboard, Movimientos,
  Ahorros, Deudas, Gastos fijos, Categorías, Control de Gastos, Reportes,
  Configuración.
- **No cambia** el enrutado: la ruta `/accounts` y la página "Cuentas" se conservan y
  siguen siendo accesibles escribiendo la URL directamente. No se tocó backend ni
  páginas.

## Capabilities afectadas

- `navegacion` (nueva): describe el contenido y orden del menú de la aplicación y la
  accesibilidad directa de `/accounts` sin entrada de menú. No existe spec aprobada de
  navegación; `header-financiero` solo cubre el encabezado (disponible y selector de
  billetera), no el menú, por lo que el delta se registra como `## ADDED Requirements`
  en una capability nueva.

## Out of scope

- Eliminar o redirigir la ruta `/accounts` o su página.
- Cambiar el orden o las etiquetas de los demás puntos del menú.
- Ningún cambio en backend.
