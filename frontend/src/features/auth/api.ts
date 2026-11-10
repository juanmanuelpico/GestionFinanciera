import { api } from '@/lib/api-client'
import type { ApiResponse, AuthSession, User } from '@/types/api'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export async function loginRequest(payload: LoginPayload): Promise<AuthSession> {
  const { data } = await api.post<ApiResponse<AuthSession>>('/auth/login', payload)
  return data.data
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<AuthSession> {
  const { data } = await api.post<ApiResponse<AuthSession>>(
    '/auth/register',
    payload,
  )
  return data.data
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout')
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<ApiResponse<User>>('/auth/me')
  return data.data
}
