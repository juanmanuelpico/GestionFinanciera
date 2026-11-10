import {
  DebtActorType,
  DebtKind,
  DebtStatus,
  Prisma,
  type Debt,
  type DebtActor,
  type DebtInstallment,
} from '@prisma/client';
import { toDateOnly } from './debt-calculations.js';

export interface DebtActorBrief {
  id: string;
  type: DebtActorType;
  displayName: string;
  brand: string | null;
  issuer: string | null;
  lastFour: string | null;
}

export interface DebtInstallmentResponse {
  id: string;
  number: number;
  dueDate: string;
  amount: string;
  paidAmount: string;
  paidAt: string | null;
}

export interface DebtSummary {
  paidInstallments: number;
  paidAmount: string;
  remainingAmount: string;
  nextDueDate: string | null;
  paymentProgress: DebtPaymentProgress;
}

/** Avance de pagos/cobros derivado de los importes pagados (no se persiste). */
export type DebtPaymentProgress = 'NONE' | 'PARTIAL' | 'FULL';

export interface DebtResponse {
  id: string;
  kind: DebtKind;
  code: string;
  status: DebtStatus;
  currency: string;
  totalAmount: string;
  installmentCount: number;
  operationDate: string;
  firstDueDate: string;
  note: string | null;
  splitCode: string | null;
  hasActiveSettlement: boolean;
  actor: DebtActorBrief;
  createdAt: string;
  paidInstallments: number;
  paidAmount: string;
  remainingAmount: string;
  nextDueDate: string | null;
}

export type DebtWithRelations = Debt & {
  actor: DebtActor;
  installments: DebtInstallment[];
};

export function actorBriefOf(actor: DebtActor): DebtActorBrief {
  const displayName =
    actor.type === DebtActorType.PERSONA
      ? [actor.firstName, actor.lastName].filter(Boolean).join(' ')
      : (actor.alias ?? '');

  return {
    id: actor.id,
    type: actor.type,
    displayName,
    brand: actor.brand,
    issuer: actor.issuer,
    lastFour: actor.lastFour,
  };
}

export function computeDebtSummary(
  debt: Debt,
  installments: DebtInstallment[],
): DebtSummary {
  const zero = new Prisma.Decimal(0);
  let paid = zero;
  let paidCount = 0;
  let nextDue: Date | null = null;

  for (const installment of installments) {
    paid = paid.add(installment.paidAmount);

    if (installment.paidAt) {
      paidCount += 1;
    } else if (
      debt.status === DebtStatus.ACTIVA &&
      (!nextDue || installment.dueDate < nextDue)
    ) {
      nextDue = installment.dueDate;
    }
  }

  return {
    paidInstallments: paidCount,
    paidAmount: paid.toFixed(2),
    remainingAmount: debt.totalAmount.sub(paid).toFixed(2),
    nextDueDate: nextDue ? toDateOnly(nextDue) : null,
    paymentProgress: paid.lte(zero)
      ? 'NONE'
      : paid.gte(debt.totalAmount)
        ? 'FULL'
        : 'PARTIAL',
  };
}

export function mapInstallment(installment: DebtInstallment): DebtInstallmentResponse {
  return {
    id: installment.id,
    number: installment.number,
    dueDate: toDateOnly(installment.dueDate),
    amount: installment.amount.toFixed(2),
    paidAmount: installment.paidAmount.toFixed(2),
    paidAt: installment.paidAt ? installment.paidAt.toISOString() : null,
  };
}

export function mapDebtResponse(
  debt: DebtWithRelations,
  options: { hasActiveSettlement: boolean; splitCode?: string | null; installments?: DebtInstallmentResponse[] },
): DebtResponse & { installments?: DebtInstallmentResponse[] } {
  const summary = computeDebtSummary(debt, debt.installments);

  return {
    id: debt.id,
    kind: debt.kind,
    code: debt.code,
    status: debt.status,
    currency: debt.currency,
    totalAmount: debt.totalAmount.toFixed(2),
    installmentCount: debt.installmentCount,
    operationDate: toDateOnly(debt.operationDate),
    firstDueDate: toDateOnly(debt.firstDueDate),
    note: debt.note,
    splitCode: options.splitCode ?? null,
    hasActiveSettlement: options.hasActiveSettlement,
    actor: actorBriefOf(debt.actor),
    createdAt: debt.createdAt.toISOString(),
    ...summary,
    ...(options.installments
      ? { installments: options.installments }
      : {}),
  };
}
