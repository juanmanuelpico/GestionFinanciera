import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AvailableByCurrency } from '@/features/savings/types'
import { fetchAvailable } from '@/features/savings/savings-api'
import type { SpendingAlert } from '@/features/spending-control/types'
import { getApiErrorMessage } from '@/lib/errors'
import {
  formatCurrency,
  formatDateOnly,
  todayDateInputValue,
} from '@/lib/format'
import { fetchDebt, payDebt } from '../debts-api'
import {
  buildRemainingAmountValues,
  parseAmount,
  toCents,
} from '../installment-preview'
import type { Debt, DebtDetail } from '../types'

interface DebtPaymentDialogProps {
  open: boolean
  debt: Debt | null
  onOpenChange: (open: boolean) => void
  onSaved: (alert: SpendingAlert | null) => void
}

interface PaymentFieldsProps {
  debt: Debt
  detail: DebtDetail
  available: AvailableByCurrency | undefined
  onOpenChange: (open: boolean) => void
  onSaved: (alert: SpendingAlert | null) => void
}

function PaymentFields({
  debt,
  detail,
  available,
  onOpenChange,
  onSaved,
}: PaymentFieldsProps) {
  const isCollection = debt.kind === 'TERCERO'
  const isPerson = debt.actor.type === 'PERSONA'
  const actionLabel = isCollection ? 'Cobrar' : 'Pagar'

  const [quantity, setQuantity] = useState('1')
  const [paymentDate, setPaymentDate] = useState(todayDateInputValue)
  const [error, setError] = useState<string | null>(null)

  const pendingInstallments = useMemo(
    () => detail.installments.filter((item) => !item.paidAt),
    [detail.installments],
  )

  const defaultAmounts = useMemo(
    () =>
      buildRemainingAmountValues(
        detail.remainingAmount,
        pendingInstallments.length,
      ),
    [detail.remainingAmount, pendingInstallments.length],
  )

  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pendingInstallments.map((installment, index) => [
        installment.id,
        isPerson
          ? (defaultAmounts[index] ?? installment.amount)
          : installment.amount,
      ]),
    ),
  )

  const parsedQuantity = Number(quantity)
  const validQuantity =
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= pendingInstallments.length

  const selected = validQuantity
    ? pendingInstallments.slice(0, parsedQuantity)
    : []
  const selectedAmounts = selected.map(
    (installment) => amounts[installment.id] ?? '',
  )
  const parsedSelectedAmounts = selectedAmounts.map(parseAmount)
  const validAmounts = parsedSelectedAmounts.every(
    (amount) => amount !== null && amount > 0,
  )
  const totalCents = validAmounts
    ? parsedSelectedAmounts.reduce<number>(
        (acc, amount) => acc + toCents(amount as number),
        0,
      )
    : 0
  const outstandingCents = toCents(Number(detail.remainingAmount))
  const exceedsRemaining =
    validAmounts && selected.length > 0 && totalCents > outstandingCents

  const mutation = useMutation({
    mutationFn: () =>
      payDebt(debt.id, {
        quantity: parsedQuantity,
        paymentDate: `${paymentDate}T00:00:00`,
        ...(isPerson
          ? { amounts: parsedSelectedAmounts.map((amount) => amount as number) }
          : {}),
      }),
    onSuccess: (detail) => {
      onSaved(detail.spendingAlert ?? null)
      onOpenChange(false)
    },
    onError: (mutationError) => setError(getApiErrorMessage(mutationError)),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!validQuantity) {
      setError(
        pendingInstallments.length === 0
          ? 'No hay cuotas pendientes.'
          : 'Ingresá una cantidad de cuotas válida.',
      )
      return
    }
    if (isPerson && !validAmounts) {
      setError('Ingresá un importe mayor a 0 para cada cuota seleccionada.')
      return
    }
    if (exceedsRemaining) {
      setError('El total no puede superar el saldo restante de la deuda.')
      return
    }
    if (!paymentDate) {
      setError('Ingresá la fecha del movimiento.')
      return
    }

    mutation.mutate()
  }

  const updateAmount = (installmentId: string, value: string) =>
    setAmounts((current) => ({ ...current, [installmentId]: value }))

  const availableForCurrency = available?.[debt.currency]
  const insufficientClient =
    debt.kind === 'PROPIA' &&
    availableForCurrency !== undefined &&
    totalCents / 100 > availableForCurrency

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {pendingInstallments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Esta deuda no tiene cuotas pendientes.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-quantity">
                Cantidad de cuotas <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="payment-quantity"
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                min={1}
                max={pendingInstallments.length}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-11 sm:h-10"
              />
              <p className="text-muted-foreground text-xs">
                {pendingInstallments.length} pendiente
                {pendingInstallments.length === 1 ? '' : 's'} · máximas a
                liquidar en esta acción.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">
                Fecha del {actionLabel.toLowerCase()}{' '}
                <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                className="h-11 sm:h-10"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {selected.length > 0
                ? `Cuotas incluidas (${selected.length})`
                : 'Elegí la cantidad de cuotas'}
            </p>

            {selected.length > 0 && (
              <ul className="space-y-3">
                {selected.map((installment, index) => {
                  const amountId = `installment-amount-${installment.id}`
                  const paidAmount = Number(installment.paidAmount)
                  const amountError =
                    isPerson &&
                    parsedSelectedAmounts[index] !== null &&
                    parsedSelectedAmounts[index]! <= 0
                  const invalidInput =
                    isPerson &&
                    parsedSelectedAmounts[index] === null &&
                    selectedAmounts[index].trim() !== ''
                  const amountFieldError = invalidInput
                    ? 'Ingresá un número válido.'
                    : amountError
                      ? 'El importe debe ser mayor a 0.'
                      : null
                  const amountErrorId = `${amountId}-error`

                  return (
                    <li
                      key={installment.id}
                      className={
                        isPerson
                          ? 'space-y-2 rounded-lg border p-3 sm:p-2'
                          : 'flex flex-wrap items-center justify-between gap-2'
                      }
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="min-w-0 break-words text-sm font-medium">
                          Cuota {installment.number}/{detail.installmentCount}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatDateOnly(installment.dueDate)}
                        </span>
                      </div>

                      {isPerson ? (
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
                          <div className="min-w-0 space-y-1">
                            <Label htmlFor={amountId}>Importe a {actionLabel.toLowerCase()}</Label>
                            <Input
                              id={amountId}
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              enterKeyHint={
                                index === selected.length - 1
                                  ? 'done'
                                  : 'next'
                              }
                              className="h-11 sm:h-10"
                              value={amounts[installment.id] ?? ''}
                              onChange={(event) =>
                                updateAmount(
                                  installment.id,
                                  event.target.value,
                                )
                              }
                              aria-invalid={Boolean(amountFieldError)}
                              aria-describedby={
                                amountFieldError ? amountErrorId : undefined
                              }
                            />
                            {amountFieldError && (
                              <p
                                id={amountErrorId}
                                className="text-destructive text-xs break-words"
                              >
                                {amountFieldError}
                              </p>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs tabular-nums sm:text-right">
                            Original{' '}
                            {formatCurrency(installment.amount, debt.currency)}
                            {paidAmount > 0 && (
                              <>
                                {' · '}
                                {isCollection ? 'cobrado ' : 'pagado '}
                                {formatCurrency(
                                  installment.paidAmount,
                                  debt.currency,
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      ) : (
                        <span
                          className={
                            isCollection
                              ? 'text-success shrink-0 font-medium tabular-nums'
                              : 'text-destructive shrink-0 font-medium tabular-nums'
                          }
                        >
                          {isCollection ? '+' : '−'}{' '}
                          {formatCurrency(installment.amount, debt.currency)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="text-sm font-medium">
            {actionLabel}:{' '}
            <span className="tabular-nums">
              {formatCurrency((totalCents / 100).toFixed(2), debt.currency)}
            </span>{' '}
            a la billetera {debt.currency}
            {availableForCurrency !== undefined && (
              <span className="text-muted-foreground">
                {' '}
                · disponible{' '}
                {formatCurrency(String(availableForCurrency), debt.currency)}
              </span>
            )}
          </p>

          {isPerson && selected.length > 0 && !validAmounts && (
            <p className="text-destructive text-sm break-words" role="alert">
              Ingresá un importe mayor a 0 para cada cuota seleccionada.
            </p>
          )}

          {exceedsRemaining && (
            <p className="text-destructive text-sm break-words" role="alert">
              El total no puede superar el saldo restante de{' '}
              {formatCurrency(detail.remainingAmount, debt.currency)}.
            </p>
          )}

          {insufficientClient && (
            <p className="text-destructive text-sm break-words" role="alert">
              El saldo disponible no alcanza para pagar estas cuotas; el
              backend rechazará la operación.
            </p>
          )}

          {error && (
            <p className="text-destructive text-sm break-words" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 w-full sm:h-10 sm:w-auto"
              disabled={
                mutation.isPending ||
                !validQuantity ||
                (isPerson && !validAmounts) ||
                exceedsRemaining
              }
            >
              {mutation.isPending
                ? 'Procesando…'
                : `${actionLabel} ${
                    validQuantity ? parsedQuantity : ''
                  } ${parsedQuantity === 1 ? 'cuota' : 'cuotas'}`.trim()}
            </Button>
          </DialogFooter>
        </>
      )}
    </form>
  )
}

export function DebtPaymentDialog({
  open,
  debt,
  onOpenChange,
  onSaved,
}: DebtPaymentDialogProps) {
  const isCollection = debt?.kind === 'TERCERO'
  const actionLabel = isCollection ? 'Cobrar' : 'Pagar'

  const detailQuery = useQuery({
    queryKey: ['debts', 'detail', debt?.id],
    queryFn: () => fetchDebt(debt!.id),
    enabled: open && Boolean(debt),
  })

  const availableQuery = useQuery({
    queryKey: ['savings', 'available'],
    queryFn: fetchAvailable,
    enabled: open && Boolean(debt),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-xl sm:pb-6">
        <DialogHeader className="pr-12">
          <DialogTitle>
            {actionLabel} — {debt?.code} · {debt?.actor.displayName}
          </DialogTitle>
          <DialogDescription>
            {isCollection
              ? 'Cada cuota cobrada devuelve el dinero a la billetera de origen.'
              : 'Cada cuota pagada descuenta el dinero de la billetera.'}
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isPending && (
          <div className="space-y-3" aria-label="Cargando cuotas">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="bg-muted h-10 animate-pulse rounded-lg"
              />
            ))}
          </div>
        )}

        {detailQuery.isError && (
          <div className="space-y-3" role="alert">
            <p className="text-destructive text-sm break-words">
              {getApiErrorMessage(detailQuery.error)}
            </p>
            <Button
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => void detailQuery.refetch()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {open && detailQuery.data && debt && (
          <PaymentFields
            key={`${debt.id}-${detailQuery.data.remainingAmount}`}
            debt={debt}
            detail={detailQuery.data}
            available={availableQuery.data}
            onOpenChange={onOpenChange}
            onSaved={(alert) => {
              onSaved(alert)
              void detailQuery.refetch()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
