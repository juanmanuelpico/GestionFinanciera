import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { createCategory, updateCategory } from '../categories-api'
import {
  categorySchema,
  categoryToThresholdFormValues,
  categoryTypeToFormValue,
  formValueToCategoryType,
  formValueToThreshold,
  NO_CATEGORY_TYPE,
  NO_THRESHOLD_CURRENCY,
  type CategoryFormValues,
} from '../schemas'
import type { Category } from '../types'

interface CategoryFormDialogProps {
  open: boolean
  category: Category | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function CategoryFormDialog({
  open,
  category,
  onOpenChange,
  onSaved,
}: CategoryFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: NO_CATEGORY_TYPE,
      thresholdAmount: '',
      thresholdCurrency: NO_THRESHOLD_CURRENCY,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = {
        name: values.name.trim(),
        type: formValueToCategoryType(values.type),
        ...formValueToThreshold(values),
      }

      return category
        ? updateCategory(category.id, payload)
        : createCategory(payload)
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

    reset({
      name: category?.name ?? '',
      type: categoryTypeToFormValue(category?.type ?? null),
      ...categoryToThresholdFormValues(category),
    })
  }, [open, category, reset])

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
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 pr-12">
          <DialogTitle>
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </DialogTitle>
          <DialogDescription>
            Las categorías agrupan tus ingresos y egresos.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="-mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                placeholder="Ej: Alimentos"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-destructive text-sm break-words" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-type">Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category-type" aria-label="Tipo">
                      <SelectValue placeholder="Sin tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY_TYPE}>Sin tipo</SelectItem>
                      <SelectItem value="INGRESO">Ingreso</SelectItem>
                      <SelectItem value="EGRESO">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-muted-foreground text-xs">
                Si elegís un tipo, la categoría solo se podrá usar en
                movimientos de ese tipo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-threshold-amount">Umbral máximo</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
                <Input
                  id="category-threshold-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="Sin umbral"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.thresholdAmount)}
                  {...register('thresholdAmount')}
                />
                <Controller
                  control={control}
                  name="thresholdCurrency"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id="category-threshold-currency"
                        aria-label="Moneda del umbral"
                        aria-invalid={Boolean(errors.thresholdCurrency)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_THRESHOLD_CURRENCY}>
                          Moneda
                        </SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.thresholdAmount && (
                <p
                  className="text-destructive text-sm break-words"
                  role="alert"
                >
                  {errors.thresholdAmount.message}
                </p>
              )}
              {errors.thresholdCurrency && (
                <p
                  className="text-destructive text-sm break-words"
                  role="alert"
                >
                  {errors.thresholdCurrency.message}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Importe tope de egresos por mes para el Control de Gastos. Se
                avisa al alcanzar el 80 % del umbral.
              </p>
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
