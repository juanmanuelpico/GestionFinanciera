import type { Currency, MovementType } from '@/types/finance'

export interface SavingsMonthlyPoint {
  period: string
  contributed: number
  returned: number
  net: number
}

export interface SavingsMonthlyReport {
  currency: Currency
  from: string
  to: string
  items: SavingsMonthlyPoint[]
  summary: {
    totalContributed: number
    totalReturned: number
    totalNet: number
    averageMonthlyContributed: number
    averageMonthlyNet: number
  }
}

export interface TopCategoryRow {
  categoryId: number
  categoryName: string
  type: MovementType
  count: number
  totalAmount: number
  sharePercent: number
}

export interface TopCategoriesReport {
  currency: Currency
  from: string
  to: string
  totalMovements: number
  items: TopCategoryRow[]
}

export interface CategoryAverageRow {
  categoryId: number
  categoryName: string
  type: MovementType
  count: number
  totalAmount: number
  monthlyAverage: number
}

export interface CategoryAveragesReport {
  currency: Currency
  from: string
  to: string
  monthCount: number
  items: CategoryAverageRow[]
}

export interface DebtsStatsReport {
  currency: Currency
  from: string
  to: string
  kpis: {
    ownOutstanding: number
    ownOverdueAmount: number
    ownActiveDebts: number
    thirdOutstanding: number
    thirdOverdueAmount: number
    thirdActiveDebts: number
    overdueInstallments: number
    paidInstallmentsPercent: number | null
  }
  series: Array<{ period: string; received: number; paid: number }>
  topDebtors: Array<{
    actorId: string
    displayName: string
    outstanding: number
  }>
}

export interface FixedExpensesMonthlyPoint {
  period: string
  expected: number
  paid: number
  dueCount: number
  paidCount: number
  compliancePercent: number | null
}

export interface FixedExpensesMonthlyReport {
  currency: Currency
  from: string
  to: string
  items: FixedExpensesMonthlyPoint[]
  summary: { totalExpected: number; totalPaid: number }
}

export interface ReportFilters {
  from?: string
  to?: string
  currency: Currency
}
