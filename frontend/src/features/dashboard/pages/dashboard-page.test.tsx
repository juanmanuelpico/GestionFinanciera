import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import { fetchDashboardSummary } from '../dashboard-api'
import type { DashboardSummary } from '../types'
import { DashboardPage } from './dashboard-page'

vi.mock('@/features/preferences/preferences-query', () => ({
  usePreferencesQuery: () => ({
    data: {
      dashboardSections: [
        'savings',
        'fixedExpenses',
        'myDebts',
        'thirdPartyDebts',
        'dollarQuotes',
      ],
      enabledCurrencies: ['ARS', 'USD'],
      headerCurrency: 'ARS',
    },
    isSuccess: true,
    isPending: false,
  }),
}))

vi.mock('../dashboard-api', () => ({
  fetchDashboardSummary: vi.fn(),
}))

const quote = (type: 'BLUE' | 'OFICIAL' | 'MEP', venta: number) => ({
  type,
  compra: venta - 10,
  venta,
  casa: 'x',
  nombre: 'y',
  fechaActualizacion: '2026-11-06T00:00:00.000Z',
})

const baseSummary: DashboardSummary = {
  sections: [
    'savings',
    'fixedExpenses',
    'myDebts',
    'thirdPartyDebts',
    'dollarQuotes',
  ],
  savings: {
    enabledCurrencies: ['ARS', 'USD'],
    amounts: { ARS: 1500, USD: 0, EUR: 0 },
  },
  fixedExpenses: {
    period: '2026-11',
    paid: 2,
    pending: 0,
    overdue: 0,
    dueSoon: 0,
  },
  myDebts: {
    peopleOwed: 0,
    peopleWithActiveDebt: 0,
    overdueDebts: 0,
    overdueInstallments: 0,
  },
  thirdPartyDebts: {
    peopleWhoOwe: 0,
    peopleWithOverdue: 0,
    activeDebts: 0,
    overdueInstallments: 0,
  },
  dollarQuotes: {
    BLUE: quote('BLUE', 1200),
    OFICIAL: quote('OFICIAL', 1000),
    MEP: quote('MEP', 1100),
  },
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchDashboardSummary).mockResolvedValue(baseSummary)
  })

  it('muestra ahorros, indicadores y mensajes verdes cuando el valor es cero', async () => {
    renderWithQueryClient(<DashboardPage />)

    expect(await screen.findByText('Ahorros en Pesos')).toBeInTheDocument()
    expect(screen.getByText(/1\.500,00/)).toBeInTheDocument()
    expect(screen.getByText('Sin ahorros.')).toBeInTheDocument()
    expect(
      screen.getByText('Pagaste todos tus gastos fijos del mes.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No le debés a nadie.')).toBeInTheDocument()
    expect(screen.getByText('Nadie te debe dinero.')).toBeInTheDocument()
    expect(screen.getByText('Cotización del dólar')).toBeInTheDocument()
    expect(screen.getByText('Blue')).toBeInTheDocument()
  })

  it('respeta las secciones deshabilitadas', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue({
      ...baseSummary,
      sections: ['savings'],
      savings: {
        enabledCurrencies: ['ARS'],
        amounts: { ARS: 0, USD: 0, EUR: 0 },
      },
      fixedExpenses: null,
      myDebts: null,
      thirdPartyDebts: null,
      dollarQuotes: null,
    })

    renderWithQueryClient(<DashboardPage />)

    expect(
      await screen.findByText('Todavía no registraste ahorros.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Gastos fijos del mes')).not.toBeInTheDocument()
    expect(screen.queryByText('Cotización del dólar')).not.toBeInTheDocument()
  })

  it('muestra un error accionable si falla la carga', async () => {
    vi.mocked(fetchDashboardSummary).mockRejectedValueOnce(
      new Error('sin conexión'),
    )

    renderWithQueryClient(<DashboardPage />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
  })
})
