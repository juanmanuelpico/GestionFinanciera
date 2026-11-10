import type { SpendingAlert } from '@/features/spending-control/types'
import type { Currency } from '@/types/finance'

export type DebtKind = 'PROPIA' | 'TERCERO'
export type DebtStatus = 'ACTIVA' | 'FINALIZADA'
export type DebtActorType = 'PERSONA' | 'TARJETA'
export type DebtSettlementStatus = 'ACTIVA' | 'REVERTIDA'
/** Avance de pagos/cobros de una deuda, derivado de los importes pagados. */
export type DebtPaymentProgress = 'NONE' | 'PARTIAL' | 'FULL'

export const debtKindLabels: Record<DebtKind, string> = {
  PROPIA: 'Deuda propia',
  TERCERO: 'Deuda de tercero',
}

export const debtActorTypeLabels: Record<DebtActorType, string> = {
  PERSONA: 'Persona',
  TARJETA: 'Tarjeta',
}

export const debtStatusLabels: Record<DebtStatus, string> = {
  ACTIVA: 'Activa',
  FINALIZADA: 'Finalizada',
}

export interface DebtActorBrief {
  id: string
  type: DebtActorType
  displayName: string
  brand: string | null
  issuer: string | null
  lastFour: string | null
}

export interface DebtActor {
  id: string
  type: DebtActorType
  displayName: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  alias: string | null
  issuer: string | null
  brand: string | null
  lastFour: string | null
  closingDay: number | null
  paymentDueDay: number | null
  defaultWalletCurrency: Currency | null
  debtCount: number
  createdAt: string
  updatedAt: string
}

export interface PaginatedDebtActors {
  items: DebtActor[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DebtActorPayload {
  type: DebtActorType
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  email?: string | null
  alias?: string | null
  issuer?: string | null
  brand?: string | null
  lastFour?: string | null
  closingDay?: number | null
  paymentDueDay?: number | null
  defaultWalletCurrency?: Currency | null
}

export interface Debt {
  id: string
  kind: DebtKind
  code: string
  status: DebtStatus
  currency: Currency
  totalAmount: string
  installmentCount: number
  operationDate: string
  firstDueDate: string
  note: string | null
  splitCode: string | null
  hasActiveSettlement: boolean
  actor: DebtActorBrief
  createdAt: string
  paidInstallments: number
  paidAmount: string
  remainingAmount: string
  nextDueDate: string | null
  paymentProgress: DebtPaymentProgress
}

export interface PaginatedDebts {
  items: Debt[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DebtQueryFilters {
  search?: string
  status?: DebtStatus
  actorType?: DebtActorType
  currency?: Currency
}

export interface DebtQuery extends DebtQueryFilters {
  kind: DebtKind
  page: number
  limit: number
}

export interface DebtInstallment {
  id: string
  number: number
  dueDate: string
  amount: string
  paidAmount: string
  paidAt: string | null
}

export interface DebtDetail extends Debt {
  installments: DebtInstallment[]
  spendingAlert?: SpendingAlert | null
}

export interface CreateDebtPayload {
  kind: DebtKind
  actorId: string
  currency: Currency
  totalAmount: number
  installmentCount: number
  operationDate: string
  firstDueDate: string
  note: string
}

export type SplitPayer = 'USER' | 'ACTOR'

export interface DebtSplitItem {
  actorId: string
  displayName: string
  amount: string
}

export interface DebtSplitDebtRef {
  id: string
  code: string
  kind: DebtKind
  totalAmount: string
}

export interface DebtSplit {
  id: string
  code: string
  currency: Currency
  totalAmount: string
  userAmount: string
  payer: SplitPayer
  payerActorId: string | null
  payerDisplayName: string | null
  note: string | null
  operationDate: string
  items: DebtSplitItem[]
  debts: DebtSplitDebtRef[]
  createdAt: string
}

export interface PaginatedDebtSplits {
  items: DebtSplit[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateDebtSplitPayload {
  currency: Currency
  totalAmount: number
  userAmount: number
  payer: SplitPayer
  payerActorId?: string | null
  items: { actorId: string; amount: number }[]
  note: string
}

export interface PayDebtPayload {
  quantity: number
  paymentDate: string
  amounts?: number[]
}

export interface DebtSettlementItem {
  id: string
  installmentId: string
  installmentNumber: number
  amount: string
}

export interface DebtSettlement {
  id: string
  debtId: string
  walletCurrency: Currency
  paymentDate: string
  totalAmount: string
  installmentCount: number
  status: DebtSettlementStatus
  reversedAt: string | null
  createdAt: string
  items: DebtSettlementItem[]
}
