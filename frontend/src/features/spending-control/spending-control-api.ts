import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { SpendingControlSummary } from './types'

export async function fetchSpendingControl(): Promise<SpendingControlSummary> {
  const { data } = await api.get<ApiResponse<SpendingControlSummary>>(
    '/spending-control',
  )

  return data.data
}
