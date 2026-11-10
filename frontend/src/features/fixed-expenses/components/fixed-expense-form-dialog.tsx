import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { Category } from '@/features/categories/types'
import { getApiErrorMessage } from '@/lib/errors'
import { currencyOptions, type Currency } from '@/types/finance'
import { createFixedExpense, updateFixedExpense } from '../fixed-expenses-api'
import {
  fixedExpenseSchema,
  fixedExpenseToFormValues,
  formValuesToFixedExpensePayload,
  type FixedExpenseFormValues,
} from '../schemas'
import type { FixedExpense } from '../types'

interface FixedExpenseFormDialogProps {
  open: boolean
  expense: FixedExpense | null
  categories: Category[]
  enabledCurrencies: Currency[]
  defaultCurrency: Currency
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function FixedExpenseFormDialog({
  open,
  expense,
  categories,
  enabledCurrencies,
  defaultCurrency,
  onOpenChange,
  onSaved,
}: FixedExpenseFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FixedExpenseFormValues>({
    resolver: zodResolver(fixedExpenseSchema),
    defaultValues: fixedExpenseToFormValues(null, defaultCurrency),
  })

  const mutation = useMutation({
    mutationFn: (values: FixedExpenseFormValues) => {
      const payload = formValuesToFixedExpensePayload(values)

      return expense
        ? updateFixedExpense(expense.id, payload)
        : createFixedExpense(payload)
    },
    onSuccess: () => {
      onSaved()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    reset(fixedExpenseToFormValues(expense, defaultCurrency))
  }, [open, expense, defaultCurrency, reset])

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values)
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      mutation.reset()
    }
    onOpenChange(nextOpen)
  }

  const enabledCurrencyOptions = currencyOptions.filter((option) =>
    enabledCurrencies.includes(option.value),
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:max-w-2xl sm:pb-6">
        <DialogHeader className="shrink-0 pr-12">
          <DialogTitle>
            {expense ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
          </DialogTitle>
          <DialogDescription>
            Compromiso recurrente: se proyecta cada cantidad de meses indicada
            y, al marcarlo pagado, registra su egreso automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-2">
              <Label htmlFor="fixed-expense-title">Título</Label>
              <Input
                id="fixed-expense-title"
                placeholder="Ej: Alquiler"
                autoComplete="off"
                aria-invalid={Boolean(errors.title)}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fixed-expense-amount">Importe estimado</Label>
                <Input
                  id="fixed-expense-amount"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  placeholder="0,00"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.amount)}
                  {...register('amount')}
                />
                {errors.amount && (
                  <p className="text-destructive text-sm break-words" role="alert">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed-expense-currency">Moneda</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as Currency)}
                    >
                      <SelectTrigger id="fixed-expense-currency" aria-label="Moneda">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {enabledCurrencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fixed-expense-first-due">
                  Próximo vencimiento
                </Label>
                <Input
                  id="fixed-expense-first-due"
                  type="date"
                  aria-invalid={Boolean(errors.firstDueDate)}
                  {...register('firstDueDate')}
                />
                {errors.firstDueDate && (
                  <p
                    className="text-destructive text-sm break-words"
                    role="alert"
                  >
                    {errors.firstDueDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixed-expense-interval">Se repite cada</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="fixed-expense-interval"
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="done"
                    min={1}
                    max={120}
                    step={1}
                    className="w-24"
                    aria-invalid={Boolean(errors.intervalMonths)}
                    {...register('intervalMonths')}
                  />
                  <span className="text-muted-foreground text-sm">meses</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  1 = todos los meses · 6 = semestral (ej. patente) · 12 = anual
                </p>
                {errors.intervalMonths && (
                  <p
                    className="text-destructive text-sm break-words"
                    role="alert"
                  >
                    {errors.intervalMonths.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed-expense-category">Categoría</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="fixed-expense-category"
                      aria-label="Categoría"
                      aria-invalid={Boolean(errors.categoryId)}
                    >
                      <SelectValue placeholder="Elegí una categoría de egreso" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="fixed-expense-active"
                className="flex min-h-11 cursor-pointer items-center gap-3 leading-snug"
              >
                <Controller
                  control={control}
                  name="active"
                  render={({ field }) => (
                    <Checkbox
                      id="fixed-expense-active"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                <span>
                  Activo
                  <span className="text-muted-foreground block text-xs font-normal">
                    Los gastos inactivos siguen visibles en la previsión pero no se pueden pagar
                  </span>
                </span>
              </Label>
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
              disabled={mutation.isPending || isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 w-full sm:h-10 sm:w-auto"
              disabled={mutation.isPending || isSubmitting}
            >
              {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
