/** Espejo de las fórmulas del backend (debt-calculations.ts). Solo para vista previa. */

export interface InstallmentPreview {
  baseCents: number
  lastCents: number
  totalCents: number
}

export function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Reparte el total en cuotas: las primeras redondean hacia abajo, la última absorbe el resto. */
export function buildInstallmentPreview(
  amount: number,
  count: number,
): InstallmentPreview | null {
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (!Number.isInteger(count) || count < 1 || count > 120) return null

  const totalCents = toCents(amount)
  const baseCents = Math.floor(totalCents / count)
  const lastCents = totalCents - baseCents * (count - 1)

  if (lastCents <= 0) return null

  return { baseCents, lastCents, totalCents }
}

/** Reparte el saldo restante entre las cuotas pendientes, absorbiendo el resto en la última. */
export function buildRemainingAmountValues(
  remainingAmount: number | string,
  pendingCount: number,
): string[] {
  if (pendingCount < 1 || !Number.isInteger(pendingCount)) return []

  const parsed =
    typeof remainingAmount === 'number'
      ? remainingAmount
      : parseAmount(remainingAmount) ?? 0
  const totalCents = Math.max(0, toCents(parsed))
  const baseCents = Math.round(totalCents / pendingCount)
  const lastCents = totalCents - baseCents * (pendingCount - 1)

  return Array.from({ length: pendingCount }, (_, index) =>
    fromCents(index === pendingCount - 1 ? lastCents : baseCents),
  )
}

export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function addMonthsLocal(date: Date, months: number): Date {
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate()
  target.setDate(Math.min(day, lastDay))
  return target
}

function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Primer vencimiento sugerido para compras con tarjeta (misma regla que el backend). */
export function suggestCardFirstDueDate(
  purchaseDateValue: string,
  closingDay: number,
  paymentDueDay: number,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(purchaseDateValue)
  if (!match) return null

  const [year, month, day] = match.slice(1).map(Number)
  const purchase = new Date(year, month - 1, day)

  const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const clampDay = (y: number, m: number, d: number) =>
    toDateInputValue(new Date(y, m, Math.min(d, daysIn(y, m))))

  const currentClosing = new Date(year, month - 1, Math.min(closingDay, daysIn(year, month - 1)))
  const statementClosing =
    purchase.getTime() <= currentClosing.getTime()
      ? currentClosing
      : addMonthsLocal(currentClosing, 1)

  const closingYear = statementClosing.getFullYear()
  const closingMonth = statementClosing.getMonth()

  const sameMonthDue = new Date(
    closingYear,
    closingMonth,
    Math.min(paymentDueDay, daysIn(closingYear, closingMonth)),
  )

  if (sameMonthDue.getTime() > statementClosing.getTime()) {
    return toDateInputValue(sameMonthDue)
  }

  const nextMonth = new Date(closingYear, closingMonth + 1, 1)
  return clampDay(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    paymentDueDay,
  )
}

/** 'YYYY-MM-DD' + 1 mes calendario, recortado a fin de mes. */
export function nextMonthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const [year, month, day] = match.slice(1).map(Number)
  return toDateInputValue(addMonthsLocal(new Date(year, month - 1, day), 1))
}
