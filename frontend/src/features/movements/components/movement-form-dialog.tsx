import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import type { Category } from '@/features/categories/types'
import type { SpendingAlert } from '@/features/spending-control/types'
import { usePreferencesQuery } from '@/features/preferences/preferences-query'
import { getApiErrorMessage } from '@/lib/errors'
import { toDateTimeLocalValue } from '@/lib/format'
import {
  currencyOptions,
  movementTypeOptions,
  paymentMethodOptions,
  paymentMethodValues,
} from '@/types/finance'
import { createMovement, updateMovement } from '../movements-api'
import {
  formValuesToPayload,
  movementSchema,
  movementToFormValues,
  type MovementFormInput,
} from '../schemas'
import type { Movement } from '../types'

interface MovementFormDialogProps {
  open: boolean
  movement: Movement | null
  categories: Category[]
  onOpenChange: (open: boolean) => void
  onSaved: (alert: SpendingAlert | null) => void
}

export function MovementFormDialog({
  open,
  movement,
  categories,
  onOpenChange,
  onSaved,
}: MovementFormDialogProps) {
  const [initialDate] = useState(() => toDateTimeLocalValue(new Date()))

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MovementFormInput>({
    resolver: zodResolver(movementSchema),
    defaultValues: movementToFormValues(null, initialDate),
  })

  const selectedType = useWatch({ control, name: 'type' })
  const selectedCategoryId = useWatch({ control, name: 'categoryId' })
  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' })
  const preferences = usePreferencesQuery()

  const enabledPaymentMethods =
    preferences.data?.enabledPaymentMethods ?? paymentMethodValues
  const paymentOptions = paymentMethodOptions.filter(
    (option) =>
      enabledPaymentMethods.includes(option.value) ||
      option.value === selectedPaymentMethod,
  )

  const mutation = useMutation({
    mutationFn: (values: MovementFormInput) => {
      const payload = formValuesToPayload(values)

      return movement
        ? updateMovement(movement.id, payload)
        : createMovement(payload)
    },
    onSuccess: (movement) => {
      onSaved(movement.spendingAlert ?? null)
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    reset(movementToFormValues(movement, toDateTimeLocalValue(new Date())))
  }, [open, movement, reset])

  useEffect(() => {
    if (!selectedType || !selectedCategoryId) {
      return
    }

    const category = categories.find(
      (item) => String(item.id) === selectedCategoryId,
    )

    if (category?.type && category.type !== selectedType) {
      setValue('categoryId', '')
    }
  }, [selectedType, selectedCategoryId, categories, setValue])

  const availableCategories = categories.filter(
    (category) =>
      !selectedType ||
      category.type === null ||
      category.type === selectedType ||
      String(category.id) === selectedCategoryId,
  )

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
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 pr-12">
          <DialogTitle>
            {movement ? 'Editar movimiento' : 'Nuevo movimiento'}
          </DialogTitle>
          <DialogDescription>
            Registrá el importe, la fecha y la categoría del movimiento.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="movement-type">Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="movement-type"
                      aria-label="Tipo de movimiento"
                      aria-invalid={Boolean(errors.type)}
                    >
                      <SelectValue placeholder="Seleccioná un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {movementTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="movement-amount">Importe</Label>
              <Input
                id="movement-amount"
                inputMode="decimal"
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

            <div className="min-w-0 space-y-2">
              <Label htmlFor="movement-category">Categoría</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={availableCategories.length === 0}
                  >
                    <SelectTrigger
                      id="movement-category"
                      aria-label="Categoría"
                      aria-invalid={Boolean(errors.categoryId)}
                    >
                      <SelectValue placeholder="Seleccioná una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
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
              {categories.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Primero creá una categoría en la sección Categorías.
                </p>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="movement-date">Fecha y hora</Label>
              <Input
                id="movement-date"
                type="datetime-local"
                aria-invalid={Boolean(errors.movementDate)}
                {...register('movementDate')}
              />
              {errors.movementDate && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.movementDate.message}
                </p>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="movement-currency">Moneda</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="movement-currency"
                      aria-label="Moneda"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="movement-payment-method">Medio de pago</Label>
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
                      id="movement-payment-method"
                      aria-label="Medio de pago"
                      aria-invalid={Boolean(errors.paymentMethod)}
                    >
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin especificar</SelectItem>
                      {paymentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMethod && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.paymentMethod.message}
                </p>
              )}
            </div>

            <div className="min-w-0 space-y-2 sm:col-span-2">
              <Label htmlFor="movement-note">Observación</Label>
              <Textarea
                id="movement-note"
                placeholder="Detalle opcional del movimiento"
                aria-invalid={Boolean(errors.note)}
                {...register('note')}
              />
              {errors.note && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.note.message}
                </p>
              )}
            </div>
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
              disabled={mutation.isPending || categories.length === 0}
            >
              {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
