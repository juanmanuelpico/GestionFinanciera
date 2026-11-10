import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { fetchPreferences } from './preferences-api'

export const PREFERENCES_QUERY_KEY = ['user-preferences'] as const

export function usePreferencesQuery() {
  const status = useAuthStore((state) => state.status)

  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: fetchPreferences,
    enabled: status === 'authenticated',
  })
}
