export const themeModeIds = ['light', 'dark'] as const

export type ThemeModeId = (typeof themeModeIds)[number]

export const DEFAULT_THEME_MODE: ThemeModeId = 'light'

export const THEME_MODE_STORAGE_KEY = 'finanzas.theme-mode'

export const DARK_CLASS = 'dark'

interface ThemeModeOption {
  label: string
  description: string
}

export const themeModeOptions: Record<ThemeModeId, ThemeModeOption> = {
  light: {
    label: 'Claro',
    description: 'Fondos claros y texto oscuro.',
  },
  dark: {
    label: 'Oscuro',
    description: 'Fondos oscuros y texto claro.',
  },
}

export function isThemeModeId(value: unknown): value is ThemeModeId {
  return themeModeIds.includes(value as ThemeModeId)
}
