import type { Currency } from '@/types/finance'
import type { DollarQuotes, QuoteType } from './types'

/** Espejo de la fórmula del backend (ARS como pivote). Solo para vista previa. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function rateForCurrency(
  currency: Currency,
  rate: number | null,
): number | null {
  return currency === 'ARS' ? 1 : rate
}

export function convertValue(
  amount: number,
  from: { currency: Currency; rate: number | null },
  to: { currency: Currency; rate: number | null },
): number | null {
  if (!Number.isFinite(amount)) return null
  if (from.currency === to.currency) return round2(amount)

  const fromRate = rateForCurrency(from.currency, from.rate)
  const toRate = rateForCurrency(to.currency, to.rate)
  if (!fromRate || !toRate) return null

  return round2((amount * fromRate) / toRate)
}

/** La billetera necesita cotización manual si es otra moneda extranjera. */
export function walletNeedsManualRate(
  sourceCurrency: Currency,
  walletCurrency: Currency,
): boolean {
  return walletCurrency !== sourceCurrency && walletCurrency !== 'ARS'
}

/** Cotización de la moneda según la fuente elegida. ARS = 1. EUR solo manual. */
export function resolveQuoteRate(
  currency: Currency,
  quoteType: QuoteType | undefined,
  manualRate: number | null,
  quotes: DollarQuotes | undefined,
): number | null {
  if (currency === 'ARS') return 1
  if (!quoteType) return null
  if (quoteType === 'MANUAL') return manualRate
  if (currency !== 'USD') return null
  return quotes?.[quoteType].venta ?? null
}

/** Quotes admitidas para la moneda: USD usa DolarApi o manual; EUR solo manual. */
export function quoteOptionsFor(currency: Currency): QuoteType[] {
  if (currency === 'USD') return ['BLUE', 'OFICIAL', 'MEP', 'MANUAL']
  if (currency === 'EUR') return ['MANUAL']
  return []
}
