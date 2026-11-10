import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DebtKind,
  DebtSettlementStatus,
  DebtStatus,
  MovementType,
  SavingEventType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { displayNameOf } from '../debts/debt-actors.service.js';
import {
  currentPeriod,
  isDueInPeriod,
  parsePeriod,
  periodFromDate,
} from '../fixed-expenses/fixed-expense-calculations.js';
import type {
  ReportCurrency,
  ReportQueryDto,
  TopCategoriesDto,
} from './dto/report-query.dto.js';

const MAX_PERIOD_MONTHS = 48;

const CONTRIBUTION_EVENTS: SavingEventType[] = [
  SavingEventType.ALTA,
  SavingEventType.AJUSTE_SUMA,
];
const WITHDRAWAL_EVENTS: SavingEventType[] = [
  SavingEventType.DEVOLUCION,
  SavingEventType.AJUSTE_RESTA,
];

export interface SavingsMonthlyReport {
  currency: ReportCurrency;
  from: string;
  to: string;
  items: Array<{
    period: string;
    contributed: number;
    returned: number;
    net: number;
  }>;
  summary: {
    totalContributed: number;
    totalReturned: number;
    totalNet: number;
    averageMonthlyContributed: number;
    averageMonthlyNet: number;
  };
}

export interface TopCategoriesReport {
  currency: ReportCurrency;
  from: string;
  to: string;
  totalMovements: number;
  items: Array<{
    categoryId: number;
    categoryName: string;
    type: MovementType;
    count: number;
    totalAmount: number;
    sharePercent: number;
  }>;
}

export interface CategoryAveragesReport {
  currency: ReportCurrency;
  from: string;
  to: string;
  monthCount: number;
  items: Array<{
    categoryId: number;
    categoryName: string;
    type: MovementType;
    count: number;
    totalAmount: number;
    monthlyAverage: number;
  }>;
}

export interface DebtsStatsReport {
  currency: ReportCurrency;
  from: string;
  to: string;
  kpis: {
    ownOutstanding: number;
    ownOverdueAmount: number;
    ownActiveDebts: number;
    thirdOutstanding: number;
    thirdOverdueAmount: number;
    thirdActiveDebts: number;
    overdueInstallments: number;
    paidInstallmentsPercent: number | null;
  };
  series: Array<{ period: string; received: number; paid: number }>;
  topDebtors: Array<{ actorId: string; displayName: string; outstanding: number }>;
}

export interface FixedExpensesMonthlyReport {
  currency: ReportCurrency;
  from: string;
  to: string;
  items: Array<{
    period: string;
    expected: number;
    paid: number;
    dueCount: number;
    paidCount: number;
    compliancePercent: number | null;
  }>;
  summary: { totalExpected: number; totalPaid: number };
}

interface PeriodRange {
  from: Date;
  to: Date;
  endExclusive: Date;
  months: Date[];
  fromPeriod: string;
  toPeriod: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async savingsMonthly(
    userId: string,
    query: ReportQueryDto,
  ): Promise<SavingsMonthlyReport> {
    const range = await this.resolveRange(userId, query);
    const currency = range.currency;

    const events = await this.prisma.savingEvent.findMany({
      where: {
        userId,
        currency,
        createdAt: { gte: range.from, lt: range.endExclusive },
      },
      select: { type: true, amount: true, createdAt: true },
    });

    const buckets = new Map<
      string,
      { contributed: Prisma.Decimal; returned: Prisma.Decimal }
    >();

    for (const event of events) {
      const period = periodFromDate(event.createdAt);
      const bucket =
        buckets.get(period) ??
        {
          contributed: new Prisma.Decimal(0),
          returned: new Prisma.Decimal(0),
        };

      if (CONTRIBUTION_EVENTS.includes(event.type)) {
        bucket.contributed = bucket.contributed.add(event.amount);
      } else if (WITHDRAWAL_EVENTS.includes(event.type)) {
        bucket.returned = bucket.returned.add(event.amount);
      }

      buckets.set(period, bucket);
    }

    const items = range.months.map((month) => {
      const bucket = buckets.get(periodFromDate(month));
      const contributed = bucket?.contributed ?? new Prisma.Decimal(0);
      const returned = bucket?.returned ?? new Prisma.Decimal(0);

      return {
        period: periodFromDate(month),
        contributed: round2(contributed.toNumber()),
        returned: round2(returned.toNumber()),
        net: round2(contributed.sub(returned).toNumber()),
      };
    });

    const totalContributed = items.reduce(
      (acc, item) => acc + item.contributed,
      0,
    );
    const totalReturned = items.reduce((acc, item) => acc + item.returned, 0);
    const monthCount = items.length;

    return {
      currency,
      from: range.fromPeriod,
      to: range.toPeriod,
      items,
      summary: {
        totalContributed: round2(totalContributed),
        totalReturned: round2(totalReturned),
        totalNet: round2(totalContributed - totalReturned),
        averageMonthlyContributed: round2(totalContributed / monthCount),
        averageMonthlyNet: round2(
          (totalContributed - totalReturned) / monthCount,
        ),
      },
    };
  }

