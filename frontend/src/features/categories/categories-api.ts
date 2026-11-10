import { api } from '@/lib/api-client'
import type { ApiResponse } from '@/types/api'
import type {
  Category,
  CategoryFilters,
  CategoryPayload,
} from './types'

export async function fetchCategories(
  filters: CategoryFilters = {},
): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<Category[]>>('/categories', {
    params: filters,
  })

  return data.data
}

export async function createCategory(
  payload: CategoryPayload,
): Promise<Category> {
  const { data } = await api.post<ApiResponse<Category>>('/categories', payload)
  return data.data
}

export async function updateCategory(
  id: number,
  payload: Partial<CategoryPayload>,
): Promise<Category> {
  const { data } = await api.patch<ApiResponse<Category>>(
    `/categories/${id}`,
    payload,
  )
  return data.data
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`)
}
