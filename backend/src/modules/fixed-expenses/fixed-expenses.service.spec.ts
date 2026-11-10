import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, PaymentMethod, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { FixedExpensesService } from './fixed-expenses.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';
const expenseId = '8d2d2d2d-0000-4000-8000-000000000001';

const baseCategory = {
  id: 1,
  name: 'Vivienda',
  type: MovementType.EGRESO,
};

function expense(overrides: Record<string, unknown> = {}) {
  return {
    id: expenseId,
    userId,
    title: 'Alquiler',
    amount: new Prisma.Decimal('45000'),
    currency: 'ARS',
    categoryId: 1,
    category: baseCategory,
    firstDueDate: new Date('2026-05-10T00:00:00.000Z'),
    dueDay: 10,
    intervalMonths: 1,
    active: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    fixedExpenseId: expenseId,
    period: new Date('2026-11-01T00:00:00.000Z'),
    dueDate: new Date('2026-11-10T00:00:00.000Z'),
    paidAt: new Date('2026-11-06T15:30:00.000Z'),
    movementUserId: userId,
    movementId: 7,
    createdAt: new Date('2026-11-06T15:30:00.000Z'),
    movement: {
      id: 7,
      userId,
      type: MovementType.EGRESO,
      amount: new Prisma.Decimal('45000'),
      categoryId: 1,
      category: { id: 1, name: 'Vivienda', type: MovementType.EGRESO },
      movementDate: new Date('2026-11-06T15:30:00.000Z'),
      currency: 'ARS',
      paymentMethod: PaymentMethod.DEBITO,
      note: 'Gasto fijo: Alquiler · Período 2026-11',
    },
    fixedExpense: expense(),
    ...overrides,
  };
}

