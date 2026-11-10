# Diseño: remove-menu-cuentas

Contenido no-delta. El pedido usa nombres en español de la UI; la tabla los mapea a los
identificadores del código. El menú tiene un único paso de datos: `navItems` alimenta
tanto el sidebar de escritorio (`sidebar.tsx`) como la barra horizontal de mobile
(`app-layout.tsx`), por lo que quitar el item del array lo elimina de ambas superficies
sin tocar el enrutado.

## Equivalencias de atributos

| Nombre en español (UI)    | Identificador en código      | Nota                                      |
| ------------------------- | ---------------------------- | ----------------------------------------- |
| Menú (sidebar escritorio) | `Sidebar` → `navItems`       | Visible desde `md:` en adelante           |
| Barra horizontal mobile   | `AppLayout` → `navItems`     | Visible por debajo de `md:`               |
| Cuentas (ruta conservada) | `/accounts` → `AccountsPage` | Placeholder; sin entrada de menú          |
| Dashboard                 | `/` (`end: true`)            | Ruta índice                               |
| Movimientos               | `/movements`                 |                                           |
| Ahorros                   | `/savings`                   |                                           |
| Deudas                    | `/debts`                     |                                           |
| Gastos fijos              | `/fixed-expenses`            |                                           |
| Categorías                | `/categories`                |                                           |
| Control de Gastos         | `/budgets`                   |                                           |
| Reportes                  | `/reports`                   |                                           |
| Configuración             | `/settings`                  |                                           |

## Verificación de cumplimiento

| Escenario esperado | Evidencia |
| ------------------ | --------- |
| Menú sin "Cuentas", 9 puntos en orden | `frontend/src/components/layout/nav-items.ts` (`navItems`) y su test `nav-items.test.ts` (94/94 en verde) |
| `/accounts` sigue accesible | `frontend/src/app/router.tsx` conserva `{ path: 'accounts', element: <AccountsPage /> }` bajo `ProtectedRoute` + `AppLayout` |
| Sidebar y barra mobile comparten la lista | Ambos mapean `navItems` (`sidebar.tsx:15`, `app-layout.tsx:63`) |
