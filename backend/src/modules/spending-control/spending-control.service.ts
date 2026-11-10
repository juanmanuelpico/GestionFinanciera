import { Injectable } from '@nestjs/common';
import { MovementType, Prisma, type Category } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  currentUtcPeriod,
  evaluateSpendingLimit,
  utcMonthRange,
  type SpendingLimitStatus,
} from './spending-limit.js';

export interface SpendingControlRow {
  categoryId: number;
  categoryName: string;
  thresholdAmount: string;
  thresholdCurrency: string;
  spentAmount: string;
  percent: number;
  status: SpendingLimitStatus;
}

export interface SpendingControlSummary {
  period: string;
  rows: SpendingControlRow[];
}

type CategoryThreshold = Pick<
  Category,
  'id' | 'name' | 'thresholdAmount' | 'thresholdCurrency'
>;

@Injectable()
export class SpendingControlService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<SpendingControlSummary> {
    const now = new Date();
    const categories = await this.prisma.category.findMany({
      where: { userId, thresholdAmount: { gt: 0 } },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      return { period: currentUtcPeriod(now), rows: [] };
    }

    const { start, end } = utcMonthRange(now);
    const grouped = await this.prisma.movement.groupBy({
      by: ['categoryId', 'currency'],
      where: {
        userId,
        type: MovementType.EGRESO,
        movementDate: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });

    const spentByKey = new Map<string, Prisma.Decimal>();
    for (const entry of grouped) {
      spentByKey.set(`${entry.categoryId}|${entry.currency}`, entry._sum.amount ?? new Prisma.Decimal(0));
    }

    const rows = categories.map((category) =>
      this.toRow(category, spentByKey),
    );

    return { period: currentUtcPeriod(now), rows };
  }

  private toRow(
    category: CategoryThreshold,
    spentByKey: Map<string, Prisma.Decimal>,
  ): SpendingControlRow {
    const thresholdAmount = category.thresholdAmount!;
    const spent =
      spentByKey.get(`${category.id}|${category.thresholdCurrency}`) ??
      new Prisma.Decimal(0);

    const evaluation = evaluateSpendingLimit(thresholdAmount, spent);

    return {
      categoryId: category.id,
      categoryName: category.name,
      thresholdAmount: thresholdAmount.toFixed(2),
      thresholdCurrency: category.thresholdCurrency!,
      spentAmount: spent.toFixed(2),
      percent: evaluation.percent,
      status: evaluation.status,
    };
  }
}
