import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_THEME_COLOR,
  THEME_COLOR_ATTRIBUTE,
  THEME_COLOR_STORAGE_KEY,
  isThemeColorId,
  type ThemeColorId,
} from './theme-colors'

export function applyThemeColor(color: ThemeColorId) {
  document.documentElement.setAttribute(THEME_COLOR_ATTRIBUTE, color)
}

interface ThemeColorState {
  color: ThemeColorId
  setColor: (color: ThemeColorId) => void
}

export const useThemeColorStore = create<ThemeColorState>()(
  persist(
    (set) => ({
      color: DEFAULT_THEME_COLOR,

      setColor: (color) => {
        applyThemeColor(color)
        set({ color })
      },
    }),
    {
      name: THEME_COLOR_STORAGE_KEY,
      merge: (persisted, current) => {
        const color =
          persisted &&
          typeof persisted === 'object' &&
          'color' in persisted &&
          isThemeColorId((persisted as { color: unknown }).color)
            ? (persisted as { color: ThemeColorId }).color
            : current.color

        return { ...current, color }
      },
      onRehydrateStorage: () => (state) => {
        applyThemeColor(state?.color ?? DEFAULT_THEME_COLOR)
      },
    },
  ),
)
