export type MovementType = 'INGRESO' | 'EGRESO'

export type Currency = 'ARS' | 'USD' | 'EUR'

export const movementTypeLabels: Record<MovementType, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
}

export const movementTypeOptions: { value: MovementType; label: string }[] = [
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'EGRESO', label: 'Egreso' },
]

export const currencyOptions: { value: Currency; label: string }[] = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
]

export const paymentMethodValues = [
  'EFECTIVO',
  'DEBITO',
  'CREDITO',
  'TRANSFERENCIA',
  'MERCADO_PAGO',
  'OTRO',
] as const

export type PaymentMethod = (typeof paymentMethodValues)[number]

export const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'CREDITO', label: 'Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'OTRO', label: 'Otro' },
]

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
  OTRO: 'Otro',
}
