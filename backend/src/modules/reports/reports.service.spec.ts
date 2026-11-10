import { BadRequestException } from '@nestjs/common';
import {
  DebtActorType,
  DebtKind,
  DebtStatus,
  MovementType,
  Prisma,
  SavingEventType,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { periodFromDate } from '../fixed-expenses/fixed-expense-calculations.js';
import { ReportsService } from './reports.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

const juan = {
  id: 'actor-1',
  userId,
  type: DebtActorType.PERSONA,
  firstName: 'Juan',
  lastName: 'Pérez',
  alias: null,
};

function makeSetup(options: {
  events?: unknown[];
  grouped?: unknown[];
  categories?: unknown[];
  debts?: unknown[];
  settlements?: unknown[];
  expenses?: unknown[];
  payments?: unknown[];
} = {}) {
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn(async () => ({ headerCurrency: 'ARS' })),
    },
    savingEvent: {
      findMany: vi.fn(async () => options.events ?? []),
    },
    movement: {
      groupBy: vi.fn(async () => options.grouped ?? []),
    },
    category: {
      findMany: vi.fn(async () => options.categories ?? []),
    },
    debt: {
      findMany: vi.fn(async () => options.debts ?? []),
    },
    debtSettlement: {
      findMany: vi.fn(async () => options.settlements ?? []),
    },
    fixedExpense: {
      findMany: vi.fn(async () => options.expenses ?? []),
    },
    fixedExpensePayment: {
      findMany: vi.fn(async () => options.payments ?? []),
    },
    $transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg as Promise<unknown>[])
        : (arg as (tx: typeof prisma) => Promise<unknown>)(prisma),
    ),
  };

  const service = new ReportsService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('ReportsService.resolveRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza un rango invertido', async () => {
    const { service } = makeSetup();

    await expect(
      service.savingsMonthly(userId, { from: '2026-05', to: '2026-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('limita el período a 48 meses', async () => {
    const { service } = makeSetup();

    await expect(
      service.savingsMonthly(userId, { from: '2020-01', to: '2026-01' }),
    ).rejects.toThrow(/48 meses/);
  });

  it('sin rango usa los últimos 12 meses hasta el actual', async () => {
    const { service, prisma } = makeSetup();

    const result = await service.savingsMonthly(userId, {});

    const to = periodFromDate(new Date());
    expect(result.to).toBe(to);
    expect(result.items).toHaveLength(12);
    expect(result.items[11]?.period).toBe(to);
    expect(prisma.savingEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId, currency: 'ARS' }),
      }),
    );
  });
});

describe('ReportsService.savingsMonthly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('agrupa aportes y retiros por mes y calcula la media', async () => {
    const { service } = makeSetup({
      events: [
        {
          type: SavingEventType.ALTA,
          amount: new Prisma.Decimal('100'),
          createdAt: new Date('2026-10-05T12:00:00.000Z'),
        },
        {
          type: SavingEventType.AJUSTE_SUMA,
          amount: new Prisma.Decimal('50'),
          createdAt: new Date('2026-10-20T12:00:00.000Z'),
        },
        {
          type: SavingEventType.DEVOLUCION,
          amount: new Prisma.Decimal('30'),
          createdAt: new Date('2026-11-02T12:00:00.000Z'),
        },
        {
          type: SavingEventType.CONVERSION,
          amount: new Prisma.Decimal('999'),
          createdAt: new Date('2026-10-10T12:00:00.000Z'),
        },
      ],
    });

    const result = await service.savingsMonthly(userId, {
      from: '2026-09',
      to: '2026-11',
      currency: 'ARS',
    });

    expect(result.items).toEqual([
      { period: '2026-09', contributed: 0, returned: 0, net: 0 },
      { period: '2026-10', contributed: 150, returned: 0, net: 150 },
      { period: '2026-11', contributed: 0, returned: 30, net: -30 },
    ]);
    expect(result.summary.totalContributed).toBe(150);
    expect(result.summary.totalReturned).toBe(30);
    expect(result.summary.totalNet).toBe(120);
    expect(result.summary.averageMonthlyContributed).toBe(50);
    expect(result.summary.averageMonthlyNet).toBe(40);
  });
});

