# Sistema de diseño — Gestión Financiera

Este documento es la **fuente de verdad visual** del proyecto. Toda pantalla nueva o
modificada del frontend tiene que respetarlo. La carpeta `Template/` fue el insumo
inicial (HTML de ejemplo + configuración de Tailwind) y va a eliminarse: acá queda
registrado todo lo que hace falta para reproducir esos estilos.

Stack: React 19 + Tailwind CSS v4 (configuración CSS-first) + shadcn/ui (`new-york`)
sobre Radix. El HTML de `Template/` está hecho para Flowbite; **no se instala
Flowbite**: se replica el lenguaje visual con los primitivos de shadcn/Radix ya
presentes. Los modales, drawers, tooltips y dropdowns se implementan con `Dialog`,
`AlertDialog`, `Sheet`, `Tooltip` y `DropdownMenu`.

Las clases de los primitivos viven en:

- `frontend/src/index.css` → tokens (colores, tipografía, radios).
- `frontend/src/components/ui/*` → Button, Card, Input, Label.
- `frontend/src/components/layout/*` → shell de la aplicación.

---

## 1. Color

### 1.1 Paleta primaria (50–950)

El color primario es una escala completa de 11 pasos, igual a la del template.
El valor por defecto es **azul** y el usuario puede cambiarlo en runtime.

| Paso | Azul (default) | Ámbar | Esmeralda |
| --- | --- | --- | --- |
| 50 | `#eff6ff` | `#fffbeb` | `#ecfdf5` |
| 100 | `#dbeafe` | `#fef3c7` | `#d1fae5` |
| 200 | `#bfdbfe` | `#fde68a` | `#a7f3d0` |
| 300 | `#93c5fd` | `#fcd34d` | `#6ee7b7` |
| 400 | `#60a5fa` | `#fbbf24` | `#34d399` |
| 500 | `#3b82f6` | `#f59e0b` | `#10b981` |
| 600 | `#2563eb` | `#d97706` | `#059669` |
| 700 | `#1d4ed8` | `#b45309` | `#047857` |
| 800 | `#1e40af` | `#92400e` | `#065f46` |
| 900 | `#1e3a8a` | `#78350f` | `#064e3b` |
| 950 | `#172554` | `#451a03` | `#022c22` |

Uso de la escala:

- `primary-600` / `primary-700` → acciones principales (botón default, links, ícono activo).
  Ámbar usa `primary-700` como `--primary` porque `primary-600` no llega a contraste AA con
  texto blanco.
- `primary-50` / `primary-100` → fondos suaves (ítem activo, badge, hover).
- `primary-300` → anillo de foco en claro; `primary-400` en oscuro.
- `primary-800` / `primary-900` → texto sobre fondos `primary-50`/`primary-100`.

### 1.2 Cambio de color de tema en runtime

El token `primary` se resuelve por variables CSS, así que cambiar de paleta no
requiere recargar ni recompilar:

- El atributo `data-theme-color` se escribe en `<html>`.
- Valores válidos: `blue` (default), `amber`, `emerald`.
- `frontend/index.html` aplica el valor guardado antes del primer render.
- Se cambia desde **Configuración > Vista**; el header ya no ofrece el selector.
- La preferencia se guarda por usuario en el backend
  (`GET`/`PATCH /api/users/me/preferences`) y se cachea en
  `localStorage['finanzas.theme-color']` para evitar el flash inicial.

**Agregar una paleta nueva** (3 pasos, sin dependencias):

1. En `frontend/src/index.css`, agregar `:root[data-theme-color='<id>'] { --primary-50…950 }`.
2. En `frontend/src/features/preferences/theme-colors.ts`, agregar el id a `themeColorIds`
   y su `label`/`swatch` a `themeColorOptions`.
3. Actualizar la tabla de este documento.

Nunca se hardcodea un color primario con clases arbitrarias (`bg-[#2563eb]`): siempre
`bg-primary-*`, `text-primary-*`, `border-primary-*`, `ring-primary-*`.

### 1.3 Neutros y semánticos

