import axios from 'axios'
import type { ChatApiResponse, ChatRequestMessage } from './types'

const chatbotUrl = import.meta.env.VITE_CHATBOT_URL as string | undefined

if (!chatbotUrl) {
  throw new Error(
    'VITE_CHATBOT_URL no está definida. Configurala en .env (ver env.example).',
  )
}

export const CHATBOT_URL = chatbotUrl

export interface SendChatParams {
  message: string
  history: ChatRequestMessage[]
  accessToken: string
}

export class ChatAuthError extends Error {
  constructor() {
    super('La sesión del usuario venció al contactar al chatbot.')
    this.name = 'ChatAuthError'
  }
}

/**
 * Llamada directa al chatbot (FastAPI en VITE_CHATBOT_URL). No usa el cliente
 * `api` de NestJS porque el chatbot vive en otro origen; el Bearer token del
 * usuario se reenvía tal cual y el backend hace el filtrado por usuario.
 */
export async function sendChatMessage({
  message,
  history,
  accessToken,
}: SendChatParams): Promise<ChatApiResponse> {
  let response
  try {
    response = await axios.post<ChatApiResponse>(
      `${CHATBOT_URL}/chat`,
      { message, history },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 90_000,
      },
    )
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new ChatAuthError()
    }
    throw error
  }
  return response.data
}