describe('ReportsService.movementsTopCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ordena por cantidad, aplica el top N y el share', async () => {
    const { service, prisma } = makeSetup({
      grouped: [
        {
          categoryId: 1,
          type: MovementType.EGRESO,
          _count: { _all: 3 },
          _sum: { amount: new Prisma.Decimal('300') },
        },
        {
          categoryId: 2,
          type: MovementType.EGRESO,
          _count: { _all: 10 },
          _sum: { amount: new Prisma.Decimal('2000') },
        },
        {
          categoryId: 3,
          type: MovementType.INGRESO,
          _count: { _all: 2 },
          _sum: { amount: new Prisma.Decimal('5000') },
        },
      ],
      categories: [
        { id: 1, name: 'Alimentos' },
        { id: 2, name: 'Transporte' },
        { id: 3, name: 'Sueldo' },
      ],
    });

    const result = await service.movementsTopCategories(userId, {
      from: '2026-01',
      to: '2026-11',
      currency: 'ARS',
      type: MovementType.EGRESO,
      limit: 2,
    });

    expect(prisma.movement.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['categoryId', 'type'],
        where: expect.objectContaining({
          userId,
          currency: 'ARS',
          type: MovementType.EGRESO,
        }),
      }),
    );
    // El mock devuelve las 3 filas (3+10+2); el filtro real de tipo lo hace la BD
    expect(result.totalMovements).toBe(15);
    expect(result.items.map((item) => item.categoryName)).toEqual([
      'Transporte',
      'Alimentos',
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        count: 10,
        totalAmount: 2000,
        sharePercent: 66.67,
      }),
    );
  });

  it('sin filtro de tipo agrupa ingreso y egreso por separado', async () => {
    const { service, prisma } = makeSetup({
      grouped: [
        {
          categoryId: 1,
          type: MovementType.INGRESO,
          _count: { _all: 4 },
          _sum: { amount: new Prisma.Decimal('4000') },
        },
      ],
      categories: [{ id: 1, name: 'Sueldo' }],
    });

    const result = await service.movementsTopCategories(userId, {
      limit: 10,
    });

    const where = prisma.movement.groupBy.mock.calls[0]![0].where;
    expect(where.type).toBeUndefined();
    expect(result.items[0]?.type).toBe(MovementType.INGRESO);
  });
});

describe('ReportsService.movementsCategoryAverages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('divide el total entre los meses del período', async () => {
    const { service } = makeSetup({
      grouped: [
        {
          categoryId: 7,
          type: MovementType.EGRESO,
          _count: { _all: 6 },
          _sum: { amount: new Prisma.Decimal('900') },
        },
      ],
      categories: [{ id: 7, name: 'Servicios' }],
    });

    const result = await service.movementsCategoryAverages(userId, {
      from: '2026-06',
      to: '2026-11',
      currency: 'ARS',
    });

    expect(result.monthCount).toBe(6);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        categoryName: 'Servicios',
        totalAmount: 900,
        monthlyAverage: 150,
      }),
    );
  });
});

