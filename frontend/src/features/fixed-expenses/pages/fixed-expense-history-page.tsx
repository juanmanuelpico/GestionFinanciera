import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarClock,
  CircleDollarSign,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getApiErrorMessage } from '@/lib/errors'
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
} from '@/lib/format'
import { paymentMethodLabels } from '@/types/finance'
import { fetchFixedExpenseHistory } from '../fixed-expenses-api'
import { formatPeriodLabel } from '../recurrence'
import { formatFrequencyLabel } from '../types'

export function FixedExpenseHistoryPage() {
  const { expenseId } = useParams<{ expenseId: string }>()
  const navigate = useNavigate()

  const historyQuery = useQuery({
    queryKey: ['fixed-expenses', 'history', expenseId],
    queryFn: () => fetchFixedExpenseHistory(expenseId as string),
    enabled: Boolean(expenseId),
  })

  const expense = historyQuery.data?.fixedExpense
  const items = historyQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="-ml-2 h-11 justify-start px-2 sm:h-9"
          onClick={() => navigate('/fixed-expenses')}
        >
          <ArrowLeft />
          Volver a gastos fijos
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            Historial de pagos
          </h1>
          <p className="text-muted-foreground">
            Todas las veces que se pagó {expense ? expense.title : 'este gasto fijo'}.
          </p>
        </div>
      </div>

      {historyQuery.isPending && (
        <Card>
          <CardContent className="space-y-3 p-4" aria-label="Cargando historial">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="bg-muted h-12 animate-pulse rounded-lg"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {historyQuery.isError && (
        <Card>
          <CardContent className="space-y-3 p-6" role="alert">
            <p className="text-destructive text-sm break-words">
              {getApiErrorMessage(historyQuery.error)}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => void historyQuery.refetch()}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {expense && (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Gasto</p>
              <p className="font-medium break-words">{expense.title}</p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Categoría</p>
              <p className="font-medium break-words">{expense.category.name}</p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Frecuencia</p>
              <p className="font-medium">
                {formatFrequencyLabel(expense.intervalMonths)}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Importe estimado</p>
              <p className="font-medium tabular-nums">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Estado</p>
              <Badge variant={expense.active ? 'default' : 'secondary'}>
                {expense.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Próximo vencimiento</p>
              <p className="font-medium tabular-nums">
                {expense.nextDueDate
                  ? formatDateOnly(expense.nextDueDate)
                  : '—'}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Día habitual</p>
              <p className="font-medium tabular-nums">día {expense.dueDay}</p>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-xs">Pagos registrados</p>
              <p className="font-medium tabular-nums">
                {historyQuery.data?.items.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="py-0">
        <CardContent className="p-0">
          {!historyQuery.isPending && !historyQuery.isError && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <CircleDollarSign className="text-muted-foreground size-10" />
              <div className="space-y-1">
                <p className="font-medium">Todavía no pagaste este gasto fijo</p>
                <p className="text-muted-foreground text-sm">
                  Cuando lo marques pagado desde la previsión mensual, cada
                  pago aparecerá acá.
                </p>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Fecha de pago</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Medio de pago</TableHead>
                      <TableHead>Categoría del egreso</TableHead>
                      <TableHead className="text-right">Movimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatPeriodLabel(payment.period)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDateOnly(payment.dueDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDateTime(payment.paidAt)}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          {payment.paymentMethod
                            ? paymentMethodLabels[payment.paymentMethod]
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">
                          {payment.movement.category.name}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums text-muted-foreground">
                          #{payment.movement.id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y lg:hidden">
                {items.map((payment) => (
                  <li key={payment.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">
                          {formatPeriodLabel(payment.period)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Vencimiento {formatDateOnly(payment.dueDate)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Pagado el {formatDateTime(payment.paidAt)}
                        </p>
                      </div>
                      <p className="text-destructive ml-auto shrink-0 text-right font-semibold tabular-nums">
                        − {formatCurrency(payment.amount, payment.currency)}
                      </p>
                    </div>

                    <dl className="text-muted-foreground space-y-1 text-sm">
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-medium">Medio:</dt>
                        <dd className="break-words">
                          {payment.paymentMethod
                            ? paymentMethodLabels[payment.paymentMethod]
                            : 'Sin medio de pago'}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-medium">Categoría:</dt>
                        <dd className="break-words">
                          {payment.movement.category.name}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-medium">Movimiento:</dt>
                        <dd className="break-words tabular-nums">
                          #{payment.movement.id}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!historyQuery.isPending &&
            !historyQuery.isError &&
            items.length > 0 && (
              <div className="flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
                <CalendarClock className="size-4" />
                {items.length} {items.length === 1 ? 'pago registrado' : 'pagos registrados'}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
