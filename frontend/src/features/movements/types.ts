import type { Category } from '@/features/categories/types'
import type { SpendingAlert } from '@/features/spending-control/types'
import type { Currency, MovementType, PaymentMethod } from '@/types/finance'

export interface Movement {
  id: number
  type: MovementType
  amount: string
  categoryId: number
  category: Pick<Category, 'id' | 'name' | 'type'>
  movementDate: string
  currency: Currency
  paymentMethod: PaymentMethod | null
  note: string | null
  createdAt: string
  updatedAt: string
  spendingAlert?: SpendingAlert | null
}

export interface MovementPayload {
  type: MovementType
  amount: number
  categoryId: number
  movementDate: string
  currency: Currency
  paymentMethod?: PaymentMethod | null
  note?: string | null
}

export interface MovementFilters {
  type?: MovementType
  categoryId?: number
  from?: string
  to?: string
}

export interface MovementsQuery extends MovementFilters {
  page: number
  limit: number
}

export interface PaginatedMovements {
  items: Movement[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
