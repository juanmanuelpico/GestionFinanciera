/** Utilidades de período (meses 'YYYY-MM') para la pantalla de Reportes. */

const pad = (value: number) => String(value).padStart(2, '0')

/** Valor 'YYYY-MM' del mes actual. */
export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

/** Suma meses a un valor 'YYYY-MM'. */
export function shiftMonthValue(value: string, months: number): string {
  const [year, month] = value.split('-').map(Number)

  if (!year || !month) return value

  const total = year * 12 + (month - 1) + months
  const nextYear = Math.floor(total / 12)
  const nextMonth = ((total % 12) + 12) % 12

  return `${nextYear}-${pad(nextMonth + 1)}`
}

export type PeriodPreset = 'LAST_3' | 'LAST_6' | 'LAST_12' | 'THIS_YEAR'

export interface ReportPeriod {
  from: string
  to: string
}

export function presetPeriod(preset: PeriodPreset): ReportPeriod {
  const to = currentMonthValue()

  if (preset === 'THIS_YEAR') {
    return { from: `${to.slice(0, 4)}-01`, to }
  }

  const months = preset === 'LAST_3' ? 2 : preset === 'LAST_6' ? 5 : 11

  return { from: shiftMonthValue(to, -months), to }
}

export const periodPresets: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'LAST_3', label: 'Últimos 3 meses' },
  { value: 'LAST_6', label: 'Últimos 6 meses' },
  { value: 'LAST_12', label: 'Últimos 12 meses' },
  { value: 'THIS_YEAR', label: 'Este año' },
]

export function activePreset(period: ReportPeriod): PeriodPreset | null {
  const match = periodPresets.find((preset) =>
    isSamePeriod(presetPeriod(preset.value), period),
  )

  return match?.value ?? null
}

/** Últimos `count` meses en orden descendente (más nuevo primero). */
export function recentMonthOptions(count = 24): string[] {
  const current = currentMonthValue()

  return Array.from({ length: count }, (_, index) =>
    shiftMonthValue(current, -index),
  )
}

/** '2026-11' -> 'nov 2026' */
export function monthOptionLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)

  return new Intl.DateTimeFormat('es-AR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function isSamePeriod(a: ReportPeriod, b: ReportPeriod): boolean {
  return a.from === b.from && a.to === b.to
}
