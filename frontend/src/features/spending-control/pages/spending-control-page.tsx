import { useQuery } from '@tanstack/react-query'
import { PiggyBank, Search } from 'lucide-react'
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
import { getApiErrorMessage } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import { fetchSpendingControl } from '../spending-control-api'
import {
  percentLabel,
  periodLabel,
  spendingStatusAmountClasses,
  spendingStatusLabels,
  type SpendingControlRow,
  type SpendingLimitStatus,
} from '../types'

type StatusFilter = 'ALL' | SpendingLimitStatus

const statusBadgeClasses: Record<SpendingLimitStatus, string> = {
  OK: 'bg-success/10 text-success border-transparent',
  WARNING: 'bg-warning/10 text-warning border-transparent',
  EXCEEDED: 'bg-destructive/10 text-destructive border-transparent',
}

function SpendingStatusBadge({ status }: { status: SpendingLimitStatus }) {
  return (
    <Badge className={statusBadgeClasses[status]} variant="outline">
      {spendingStatusLabels[status]}
    </Badge>
  )
}

function SpentAmount({ row }: { row: SpendingControlRow }) {
  return (
    <span
      className={
        'underline decoration-2 underline-offset-4 ' +
        spendingStatusAmountClasses[row.status]
      }
    >
      {formatCurrency(row.spentAmount, row.thresholdCurrency)}
    </span>
  )
}

export function SpendingControlPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const summaryQuery = useQuery({
    queryKey: ['spending-control'],
    queryFn: fetchSpendingControl,
  })

  const rows = summaryQuery.data?.rows ?? []
  const hasFilters = Boolean(search.trim()) || statusFilter !== 'ALL'
  const activeFilterCount =
    (search.trim() ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0)

  const visibleRows = rows.filter((row) => {
    if (
      search.trim() &&
      !row.categoryName.toLowerCase().includes(search.trim().toLowerCase())
    ) {
      return false
    }
    if (statusFilter !== 'ALL' && row.status !== statusFilter) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Control de Gastos
        </h1>
        <p className="text-muted-foreground">
          Umbrales mensuales por categoría. Totales de{' '}
          {summaryQuery.data ? periodLabel(summaryQuery.data.period) : '…'}.
        </p>
      </div>

      <CollapsibleFilters
        activeCount={activeFilterCount}
        gridClassName="gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end sm:px-6"
      >
        <div className="space-y-2">
          <label htmlFor="spending-search" className="text-sm font-medium">
            Buscar categoría
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="spending-search"
              type="search"
              placeholder="Nombre de la categoría"
              className="h-11 pl-9 sm:h-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="spending-status" className="text-sm font-medium">
            Estado
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger
              id="spending-status"
              aria-label="Estado"
              className="h-11 sm:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="OK">En control</SelectItem>
              <SelectItem value="WARNING">Al 80 % o más</SelectItem>
              <SelectItem value="EXCEEDED">Umbral superado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="h-11 w-full sm:h-10 sm:w-auto"
          disabled={!hasFilters}
          onClick={() => {
            setSearch('')
            setStatusFilter('ALL')
          }}
        >
          Limpiar filtros
        </Button>
      </CollapsibleFilters>

      <Card className="py-0">
        <CardContent className="p-0">
          {summaryQuery.isPending && (
            <div
              className="space-y-3 p-4"
              aria-label="Cargando control de gastos"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-muted h-12 animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {summaryQuery.isError && (
            <div className="space-y-3 p-6" role="alert">
              <p className="text-destructive text-sm break-words">
                {getApiErrorMessage(summaryQuery.error)}
              </p>
              <Button
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                onClick={() => void summaryQuery.refetch()}
              >
                Reintentar
              </Button>
            </div>
          )}

          {!summaryQuery.isPending &&
            !summaryQuery.isError &&
            rows.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <PiggyBank className="text-muted-foreground size-10" />
                <div className="space-y-1">
                  <p className="font-medium">Ninguna categoría con umbral</p>
                  <p className="text-muted-foreground text-sm">
                    Cargá un umbral máximo en Categorías para controlar el gasto
                    mensual de cada una.
                  </p>
                </div>
              </div>
            )}

          {!summaryQuery.isPending &&
            !summaryQuery.isError &&
            rows.length > 0 &&
            visibleRows.length === 0 && (
              <div className="px-6 py-10 text-center">
                <p className="font-medium">Sin resultados con estos filtros</p>
                <p className="text-muted-foreground text-sm">
                  Solo se muestran categorías con umbral máximo.
                </p>
              </div>
            )}

          {!summaryQuery.isPending &&
            !summaryQuery.isError &&
            visibleRows.length > 0 && (
              <>
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">
                          Umbral / mes
                        </TableHead>
                        <TableHead className="text-right">Gastado</TableHead>
                        <TableHead className="text-right">Uso</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row) => (
                        <TableRow key={row.categoryId}>
                          <TableCell className="font-medium whitespace-normal break-words">
                            {row.categoryName}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {formatCurrency(
                              row.thresholdAmount,
                              row.thresholdCurrency,
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <SpentAmount row={row} />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {percentLabel(row.percent)}
                          </TableCell>
                          <TableCell>
                            <SpendingStatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <ul className="divide-y lg:hidden">
                  {visibleRows.map((row) => (
                    <li key={row.categoryId} className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium break-words">
                          {row.categoryName}
                        </p>
                        <SpendingStatusBadge status={row.status} />
                      </div>
                      <div className="text-sm flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-muted-foreground">
                          Umbral{' '}
                          {formatCurrency(
                            row.thresholdAmount,
                            row.thresholdCurrency,
                          )}
                        </span>
                        <span className="ml-auto text-right whitespace-nowrap">
                          <SpentAmount row={row} /> ·{' '}
                          {percentLabel(row.percent)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
