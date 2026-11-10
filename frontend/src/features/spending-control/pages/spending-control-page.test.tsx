import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import { fetchSpendingControl } from '../spending-control-api'
import type { SpendingControlSummary } from '../types'
import { SpendingControlPage } from './spending-control-page'

vi.mock('../spending-control-api', () => ({
  fetchSpendingControl: vi.fn(),
}))

const fetchMock = vi.mocked(fetchSpendingControl)

const summary: SpendingControlSummary = {
  period: '2026-11',
  rows: [
    {
      categoryId: 1,
      categoryName: 'Alimentos',
      thresholdAmount: '100000.00',
      thresholdCurrency: 'ARS',
      spentAmount: '50000.00',
      percent: 50,
      status: 'OK',
    },
    {
      categoryId: 2,
      categoryName: 'Transporte',
      thresholdAmount: '50000.00',
      thresholdCurrency: 'ARS',
      spentAmount: '42000.00',
      percent: 84,
      status: 'WARNING',
    },
    {
      categoryId: 3,
      categoryName: 'Ocio',
      thresholdAmount: '30000.00',
      thresholdCurrency: 'ARS',
      spentAmount: '31500.00',
      percent: 105,
      status: 'EXCEEDED',
    },
  ],
}

describe('SpendingControlPage', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(summary)
  })

  it('muestra las categorías con umbral y su estado', async () => {
    renderWithQueryClient(<SpendingControlPage />)

    expect((await screen.findAllByText('Alimentos')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Transporte').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ocio').length).toBeGreaterThan(0)
    expect(screen.getAllByText('En control').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Al 80 % o más').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Umbral superado').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/Totales de .*iembre de 2026/),
    ).toBeInTheDocument()
  })

  it('subraya el gastado según el estado del umbral', async () => {
    renderWithQueryClient(<SpendingControlPage />)

    await screen.findAllByText('Transporte')

    const table = screen.getByRole('table')

    const warningCell = within(table)
      .getAllByText(/42\.000/)
      .find((element) => element.className.includes('decoration-warning'))
    expect(warningCell).toBeDefined()

    const exceededCell = within(table)
      .getAllByText(/31\.500/)
      .find((element) => element.className.includes('decoration-destructive'))
    expect(exceededCell).toBeDefined()
  })

  it('filtra por texto de categoría', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<SpendingControlPage />)

    await screen.findAllByText('Alimentos')

    await user.type(
      screen.getByRole('searchbox', { name: /Buscar categoría/i }),
      'Ocio',
    )

    expect(screen.getAllByText('Ocio').length).toBeGreaterThan(0)
    expect(screen.queryByText('Alimentos')).not.toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay umbrales', async () => {
    fetchMock.mockResolvedValue({ period: '2026-11', rows: [] })

    renderWithQueryClient(<SpendingControlPage />)

    expect(
      await screen.findByText('Ninguna categoría con umbral'),
    ).toBeInTheDocument()
  })
})
