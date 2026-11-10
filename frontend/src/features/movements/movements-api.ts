import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type {
  Movement,
  MovementPayload,
  MovementsQuery,
  PaginatedMovements,
} from './types'

export async function fetchMovements(
  query: MovementsQuery,
): Promise<PaginatedMovements> {
  const { data } = await api.get<ApiResponse<PaginatedMovements>>('/movements', {
    params: query,
  })

  return data.data
}

export async function createMovement(
  payload: MovementPayload,
): Promise<Movement> {
  const { data } = await api.post<ApiResponse<Movement>>('/movements', payload)
  return data.data
}

export async function updateMovement(
  id: number,
  payload: Partial<MovementPayload>,
): Promise<Movement> {
  const { data } = await api.patch<ApiResponse<Movement>>(
    `/movements/${id}`,
    payload,
  )
  return data.data
}

export async function deleteMovement(id: number): Promise<void> {
  await api.delete(`/movements/${id}`)
}
