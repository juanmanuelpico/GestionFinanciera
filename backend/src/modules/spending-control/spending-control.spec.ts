import { Prisma, MovementType, type Category } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { computeSpendingAlert } from './spending-alert.js';
import { SpendingControlService } from './spending-control.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

function categoryWithThreshold(
  overrides: Partial<Category> = {},
): Category {
  return {
    id: 1,
    userId,
    name: 'Alimentos',
    type: MovementType.EGRESO,
    thresholdAmount: new Prisma.Decimal(1000),
    thresholdCurrency: 'ARS',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    movement: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
  };
}

describe('SpendingControlService.getSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evalúa cada categoría con umbral contra los egresos del mes', async () => {
    const prisma = createPrismaMock();
    prisma.category.findMany.mockResolvedValue([
      categoryWithThreshold(),
      categoryWithThreshold({
        id: 2,
        name: 'Transporte',
        thresholdAmount: new Prisma.Decimal(500),
      }),
      categoryWithThreshold({
        id: 3,
        name: 'Servicios',
        thresholdAmount: new Prisma.Decimal(2000),
      }),
    ]);
    prisma.movement.groupBy.mockResolvedValue([
      { categoryId: 1, currency: 'ARS', _sum: { amount: new Prisma.Decimal(900) } },
      { categoryId: 2, currency: 'ARS', _sum: { amount: new Prisma.Decimal(550) } },
      { categoryId: 3, currency: 'USD', _sum: { amount: new Prisma.Decimal(1500) } },
    ]);

    const service = new SpendingControlService(
      prisma as unknown as PrismaService,
    );
    const summary = await service.getSummary(userId);

    expect(summary.rows).toHaveLength(3);
    expect(summary.rows.map((row) => row.status)).toEqual([
      'WARNING',
      'EXCEEDED',
      'OK',
    ]);
    expect(summary.rows[0]).toMatchObject({
      categoryName: 'Alimentos',
      thresholdAmount: '1000.00',
      thresholdCurrency: 'ARS',
      spentAmount: '900.00',
      percent: 90,
    });
    expect(summary.rows[2].spentAmount).toBe('0.00');
  });

  it('omite la agrupación cuando no hay categorías con umbral', async () => {
    const prisma = createPrismaMock();
    prisma.category.findMany.mockResolvedValue([]);

    const service = new SpendingControlService(
      prisma as unknown as PrismaService,
    );
    const summary = await service.getSummary(userId);

    expect(summary.rows).toEqual([]);
    expect(prisma.movement.groupBy).not.toHaveBeenCalled();
    expect(summary.period).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('computeSpendingAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no avisa si la categoría no tiene umbral', async () => {
    const prisma = createPrismaMock();
    prisma.category.findFirst.mockResolvedValue(
      categoryWithThreshold({ thresholdAmount: null, thresholdCurrency: null }),
    );

    const alert = await computeSpendingAlert(
      prisma as unknown as PrismaService,
      {
        userId,
        categoryId: 1,
        currency: 'ARS',
        movementDate: new Date('2026-11-10T12:00:00.000Z'),
      },
    );

    expect(alert).toBeNull();
    expect(prisma.movement.aggregate).not.toHaveBeenCalled();
  });

  it('no avisa si el egreso es en otra moneda al umbral', async () => {
    const prisma = createPrismaMock();
    prisma.category.findFirst.mockResolvedValue(categoryWithThreshold());

    const alert = await computeSpendingAlert(
      prisma as unknown as PrismaService,
      {
        userId,
        categoryId: 1,
        currency: 'USD',
        movementDate: new Date('2026-11-10T12:00:00.000Z'),
      },
    );

    expect(alert).toBeNull();
  });

  it('devuelve el estado del umbral tras acumular el mes', async () => {
    const prisma = createPrismaMock();
    prisma.category.findFirst.mockResolvedValue(categoryWithThreshold());
    prisma.movement.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(820) },
    });

    const alert = await computeSpendingAlert(
      prisma as unknown as PrismaService,
      {
        userId,
        categoryId: 1,
        currency: 'ARS',
        movementDate: new Date('2026-11-10T12:00:00.000Z'),
      },
    );

    expect(alert).toEqual({
      categoryId: 1,
      categoryName: 'Alimentos',
      currency: 'ARS',
      period: '2026-11',
      thresholdAmount: '1000.00',
      spentAmount: '820.00',
      percent: 82,
      status: 'WARNING',
    });
    expect(prisma.movement.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { amount: true },
        where: expect.objectContaining({
          userId,
          categoryId: 1,
          type: MovementType.EGRESO,
          currency: 'ARS',
        }),
      }),
    );
  });

  it('no avisa mientras el gasto esté por debajo del 80 %', async () => {
    const prisma = createPrismaMock();
    prisma.category.findFirst.mockResolvedValue(categoryWithThreshold());
    prisma.movement.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(100) },
    });

    const alert = await computeSpendingAlert(
      prisma as unknown as PrismaService,
      {
        userId,
        categoryId: 1,
        currency: 'ARS',
        movementDate: new Date('2026-11-10T12:00:00.000Z'),
      },
    );

    expect(alert).toBeNull();
  });
});
