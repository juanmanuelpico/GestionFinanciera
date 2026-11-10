export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  /** Texto mostrado al usuario. Vacío mientras el asistente está pensando. */
  content: string
  /** Tools que el asistente usó para generar la respuesta (solo assistant). */
  toolsUsed: string[]
  /** true si el contenido es un mensaje de error a remarcar visualmente. */
  isError?: boolean
}

export interface ChatRequestMessage {
  role: ChatRole
  content: string
}

export interface ChatApiResponse {
  answer: string
  provider: string
  model: string
  tools_used: string[]
  /** Marcas de escrituras confirmadas por el chatbot (ej. "movement-created"). */
  events: string[]
}

/** Etiqueta visible (en español) para cada tool del chatbot. */
export const TOOL_LABELS: Record<string, string> = {
  listar_movimientos: 'Movimientos',
  crear_movimiento: 'Movimiento registrado',
  ver_ahorros: 'Ahorros',
  ver_dolar: 'Dólar',
  listar_deudas: 'Deudas',
  ver_gastos_fijos: 'Gastos fijos',
  ver_gasto_fijo: 'Gasto fijo',
  ver_control_gastos: 'Control de gastos',
  listar_categorias: 'Categorías',
}

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool
}
