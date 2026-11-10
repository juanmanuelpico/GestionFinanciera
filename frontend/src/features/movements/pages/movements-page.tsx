import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ArrowLeftRight, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { fetchCategories } from '@/features/categories/categories-api'
import { SpendingAlertBanner } from '@/features/spending-control/components/spending-alert-banner'
import type { SpendingAlert } from '@/features/spending-control/types'
import { getApiErrorMessage } from '@/lib/errors'
import { dateInputToIso, formatCurrency, formatDateTime } from '@/lib/format'
import {
  movementTypeLabels,
  paymentMethodLabels,
  type MovementType,
} from '@/types/finance'
import { MovementFormDialog } from '../components/movement-form-dialog'
import { deleteMovement, fetchMovements } from '../movements-api'
import type { Movement } from '../types'

const PAGE_SIZE = 20

type TypeFilter = 'ALL' | MovementType

function MovementTypeBadge({ type }: { type: MovementType }) {
  return (
    <Badge variant={type === 'INGRESO' ? 'default' : 'destructive'}>
      {movementTypeLabels[type]}
    </Badge>
  )
}

export function MovementsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null)
  const [deletingMovement, setDeletingMovement] = useState<Movement | null>(
    null,
  )
  const [spendingAlert, setSpendingAlert] = useState<SpendingAlert | null>(null)

  const filters = {
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    categoryId: categoryFilter === 'ALL' ? undefined : Number(categoryFilter),
    from: dateInputToIso(from, 'start'),
    to: dateInputToIso(to, 'end'),
  }

  const movementsQuery = useQuery({
    queryKey: ['movements', page, filters],
    queryFn: () => fetchMovements({ page, limit: PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => fetchCategories(),
  })

  const invalidateLists = () => {
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
    void queryClient.invalidateQueries({ queryKey: ['categories'] })
    void queryClient.invalidateQueries({ queryKey: ['savings'] })
    void queryClient.invalidateQueries({ queryKey: ['spending-control'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMovement(id),
    onSuccess: () => {
      setDeletingMovement(null)
      invalidateLists()

      if ((movementsQuery.data?.items.length ?? 0) === 1 && page > 1) {
        setPage((current) => current - 1)
      }
    },
  })

  const movements = movementsQuery.data?.items ?? []
  const meta = movementsQuery.data?.meta
  const categories = categoriesQuery.data ?? []
  const hasFilters =
    Boolean(from) ||
    Boolean(to) ||
    typeFilter !== 'ALL' ||
    categoryFilter !== 'ALL'
  const activeFilterCount =
    (from ? 1 : 0) +
    (to ? 1 : 0) +
    (typeFilter !== 'ALL' ? 1 : 0) +
    (categoryFilter !== 'ALL' ? 1 : 0)

  const openCreate = () => {
    setEditingMovement(null)
    setFormOpen(true)
  }

  const openEdit = (movement: Movement) => {
    setEditingMovement(movement)
    setFormOpen(true)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingMovement(null)
      deleteMutation.reset()
    }
  }

  const updateFilter = (update: () => void) => {
    update()
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-muted-foreground">
            Registrá y consultá todos tus ingresos y egresos.
          </p>
        </div>
        <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={openCreate}>
          <Plus />
          Nuevo movimiento
        </Button>
      </div>

      <SpendingAlertBanner alert={spendingAlert} />

      <CollapsibleFilters
        activeCount={activeFilterCount}
        gridClassName="gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[160px_160px_170px_minmax(0,1fr)_auto] lg:items-end"
      >
        <div className="space-y-2">
          <label htmlFor="movements-from" className="text-sm font-medium">
            Desde
          </label>
          <Input
            id="movements-from"
            type="date"
            value={from}
            onChange={(event) =>
              updateFilter(() => setFrom(event.target.value))
            }
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="movements-to" className="text-sm font-medium">
            Hasta
          </label>
          <Input
            id="movements-to"
            type="date"
            value={to}
            onChange={(event) => updateFilter(() => setTo(event.target.value))}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="movements-type" className="text-sm font-medium">
            Tipo
          </label>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              updateFilter(() => setTypeFilter(value as TypeFilter))
            }
          >
            <SelectTrigger id="movements-type" aria-label="Tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="INGRESO">Ingreso</SelectItem>
              <SelectItem value="EGRESO">Egreso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="movements-category" className="text-sm font-medium">
            Categoría
          </label>
          <Select
            value={categoryFilter}
            onValueChange={(value) =>
              updateFilter(() => setCategoryFilter(value))
            }
          >
            <SelectTrigger id="movements-category" aria-label="Categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="h-11 w-full sm:col-span-2 sm:h-10 lg:col-span-1 lg:w-auto"
          disabled={!hasFilters}
          onClick={() => {
            setFrom('')
            setTo('')
            setTypeFilter('ALL')
            setCategoryFilter('ALL')
            setPage(1)
          }}
        >
          Limpiar filtros
        </Button>
      </CollapsibleFilters>

      <Card className="py-0">
        <CardContent className="p-0">
          {movementsQuery.isPending && (
            <div className="space-y-3 p-4" aria-label="Cargando movimientos">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-14 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {movementsQuery.isError && (
            <div className="space-y-3 p-6" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(movementsQuery.error)}
              </p>
              <Button
                variant="outline"
                onClick={() => void movementsQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!movementsQuery.isPending &&
            !movementsQuery.isError &&
            movements.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <ArrowLeftRight className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasFilters
                      ? 'No encontramos movimientos'
                      : 'Todavía no registraste movimientos'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {hasFilters
                      ? 'Probá con otro rango de fechas, tipo o categoría.'
                      : 'Cargá tu primer ingreso o egreso para comenzar.'}
                  </p>
                </div>
                {!hasFilters && (
                  <Button
                    className="h-11 w-full sm:h-10 sm:w-auto"
                    onClick={openCreate}
                  >
                    <Plus />
                    Nuevo movimiento
                  </Button>
                )}
              </div>
            )}

          {!movementsQuery.isPending &&
            !movementsQuery.isError &&
            movements.length > 0 && (
              <>
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Medio de pago</TableHead>
                        <TableHead>Observación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(movement.movementDate)}
                          </TableCell>
                          <TableCell>
                            <MovementTypeBadge type={movement.type} />
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">
                            {movement.category.name}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                            {formatCurrency(movement.amount, movement.currency)}
                          </TableCell>
                          <TableCell>{movement.currency}</TableCell>
                          <TableCell className="whitespace-normal break-words">
                            {movement.paymentMethod
                              ? paymentMethodLabels[movement.paymentMethod]
                              : '—'}
                          </TableCell>
                          <TableCell className="max-w-60 whitespace-normal break-words">
                            {movement.note ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar movimiento ${movement.id}`}
                                onClick={() => openEdit(movement)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Eliminar movimiento ${movement.id}`}
                                onClick={() => setDeletingMovement(movement)}
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

                <ul className="divide-y lg:hidden">
                  {movements.map((movement) => (
                    <li key={movement.id} className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <MovementTypeBadge type={movement.type} />
                          <p className="font-medium break-words">
                            {movement.category.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDateTime(movement.movementDate)}
                          </p>
                        </div>
                        <p className="ml-auto shrink-0 text-right font-semibold tabular-nums">
                          {formatCurrency(movement.amount, movement.currency)}
                        </p>
                      </div>

                      {(movement.paymentMethod || movement.note) && (
                        <dl className="text-muted-foreground space-y-1 text-sm">
                          {movement.paymentMethod && (
                            <div className="flex gap-2">
                              <dt className="shrink-0 font-medium">Medio:</dt>
                              <dd className="break-words">
                                {paymentMethodLabels[movement.paymentMethod]}
                              </dd>
                            </div>
                          )}
                          {movement.note && (
                            <div className="flex gap-2">
                              <dt className="shrink-0 font-medium">Nota:</dt>
                              <dd className="break-words">{movement.note}</dd>
                            </div>
                          )}
                        </dl>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-11 flex-1"
                          onClick={() => openEdit(movement)}
                        >
                          <Pencil />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 flex-1"
                          onClick={() => setDeletingMovement(movement)}
                        >
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-sm">
                    {meta?.total ?? 0}{' '}
                    {(meta?.total ?? 0) === 1 ? 'movimiento' : 'movimientos'} ·
                    Página {meta?.page ?? page} de{' '}
                    {Math.max(meta?.totalPages ?? 1, 1)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-10 sm:flex-none"
                      disabled={page <= 1 || movementsQuery.isFetching}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-10 sm:flex-none"
                      disabled={
                        movementsQuery.isFetching ||
                        page >= (meta?.totalPages ?? 0)
                      }
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
            )}
        </CardContent>
      </Card>

      <MovementFormDialog
        open={formOpen}
        movement={editingMovement}
        categories={categories}
        onOpenChange={setFormOpen}
        onSaved={(alert) => {
          setSpendingAlert(alert)
          invalidateLists()
        }}
      />

      <AlertDialog
        open={Boolean(deletingMovement)}
        onOpenChange={handleDeleteOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar movimiento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Querés eliminar el movimiento de{' '}
              {deletingMovement?.category.name} por{' '}
              {deletingMovement
                ? formatCurrency(
                    deletingMovement.amount,
                    deletingMovement.currency,
                  )
                : ''}
              ? Esta acción no se puede deshacer.
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
                if (deletingMovement) {
                  deleteMutation.mutate(deletingMovement.id)
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
