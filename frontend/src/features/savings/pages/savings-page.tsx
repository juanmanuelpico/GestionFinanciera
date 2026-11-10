import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Coins, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import { getApiErrorMessage } from '@/lib/errors'
import {
  dateInputToIso,
  formatCurrency,
  formatDateTime,
} from '@/lib/format'
import type { Currency } from '@/types/finance'
import { DollarQuotesCard } from '../components/dollar-quotes-card'
import {
  SavingActionDialog,
  type SavingAction,
} from '../components/saving-action-dialog'
import { SavingFormDialog } from '../components/saving-form-dialog'
import {
  SavingsHistoryFilters,
  type SavingsHistoryFilterValues,
} from '../components/savings-history-filters'
import { SavingsTotalizerCard } from '../components/savings-totalizer-card'
import {
  fetchDollarQuotes,
  fetchSavingEvents,
  fetchSavingsSummary,
} from '../savings-api'
import {
  currencyNames,
  quoteTypeLabels,
  savingEventLabels,
  type SavingEvent,
} from '../types'

const QUOTES_KEY = ['savings', 'dollar-quotes'] as const
const PAGE_SIZE = 20

const initialFilters: SavingsHistoryFilterValues = {
  from: '',
  to: '',
  type: 'ALL',
  currency: 'ALL',
  search: '',
}

