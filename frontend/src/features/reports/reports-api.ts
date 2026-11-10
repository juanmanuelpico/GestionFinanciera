import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { MovementType } from '@/types/finance'
import type {
  CategoryAveragesReport,
  DebtsStatsReport,
  FixedExpensesMonthlyReport,
  ReportFilters,
  SavingsMonthlyReport,
  TopCategoriesReport,
} from './types'

function params(filters: ReportFilters, extra: Record<string, unknown> = {}) {
  return {
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    currency: filters.currency,
    ...extra,
  }
}

export async function fetchSavingsMonthly(
  filters: ReportFilters,
): Promise<SavingsMonthlyReport> {
  const { data } = await api.get<ApiResponse<SavingsMonthlyReport>>(
    '/reports/savings/monthly',
    { params: params(filters) },
  )

  return data.data
}

export async function fetchTopCategories(
  filters: ReportFilters,
  options: { type?: MovementType; limit: number },
): Promise<TopCategoriesReport> {
  const { data } = await api.get<ApiResponse<TopCategoriesReport>>(
    '/reports/movements/top-categories',
    {
      params: params(filters, {
        ...(options.type ? { type: options.type } : {}),
        limit: options.limit,
      }),
    },
  )

  return data.data
}

export async function fetchCategoryAverages(
  filters: ReportFilters,
  options: { type?: MovementType } = {},
): Promise<CategoryAveragesReport> {
  const { data } = await api.get<ApiResponse<CategoryAveragesReport>>(
    '/reports/movements/category-averages',
    {
      params: params(filters, {
        ...(options.type ? { type: options.type } : {}),
      }),
    },
  )

  return data.data
}

export async function fetchDebtsStats(
  filters: ReportFilters,
): Promise<DebtsStatsReport> {
  const { data } = await api.get<ApiResponse<DebtsStatsReport>>(
    '/reports/debts/stats',
    { params: params(filters) },
  )

  return data.data
}

export async function fetchFixedExpensesMonthly(
  filters: ReportFilters,
): Promise<FixedExpensesMonthlyReport> {
  const { data } = await api.get<ApiResponse<FixedExpensesMonthlyReport>>(
    '/reports/fixed-expenses/monthly',
    { params: params(filters) },
  )

  return data.data
}
