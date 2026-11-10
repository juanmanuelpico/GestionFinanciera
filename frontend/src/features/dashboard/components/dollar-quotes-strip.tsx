import { TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { DollarQuotes } from '@/features/savings/types'

const labels: Record<keyof DollarQuotes, string> = {
  BLUE: 'Blue',
  OFICIAL: 'Oficial',
  MEP: 'MEP',
}

interface DollarQuotesStripProps {
  quotes: DollarQuotes | null
}

export function DollarQuotesStrip({ quotes }: DollarQuotesStripProps) {
  return (
    <Card className="gap-0 border-primary bg-primary py-0 text-primary-foreground shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <TrendingUp className="size-4 shrink-0" aria-hidden />
            <p className="text-sm font-medium">Cotización del dólar</p>
            <span className="text-primary-foreground/70 text-xs">DolarApi</span>
          </div>

          {quotes ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
              {(Object.keys(labels) as (keyof DollarQuotes)[]).map((key) => (
                <div
                  key={key}
                  className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 sm:block"
                >
                  <dt className="text-primary-foreground/70 text-xs">
                    {labels[key]}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums sm:text-base">
                    {formatCurrency(String(quotes[key].venta), 'ARS')}
                  </dd>
                  <dd className="text-primary-foreground/70 text-xs tabular-nums">
                    Compra {formatCurrency(String(quotes[key].compra), 'ARS')}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-primary-foreground/80 text-xs break-words">
              No pudimos obtener la cotización del dólar.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
