import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ChevronRight, Search, Undo2, Wallet } from 'lucide-react'
import { useState } from 'react'
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
import { currencyOptions } from '@/types/finance'
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency, formatDateOnly } from '@/lib/format'
import { fetchDebts } from '../debts-api'
import {
  debtStatusLabels,
  type Debt,
  type DebtKind,
  type DebtStatus,
} from '../types'
import { DebtPaymentDialog } from './debt-payment-dialog'
import { DebtReversalDialog } from './debt-reversal-dialog'
import { DebtViewDialog } from './debt-view-dialog'
import { SpendingAlertBanner } from '@/features/spending-control/components/spending-alert-banner'
import type { SpendingAlert } from '@/features/spending-control/types'

const PAGE_SIZE = 20

type StatusFilter = 'ALL' | DebtStatus
type ActorTypeFilter = 'ALL' | 'PERSONA' | 'TARJETA'

interface DebtsTabProps {
  kind: DebtKind
  enabledCurrencies: Currency[]
  onGoToActors: () => void
}

function DebtStatusBadge({
  debt,
  isThirdParty,
}: {
  debt: Debt
  isThirdParty: boolean
}) {
  if (debt.status === 'ACTIVA' && debt.paymentProgress === 'PARTIAL') {
    return (
      <Badge variant="secondary">
        {isThirdParty ? 'Parcialmente cobrada' : 'Parcialmente pagada'}
      </Badge>
    )
  }

  return (
    <Badge variant={debt.status === 'ACTIVA' ? 'default' : 'outline'}>
      {debtStatusLabels[debt.status]}
    </Badge>
  )
}

function actorLine(debt: Debt): string {
  if (debt.actor.type === 'TARJETA') {
    const parts = [
      debt.actor.brand,
      debt.actor.lastFour ? `•••• ${debt.actor.lastFour}` : null,
    ].filter(Boolean)
    return parts.join(' ')
  }

  return ''
}

