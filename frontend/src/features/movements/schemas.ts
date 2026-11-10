import { z } from 'zod'
import { isoToDateTimeLocalValue } from '@/lib/format'
import {
  paymentMethodValues,
  type MovementType,
  type PaymentMethod,
} from '@/types/finance'
import type { Movement } from './types'

export const movementSchema = z.object({
  type: z.string().min(1, 'Seleccioná el tipo de movimiento'),
  amount: z
    .string()
    .trim()
    .min(1, 'Ingresá el importe')
    .refine((value) => {
      const amount = Number(value.replace(',', '.'))
      return Number.isFinite(amount) && amount > 0
    }, 'El importe debe ser mayor a 0')
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.replace(',', '.')), {
      message: 'El importe debe tener como máximo 2 decimales',
    }),
  categoryId: z.string().min(1, 'Seleccioná una categoría'),
  movementDate: z.string().min(1, 'Ingresá la fecha del movimiento'),
  currency: z.enum(['ARS', 'USD', 'EUR']),
  paymentMethod: z.union([z.literal(''), z.enum(paymentMethodValues)]),
  note: z.string().max(500, 'La observación no puede superar los 500 caracteres'),
})

export type MovementFormInput = z.infer<typeof movementSchema>

export function movementToFormValues(
  movement: Movement | null,
  defaultDate: string,
): MovementFormInput {
  if (!movement) {
    return {
      type: '',
      amount: '',
      categoryId: '',
      movementDate: defaultDate,
      currency: 'ARS',
      paymentMethod: '',
      note: '',
    }
  }

  return {
    type: movement.type,
    amount: Number(movement.amount).toFixed(2),
    categoryId: String(movement.categoryId),
    movementDate: isoToDateTimeLocalValue(movement.movementDate),
    currency: movement.currency,
    paymentMethod: movement.paymentMethod ?? '',
    note: movement.note ?? '',
  }
}

export function formValuesToPayload(values: MovementFormInput) {
  return {
    type: values.type as MovementType,
    amount: Number(values.amount.replace(',', '.')),
    categoryId: Number(values.categoryId),
    movementDate: new Date(values.movementDate).toISOString(),
    currency: values.currency,
    paymentMethod:
      values.paymentMethod === ''
        ? null
        : (values.paymentMethod as PaymentMethod),
    note: values.note.trim() || null,
  }
}
