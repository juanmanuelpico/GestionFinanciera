import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import {
  convertPosition,
  createSaving,
  fetchDollarQuotes,
  fetchSavingEvents,
  fetchSavingsSummary,
  returnPosition,
} from '../savings-api'
import type { SavingsSummary } from '../types'
import { SavingsPage } from './savings-page'

vi.mock('@/features/preferences/preferences-query', () => ({
  usePreferencesQuery: () => ({
    data: { enabledCurrencies: ['ARS', 'USD'], headerCurrency: 'ARS' },
  }),
}))

vi.mock('../savings-api', () => ({
  fetchDollarQuotes: vi.fn(),
  fetchSavingEvents: vi.fn(),
  fetchSavingsSummary: vi.fn(),
  createSaving: vi.fn(),
  adjustPosition: vi.fn(),
  returnPosition: vi.fn(),
  convertPosition: vi.fn(),
}))

const quote = (type: 'BLUE' | 'OFICIAL' | 'MEP', venta: number) => ({
  type,
  compra: venta - 10,
  venta,
  casa: 'x',
  nombre: 'y',
  fechaActualizacion: '2026-11-04T00:00:00.000Z',
})

const emptyPosition = { amount: 0, quoteType: null, quoteRate: null }

const emptySummary: SavingsSummary = {
  enabledCurrencies: ['ARS', 'USD'],
  headerCurrency: 'ARS',
  available: { ARS: 0, USD: 0, EUR: 0 },
  savingsByCurrency: { ARS: 0, USD: 0, EUR: 0 },
  positions: {
    ARS: { ...emptyPosition },
    USD: { ...emptyPosition },
    EUR: { ...emptyPosition },
  },
  estimate: { ars: null, usd: null, usdRateUsed: null },
}

const emptyEvents = {
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
}

const summaryWithUsdPosition: SavingsSummary = {
  ...emptySummary,
  savingsByCurrency: { ARS: 0, USD: 100, EUR: 0 },
  positions: {
    ...emptySummary.positions,
    USD: { amount: 100, quoteType: 'OFICIAL', quoteRate: 1000 },
  },
}