export function DebtsTab({
  kind,
  enabledCurrencies,
  onGoToActors,
}: DebtsTabProps) {
  const queryClient = useQueryClient()
  const isThirdParty = kind === 'TERCERO'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [description, setDescription] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [currencyFilter, setCurrencyFilter] = useState('ALL')
  const [actorTypeFilter, setActorTypeFilter] = useState<ActorTypeFilter>('ALL')

  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null)
  const [reversalDebt, setReversalDebt] = useState<Debt | null>(null)
  const [viewDebt, setViewDebt] = useState<Debt | null>(null)
  const [spendingAlert, setSpendingAlert] = useState<SpendingAlert | null>(null)

  const filters = {
    search: search.trim() || undefined,
    description: description.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    currency: currencyFilter === 'ALL' ? undefined : currencyFilter,
    actorType:
      kind === 'PROPIA' && actorTypeFilter !== 'ALL'
        ? actorTypeFilter
        : undefined,
  }

  const debtsQuery = useQuery({
    queryKey: ['debts', kind, page, filters],
    queryFn: () => fetchDebts({ kind, page, limit: PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  })

  const hasFilters =
    Boolean(search.trim()) ||
    Boolean(description.trim()) ||
    statusFilter !== 'ALL' ||
    currencyFilter !== 'ALL' ||
    (kind === 'PROPIA' && actorTypeFilter !== 'ALL')
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (description.trim() ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (currencyFilter !== 'ALL' ? 1 : 0) +
    (kind === 'PROPIA' && actorTypeFilter !== 'ALL' ? 1 : 0)

  const invalidateDebts = () => {
    void queryClient.invalidateQueries({ queryKey: ['debts'] })
    void queryClient.invalidateQueries({ queryKey: ['debt-actors'] })
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
    void queryClient.invalidateQueries({ queryKey: ['savings'] })
    void queryClient.invalidateQueries({ queryKey: ['spending-control'] })
  }

  const updateFilter = (update: () => void) => {
    update()
    setPage(1)
  }

  const debts = debtsQuery.data?.items ?? []
  const meta = debtsQuery.data?.meta

  const actionLabel = isThirdParty ? 'Cobrar' : 'Pagar'

  return (
    <div className="space-y-6">
      <SpendingAlertBanner alert={spendingAlert} />

      <CollapsibleFilters
        activeCount={activeFilterCount}
        gridClassName="gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px_150px_auto] lg:items-end"
      >
        <div className="space-y-2">
          <label
            htmlFor={`debts-${kind}-search`}
            className="text-sm font-medium"
          >
            Buscar
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id={`debts-${kind}-search`}
              type="search"
              placeholder={
                isThirdParty ? 'Nombre de la persona' : 'Persona o tarjeta'
              }
              className="pl-9"
              value={search}
              onChange={(event) =>
                updateFilter(() => setSearch(event.target.value))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`debts-${kind}-description`}
            className="text-sm font-medium"
          >
            Descripción
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id={`debts-${kind}-description`}
              type="search"
              placeholder="Buscar por descripción"
              className="pl-9"
              value={description}
              onChange={(event) =>
                updateFilter(() => setDescription(event.target.value))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`debts-${kind}-status`}
            className="text-sm font-medium"
          >
            Estado
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              updateFilter(() => setStatusFilter(value as StatusFilter))
            }
          >
            <SelectTrigger
              id={`debts-${kind}-status`}
              aria-label="Estado"
              className="h-11 sm:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVA">Activa</SelectItem>
              <SelectItem value="FINALIZADA">Finalizada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`debts-${kind}-currency`}
            className="text-sm font-medium"
          >
            Billetera
          </label>
          <Select
            value={currencyFilter}
            onValueChange={(value) =>
              updateFilter(() => setCurrencyFilter(value))
            }
          >
            <SelectTrigger
              id={`debts-${kind}-currency`}
              aria-label="Billetera"
              className="h-11 sm:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {currencyOptions
                .filter((option) => enabledCurrencies.includes(option.value))
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {kind === 'PROPIA' ? (
          <div className="space-y-2">
            <label
              htmlFor={`debts-${kind}-actor-type`}
              className="text-sm font-medium"
            >
              Origen
            </label>
            <Select
              value={actorTypeFilter}
              onValueChange={(value) =>
                updateFilter(() => setActorTypeFilter(value as ActorTypeFilter))
              }
            >
              <SelectTrigger
                id={`debts-${kind}-actor-type`}
                aria-label="Origen"
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
        ) : (
          <div aria-hidden="true" className="hidden lg:block" />
        )}

        <Button
          variant="outline"
          className="h-11 w-full sm:col-span-2 sm:h-10 lg:col-span-1 lg:w-auto"
          disabled={!hasFilters}
          onClick={() => {
            setSearch('')
            setDescription('')
            setStatusFilter('ALL')
            setCurrencyFilter('ALL')
            setActorTypeFilter('ALL')
            setPage(1)
          }}
        >
          Limpiar filtros
        </Button>
      </CollapsibleFilters>

      <Card className="py-0">
        <CardContent className="p-0">
          {debtsQuery.isPending && (
            <div className="space-y-3 p-4" aria-label="Cargando deudas">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-14 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {debtsQuery.isError && (
            <div className="space-y-3 p-6" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(debtsQuery.error)}
              </p>
              <Button
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                onClick={() => void debtsQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!debtsQuery.isPending &&
            !debtsQuery.isError &&
            debts.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <Wallet className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasFilters
                      ? 'No encontramos deudas'
                      : isThirdParty
                        ? 'Todavía no prestaste dinero'
                        : 'Todavía no registraste deudas propias'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {hasFilters
                      ? 'Probá con otros filtros.'
                      : isThirdParty
                        ? 'Agregá una deuda de tercero para registrar un préstamo.'
                        : 'Agregá una deuda propia o creá una tarjeta en Actores.'}
                  </p>
                </div>
                {!hasFilters && !isThirdParty && (
                  <Button
                    variant="outline"
                    className="h-11 w-full sm:h-10 sm:w-auto"
                    onClick={onGoToActors}
                  >
                    Ir a Actores
                  </Button>
                )}
              </div>
            )}

          {!debtsQuery.isPending && !debtsQuery.isError && debts.length > 0 && (
            <>
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Cuotas</TableHead>
                      <TableHead className="text-right">Restante</TableHead>
                      <TableHead>
                        Próximo {isThirdParty ? 'cobro' : 'vencimiento'}
                      </TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debts.map((debt) => (
                      <TableRow
                        key={debt.id}
                        className="cursor-pointer"
                        title="Ver deuda"
                        onClick={() => setViewDebt(debt)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <span className="font-mono text-sm">{debt.code}</span>
                        </TableCell>
                        <TableCell className="max-w-40 whitespace-normal break-words">
                          <span className="font-medium">
                            {debt.actor.displayName}
                          </span>
                          {actorLine(debt) && (
                            <span className="text-muted-foreground block text-xs">
                              {actorLine(debt)} · {debt.currency}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-52 whitespace-normal break-words">
                          {debt.note || (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {debt.splitCode && (
                            <span className="text-muted-foreground block text-xs">
                              de división {debt.splitCode}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {formatCurrency(debt.totalAmount, debt.currency)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {debt.paidInstallments}/{debt.installmentCount}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {formatCurrency(debt.remainingAmount, debt.currency)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {debt.nextDueDate
                            ? formatDateOnly(debt.nextDueDate)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <DebtStatusBadge
                            debt={debt}
                            isThirdParty={isThirdParty}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-11 min-w-11 sm:h-9"
                              disabled={debt.status !== 'ACTIVA'}
                              onClick={(event) => {
                                event.stopPropagation()
                                setPaymentDebt(debt)
                              }}
                            >
                              {actionLabel}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-11 sm:size-9"
                              aria-label={`Deshacer cobros o pagos de ${debt.actor.displayName}`}
                              disabled={!debt.hasActiveSettlement}
                              onClick={(event) => {
                                event.stopPropagation()
                                setReversalDebt(debt)
                              }}
                            >
                              <Undo2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y lg:hidden">
                {debts.map((debt) => (
                  <li key={debt.id} className="space-y-3 p-4">
                    <div
                      className="flex cursor-pointer flex-wrap items-start justify-between gap-2"
                      onClick={() => setViewDebt(debt)}
                      title="Ver deuda"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium break-words">
                          <span className="font-mono text-sm">{debt.code}</span>
                          {' · '}
                          {debt.actor.displayName}
                        </p>
                        <p className="text-sm break-words">
                          {debt.note || (
                            <span className="text-muted-foreground">
                              Sin descripción
                            </span>
                          )}
                          {debt.splitCode && (
                            <span className="text-muted-foreground block text-xs">
                              de división {debt.splitCode}
                            </span>
                          )}
                        </p>
                        {actorLine(debt) && (
                          <p className="text-muted-foreground text-xs break-words">
                            {actorLine(debt)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <DebtStatusBadge
                          debt={debt}
                          isThirdParty={isThirdParty}
                        />
                        <ChevronRight
                          aria-hidden="true"
                          className="text-muted-foreground size-5 shrink-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-muted-foreground">Total</p>
                      <p className="text-right font-medium tabular-nums">
                        {formatCurrency(debt.totalAmount, debt.currency)}
                      </p>
                      <p className="text-muted-foreground">Cuotas</p>
                      <p className="text-right tabular-nums">
                        {debt.paidInstallments}/{debt.installmentCount} pagas
                      </p>
                      <p className="text-muted-foreground">Restante</p>
                      <p className="text-right tabular-nums">
                        {formatCurrency(debt.remainingAmount, debt.currency)}
                      </p>
                      <p className="text-muted-foreground">
                        Próx. {isThirdParty ? 'cobro' : 'vto.'}
                      </p>
                      <p className="text-right whitespace-nowrap tabular-nums">
                        {debt.nextDueDate
                          ? formatDateOnly(debt.nextDueDate)
                          : '—'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-11 flex-1"
                        disabled={debt.status !== 'ACTIVA'}
                        onClick={() => setPaymentDebt(debt)}
                      >
                        {actionLabel}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 flex-1"
                        disabled={!debt.hasActiveSettlement}
                        onClick={() => setReversalDebt(debt)}
                      >
                        <Undo2 />
                        Deshacer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-sm">
                  {meta?.total ?? 0}{' '}
                  {(meta?.total ?? 0) === 1 ? 'deuda' : 'deudas'} · Página{' '}
                  {meta?.page ?? page} de {Math.max(meta?.totalPages ?? 1, 1)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 sm:h-10 sm:flex-none"
                    disabled={page <= 1 || debtsQuery.isFetching}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 sm:h-10 sm:flex-none"
                    disabled={
                      debtsQuery.isFetching || page >= (meta?.totalPages ?? 0)
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

      <DebtPaymentDialog
        open={Boolean(paymentDebt)}
        debt={paymentDebt}
        onOpenChange={(next) => {
          if (!next) setPaymentDebt(null)
        }}
        onSaved={(alert) => {
          setSpendingAlert(alert)
          invalidateDebts()
        }}
      />

      <DebtReversalDialog
        open={Boolean(reversalDebt)}
        debt={reversalDebt}
        onOpenChange={(next) => {
          if (!next) setReversalDebt(null)
        }}
        onSaved={invalidateDebts}
      />

      <DebtViewDialog
        open={Boolean(viewDebt)}
        debt={viewDebt}
        onOpenChange={(next) => {
          if (!next) setViewDebt(null)
        }}
      />
    </div>
  )
}