function createService() {
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    category: { findFirst: vi.fn() },
    fixedExpense: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    fixedExpensePayment: {
      findMany: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
    },
    movement: { create: vi.fn(), aggregate: vi.fn() },
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation((input: unknown) => {
    if (typeof input === 'function') {
      return (input as (tx: unknown) => Promise<unknown>)(prisma);
    }

    return Promise.all(input as Promise<unknown>[]);
  });

  const service = new FixedExpensesService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('FixedExpensesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea un gasto fijo derivando el día habitual del primer vencimiento', async () => {
    const { service, prisma } = createService();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      enabledCurrencies: ['ARS'],
    });
    prisma.category.findFirst.mockResolvedValue(baseCategory);
    prisma.fixedExpense.create.mockResolvedValue(expense());

    const result = await service.create(userId, {
      title: 'Alquiler',
      amount: 45000,
      currency: 'ARS',
      categoryId: 1,
      firstDueDate: '2026-05-10',
      intervalMonths: 1,
    });

    expect(prisma.fixedExpense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDay: 10,
          intervalMonths: 1,
          active: true,
          amount: '45000.00',
        }),
      }),
    );
    expect(result.firstDueDate).toBe('2026-05-10');
    expect(result.amount).toBe('45000.00');
  });

  it('rechaza una categoría de ingreso', async () => {
    const { service, prisma } = createService();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      enabledCurrencies: ['ARS'],
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 1,
      name: 'Ventas',
      type: MovementType.INGRESO,
    });

    await expect(
      service.create(userId, {
        title: 'Alquiler',
        amount: 45000,
        currency: 'ARS',
        categoryId: 1,
        firstDueDate: '2026-05-10',
        intervalMonths: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una billetera no habilitada', async () => {
    const { service, prisma } = createService();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      enabledCurrencies: ['ARS'],
    });

    await expect(
      service.create(userId, {
        title: 'Netflix',
        amount: 10,
        currency: 'USD',
        categoryId: 1,
        firstDueDate: '2026-05-10',
        intervalMonths: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualiza el estado activo', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(expense());
    prisma.fixedExpense.update.mockResolvedValue(expense({ active: false }));

    const result = await service.update(userId, expenseId, {
      active: false,
    });

    expect(prisma.fixedExpense.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expenseId },
        data: { active: false },
      }),
    );
    expect(result.active).toBe(false);
    expect(result.nextDueDate).toBeNull();
  });

  it('rechaza editar un gasto inexistente', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.update(userId, '00000000-0000-4000-8000-000000000000', {
        active: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('consolida previsiones con el estado de pago del período', async () => {
    const { service, prisma } = createService();
    const monthly = expense();
    const bimonthly = expense({
      id: 'fx-2',
      title: 'Patente',
      firstDueDate: new Date('2026-05-20T00:00:00.000Z'),
      dueDay: 20,
      intervalMonths: 2,
    });

    prisma.fixedExpense.findMany.mockResolvedValue([monthly, bimonthly]);
    prisma.fixedExpensePayment.findMany.mockResolvedValue([paymentRow()]);

    const result = await service.projections(userId, { period: '2026-11' });

    expect(result).toHaveLength(2);
    const alquiler = result.find((item) => item.title === 'Alquiler');
    const patente = result.find((item) => item.title === 'Patente');

    expect(alquiler?.status).toBe('PAGADO');
    expect(alquiler?.payment?.movement.id).toBe(7);
    expect(patente?.status).toBe('PENDIENTE');
  });

  it('omite períodos que no corresponden a la frecuencia', async () => {
    const { service, prisma } = createService();
    const semestral = expense({
      firstDueDate: new Date('2026-04-15T00:00:00.000Z'),
      intervalMonths: 6,
    });

    prisma.fixedExpense.findMany.mockResolvedValue([semestral]);
    prisma.fixedExpensePayment.findMany.mockResolvedValue([]);

    const notDue = await service.projections(userId, { period: '2026-09' });
    expect(notDue).toHaveLength(0);

    const resultAnchor = await service.projections(userId, {
      period: '2026-04',
    });
    expect(resultAnchor).toHaveLength(1);
    expect(resultAnchor[0].dueDate).toBe('2026-04-15');
  });

  it('paga un período generando el egreso en la misma transacción', async () => {
    const { service, prisma } = createService();
    const old = expense({
      firstDueDate: new Date('2020-01-10T00:00:00.000Z'),
    });

    prisma.fixedExpense.findFirst.mockResolvedValue(old);
    prisma.user.update.mockResolvedValue({ movementSequence: 7 });
    prisma.movement.create.mockResolvedValue({ id: 7 });
    prisma.fixedExpensePayment.create.mockResolvedValue({ id: 'pay-1' });
    prisma.fixedExpensePayment.findFirstOrThrow.mockResolvedValue(
      paymentRow({
        period: new Date('2020-11-01T00:00:00.000Z'),
        dueDate: new Date('2020-11-10T00:00:00.000Z'),
      }),
    );

    const result = await service.pay(userId, expenseId, {
      period: '2020-11',
      amount: 46250.5,
      paidAt: '2020-11-08T10:00:00.000Z',
      paymentMethod: PaymentMethod.DEBITO,
    });

    expect(prisma.movement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 7,
          userId,
          type: MovementType.EGRESO,
          amount: '46250.50',
          categoryId: 1,
          currency: 'ARS',
          movementDate: new Date('2020-11-08T10:00:00.000Z'),
          paymentMethod: PaymentMethod.DEBITO,
          note: 'Gasto fijo: Alquiler · Período 2020-11',
        }),
      }),
    );
    expect(prisma.fixedExpensePayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fixedExpenseId: expenseId,
          period: new Date('2020-11-01T00:00:00.000Z'),
          dueDate: new Date('2020-11-10T00:00:00.000Z'),
          paidAt: new Date('2020-11-08T10:00:00.000Z'),
          movementUserId: userId,
          movementId: 7,
        }),
      }),
    );
    expect(result.period).toBe('2020-11');
    expect(result.movement.id).toBe(7);
  });

  it('incluye spendingAlert al pagar un gasto fijo que cruza el umbral', async () => {
    const { service, prisma } = createService();
    const old = expense({
      firstDueDate: new Date('2020-01-10T00:00:00.000Z'),
    });

    prisma.fixedExpense.findFirst.mockResolvedValue(old);
    prisma.user.update.mockResolvedValue({ movementSequence: 7 });
    prisma.movement.create.mockResolvedValue({ id: 7 });
    prisma.fixedExpensePayment.create.mockResolvedValue({ id: 'pay-1' });
    prisma.fixedExpensePayment.findFirstOrThrow.mockResolvedValue(
      paymentRow({
        period: new Date('2020-11-01T00:00:00.000Z'),
        dueDate: new Date('2020-11-10T00:00:00.000Z'),
      }),
    );
    prisma.category.findFirst.mockResolvedValue({
      id: 1,
      name: 'Vivienda',
      thresholdAmount: new Prisma.Decimal('46000'),
      thresholdCurrency: 'ARS',
    });
    prisma.movement.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('46250.5') },
    });

    const result = await service.pay(userId, expenseId, {
      period: '2020-11',
      amount: 46250.5,
      paidAt: '2020-11-08T10:00:00.000Z',
      paymentMethod: PaymentMethod.DEBITO,
    });

    expect(result.spendingAlert).toEqual({
      categoryId: 1,
      categoryName: 'Vivienda',
      currency: 'ARS',
      period: '2020-11',
      thresholdAmount: '46000.00',
      spentAmount: '46250.50',
      percent: 100.5,
      status: 'EXCEEDED',
    });
  });

  it('rechaza pagar períodos futuros', async () => {
    const { service, prisma } = createService();
    const nextMonth = new Date();
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
    const period = `${nextMonth.getUTCFullYear()}-${String(
      nextMonth.getUTCMonth() + 1,
    ).padStart(2, '0')}`;

    prisma.fixedExpense.findFirst.mockResolvedValue(
      expense({ firstDueDate: new Date('2020-01-10T00:00:00.000Z') }),
    );

    await expect(
      service.pay(userId, expenseId, {
        period,
        amount: 45000,
        paidAt: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza pagar un período que no corresponde a la frecuencia', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(
      expense({
        firstDueDate: new Date('2020-01-10T00:00:00.000Z'),
        intervalMonths: 6,
      }),
    );

    await expect(
      service.pay(userId, expenseId, {
        period: '2026-10',
        amount: 45000,
        paidAt: '2026-10-15T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza pagar un gasto inactivo', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(
      expense({ active: false }),
    );

    await expect(
      service.pay(userId, expenseId, {
        period: '2026-11',
        amount: 45000,
        paidAt: '2026-11-06T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('traduce un pago duplicado como conflicto', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(
      expense({ firstDueDate: new Date('2020-01-10T00:00:00.000Z') }),
    );
    prisma.user.update.mockResolvedValue({ movementSequence: 9 });
    prisma.movement.create.mockResolvedValue({ id: 9 });
    prisma.fixedExpensePayment.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.pay(userId, expenseId, {
        period: '2020-11',
        amount: 45000,
        paidAt: '2020-11-08T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve el historial de pagos ordenado', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(expense());
    prisma.fixedExpensePayment.findMany.mockResolvedValue([paymentRow()]);

    const result = await service.findPayments(userId, expenseId);

    expect(result.fixedExpense.title).toBe('Alquiler');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].amount).toBe('45000.00');
    expect(result.items[0].period).toBe('2026-11');
  });

  it('rechaza historiales de gastos ajenos', async () => {
    const { service, prisma } = createService();
    prisma.fixedExpense.findFirst.mockResolvedValue(null);

    await expect(
      service.findPayments(userId, expenseId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