describe('SavingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchDollarQuotes).mockResolvedValue({
      BLUE: quote('BLUE', 1200),
      OFICIAL: quote('OFICIAL', 1000),
      MEP: quote('MEP', 1100),
    })
    vi.mocked(fetchSavingEvents).mockResolvedValue(emptyEvents)
    vi.mocked(fetchSavingsSummary).mockResolvedValue(emptySummary)
    vi.mocked(createSaving).mockResolvedValue({} as never)
    vi.mocked(returnPosition).mockResolvedValue({} as never)
    vi.mocked(convertPosition).mockResolvedValue({} as never)
  })

  it('muestra las cotizaciones de DolarApi y el estimado sin cotización cuando falta', async () => {
    renderWithQueryClient(<SavingsPage />)

    expect(await screen.findByText('Dólar Blue')).toBeInTheDocument()
    expect(screen.getByText('Dólar Oficial')).toBeInTheDocument()
    expect(screen.getByText('Dólar MEP')).toBeInTheDocument()
    expect(
      await screen.findAllByText('Sin cotización'),
    ).not.toHaveLength(0)
  })

  it('valida la cantidad antes de guardar el ahorro', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<SavingsPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar ahorro' }))
    await user.click(screen.getByRole('button', { name: 'Guardar ahorro' }))

    expect(
      await screen.findByText('Ingresá una cantidad mayor a 0'),
    ).toBeInTheDocument()
    expect(createSaving).not.toHaveBeenCalled()
  })

  it('crea un ahorro en ARS descontado de ARS por defecto', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<SavingsPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar ahorro' }))
    await user.type(screen.getByLabelText('Cantidad a ahorrar'), '250')
    await user.click(screen.getByRole('button', { name: 'Guardar ahorro' }))

    await waitFor(() => {
      expect(createSaving).toHaveBeenCalledTimes(1)
    })
    const [payload] = vi.mocked(createSaving).mock.calls[0]
    expect(payload).toMatchObject({
      currency: 'ARS',
      amount: 250,
      debitCurrency: 'ARS',
      note: null,
    })
    expect(payload.quoteType).toBeUndefined()
  })

  it('devuelve un importe parcial elegido en la moneda del totalizador', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSavingsSummary).mockResolvedValue(summaryWithUsdPosition)
    renderWithQueryClient(<SavingsPage />)

    const button = await screen.findByLabelText('Devolver ahorro en USD')
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)

    const input = screen.getByLabelText('Importe a devolver (USD)')
    await user.clear(input)
    await user.type(input, '40')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(returnPosition).toHaveBeenCalledWith('USD', {
        amount: 40,
        walletCurrency: 'ARS',
        sourceQuoteType: 'MANUAL',
        sourceQuoteRate: 1000,
        walletRate: undefined,
      })
    })
  })

  it('devuelve a otra moneda con la cotización de origen elegida', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSavingsSummary).mockResolvedValue(summaryWithUsdPosition)
    renderWithQueryClient(<SavingsPage />)

    const button = await screen.findByLabelText('Devolver ahorro en USD')
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)

    const amount = screen.getByLabelText('Importe a devolver (USD)')
    await user.clear(amount)
    await user.type(amount, '40')

    const sourceRate = screen.getByLabelText('Cotización de USD')
    await user.clear(sourceRate)
    await user.type(sourceRate, '1500')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(returnPosition).toHaveBeenCalledWith('USD', {
        amount: 40,
        walletCurrency: 'ARS',
        sourceQuoteType: 'MANUAL',
        sourceQuoteRate: 1500,
        walletRate: undefined,
      })
    })
  })

  it('convierte un importe parcial con la cotización de origen elegida', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSavingsSummary).mockResolvedValue(summaryWithUsdPosition)
    renderWithQueryClient(<SavingsPage />)

    const button = await screen.findByLabelText('Convertir ahorro en USD')
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)

    const amount = screen.getByLabelText('Importe a convertir (USD)')
    await user.clear(amount)
    await user.type(amount, '40')

    const sourceRate = screen.getByLabelText('Cotización de USD')
    await user.clear(sourceRate)
    await user.type(sourceRate, '1500')

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(convertPosition).toHaveBeenCalledWith('USD', {
        amount: 40,
        currency: 'ARS',
        sourceQuoteType: 'MANUAL',
        sourceQuoteRate: 1500,
        quoteType: undefined,
        quoteRate: undefined,
      })
    })
  })

  it('muestra cotización y movimiento de dinero disponible con signo', async () => {
    vi.mocked(fetchSavingEvents).mockResolvedValue({
      items: [
        {
          id: 2,
          savingId: 1,
          type: 'DEVOLUCION',
          amount: 20,
          currency: 'USD',
          sourceAmount: null,
          sourceCurrency: null,
          quoteType: 'OFICIAL',
          quoteRate: 1000,
          walletImpactAmount: 20000,
          walletImpactCurrency: 'ARS',
          note: null,
          createdAt: '2026-11-04T12:00:00.000Z',
        },
        {
          id: 1,
          savingId: 1,
          type: 'ALTA',
          amount: 100,
          currency: 'USD',
          sourceAmount: null,
          sourceCurrency: null,
          quoteType: 'OFICIAL',
          quoteRate: 1000,
          walletImpactAmount: 100000,
          walletImpactCurrency: 'ARS',
          note: 'compra',
          createdAt: '2026-11-03T12:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })
    renderWithQueryClient(<SavingsPage />)

    expect(await screen.findByText('compra')).toBeInTheDocument()
    expect(screen.getAllByText('Oficial 1000')).toHaveLength(2)
    expect(screen.getByLabelText('Descontó del disponible')).toBeInTheDocument()
    expect(screen.getByLabelText('Sumó al disponible')).toBeInTheDocument()
    expect(screen.getByText(/100\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/20\.000,00/)).toBeInTheDocument()
  })

  it('muestra el monto y la moneda base en una conversión', async () => {
    vi.mocked(fetchSavingEvents).mockResolvedValue({
      items: [
        {
          id: 3,
          savingId: 1,
          type: 'CONVERSION',
          amount: 4,
          currency: 'USD',
          sourceAmount: 10,
          sourceCurrency: 'ARS',
          quoteType: 'MANUAL',
          quoteRate: 2.5,
          walletImpactAmount: null,
          walletImpactCurrency: null,
          note: null,
          createdAt: '2026-11-05T12:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    renderWithQueryClient(<SavingsPage />)

    const typeCell = await screen.findByText('Conversión')
    const row = typeCell.closest('tr')
    expect(row).not.toBeNull()
    expect(
      within(row as HTMLElement).getByText(/Pesos \(ARS\) → Dólar \(USD\)/),
    ).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText(/10,00/)).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText(/4,00/)).toBeInTheDocument()
  })

  it('envía los filtros al historial y vuelve a la primera página', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<SavingsPage />)

    await screen.findByLabelText('Buscar')
    await user.type(screen.getByLabelText('Buscar'), 'compra')

    await waitFor(() => {
      const calls = vi.mocked(fetchSavingEvents).mock.calls
      const last = calls[calls.length - 1][0]
      expect(last).toMatchObject({
        page: 1,
        limit: 20,
        search: 'compra',
      })
    })
  })

  it('pagina el historial con el botón Siguiente', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchSavingEvents).mockResolvedValue({
      items: [
        {
          id: 1,
          savingId: 1,
          type: 'ALTA',
          amount: 100,
          currency: 'USD',
          sourceAmount: null,
          sourceCurrency: null,
          quoteType: 'OFICIAL',
          quoteRate: 1000,
          walletImpactAmount: 100000,
          walletImpactCurrency: 'ARS',
          note: null,
          createdAt: '2026-11-03T12:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 21, totalPages: 2 },
    })
    renderWithQueryClient(<SavingsPage />)

    const next = await screen.findByRole('button', { name: 'Siguiente' })
    await waitFor(() => expect(next).toBeEnabled())
    await user.click(next)

    await waitFor(() => {
      const calls = vi.mocked(fetchSavingEvents).mock.calls
      const last = calls[calls.length - 1][0]
      expect(last?.page).toBe(2)
    })
  })
})
