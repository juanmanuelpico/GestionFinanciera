import { BadRequestException } from '@nestjs/common';
import {
  DebtActorType,
  DebtKind,
  DebtMovementRole,
  DebtSettlementStatus,
  DebtStatus,
  MovementType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { DebtSettlementsService } from './debt-settlements.service.js';
import type { DebtsService } from './debts.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

interface ActorRow {
  id: string;
  userId: string;
  type: DebtActorType;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  alias: string | null;
  issuer: string | null;
  brand: string | null;
  lastFour: string | null;
  closingDay: number | null;
  paymentDueDay: number | null;
  defaultWalletCurrency: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const personActor: ActorRow = {
  id: 'actor-1',
  userId,
  type: DebtActorType.PERSONA,
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: null,
  email: null,
  alias: null,
  issuer: null,
  brand: null,
  lastFour: null,
  closingDay: null,
  paymentDueDay: null,
  defaultWalletCurrency: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cardActor: ActorRow = {
  ...personActor,
  id: 'actor-2',
  type: DebtActorType.TARJETA,
  firstName: null,
  lastName: null,
  alias: 'Visa Galicia',
  brand: 'Visa',
  defaultWalletCurrency: 'ARS',
};

function installment(
  number: number,
  amount: string,
  paid = false,
  paidAmount?: string,
) {
  return {
    id: `inst-${number}`,
    debtId: 'debt-1',
    number,
    dueDate: new Date(Date.UTC(2026, 11 + number - 1, 10)),
    amount: new Prisma.Decimal(amount),
    paidAmount: new Prisma.Decimal(
      paidAmount ?? (paid ? amount : '0'),
    ),
    paidAt: paid ? new Date('2026-12-10T12:00:00.000Z') : null,
    currentSettlementId: paid ? 'st-1' : null,
  };
}

interface DebtOptions {
  kind?: DebtKind;
  actor?: ActorRow;
  status?: DebtStatus;
  installments?: ReturnType<typeof installment>[];
}

function makeDebt(options: DebtOptions = {}) {
  const kind = options.kind ?? DebtKind.TERCERO;

  return {
    id: 'debt-1',
    userId,
    actorId: options.actor?.id ?? personActor.id,
    kind,
    code: kind === DebtKind.PROPIA ? 'DP1' : 'DT1',
    currency: 'ARS',
    totalAmount: new Prisma.Decimal('100'),
    installmentCount: 3,
    operationDate: new Date('2026-11-06T00:00:00.000Z'),
    firstDueDate: new Date('2026-12-10T00:00:00.000Z'),
    note: null,
    status: options.status ?? DebtStatus.ACTIVA,
    createdAt: new Date(),
    updatedAt: new Date(),
    actor: options.actor ?? personActor,
    split: null,
    installments:
      options.installments ?? [
        installment(1, '33.33'),
        installment(2, '33.33'),
        installment(3, '33.34'),
      ],
    settlements: [],
  };
}

function settlementItem(number: number, amount: string) {
  return {
    id: `item-${number}`,
    settlementId: 'st-1',
    installmentId: `inst-${number}`,
    installmentNumber: number,
    amount: new Prisma.Decimal(amount),
  };
}

function makeSettlement(
  status: DebtSettlementStatus = DebtSettlementStatus.ACTIVA,
  items: ReturnType<typeof settlementItem>[] = [
    settlementItem(1, '33.33'),
    settlementItem(2, '33.33'),
  ],
  totalAmount?: string,
) {
  const total =
    totalAmount ??
    items
      .reduce((acc, item) => acc.add(item.amount), new Prisma.Decimal(0))
      .toFixed(2);

  return {
    id: 'st-1',
    debtId: 'debt-1',
    walletCurrency: 'ARS',
    paymentDate: new Date('2026-12-10T00:00:00.000Z'),
    totalAmount: new Prisma.Decimal(total),
    installmentCount: items.length,
    status,
    reversedAt: null,
    createdAt: new Date('2026-12-10T12:00:00.000Z'),
    items,
  };
}

interface SetupOptions extends DebtOptions {
  available?: string | null;
  settlement?: ReturnType<typeof makeSettlement> | null;
}

function setup(options: SetupOptions = {}) {
  const debt = makeDebt(options);

  const tx = {
    user: { update: vi.fn(async () => ({ movementSequence: 7 })) },
    category: { upsert: vi.fn(async () => ({ id: 9 })) },
    movement: {
      groupBy: vi.fn(async () =>
        options.available
          ? [
              {
                type: MovementType.INGRESO,
                _sum: { amount: new Prisma.Decimal(options.available) },
              },
            ]
          : [],
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 7,
        userId,
        ...data,
      })),
    },
    debtSettlement: {
      create: vi.fn(async () => ({ id: 'st-new' })),
      update: vi.fn(async () => ({ id: 'st-1' })),
    },
    debtSettlementItem: {
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    debtInstallment: {
      update: vi.fn(
        async (_args: { where: { id: string }; data: Record<string, unknown> }) => ({}),
      ),
    },
    debt: { update: vi.fn(async () => ({ ...debt })) },
  };

  const prisma = {
    category: {
      findFirst: vi.fn(async (): Promise<unknown> => null),
    },
    movement: {
      aggregate: vi.fn(async (): Promise<unknown> => ({
        _sum: { amount: null },
      })),
    },
    debtSettlement: {
      findFirst: vi.fn(async () =>
        'settlement' in options ? options.settlement : makeSettlement(),
      ),
      findMany: vi.fn(async () => [
        'settlement' in options ? options.settlement : makeSettlement(),
      ]),
    },
    $transaction: vi.fn(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    ),
  };

  const debtsService = {
    loadDebt: vi.fn(async () => debt),
    findDetail: vi.fn(async () => ({ id: debt.id, status: debt.status })),
  };

  const service = new DebtSettlementsService(
    prisma as unknown as PrismaService,
    debtsService as unknown as DebtsService,
  );

  return { service, prisma, tx, debt, debtsService };
}

describe('DebtSettlementsService.pay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cobra las dos cuotas pendientes más antiguas con un ingreso por cuota', async () => {
    const { service, tx } = setup();

    await service.pay(userId, 'debt-1', {
      quantity: 2,
      paymentDate: '2026-12-10',
      amounts: [33.33, 33.33],
    });

    expect(tx.debtSettlement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        debtId: 'debt-1',
        walletCurrency: 'ARS',
        totalAmount: '66.66',
        installmentCount: 2,
      }),
    });

    const creates = tx.movement.create.mock.calls.map(
      (call) => (call[0] as { data: Record<string, unknown> }).data,
    );

    expect(creates).toHaveLength(2);
    expect(creates[0]).toEqual(
      expect.objectContaining({
        type: MovementType.INGRESO,
        amount: '33.33',
        debtMovementRole: DebtMovementRole.CUOTA,
        note: 'DT1 — Juan Pérez · Cobro Cuota 1/3',
      }),
    );
    expect(creates[1]).toEqual(
      expect.objectContaining({ note: 'DT1 — Juan Pérez · Cobro Cuota 2/3' }),
    );

    expect(tx.debtSettlementItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        settlementId: 'st-new',
        installmentId: 'inst-1',
        installmentNumber: 1,
        amount: '33.33',
        originalMovementId: 7,
      }),
    });

    expect(tx.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: expect.objectContaining({ currentSettlementId: 'st-new' }),
      }),
    );

    expect(tx.debt.update).not.toHaveBeenCalled();
  });

  it('finaliza la deuda cuando se cobra la última cuota pendiente', async () => {
    const { service, tx } = setup();

    await service.pay(userId, 'debt-1', {
      quantity: 3,
      paymentDate: '2026-12-10',
      amounts: [33.33, 33.33, 33.34],
    });

    expect(tx.debt.update).toHaveBeenCalledWith({
      where: { id: 'debt-1' },
      data: { status: DebtStatus.FINALIZADA },
    });
  });

  it('valida saldo y descuenta del disponible al pagar una deuda propia', async () => {
    const { service, tx } = setup({ kind: DebtKind.PROPIA, available: '1000' });

    await service.pay(userId, 'debt-1', {
      quantity: 2,
      paymentDate: '2026-12-10',
      amounts: [33.33, 33.33],
    });

    expect(tx.movement.groupBy).toHaveBeenCalled();
    const data = (
      tx.movement.create.mock.calls[0] as [{ data: Record<string, unknown> }]
    )[0].data;
    expect(data.type).toBe(MovementType.EGRESO);
    expect(data.note).toBe('DP1 — Juan Pérez · Pago Cuota 1/3');
  });

  it('incluye spendingAlert en un pago propio que supera el umbral', async () => {
    const { service, prisma } = setup({
      kind: DebtKind.PROPIA,
      available: '1000',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 9,
      name: 'Deudas',
      thresholdAmount: new Prisma.Decimal(100),
      thresholdCurrency: 'ARS',
    });
    prisma.movement.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(120) },
    });

    const result = await service.pay(userId, 'debt-1', {
      quantity: 1,
      paymentDate: '2026-12-10',
      amounts: [33.33],
    });

    expect(result.spendingAlert).toMatchObject({
      categoryId: 9,
      categoryName: 'Deudas',
      currency: 'ARS',
      period: '2026-12',
      status: 'EXCEEDED',
    });
  });

  it('no evalúa el umbral en un cobro de deuda de terceros', async () => {
    const { service, prisma } = setup();

    const result = await service.pay(userId, 'debt-1', {
      quantity: 1,
      paymentDate: '2026-12-10',
      amounts: [33.33],
    });

    expect(result.spendingAlert).toBeNull();
    expect(prisma.category.findFirst).not.toHaveBeenCalled();
  });

  it('rechaza pagar una deuda propia sin saldo suficiente', async () => {
    const { service, tx } = setup({ kind: DebtKind.PROPIA, available: '10' });

    await expect(
      service.pay(userId, 'debt-1', {
        quantity: 1,
        paymentDate: '2026-12-10',
        amounts: [33.33],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.debtSettlement.create).not.toHaveBeenCalled();
  });

  it('usa medio de pago CREDITO y el alias de la tarjeta en la nota', async () => {
    const { service, tx } = setup({
      kind: DebtKind.PROPIA,
      actor: cardActor,
      available: '1000',
    });

    await service.pay(userId, 'debt-1', { quantity: 1, paymentDate: '2026-12-10' });

    const data = (
      tx.movement.create.mock.calls[0] as [{ data: Record<string, unknown> }]
    )[0].data;
    expect(data.paymentMethod).toBe(PaymentMethod.CREDITO);
    expect(data.note).toBe('DP1 — Visa Galicia · Pago Cuota 1/3');
  });

  it('registra un cobro parcial sin cerrar la cuota', async () => {
    const { service, tx } = setup();

    await service.pay(userId, 'debt-1', {
      quantity: 1,
      paymentDate: '2026-12-10',
      amounts: [20],
    });

    expect(tx.movement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MovementType.INGRESO,
        amount: '20.00',
        note: 'DT1 — Juan Pérez · Cobro Cuota 1/3',
      }),
    });
    expect(tx.debtSettlementItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        installmentId: 'inst-1',
        amount: '20.00',
      }),
    });

    const update = tx.debtInstallment.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };

    expect(update.data.paidAmount).toBe('20.00');
    expect(update.data.paidAt).toBeUndefined();
    expect(tx.debt.update).not.toHaveBeenCalled();
  });

  it('cierra una cuota cuando el acumulado alcanza su importe original', async () => {
    const { service, tx } = setup({
      installments: [
        installment(1, '33.33', false, '20'),
        installment(2, '33.33'),
        installment(3, '33.34'),
      ],
    });

    await service.pay(userId, 'debt-1', {
      quantity: 1,
      paymentDate: '2026-12-10',
      amounts: [13.33],
    });

    const update = tx.debtInstallment.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };

    expect(update.data.paidAmount).toBe('33.33');
    expect(update.data.paidAt).toEqual(expect.any(Date));
    expect(update.data.currentSettlementId).toBe('st-new');
  });

  it('finaliza una cancelación anticipada usando menos cuotas', async () => {
    const { service, tx } = setup();

    await service.pay(userId, 'debt-1', {
      quantity: 1,
      paymentDate: '2026-12-10',
      amounts: [100],
    });

    expect(tx.debtSettlement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: '100.00',
        installmentCount: 1,
      }),
    });
    expect(tx.debt.update).toHaveBeenCalledWith({
      where: { id: 'debt-1' },
      data: { status: DebtStatus.FINALIZADA },
    });
  });

  it('rechaza importes personalizados que superan el saldo restante', async () => {
    const { service, tx } = setup();

    await expect(
      service.pay(userId, 'debt-1', {
        quantity: 2,
        paymentDate: '2026-12-10',
        amounts: [60, 40.01],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.debtSettlement.create).not.toHaveBeenCalled();
  });

  it('exige un importe por cuota en deudas con personas', async () => {
    const { service, tx } = setup();

    await expect(
      service.pay(userId, 'debt-1', { quantity: 1, paymentDate: '2026-12-10' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.debtSettlement.create).not.toHaveBeenCalled();
  });

  it('rechaza importes personalizados en deudas con tarjeta', async () => {
    const { service } = setup({
      kind: DebtKind.PROPIA,
      actor: cardActor,
      available: '1000',
    });

    await expect(
      service.pay(userId, 'debt-1', {
        quantity: 1,
        paymentDate: '2026-12-10',
        amounts: [40],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite liquidar más cuotas que las pendientes', async () => {
    const { service, prisma } = setup();

    await expect(
      service.pay(userId, 'debt-1', { quantity: 4, paymentDate: '2026-12-10' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza cobrar una deuda finalizada', async () => {
    const { service } = setup({ status: DebtStatus.FINALIZADA });

    await expect(
      service.pay(userId, 'debt-1', { quantity: 1, paymentDate: '2026-12-10' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('DebtSettlementsService.reverse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revierte un cobro de terceros con egresos compensatorios y reabre las cuotas', async () => {
    const { service, tx } = setup({
      available: '500',
      installments: [
        installment(1, '33.33', true),
        installment(2, '33.33', true),
        installment(3, '33.34'),
      ],
    });

    await service.reverse(userId, 'debt-1', 'st-1');

    const creates = tx.movement.create.mock.calls.map(
      (call) => (call[0] as { data: Record<string, unknown> }).data,
    );

    expect(creates).toHaveLength(2);
    expect(creates[0]).toEqual(
      expect.objectContaining({
        type: MovementType.EGRESO,
        amount: '33.33',
        debtMovementRole: DebtMovementRole.REVERSA,
        note: 'DT1 — Juan Pérez · Reversa de cobro Cuota 1/3',
      }),
    );

    expect(tx.debtSettlementItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1' },
        data: { reversalMovementUserId: userId, reversalMovementId: 7 },
      }),
    );

    expect(tx.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: {
          paidAmount: '0.00',
          paidAt: null,
          currentSettlementId: null,
        },
      }),
    );

    expect(tx.debtSettlement.update).toHaveBeenCalledWith({
      where: { id: 'st-1' },
      data: {
        status: DebtSettlementStatus.REVERTIDA,
        reversedAt: expect.any(Date),
      },
    });

    expect(tx.debt.update).toHaveBeenCalledWith({
      where: { id: 'debt-1' },
      data: { status: DebtStatus.ACTIVA },
    });
  });

  it('requiere saldo para deshacer un cobro de terceros', async () => {
    const { service, tx } = setup({ available: '20' });

    await expect(service.reverse(userId, 'debt-1', 'st-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(tx.debtSettlement.update).not.toHaveBeenCalled();
  });

  it('revierte un pago propio generando ingresos sin validar saldo', async () => {
    const { service, tx } = setup({
      kind: DebtKind.PROPIA,
      installments: [
        installment(1, '33.33', true),
        installment(2, '33.33', true),
        installment(3, '33.34'),
      ],
    });

    await service.reverse(userId, 'debt-1', 'st-1');

    expect(tx.movement.groupBy).not.toHaveBeenCalled();
    const data = (
      tx.movement.create.mock.calls[0] as [{ data: Record<string, unknown> }]
    )[0].data;
    expect(data.type).toBe(MovementType.INGRESO);
    expect(data.note).toBe('DP1 — Juan Pérez · Reversa de pago Cuota 1/3');
  });

  it('no permite deshacer la misma operación dos veces', async () => {
    const { service, tx } = setup({
      settlement: makeSettlement(DebtSettlementStatus.REVERTIDA),
    });

    await expect(service.reverse(userId, 'debt-1', 'st-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.movement.create).not.toHaveBeenCalled();
  });

  it('reabre solo las cuotas de la operación seleccionada', async () => {
    const { service, tx } = setup({
      available: '1000',
      installments: [
        installment(1, '33.33', true),
        installment(2, '33.33', true),
        installment(3, '33.34'),
      ],
    });

    await service.reverse(userId, 'debt-1', 'st-1');

    const reopened = tx.debtInstallment.update.mock.calls.map(
      (call) => (call[0] as { where: { id: string } }).where.id,
    );
    expect(reopened).toEqual(['inst-1', 'inst-2']);
  });

  it('resta el importe real al revertir una cuota parcialmente pagada', async () => {
    const { service, tx } = setup({
      available: '1000',
      installments: [
        installment(1, '33.33', false, '30'),
        installment(2, '33.33'),
        installment(3, '33.34'),
      ],
      settlement: makeSettlement(
        DebtSettlementStatus.ACTIVA,
        [settlementItem(1, '20')],
      ),
    });

    await service.reverse(userId, 'debt-1', 'st-1');

    expect(tx.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: expect.objectContaining({ paidAmount: '10.00' }),
      }),
    );
  });

  it('mantiene cerrada una cuota cuando la reversa conserva su acumulado', async () => {
    const { service, tx } = setup({
      available: '1000',
      installments: [
        {
          ...installment(1, '33.33', true),
          currentSettlementId: 'st-2',
          paidAmount: new Prisma.Decimal('50'),
        },
        installment(2, '33.33'),
        installment(3, '33.34'),
      ],
      settlement: makeSettlement(
        DebtSettlementStatus.ACTIVA,
        [settlementItem(1, '10')],
      ),
    });

    await service.reverse(userId, 'debt-1', 'st-1');

    expect(tx.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: expect.objectContaining({ paidAmount: '40.00' }),
      }),
    );

    const update = tx.debtInstallment.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };

    expect(update.data.paidAt).toBeUndefined();
    expect(update.data.currentSettlementId).toBeUndefined();
  });

  it('reabre una cuota cerrada cuando se revierte una contribución anterior', async () => {
    const { service, tx } = setup({
      available: '1000',
      installments: [
        {
          ...installment(1, '33.33', true),
          currentSettlementId: 'st-2',
          paidAmount: new Prisma.Decimal('50'),
        },
        installment(2, '33.33'),
        installment(3, '33.34'),
      ],
      settlement: makeSettlement(
        DebtSettlementStatus.ACTIVA,
        [settlementItem(1, '20.01')],
      ),
    });

    await service.reverse(userId, 'debt-1', 'st-1');

    expect(tx.debtInstallment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inst-1' },
        data: {
          paidAmount: '29.99',
          paidAt: null,
          currentSettlementId: null,
        },
      }),
    );
  });
});

describe('DebtSettlementsService.listForDebt', () => {
  it('mapea las operaciones con sus cuotas', async () => {
    const { service } = setup();

    const result = await service.listForDebt(userId, 'debt-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'st-1',
        installmentCount: 2,
        totalAmount: '66.66',
        status: DebtSettlementStatus.ACTIVA,
        paymentDate: '2026-12-10',
        items: [
          expect.objectContaining({ installmentNumber: 1, amount: '33.33' }),
          expect.objectContaining({ installmentNumber: 2, amount: '33.33' }),
        ],
      }),
    );
  });
});
