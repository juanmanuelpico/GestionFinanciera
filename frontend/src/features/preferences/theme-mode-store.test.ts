import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_MODE_STORAGE_KEY, themeModeIds } from './theme-mode'
import { useThemeModeStore } from './theme-mode-store'

describe('useThemeModeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    useThemeModeStore.setState({ mode: 'light' })
  })

  it('activa la clase dark al elegir el modo oscuro', () => {
    useThemeModeStore.getState().setMode('dark')

    expect(useThemeModeStore.getState().mode).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('quita la clase dark al volver al modo claro', () => {
    useThemeModeStore.getState().setMode('dark')
    useThemeModeStore.getState().setMode('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persiste la elección en localStorage', () => {
    useThemeModeStore.getState().setMode('dark')

    const stored = JSON.parse(
      localStorage.getItem(THEME_MODE_STORAGE_KEY) ?? '{}',
    ) as { state?: { mode?: string } }

    expect(stored.state?.mode).toBe('dark')
  })

  it('publica los modos disponibles', () => {
    expect(themeModeIds).toEqual(['light', 'dark'])
  })
})
