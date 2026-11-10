# Gestión Financiera — Reglas del proyecto

Sistema de gestión financiera: backend NestJS + Prisma + PostgreSQL; frontend React 19 +
Vite + TypeScript + Tailwind CSS v4 + shadcn/ui (new-york) sobre Radix.

## Sistema de diseño del frontend (obligatorio)

- Antes de escribir cualquier clase, estilo o componente de UI, leer
  `docs/ui/design-system.md`. Es la fuente de verdad visual del proyecto: paleta
  `primary-50…950`, tipografía Inter, radios, sombras, foco y patrones de
  formulario/modal, confirmación destructiva y navegación.
- Toda pantalla nueva o modificada usa exclusivamente los tokens del sistema
  (`primary-*`, `muted-foreground`, `border`, `ring`, `card`, `destructive`) y los
  primitivos de `frontend/src/components/ui`. Nunca colores arbitrarios (`bg-[#...]`),
  markup de Flowbite con `data-*`, ni dependencias de UI nuevas sin autorización.
- El color primario se cambia en runtime con el atributo `data-theme-color` en `<html>`
  (`blue` por defecto, `amber`, `emerald`). Para agregar una paleta: bloque en
  `frontend/src/index.css` + `frontend/src/features/preferences/theme-colors.ts` +
  actualizar el documento.
- Toda pantalla debe verse correcta en claro y en oscuro (clase `dark` en `<html>`).
- La carpeta `Template/` es temporal y se va a eliminar: no usarla como referencia en
  runtime. Todo su contenido relevante está registrado en `docs/ui/design-system.md`.

## Revisión mobile

La aplicación se usa desde el celular y desde la PC, así que toda pantalla nueva o
modificada debe verse bien en mobile (anchos de referencia: 320, 375, 390 y 414 px, más
escritorio 1280+). Esa revisión la hace el agente principal como parte de su trabajo
normal; **no** se invoca al agente `mobile-ui` de forma automática.

El agente `mobile-ui` se usa únicamente cuando el usuario lo pide explícitamente.

## Especificaciones (obligatorio)

Toda funcionalidad nueva o cambio de comportamiento de una funcionalidad existente
requiere una especificación en OpenSpec antes de reportar la tarea como terminada. Esto
aplica a backend, frontend o ambos.

- La spec se escribe como delta dentro de `openspec/changes/<cambio>/specs/<capability>/spec.md`,
  junto con `proposal.md` y `tasks.md`. Nunca escribir directo en `openspec/specs/`.
- `openspec/specs/` es la fuente de verdad de lo **aprobado**: solo se actualiza al
  archivar un cambio aprobado (`/opsx-archive`).
- Delegar al agente `spec-keeper` con el pedido, la lista de archivos tocados y las
  capabilities afectadas (si se conocen).
- El agente crea o actualiza el delta spec y valida con
  `npx openspec validate <cambio> --type change --strict`.
- No dar la tarea por completa si quedan requisitos sin especificar, si falta la
  aprobación del usuario o si la validación falla.
- Los cambios grandes o que requieren diseño previo siguen usando el flujo OpenSpec
  (`/opsx-propose`, `/opsx-apply`, `/opsx-archive`).

## Comandos

Desde `frontend/`: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`,
`npm run build`.

Backend y Docker: ver `README.md`.

## Convenciones

- Documentación, UI y mensajes al usuario en español; identificadores de código en inglés.
- No crear más UI que la pedida: los casos de uso y los diseños los aporta el usuario.
- No commitear sin pedido explícito.
