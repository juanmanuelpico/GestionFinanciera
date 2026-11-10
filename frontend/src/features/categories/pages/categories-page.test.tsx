import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
} from '../categories-api'
import { CategoriesPage } from './categories-page'

vi.mock('../categories-api', () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

const fetchCategoriesMock = vi.mocked(fetchCategories)
const createCategoryMock = vi.mocked(createCategory)
const deleteCategoryMock = vi.mocked(deleteCategory)

const category = {
  id: 1,
  name: 'Alimentos',
  type: 'EGRESO' as const,
  thresholdAmount: null,
  thresholdCurrency: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchCategoriesMock.mockResolvedValue([category])
    createCategoryMock.mockResolvedValue(category)
    deleteCategoryMock.mockResolvedValue(undefined)
  })

  it('muestra las categorías del usuario', async () => {
    renderWithQueryClient(<CategoriesPage />)

    expect(
      screen.getByRole('heading', { name: 'Categorías' }),
    ).toBeInTheDocument()
    expect((await screen.findAllByText('Alimentos')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Egreso').length).toBeGreaterThan(0)
  })

  it('valida y crea una categoría desde el modal', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<CategoriesPage />)

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('El nombre es obligatorio'),
    ).toBeInTheDocument()
    expect(createCategoryMock).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Nombre'), 'Transporte')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(createCategoryMock).toHaveBeenCalledWith({
        name: 'Transporte',
        type: null,
        thresholdAmount: null,
        thresholdCurrency: null,
      })
    })
  })

  it('crea una categoría con umbral máximo y moneda', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<CategoriesPage />)

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await user.type(screen.getByLabelText('Nombre'), 'Alquiler temporario')
    await user.type(screen.getByLabelText('Umbral máximo'), '50000')
    await user.click(screen.getByRole('combobox', { name: 'Moneda del umbral' }))
    await user.click(await screen.findByRole('option', { name: 'ARS' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(createCategoryMock).toHaveBeenCalledWith({
        name: 'Alquiler temporario',
        type: null,
        thresholdAmount: 50000,
        thresholdCurrency: 'ARS',
      })
    })
  })

  it('exige una moneda cuando se informa el umbral', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<CategoriesPage />)

    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    await user.type(screen.getByLabelText('Nombre'), 'Cena fuera')
    await user.type(screen.getByLabelText('Umbral máximo'), '20000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Elegí la moneda del umbral'),
    ).toBeInTheDocument()
    expect(createCategoryMock).not.toHaveBeenCalled()
  })

  it('muestra el umbral mensual en la lista de categorías', async () => {
    fetchCategoriesMock.mockResolvedValue([
      { ...category, thresholdAmount: '50000.00', thresholdCurrency: 'ARS' },
    ])
    renderWithQueryClient(<CategoriesPage />)

    await screen.findAllByText('Alimentos')
    expect(
      screen.getAllByText(/50\.000,00 \/ mes/).length,
    ).toBeGreaterThan(0)
  })

  it('elimina una categoría después de confirmar', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<CategoriesPage />)

    await screen.findAllByText('Alimentos')
    await user.click(
      screen.getAllByRole('button', { name: 'Eliminar Alimentos' })[0],
    )

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Eliminar categoría')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(deleteCategoryMock).toHaveBeenCalledWith(category.id)
    })
  })

  it('muestra el motivo si la categoría tiene movimientos asociados (S2)', async () => {
    const user = userEvent.setup()
    const message =
      'No se puede eliminar la categoría porque tiene movimientos asociados'
    deleteCategoryMock.mockRejectedValue(
      new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { message },
      } as AxiosResponse),
    )
    renderWithQueryClient(<CategoriesPage />)

    await screen.findAllByText('Alimentos')
    await user.click(
      screen.getAllByRole('button', { name: 'Eliminar Alimentos' })[0],
    )
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    expect(await within(dialog).findByText(message)).toBeInTheDocument()
  })
})
