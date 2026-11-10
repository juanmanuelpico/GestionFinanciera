import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { renderWithQueryClient } from '@/test/test-utils'
import { fetchFixedExpenseHistory } from '../fixed-expenses-api'
import { currentPeriodValue } from '../recurrence'
import type { FixedExpense, FixedExpensePayment } from '../types'
import { FixedExpenseHistoryPage } from './fixed-expense-history-page'

vi.mock('../fixed-expenses-api', () => ({
  fetchFixedExpenseHistory: vi.fn(),
}))

const fetchHistoryMock = vi.mocked(fetchFixedExpenseHistory)

const category = {
  id: 1,
  name: 'Vivienda',
  type: 'EGRESO' as const,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const period = currentPeriodValue()

const expense: FixedExpense = {
  id: 'fx-1',
  title: 'Alquiler',
  amount: '45000.00',
  currency: 'ARS',
  categoryId: 1,
  category,
  firstDueDate: '2026-05-10',
  dueDay: 10,
  intervalMonths: 1,
  active: true,
  nextDueDate: `${period}-10`,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
}

const payment: FixedExpensePayment = {
  id: 'pay-1',
  period,
  dueDate: `${period}-10`,
  paidAt: '2026-11-08T15:30:00.000Z',
  amount: '46250.50',
  currency: 'ARS',
  paymentMethod: 'DEBITO',
  movement: {
    id: 12,
    categoryId: 1,
    category: { id: 1, name: 'Vivienda' },
    note: 'Gasto fijo: Alquiler',
  },
}

function renderHistory() {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[`/fixed-expenses/${expense.id}/history`]}>
      <Routes>
        <Route
          path="/fixed-expenses/:expenseId/history"
          element={<FixedExpenseHistoryPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FixedExpenseHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el resumen del gasto y cada pago', async () => {
    fetchHistoryMock.mockResolvedValue({ fixedExpense: expense, items: [payment] })

    renderHistory()

    expect(
      await screen.findByRole('heading', { name: 'Historial de pagos' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('1 pago registrado')).toBeInTheDocument()

    expect(screen.getAllByText('Alquiler').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/46\.250,50|46250\.50/).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Débito').length).toBeGreaterThan(0)
    expect(screen.getAllByText('#12').length).toBeGreaterThan(0)
  })

  it('muestra el estado vacío cuando no hay pagos', async () => {
    fetchHistoryMock.mockResolvedValue({ fixedExpense: expense, items: [] })

    renderHistory()

    expect(
      await screen.findByText('Todavía no pagaste este gasto fijo'),
    ).toBeInTheDocument()
  })
})
