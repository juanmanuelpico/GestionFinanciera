import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { DashboardSummary } from './types'

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<ApiResponse<DashboardSummary>>(
    '/dashboard/summary',
  )
  return data.data
}
