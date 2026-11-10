import { z } from 'zod'
import type { MovementType } from '@/types/finance'

export const NO_CATEGORY_TYPE = 'NONE'
export const NO_THRESHOLD_CURRENCY = 'NONE'

function thresholdNumber(value: string): number {
  return Number(value.replace(',', '.'))
}

export const categorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio')
      .max(60, 'El nombre no puede superar los 60 caracteres'),
    type: z.enum([NO_CATEGORY_TYPE, 'INGRESO', 'EGRESO']),
    thresholdAmount: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || thresholdNumber(value) >= 0,
        'El umbral debe ser un importe mayor o igual a 0',
      )
      .refine(
        (value) => value === '' || /^\d+(\.\d{1,2})?$/.test(value.replace(',', '.')),
        'El umbral debe tener como máximo 2 decimales',
      ),
    thresholdCurrency: z.enum([
      NO_THRESHOLD_CURRENCY,
      'ARS',
      'USD',
      'EUR',
    ]),
  })
  .superRefine((values, ctx) => {
    const amount =
      values.thresholdAmount === '' ? 0 : thresholdNumber(values.thresholdAmount)

    if (amount > 0 && values.thresholdCurrency === NO_THRESHOLD_CURRENCY) {
      ctx.addIssue({
        code: 'custom',
        path: ['thresholdCurrency'],
        message: 'Elegí la moneda del umbral',
      })
    }
  })

export type CategoryFormValues = z.infer<typeof categorySchema>

export function categoryTypeToFormValue(
  type: MovementType | null,
): CategoryFormValues['type'] {
  return type ?? NO_CATEGORY_TYPE
}

export function formValueToCategoryType(
  value: CategoryFormValues['type'],
): MovementType | null {
  return value === NO_CATEGORY_TYPE ? null : value
}

export function formValueToThreshold(values: CategoryFormValues): {
  thresholdAmount: number | null
  thresholdCurrency: string | null
} {
  if (values.thresholdAmount === '') {
    return { thresholdAmount: null, thresholdCurrency: null }
  }

  const amount = thresholdNumber(values.thresholdAmount)

  if (!Number.isFinite(amount) || amount <= 0) {
    return { thresholdAmount: null, thresholdCurrency: null }
  }

  return {
    thresholdAmount: amount,
    thresholdCurrency:
      values.thresholdCurrency === NO_THRESHOLD_CURRENCY
        ? null
        : values.thresholdCurrency,
  }
}

export function categoryToThresholdFormValues(category: {
  thresholdAmount: string | null
  thresholdCurrency: string | null
} | null): {
  thresholdAmount: string
  thresholdCurrency: CategoryFormValues['thresholdCurrency']
} {
  return {
    thresholdAmount: category?.thresholdAmount
      ? String(Number(category.thresholdAmount))
      : '',
    thresholdCurrency:
      (category?.thresholdCurrency as CategoryFormValues['thresholdCurrency']) ??
      NO_THRESHOLD_CURRENCY,
  }
}