  async movementsTopCategories(
    userId: string,
    query: TopCategoriesDto,
  ): Promise<TopCategoriesReport> {
    const range = await this.resolveRange(userId, query);
    const rows = await this.groupMovements(userId, range, query.type);

    const totalMovements = rows.reduce((acc, row) => acc + row.count, 0);

    const sorted = [...rows]
      .sort(
        (a, b) =>
          b.count - a.count || b.totalAmount.comparedTo(a.totalAmount),
      )
      .slice(0, query.limit);

    const names = await this.categoryNames(userId, sorted.map((r) => r.categoryId));

    return {
      currency: range.currency,
      from: range.fromPeriod,
      to: range.toPeriod,
      totalMovements,
      items: sorted.map((row) => ({
        categoryId: row.categoryId,
        categoryName: names.get(row.categoryId) ?? '—',
        type: row.type,
        count: row.count,
        totalAmount: round2(row.totalAmount.toNumber()),
        sharePercent:
          totalMovements === 0
            ? 0
            : round2((row.count / totalMovements) * 100),
      })),
    };
  }

  async movementsCategoryAverages(
    userId: string,
    query: ReportQueryDto & { type?: MovementType },
  ): Promise<CategoryAveragesReport> {
    const range = await this.resolveRange(userId, query);
    const rows = await this.groupMovements(userId, range, query.type);

    const sorted = [...rows].sort((a, b) =>
      b.totalAmount.comparedTo(a.totalAmount),
    );
    const names = await this.categoryNames(userId, sorted.map((r) => r.categoryId));
    const monthCount = range.months.length;

    return {
      currency: range.currency,
      from: range.fromPeriod,
      to: range.toPeriod,
      monthCount,
      items: sorted.map((row) => ({
        categoryId: row.categoryId,
        categoryName: names.get(row.categoryId) ?? '—',
        type: row.type,
        count: row.count,
        totalAmount: round2(row.totalAmount.toNumber()),
        monthlyAverage: round2(row.totalAmount.toNumber() / monthCount),
      })),
    };
  }

