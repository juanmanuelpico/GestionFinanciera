import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type { DashboardSectionId } from './dashboard-sections'
import type { ThemeColorId } from './theme-colors'
import type { ThemeModeId } from './theme-mode'
import type { Currency, PaymentMethod } from '@/types/finance'

export interface UserPreferences {
  themeColor: ThemeColorId
  themeMode: ThemeModeId
  enabledCurrencies: Currency[]
  headerCurrency: Currency
  enabledPaymentMethods: PaymentMethod[]
  dashboardSections: DashboardSectionId[]
}

export async function fetchPreferences(): Promise<UserPreferences> {
  const { data } = await api.get<ApiResponse<UserPreferences>>(
    '/users/me/preferences',
  )
  return data.data
}

export async function updatePreferences(
  payload: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const { data } = await api.patch<ApiResponse<UserPreferences>>(
    '/users/me/preferences',
    payload,
  )
  return data.data
}