Los neutros son la escala `gray` de Tailwind (no se define una escala propia).

| Rol | Claro | Oscuro |
| --- | --- | --- |
| Fondo de página | `bg-background` (blanco) / `bg-muted/40` | `dark:bg-background` |
| Superficie (card, modal, sidebar) | `bg-card` / `bg-white` | `dark:bg-gray-800` / `dark:bg-card` |
| Texto principal | `text-gray-900` / `text-foreground` | `dark:text-white` |
| Texto secundario | `text-gray-500` / `text-muted-foreground` | `dark:text-gray-300` |
| Borde | `border-gray-200` / `border-border` | `dark:border-gray-600` |
| Input de fondo | `bg-gray-50` | `dark:bg-gray-700` |
| Placeholder | `placeholder-gray-400` | `dark:placeholder-gray-400` |
| Peligro / destructivo | `bg-red-600`, hover `bg-red-700` | `dark:bg-red-500`, hover `dark:bg-red-600` |
| Éxito / ingreso | `text-success` (verde emerald, AA sobre blanco) | `text-success` (verde emerald claro) |
| Advertencia (≥80 % de un umbral) | `text-warning` (ámbar/orange, AA sobre blanco) | `text-warning` (ámbar claro) |

Confirmaciones destructivas usan `red`, nunca `primary`. El token shadcn
`destructive` ya está disponible para `Button variant="destructive"`. Para dinero
que suma al disponible (por ejemplo una devolución de ahorro) usá el token
`success`; para dinero que se descuenta, `destructive`. Para estados de
advertencia que no son error (por ejemplo el Control de Gastos al superar el 80 %
del umbral) usá `text-warning` / `border-warning` / `bg-warning/10`; el rojo
`destructive` queda reservado para el exceso real (≥100 %).

### 1.4 Modo oscuro

- Se activa agregando la clase `dark` al elemento `<html>` (`darkMode: 'class'` del template).
- El usuario elige **Claro** u **Oscuro** en **Configuración > Vista** (`ThemeModeSelector`).
- La preferencia se guarda por usuario en `PATCH /api/users/me/preferences` y se
  cachea en `localStorage['finanzas.theme-mode']`; `frontend/index.html` aplica la clase
  antes del primer render para evitar el flash.
- `:root.dark` declara `color-scheme: dark` para que los controles nativos y las
  scrollbars acompañen el tema.
- Toda pantalla nueva debe verse correcta en claro y en oscuro: cada color de
  superficie/texto/borde necesita su variante `dark:`.
- Los tokens de `index.css` ya resuelven `background`, `foreground`, `card`,
  `popover`, `muted`, `border`, `input`, `ring`, `sidebar` en ambos modos.

---

## 2. Tipografía

