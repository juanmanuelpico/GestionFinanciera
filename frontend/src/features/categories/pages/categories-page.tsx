import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CollapsibleFilters } from '@/components/ui/collapsible-filters'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import { movementTypeLabels, type MovementType } from '@/types/finance'
import { deleteCategory, fetchCategories } from '../categories-api'
import { CategoryFormDialog } from '../components/category-form-dialog'
import type { Category } from '../types'

type TypeFilter = 'ALL' | MovementType

function CategoryTypeBadge({ type }: { type: MovementType | null }) {
  if (!type) {
    return <Badge variant="outline">Sin tipo</Badge>
  }

  return (
    <Badge variant={type === 'INGRESO' ? 'default' : 'destructive'}>
      {movementTypeLabels[type]}
    </Badge>
  )
}

function thresholdLabel(category: Category): string {
  if (!category.thresholdAmount) {
    return 'Sin umbral'
  }

  return `${formatCurrency(category.thresholdAmount, category.thresholdCurrency ?? 'ARS')} / mes`
}

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  )

  const filters = {
    search: search.trim() || undefined,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
  }

  const categoriesQuery = useQuery({
    queryKey: ['categories', filters],
    queryFn: () => fetchCategories(filters),
  })

  const invalidateLists = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] })
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      setDeletingCategory(null)
      invalidateLists()
    },
  })

  const categories = categoriesQuery.data ?? []
  const hasFilters = Boolean(search.trim()) || typeFilter !== 'ALL'
  const activeFilterCount =
    (search.trim() ? 1 : 0) + (typeFilter !== 'ALL' ? 1 : 0)

  const openCreate = () => {
    setEditingCategory(null)
    setFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingCategory(null)
      deleteMutation.reset()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground">
            Organizá tus ingresos y egresos por categorías.
          </p>
        </div>
        <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={openCreate}>
          <Plus />
          Nueva categoría
        </Button>
      </div>

      <CollapsibleFilters
        activeCount={activeFilterCount}
        gridClassName="gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end sm:px-6"
      >
        <div className="space-y-2">
          <label htmlFor="categories-search" className="text-sm font-medium">
            Buscar
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="categories-search"
              type="search"
              placeholder="Nombre de la categoría"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="categories-type" className="text-sm font-medium">
            Tipo
          </label>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger id="categories-type" aria-label="Tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="INGRESO">Ingreso</SelectItem>
              <SelectItem value="EGRESO">Egreso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="h-11 w-full sm:h-10 sm:w-auto"
          disabled={!hasFilters}
          onClick={() => {
            setSearch('')
            setTypeFilter('ALL')
          }}
        >
          Limpiar filtros
        </Button>
      </CollapsibleFilters>

      <Card className="py-0">
        <CardContent className="p-0">
          {categoriesQuery.isPending && (
            <div className="space-y-3 p-4" aria-label="Cargando categorías">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-12 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {categoriesQuery.isError && (
            <div className="space-y-3 p-6" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(categoriesQuery.error)}
              </p>
              <Button
                variant="outline"
                onClick={() => void categoriesQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!categoriesQuery.isPending &&
            !categoriesQuery.isError &&
            categories.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <Tags className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasFilters
                      ? 'No encontramos categorías'
                      : 'Todavía no tenés categorías'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {hasFilters
                      ? 'Probá con otro nombre o tipo.'
                      : 'Creá una categoría para clasificar tus movimientos.'}
                  </p>
                </div>
                {!hasFilters && (
                  <Button
                    className="h-11 w-full sm:h-10 sm:w-auto"
                    onClick={openCreate}
                  >
                    <Plus />
                    Crear categoría
                  </Button>
                )}
              </div>
            )}

          {!categoriesQuery.isPending &&
            !categoriesQuery.isError &&
            categories.length > 0 && (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Umbral</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium whitespace-normal break-words">
                            {category.name}
                          </TableCell>
                          <TableCell>
                            <CategoryTypeBadge type={category.type} />
                          </TableCell>
                          <TableCell
                            className={
                              category.thresholdAmount
                                ? 'text-warning font-medium whitespace-nowrap'
                                : 'text-muted-foreground'
                            }
                          >
                            {thresholdLabel(category)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar ${category.name}`}
                                onClick={() => openEdit(category)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Eliminar ${category.name}`}
                                onClick={() => setDeletingCategory(category)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <ul className="divide-y md:hidden">
                  {categories.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-start justify-between gap-3 p-4"
                    >
                      <div className="min-w-0 space-y-2">
                        <p className="font-medium break-words">
                          {category.name}
                        </p>
                        <CategoryTypeBadge type={category.type} />
                        <p
                          className={
                            category.thresholdAmount
                              ? 'text-warning text-sm font-medium break-words'
                              : 'text-muted-foreground text-sm'
                          }
                        >
                          {thresholdLabel(category)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-11"
                          aria-label={`Editar ${category.name}`}
                          onClick={() => openEdit(category)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-11"
                          aria-label={`Eliminar ${category.name}`}
                          onClick={() => setDeletingCategory(category)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={formOpen}
        category={editingCategory}
        onOpenChange={setFormOpen}
        onSaved={invalidateLists}
      />

      <AlertDialog
        open={Boolean(deletingCategory)}
        onOpenChange={handleDeleteOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Querés eliminar «{deletingCategory?.name}»? Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteMutation.isError && (
            <p className="text-destructive text-sm break-words" role="alert">
              {getApiErrorMessage(deleteMutation.error)}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-11 w-full sm:h-10 sm:w-auto"
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11 w-full sm:h-10 sm:w-auto"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (deletingCategory) {
                  deleteMutation.mutate(deletingCategory.id)
                }
              }}
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
