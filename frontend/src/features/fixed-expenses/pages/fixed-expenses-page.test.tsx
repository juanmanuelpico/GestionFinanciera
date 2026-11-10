import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fetchCategories } from '@/features/categories/categories-api'
import { renderWithQueryClient } from '@/test/test-utils'
import {
  createFixedExpense,
  fetchFixedExpenseHistory,
  fetchFixedExpenses,
  fetchProjections,
  payFixedExpense,
  updateFixedExpense,
} from '../fixed-expenses-api'
import { currentPeriodValue } from '../recurrence'
import type {
  FixedExpense,
  FixedExpenseProjection,
} from '../types'
import { FixedExpenseHistoryPage } from './fixed-expense-history-page'
import { FixedExpensesPage } from './fixed-expenses-page'

vi.mock('../fixed-expenses-api', () => ({
  fetchFixedExpenses: vi.fn(),
  fetchProjections: vi.fn(),
  createFixedExpense: vi.fn(),
  updateFixedExpense: vi.fn(),
  payFixedExpense: vi.fn(),
  fetchFixedExpenseHistory: vi.fn(),
}))

vi.mock('@/features/categories/categories-api', () => ({
  fetchCategories: vi.fn(),
}))

vi.mock('@/features/preferences/preferences-query', () => ({
  usePreferencesQuery: () => ({
    data: {
      enabledCurrencies: ['ARS'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: [
        'EFECTIVO',
        'DEBITO',
        'CREDITO',
        'TRANSFERENCIA',
        'MERCADO_PAGO',
        'OTRO',
      ],
    },
    isSuccess: true,
  }),
}))

const fetchFixedExpensesMock = vi.mocked(fetchFixedExpenses)
const fetchProjectionsMock = vi.mocked(fetchProjections)
const createFixedExpenseMock = vi.mocked(createFixedExpense)
const updateFixedExpenseMock = vi.mocked(updateFixedExpense)
const payFixedExpenseMock = vi.mocked(payFixedExpense)
const fetchFixedExpenseHistoryMock = vi.mocked(fetchFixedExpenseHistory)
const fetchCategoriesMock = vi.mocked(fetchCategories)

const category = {
  id: 1,
  name: 'Vivienda',
  type: 'EGRESO' as const,
  thresholdAmount: null,
  thresholdCurrency: null,
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

const pendingProjection: FixedExpenseProjection = {
  fixedExpenseId: 'fx-1',
  title: 'Alquiler',
  amount: '45000.00',
  currency: 'ARS',
  categoryId: 1,
  category,
  intervalMonths: 1,
  active: true,
  period,
  dueDate: `${period}-10`,
  status: 'PENDIENTE',
  payment: null,
}

const paidProjection: FixedExpenseProjection = {
  ...pendingProjection,
  fixedExpenseId: 'fx-2',
  title: 'Patente',
  amount: '18000.00',
  intervalMonths: 6,
  status: 'PAGADO',
  payment: {
    id: 'pay-2',
    period,
    dueDate: `${period}-15`,
    paidAt: '2026-11-01T10:00:00.000Z',
    amount: '18350.00',
    currency: 'ARS',
    paymentMethod: 'DEBITO',
    movement: {
      id: 9,
      categoryId: 1,
      category: { id: 1, name: 'Vivienda' },
      note: 'Gasto fijo: Patente',
    },
  },
}

function renderPage() {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={['/fixed-expenses']}>
      <Routes>
        <Route path="/fixed-expenses" element={<FixedExpensesPage />} />
        <Route
          path="/fixed-expenses/:expenseId/history"
          element={<FixedExpenseHistoryPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('FixedExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategoriesMock.mockResolvedValue([category])
    fetchFixedExpensesMock.mockResolvedValue([expense])
    fetchProjectionsMock.mockResolvedValue([pendingProjection, paidProjection])
    fetchFixedExpenseHistoryMock.mockResolvedValue({
      fixedExpense: expense,
      items: [paidProjection.payment!],
    })
  })

  it('muestra la previsión mensual con su estado', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Gastos fijos' }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(fetchProjectionsMock).toHaveBeenCalledWith(period)
    })

    expect((await screen.findAllByText('Alquiler')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pagado').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(
        /18\.350|18350/,
      ).length,
    ).toBeGreaterThan(0)
  })

  it('crea un gasto fijo semestral', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')
    await user.click(screen.getByRole('button', { name: 'Nuevo gasto fijo' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText('Título'),
      'Patente del auto',
    )
    await user.type(
      within(dialog).getByLabelText('Importe estimado'),
      '18000.00',
    )
    await user.clear(within(dialog).getByLabelText('Se repite cada'))
    await user.type(within(dialog).getByLabelText('Se repite cada'), '6')
    await user.click(
      within(dialog).getByRole('combobox', { name: 'Categoría' }),
    )
    await user.click(await screen.findByRole('option', { name: 'Vivienda' }))

    createFixedExpenseMock.mockResolvedValue(expense)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(createFixedExpenseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Patente del auto',
          amount: 18000,
          currency: 'ARS',
          categoryId: 1,
          intervalMonths: 6,
          active: true,
        }),
      )
    })
  })

  it('valida el formulario antes de enviar', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')
    await user.click(screen.getByRole('button', { name: 'Nuevo gasto fijo' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(
      await within(dialog).findByText('El título es obligatorio'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Ingresá el importe'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getAllByRole('alert').some((alert) =>
        alert.textContent?.includes('Seleccioná una categoría'),
      ),
    ).toBe(true)
    expect(createFixedExpenseMock).not.toHaveBeenCalled()
  })

  it('paga la previsión pendiente con importe real ajustado', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')
    const payButtons = await screen.findAllByRole('button', { name: 'Pagar' })
    await user.click(payButtons[0])

    const dialog = await screen.findByRole('dialog')
    const amountInput = within(dialog).getByLabelText('Importe pagado')
    expect(amountInput).toHaveValue('45000.00')

    await user.clear(amountInput)
    await user.type(amountInput, '46250.50')

    payFixedExpenseMock.mockResolvedValue(paidProjection.payment!)
    await user.click(
      within(dialog).getByRole('button', { name: 'Registrar pago' }),
    )

    await waitFor(() => {
      expect(payFixedExpenseMock).toHaveBeenCalledWith(
        'fx-1',
        expect.objectContaining({
          period,
          amount: 46250.5,
          paymentMethod: null,
        }),
      )
    })
  })

  it('no ofrece pagar la previsión ya pagada', async () => {
    renderPage()

    await screen.findAllByText('Patente')
    await waitFor(() => {
      expect(screen.getAllByText('Pagado').length).toBeGreaterThan(0)
    })

    const patentRow = screen
      .getAllByText('Patente')
      .find((element) => element.closest('tr') ?? element.closest('li'))
    const container = patentRow?.closest('li') ?? patentRow?.closest('tr')

    expect(container).not.toBeNull()
    expect(
      within(container as HTMLElement).queryByText('Pagar'),
    ).not.toBeInTheDocument()
  })

  it('activa y desactiva desde la solapa Mis gastos fijos', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')
    await user.click(screen.getByRole('tab', { name: 'Mis gastos fijos' }))

    await waitFor(() => {
      expect(fetchFixedExpensesMock).toHaveBeenCalled()
    })

    updateFixedExpenseMock.mockResolvedValue({ ...expense, active: false })
    await user.click(
      screen.getByRole('button', { name: 'Desactivar Alquiler' }),
    )

    await waitFor(() => {
      expect(updateFixedExpenseMock).toHaveBeenCalledWith('fx-1', {
        active: false,
      })
    })
  })

  it('navega al historial desde la previsión', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')
    await user.click(
      screen.getByRole('button', { name: 'Ver historial de Alquiler' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Historial de pagos' }),
    ).toBeInTheDocument()
    expect(fetchFixedExpenseHistoryMock).toHaveBeenCalledWith('fx-1')
  })

  it('filtra la previsión por gasto y estado', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')

    await user.type(screen.getByLabelText('Gasto'), 'patente')

    await waitFor(() => {
      expect(screen.queryByText('Alquiler')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Patente').length).toBeGreaterThan(0)

    await user.clear(screen.getByLabelText('Gasto'))
    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Pendiente' }))

    await waitFor(() => {
      expect(screen.queryByText('Patente')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Alquiler').length).toBeGreaterThan(0)

    expect(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    ).toBeEnabled()
  })

  it('filtra mis gastos fijos por estado y permite limpiar', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('Alquiler')
    await user.click(screen.getByRole('tab', { name: 'Mis gastos fijos' }))

    await waitFor(() => {
      expect(fetchFixedExpensesMock).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('combobox', { name: 'Estado' }))
    await user.click(await screen.findByRole('option', { name: 'Inactivo' }))

    expect(
      await screen.findByText('No hay gastos que coincidan con los filtros'),
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0])

    await waitFor(() => {
      expect(
        screen.queryByText('No hay gastos que coincidan con los filtros'),
      ).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Alquiler').length).toBeGreaterThan(0)
  })
})
