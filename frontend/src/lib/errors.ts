import axios from 'axios'
import type { ApiErrorResponse } from '@/types/api'

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorResponse | undefined
    const message = payload?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (typeof message === 'string') {
      return message
    }
  }

  return 'Ocurrió un error inesperado. Intentá nuevamente.'
}