  async debtsStats(
    userId: string,
    query: ReportQueryDto,
  ): Promise<DebtsStatsReport> {
    const range = await this.resolveRange(userId, query);
    const currency = range.currency;
    const today = new Date();

    const debts = await this.prisma.debt.findMany({
      where: { userId, currency },
      include: {
        actor: true,
        installments: {
          select: {
            dueDate: true,
            paidAt: true,
            paidAmount: true,
            amount: true,
          },
        },
      },
    });

    let ownOutstanding = new Prisma.Decimal(0);
    let ownOverdueAmount = new Prisma.Decimal(0);
    let thirdOutstanding = new Prisma.Decimal(0);
    let thirdOverdueAmount = new Prisma.Decimal(0);
    let ownActiveDebts = 0;
    let thirdActiveDebts = 0;
    let overdueInstallments = 0;
    let totalInstallments = 0;
    let paidInstallments = 0;

    const outstandingByActor = new Map<string, { name: string; total: Prisma.Decimal }>();

    for (const debt of debts) {
      const paid = debt.installments.reduce(
        (acc, installment) => acc.add(installment.paidAmount),
        new Prisma.Decimal(0),
      );
      const remaining = debt.totalAmount.sub(paid);

      for (const installment of debt.installments) {
        totalInstallments += 1;
        if (installment.paidAt !== null) {
          paidInstallments += 1;
        }
      }

      if (debt.status !== DebtStatus.ACTIVA) {
        continue;
      }

      const overdue = debt.installments.filter(
        (installment) =>
          installment.paidAmount.lt(installment.amount) &&
          installment.dueDate < today,
      );
      const overdueSum = overdue.reduce(
        (acc, installment) =>
          acc.add(installment.amount.sub(installment.paidAmount)),
        new Prisma.Decimal(0),
      );

      if (debt.kind === DebtKind.PROPIA) {
        ownActiveDebts += 1;
        ownOutstanding = ownOutstanding.add(remaining);
        ownOverdueAmount = ownOverdueAmount.add(overdueSum);
      } else {
        thirdActiveDebts += 1;
        thirdOutstanding = thirdOutstanding.add(remaining);
        thirdOverdueAmount = thirdOverdueAmount.add(overdueSum);
        overdueInstallments += overdue.length;

        if (remaining.gt(0)) {
          const current = outstandingByActor.get(debt.actorId) ?? {
            name: displayNameOf(debt.actor),
            total: new Prisma.Decimal(0),
          };
          current.total = current.total.add(remaining);
          outstandingByActor.set(debt.actorId, current);
        }
      }
    }

    const settlements = await this.prisma.debtSettlement.findMany({
      where: {
        status: DebtSettlementStatus.ACTIVA,
        paymentDate: { gte: range.from, lt: range.endExclusive },
        debt: { userId, currency },
      },
      select: {
        paymentDate: true,
        totalAmount: true,
        debt: { select: { kind: true } },
      },
    });

    const seriesMap = new Map<string, { received: Prisma.Decimal; paid: Prisma.Decimal }>();

    for (const settlement of settlements) {
      const period = periodFromDate(settlement.paymentDate);
      const bucket =
        seriesMap.get(period) ??
        {
          received: new Prisma.Decimal(0),
          paid: new Prisma.Decimal(0),
        };

      if (settlement.debt.kind === DebtKind.TERCERO) {
        bucket.received = bucket.received.add(settlement.totalAmount);
      } else {
        bucket.paid = bucket.paid.add(settlement.totalAmount);
      }

      seriesMap.set(period, bucket);
    }

    const series = range.months.map((month) => {
      const bucket = seriesMap.get(periodFromDate(month));
      return {
        period: periodFromDate(month),
        received: round2((bucket?.received ?? new Prisma.Decimal(0)).toNumber()),
        paid: round2((bucket?.paid ?? new Prisma.Decimal(0)).toNumber()),
      };
    });

    const topDebtors = [...outstandingByActor.entries()]
      .sort((a, b) => b[1].total.comparedTo(a[1].total))
      .slice(0, 5)
      .map(([actorId, entry]) => ({
        actorId,
        displayName: entry.name,
        outstanding: round2(entry.total.toNumber()),
      }));

    return {
      currency,
      from: range.fromPeriod,
      to: range.toPeriod,
      kpis: {
        ownOutstanding: round2(ownOutstanding.toNumber()),
        ownOverdueAmount: round2(ownOverdueAmount.toNumber()),
        ownActiveDebts: ownActiveDebts,
        thirdOutstanding: round2(thirdOutstanding.toNumber()),
        thirdOverdueAmount: round2(thirdOverdueAmount.toNumber()),
        thirdActiveDebts: thirdActiveDebts,
        overdueInstallments,
        paidInstallmentsPercent:
          totalInstallments === 0
            ? null
            : round2((paidInstallments / totalInstallments) * 100),
      },
      series,
      topDebtors,
    };
  }

