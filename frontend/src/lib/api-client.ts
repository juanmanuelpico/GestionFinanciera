import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, AuthSession } from '@/types/api'

const apiUrl = import.meta.env.VITE_API_URL as string | undefined

if (!apiUrl) {
  throw new Error(
    'VITE_API_URL no está definida. Configurala en .env (ver env.example).',
  )
}

export const API_URL = apiUrl

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

let currentAccessToken: string | null = null

export function setAccessToken(token: string | null): void {
  currentAccessToken = token
}

export async function refreshSessionRequest(): Promise<AuthSession | null> {
  try {
    const response = await axios.post<ApiResponse<AuthSession>>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    return response.data.data
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`
  }
  return config
})

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<AuthSession | null> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined
    const isUnauthorized = error.response?.status === 401
    const isAuthRequest = original?.url?.includes('/auth/')

    if (
      !original ||
      !isUnauthorized ||
      original._retry ||
      isAuthRequest ||
      !currentAccessToken
    ) {
      throw error
    }

    original._retry = true
    refreshPromise ??= refreshSessionRequest().finally(() => {
      refreshPromise = null
    })

    const session = await refreshPromise

    if (!session) {
      const { useAuthStore } = await import('@/features/auth/store')
      useAuthStore.getState().clearSession()
      throw error
    }

    setAccessToken(session.accessToken)
    original.headers.Authorization = `Bearer ${session.accessToken}`

    return api(original)
  },
)
