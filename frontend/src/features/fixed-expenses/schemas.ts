import { z } from 'zod'
import { todayDateInputValue } from '@/lib/format'
import type { Currency } from '@/types/finance'
import type { FixedExpense, FixedExpensePayload } from './types'

export const fixedExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio')
    .max(120, 'El título no puede superar los 120 caracteres'),
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
  currency: z.enum(['ARS', 'USD', 'EUR']),
  categoryId: z.string().min(1, 'Seleccioná una categoría'),
  firstDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá la fecha del próximo vencimiento'),
  intervalMonths: z
    .string()
    .trim()
    .min(1, 'Ingresá cada cuántos meses vence')
    .refine((value) => {
      const months = Number(value)
      return Number.isInteger(months) && months >= 1 && months <= 120
    }, 'La frecuencia debe ser un entero entre 1 y 120 meses'),
  active: z.boolean(),
})

export type FixedExpenseFormValues = z.infer<typeof fixedExpenseSchema>

export function fixedExpenseToFormValues(
  expense: FixedExpense | null,
  defaultCurrency: Currency,
): FixedExpenseFormValues {
  if (!expense) {
    return {
      title: '',
      amount: '',
      currency: defaultCurrency,
      categoryId: '',
      firstDueDate: todayDateInputValue(),
      intervalMonths: '1',
      active: true,
    }
  }

  return {
    title: expense.title,
    amount: Number(expense.amount).toFixed(2),
    currency: expense.currency,
    categoryId: String(expense.categoryId),
    firstDueDate: expense.firstDueDate,
    intervalMonths: String(expense.intervalMonths),
    active: expense.active,
  }
}

export function formValuesToFixedExpensePayload(
  values: FixedExpenseFormValues,
): FixedExpensePayload {
  return {
    title: values.title.trim(),
    amount: Number(values.amount.replace(',', '.')),
    currency: values.currency,
    categoryId: Number(values.categoryId),
    firstDueDate: values.firstDueDate,
    intervalMonths: Number(values.intervalMonths),
    active: values.active,
  }
}
