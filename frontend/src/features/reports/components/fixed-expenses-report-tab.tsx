import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format'
import { fetchFixedExpensesMonthly } from '../reports-api'
import { monthOptionLabel } from '../report-period'
import {
  chartColors,
  chartTick,
  chartTooltipStyle,
  currencyTooltipFormatter,
  formatTickAmount,
} from '../report-charts'
import type { ReportFilters } from '../types'
import {
  ChartCard,
  ChartFrame,
  KpiCard,
  ReportBoundary,
} from './report-ui'

interface FixedExpensesReportTabProps {
  filters: ReportFilters
}

export function FixedExpensesReportTab({
  filters,
}: FixedExpensesReportTabProps) {
  const query = useQuery({
    queryKey: ['reports', 'fixed-expenses', filters],
    queryFn: () => fetchFixedExpensesMonthly(filters),
  })

  const currency = filters.currency
  const series = query.data?.items ?? []
  const summary = query.data?.summary

  const dueTotal = series.reduce((acc, item) => acc + item.dueCount, 0)
  const paidTotal = series.reduce((acc, item) => acc + item.paidCount, 0)

  return (
    <div className="space-y-6">
      <ReportBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        isEmpty={false}
        emptyTitle=""
        emptyHint=""
        loadingLabel="Cargando gastos fijos"
        onRetry={() => void query.refetch()}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Esperado en el período"
            value={formatCurrency(String(summary?.totalExpected ?? 0), currency)}
            hint={`${dueTotal} vencimientos en los meses del rango`}
          />
          <KpiCard
            label="Pagado en el período"
            value={formatCurrency(String(summary?.totalPaid ?? 0), currency)}
            tone="success"
          />
          <KpiCard
            label="Cumplimiento"
            value={
              dueTotal === 0
                ? '—'
                : `${Math.round((paidTotal / dueTotal) * 100)}%`
            }
            hint={`${paidTotal} de ${dueTotal} vencimientos pagados`}
          />
        </div>

        <ChartCard
          title="Gastos fijos por mes"
          description={`Lo que vencía contra lo efectivamente pagado en ${currency}.`}
        >
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={chartTick}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tickFormatter={(value: string) => monthOptionLabel(value)}
                />
                <YAxis
                  tick={chartTick}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={formatTickAmount}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelFormatter={(label) => monthOptionLabel(String(label))}
                  formatter={currencyTooltipFormatter(currency)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="expected"
                  name="Esperado"
                  fill={chartColors.esperado}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="paid"
                  name="Pagado"
                  fill={chartColors.pago}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>
      </ReportBoundary>
    </div>
  )
}
