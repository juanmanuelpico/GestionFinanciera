import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/errors'
import type { SpendingAlert } from '@/features/spending-control/types'
import {
  formatCurrency,
  formatDateOnly,
  toDateTimeLocalValue,
} from '@/lib/format'
import {
  paymentMethodOptions,
  paymentMethodValues,
  type PaymentMethod,
} from '@/types/finance'
import { payFixedExpense } from '../fixed-expenses-api'
import { formatFrequencyLabel, type FixedExpenseProjection } from '../types'
import { formatPeriodLabel } from '../recurrence'

interface PayFixedExpenseDialogProps {
  open: boolean
  projection: FixedExpenseProjection | null
  enabledPaymentMethods: PaymentMethod[]
  onOpenChange: (open: boolean) => void
  onSaved: (alert: SpendingAlert | null) => void
}

const paySchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Ingresá el importe pagado')
    .refine((value) => {
      const amount = Number(value.replace(',', '.'))
      return Number.isFinite(amount) && amount > 0
    }, 'El importe debe ser mayor a 0')
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.replace(',', '.')), {
      message: 'El importe debe tener como máximo 2 decimales',
    }),
  paidAt: z.string().min(1, 'Ingresá la fecha y hora del pago'),
  paymentMethod: z.union([z.literal(''), z.enum(paymentMethodValues)]),
})

type PayFormValues = {
  amount: string
  paidAt: string
  paymentMethod: PaymentMethod | ''
}

const NO_PAYMENT_METHOD = ''

export function PayFixedExpenseDialog({
  open,
  projection,
  enabledPaymentMethods,
  onOpenChange,
  onSaved,
}: PayFixedExpenseDialogProps) {
  const [initialPaidAt] = useState(() => toDateTimeLocalValue(new Date()))

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      amount: '',
      paidAt: initialPaidAt,
      paymentMethod: NO_PAYMENT_METHOD,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: PayFormValues) => {
      if (!projection) {
        throw new Error('Sin previsión seleccionada')
      }

      return payFixedExpense(projection.fixedExpenseId, {
        period: projection.period,
        amount: Number(values.amount.replace(',', '.')),
        paidAt: new Date(values.paidAt).toISOString(),
        paymentMethod:
          values.paymentMethod === NO_PAYMENT_METHOD
            ? null
            : values.paymentMethod,
      })
    },
    onSuccess: (payment) => {
      onSaved(payment.spendingAlert ?? null)
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open || !projection) {
      return
    }

    reset({
      amount: Number(projection.amount).toFixed(2),
      paidAt: toDateTimeLocalValue(new Date()),
      paymentMethod: NO_PAYMENT_METHOD,
    })
  }, [open, projection, reset])

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values)
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      mutation.reset()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-lg sm:pb-6">
        <DialogHeader className="shrink-0 pr-12">
          <DialogTitle className="leading-snug break-words">
            Pagar — {projection?.title}
          </DialogTitle>
          <DialogDescription>
            Se creará automáticamente el egreso en Movimientos con los datos
            que confirmes acá.
          </DialogDescription>
        </DialogHeader>

        {projection && (
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={onSubmit}
            noValidate
          >
            <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              <div className="bg-muted/40 space-y-1 rounded-lg p-3 text-sm">
                <p className="flex flex-wrap justify-between gap-x-2">
                  <span className="text-muted-foreground">Período</span>
                  <span className="ml-auto text-right font-medium">
                    {formatPeriodLabel(projection.period)}
                  </span>
                </p>
                <p className="flex flex-wrap justify-between gap-x-2">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span className="ml-auto text-right font-medium tabular-nums">
                    {formatDateOnly(projection.dueDate)}
                  </span>
                </p>
                <p className="flex flex-wrap justify-between gap-x-2">
                  <span className="text-muted-foreground">Frecuencia</span>
                  <span className="ml-auto text-right">
                    {formatFrequencyLabel(projection.intervalMonths)}
                  </span>
                </p>
                <p className="flex flex-wrap justify-between gap-x-2">
                  <span className="text-muted-foreground">Importe estimado</span>
                  <span className="ml-auto text-right font-medium tabular-nums">
                    {formatCurrency(projection.amount, projection.currency)}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed-expense-pay-amount">
                  Importe pagado
                </Label>
                <Input
                  id="fixed-expense-pay-amount"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.amount)}
                  {...register('amount')}
                />
                <p className="text-muted-foreground text-xs">
                  Moneda: {projection.currency}. Podés ajustar el importe real
                  si fue distinto al estimado; el estimado no cambia.
                </p>
                {errors.amount && (
                  <p className="text-destructive text-sm break-words" role="alert">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed-expense-pay-date">Fecha y hora del pago</Label>
                <Input
                  id="fixed-expense-pay-date"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.paidAt)}
                  {...register('paidAt')}
                />
                {errors.paidAt && (
                  <p className="text-destructive text-sm break-words" role="alert">
                    {errors.paidAt.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed-expense-pay-method">Medio de pago</Label>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select
                      value={field.value || 'NONE'}
                      onValueChange={(value) =>
                        field.onChange(value === 'NONE' ? '' : value)
                      }
                    >
                      <SelectTrigger
                        id="fixed-expense-pay-method"
                        aria-label="Medio de pago"
                      >
                        <SelectValue placeholder="Sin medio de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">
                          Sin medio de pago
                        </SelectItem>
                        {paymentMethodOptions
                          .filter((option) =>
                            enabledPaymentMethods.includes(option.value),
                          )
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {mutation.isError && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {getApiErrorMessage(mutation.error)}
                </p>
              )}
            </div>

            <DialogFooter className="shrink-0 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:h-10 sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-11 w-full sm:h-10 sm:w-auto"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Registrando…' : 'Registrar pago'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
