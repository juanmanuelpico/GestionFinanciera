import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { fetchPreferences } from './preferences-api'
import { useThemeColorStore } from './theme-color-store'
import { useThemeModeStore } from './theme-mode-store'

export function PreferencesSync() {
  const status = useAuthStore((state) => state.status)
  const userId = useAuthStore((state) => state.user?.id)
  const setColor = useThemeColorStore((state) => state.setColor)
  const setMode = useThemeModeStore((state) => state.setMode)
  const syncedUserId = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      if (status === 'unauthenticated') {
        syncedUserId.current = null
      }
      return
    }

    if (syncedUserId.current === userId) {
      return
    }

    let cancelled = false
    syncedUserId.current = userId

    fetchPreferences()
      .then((preferences) => {
        if (cancelled) {
          return
        }

        setColor(preferences.themeColor)
        setMode(preferences.themeMode)
      })
      .catch(() => {
        syncedUserId.current = null
      })

    return () => {
      cancelled = true
    }
  }, [status, userId, setColor, setMode])

  return null
}