export function SavingsPage() {
  const queryClient = useQueryClient()
  const preferences = usePreferencesQuery()
  const enabledCurrencies: Currency[] = preferences.data?.enabledCurrencies ?? ['ARS']

  const [formOpen, setFormOpen] = useState(false)
  const [current, setCurrent] = useState<{
    currency: Currency
    action: SavingAction
  } | null>(null)
  const [eurInput, setEurInput] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<SavingsHistoryFilterValues>(initialFilters)
  const eurRate = parseOptionalNumber(eurInput)

  const quotes = useQuery({
    queryKey: QUOTES_KEY,
    queryFn: fetchDollarQuotes,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const summary = useQuery({
    queryKey: ['savings', 'summary', eurRate],
    queryFn: () => fetchSavingsSummary(eurRate ?? undefined),
  })

  const eventFilters = {
    from: dateInputToIso(filters.from, 'start'),
    to: dateInputToIso(filters.to, 'end'),
    type: filters.type === 'ALL' ? undefined : filters.type,
    currency: filters.currency === 'ALL' ? undefined : filters.currency,
    search: filters.search.trim() || undefined,
  }

  const events = useQuery({
    queryKey: ['savings', 'events', page, eventFilters],
    queryFn: () =>
      fetchSavingEvents({ page, limit: PAGE_SIZE, ...eventFilters }),
    placeholderData: keepPreviousData,
  })

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['savings'] })
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
  }

  const updateFilters = (patch: Partial<SavingsHistoryFilterValues>) => {
    setFilters((values) => ({ ...values, ...patch }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setPage(1)
  }

  const needsEurRate = enabledCurrencies.includes('EUR')
  const hasFilters =
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.type !== 'ALL' ||
    filters.currency !== 'ALL' ||
    Boolean(filters.search.trim())

  const eventItems = events.data?.items ?? []
  const meta = events.data?.meta
  const currentPosition = current
    ? (summary.data?.positions[current.currency] ?? null)
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Ahorros</h1>
          <p className="text-muted-foreground break-words">
            Dónde guardás tu dinero, en qué moneda y cuánto vale en conjunto.
          </p>
        </div>
        <Button
          className="h-11 w-full sm:h-10 sm:w-auto"
          onClick={() => setFormOpen(true)}
        >
          <Plus />
          Agregar ahorro
        </Button>
      </div>

      <DollarQuotesCard
        quotes={quotes.data}
        isLoading={quotes.isLoading}
        isError={quotes.isError}
        isFetching={quotes.isFetching}
        onRefresh={() => void quotes.refetch()}
      />

      <section aria-label="Resumen de ahorros" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {enabledCurrencies.map((currency) => {
            const position = summary.data?.positions[currency] ?? {
              amount: 0,
              quoteType: null,
              quoteRate: null,
            }
            return (
              <SavingsTotalizerCard
                key={currency}
                currency={currency}
                amount={position.amount}
                position={position}
                onAction={(action) => setCurrent({ currency, action })}
              />
            )
          })}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total estimado en pesos</CardTitle>
              <CardDescription>Usa la cotización oficial (venta).</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums">
                {summary.data?.estimate.ars == null
                  ? 'Sin cotización'
                  : formatCurrency(String(summary.data.estimate.ars), 'ARS')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total estimado en dólares</CardTitle>
              <CardDescription>Dólar oficial (venta) como referencia.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums">
                {summary.data?.estimate.usd == null
                  ? 'Sin cotización'
                  : formatCurrency(String(summary.data.estimate.usd), 'USD')}
              </p>
            </CardContent>
          </Card>
        </div>

        {needsEurRate && (
          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="eur-rate">Cotización del euro (manual, pesos por EUR)</Label>
            <Input
              id="eur-rate"
              inputMode="decimal"
              autoComplete="off"
              value={eurInput}
              onChange={(event) => setEurInput(event.target.value)}
              placeholder="Ej: 1250"
              className="h-11 sm:h-10"
            />
            <p className="text-muted-foreground text-xs">
              Sin esta cotización, el total en pesos y dólares no incluye los euros.
            </p>
          </div>
        )}
      </section>

      <SavingsHistoryFilters
        values={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        canClear={hasFilters}
      />

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Altas, ajustes, devoluciones y conversiones.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.isPending && (
            <div
              className="space-y-3"
              role="status"
              aria-label="Cargando historial"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-12 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {events.isError && (
            <div className="space-y-3" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(events.error)}
              </p>
              <Button
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                onClick={() => void events.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!events.isPending && !events.isError && eventItems.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Coins className="text-muted-foreground size-10" />
              <div className="space-y-1">
                <p className="font-medium">
                  {hasFilters
                    ? 'No encontramos movimientos'
                    : 'Sin movimientos de ahorro'}
                </p>
                <p className="text-muted-foreground text-sm">
                  {hasFilters
                    ? 'Probá con otro rango de fechas, tipo, moneda u observación.'
                    : 'Cuando agregues o muevas un ahorro, vas a verlo acá.'}
                </p>
              </div>
            </div>
          )}

          {!events.isPending && !events.isError && eventItems.length > 0 && (
            <>
              <p className="text-muted-foreground mb-3 text-xs xl:hidden">
                Deslizá para ver todas las columnas.
              </p>
              <Table className="min-w-[44rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 border-r bg-card">
                      Fecha
                    </TableHead>
                    <TableHead>Ahorro</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Cotización</TableHead>
                    <TableHead className="text-right">
                      Movimiento Dinero Disponible
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventItems.map((event) => {
                    const [eventDate, eventTime] = formatDateTime(
                      event.createdAt,
                    ).split(', ')
                    return (
                      <TableRow key={event.id}>
                        <TableCell className="sticky left-0 z-10 border-r bg-card py-2 align-top whitespace-nowrap sm:align-middle">
                          <span className="block sm:inline">
                            {eventDate}
                            {eventTime ? ',' : ''}
                          </span>
                          {eventTime && (
                            <>
                              {' '}
                              <span className="text-muted-foreground block text-xs sm:inline sm:text-sm sm:text-foreground">
                                {eventTime}
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[10rem] whitespace-normal">
                          {event.type === 'CONVERSION' && event.sourceCurrency ? (
                            <>
                              {currencyNames[event.sourceCurrency]} ({event.sourceCurrency}) →{' '}
                              {currencyNames[event.currency]} ({event.currency})
                            </>
                          ) : (
                            <>
                              {currencyNames[event.currency]} ({event.currency})
                            </>
                          )}
                          {event.note && (
                            <span className="text-muted-foreground block text-xs break-words">
                              {event.note}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {savingEventLabels[event.type]}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                          <span className="block">
                            {formatCurrency(String(event.amount), event.currency)}
                          </span>
                          {event.type === 'CONVERSION' &&
                            event.sourceAmount !== null &&
                            event.sourceCurrency !== null && (
                              <span className="text-muted-foreground block text-xs font-normal">
                                desde{' '}
                                {formatCurrency(
                                  String(event.sourceAmount),
                                  event.sourceCurrency,
                                )}{' '}
                                {event.sourceCurrency}
                              </span>
                            )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {event.quoteRate === null
                            ? '—'
                            : `${event.quoteType ? `${quoteTypeLabels[event.quoteType]} ` : ''}${event.quoteRate}`}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          <WalletImpact event={event} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-sm">
                  {meta?.total ?? 0}{' '}
                  {(meta?.total ?? 0) === 1 ? 'movimiento' : 'movimientos'} · Página{' '}
                  {meta?.page ?? page} de {Math.max(meta?.totalPages ?? 1, 1)}
                </p>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 sm:h-10 sm:flex-none"
                    disabled={page <= 1 || events.isFetching}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 sm:h-10 sm:flex-none"
                    disabled={
                      events.isFetching || page >= (meta?.totalPages ?? 0)
                    }
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SavingFormDialog
        open={formOpen}
        enabledCurrencies={enabledCurrencies}
        quotes={quotes.data}
        onOpenChange={setFormOpen}
        onSaved={refreshAll}
      />

      <SavingActionDialog
        currency={current?.currency ?? null}
        position={currentPosition}
        action={current?.action ?? null}
        enabledCurrencies={enabledCurrencies}
        quotes={quotes.data}
        onOpenChange={(open) => {
          if (!open) setCurrent(null)
        }}
        onDone={refreshAll}
      />
    </div>
  )
}

function WalletImpact({ event }: { event: SavingEvent }) {
  if (
    event.walletImpactAmount === null ||
    event.walletImpactCurrency === null ||
    (event.type !== 'ALTA' && event.type !== 'DEVOLUCION')
  ) {
    return <span className="text-muted-foreground">—</span>
  }

  const outgoing = event.type === 'ALTA'
  return (
    <span
      className={outgoing ? 'text-destructive' : 'text-success'}
      aria-label={
        outgoing ? 'Descontó del disponible' : 'Sumó al disponible'
      }
    >
      {outgoing ? '−' : '+'}{' '}
      {formatCurrency(String(event.walletImpactAmount), event.walletImpactCurrency)}
    </span>
  )
}

function parseOptionalNumber(value: string): number | null {
  const parsed = Number(value.replace(',', '.'))
  return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
