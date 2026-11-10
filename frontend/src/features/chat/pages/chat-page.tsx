import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/features/auth/store'
import { ChatAuthError, sendChatMessage } from '../chat-api'
import { MessageBubble } from '../components/message-bubble'
import type { ChatMessage } from '../types'

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`

const EXAMPLE_QUESTIONS = [
  '¿Cuánto está el dólar?',
  '¿Cuánto ahorro tengo?',
  '¿Cuánto me deben?',
  '¿Cómo van mis gastos fijos este mes?',
  '¿Qué categorías pasaron el umbral?',
]

function errorDetail(error: unknown): string {
  if (axiosLikeError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail) {
      return detail
    }
  }
  return 'No pudimos comunicarnos con el asistente. Intentá de nuevo.'
}

function axiosLikeError(
  error: unknown,
): error is { response?: { data?: { detail?: unknown } } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as { isAxiosError?: boolean }).isAxiosError === true
  )
}

export function ChatPage() {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // En iOS y en Chrome Android el teclado blando se superpone al contenido: no
  // achica el layout viewport (100dvh sigue igual), solo la visualViewport.
  // Restamos ese inset para que el composer quede siempre encima del teclado.
  // En escritorio el inset es 0 y no se toca el layout de la Card.
  const [keyboardInset, setKeyboardInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) {
      return
    }
    const update = () =>
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height))
    update()
    viewport.addEventListener('resize', update)
    return () => viewport.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
    // También al abrir/cerrar el teclado: el último mensaje debe quedar visible sobre él.
  }, [messages, sending, keyboardInset])

  const ask = async (rawText: string) => {
    const text = rawText.trim()
    const accessToken = useAuthStore.getState().accessToken
    if (!text || sending || !accessToken) {
      return
    }

    const history = messages
      .filter((message) => !message.isError && message.content)
      .slice(-20)
      .map((message) => ({ role: message.role, content: message.content }))

    setMessages((current) => [
      ...current,
      { id: makeId(), role: 'user', content: text, toolsUsed: [] },
    ])
    setDraft('')
    setSending(true)

    try {
      let response
      try {
        response = await sendChatMessage({ message: text, history, accessToken })
      } catch (error) {
        if (!(error instanceof ChatAuthError)) {
          throw error
        }
        // 401 del chatbot: puede ser JWT vencido; refrescamos una vez y reintentamos.
        const session = await useAuthStore.getState().refresh()
        if (!session) {
          throw error
        }
        response = await sendChatMessage({ message: text, history, accessToken: session.accessToken })
      }

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'assistant',
          content: response.answer,
          toolsUsed: response.tools_used ?? [],
        },
      ])
      syncDataAfterMovementCreated(response.events)
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: 'assistant',
          content:
            error instanceof ChatAuthError
              ? 'Tu sesión venció. Volvé a iniciar sesión para continuar.'
              : errorDetail(error),
          toolsUsed: [],
          isError: true,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void ask(draft)
  }

  const isEmpty = messages.length === 0

  /**
   * Si el chatbot dio de alta un movimiento, refresca las mismas vistas que
   * invalida la pantalla de Movimientos al crear: el disponible del header
   * (['savings','available']), las listas y el control de gastos.
   */
  const syncDataAfterMovementCreated = (events: string[] | undefined) => {
    if (!events?.includes('movement-created')) {
      return
    }
    void queryClient.invalidateQueries({ queryKey: ['savings'] })
    void queryClient.invalidateQueries({ queryKey: ['movements'] })
    void queryClient.invalidateQueries({ queryKey: ['spending-control'] })
  }

  return (
    <div className="space-y-6">
      {keyboardInset === 0 && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="text-muted-foreground text-sm">
            Consultá tus movimientos, ahorros, deudas, gastos fijos, control de
            gastos y la cotización del dólar, o registrá un gasto e ingreso.
          </p>
        </div>
      )}

      <Card
        className="flex h-[calc(100dvh-21rem)] min-h-[240px] flex-col overflow-hidden md:h-[calc(100dvh-11rem)] md:min-h-[420px]"
        style={
          keyboardInset > 0
            ? {
                // Sin el encabezado de la página, el overhead mobile real es
                // ~14rem; con el teclado abierto la Card se achica lo que
                // ocupa el teclado para mantener el composer visible. El
                // max() pone un piso de 112px (composer + safe area) para
                // que en pantallas bajas (landscape con teclado) la Card no
                // colapse a 0 y el input quede inaccesible.
                height: `max(112px, calc(100dvh - 14rem - ${keyboardInset}px))`,
                minHeight: 0,
              }
            : undefined
        }
      >
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversación con el asistente"
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
          >
            {isEmpty ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <MessageCircle className="size-10" aria-hidden="true" />
                <p className="text-sm">
                  Preguntá por tus finanzas o registrá un movimiento.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {EXAMPLE_QUESTIONS.map((question) => (
                    <Button
                      key={question}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="max-w-full min-h-11 whitespace-normal text-xs sm:min-h-0"
                      onClick={() => void ask(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}

            {sending && (
              <div className="flex justify-start">
                <div
                  className="bg-muted text-muted-foreground flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                  aria-label="El asistente está pensando"
                >
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="bg-muted-foreground size-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
                    <span className="bg-muted-foreground size-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
                    <span className="bg-muted-foreground size-2 animate-bounce rounded-full" />
                  </span>
                  <span>Pensando…</span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            aria-label="Enviar mensaje al asistente"
            className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Mensaje para el asistente
              </label>
              <Textarea
                id="chat-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void ask(draft)
                  }
                }}
                placeholder="Escribí tu consulta…"
                rows={2}
                maxLength={4000}
                className="max-h-32 min-h-11 flex-1 resize-none overscroll-contain text-base md:text-sm"
                enterKeyHint="send"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Enviar"
                disabled={sending || !draft.trim()}
                className="size-11 shrink-0 active:scale-[0.97] sm:size-10"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
