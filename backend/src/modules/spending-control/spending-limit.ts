import { Prisma } from '@prisma/client';

export const SPENDING_WARNING_RATIO = 0.8;

export type SpendingLimitStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export interface SpendingLimitEvaluation {
  percent: number;
  status: SpendingLimitStatus;
}

export interface SpendingAlert {
  categoryId: number;
  categoryName: string;
  currency: string;
  period: string;
  thresholdAmount: string;
  spentAmount: string;
  percent: number;
  status: 'WARNING' | 'EXCEEDED';
}

export function currentUtcPeriod(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function utcMonthRange(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

export function evaluateSpendingLimit(
  threshold: Prisma.Decimal,
  spent: Prisma.Decimal,
): SpendingLimitEvaluation {
  const percent = threshold.isZero()
    ? 0
    : Math.floor(spent.div(threshold).mul(1000).toNumber()) / 10;

  const status: SpendingLimitStatus = spent.gte(threshold)
    ? 'EXCEEDED'
    : spent.gte(threshold.mul(SPENDING_WARNING_RATIO))
      ? 'WARNING'
      : 'OK';

  return { percent, status };
}
