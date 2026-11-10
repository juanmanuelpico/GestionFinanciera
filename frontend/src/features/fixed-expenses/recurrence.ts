const PERIOD_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isValidPeriod(value: string): boolean {
  return PERIOD_REGEX.test(value)
}

export function currentPeriodValue(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

export function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split('-').map(Number)
  const total = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

/** Un período se puede pagar solo si no es futuro. */
export function isPayablePeriod(period: string, now: Date = new Date()): boolean {
  return period <= currentPeriodValue(now)
}

const periodLabelFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
})

export function formatPeriodLabel(period: string): string {
  if (!isValidPeriod(period)) return period

  const [year, month] = period.split('-').map(Number)
  const label = periodLabelFormatter.format(new Date(year, month - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}
