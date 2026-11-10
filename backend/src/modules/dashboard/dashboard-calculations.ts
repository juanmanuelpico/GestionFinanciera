import { DebtActorType, DebtStatus } from '@prisma/client';
import {
  dueDateForPeriod,
  isDueInPeriod,
} from '../fixed-expenses/fixed-expense-calculations.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FixedExpenseRow {
  id: string;
  firstDueDate: Date;
  intervalMonths: number;
}

export interface FixedExpenseStats {
  paid: number;
  pending: number;
  overdue: number;
  dueSoon: number;
}

export interface DebtRow {
  actorId: string;
  actorType: DebtActorType;
  status: DebtStatus;
  installments: { dueDate: Date; paidAt: Date | null }[];
}

export interface DebtStats {
  people: number;
  activePeople: number;
  activeDebts: number;
  overdueDebts: number;
  overdueInstallments: number;
  peopleWithOverdue: number;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function summarizeFixedExpenses(
  expenses: FixedExpenseRow[],
  paidExpenseIds: Set<string>,
  periodStart: Date,
  now: Date,
): FixedExpenseStats {
  const today = startOfUtcDay(now);
  const soonLimit = addUtcDays(today, 3);
  let paid = 0;
  let pending = 0;
  let overdue = 0;
  let dueSoon = 0;

  const dueExpenses = expenses.filter((expense) =>
    isDueInPeriod(expense.firstDueDate, expense.intervalMonths, periodStart),
  );

  for (const expense of dueExpenses) {
    if (paidExpenseIds.has(expense.id)) {
      paid += 1;
      continue;
    }

    pending += 1;

    const dueDate = dueDateForPeriod(expense.firstDueDate, periodStart);
    if (dueDate < today) {
      overdue += 1;
    } else if (dueDate <= soonLimit) {
      dueSoon += 1;
    }
  }

  return { paid, pending, overdue, dueSoon };
}

export function summarizeDebts(debts: DebtRow[], now: Date): DebtStats {
  const today = startOfUtcDay(now);
  const people = new Set<string>();
  const activePeople = new Set<string>();
  const peopleWithOverdue = new Set<string>();
  let activeDebts = 0;
  let overdueDebts = 0;
  let overdueInstallments = 0;

  for (const debt of debts) {
    const isPerson = debt.actorType === DebtActorType.PERSONA;
    const isActive = debt.status === DebtStatus.ACTIVA;

    if (isPerson) {
      people.add(debt.actorId);
    }

    if (!isActive) {
      continue;
    }

    activeDebts += 1;
    if (isPerson) {
      activePeople.add(debt.actorId);
    }

    const hasOverdue = debt.installments.some(
      (installment) =>
        !installment.paidAt && startOfUtcDay(installment.dueDate) < today,
    );

    if (hasOverdue) {
      overdueDebts += 1;
      if (isPerson) {
        peopleWithOverdue.add(debt.actorId);
      }
    }

    overdueInstallments += debt.installments.filter(
      (installment) =>
        !installment.paidAt && startOfUtcDay(installment.dueDate) < today,
    ).length;
  }

  return {
    people: people.size,
    activePeople: activePeople.size,
    activeDebts,
    overdueDebts,
    overdueInstallments,
    peopleWithOverdue: peopleWithOverdue.size,
  };
}
