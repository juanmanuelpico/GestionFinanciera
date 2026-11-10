/** Tokens y helpers de estilo para los gráficos (recharts) de Reportes. */
import { formatCurrency } from '@/lib/format'

export const chartColors = {
  aportes: 'var(--primary-500)',
  retiros: 'var(--warning)',
  neto: 'var(--primary-700)',
  pago: 'var(--primary-600)',
  esperado: 'var(--primary-300)',
  cobros: 'var(--success)',
  pagosDeuda: 'var(--destructive)',
  grid: 'var(--border)',
  tick: 'var(--muted-foreground)',
} as const

/**
 * Estilo del Tooltip de Recharts. El `maxWidth` + `whiteSpace: normal` son para
 * mobile: Recharts trae `whiteSpace: 'nowrap'` por defecto en su contentStyle, así
 * que sin esto un importe largo (`$ 1.234.567,89`) o una categoría de una palabra
 * muy larga agrandan la caja por fuera del chart y del viewport.
 */
export const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
  lineHeight: '1.35',
  maxWidth: '220px',
  padding: '8px 10px',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
} as const

export const chartTick = {
  fontSize: 12,
  fill: chartColors.tick,
} as const

export function formatTickAmount(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)
}

/** Formatter de Tooltip para recharts: valor como moneda y nombre plano. */
export function currencyTooltipFormatter(
  currency: string,
): (value: unknown, name: unknown) => [string, string] {
  return (value, name) => [
    formatCurrency(String(value ?? 0), currency),
    String(name ?? ''),
  ]
}
