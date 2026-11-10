import type { Category } from '@/features/categories/types'
import type { SpendingAlert } from '@/features/spending-control/types'
import type { Currency, PaymentMethod } from '@/types/finance'

export interface FixedExpense {
  id: string
  title: string
  amount: string
  currency: Currency
  categoryId: number
  category: Pick<Category, 'id' | 'name' | 'type'>
  firstDueDate: string
  dueDay: number
  intervalMonths: number
  active: boolean
  nextDueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface FixedExpensePayload {
  title: string
  amount: number
  currency: Currency
  categoryId: number
  firstDueDate: string
  intervalMonths: number
  active: boolean
}

export interface FixedExpensePayment {
  id: string
  period: string
  dueDate: string
  paidAt: string
  amount: string
  currency: Currency
  paymentMethod: PaymentMethod | null
  movement: {
    id: number
    categoryId: number
    category: { id: number; name: string }
    note: string | null
  }
  spendingAlert?: SpendingAlert | null
}

export interface FixedExpenseProjection {
  fixedExpenseId: string
  title: string
  amount: string
  currency: Currency
  categoryId: number
  category: Pick<Category, 'id' | 'name' | 'type'>
  intervalMonths: number
  active: boolean
  period: string
  dueDate: string
  status: 'PENDIENTE' | 'PAGADO'
  payment: FixedExpensePayment | null
}

export interface PayFixedExpensePayload {
  period: string
  amount: number
  paidAt: string
  paymentMethod?: PaymentMethod | null
}

export interface FixedExpenseHistoryResponse {
  fixedExpense: FixedExpense
  items: FixedExpensePayment[]
}

export function formatFrequencyLabel(intervalMonths: number): string {
  if (intervalMonths === 1) return 'Mensual'
  return `Cada ${intervalMonths} meses`
}
