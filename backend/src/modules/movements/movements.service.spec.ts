import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, PaymentMethod, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { MovementsService } from './movements.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

const baseCategory = {
  id: 1,
  name: 'Alimentos',
  type: MovementType.EGRESO,
};

const baseMovement = {
  id: 3,
  userId,
  type: MovementType.EGRESO,
  amount: new Prisma.Decimal('1500.50'),
  categoryId: baseCategory.id,
  category: baseCategory,
  movementDate: new Date('2026-11-02T14:30:00.000Z'),
  currency: 'ARS',
  paymentMethod: PaymentMethod.CREDITO,
  note: null,
  createdAt: new Date('2026-11-02T14:30:00.000Z'),
  updatedAt: new Date('2026-11-02T14:30:00.000Z'),
};

function createService() {
  const prisma = {
    user: {
      update: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
    movement: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation((input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: unknown) => Promise<unknown>)(prisma);
    }

    return Promise.all(input as Promise<unknown>[]);
  });

  const service = new MovementsService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('MovementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea el movimiento con el siguiente contador del usuario', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue({
      id: baseCategory.id,
      type: baseCategory.type,
    });
    prisma.user.update.mockResolvedValue({ movementSequence: 3 });
    prisma.movement.create.mockResolvedValue(baseMovement);

    const result = await service.create(userId, {
      type: MovementType.EGRESO,
      amount: 1500.5,
      categoryId: baseCategory.id,
      movementDate: '2026-11-02T14:30:00.000Z',
      currency: 'ARS',
      paymentMethod: PaymentMethod.CREDITO,
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { movementSequence: { increment: 1 } },
      select: { movementSequence: true },
    });
    expect(prisma.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 3,
          userId,
          amount: '1500.50',
          paymentMethod: PaymentMethod.CREDITO,
        }),
      }),
    );
    expect(result.amount).toBe('1500.5');
  });

  it('adjunta spendingAlert cuando el egreso cruza el umbral del mes', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst
      .mockResolvedValueOnce({ id: baseCategory.id, type: baseCategory.type })
      .mockResolvedValueOnce({
        id: baseCategory.id,
        name: 'Alimentos',
        thresholdAmount: new Prisma.Decimal('1000'),
        thresholdCurrency: 'ARS',
      });
    prisma.user.update.mockResolvedValue({ movementSequence: 3 });
    prisma.movement.create.mockResolvedValue(baseMovement);
    prisma.movement.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('850') },
    });

    const result = await service.create(userId, {
      type: MovementType.EGRESO,
      amount: 100,
      categoryId: baseCategory.id,
      movementDate: '2026-11-02T14:30:00.000Z',
      currency: 'ARS',
    });

    expect(result.spendingAlert).toEqual({
      categoryId: 1,
      categoryName: 'Alimentos',
      currency: 'ARS',
      period: '2026-11',
      thresholdAmount: '1000.00',
      spentAmount: '850.00',
      percent: 85,
      status: 'WARNING',
    });
  });

  it('no evalúa el umbral en movimientos de ingreso', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue({
      id: baseCategory.id,
      type: MovementType.INGRESO,
    });
    prisma.user.update.mockResolvedValue({ movementSequence: 4 });
    prisma.movement.create.mockResolvedValue({
      ...baseMovement,
      type: MovementType.INGRESO,
    });

    const result = await service.create(userId, {
      type: MovementType.INGRESO,
      amount: 500,
      categoryId: baseCategory.id,
      movementDate: '2026-11-02T14:30:00.000Z',
      currency: 'ARS',
    });

    expect(result.spendingAlert).toBeNull();
    expect(prisma.movement.aggregate).not.toHaveBeenCalled();
  });

  it('lista movimientos con filtros y paginación', async () => {
    const { service, prisma } = createService();
    prisma.movement.count.mockResolvedValue(1);
    prisma.movement.findMany.mockResolvedValue([baseMovement]);

    const result = await service.findAll(userId, {
      page: 2,
      limit: 10,
      type: MovementType.EGRESO,
      categoryId: baseCategory.id,
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-30T23:59:59.999Z',
    });

    expect(prisma.movement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          userId,
          type: MovementType.EGRESO,
          categoryId: baseCategory.id,
        }),
      }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('rechaza un rango de fechas invertido', async () => {
    const { service } = createService();

    await expect(
      service.findAll(userId, {
        page: 1,
        limit: 20,
        from: '2026-12-01T00:00:00.000Z',
        to: '2026-11-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una categoría que no corresponde al tipo', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue({
      id: baseCategory.id,
      type: MovementType.EGRESO,
    });

    await expect(
      service.create(userId, {
        type: MovementType.INGRESO,
        amount: 100,
        categoryId: baseCategory.id,
        movementDate: '2026-11-02T14:30:00.000Z',
        currency: 'ARS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve 404 si el movimiento no pertenece al usuario', async () => {
    const { service, prisma } = createService();
    prisma.movement.findUnique.mockResolvedValue(null);

    await expect(service.findOne(userId, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('elimina un movimiento propio', async () => {
    const { service, prisma } = createService();
    prisma.movement.findUnique.mockResolvedValue(baseMovement);
    prisma.movement.delete.mockResolvedValue(baseMovement);

    await service.remove(userId, baseMovement.id);

    expect(prisma.movement.delete).toHaveBeenCalledWith({
      where: { userId_id: { userId, id: baseMovement.id } },
    });
  });

  it('bloquea la edición de un movimiento generado por deudas', async () => {
    const { service, prisma } = createService();
    prisma.movement.findUnique.mockResolvedValue({
      ...baseMovement,
      debtId: 'debt-1',
    });

    await expect(
      service.update(userId, baseMovement.id, { amount: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloquea el borrado de un movimiento generado por deudas', async () => {
    const { service, prisma } = createService();
    prisma.movement.findUnique.mockResolvedValue({
      ...baseMovement,
      debtId: 'debt-1',
    });

    await expect(service.remove(userId, baseMovement.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.movement.delete).not.toHaveBeenCalled();
  });

  it('bloquea la edición de un movimiento generado por gastos fijos', async () => {
    const { service, prisma } = createService();
    prisma.movement.findUnique.mockResolvedValue({
      ...baseMovement,
      fixedExpensePayment: { id: 'pay-1' },
    });

    await expect(
      service.update(userId, baseMovement.id, { amount: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloquea el borrado de un movimiento generado por gastos fijos', async () => {
    const { service, prisma } = createService();
    prisma.movement.findUnique.mockResolvedValue({
      ...baseMovement,
      fixedExpensePayment: { id: 'pay-1' },
    });

    await expect(service.remove(userId, baseMovement.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.movement.delete).not.toHaveBeenCalled();
  });
});
