import { useQuery } from '@tanstack/react-query'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/format'
import { fetchSavingsMonthly } from '../reports-api'
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

interface SavingsReportTabProps {
  filters: ReportFilters
}

export function SavingsReportTab({ filters }: SavingsReportTabProps) {
  const query = useQuery({
    queryKey: ['reports', 'savings', filters],
    queryFn: () => fetchSavingsMonthly(filters),
  })

  const report = query.data
  const currency = filters.currency

  return (
    <div className="space-y-6">
      <ReportBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        isEmpty={false}
        emptyTitle=""
        emptyHint=""
        loadingLabel="Cargando ahorros"
        onRetry={() => void query.refetch()}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Ahorro promedio mensual (neto)"
            value={formatCurrency(String(report?.summary.averageMonthlyNet ?? 0), currency)}
            hint="Aportes menos retiros del período"
          />
          <KpiCard
            label="Aporte promedio mensual"
            value={formatCurrency(String(report?.summary.averageMonthlyContributed ?? 0), currency)}
          />
          <KpiCard
            label="Aportes del período"
            value={formatCurrency(String(report?.summary.totalContributed ?? 0), currency)}
          />
          <KpiCard
            label="Retiros del período"
            value={formatCurrency(String(report?.summary.totalReturned ?? 0), currency)}
            tone="destructive"
          />
        </div>

        <ChartCard
          title="Ahorros por mes"
          description={`Aportes, retiros y neto mensual en ${currency}. Las conversiones entre monedas no cuentan como aporte.`}
        >
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={report?.items ?? []}
                margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
              >
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
                  labelFormatter={(label) =>
                    monthOptionLabel(String(label))
                  }
                  formatter={currencyTooltipFormatter(currency)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="contributed"
                  name="Aportes"
                  fill={chartColors.aportes}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="returned"
                  name="Retiros"
                  fill={chartColors.retiros}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Neto"
                  stroke={chartColors.neto}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>
      </ReportBoundary>
    </div>
  )
}
