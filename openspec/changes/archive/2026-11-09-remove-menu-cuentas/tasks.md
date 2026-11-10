# Tareas: remove-menu-cuentas

## 1. Frontend

- [x] 1.1 Eliminar el item `{ to: '/accounts', label: 'Cuentas', icon: Wallet }` del
      array `navItems` en `frontend/src/components/layout/nav-items.ts` y quitar el
      import no usado de `Wallet` (lucide-react).
- [x] 1.2 Verificar que el sidebar de escritorio
      (`frontend/src/components/layout/sidebar.tsx`) y la barra horizontal de mobile
      (`frontend/src/components/layout/app-layout.tsx`) dejan de mostrar "Cuentas" por
      usar ambos `navItems`.
- [x] 1.3 Conservar la ruta `/accounts` y la página `AccountsPage`
      (`frontend/src/app/router.tsx` sin cambios de enrutado).

## 2. Pruebas y validación

- [x] 2.1 Actualizar `frontend/src/components/layout/nav-items.test.ts` con el orden
      esperado de nueve puntos (sin "Cuentas").
- [x] 2.2 `npm test` (94/94), `npm run typecheck` y `npm run lint` sin errores.

## 3. Spec

- [x] 3.1 Delta `specs/navegacion/spec.md` con `## ADDED Requirements`.
- [x] 3.2 Validar con `npx openspec validate remove-menu-cuentas --type change --strict`
      y archivar `/opsx-archive` solo tras aprobación del usuario.
