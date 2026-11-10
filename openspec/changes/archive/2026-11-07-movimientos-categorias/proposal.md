# Propuesta: Gestión de Movimientos (Ingresos y Egresos) y Categorías

## Pedido original (textual)

> Especificación de Requerimiento (OpenSpec)
> Módulo: Gestión de Movimientos (Ingresos y Egresos) y Categorías
>
> Objetivo: Implementar el CRUD completo para transacciones financieras y la gestión de categorías asociadas, junto con las modificaciones de interfaz correspondientes.
>
> 1. Modelo de Datos y Base de Datos
> 1.1. Tabla Categoria
> Se debe crear una entidad independiente para clasificar los movimientos.
>
> Atributos:
> id: Identificador único autonumerado (Clave Primaria).
> nombre: Nombre de la categoría (Ej: Comida, Transporte, Salario).
> tipo: Tipo predeterminado opcional (Ingreso / Egreso).
> createdAt / updatedAt: Timestamps de auditoría.
>
> Requerimientos: Implementar un CRUD completo (Backend + Frontend) para la gestión de categorías.
>
> 1.2. Tabla Movimientos
> Entidad principal para el registro de transacciones financieras por usuario.
>
> Clave Primaria Compuesta:
> userId: Identificador del usuario (Parte de la PK compuesta).
> id: Identificador autonumerado por usuario (Parte de la PK compuesta).
>
> Atributos de Auditoría:
> createdAt: Fecha y hora de inserción automática.
> updatedAt: Fecha y hora de última modificación.
>
> Atributos Visibles (Negocio):
> tipo: Tipo de movimiento (INGRESO o EGRESO). (Obligatorio)
> importe: Monto numérico de la transacción. (Obligatorio)
> categoriaId: Clave foránea referenciando a la tabla Categoria. (Obligatorio)
> fechaMovimiento: Fecha y hora en que ocurrió la transacción. (Obligatorio)
> moneda: Código o símbolo de la moneda. (Obligatorio, valor por defecto: "Pesos" / ARS)
> medioPago: Medio de pago utilizado (Ej: Tarjeta de crédito, Efectivo, Transferencia). (Opcional / Nullable)
> observacion: Notas o comentarios adicionales. (Opcional / Nullable)
>
> 2. Interfaz de Usuario (Frontend) y UX
> 2.1. Navegación y Menú
> Renombrar: El punto de menú actual llamado "Transacciones" debe renombrarse a "Movimientos".
> Posicionamiento: Debe ubicarse estrictamente a continuación del punto de menú "Dashboard".
>
> 2.2. Patrón de Interfaz General (Estándar para Módulos)
> Todos los módulos del sistema deben seguir este diseño base:
> Pantalla de Consulta (Listado):
> Vista inicial con filtros de búsqueda correspondientes (por rango de fechas, categoría, tipo, etc.).
> Tabla o grilla con los registros paginados.
> Acción de Creación:
> Un botón principal en la pantalla de consulta para crear un nuevo registro.
> Al hacer clic, debe abrir un formulario flotante tipo Popup (Modal).
>
> 2.3. Especificaciones del Formulario de Movimientos (Popup)
> Valores por defecto:
> El campo fechaMovimiento debe inicializarse por defecto con la fecha y hora actual del sistema.
> El campo moneda debe venir seleccionado por defecto en "Pesos".
>
> Validaciones de campos obligatorios (Bloqueantes al intentar guardar):
> Tipo de movimiento (INGRESO / EGRESO).
> Moneda.
> Fecha y hora del movimiento.
> Importe y Categoría.
>
> 3. Criterios de Aceptación (Acceptance Criteria)
> [ ] Las tablas Categoria y Movimientos están creadas en la base de datos con las restricciones de clave primaria compuesta y tipos especificados.
> [ ] El CRUD de Categoria se encuentra operativo tanto a nivel de API como de interfaz.
> [ ] El menú lateral refleja el cambio de "Transacciones" a "Movimientos" y su ubicación correcta justo después de "Dashboard".
> [ ] La pantalla de "Movimientos" muestra primero el listado con filtros y un botón funcional que despliega el formulario modal de creación.
> [ ] Al abrir el popup de creación de un movimiento, los campos de fecha y moneda se autocompletan correctamente.
> [ ] El backend rechaza la inserción de un movimiento si faltan el tipo, la moneda o la fecha del movimiento.

## Por qué

Registrar ingresos y egresos por usuario, clasificados por categorías, es el núcleo funcional de la aplicación. Sin este módulo no hay datos para el dashboard, presupuestos ni reportes.

## Qué cambia

- Base de datos: tablas `categories` y `movements` (ver `specs/movimientos-categorias/spec.md`).
- Backend: módulos `categories` y `movements` con CRUD y filtros.
- Frontend: pantallas `/categories` y `/movements`, popups de alta/edición y navegación.

## Fuera de alcance

- Cuentas, presupuestos y reportes.
- Conversión entre monedas (ARS, USD y EUR solo se registran).
- Importación o exportación de movimientos.

## Supuestos

- Los nombres de atributos del pedido en español se implementan con los identificadores en inglés del código (regla del proyecto). La equivalencia está en la tabla de `spec.md`.
- `Pesos` se muestra como etiqueta de la moneda `ARS`.
