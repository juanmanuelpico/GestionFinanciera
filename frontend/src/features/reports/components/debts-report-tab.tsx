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
import { fetchDebtsStats } from '../reports-api'
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

interface DebtsReportTabProps {
  filters: ReportFilters
}

export function DebtsReportTab({ filters }: DebtsReportTabProps) {
  const query = useQuery({
    queryKey: ['reports', 'debts-stats', filters],
    queryFn: () => fetchDebtsStats(filters),
  })

  const currency = filters.currency
  const kpis = query.data?.kpis
  const series = query.data?.series ?? []
  const topDebtors = query.data?.topDebtors ?? []

  return (
    <div className="space-y-6">
      <ReportBoundary
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        isEmpty={false}
        emptyTitle=""
        emptyHint=""
        loadingLabel="Cargando estadísticas de deudas"
        onRetry={() => void query.refetch()}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Te deben (terceros)"
            value={formatCurrency(String(kpis?.thirdOutstanding ?? 0), currency)}
            hint={`${kpis?.thirdActiveDebts ?? 0} ${
              (kpis?.thirdActiveDebts ?? 0) === 1 ? 'deuda activa' : 'deudas activas'
            }`}
            tone="success"
          />
          <KpiCard
            label="Vencido que no te pagaron"
            value={formatCurrency(
              String(kpis?.thirdOverdueAmount ?? 0),
              currency,
            )}
            hint={`${kpis?.overdueInstallments ?? 0} cuotas vencidas impagas`}
            tone="destructive"
          />
          <KpiCard
            label="Vos debés"
            value={formatCurrency(String(kpis?.ownOutstanding ?? 0), currency)}
            hint={`${kpis?.ownActiveDebts ?? 0} ${
              (kpis?.ownActiveDebts ?? 0) === 1 ? 'deuda activa' : 'deudas activas'
            }`}
          />
          <KpiCard
            label="Cumplimiento de cuotas"
            value={
              kpis?.paidInstallmentsPercent === null ||
              kpis?.paidInstallmentsPercent === undefined
                ? '—'
                : `${kpis.paidInstallmentsPercent}%`
            }
            hint="Cuotas pagadas sobre el total de cuotas"
          />
        </div>

        <ChartCard
          title="Cobros y pagos por mes"
          description={`Settlements de deudas en ${currency} dentro del período: lo que te cobraron (terceros) y lo que pagaste (propias).`}
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
                  dataKey="received"
                  name="Cobros (te pagaron)"
                  fill={chartColors.cobros}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="paid"
                  name="Pagos (pagaste)"
                  fill={chartColors.pagosDeuda}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>

        <ChartCard
          title="¿Quién te debe más?"
          description="Saldo pendiente por persona en deudas de terceros activas."
        >
          {topDebtors.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm break-words">
              Nadie te debe en la billetera {currency}.
            </p>
          ) : (
            <ol className="space-y-3">
              {topDebtors.map((debtor, index) => {
                const max = topDebtors[0]?.outstanding || 1
                const width = Math.max(6, Math.round((debtor.outstanding / max) * 100))

                return (
                  <li key={debtor.actorId} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 font-medium break-words">
                        {index + 1}. {debtor.displayName}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatCurrency(String(debtor.outstanding), currency)}
                      </span>
                    </div>
                    <div
                      className="bg-muted h-2 w-full overflow-hidden rounded-full"
                      role="presentation"
                    >
                      <div
                        className="bg-primary-500 h-full rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </ChartCard>
      </ReportBoundary>
    </div>
  )
}
