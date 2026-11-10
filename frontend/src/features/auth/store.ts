import { create } from 'zustand'
import { refreshSessionRequest, setAccessToken } from '@/lib/api-client'
import type { AuthSession, User } from '@/types/api'
import {
  loginRequest,
  logoutRequest,
  registerRequest,
  type LoginPayload,
  type RegisterPayload,
} from './api'

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'

interface AuthState {
  user: User | null
  accessToken: string | null
  status: AuthStatus
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  refresh: () => Promise<AuthSession | null>
  bootstrap: () => Promise<void>
  logout: () => Promise<void>
  clearSession: () => void
}

let bootstrapStarted = false

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',

  login: async (payload) => {
    const session = await loginRequest(payload)
    setAccessToken(session.accessToken)
    set({
      user: session.user,
      accessToken: session.accessToken,
      status: 'authenticated',
    })
  },

  register: async (payload) => {
    const session = await registerRequest(payload)
    setAccessToken(session.accessToken)
    set({
      user: session.user,
      accessToken: session.accessToken,
      status: 'authenticated',
    })
  },

  refresh: async () => {
    const session = await refreshSessionRequest()

    if (!session) {
      setAccessToken(null)
      set({ user: null, accessToken: null, status: 'unauthenticated' })
      return null
    }

    setAccessToken(session.accessToken)
    set({
      user: session.user,
      accessToken: session.accessToken,
      status: 'authenticated',
    })
    return session
  },

  bootstrap: async () => {
    if (bootstrapStarted) {
      return
    }

    bootstrapStarted = true
    set({ status: 'loading' })
    await get().refresh()
  },

  logout: async () => {
    try {
      await logoutRequest()
    } catch {
      // La sesión local se limpia aunque el servidor no responda.
    } finally {
      setAccessToken(null)
      set({ user: null, accessToken: null, status: 'unauthenticated' })
    }
  },

  clearSession: () => {
    setAccessToken(null)
    set({ user: null, accessToken: null, status: 'unauthenticated' })
  },
}))
