import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/test-utils'
import { ChatAuthError, sendChatMessage } from '../chat-api'
import { ChatPage } from './chat-page'

const refreshMock = vi.fn()
const storeState = { accessToken: 'tok-123', refresh: refreshMock }

vi.mock('../chat-api', () => ({
  ChatAuthError: class ChatAuthError extends Error {},
  sendChatMessage: vi.fn(),
}))

vi.mock('@/features/auth/store', () => ({
  useAuthStore: { getState: () => storeState },
}))

const mockedSend = vi.mocked(sendChatMessage)

function renderPage() {
  const queryClient = createTestQueryClient()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ChatPage />
    </QueryClientProvider>,
  )
  return { queryClient, ...view }
}

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.accessToken = 'tok-123'
  })

  it('muestra el estado vacío con preguntas de ejemplo', () => {
    renderPage()
    expect(
      screen.getByText('Preguntá por tus finanzas o registrá un movimiento.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '¿Cuánto está el dólar?' })).toBeInTheDocument()
  })

  it('envía desde el input y muestra la respuesta con las tools usadas', async () => {
    mockedSend.mockResolvedValue({
      answer: 'El dólar blue está en 1.000 ARS.',
      provider: 'groq',
      model: 'test',
      tools_used: ['ver_dolar'],
      events: [],
    })

    const { queryClient } = renderPage()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    await userEvent.type(screen.getByLabelText('Mensaje para el asistente'), '¿Cuánto está el dólar?{Enter}')

    expect(screen.getByText('¿Cuánto está el dólar?')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('El dólar blue está en 1.000 ARS.')).toBeInTheDocument(),
    )
    // Chip con la etiqueta en español de la tool
    expect(screen.getByText('Dólar')).toBeInTheDocument()
    expect(mockedSend).toHaveBeenCalledTimes(1)
    expect(mockedSend.mock.calls[0][0]).toMatchObject({
      message: '¿Cuánto está el dólar?',
      accessToken: 'tok-123',
      history: [],
    })
    // Sin events no se invalida nada
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('refresca disponible, movimientos y control de gastos tras una alta confirmada', async () => {
    mockedSend.mockResolvedValue({
      answer: 'Registré tu gasto de 3.500 ARS en Comida.',
      provider: 'groq',
      model: 'test',
      tools_used: ['crear_movimiento'],
      events: ['movement-created'],
    })
    const { queryClient } = renderPage()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.type(screen.getByLabelText('Mensaje para el asistente'), 'gasto de 3500 en comida{Enter}')
    await waitFor(() =>
      expect(screen.getByText('Registré tu gasto de 3.500 ARS en Comida.')).toBeInTheDocument(),
    )

    const keys = invalidateSpy.mock.calls.map(([args]) => JSON.stringify(args?.queryKey))
    expect(keys).toContain(JSON.stringify(['savings']))
    expect(keys).toContain(JSON.stringify(['movements']))
    expect(keys).toContain(JSON.stringify(['spending-control']))
  })

  it('envía el historial de la conversación (sin mensajes de error)', async () => {
    mockedSend
      .mockResolvedValueOnce({
        answer: '¿Qué fechas querés consultar?',
        provider: 'groq',
        model: 'test',
        tools_used: [],
        events: [],
      })
      .mockResolvedValueOnce({
        answer: 'Tenés 41 movimientos.',
        provider: 'groq',
        model: 'test',
        tools_used: ['listar_movimientos'],
        events: [],
      })

    renderPage()
    const input = screen.getByLabelText('Mensaje para el asistente')
    await userEvent.type(input, '¿Cuántos movimientos tengo?{Enter}')
    await waitFor(() => expect(screen.getByText('¿Qué fechas querés consultar?')).toBeInTheDocument())

    await userEvent.type(input, 'de noviembre{Enter}')
    await waitFor(() => expect(screen.getByText('Tenés 41 movimientos.')).toBeInTheDocument())

    const secondCall = mockedSend.mock.calls[1][0]
    expect(secondCall.history).toEqual([
      { role: 'user', content: '¿Cuántos movimientos tengo?' },
      { role: 'assistant', content: '¿Qué fechas querés consultar?' },
    ])
  })

  it('ante 401 refresca la sesión y reintenta una sola vez', async () => {
    refreshMock.mockResolvedValue({ accessToken: 'tok-nuevo' })
    mockedSend
      .mockRejectedValueOnce(new ChatAuthError())
      .mockResolvedValueOnce({
        answer: 'ok tras refresh',
        provider: 'groq',
        model: 'test',
        tools_used: [],
        events: [],
      })

    renderPage()
    await userEvent.type(screen.getByLabelText('Mensaje para el asistente'), 'hola{Enter}')

    await waitFor(() => expect(screen.getByText('ok tras refresh')).toBeInTheDocument())
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(mockedSend).toHaveBeenCalledTimes(2)
    expect(mockedSend.mock.calls[1][0].accessToken).toBe('tok-nuevo')
  })

  it('si el refresh no devuelve sesión muestra error de sesión', async () => {
    refreshMock.mockResolvedValue(null)
    mockedSend.mockRejectedValue(new ChatAuthError())

    renderPage()
    await userEvent.type(screen.getByLabelText('Mensaje para el asistente'), 'hola{Enter}')

    await waitFor(() =>
      expect(
        screen.getByText('Tu sesión venció. Volvé a iniciar sesión para continuar.'),
      ).toBeInTheDocument(),
    )
    expect(mockedSend).toHaveBeenCalledTimes(1)
  })

  it('muestra el detalle del error del chatbot cuando responde 502', async () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { status: 502, data: { detail: 'No se pudo generar la respuesta.' } },
    })
    mockedSend.mockRejectedValue(axiosError)

    renderPage()
    await userEvent.type(screen.getByLabelText('Mensaje para el asistente'), 'hola{Enter}')

    await waitFor(() =>
      expect(screen.getByText('No se pudo generar la respuesta.')).toBeInTheDocument(),
    )
  })

  it('permite enviar desde una pregunta de ejemplo', async () => {
    mockedSend.mockResolvedValue({
      answer: 'Tenés 100.000 ARS disponibles.',
      provider: 'groq',
      model: 'test',
      tools_used: ['ver_ahorros'],
      events: [],
    })

    renderPage()
    await userEvent.click(screen.getByRole('button', { name: '¿Cuánto ahorro tengo?' }))

    await waitFor(() =>
      expect(screen.getByText('Tenés 100.000 ARS disponibles.')).toBeInTheDocument(),
    )
    expect(mockedSend.mock.calls[0][0].message).toBe('¿Cuánto ahorro tengo?')
  })
})
