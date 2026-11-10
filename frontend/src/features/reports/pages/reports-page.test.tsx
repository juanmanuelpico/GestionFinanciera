import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import { fetchSpendingControl } from '@/features/spending-control/spending-control-api'
import {
  fetchCategoryAverages,
  fetchDebtsStats,
  fetchFixedExpensesMonthly,
  fetchSavingsMonthly,
  fetchTopCategories,
} from '../reports-api'
import { presetPeriod } from '../report-period'
import { ReportsPage } from './reports-page'

vi.mock('../reports-api', () => ({
  fetchSavingsMonthly: vi.fn(),
  fetchTopCategories: vi.fn(),
  fetchCategoryAverages: vi.fn(),
  fetchDebtsStats: vi.fn(),
  fetchFixedExpensesMonthly: vi.fn(),
}))

vi.mock('@/features/spending-control/spending-control-api', () => ({
  fetchSpendingControl: vi.fn(),
}))

vi.mock('@/features/preferences/preferences-query', () => ({
  PREFERENCES_QUERY_KEY: ['user-preferences'],
  usePreferencesQuery: () => ({
    isSuccess: true,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    data: {
      enabledCurrencies: ['ARS', 'USD'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: ['EFECTIVO'],
      themeColor: 'blue',
      themeMode: 'light',
    },
  }),
}))

const savingsMock = vi.mocked(fetchSavingsMonthly)
const topMock = vi.mocked(fetchTopCategories)
const averagesMock = vi.mocked(fetchCategoryAverages)
const debtsMock = vi.mocked(fetchDebtsStats)
const fixedMock = vi.mocked(fetchFixedExpensesMonthly)
const spendingMock = vi.mocked(fetchSpendingControl)

const savingsReport = {
  currency: 'ARS' as const,
  from: '2025-12',
  to: '2026-11',
  items: [
    { period: '2026-09', contributed: 100, returned: 0, net: 100 },
    { period: '2026-10', contributed: 150, returned: 30, net: 120 },
    { period: '2026-11', contributed: 0, returned: 0, net: 0 },
  ],
  summary: {
    totalContributed: 250,
    totalReturned: 30,
    totalNet: 220,
    averageMonthlyContributed: 83.33,
    averageMonthlyNet: 73.33,
  },
}

const topReport = {
  currency: 'ARS' as const,
  from: '2025-12',
  to: '2026-11',
  totalMovements: 12,
  items: [
    {
      categoryId: 2,
      categoryName: 'Transporte',
      type: 'EGRESO' as const,
      count: 8,
      totalAmount: 800,
      sharePercent: 66.67,
    },
    {
      categoryId: 1,
      categoryName: 'Alimentos',
      type: 'EGRESO' as const,
      count: 4,
      totalAmount: 1200,
      sharePercent: 33.33,
    },
  ],
}

const averagesReport = {
  currency: 'ARS' as const,
  from: '2025-12',
  to: '2026-11',
  monthCount: 12,
  items: [
    {
      categoryId: 1,
      categoryName: 'Alimentos',
      type: 'EGRESO' as const,
      count: 4,
      totalAmount: 1200,
      monthlyAverage: 100,
    },
  ],
}

const debtsReport = {
  currency: 'ARS' as const,
  from: '2025-12',
  to: '2026-11',
  kpis: {
    ownOutstanding: 600,
    ownOverdueAmount: 100,
    ownActiveDebts: 1,
    thirdOutstanding: 200,
    thirdOverdueAmount: 50,
    thirdActiveDebts: 2,
    overdueInstallments: 1,
    paidInstallmentsPercent: 25,
  },
  series: [{ period: '2026-11', received: 100, paid: 40 }],
  topDebtors: [
    { actorId: 'actor-1', displayName: 'Juan Pérez', outstanding: 200 },
  ],
}

const fixedReport = {
  currency: 'ARS' as const,
  from: '2025-12',
  to: '2026-11',
  items: [
    {
      period: '2026-11',
      expected: 1000,
      paid: 1000,
      dueCount: 1,
      paidCount: 1,
      compliancePercent: 100,
    },
  ],
  summary: { totalExpected: 1000, totalPaid: 1000 },
}

const spendingSummary = {
  period: '2026-11',
  rows: [
    {
      categoryId: 3,
      categoryName: 'Restaurant',
      thresholdAmount: '50000.00',
      thresholdCurrency: 'ARS',
      spentAmount: '45000.00',
      percent: 90,
      status: 'WARNING' as const,
    },
  ],
}

function renderPage(initialRoute = '/reports') {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ReportsPage />
    </MemoryRouter>,
  )
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    savingsMock.mockResolvedValue(savingsReport)
    topMock.mockResolvedValue(topReport)
    averagesMock.mockResolvedValue(averagesReport)
    debtsMock.mockResolvedValue(debtsReport)
    fixedMock.mockResolvedValue(fixedReport)
    spendingMock.mockResolvedValue(spendingSummary)
  })

  it('arranca en la solapa Ahorros con el período por defecto', async () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Reportes y Estadísticas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ahorros' })).toHaveAttribute(
      'data-state',
      'active',
    )

    await waitFor(() =>
      expect(savingsMock).toHaveBeenCalledWith({
        ...presetPeriod('LAST_12'),
        currency: 'ARS',
      }),
    )

    expect(
      await screen.findByText('Ahorros por mes'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ahorro promedio mensual (neto)'),
    ).toBeInTheDocument()
    expect(screen.getByText('Aportes del período')).toBeInTheDocument()
  })

  it('los presets actualizan el período consultado', async () => {
    const user = userEvent.setup()
    renderPage()

    savingsMock.mockClear()
    await user.click(
      screen.getByRole('button', { name: 'Últimos 3 meses' }),
    )

    const preset = presetPeriod('LAST_3')
    await waitFor(() =>
      expect(savingsMock).toHaveBeenCalledWith({
        from: preset.from,
        to: preset.to,
        currency: 'ARS',
      }),
    )
  })

  it('en Movimientos se consulta el Top N y se puede cambiar N', async () => {
    const user = userEvent.setup()
    renderPage('/reports?tab=movimientos')

    await waitFor(() =>
      expect(topMock).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'ARS' }),
        { type: 'EGRESO', limit: 10 },
      ),
    )
    expect(await screen.findByText('Categorías más usadas')).toBeInTheDocument()

    topMock.mockClear()
    const limitSelect = screen.getByRole('combobox', { name: 'Top N' })
    await user.click(limitSelect)
    await user.click(
      await screen.findByRole('option', { name: 'Top 5' }),
    )

    await waitFor(() =>
      expect(topMock).toHaveBeenCalledWith(
        expect.anything(),
        { type: 'EGRESO', limit: 5 },
      ),
    )

    expect(
      await screen.findByText('Media de gasto por categoría'),
    ).toBeInTheDocument()
    expect(averagesMock).toHaveBeenCalled()
  })

  it('Deudas muestra KPIs, serie y ranking de deudores', async () => {
    renderPage('/reports?tab=deudas')

    expect(await screen.findByText('Te deben (terceros)')).toBeInTheDocument()
    expect(screen.getByText('Vos debés')).toBeInTheDocument()
    expect(screen.getByText('Cobros y pagos por mes')).toBeInTheDocument()
    expect(
      await screen.findByText(/Juan Pérez/),
    ).toBeInTheDocument()
    expect(debtsMock).toHaveBeenCalled()
  })

  it('respeta la solapa de Control de Gastos en la URL', async () => {
    renderPage('/reports?tab=control')

    expect(screen.getByRole('tab', { name: 'Control de Gastos' })).toHaveAttribute(
      'data-state',
      'active',
    )

    expect(await screen.findByText('Umbrales del mes actual')).toBeInTheDocument()
    expect(spendingMock).toHaveBeenCalled()
    expect(await screen.findByText('Restaurant')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: /Consumo de Restaurant/ }),
    ).toBeInTheDocument()
  })

  it('Gastos Fijos muestra esperado contra pagado', async () => {
    renderPage('/reports?tab=gastos-fijos')

    expect(
      await screen.findByText('Gastos fijos por mes'),
    ).toBeInTheDocument()
    expect(screen.getByText('Cumplimiento')).toBeInTheDocument()
    expect(fixedMock).toHaveBeenCalled()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0)
  })
})
