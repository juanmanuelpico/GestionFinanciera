import type { CSSProperties, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getApiErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'destructive' | 'success'
}

const kpiValueClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: '',
  destructive: 'text-destructive',
  success: 'text-success',
}

export function KpiCard({ label, value, hint, tone = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p
          className={`text-xl font-semibold tabular-nums break-words ${kpiValueClasses[tone]}`}
        >
          {value}
        </p>
        {hint && <p className="text-muted-foreground text-xs break-words">{hint}</p>}
      </CardContent>
    </Card>
  )
}

interface ChartCardProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function ChartCard({ title, description, actions, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  )
}

interface ChartFrameProps {
  /** Altura y demás clases del gráfico (por defecto `h-72`). */
  className?: string
  /** Altura calculada en runtime (Top N de Movimientos). */
  style?: CSSProperties
  children: ReactNode
}

/**
 * Marco responsive de los gráficos Recharts del módulo.
 *
 * En mobile el chart conserva un ancho mínimo legible (`min-w-[360px]`) y scrollea
 * solo él dentro de la card — nunca el `body` — para no aplastar 12 meses de barras
 * contra 240px. Desde `sm` recupera el 100% del ancho, igual que antes.
 */
export function ChartFrame({ className, style, children }: ChartFrameProps) {
  return (
    <div className="w-full min-w-0 overscroll-x-contain overflow-x-auto">
      <div
        className={cn('h-72 w-full min-w-[360px] sm:min-w-0', className)}
        style={style}
      >
        {children}
      </div>
    </div>
  )
}

interface ReportBoundaryProps {
  isPending: boolean
  isError: boolean
  error?: unknown
  isEmpty: boolean
  emptyTitle: string
  emptyHint: string
  onRetry?: () => void
  loadingLabel: string
  children: ReactNode
}

export function ReportBoundary({
  isPending,
  isError,
  error,
  isEmpty,
  emptyTitle,
  emptyHint,
  onRetry,
  loadingLabel,
  children,
}: ReportBoundaryProps) {
  if (isPending) {
    return (
      <div className="space-y-3 p-4" aria-label={loadingLabel}>
        {[0, 1, 2].map((item) => (
          <div key={item} className="bg-muted h-16 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3 p-4 sm:p-6" role="alert">
        <p className="text-destructive text-sm break-words">
          {getApiErrorMessage(error)}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            className="h-11 w-full sm:h-10 sm:w-auto"
            onClick={onRetry}
          >
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center sm:px-6">
        <p className="min-w-0 font-medium break-words">{emptyTitle}</p>
        <p className="text-muted-foreground min-w-0 text-sm break-words">{emptyHint}</p>
      </div>
    )
  }

  return <>{children}</>
}
