import type { Currency } from '@/types/finance'

export type QuoteType = 'BLUE' | 'OFICIAL' | 'MEP' | 'MANUAL'
export type SavingStatus = 'ACTIVO' | 'CERRADO'
export type SavingEventType =
  | 'ALTA'
  | 'AJUSTE_SUMA'
  | 'AJUSTE_RESTA'
  | 'DEVOLUCION'
  | 'CONVERSION'

export interface Saving {
  id: number
  currency: Currency
  amount: number
  quoteType: QuoteType
  quoteRate: number | null
  estimatedDebit: number
  debitCurrency: Currency
  purchaseDate: string
  note: string | null
  status: SavingStatus
  createdAt: string
  updatedAt: string
}

export interface SavingEvent {
  id: number
  savingId: number
  type: SavingEventType
  amount: number
  currency: Currency
  sourceAmount: number | null
  sourceCurrency: Currency | null
  quoteType: QuoteType | null
  quoteRate: number | null
  walletImpactAmount: number | null
  walletImpactCurrency: Currency | null
  note: string | null
  createdAt: string
}

export interface SavingsPosition {
  amount: number
  quoteType: QuoteType | null
  quoteRate: number | null
}

export interface PaginatedSavingEvents {
  items: SavingEvent[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DollarQuote {
  type: 'BLUE' | 'OFICIAL' | 'MEP'
  compra: number
  venta: number
  casa: string
  nombre: string
  fechaActualizacion: string
}

export type DollarQuotes = Record<'BLUE' | 'OFICIAL' | 'MEP', DollarQuote>

export type AvailableByCurrency = Record<Currency, number>

export interface SavingsSummary {
  enabledCurrencies: Currency[]
  headerCurrency: Currency
  available: AvailableByCurrency
  savingsByCurrency: AvailableByCurrency
  positions: Record<Currency, SavingsPosition>
  estimate: {
    ars: number | null
    usd: number | null
    usdRateUsed: number | null
  }
}

export const quoteTypeLabels: Record<QuoteType, string> = {
  BLUE: 'Blue',
  OFICIAL: 'Oficial',
  MEP: 'MEP',
  MANUAL: 'Manual',
}

export const currencyNames: Record<Currency, string> = {
  ARS: 'Pesos',
  USD: 'Dólar',
  EUR: 'Euro',
}

export const savingEventLabels: Record<SavingEventType, string> = {
  ALTA: 'Alta',
  AJUSTE_SUMA: 'Ajuste (+)',
  AJUSTE_RESTA: 'Ajuste (-)',
  DEVOLUCION: 'Devolución',
  CONVERSION: 'Conversión',
}

export const savingEventTypeOptions: {
  value: SavingEventType
  label: string
}[] = (
  Object.keys(savingEventLabels) as SavingEventType[]
).map((value) => ({ value, label: savingEventLabels[value] }))
