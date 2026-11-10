import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useThemeColorStore } from './theme-color-store'
import { ThemeColorSwitcher } from './theme-color-switcher'

describe('ThemeColorSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme-color')
    useThemeColorStore.setState({ color: 'blue' })
  })

  it('muestra los tres colores disponibles', () => {
    render(<ThemeColorSwitcher />)

    expect(
      screen.getByRole('group', { name: 'Color del tema' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('aplica el nuevo color al elegirlo', async () => {
    const user = userEvent.setup()
    render(<ThemeColorSwitcher />)

    await user.click(screen.getByRole('button', { name: 'Usar color Ámbar' }))

    expect(document.documentElement.getAttribute('data-theme-color')).toBe(
      'amber',
    )
  })
})
