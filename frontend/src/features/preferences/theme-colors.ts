export const themeColorIds = ['blue', 'amber', 'emerald'] as const

export type ThemeColorId = (typeof themeColorIds)[number]

export const DEFAULT_THEME_COLOR: ThemeColorId = 'blue'

export const THEME_COLOR_STORAGE_KEY = 'finanzas.theme-color'

export const THEME_COLOR_ATTRIBUTE = 'data-theme-color'

interface ThemeColorOption {
  label: string
  swatch: string
}

export const themeColorOptions: Record<ThemeColorId, ThemeColorOption> = {
  blue: { label: 'Azul', swatch: '#2563eb' },
  amber: { label: 'Ámbar', swatch: '#d97706' },
  emerald: { label: 'Esmeralda', swatch: '#059669' },
}

export function isThemeColorId(value: unknown): value is ThemeColorId {
  return themeColorIds.includes(value as ThemeColorId)
}
