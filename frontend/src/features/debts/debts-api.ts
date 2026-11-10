import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type {
  CreateDebtPayload,
  CreateDebtSplitPayload,
  DebtActor,
  DebtActorPayload,
  DebtDetail,
  DebtSettlement,
  DebtSplit,
  PaginatedDebtActors,
  PaginatedDebtSplits,
  PaginatedDebts,
  PayDebtPayload,
} from './types'

interface ActorQuery {
  search?: string
  type?: string
  page: number
  limit: number
}

export async function fetchDebtActors(
  query: ActorQuery,
): Promise<PaginatedDebtActors> {
  const { data } = await api.get<ApiResponse<PaginatedDebtActors>>(
    '/debt-actors',
    { params: query },
  )

  return data.data
}

export async function createDebtActor(
  payload: DebtActorPayload,
): Promise<DebtActor> {
  const { data } = await api.post<ApiResponse<DebtActor>>(
    '/debt-actors',
    payload,
  )

  return data.data
}

export async function updateDebtActor(
  id: string,
  payload: DebtActorPayload,
): Promise<DebtActor> {
  const { data } = await api.patch<ApiResponse<DebtActor>>(
    `/debt-actors/${id}`,
    payload,
  )

  return data.data
}

export async function deleteDebtActor(id: string): Promise<void> {
  await api.delete(`/debt-actors/${id}`)
}

export async function fetchDebts(query: {
  kind: string
  page: number
  limit: number
  search?: string
  status?: string
  actorType?: string
  currency?: string
  description?: string
}): Promise<PaginatedDebts> {
  const { data } = await api.get<ApiResponse<PaginatedDebts>>('/debts', {
    params: query,
  })

  return data.data
}

export async function fetchDebt(id: string): Promise<DebtDetail> {
  const { data } = await api.get<ApiResponse<DebtDetail>>(`/debts/${id}`)
  return data.data
}

export async function createDebt(payload: CreateDebtPayload): Promise<DebtDetail> {
  const { data } = await api.post<ApiResponse<DebtDetail>>('/debts', payload)
  return data.data
}

export async function payDebt(
  debtId: string,
  payload: PayDebtPayload,
): Promise<DebtDetail> {
  const { data } = await api.post<ApiResponse<DebtDetail>>(
    `/debts/${debtId}/payments`,
    payload,
  )

  return data.data
}

export async function fetchDebtSettlements(
  debtId: string,
): Promise<DebtSettlement[]> {
  const { data } = await api.get<ApiResponse<DebtSettlement[]>>(
    `/debts/${debtId}/settlements`,
  )

  return data.data
}

export async function reverseDebtSettlement(
  debtId: string,
  settlementId: string,
): Promise<DebtDetail> {
  const { data } = await api.post<ApiResponse<DebtDetail>>(
    `/debts/${debtId}/settlements/${settlementId}/reverse`,
  )

  return data.data
}

export async function fetchDebtSplits(query: {
  page: number
  limit: number
  search?: string
}): Promise<PaginatedDebtSplits> {
  const { data } = await api.get<ApiResponse<PaginatedDebtSplits>>(
    '/debt-splits',
    { params: query },
  )

  return data.data
}

export async function createDebtSplit(
  payload: CreateDebtSplitPayload,
): Promise<DebtSplit> {
  const { data } = await api.post<ApiResponse<DebtSplit>>(
    '/debt-splits',
    payload,
  )

  return data.data
}

export async function deleteDebtSplit(id: string): Promise<void> {
  await api.delete(`/debt-splits/${id}`)
}
