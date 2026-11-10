import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { Receipt, Search, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDateOnly } from '@/lib/format'
import { deleteDebtSplit, fetchDebtSplits } from '../debts-api'
import type { DebtSplit } from '../types'

const PAGE_SIZE = 20

function payerLabel(split: DebtSplit): string {
  return split.payer === 'ACTOR'
    ? `Pagó ${split.payerDisplayName ?? 'un actor'}`
    : 'Pagaste vos'
}

function itemLines(split: DebtSplit): string[] {
  const lines = split.items.map(
    (item) =>
      `${item.displayName}: ${formatCurrency(item.amount, split.currency)}`,
  )

  lines.unshift(
    `Tu parte: ${formatCurrency(split.userAmount, split.currency)}`,
  )

  return lines
}

interface DebtSplitsTabProps {
  onChanged: () => void
}

export function DebtSplitsTab({ onChanged }: DebtSplitsTabProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deletingSplit, setDeletingSplit] = useState<DebtSplit | null>(null)

  const trimmedSearch = search.trim() || undefined

  const splitsQuery = useQuery({
    queryKey: ['debt-splits', page, trimmedSearch],
    queryFn: () =>
      fetchDebtSplits({ page, limit: PAGE_SIZE, search: trimmedSearch }),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDebtSplit(id),
    onSuccess: () => {
      setDeletingSplit(null)
      onChanged()

      if ((splitsQuery.data?.items.length ?? 0) === 1 && page > 1) {
        setPage((current) => current - 1)
      }
    },
  })

  const splits = splitsQuery.data?.items ?? []
  const meta = splitsQuery.data?.meta

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-3 px-4 sm:px-6">
          <div className="space-y-2">
            <label
              htmlFor="debt-splits-search"
              className="text-sm font-medium"
            >
              Buscar por descripción o código
            </label>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="debt-splits-search"
                type="search"
                placeholder="Ej: asado, DG1"
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-0">
          {splitsQuery.isPending && (
            <div className="space-y-3 p-4" aria-label="Cargando divisiones">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-20 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {splitsQuery.isError && (
            <div className="space-y-3 p-6" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(splitsQuery.error)}
              </p>
              <Button
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                onClick={() => void splitsQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!splitsQuery.isPending &&
            !splitsQuery.isError &&
            splits.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <Receipt className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <p className="font-medium">
                    Todavía no registraste divisiones de gastos
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Usá el botón Agregar para dividir un gasto común y generar
                    las deudas de cada persona.
                  </p>
                </div>
              </div>
            )}

          {!splitsQuery.isPending &&
            !splitsQuery.isError &&
            splits.length > 0 && (
              <>
                <ul className="divide-y">
                  {splits.map((split) => (
                    <li key={split.id} className="space-y-3 p-4 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium break-words">
                            <span className="font-mono text-sm">
                              {split.code}
                            </span>{' '}
                            · {split.note || 'División de gastos'}
                          </p>
                          <p className="text-muted-foreground text-xs break-words">
                            {formatDateOnly(split.operationDate)} ·{' '}
                            {formatCurrency(split.totalAmount, split.currency)}{' '}
                            en total · {payerLabel(split)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {split.debts.length}{' '}
                          {split.debts.length === 1 ? 'deuda' : 'deudas'}
                        </Badge>
                      </div>

                      <ul className="text-muted-foreground space-y-1 text-sm tabular-nums">
                        {itemLines(split).map((line) => (
                          <li key={line} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-11 flex-1 sm:h-10 sm:flex-none"
                          onClick={() => setDeletingSplit(split)}
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
                    {(meta?.total ?? 0) === 1
                      ? 'división'
                      : 'divisiones'}{' '}
                    · Página {meta?.page ?? page} de{' '}
                    {Math.max(meta?.totalPages ?? 1, 1)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-10 sm:flex-none"
                      disabled={page <= 1 || splitsQuery.isFetching}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-10 sm:flex-none"
                      disabled={
                        splitsQuery.isFetching ||
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

      <AlertDialog
        open={Boolean(deletingSplit)}
        onOpenChange={(next) => {
          if (!next) {
            setDeletingSplit(null)
            deleteMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar división de gastos</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las {deletingSplit?.debts.length ?? 0}{' '}
              {deletingSplit?.debts.length === 1 ? 'deuda generada' : 'deudas generadas'}{' '}
              y se restablecerá el dinero descontado del disponible. Esta acción
              no se puede deshacer.
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
                if (deletingSplit) {
                  deleteMutation.mutate(deletingSplit.id)
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
