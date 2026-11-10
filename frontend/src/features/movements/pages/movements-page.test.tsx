import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCategories } from '@/features/categories/categories-api'
import { renderWithQueryClient } from '@/test/test-utils'
import { createMovement, deleteMovement, fetchMovements } from '../movements-api'
import { MovementsPage } from './movements-page'

vi.mock('../movements-api', () => ({
  fetchMovements: vi.fn(),
  createMovement: vi.fn(),
  updateMovement: vi.fn(),
  deleteMovement: vi.fn(),
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
  }),
}))

const fetchMovementsMock = vi.mocked(fetchMovements)
const deleteMovementMock = vi.mocked(deleteMovement)
const fetchCategoriesMock = vi.mocked(fetchCategories)
const createMovementMock = vi.mocked(createMovement)

const category = {
  id: 1,
  name: 'Alimentos',
  type: 'EGRESO' as const,
  thresholdAmount: null,
  thresholdCurrency: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const movement = {
  id: 1,
  type: 'EGRESO' as const,
  amount: '1500.50',
  categoryId: category.id,
  category,
  movementDate: '2026-11-02T14:30:00.000Z',
  currency: 'ARS' as const,
  paymentMethod: 'CREDITO' as const,
  note: 'Compra semanal',
  createdAt: '2026-11-02T14:30:00.000Z',
  updatedAt: '2026-11-02T14:30:00.000Z',
}

describe('MovementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategoriesMock.mockResolvedValue([category])
    fetchMovementsMock.mockResolvedValue({
      items: [movement],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    deleteMovementMock.mockResolvedValue(undefined)
  })

  it('muestra el listado con sus datos principales', async () => {
    renderWithQueryClient(<MovementsPage />)

    expect(
      screen.getByRole('heading', { name: 'Movimientos' }),
    ).toBeInTheDocument()
    expect((await screen.findAllByText('Alimentos')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Egreso').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ARS').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Compra semanal').length).toBeGreaterThan(0)
  })

  it('abre el modal con fecha actual y moneda ARS por defecto', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<MovementsPage />)

    await screen.findAllByText('Alimentos')
    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }))

    const dateInput = screen.getByLabelText('Fecha y hora')
    expect((dateInput as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    )
    expect(
      screen.getByRole('combobox', { name: 'Moneda' }),
    ).toHaveTextContent('Pesos (ARS)')
  })

  it('bloquea el alta si faltan tipo, importe o categoría', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<MovementsPage />)

    await screen.findAllByText('Alimentos')
    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Seleccioná el tipo de movimiento'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingresá el importe')).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('alert')
        .some((alert) =>
          alert.textContent?.includes('Seleccioná una categoría'),
        ),
    ).toBe(true)
  })

  it('muestra el aviso del umbral al guardar un egreso que supera el 80 %', async () => {
    const user = userEvent.setup()
    createMovementMock.mockResolvedValue({
      ...movement,
      spendingAlert: {
        categoryId: 1,
        categoryName: 'Alimentos',
        currency: 'ARS',
        period: '2026-11',
        thresholdAmount: '100000.00',
        spentAmount: '84000.00',
        percent: 84,
        status: 'WARNING',
      },
    })
    renderWithQueryClient(<MovementsPage />)

    await screen.findAllByText('Alimentos')
    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }))

    await user.click(screen.getByRole('combobox', { name: 'Tipo de movimiento' }))
    await user.click(await screen.findByRole('option', { name: 'Egreso' }))
    await user.type(screen.getByLabelText('Importe'), '1000')
    await user.click(screen.getByRole('combobox', { name: 'Categoría' }))
    await user.click(await screen.findByRole('option', { name: 'Alimentos' }))

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Vas por el 84 % del umbral de «Alimentos»'),
    ).toBeInTheDocument()
  })

  it('pide la página siguiente', async () => {
    const user = userEvent.setup()
    fetchMovementsMock.mockResolvedValue({
      items: [movement],
      meta: { page: 1, limit: 20, total: 2, totalPages: 2 },
    })
    renderWithQueryClient(<MovementsPage />)

    await screen.findAllByText('Alimentos')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() => {
      expect(fetchMovementsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
      )
    })
  })

  it('elimina un movimiento después de confirmar', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<MovementsPage />)

    await screen.findAllByText('Alimentos')
    await user.click(
      screen.getByRole('button', { name: 'Eliminar movimiento 1' }),
    )

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Eliminar movimiento')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(deleteMovementMock).toHaveBeenCalledWith(movement.id)
    })
  })
})
