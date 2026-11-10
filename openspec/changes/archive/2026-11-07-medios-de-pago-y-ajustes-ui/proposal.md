# Propuesta: Medios de pago y ajustes de interfaz

## Por qué

El medio de pago se escribe hoy como texto libre, lo que produce valores inconsistentes
y dificulta filtrar o reportar. Además, la pantalla de Ahorros y el header tienen
acciones y jerarquías visuales mejorables: el alta de ahorro está lejos del resumen, el
subtítulo de resumen es redundante y el dinero disponible no tiene la jerarquía que el
usuario espera ver de un vistazo.

## Pedido original (textual)

> Ajustes a realizar:
> Modulo Movimientos:
> En el formulario el medio de pago debe ser un combobox de valores "Harcodeados" para eso
> crear un enum con los medios de pago tradicionales y crear una nueva secciòn en
> configuracion con un checkbox para habilitar los medios de pago a utilizar.
>
> En el modulo de ahorro, quitar el boton de "Nuevo Ahorro" y agregar la acción de agregar
> ahorro dentro del div que esta por debajo del subtitulo "Resumen por moneda" y quitar
> dicho subtitulo.
>
> Ademas en el formulario que agrega el ahorro, el campo en donde se indica la cotizacion
> manual debe llamarse unicamente "Cotizacion".
>
> La información del dinero disponible colocarla en el centro del header mas grande y de
> forma sutilmente llamativa

## Qué cambia

- **Medios de pago:** catálogo fijo en base de datos (Efectivo, Débito, Crédito,
  Transferencia, Mercado Pago, Otro). `Movement.paymentMethod` pasa de texto libre a
  enum. Migración con mapeo de los valores existentes.
- **Movimientos:** el formulario muestra el medio de pago como combobox, limitado a los
  medios que el usuario habilitó.
- **Configuración:** nueva sección "Medios de pago" con un checkbox por medio, y
  preferencia persistida por usuario (`enabledPaymentMethods`). Se mantiene al menos uno
  habilitado.
- **Ahorros:** se elimina el botón "Nuevo ahorro" del encabezado y el subtítulo "Resumen
  por moneda"; la acción "Agregar ahorro" vive dentro del bloque de resumen.
- **Ahorros:** el campo de cotización manual se rotula "Cotización".
- **Header:** el dinero disponible se muestra centrado, con mayor tamaño y un tratamiento
  visual sutilmente destacado; el selector de billetera sigue accesible.

## Capacidades

### Capacidades nuevas

- `medios-de-pago`: catálogo fijo, combobox en movimientos y habilitación por usuario.
- `header-financiero`: jerarquía y ubicación del dinero disponible en el header.
- `experiencia-ahorros`: affordances de alta y etiquetado del formulario de ahorro.

### Capacidades modificadas

Ninguna: las capacidades previas (`movimientos-categorias`, `ahorros-y-disponible`) siguen
en cambios no archivados y sus specs principales todavía no existen en `openspec/specs/`.

## Fuera de alcance

- Medios de pago personalizados o editables por el usuario.
- Filtros o reportes por medio de pago.
- Cambios en las reglas de cálculo de ahorros o de conversión.
- Rediseño general del header más allá de la jerarquía del disponible.

## Supuestos

- "Medios de pago tradicionales" = Efectivo, Débito, Crédito, Transferencia, Mercado Pago
  y Otro.
- Todos los medios quedan habilitados por defecto para no romper usuarias existentes.
- Un movimiento existente cuyo medio se deshabilite después se conserva y sigue siendo
  editable sin perder su valor.
