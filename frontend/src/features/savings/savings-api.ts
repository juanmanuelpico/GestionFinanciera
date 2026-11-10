import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { Currency } from '@/types/finance'
import type {
  AvailableByCurrency,
  DollarQuotes,
  PaginatedSavingEvents,
  QuoteType,
  Saving,
  SavingEventType,
  SavingsSummary,
} from './types'

export interface CreateSavingPayload {
  currency: Currency
  amount: number
  quoteType?: QuoteType
  quoteRate?: number
  debitCurrency: Currency
  debitRate?: number
  purchaseDate: string
  note?: string | null
}

export interface ConvertSavingPayload {
  amount: number
  currency: Currency
  sourceQuoteType?: QuoteType
  sourceQuoteRate?: number
  quoteType?: QuoteType
  quoteRate?: number
}

export interface SavingEventsFilters {
  page?: number
  limit?: number
  from?: string
  to?: string
  type?: SavingEventType
  currency?: Currency
  search?: string
}

export async function fetchDollarQuotes(): Promise<DollarQuotes> {
  const { data } = await api.get<ApiResponse<DollarQuotes>>(
    '/exchange-rates/dollar',
  )
  return data.data
}

export async function fetchSavingEvents(
  filters: SavingEventsFilters = {},
): Promise<PaginatedSavingEvents> {
  const { data } = await api.get<ApiResponse<PaginatedSavingEvents>>(
    '/savings/events',
    {
      params: {
        ...(filters.page ? { page: filters.page } : {}),
        ...(filters.limit ? { limit: filters.limit } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.currency ? { currency: filters.currency } : {}),
        ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
      },
    },
  )
  return data.data
}

export async function fetchSavingsSummary(
  eurRate?: number,
): Promise<SavingsSummary> {
  const { data } = await api.get<ApiResponse<SavingsSummary>>(
    '/savings/summary',
    { params: eurRate ? { eurRate } : undefined },
  )
  return data.data
}

export async function fetchAvailable(): Promise<AvailableByCurrency> {
  const { data } = await api.get<ApiResponse<AvailableByCurrency>>(
    '/savings/available',
  )
  return data.data
}

export async function createSaving(payload: CreateSavingPayload): Promise<Saving> {
  const { data } = await api.post<ApiResponse<Saving>>('/savings', payload)
  return data.data
}

export async function adjustPosition(
  currency: Currency,
  payload: { operation: 'SUMAR' | 'RESTAR'; amount: number },
): Promise<Saving> {
  const { data } = await api.post<ApiResponse<Saving>>(
    `/savings/positions/${currency}/adjust`,
    payload,
  )
  return data.data
}

export async function returnPosition(
  currency: Currency,
  payload: {
    amount: number
    walletCurrency: Currency
    sourceQuoteType?: QuoteType
    sourceQuoteRate?: number
    walletRate?: number
  },
): Promise<Saving> {
  const { data } = await api.post<ApiResponse<Saving>>(
    `/savings/positions/${currency}/return`,
    payload,
  )
  return data.data
}

export async function convertPosition(
  currency: Currency,
  payload: ConvertSavingPayload,
): Promise<Saving> {
  const { data } = await api.post<ApiResponse<Saving>>(
    `/savings/positions/${currency}/convert`,
    payload,
  )
  return data.data
}
