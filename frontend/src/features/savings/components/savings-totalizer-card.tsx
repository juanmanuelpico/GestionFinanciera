import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/types/finance'
import { currencyNames, type SavingsPosition } from '../types'
import type { SavingAction } from './saving-action-dialog'

interface SavingsTotalizerCardProps {
  currency: Currency
  amount: number
  position: SavingsPosition
  onAction: (action: SavingAction) => void
}

const actions: { action: SavingAction; label: string }[] = [
  { action: 'ajustar', label: 'Ajustar' },
  { action: 'devolver', label: 'Devolver' },
  { action: 'convertir', label: 'Convertir' },
]

export function SavingsTotalizerCard({
  currency,
  amount,
  position,
  onAction,
}: SavingsTotalizerCardProps) {
  const hasBalance = amount > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Ahorrado en {currencyNames[currency]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xl font-semibold tabular-nums">
          {formatCurrency(String(amount), currency)}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {actions.map(({ action, label }) => {
            const disabled = !hasBalance || (action !== 'ajustar' && position.amount <= 0)
            return (
              <Button
                key={action}
                type="button"
                variant="outline"
                size="sm"
                className="h-11 min-w-0 px-1.5 text-xs sm:px-2 md:h-8 md:text-sm"
                disabled={disabled}
                title={
                  disabled
                    ? 'Primero agregá un ahorro en esta moneda'
                    : undefined
                }
                aria-label={`${label} ahorro en ${currency}`}
                onClick={() => onAction(action)}
              >
                {label}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
