import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import { fetchPreferences, updatePreferences } from '../preferences-api'
import { useThemeColorStore } from '../theme-color-store'
import { useThemeModeStore } from '../theme-mode-store'
import { SettingsPage } from './settings-page'

vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (state: { status: string }) => unknown) =>
    selector({ status: 'authenticated' }),
}))

vi.mock('../preferences-api', () => ({
  fetchPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))

const updatePreferencesMock = vi.mocked(updatePreferences)
const fetchPreferencesMock = vi.mocked(fetchPreferences)

const render = renderWithQueryClient

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.removeAttribute('data-theme-color')
    useThemeColorStore.setState({ color: 'blue' })
    useThemeModeStore.setState({ mode: 'light' })
    updatePreferencesMock.mockReset()
    updatePreferencesMock.mockResolvedValue({
      themeColor: 'blue',
      themeMode: 'dark',
      enabledCurrencies: ['ARS'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'OTRO'],
      dashboardSections: [
        'savings',
        'fixedExpenses',
        'myDebts',
        'thirdPartyDebts',
        'dollarQuotes',
      ],
    })
    fetchPreferencesMock.mockResolvedValue({
      themeColor: 'blue',
      themeMode: 'light',
      enabledCurrencies: ['ARS'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'OTRO'],
      dashboardSections: [
        'savings',
        'fixedExpenses',
        'myDebts',
        'thirdPartyDebts',
        'dollarQuotes',
      ],
    })
  })

  it('muestra la sección Vista con ambas preferencias', () => {
    render(<SettingsPage />)

    expect(
      screen.getByRole('heading', { name: 'Configuración' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Vista')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Color del tema' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Modo de la aplicación' }),
    ).toBeInTheDocument()
  })

  it('aplica y guarda el modo oscuro', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: 'Oscuro' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(updatePreferencesMock).toHaveBeenCalledWith({ themeMode: 'dark' })
  })

  it('revierte el modo si el guardado falla', async () => {
    const user = userEvent.setup()
    updatePreferencesMock.mockRejectedValueOnce(new Error('sin conexión'))
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: 'Oscuro' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  it('deshabilita un medio de pago y guarda la selección', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const efectivo = await screen.findByRole('checkbox', { name: 'Efectivo' })
    expect(efectivo).toBeChecked()

    await user.click(efectivo)

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledWith({
        enabledPaymentMethods: [
          'DEBITO',
          'CREDITO',
          'TRANSFERENCIA',
          'MERCADO_PAGO',
          'OTRO',
        ],
      })
    })
  })

  it('permite contraer las secciones de configuración', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    expect(
      screen.getByRole('group', { name: 'Color del tema' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Contraer Vista' }))

    expect(
      screen.queryByRole('group', { name: 'Color del tema' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Expandir Vista' }),
    ).toBeInTheDocument()
  })

  it('guarda las secciones del Dashboard elegidas', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const savings = await screen.findByRole('checkbox', { name: /^Ahorros/ })
    expect(savings).toBeChecked()

    await user.click(savings)

    await waitFor(() => {
      expect(updatePreferencesMock).toHaveBeenCalledWith({
        dashboardSections: [
          'fixedExpenses',
          'myDebts',
          'thirdPartyDebts',
          'dollarQuotes',
        ],
      })
    })
  })
})