describe('ReportsService.debtsStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calcula KPIs, serie mensual y ranking de deudores', async () => {
    const today = new Date();
    const pastDue = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 15),
    );

    const thirdDebt = {
      id: 'debt-1',
      userId,
      actorId: juan.id,
      kind: DebtKind.TERCERO,
      currency: 'ARS',
      totalAmount: new Prisma.Decimal('300'),
      status: DebtStatus.ACTIVA,
      actor: juan,
      installments: [
        {
          dueDate: pastDue,
          paidAt: pastDue,
          paidAmount: new Prisma.Decimal('100'),
          amount: new Prisma.Decimal('100'),
        },
        {
          dueDate: pastDue,
          paidAt: null,
          paidAmount: new Prisma.Decimal('0'),
          amount: new Prisma.Decimal('200'),
        },
      ],
    };

    const ownDebt = {
      id: 'debt-2',
      userId,
      actorId: 'actor-2',
      kind: DebtKind.PROPIA,
      currency: 'ARS',
      totalAmount: new Prisma.Decimal('1000'),
      status: DebtStatus.ACTIVA,
      actor: { ...juan, id: 'actor-2', firstName: 'Ana', lastName: 'Gómez' },
      installments: [
        {
          dueDate: pastDue,
          paidAt: null,
          paidAmount: new Prisma.Decimal('400'),
          amount: new Prisma.Decimal('500'),
        },
        {
          dueDate: thisMonth,
          paidAt: null,
          paidAmount: new Prisma.Decimal('0'),
          amount: new Prisma.Decimal('500'),
        },
      ],
    };

    const currentPeriodKey = periodFromDate(new Date());

    const { service } = makeSetup({
      debts: [thirdDebt, ownDebt],
      settlements: [
        {
          paymentDate: new Date(
            Date.UTC(
              Number(currentPeriodKey.slice(0, 4)),
              Number(currentPeriodKey.slice(5, 7)) - 1,
              10,
            ),
          ),
          totalAmount: new Prisma.Decimal('100'),
          debt: { kind: DebtKind.TERCERO },
        },
        {
          paymentDate: new Date(
            Date.UTC(
              Number(currentPeriodKey.slice(0, 4)),
              Number(currentPeriodKey.slice(5, 7)) - 1,
              12,
            ),
          ),
          totalAmount: new Prisma.Decimal('40'),
          debt: { kind: DebtKind.PROPIA },
        },
      ],
    });

    const result = await service.debtsStats(userId, {
      from: currentPeriodKey,
      to: currentPeriodKey,
      currency: 'ARS',
    });

    expect(result.kpis).toEqual({
      ownOutstanding: 600,
      ownOverdueAmount: 100,
      ownActiveDebts: 1,
      thirdOutstanding: 200,
      thirdOverdueAmount: 200,
      thirdActiveDebts: 1,
      overdueInstallments: 1,
      paidInstallmentsPercent: 25,
    });

    expect(result.series).toEqual([
      { period: currentPeriodKey, received: 100, paid: 40 },
    ]);
    expect(result.topDebtors).toEqual([
      { actorId: juan.id, displayName: 'Juan Pérez', outstanding: 200 },
    ]);
  });
});

describe('ReportsService.fixedExpensesMonthly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compara lo esperado contra lo pagado por mes', async () => {
    const { service } = makeSetup({
      expenses: [
        {
          id: 'fe-1',
          firstDueDate: new Date('2026-01-10T00:00:00.000Z'),
          intervalMonths: 1,
          amount: new Prisma.Decimal('1000'),
        },
      ],
      payments: [
        {
          fixedExpenseId: 'fe-1',
          period: new Date('2026-10-01T00:00:00.000Z'),
          movement: { amount: new Prisma.Decimal('1000') },
        },
      ],
    });

    const result = await service.fixedExpensesMonthly(userId, {
      from: '2026-09',
      to: '2026-11',
      currency: 'ARS',
    });

    expect(result.items).toEqual([
      {
        period: '2026-09',
        expected: 1000,
        paid: 0,
        dueCount: 1,
        paidCount: 0,
        compliancePercent: 0,
      },
      {
        period: '2026-10',
        expected: 1000,
        paid: 1000,
        dueCount: 1,
        paidCount: 1,
        compliancePercent: 100,
      },
      {
        period: '2026-11',
        expected: 1000,
        paid: 0,
        dueCount: 1,
        paidCount: 0,
        compliancePercent: 0,
      },
    ]);
    expect(result.summary).toEqual({ totalExpected: 3000, totalPaid: 1000 });
  });
});
