# Spec Delta: navegacion

## Purpose

Define qué puntos muestra el menú de navegación de la aplicación y en qué orden, tanto
en el sidebar de escritorio como en la barra de navegación horizontal de mobile, y cómo
convive el retiro de un punto del menú con la conservación de su ruta. Aplica a todo
usuario autenticado.

## ADDED Requirements

### Requirement: Contenido y orden del menú de navegación

El menú de la aplicación DEBE (SHALL) mostrar exactamente los puntos Dashboard,
Movimientos, Ahorros, Deudas, Gastos fijos, Categorías, Control de Gastos, Reportes y
Configuración, en ese orden, tanto en el sidebar de escritorio como en la barra
horizontal de mobile. El menú NO DEBE (SHALL NOT) mostrar otras entradas hacia
pantallas internas.

#### Scenario: Sidebar de escritorio

- **WHEN** el usuario autenticado visualiza el sidebar de escritorio
- **THEN** ve los nueve puntos listados, en ese orden, cada uno con su ícono y
  enlazando a su ruta correspondiente

#### Scenario: Barra horizontal en mobile

- **WHEN** el usuario abre la aplicación en un ancho mobile y visualiza la barra de
  navegación horizontal bajo el header
- **THEN** ve los mismos nueve puntos, en el mismo orden, desplazables
  horizontalmente

### Requirement: El punto "Cuentas" no figura en el menú

El menú de navegación NO DEBE (SHALL NOT) incluir una entrada "Cuentas". Su retiro del
menú no modifica los demás puntos ni sus posiciones: "Categorías" sigue inmediatamente
después de "Gastos fijos" y "Control de Gastos" sigue inmediatamente después de
"Categorías".

#### Scenario: Menú sin Cuentas

- **WHEN** se renderiza el menú de navegación en cualquier superficie (sidebar o
  barra mobile)
- **THEN** "Cuentas" no aparece entre los puntos y el orden de los demás no cambia

#### Scenario: Ninguna entrada marcada activa en /accounts

- **WHEN** el usuario se encuentra en `/accounts`
- **THEN** el menú se muestra sin ninguna entrada resaltada como activa

### Requirement: La ruta /accounts se conserva

La ruta protegida `/accounts` y su pantalla "Cuentas" DEBEN (SHALL) seguir existiendo y
ser accesibles por navegación directa (URL o enlaces internos), dentro del layout de la
aplicación, aunque no tengan entrada en el menú. El sistema NO DEBE (SHALL NOT)
redirigir ni devolver "no encontrado" al abrir `/accounts`.

#### Scenario: Acceso directo por URL

- **WHEN** el usuario autenticado escribe `/accounts` en la barra del navegador
- **THEN** se renderiza la página "Cuentas" con el layout normal de la aplicación
  (header y menú sin la entrada "Cuentas")
