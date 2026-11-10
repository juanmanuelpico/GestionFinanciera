import type { DashboardSectionId } from '@/features/preferences/dashboard-sections'
import type { DollarQuotes } from '@/features/savings/types'
import type { Currency } from '@/types/finance'

export interface DashboardSavingsSummary {
  enabledCurrencies: Currency[]
  amounts: Record<Currency, number>
}

export interface DashboardFixedExpensesSummary {
  period: string
  paid: number
  pending: number
  overdue: number
  dueSoon: number
}

export interface DashboardMyDebtsSummary {
  peopleOwed: number
  peopleWithActiveDebt: number
  overdueDebts: number
  overdueInstallments: number
}

export interface DashboardThirdPartyDebtsSummary {
  peopleWhoOwe: number
  peopleWithOverdue: number
  activeDebts: number
  overdueInstallments: number
}

export interface DashboardSummary {
  sections: DashboardSectionId[]
  savings: DashboardSavingsSummary | null
  fixedExpenses: DashboardFixedExpensesSummary | null
  myDebts: DashboardMyDebtsSummary | null
  thirdPartyDebts: DashboardThirdPartyDebtsSummary | null
  dollarQuotes: DollarQuotes | null
}
