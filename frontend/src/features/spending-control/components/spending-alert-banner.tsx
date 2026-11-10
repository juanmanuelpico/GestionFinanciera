import { OctagonAlert, TriangleAlert } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { percentLabel, type SpendingAlert } from '../types'

interface SpendingAlertBannerProps {
  alert: SpendingAlert | null
}

export function SpendingAlertBanner({ alert }: SpendingAlertBannerProps) {
  if (!alert) {
    return null
  }

  const exceeded = alert.status === 'EXCEEDED'
  const Icon = exceeded ? OctagonAlert : TriangleAlert

  return (
    <div
      role="status"
      className={
        exceeded
          ? 'bg-destructive/10 border-destructive/30 text-destructive flex items-start gap-3 rounded-xl border p-4'
          : 'bg-warning/10 border-warning/30 text-warning flex items-start gap-3 rounded-xl border p-4'
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium break-words">
          {exceeded
            ? `Superaste el umbral de «${alert.categoryName}»`
            : `Vas por el ${percentLabel(alert.percent)} del umbral de «${alert.categoryName}»`}
        </p>
        <p className="text-sm break-words">
          {formatCurrency(alert.spentAmount, alert.currency)} gastados de{' '}
          {formatCurrency(alert.thresholdAmount, alert.currency)} este mes.
        </p>
      </div>
    </div>
  )
}
