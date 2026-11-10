import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_COLOR_STORAGE_KEY, themeColorIds } from './theme-colors'
import { useThemeColorStore } from './theme-color-store'

describe('useThemeColorStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme-color')
    useThemeColorStore.setState({ color: 'blue' })
  })

  it('aplica el color elegido al elemento raíz', () => {
    useThemeColorStore.getState().setColor('blue')

    expect(document.documentElement.getAttribute('data-theme-color')).toBe(
      'blue',
    )
  })

  it('cambia el atributo del documento al elegir otro color', () => {
    useThemeColorStore.getState().setColor('amber')

    expect(useThemeColorStore.getState().color).toBe('amber')
    expect(document.documentElement.getAttribute('data-theme-color')).toBe(
      'amber',
    )
  })

  it('persiste la elección en localStorage', () => {
    useThemeColorStore.getState().setColor('emerald')

    const stored = JSON.parse(
      localStorage.getItem(THEME_COLOR_STORAGE_KEY) ?? '{}',
    ) as { state?: { color?: string } }

    expect(stored.state?.color).toBe('emerald')
  })

  it('publica los colores disponibles para el selector', () => {
    expect(themeColorIds).toEqual(['blue', 'amber', 'emerald'])
  })
})
