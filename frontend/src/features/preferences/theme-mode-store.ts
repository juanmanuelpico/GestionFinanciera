import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DARK_CLASS,
  DEFAULT_THEME_MODE,
  THEME_MODE_STORAGE_KEY,
  isThemeModeId,
  type ThemeModeId,
} from './theme-mode'

export function applyThemeMode(mode: ThemeModeId) {
  document.documentElement.classList.toggle(DARK_CLASS, mode === 'dark')
}

interface ThemeModeState {
  mode: ThemeModeId
  setMode: (mode: ThemeModeId) => void
}

export const useThemeModeStore = create<ThemeModeState>()(
  persist(
    (set) => ({
      mode: DEFAULT_THEME_MODE,

      setMode: (mode) => {
        applyThemeMode(mode)
        set({ mode })
      },
    }),
    {
      name: THEME_MODE_STORAGE_KEY,
      merge: (persisted, current) => {
        const mode =
          persisted &&
          typeof persisted === 'object' &&
          'mode' in persisted &&
          isThemeModeId((persisted as { mode: unknown }).mode)
            ? (persisted as { mode: ThemeModeId }).mode
            : current.mode

        return { ...current, mode }
      },
      onRehydrateStorage: () => (state) => {
        applyThemeMode(state?.mode ?? DEFAULT_THEME_MODE)
      },
    },
  ),
)
