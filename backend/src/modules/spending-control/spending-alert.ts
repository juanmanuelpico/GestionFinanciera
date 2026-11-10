import { Prisma, MovementType, type PrismaClient } from '@prisma/client';
import {
  currentUtcPeriod,
  evaluateSpendingLimit,
  utcMonthRange,
  type SpendingAlert,
} from './spending-limit.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function computeSpendingAlert(
  client: DbClient,
  params: {
    userId: string;
    categoryId: number;
    currency: string;
    movementDate: Date;
  },
): Promise<SpendingAlert | null> {
  const category = await client.category.findFirst({
    where: { id: params.categoryId, userId: params.userId },
    select: {
      id: true,
      name: true,
      thresholdAmount: true,
      thresholdCurrency: true,
    },
  });

  if (!category || !category.thresholdAmount || !category.thresholdCurrency) {
    return null;
  }

  if (category.thresholdCurrency !== params.currency) {
    return null;
  }

  const { start, end } = utcMonthRange(params.movementDate);

  const aggregate = await client.movement.aggregate({
    _sum: { amount: true },
    where: {
      userId: params.userId,
      categoryId: category.id,
      type: MovementType.EGRESO,
      currency: params.currency,
      movementDate: { gte: start, lt: end },
    },
  });

  const spent = aggregate._sum.amount ?? new Prisma.Decimal(0);
  const evaluation = evaluateSpendingLimit(category.thresholdAmount, spent);

  if (evaluation.status === 'OK') {
    return null;
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    currency: params.currency,
    period: currentUtcPeriod(params.movementDate),
    thresholdAmount: category.thresholdAmount.toFixed(2),
    spentAmount: spent.toFixed(2),
    percent: evaluation.percent,
    status: evaluation.status,
  };
}
