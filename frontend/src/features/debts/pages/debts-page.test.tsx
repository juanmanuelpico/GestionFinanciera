import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithQueryClient } from '@/test/test-utils'
import {
  createDebtActor,
  createDebtSplit,
  deleteDebtSplit,
  fetchDebt,
  fetchDebtActors,
  fetchDebtSettlements,
  fetchDebtSplits,
  fetchDebts,
  payDebt,
  reverseDebtSettlement,
} from '../debts-api'
import { DebtsPage } from './debts-page'

vi.mock('../debts-api', () => ({
  fetchDebts: vi.fn(),
  fetchDebt: vi.fn(),
  createDebt: vi.fn(),
  fetchDebtActors: vi.fn(),
  createDebtActor: vi.fn(),
  updateDebtActor: vi.fn(),
  deleteDebtActor: vi.fn(),
  fetchDebtSettlements: vi.fn(),
  payDebt: vi.fn(),
  reverseDebtSettlement: vi.fn(),
  fetchDebtSplits: vi.fn(),
  createDebtSplit: vi.fn(),
  deleteDebtSplit: vi.fn(),
}))

vi.mock('@/features/preferences/preferences-query', () => ({
  PREFERENCES_QUERY_KEY: ['user-preferences'],
  usePreferencesQuery: () => ({
    isSuccess: true,
    data: {
      enabledCurrencies: ['ARS'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: ['EFECTIVO'],
      themeColor: 'blue',
      themeMode: 'light',
    },
  }),
}))

vi.mock('@/features/savings/savings-api', () => ({
  fetchAvailable: vi.fn(async () => ({ ARS: 1000, USD: 0, EUR: 0 })),
}))

const fetchDebtsMock = vi.mocked(fetchDebts)
const fetchDebtMock = vi.mocked(fetchDebt)
const fetchDebtActorsMock = vi.mocked(fetchDebtActors)
const createDebtActorMock = vi.mocked(createDebtActor)
const fetchDebtSettlementsMock = vi.mocked(fetchDebtSettlements)
const payDebtMock = vi.mocked(payDebt)
const reverseMock = vi.mocked(reverseDebtSettlement)
const fetchDebtSplitsMock = vi.mocked(fetchDebtSplits)
const createDebtSplitMock = vi.mocked(createDebtSplit)
const deleteDebtSplitMock = vi.mocked(deleteDebtSplit)

const thirdPartyDebt = {
  id: 'debt-1',
  kind: 'TERCERO' as const,
  code: 'DT1',
  status: 'ACTIVA' as const,
  currency: 'ARS' as const,
  totalAmount: '100.00',
  installmentCount: 3,
  operationDate: '2026-11-06',
  firstDueDate: '2026-12-10',
  note: null,
  splitCode: null,
  paymentProgress: 'NONE' as const,
  hasActiveSettlement: true,
  actor: {
    id: 'actor-1',
    type: 'PERSONA' as const,
    displayName: 'Juan Pérez',
    brand: null,
    issuer: null,
    lastFour: null,
  },
  createdAt: '2026-11-06T12:00:00.000Z',
  paidInstallments: 0,
  paidAmount: '0.00',
  remainingAmount: '100.00',
  nextDueDate: '2026-12-10',
}

const ownDebt = {
  ...thirdPartyDebt,
  id: 'debt-2',
  kind: 'PROPIA' as const,
  code: 'DP1',
  actor: { ...thirdPartyDebt.actor, id: 'actor-2', displayName: 'Visa Galicia', type: 'TARJETA' as const, brand: 'Visa', lastFour: '1234' },
  hasActiveSettlement: false,
}

const debtDetail = {
  ...thirdPartyDebt,
  installments: [
    {
      id: 'i1',
      number: 1,
      dueDate: '2026-12-10',
      amount: '33.33',
      paidAmount: '0.00',
      paidAt: null,
    },
    {
      id: 'i2',
      number: 2,
      dueDate: '2027-01-10',
      amount: '33.33',
      paidAmount: '0.00',
      paidAt: null,
    },
    {
      id: 'i3',
      number: 3,
      dueDate: '2027-02-10',
      amount: '33.34',
      paidAmount: '0.00',
      paidAt: null,
    },
  ],
}

const settlement = {
  id: 'st-1',
  debtId: 'debt-1',
  walletCurrency: 'ARS' as const,
  paymentDate: '2026-12-10',
  totalAmount: '66.66',
  installmentCount: 2,
  status: 'ACTIVA' as const,
  reversedAt: null,
  createdAt: '2026-12-10T12:00:00.000Z',
  items: [
    { id: 'item-1', installmentId: 'i1', installmentNumber: 1, amount: '33.33' },
    { id: 'item-2', installmentId: 'i2', installmentNumber: 2, amount: '33.33' },
  ],
}

const actor = {
  id: 'actor-1',
  type: 'PERSONA' as const,
  displayName: 'Juan Pérez',
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: null,
  email: null,
  alias: null,
  issuer: null,
  brand: null,
  lastFour: null,
  closingDay: null,
  paymentDueDay: null,
  defaultWalletCurrency: null,
  debtCount: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const split = {
  id: 'split-1',
  code: 'DG1',
  currency: 'ARS' as const,
  totalAmount: '100.00',
  userAmount: '40.00',
  payer: 'USER' as const,
  payerActorId: null,
  payerDisplayName: null,
  note: 'asado del sábado',
  operationDate: '2026-11-08',
  items: [{ actorId: 'actor-1', displayName: 'Juan Pérez', amount: '60.00' }],
  debts: [
    { id: 'debt-9', code: 'DT1', kind: 'TERCERO' as const, totalAmount: '60.00' },
  ],
  createdAt: '2026-11-08T12:00:00.000Z',
}

const emptySplits = {
  items: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
}

const oneSplitPage = {
  items: [split],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

function renderPage(initialRoute = '/debts') {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialRoute]}>
      <DebtsPage />
    </MemoryRouter>,
  )
}

