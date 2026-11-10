import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CollapsibleFiltersProps {
  /** Cantidad de filtros aplicados; muestra el badge en el botón de mobile. */
  activeCount?: number
  /**
   * Clases de la grilla de campos (columnas, gap, padding, items-end).
   * No incluir utilidades de `display` (grid/hidden): las controla el componente
   * para poder plegar el panel en mobile sin cambiar nada en escritorio.
   */
  gridClassName?: string
  children: ReactNode
}

/**
 * Barra de filtros que en mobile (<640px) nace cerrada como un botón
 * "Filtros" (con badge de cantidad de filtros activos) y se despliega al
 * tocarla. Desde `sm` el panel siempre queda visible, como una Card común.
 * La aplicación de filtros sigue siendo en vivo: este componente solo
 * organiza el espacio en pantallas chicas.
 */
export function CollapsibleFilters({
  activeCount = 0,
  gridClassName,
  children,
}: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()

  return (
    <Card className={cn('gap-0', open ? 'pb-6 pt-4 sm:py-6' : 'py-4 sm:py-6')}>
      <div className={cn('px-4 sm:hidden', open && 'mb-4')}>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls={contentId}
          className="h-11 w-full justify-between px-4"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filtros
          </span>
          <span className="flex items-center gap-2">
            {activeCount > 0 && (
              <span
                className="bg-primary-100 text-primary-800 inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold"
                aria-label={`${activeCount} ${activeCount === 1 ? 'filtro activo' : 'filtros activos'}`}
              >
                {activeCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 transition-transform',
                open && 'rotate-180',
              )}
            />
          </span>
        </Button>
      </div>

      <CardContent
        id={contentId}
        className={cn(gridClassName, open ? 'grid' : 'hidden sm:grid')}
      >
        {children}
      </CardContent>
    </Card>
  )
}
