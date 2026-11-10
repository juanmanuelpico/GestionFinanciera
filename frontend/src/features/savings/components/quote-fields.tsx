import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/types/finance'
import { quoteOptionsFor } from '../estimate'
import { quoteTypeLabels, type DollarQuotes, type QuoteType } from '../types'

interface QuoteFieldsProps {
  idPrefix: string
  currency: Currency
  quoteType: QuoteType | undefined
  manualRate: string
  quotes: DollarQuotes | undefined
  quoteTypeError?: string
  rateError?: string
  onQuoteTypeChange: (value: QuoteType) => void
  onManualRateChange: (value: string) => void
}

/** Cotización de una moneda: DolarApi (USD) o manual. ARS no requiere cotización. */
export function QuoteFields({
  idPrefix,
  currency,
  quoteType,
  manualRate,
  quotes,
  quoteTypeError,
  rateError,
  onQuoteTypeChange,
  onManualRateChange,
}: QuoteFieldsProps) {
  if (currency === 'ARS') {
    return null
  }

  const options = quoteOptionsFor(currency)

  const optionLabel = (type: QuoteType) => {
    const base = quoteTypeLabels[type]
    if (type === 'MANUAL' || !quotes) return base
    return `${base} (venta ${formatCurrency(String(quotes[type].venta), 'ARS')})`
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label htmlFor={`${idPrefix}-quote-type`}>Cotización</Label>
        <Select
          value={quoteType ?? ''}
          onValueChange={(value) => onQuoteTypeChange(value as QuoteType)}
        >
          <SelectTrigger
            id={`${idPrefix}-quote-type`}
            aria-invalid={Boolean(quoteTypeError)}
            className="h-auto min-h-11 w-full whitespace-normal data-[size=default]:h-auto sm:min-h-10 *:data-[slot=select-value]:line-clamp-none!"
          >
            <SelectValue placeholder="Elegí la cotización" />
          </SelectTrigger>
          <SelectContent>
            {options.map((type) => (
              <SelectItem key={type} value={type}>
                {optionLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {quoteTypeError && (
          <p className="text-destructive text-sm break-words" role="alert">
            {quoteTypeError}
          </p>
        )}
      </div>

      {quoteType === 'MANUAL' && (
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${idPrefix}-manual-rate`}>Cotización</Label>
          <Input
            id={`${idPrefix}-manual-rate`}
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            aria-label={`Cotización de ${currency}`}
            value={manualRate}
            onChange={(event) => onManualRateChange(event.target.value)}
            aria-invalid={Boolean(rateError)}
            className="h-11 sm:h-10"
          />
          {rateError && (
            <p className="text-destructive text-sm break-words" role="alert">
              {rateError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