describe('DebtsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    fetchDebtsMock.mockImplementation(async (query) =>
      query.kind === 'TERCERO'
        ? {
            items: [thirdPartyDebt],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }
        : {
            items: [ownDebt],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
    )
    fetchDebtActorsMock.mockResolvedValue({
      items: [actor],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    fetchDebtMock.mockResolvedValue(debtDetail)
    fetchDebtSettlementsMock.mockResolvedValue([settlement])
    payDebtMock.mockResolvedValue(debtDetail)
    reverseMock.mockResolvedValue(debtDetail)
    fetchDebtSplitsMock.mockResolvedValue(emptySplits)
    createDebtSplitMock.mockResolvedValue(split)
    createDebtActorMock.mockResolvedValue(actor as never)
    deleteDebtSplitMock.mockResolvedValue(undefined)
  })

  it('renderiza las solapas y arranca en Deudas Propias', async () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Deudas' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Deudas Propias' })).toHaveAttribute(
      'data-state',
      'active',
    )
    expect(screen.getByRole('tab', { name: 'Deudas de Terceros' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'División de Gastos' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Actores' })).toBeInTheDocument()

    await waitFor(() =>
      expect(fetchDebtsMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'PROPIA' }),
      ),
    )
    expect((await screen.findAllByText('Visa Galicia')).length).toBeGreaterThan(0)
  })

  it('cambia de solapa y consulta las deudas de terceros', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: 'Deudas de Terceros' }))

    await waitFor(() =>
      expect(fetchDebtsMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'TERCERO' }),
      ),
    )
    expect((await screen.findAllByText('Juan Pérez')).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('button', { name: 'Cobrar' }).length,
    ).toBeGreaterThan(0)
  })

  it('respeta la solapa indicada en la URL', async () => {
    renderPage('/debts?tab=actores')

    expect(screen.getByRole('tab', { name: 'Actores' })).toHaveAttribute(
      'data-state',
      'active',
    )
    expect((await screen.findAllByText('Juan Pérez')).length).toBeGreaterThan(0)
  })

  it('muestra el código DP/DT en la grilla de deudas', async () => {
    renderPage('/debts?tab=terceros')

    expect((await screen.findAllByText('DT1')).length).toBeGreaterThan(0)
  })

  it('marca como parcialmente cobrada una deuda con pagos parciales', async () => {
    fetchDebtsMock.mockImplementation(async (query) =>
      query.kind === 'TERCERO'
        ? {
            items: [{ ...thirdPartyDebt, paymentProgress: 'PARTIAL' as const }],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }
        : {
            items: [ownDebt],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
    )
    renderPage('/debts?tab=terceros')

    expect(
      (await screen.findAllByText('Parcialmente cobrada')).length,
    ).toBeGreaterThan(0)
  })

  it('filtra por descripción y reenvía el texto a la API', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.type(
      screen.getByLabelText('Descripción'),
      'zapatillas',
    )

    await waitFor(() =>
      expect(fetchDebtsMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'zapatillas' }),
      ),
    )
  })

  it('abre la visualización completa con historial al hacer click en una deuda', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    const table = await screen.findByRole('table')
    await user.click(within(table).getByText('DT1'))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Descripción')).toBeInTheDocument()
    expect(within(dialog).getByText('Cuotas')).toBeInTheDocument()
    expect(within(dialog).getByText('Historial')).toBeInTheDocument()
    expect(
      await within(dialog).findByText(/Deuda creada \(DT1\)/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Cobro de/)).toBeInTheDocument()
  })

  it('el botón Agregar abre el formulario según la solapa', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(
      await screen.findByRole('heading', { name: 'Nueva deuda propia' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('tab', { name: 'Actores' }))
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(
      await screen.findByRole('heading', { name: 'Nuevo actor' }),
    ).toBeInTheDocument()
  })

  it('exige una descripción al intentar crear una deuda', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    const dialog = await screen.findByRole('dialog')

    await user.click(
      within(dialog).getByRole('button', { name: 'Crear deuda' }),
    )

    expect(
      within(dialog).getByText('Ingresá una descripción'),
    ).toBeInTheDocument()
  })

  it('cobra dos cuotas desde el diálogo y llama a la API', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.click(screen.getAllByRole('button', { name: 'Cobrar' })[0]!)

    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Cuota 1/3')

    const quantityInput = within(dialog).getByLabelText(/Cantidad de cuotas/)
    await user.clear(quantityInput)
    await user.type(quantityInput, '2')

    await user.click(
      within(dialog).getByRole('button', { name: /Cobrar 2 cuotas/ }),
    )

    await waitFor(() =>
      expect(payDebtMock).toHaveBeenCalledWith(
        'debt-1',
        expect.objectContaining({
          quantity: 2,
          amounts: [33.33, 33.33],
        }),
      ),
    )
    const payload = payDebtMock.mock.calls[0]![1]
    expect(payload.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/)
  })

  it('sugiere el saldo restante dividido entre las cuotas pendientes', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.click(screen.getAllByRole('button', { name: 'Cobrar' })[0]!)

    const dialog = await screen.findByRole('dialog')
    const amountInput = within(dialog).getByLabelText(/Importe a cobrar/)

    expect(amountInput).toHaveValue('33.33')
  })

  it('mantiene pendiente una cuota con pago parcial y recalcula la sugerencia', async () => {
    const user = userEvent.setup()

    fetchDebtMock.mockResolvedValue({
      ...debtDetail,
      paidAmount: '20.00',
      remainingAmount: '80.00',
      installments: [
        { ...debtDetail.installments[0]!, paidAmount: '20.00' },
        debtDetail.installments[1]!,
        debtDetail.installments[2]!,
      ],
    })

    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.click(screen.getAllByRole('button', { name: 'Cobrar' })[0]!)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Cuota 1/3')).toBeInTheDocument()

    const amountInput = within(dialog).getByLabelText(/Importe a cobrar/)
    expect(amountInput).toHaveValue('26.67')
  })

  it('permite cancelar toda la deuda usando una sola cuota', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.click(screen.getAllByRole('button', { name: 'Cobrar' })[0]!)

    const dialog = await screen.findByRole('dialog')
    const amountInput = within(dialog).getByLabelText(/Importe a cobrar/)
    await user.clear(amountInput)
    await user.type(amountInput, '100')

    await user.click(
      within(dialog).getByRole('button', { name: 'Cobrar 1 cuota' }),
    )

    await waitFor(() =>
      expect(payDebtMock).toHaveBeenCalledWith(
        'debt-1',
        expect.objectContaining({ quantity: 1, amounts: [100] }),
      ),
    )
  })

  it('no permite cobrar o pagar más que el saldo restante', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.click(screen.getAllByRole('button', { name: 'Cobrar' })[0]!)

    const dialog = await screen.findByRole('dialog')
    const amountInput = within(dialog).getByLabelText(/Importe a cobrar/)
    await user.clear(amountInput)
    await user.type(amountInput, '100.01')

    expect(
      within(dialog).getByText(/El total no puede superar el saldo restante/),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Cobrar 1 cuota' }),
    ).toBeDisabled()

    await user.click(
      within(dialog).getByRole('button', { name: 'Cobrar 1 cuota' }),
    )
    expect(payDebtMock).not.toHaveBeenCalled()
  })

  it('deshace un cobro confirmado desde el historial de operaciones', async () => {
    const user = userEvent.setup()
    renderPage('/debts?tab=terceros')

    await screen.findAllByText('Juan Pérez')
    await user.click(
      screen.getAllByRole('button', {
        name: /Deshacer cobros o pagos/,
      })[0]!,
    )

    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Cobro de 2 cuotas')

    await user.click(within(dialog).getByRole('button', { name: 'Deshacer' }))
    expect(
      within(dialog).getByText(/¿Deshacer el cobro/),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar reversa' }))

    await waitFor(() =>
      expect(reverseMock).toHaveBeenCalledWith('debt-1', 'st-1'),
    )
  })

  describe('División de gastos', () => {
    it('muestra el listado de divisiones registradas', async () => {
      fetchDebtSplitsMock.mockResolvedValue(oneSplitPage)
      renderPage('/debts?tab=division')

      expect(await screen.findByText(/asado del sábado/)).toBeInTheDocument()
      expect(screen.getByText(/Pagaste vos/)).toBeInTheDocument()
      expect(
        screen.getByText(/Tu parte: \$?\s?40/),
      ).toBeInTheDocument()
      expect(screen.getByText('1 deuda')).toBeInTheDocument()
    })

    it('el botón Agregar abre el formulario de división', async () => {
      const user = userEvent.setup()
      renderPage('/debts?tab=division')

      await screen.findByText('Todavía no registraste divisiones de gastos')
      await user.click(screen.getByRole('button', { name: 'Agregar' }))

      expect(
        await screen.findByRole('heading', {
          name: 'Nueva división de gastos',
        }),
      ).toBeInTheDocument()
    })

    it('crea la división con el reparto por defecto cuando las partes cierran', async () => {
      const user = userEvent.setup()
      renderPage('/debts?tab=division')

      await user.click(screen.getByRole('button', { name: 'Agregar' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(
        within(dialog).getByRole('combobox', { name: 'Billetera' }),
      )
      await user.click(
        await screen.findByRole('option', { name: 'Pesos (ARS)' }),
      )

      await user.click(within(dialog).getByLabelText(/Gasto total/))
      await user.type(within(dialog).getByLabelText(/Gasto total/), '100')

      await user.type(within(dialog).getByLabelText(/Tu parte/), '40')

      await user.type(
        within(dialog).getByLabelText(/Descripción del gasto/),
        'asado',
      )

      await user.click(
        within(dialog).getByRole('combobox', { name: 'Actor 1' }),
      )
      await user.click(await screen.findByRole('option', { name: 'Juan Pérez' }))

      const confirmButton = within(dialog).getByRole('button', {
        name: 'Confirmar división',
      })
      expect(confirmButton).toBeEnabled()
      await user.click(confirmButton)

      await waitFor(() =>
        expect(createDebtSplitMock).toHaveBeenCalledWith({
          currency: 'ARS',
          totalAmount: 100,
          userAmount: 40,
          payer: 'USER',
          payerActorId: null,
          items: [{ actorId: 'actor-1', amount: 60 }],
          note: 'asado',
        }),
      )
    })

    it('no permite confirmar si la suma de las partes no coincide con el total', async () => {
      const user = userEvent.setup()
      renderPage('/debts?tab=division')

      await user.click(screen.getByRole('button', { name: 'Agregar' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(
        within(dialog).getByRole('combobox', { name: 'Billetera' }),
      )
      await user.click(
        await screen.findByRole('option', { name: 'Pesos (ARS)' }),
      )

      await user.type(within(dialog).getByLabelText(/Gasto total/), '100')
      await user.type(within(dialog).getByLabelText(/Tu parte/), '40')

      const rowAmount = within(dialog).getByLabelText(/Importe de/)
      expect(rowAmount).toHaveValue('60.00')

      await user.clear(rowAmount)
      await user.type(rowAmount, '80')

      expect(
        within(dialog).getByText(/La suma de las partes debe ser igual al total/),
      ).toBeInTheDocument()
      expect(
        within(dialog).getByRole('button', { name: 'Confirmar división' }),
      ).toBeDisabled()
      expect(createDebtSplitMock).not.toHaveBeenCalled()
    })

    it('agrega una persona desde el selector y la preselecciona', async () => {
      const user = userEvent.setup()
      renderPage('/debts?tab=division')

      await user.click(screen.getByRole('button', { name: 'Agregar' }))
      const dialog = await screen.findByRole('dialog')

      await user.click(
        within(dialog).getByRole('combobox', { name: 'Actor 1' }),
      )
      await user.click(
        await screen.findByRole('button', { name: 'Agregar persona' }),
      )

      expect(
        await screen.findByRole('heading', { name: 'Nueva persona' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('combobox', { name: 'Tipo de actor' }),
      ).toBeDisabled()

      await user.type(screen.getByLabelText(/Nombre/), 'Pedro')
      await user.type(screen.getByLabelText(/Apellido/), 'Pardo')
      await user.click(screen.getByRole('button', { name: 'Crear persona' }))

      await waitFor(() => expect(createDebtActorMock).toHaveBeenCalled())
      await waitFor(() =>
        expect(
          within(dialog).getByRole('combobox', { name: 'Actor 1' }),
        ).toHaveTextContent('Juan Pérez'),
      )
    })

    it('elimina una división con confirmación destructiva', async () => {
      const user = userEvent.setup()
      fetchDebtSplitsMock.mockResolvedValue(oneSplitPage)
      renderPage('/debts?tab=division')

      await screen.findByText(/asado del sábado/)
      await user.click(screen.getByRole('button', { name: 'Eliminar' }))

      const alert = await screen.findByRole('alertdialog')
      expect(
        within(alert).getByText(/restablecerá el dinero descontado/),
      ).toBeInTheDocument()

      await user.click(within(alert).getByRole('button', { name: 'Eliminar' }))

      await waitFor(() =>
        expect(deleteDebtSplitMock).toHaveBeenCalledWith('split-1'),
      )
    })
  })
})
