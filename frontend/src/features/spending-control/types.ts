export type SpendingLimitStatus = 'OK' | 'WARNING' | 'EXCEEDED'

export interface SpendingAlert {
  categoryId: number
  categoryName: string
  currency: string
  period: string
  thresholdAmount: string
  spentAmount: string
  percent: number
  status: 'WARNING' | 'EXCEEDED'
}

export interface SpendingControlRow {
  categoryId: number
  categoryName: string
  thresholdAmount: string
  thresholdCurrency: string
  spentAmount: string
  percent: number
  status: SpendingLimitStatus
}

export interface SpendingControlSummary {
  period: string
  rows: SpendingControlRow[]
}

export const spendingStatusLabels: Record<SpendingLimitStatus, string> = {
  OK: 'En control',
  WARNING: 'Al 80 % o más',
  EXCEEDED: 'Umbral superado',
}

export const spendingStatusAmountClasses: Record<SpendingLimitStatus, string> =
  {
    OK: 'text-success decoration-success',
    WARNING: 'text-warning decoration-warning',
    EXCEEDED: 'text-destructive decoration-destructive',
  }

export function periodLabel(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  const label = new Intl.DateTimeFormat('es', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function percentLabel(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} %`
}
