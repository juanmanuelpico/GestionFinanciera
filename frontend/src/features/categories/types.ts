import type { MovementType } from '@/types/finance'

export interface Category {
  id: number
  name: string
  type: MovementType | null
  thresholdAmount: string | null
  thresholdCurrency: string | null
  createdAt: string
  updatedAt: string
}

export interface CategoryPayload {
  name: string
  type: MovementType | null
  thresholdAmount: number | null
  thresholdCurrency: string | null
}

export interface CategoryFilters {
  search?: string
  type?: MovementType
}
