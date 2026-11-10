import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency } from '@/lib/format'
import type { MovementType } from '@/types/finance'
import { movementTypeLabels } from '@/types/finance'
import { fetchCategoryAverages, fetchTopCategories } from '../reports-api'
import {
  chartColors,
  chartTick,
  chartTooltipStyle,
} from '../report-charts'
import type { ReportFilters } from '../types'
import { ChartCard, ChartFrame, ReportBoundary } from './report-ui'

type TypeFilter = 'ALL' | MovementType

const LIMIT_OPTIONS = [5, 10, 20]

interface TooltipEntry {
  payload: {
    categoryName: string
    type: MovementType
    count: number
    totalAmount: number
    sharePercent: number
  }
}

function TopCategoriesTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  currency: string
}) {
  if (!active || !payload?.length) return null

  const row = payload[0]!.payload

  return (
    <div className="max-w-[220px] rounded-lg border bg-popover px-3 py-2 text-xs break-words text-popover-foreground shadow-md">
      <p className="font-medium break-words">{row.categoryName}</p>
      <p className="tabular-nums">
        {row.count} movimientos · {movementTypeLabels[row.type]}
      </p>
      <p className="tabular-nums">
        Total: {formatCurrency(String(row.totalAmount), currency)} ·{' '}
        {row.sharePercent}% del período
      </p>
    </div>
  )
}

interface MovementsReportTabProps {
  filters: ReportFilters
}

export function MovementsReportTab({ filters }: MovementsReportTabProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('EGRESO')
  const [limit, setLimit] = useState(10)

  const type = typeFilter === 'ALL' ? undefined : typeFilter

  const topQuery = useQuery({
    queryKey: ['reports', 'top-categories', filters, type, limit],
    queryFn: () => fetchTopCategories(filters, { type, limit }),
  })

  const averagesQuery = useQuery({
    queryKey: ['reports', 'category-averages', filters, type],
    queryFn: () => fetchCategoryAverages(filters, { type }),
  })

  const currency = filters.currency
  const topRows = [...(topQuery.data?.items ?? [])].reverse()
  const averageRows = averagesQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <ChartCard
        title="Categorías más usadas"
        description={`Top ${limit} categorías por cantidad de movimientos en la billetera ${currency}.`}
        actions={
          <div className="flex shrink-0 gap-2">
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as TypeFilter)}
            >
              <SelectTrigger
                aria-label="Tipo de movimiento"
                className="h-11 min-w-0 flex-1 sm:h-10 sm:w-[130px] sm:flex-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="EGRESO">Egreso</SelectItem>
                <SelectItem value="INGRESO">Ingreso</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(limit)}
              onValueChange={(value) => setLimit(Number(value))}
            >
              <SelectTrigger
                aria-label="Top N"
                className="h-11 min-w-0 flex-1 sm:h-10 sm:w-[92px] sm:flex-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    Top {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <ReportBoundary
          isPending={topQuery.isPending}
          isError={topQuery.isError}
          error={topQuery.error}
          isEmpty={(topQuery.data?.items.length ?? 0) === 0}
          emptyTitle="Sin movimientos en el período"
          emptyHint="Probá con otro período, billetera o tipo de movimiento."
          loadingLabel="Cargando categorías"
          onRetry={() => void topQuery.refetch()}
        >
          <ChartFrame style={{ height: Math.max(160, topRows.length * 40 + 24) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRows}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
              >
                <CartesianGrid
                  stroke={chartColors.grid}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={chartTick}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="categoryName"
                  width={110}
                  tick={chartTick}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  content={<TopCategoriesTooltip currency={currency} />}
                />
                <Bar
                  dataKey="count"
                  name="Movimientos"
                  fill={chartColors.aportes}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ReportBoundary>
      </ChartCard>

      <ChartCard
        title="Media de gasto por categoría"
        description="Total y promedio mensual de cada categoría en el período seleccionado."
      >
        <ReportBoundary
          isPending={averagesQuery.isPending}
          isError={averagesQuery.isError}
          error={averagesQuery.error}
          isEmpty={averageRows.length === 0}
          emptyTitle="Sin datos para el promedio"
          emptyHint="Cargá movimientos o cambiá el filtro de tipo."
          loadingLabel="Cargando promedios"
          onRetry={() => void averagesQuery.refetch()}
        >
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Movimientos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">
                    Promedio mensual
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {averageRows.map((row) => (
                  <TableRow key={`${row.categoryId}-${row.type}`}>
                    <TableCell className="whitespace-normal break-words font-medium">
                      {row.categoryName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.type === 'INGRESO' ? 'outline' : 'secondary'}
                      >
                        {movementTypeLabels[row.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(String(row.totalAmount), currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(String(row.monthlyAverage), currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y lg:hidden">
            {averageRows.map((row) => (
              <li
                key={`${row.categoryId}-${row.type}`}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium break-words">{row.categoryName}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {row.count} {row.count === 1 ? 'movimiento' : 'movimientos'}{' '}
                    · {formatCurrency(String(row.totalAmount), currency)}
                  </p>
                </div>
                <div className="shrink-0 space-y-1 text-right">
                  <Badge
                    variant={row.type === 'INGRESO' ? 'outline' : 'secondary'}
                  >
                    {movementTypeLabels[row.type]}
                  </Badge>
                  <p className="font-medium tabular-nums">
                    {formatCurrency(String(row.monthlyAverage), currency)}/mes
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ReportBoundary>
      </ChartCard>
    </div>
  )
}
