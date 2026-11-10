---
name: mobile-ui
description: Audita y adapta pantallas del frontend de Gestión Financiera para que funcionen correctamente en mobile (responsivo, touch targets, overflow, modales, tablas, safe areas). Úsala en cada pantalla nueva o cambio de pantalla.
---

# Mobile UI — Gestión Financiera

Skill de referencia del agente `mobile-ui`. Se usa en **toda pantalla nueva o cambio de
pantalla** del frontend, antes de darla por terminada.

## Antes de empezar

1. Leer `docs/ui/design-system.md` (secciones 1–6). Es la fuente de verdad visual.
2. Leer los archivos de pantalla que se van a adaptar y los primitivos compartidos que
   usan (`frontend/src/components/ui/*`, `frontend/src/components/layout/*`).
3. Si no está claro qué pantalla/archivos tocar, pedirlos. Nunca adivinar ni reescribir
   pantallas no relacionadas.

## Contexto del proyecto

- React 19 + Tailwind CSS v4 + shadcn/ui (new-york) sobre Radix, Vite, Vitest.
- Tokens en `frontend/src/index.css`: `primary-50…950` (azul por defecto, cambiable con
  `data-theme-color`), `muted`, `border`, `ring`, `card`, `sidebar`, `destructive`.
- Primitivos ya adaptados: `Button` (`h-10 rounded-lg`), `Input` (`h-10 rounded-lg`,
  `text-base md:text-sm`), `Card` (`rounded-xl`), `Label`.
- Shell: `AppLayout` con sidebar fija en `md+` y navegación horizontal con scroll en
  mobile; `main` con `p-4 md:p-8`.

## Workflow

1. **Inventario**: listar los elementos de la pantalla (header, acciones, formulario,
   listado/tabla, cards, modal, estados vacío/carga/error).
2. **Auditar en mobile-first** a 320, 375, 390 y 414 px y luego escritorio:
   - overflow horizontal del body;
   - áreas táctiles (44×44 mínimo, 8px de separación);
   - formularios en una columna, labels visibles, inputs a 16px, teclados correctos;
   - modales/diálogos con `max-h-[90dvh]` y scroll interno;
   - `dvh` en lugar de `vh`, safe areas en barras fijas y bottom sheets;
   - tablas → cards o `overflow-x-auto` con primera columna sticky;
   - nav/tabs con scroll sin cortes;
   - gráficos y media responsivos;
   - textos críticos sin `truncate`, con `break-words`/`min-w-0`;
   - acciones descubribles sin `hover`, con `active:` y `focus-visible:`;
   - estados vacío/carga/error también adaptados.
3. **Corregir** con clases responsivas de Tailwind. Base = celular; `sm:`/`md:`/`lg:`
   agrandan. Nunca `max-sm:` para esconder lo que debe adaptarse.
4. **Verificar** en `frontend/`: `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run build`. Reportar el resultado observado de cada uno.
5. **Reportar**: archivos tocados, qué se corrigió por breakpoint, riesgos o pendientes.

## Reglas

- Usar tokens y primitivos del proyecto. Prohibido inventar colores, tipografías,
  escalas de espaciado o copiar markup de Flowbite con `data-*`.
- No agregar dependencias. No reescribir el layout de escritorio. No renombrar
  componentes, rutas, props ni lógica de negocio. No tocar backend.
- Preferir clases responsivas antes que componentes nuevos; si hace falta uno, chico,
  colocado junto a la pantalla y consistente con el sistema.
- No depender del mouse: todo debe poder usarse con el pulgar.
- Si un defecto viene de un primitivo compartido, el cambio debe ser aditivo y explicado.

## Checklist de aceptación

- [ ] Sin scroll horizontal del body en 320px.
- [ ] Todo accionable con el pulgar (≥44px o 40px en toolbars densas).
- [ ] Sin texto menor a 12px; inputs a 16px en mobile.
- [ ] Modales usables con el teclado abierto.
- [ ] Claro y oscuro correctos.
- [ ] Estados vacío, carga y error adaptados.
- [ ] `typecheck`, `lint`, `test` y `build` en verde (o falla preexistente reportada).