- Familia: **Inter** (400, 500, 600, 700), cargada desde Google Fonts en `index.html`.
- Fallback: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, …` (token `--font-sans`).
- Etiqueta `--font-body` disponible por compatibilidad con el template.

| Uso | Clases |
| --- | --- |
| Título de página (h1) | `text-2xl font-semibold tracking-tight` |
| Título de card / modal | `text-lg font-semibold text-gray-900 dark:text-white` |
| Texto de cuerpo | `text-sm` (14px) |
| Label de campo | `block mb-2 text-sm font-medium text-gray-900 dark:text-white` |
| Texto auxiliar / metadata | `text-xs text-muted-foreground` |
| Importes y tablas numéricas | agregar `tabular-nums` para alinear dígitos |

Regla: nunca menos de 12px. Los inputs en mobile usan como mínimo `text-base` (16px)
para que iOS no haga zoom automático; el componente `Input` ya lo resuelve con
`text-base md:text-sm`.

---

## 3. Forma, sombra y foco

- Radios: inputs y botones `rounded-lg`; cards y modales `rounded-xl`; badges y
  avatares `rounded-full`. El token `--radius` vale `0.5rem`.
- Sombras: cards `shadow-sm`; modales y dropdowns `shadow`/`shadow-lg`.
- Foco visible en todo control interactivo:
  - Botón: `focus-visible:ring-[3px] focus-visible:ring-ring/50` (ya en `Button`).
  - Input/select/textarea: `focus:ring-primary-500 focus:border-primary-500`
    (o `focus-visible:ring-[3px]` del `Input`).
- Estado inválido: `aria-invalid` + `ring-destructive` (ya soportado por `Input`/`Button`).
- Transiciones cortas (`transition-colors`, `transition-transform`), nunca animaciones
  largas ni movimiento en elementos que se repintan en listas.

Los primitivos ya están ajustados a las métricas del template:
`Button` default `h-10 rounded-lg px-5`, `Input` `h-10 rounded-lg px-3`, `Card` `rounded-xl`.

---

## 4. Estructura de pantalla

Shell actual (`AppLayout`):

- Escritorio: sidebar fija `w-64` + header `h-16` + `main` con `p-4 md:p-8`.
- Mobile: sidebar oculta; el header muestra la marca y una **navegación horizontal con
  scroll** (`overflow-x-auto`) debajo del header. Si una pantalla necesita muchas
  secciones, reemplazar por un drawer (`Sheet`) con el mismo listado de `navItems`.
- Todo contenido de página arranca con `space-y-6` y un encabezado:
  `h1 text-2xl font-semibold tracking-tight` + `p text-muted-foreground`.
- El `body` nunca debe scrollear horizontalmente. Si una tabla no entra, va dentro de
  un contenedor `overflow-x-auto` con `-mx-4 px-4` en mobile (o se convierte en lista de cards).

### Mapeo Flowbite (template) → shadcn/ui

| Template (`Template/*.txt`) | Implementación en el proyecto |
| --- | --- |
| Sidebar con `data-drawer-target` | `Sidebar` fija en `md+`; drawer `Sheet` en mobile cuando se necesite |
| `data-modal-toggle` | `Dialog` + `DialogTrigger` |
| Cartel de confirmación | `AlertDialog` (cancelar = `outline`, confirmar = `destructive`) |
| Inputs / labels / textarea / select | `Input`, `Label`, `Textarea`, `Select` |
| `data-dropdown-toggle` | `DropdownMenu` |
| Tooltip de Flowbite | `Tooltip` |
| Badge (contador del nav) | `Badge` (`bg-primary-100 text-primary-800`) |

Si un primitivo todavía no existe en `components/ui`, se agrega con el CLI de shadcn
manteniendo estos tokens; no se copia HTML de Flowbite con `data-*`.

---

## 5. Patrones de componentes

### 5.1 Formulario dentro de modal (ej. alta de cuenta/movimiento)

- Modal `max-w-2xl` (`Dialog`), `max-h-[90dvh]` con scroll interno en mobile.
- Header: `flex justify-between items-center pb-4 mb-4 border-b`, título `text-lg font-semibold`,
  botón cerrar `p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900`.
- Cuerpo: `grid gap-4 sm:grid-cols-2`; los campos de ancho completo (descripción, notas)
  llevan `sm:col-span-2`.
- Cada campo: `Label` + `Input`/`Select`/`Textarea` con `gap` vertical de `mb-2`.
- Footer: botón principal a la izquierda o alineado al final; en mobile ocupa todo el
  ancho (`w-full sm:w-auto`) y conserva 44px de alto táctil.
- Select: `bg-gray-50` claro / `dark:bg-gray-700`, `rounded-lg`, `p-2.5` → ver `Input`.

### 5.2 Confirmación destructiva

- `max-w-md`, contenido centrado, padding `p-4 sm:p-5`.
- Ícono de papelera `size-11 text-gray-400`, título/descripción breve en `text-gray-500`.
- Dos acciones: cancelar `Button variant="outline"` y confirmar `Button variant="destructive"`
  (`bg-red-600 hover:bg-red-700`). Nunca auto-focus en el botón destructivo.
- El texto de confirmación describe exactamente lo que se va a borrar.

### 5.3 Navegación

- Ítems: `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium`.
- Activo: `bg-sidebar-accent text-sidebar-accent-foreground`
  (= `primary-50` / `primary-800`), inactivo: `text-muted-foreground hover:bg-…`.
- Íconos `lucide-react` de `size-4` (sidebar) o `size-5` (drawer).
- Badge de contador: `inline-flex justify-center items-center size-5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800`.

### 5.4 Estados vacíos, de carga y error

Toda pantalla con datos debe cubrir los tres: esqueleto/`Skeleton` o spinner en carga,
estado vacío con ícono + acción sugerida, y error con mensaje accionable (reintentar).

---

## 6. Mobile (obligatorio)

La app se usa con el celular en la mano: cada pantalla se entrega revisada en 320px,
375px y 414px de ancho, además de escritorio. Reglas:

1. **Mobile-first**: la clase base describe el celular; `sm:`/`md:`/`lg:` agrandan.
   Nunca `max-sm:` para esconder lo que debería adaptarse.
2. **Sin scroll horizontal** del body. `overflow-x-auto` solo en contenedores explícitos
   (tabs, tablas, nav de secciones) y con indicador visible.
3. **Áreas táctiles**: mínimo 44×44 px para acciones principales; 40px aceptable en
   toolbars densas. Botones e inputs ya usan `h-10`.
4. **Separación táctil** de al menos 8px entre controles adyacentes.
5. **Formularios**: una columna; labels siempre visibles (nunca solo placeholder);
   inputs a 16px para evitar zoom en iOS; teclados correctos (`type`, `inputMode`,
   `autoComplete`) y `enterKeyHint` cuando aplique.
6. **Modales en mobile**: casi pantalla completa (`max-h-[90dvh]`), header/footer fijos y
   cuerpo con scroll. Los diálogos no se abren más anchos que el viewport.
7. **Alturas dinámicas**: `dvh` en lugar de `vh` (barra del navegador móvil).
8. **Safe areas**: `pt-[env(safe-area-inset-top)]` / `pb-[env(safe-area-inset-bottom)]`
   para barras fijas y bottom sheets.
9. **Tablas** → cards o `overflow-x-auto` con primera columna sticky; nunca comprimir texto.
10. **Gráficos** con `aspect-*` o altura fija, responsivos; leyendas debajo en mobile.
11. **Nav**: horizontal con scroll y `shrink-0` por ítem, o drawer; nunca ítems cortados.
12. **Textos**: sin `truncate` en datos críticos (importes, nombres de cuenta); usar
    `break-words`/`min-w-0` en flex para evitar desbordes.
13. **Imágenes/íconos**: `max-w-full`, sin anchos fijos mayores al viewport.
14. **Acciones en card**: en mobile, botones a ancho completo o menú de tres puntos.
15. **Toques y hover**: no depender de `hover` para descubrir acciones; los `focus-visible`
    y `active:` tienen que existir también.

Checklist de aceptación mobile: sin overflow horizontal, todo accionable con el pulgar,
sin texto < 12px, sin zoom en inputs, modales usables con teclado abierto, y estados
vacíos/carga/error también adaptados.

---

## 7. Cómo crear una pantalla nueva

1. Leer este documento antes de escribir clases.
2. Usar tokens (`bg-primary-*`, `text-muted-foreground`, `border-border`) y primitivos de
   `components/ui`; no inventar paletas ni HTML de Flowbite.
3. Cubrir claro/oscuro, mobile-first, estados vacío/carga/error.
4. Verificar con `frontend/`:
   `npm run typecheck && npm run lint && npm test && npm run build`.
5. Delegar la revisión mobile al agente `mobile-ui` (ver `AGENTS.md`): es obligatoria en
   toda pantalla nueva o cambio de pantalla, antes de darla por terminada.

---

## 8. Verificación rápida

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

Probar con el servidor levantado (`docker compose up -d`, usando el puerto `WEB_PORT` de `.env`; `5173` por defecto) en
DevTools → modo dispositivo: 320×568, 375×667, 390×844, 414×896 y escritorio 1280+.
