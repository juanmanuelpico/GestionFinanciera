import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { DollarQuotes } from '../types'

interface DollarQuotesCardProps {
  quotes: DollarQuotes | undefined
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRefresh: () => void
}

const labels: Record<keyof DollarQuotes, string> = {
  BLUE: 'Dólar Blue',
  OFICIAL: 'Dólar Oficial',
  MEP: 'Dólar MEP',
}

export function DollarQuotesCard({
  quotes,
  isLoading,
  isError,
  isFetching,
  onRefresh,
}: DollarQuotesCardProps) {
  return (
    <section aria-labelledby="quotes-title">
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle id="quotes-title">Cotizaciones del dólar</CardTitle>
            <CardDescription>
              Fuente: DolarApi. El euro se ingresa manualmente en cada operación.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="h-11 w-full shrink-0 sm:h-9 sm:w-auto"
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground text-sm">Cargando cotizaciones…</p>
          )}
          {isError && (
            <p className="text-destructive text-sm break-words" role="alert">
              No se pudieron obtener las cotizaciones. Podés cargar la cotización
              manualmente en cada operación.
            </p>
          )}
          {quotes && (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(Object.keys(labels) as (keyof DollarQuotes)[]).map((key) => (
                <div key={key} className="rounded-lg border p-3">
                  <dt className="text-muted-foreground text-xs">{labels[key]}</dt>
                  <dd className="mt-1 text-sm tabular-nums">
                    <span className="block">
                      Compra {formatCurrency(String(quotes[key].compra), 'ARS')}
                    </span>
                    <span className="block font-semibold">
                      Venta {formatCurrency(String(quotes[key].venta), 'ARS')}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
