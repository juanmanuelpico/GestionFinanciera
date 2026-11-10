import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchSpendingControl } from '@/features/spending-control/spending-control-api'
import {
  percentLabel,
  periodLabel,
  spendingStatusLabels,
  type SpendingLimitStatus,
} from '@/features/spending-control/types'
import { formatCurrency } from '@/lib/format'
import { ReportBoundary } from './report-ui'

const statusBarClasses: Record<SpendingLimitStatus, string> = {
  OK: 'bg-primary-500',
  WARNING: 'bg-warning',
  EXCEEDED: 'bg-destructive',
}

export function SpendingControlReportTab() {
  const query = useQuery({
    queryKey: ['spending-control'],
    queryFn: () => fetchSpendingControl(),
  })

  const rows = query.data?.rows ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Umbrales del mes actual
          </CardTitle>
          <CardDescription>
            {query.data
              ? `Período ${periodLabel(query.data.period)} · esta pestaña siempre muestra el mes en curso, no el período seleccionado.`
              : 'Esta pestaña siempre muestra el mes en curso, no el período seleccionado.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportBoundary
            isPending={query.isPending}
            isError={query.isError}
            error={query.error}
            isEmpty={rows.length === 0}
            emptyTitle="Sin categorías con umbral"
            emptyHint="Configurá un umbral mensual en Categorías para ver el consumo acá."
            loadingLabel="Cargando control de gastos"
            onRetry={() => void query.refetch()}
          >
            <ul className="space-y-4">
              {rows.map((row) => {
                const width = Math.min(100, Math.max(2, row.percent))

                return (
                  <li key={`${row.categoryId}-${row.thresholdCurrency}`} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 font-medium break-words">
                        {row.categoryName}
                      </span>
                      <span className="flex max-w-full flex-wrap items-center justify-end gap-2">
                        <span className="text-muted-foreground tabular-nums">
                          {formatCurrency(row.spentAmount, row.thresholdCurrency)}{' '}
                          / {formatCurrency(row.thresholdAmount, row.thresholdCurrency)}
                        </span>
                        <Badge
                          variant={
                            row.status === 'EXCEEDED'
                              ? 'destructive'
                              : row.status === 'WARNING'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {spendingStatusLabels[row.status]}
                        </Badge>
                      </span>
                    </div>
                    <div
                      className="bg-muted h-2 w-full overflow-hidden rounded-full"
                      role="progressbar"
                      aria-valuenow={Math.round(row.percent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Consumo de ${row.categoryName}`}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] ${statusBarClasses[row.status]}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {percentLabel(row.percent)}
                    </p>
                  </li>
                )
              })}
            </ul>
          </ReportBoundary>
        </CardContent>
      </Card>
    </div>
  )
}
