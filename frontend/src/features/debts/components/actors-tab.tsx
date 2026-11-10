import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Pencil, Search, Trash2, Users } from 'lucide-react'
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
import type { Currency } from '@/types/finance'
import { getApiErrorMessage } from '@/lib/errors'
import { deleteDebtActor, fetchDebtActors } from '../debts-api'
import {
  debtActorTypeLabels,
  type DebtActor,
  type DebtActorType,
} from '../types'
import { ActorFormDialog } from './actor-form-dialog'

const PAGE_SIZE = 20

type TypeFilter = 'ALL' | DebtActorType

function actorDetails(actor: DebtActor): string {
  if (actor.type === 'PERSONA') {
    return [actor.phone, actor.email].filter(Boolean).join(' · ') || '—'
  }

  const parts = [
    actor.brand,
    actor.lastFour ? `•••• ${actor.lastFour}` : null,
    actor.closingDay && actor.paymentDueDay
      ? `Cierre día ${actor.closingDay} · Vence día ${actor.paymentDueDay}`
      : null,
    actor.defaultWalletCurrency
      ? `Billetera ${actor.defaultWalletCurrency}`
      : null,
  ].filter(Boolean)

  return parts.join(' · ') || '—'
}

interface ActorsTabProps {
  enabledCurrencies: Currency[]
}

export function ActorsTab({ enabledCurrencies }: ActorsTabProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [editingActor, setEditingActor] = useState<DebtActor | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deletingActor, setDeletingActor] = useState<DebtActor | null>(null)

  const filters = {
    search: search.trim() || undefined,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
  }

  const actorsQuery = useQuery({
    queryKey: ['debt-actors', page, filters],
    queryFn: () => fetchDebtActors({ page, limit: PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  })

  const invalidateActors = () => {
    void queryClient.invalidateQueries({ queryKey: ['debt-actors'] })
    void queryClient.invalidateQueries({ queryKey: ['debts'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDebtActor(id),
    onSuccess: () => {
      setDeletingActor(null)
      invalidateActors()

      if ((actorsQuery.data?.items.length ?? 0) === 1 && page > 1) {
        setPage((current) => current - 1)
      }
    },
  })

  const actors = actorsQuery.data?.items ?? []
  const meta = actorsQuery.data?.meta
  const hasFilters = Boolean(search.trim()) || typeFilter !== 'ALL'
  const activeFilterCount =
    (search.trim() ? 1 : 0) + (typeFilter !== 'ALL' ? 1 : 0)

  const openEdit = (actor: DebtActor) => {
    setEditingActor(actor)
    setFormOpen(true)
  }

  const updateFilter = (update: () => void) => {
    update()
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <CollapsibleFilters
        activeCount={activeFilterCount}
        gridClassName="gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end sm:px-6"
      >
        <div className="space-y-2">
          <label htmlFor="actors-search" className="text-sm font-medium">
            Buscar
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="actors-search"
              type="search"
              placeholder="Nombre, alias o banco"
              className="pl-9"
              value={search}
              onChange={(event) =>
                updateFilter(() => setSearch(event.target.value))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="actors-type" className="text-sm font-medium">
            Tipo
          </label>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              updateFilter(() => setTypeFilter(value as TypeFilter))
            }
          >
            <SelectTrigger
              id="actors-type"
              aria-label="Tipo de actor"
              className="h-11 sm:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PERSONA">Persona</SelectItem>
              <SelectItem value="TARJETA">Tarjeta</SelectItem>
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
            setPage(1)
          }}
        >
          Limpiar filtros
        </Button>
      </CollapsibleFilters>

      <Card className="py-0">
        <CardContent className="p-0">
          {actorsQuery.isPending && (
            <div className="space-y-3 p-4" aria-label="Cargando actores">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-14 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {actorsQuery.isError && (
            <div className="space-y-3 p-6" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(actorsQuery.error)}
              </p>
              <Button
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                onClick={() => void actorsQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!actorsQuery.isPending &&
            !actorsQuery.isError &&
            actors.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <Users className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasFilters
                      ? 'No encontramos actores'
                      : 'Todavía no registraste actores'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {hasFilters
                      ? 'Probá con otro nombre o tipo.'
                      : 'Las personas y tarjetas se usan para crear deudas.'}
                  </p>
                </div>
              </div>
            )}

          {!actorsQuery.isPending &&
            !actorsQuery.isError &&
            actors.length > 0 && (
              <>
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre o alias</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Datos</TableHead>
                        <TableHead className="text-right">Deudas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actors.map((actor) => (
                        <TableRow key={actor.id}>
                          <TableCell className="max-w-48 whitespace-normal break-words font-medium">
                            {actor.displayName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                actor.type === 'TARJETA'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {debtActorTypeLabels[actor.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-80 whitespace-normal break-words">
                            {actorDetails(actor)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {actor.debtCount}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 sm:size-9"
                                aria-label={`Editar ${actor.displayName}`}
                                onClick={() => openEdit(actor)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 sm:size-9"
                                aria-label={`Eliminar ${actor.displayName}`}
                                onClick={() => setDeletingActor(actor)}
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
                  {actors.map((actor) => (
                    <li key={actor.id} className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium break-words">
                            {actor.displayName}
                          </p>
                          <p className="text-muted-foreground text-xs break-words">
                            {actorDetails(actor)}
                          </p>
                          <p className="text-muted-foreground text-xs tabular-nums">
                            {actor.debtCount}{' '}
                            {actor.debtCount === 1 ? 'deuda' : 'deudas'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            actor.type === 'TARJETA' ? 'secondary' : 'outline'
                          }
                        >
                          {debtActorTypeLabels[actor.type]}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-11 flex-1"
                          onClick={() => openEdit(actor)}
                        >
                          <Pencil />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 flex-1"
                          onClick={() => setDeletingActor(actor)}
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
                    {(meta?.total ?? 0) === 1 ? 'actor' : 'actores'} · Página{' '}
                    {meta?.page ?? page} de {Math.max(meta?.totalPages ?? 1, 1)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-10 sm:flex-none"
                      disabled={page <= 1 || actorsQuery.isFetching}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-10 sm:flex-none"
                      disabled={
                        actorsQuery.isFetching ||
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

      <ActorFormDialog
        open={formOpen}
        actor={editingActor}
        enabledCurrencies={enabledCurrencies}
        onOpenChange={setFormOpen}
        onSaved={invalidateActors}
      />

      <AlertDialog
        open={Boolean(deletingActor)}
        onOpenChange={(next) => {
          if (!next) {
            setDeletingActor(null)
            deleteMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar actor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Querés eliminar a {deletingActor?.displayName}? Solo podés
              hacerlo si no tiene deudas asociadas. Esta acción no se puede
              deshacer.
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
                if (deletingActor) {
                  deleteMutation.mutate(deletingActor.id)
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
