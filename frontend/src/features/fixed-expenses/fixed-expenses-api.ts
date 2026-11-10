import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type {
  FixedExpense,
  FixedExpenseHistoryResponse,
  FixedExpensePayload,
  FixedExpensePayment,
  FixedExpenseProjection,
  PayFixedExpensePayload,
} from './types'

export async function fetchFixedExpenses(): Promise<FixedExpense[]> {
  const { data } = await api.get<ApiResponse<FixedExpense[]>>(
    '/fixed-expenses',
  )
  return data.data
}

export async function fetchProjections(
  period: string,
): Promise<FixedExpenseProjection[]> {
  const { data } = await api.get<ApiResponse<FixedExpenseProjection[]>>(
    '/fixed-expenses/projections',
    { params: { period } },
  )
  return data.data
}

export async function createFixedExpense(
  payload: FixedExpensePayload,
): Promise<FixedExpense> {
  const { data } = await api.post<ApiResponse<FixedExpense>>(
    '/fixed-expenses',
    payload,
  )
  return data.data
}

export async function updateFixedExpense(
  id: string,
  payload: Partial<FixedExpensePayload>,
): Promise<FixedExpense> {
  const { data } = await api.patch<ApiResponse<FixedExpense>>(
    `/fixed-expenses/${id}`,
    payload,
  )
  return data.data
}

export async function payFixedExpense(
  id: string,
  payload: PayFixedExpensePayload,
): Promise<FixedExpensePayment> {
  const { data } = await api.post<ApiResponse<FixedExpensePayment>>(
    `/fixed-expenses/${id}/payments`,
    payload,
  )
  return data.data
}

export async function fetchFixedExpenseHistory(
  id: string,
): Promise<FixedExpenseHistoryResponse> {
  const { data } = await api.get<ApiResponse<FixedExpenseHistoryResponse>>(
    `/fixed-expenses/${id}/payments`,
  )
  return data.data
}