  async fixedExpensesMonthly(
    userId: string,
    query: ReportQueryDto,
  ): Promise<FixedExpensesMonthlyReport> {
    const range = await this.resolveRange(userId, query);
    const currency = range.currency;

    const [expenses, payments] = await this.prisma.$transaction([
      this.prisma.fixedExpense.findMany({
        where: { userId, currency },
        select: { id: true, firstDueDate: true, intervalMonths: true, amount: true },
      }),
      this.prisma.fixedExpensePayment.findMany({
        where: {
          period: { gte: range.from, lt: range.endExclusive },
          fixedExpense: { userId, currency },
        },
        select: {
          fixedExpenseId: true,
          period: true,
          movement: { select: { amount: true } },
        },
      }),
    ]);

    const paymentsByPeriod = new Map<
      string,
      { total: Prisma.Decimal; count: number }
    >();

    for (const payment of payments) {
      const period = periodFromDate(payment.period);
      const bucket =
        paymentsByPeriod.get(period) ??
        { total: new Prisma.Decimal(0), count: 0 };
      bucket.total = bucket.total.add(payment.movement.amount);
      bucket.count += 1;
      paymentsByPeriod.set(period, bucket);
    }

    const items = range.months.map((month) => {
      const period = periodFromDate(month);
      const due = expenses.filter((expense) =>
        isDueInPeriod(expense.firstDueDate, expense.intervalMonths, month),
      );
      const expected = due.reduce(
        (acc, expense) => acc.add(expense.amount),
        new Prisma.Decimal(0),
      );
      const bucket = paymentsByPeriod.get(period);
      const paidCount = bucket?.count ?? 0;

      return {
        period,
        expected: round2(expected.toNumber()),
        paid: round2((bucket?.total ?? new Prisma.Decimal(0)).toNumber()),
        dueCount: due.length,
        paidCount,
        compliancePercent:
          due.length === 0
            ? null
            : round2((Math.min(paidCount, due.length) / due.length) * 100),
      };
    });

    return {
      currency,
      from: range.fromPeriod,
      to: range.toPeriod,
      items,
      summary: {
        totalExpected: round2(
          items.reduce((acc, item) => acc + item.expected, 0),
        ),
        totalPaid: round2(items.reduce((acc, item) => acc + item.paid, 0)),
      },
    };
  }

  private async resolveRange(
    userId: string,
    query: ReportQueryDto,
  ): Promise<PeriodRange & { currency: ReportCurrency }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { headerCurrency: true },
    });

    const toPeriod = query.to ?? currentPeriod();
    const to = parsePeriod(toPeriod);
    const fromPeriod =
      query.from ?? periodFromDate(addMonths(to, -(MAX_DEFAULT_MONTHS - 1)));
    const from = parsePeriod(fromPeriod);

    if (from > to) {
      throw new BadRequestException('El rango de fechas no es válido');
    }

    const months: Date[] = [];
    let cursor = from;
    while (cursor <= to) {
      months.push(cursor);
      cursor = addMonths(cursor, 1);
    }

    if (months.length > MAX_PERIOD_MONTHS) {
      throw new BadRequestException(
        `El período no puede superar los ${MAX_PERIOD_MONTHS} meses`,
      );
    }

    return {
      from,
      to,
      endExclusive: addMonths(to, 1),
      months,
      fromPeriod,
      toPeriod,
      currency: (query.currency ?? user.headerCurrency) as ReportCurrency,
    };
  }

  private async groupMovements(
    userId: string,
    range: PeriodRange & { currency: ReportCurrency },
    type?: MovementType,
  ): Promise<
    Array<{
      categoryId: number;
      type: MovementType;
      count: number;
      totalAmount: Prisma.Decimal;
    }>
  > {
    const grouped = await this.prisma.movement.groupBy({
      by: ['categoryId', 'type'],
      where: {
        userId,
        currency: range.currency,
        movementDate: { gte: range.from, lt: range.endExclusive },
        ...(type ? { type } : {}),
      },
      _count: { _all: true },
      _sum: { amount: true },
    });

    return grouped.map((row) => ({
      categoryId: row.categoryId,
      type: row.type,
      count: row._count?._all ?? 0,
      totalAmount: row._sum?.amount ?? new Prisma.Decimal(0),
    }));
  }

  private async categoryNames(
    userId: string,
    categoryIds: number[],
  ): Promise<Map<number, string>> {
    if (categoryIds.length === 0) {
      return new Map();
    }

    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    return new Map(categories.map((category) => [category.id, category.name]));
  }
}

/** Suma meses a una fecha-only UTC conservando el día 1. */
function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

const MAX_DEFAULT_MONTHS = 12;
