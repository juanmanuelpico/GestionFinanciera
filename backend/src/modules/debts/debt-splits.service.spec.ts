import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  DebtActorType,
  DebtKind,
  DebtMovementRole,
  MovementType,
  Prisma,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { DebtSplitsService } from './debt-splits.service.js';

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
}

const juan: ActorRow = {
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
};

const ana: ActorRow = {
  ...juan,
  id: 'actor-2',
  firstName: 'Ana',
  lastName: 'García',
};

const luis: ActorRow = {
  ...juan,
  id: 'actor-3',
  firstName: 'Luis',
  lastName: 'Suárez',
};

const tarjeta: ActorRow = {
  ...juan,
  id: 'actor-4',
  type: DebtActorType.TARJETA,
  firstName: null,
  lastName: null,
  alias: 'Visa Galicia',
  issuer: 'Banco Galicia',
  brand: 'Visa',
  lastFour: '1234',
  closingDay: 25,
  paymentDueDay: 10,
  defaultWalletCurrency: 'ARS',
};

const actors: Record<string, ActorRow> = {
  [juan.id]: juan,
  [ana.id]: ana,
  [luis.id]: luis,
  [tarjeta.id]: tarjeta,
};

function makeSplitRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'split-1',
    userId,
    code: 'DG1',
    currency: 'ARS',
    totalAmount: new Prisma.Decimal('1000'),
    userAmount: new Prisma.Decimal('400'),
    paidByActorId: null,
    note: 'asado',
    operationDate: new Date('2026-11-08T00:00:00.000Z'),
    userShareMovementUserId: userId,
    userShareMovementId: 9,
    items: [
      {
        actorId: juan.id,
        amount: new Prisma.Decimal('300'),
        createdAt: new Date(),
        actor: juan,
      },
      {
        actorId: ana.id,
        amount: new Prisma.Decimal('300'),
        createdAt: new Date(),
        actor: ana,
      },
    ],
    debts: [
      {
        id: 'debt-1',
        code: 'DT1',
        kind: DebtKind.TERCERO,
        totalAmount: new Prisma.Decimal('300'),
      },
      {
        id: 'debt-2',
        code: 'DT2',
        kind: DebtKind.TERCERO,
        totalAmount: new Prisma.Decimal('300'),
      },
    ],
    payer: null,
    createdAt: new Date('2026-11-08T12:00:00.000Z'),
    updatedAt: new Date('2026-11-08T12:00:00.000Z'),
    ...overrides,
  };
}

interface SetupOptions {
  available?: string | null;
  splitRow?: ReturnType<typeof makeSplitRow>;
  paidInstallments?: number;
}

function setup(options: SetupOptions = {}) {
  const splitRow = options.splitRow ?? makeSplitRow();
  let properSeq = 0;
  let thirdSeq = 0;
  let splitSeq = 0;
  let debtCount = 0;

  const tx = {
    user: {
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (data.debtProperSequence) {
          return { debtProperSequence: ++properSeq };
        }
        if (data.debtThirdSequence) {
          return { debtThirdSequence: ++thirdSeq };
        }
        if (data.splitSequence) {
          return { splitSequence: ++splitSeq };
        }
        return { movementSequence: 9 };
      }),
    },
    category: { upsert: vi.fn(async () => ({ id: 9 })) },
    movement: {
      groupBy: vi.fn(async () =>
        options.available === null || options.available === undefined
          ? []
          : [
              {
                type: MovementType.INGRESO,
                _sum: { amount: new Prisma.Decimal(options.available) },
              },
            ],
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 9,
        userId,
        ...data,
      })),
      deleteMany: vi.fn(async () => ({ count: 3 })),
    },
    debtSplit: {
      create: vi.fn(async () => ({ id: 'split-1' })),
      update: vi.fn(async () => splitRow),
      delete: vi.fn(async () => ({ id: 'split-1' })),
    },
    debt: {
      create: vi.fn(
        async ({ data }: { data: Record<string, unknown> & { code: string } }) => ({
          id: `debt-${++debtCount}`,
          code: data.code,
        }),
      ),
      deleteMany: vi.fn(async () => ({ count: 2 })),
    },
    debtInstallment: {
      create: vi.fn(async () => ({ id: 'inst-1' })),
      updateMany: vi.fn(async () => ({ count: 2 })),
      deleteMany: vi.fn(async () => ({ count: 2 })),
    },
    debtSettlement: {
      findMany: vi.fn(async () => [{ id: 'st-1' }]),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    debtSettlementItem: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  };

  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn(async () => ({
        enabledCurrencies: ['ARS', 'USD'],
      })),
    },
    debtActor: {
      findMany: vi.fn(
        async (args: { where: { id: { in: string[] }; userId: string } }) =>
          args.where.id.in.map((id) => actors[id]).filter(Boolean),
      ),
    },
    debtInstallment: {
      count: vi.fn(async () => options.paidInstallments ?? 0),
    },
    debtSplit: {
      findFirst: vi.fn(async () => splitRow),
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (client: typeof tx) => Promise<unknown>)(tx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  const service = new DebtSplitsService(prisma as unknown as PrismaService);

  return { service, prisma, tx, splitRow };
}

const userPaysDto = {
  currency: 'ARS' as const,
  totalAmount: 1000,
  userAmount: 400,
  payer: 'USER' as const,
  items: [
    { actorId: juan.id, amount: 300 },
    { actorId: ana.id, amount: 300 },
  ],
  note: 'asado',
};

describe('DebtSplitsService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea una deuda de terceros por actor y descuenta el total del disponible', async () => {
    const { service, tx } = setup({ available: '5000' });

    const result = await service.create(userId, userPaysDto);

    expect(tx.debtSplit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'DG1',
        currency: 'ARS',
        totalAmount: '1000.00',
        userAmount: '400.00',
        paidByActorId: null,
        note: 'asado',
        items: {
          create: [
            { actorId: juan.id, amount: '300.00' },
            { actorId: ana.id, amount: '300.00' },
          ],
        },
      }),
      select: { id: true },
    });

    // Una deuda de terceros (DT) por cada actor con parte > 0
    expect(tx.debt.create).toHaveBeenCalledTimes(2);
    expect(tx.debt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: DebtKind.TERCERO,
        code: 'DT1',
        actorId: juan.id,
        totalAmount: '300.00',
        installmentCount: 1,
        splitId: 'split-1',
        note: 'Deuda por división DG1: asado',
      }),
    });

    // Egresos iniciales: 300 + 300 por deudas y 400 de la parte propia
    const movements = vi.mocked(tx.movement.create).mock.calls.map(
      ([call]) => call.data,
    );
    expect(movements).toHaveLength(3);
    expect(movements[0]).toEqual(
      expect.objectContaining({
        type: MovementType.EGRESO,
        amount: '300.00',
        debtId: 'debt-1',
        debtMovementRole: DebtMovementRole.INICIAL,
        note: 'DT1 — Préstamo a Juan Pérez (por división DG1): asado',
      }),
    );
    expect(movements[1]).toEqual(
      expect.objectContaining({
        type: MovementType.EGRESO,
        amount: '300.00',
        debtId: 'debt-2',
      }),
    );
    expect(movements[2]).toEqual(
      expect.objectContaining({
        type: MovementType.EGRESO,
        amount: '400.00',
        note: 'DG1 — Mi parte de un gasto común: asado',
      }),
    );
    expect(movements[2]).not.toHaveProperty('debtId');

    // Se guarda la movimentación de la parte propia en la división
    expect(tx.debtSplit.update).toHaveBeenCalledWith({
      where: { id: 'split-1' },
      data: { userShareMovementUserId: userId, userShareMovementId: 9 },
    });

    expect(result.payer).toBe('USER');
    expect(result.totalAmount).toBe('1000.00');
    expect(result.items[0]?.displayName).toBe('Juan Pérez');
  });

  it('omite las deudas de actores con parte en cero', async () => {
    const { service, tx } = setup({ available: '5000' });

    await service.create(userId, {
      ...userPaysDto,
      userAmount: 700,
      items: [
        { actorId: juan.id, amount: 300 },
        { actorId: luis.id, amount: 0 },
      ],
    });

    expect(tx.debt.create).toHaveBeenCalledTimes(1);
    // Solo dos egresos: 300 del deudor + 700 propios
    expect(tx.movement.create).toHaveBeenCalledTimes(2);
  });

  it('rechaza la división si la suma de las partes no coincide con el total', async () => {
    const { service, tx } = setup({ available: '5000' });

    await expect(
      service.create(userId, { ...userPaysDto, userAmount: 500 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.debtSplit.create).not.toHaveBeenCalled();
  });

  it('rechaza si el disponible no cubre el total cuando pago yo', async () => {
    const { service, tx } = setup({ available: '500' });

    await expect(service.create(userId, userPaysDto)).rejects.toThrow(
      /Saldo insuficiente/,
    );
    expect(tx.debtSplit.create).not.toHaveBeenCalled();
    expect(tx.debt.create).not.toHaveBeenCalled();
  });

  it('crea una deuda propia hacia el actor pagador sin movimientos cuando paga un actor', async () => {
    const { service, tx } = setup();

    await service.create(userId, {
      ...userPaysDto,
      payer: 'ACTOR' as const,
      payerActorId: juan.id,
    });

    expect(tx.movement.groupBy).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(tx.debt.create).toHaveBeenCalledTimes(1);
    expect(tx.debt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: DebtKind.PROPIA,
        code: 'DP1',
        actorId: juan.id,
        totalAmount: '400.00',
        installmentCount: 1,
        splitId: 'split-1',
        note: 'Deuda con Juan Pérez por división DG1: asado',
      }),
    });
  });

  it('exige parte propia mayor a cero cuando paga un actor', async () => {
    const { service } = setup();

    await expect(
      service.create(userId, {
        ...userPaysDto,
        userAmount: 0,
        totalAmount: 600,
        payer: 'ACTOR' as const,
        payerActorId: juan.id,
      }),
    ).rejects.toThrow(/tu parte debe ser mayor a 0/i);
  });

  it('rechaza pagadores que no son parte de la división', async () => {
    const { service } = setup();

    await expect(
      service.create(userId, {
        ...userPaysDto,
        payer: 'ACTOR' as const,
        payerActorId: luis.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza actores duplicados, inexistentes o tarjetas', async () => {
    const { service, prisma } = setup({ available: '5000' });

    await expect(
      service.create(userId, {
        ...userPaysDto,
        items: [
          { actorId: juan.id, amount: 300 },
          { actorId: juan.id, amount: 300 },
        ],
      }),
    ).rejects.toThrow(/actores distintos/);

    await expect(
      service.create(userId, {
        ...userPaysDto,
        items: [{ actorId: juan.id, amount: 300 }],
      }),
    ).rejects.toThrow(/igual al total/);

    prisma.debtActor.findMany.mockResolvedValueOnce([juan, tarjeta] as never);
    await expect(
      service.create(userId, {
        ...userPaysDto,
        items: [
          { actorId: juan.id, amount: 300 },
          { actorId: tarjeta.id, amount: 300 },
        ],
      }),
    ).rejects.toThrow(/solo pueden participar personas/);
  });

  it('rechaza billeteras no habilitadas', async () => {
    const { service } = setup();

    await expect(
      service.create(userId, { ...userPaysDto, currency: 'EUR' as never }),
    ).rejects.toThrow(/no está habilitada/);
  });
});

describe('DebtSplitsService.remove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restablece el circuito: deudas, cuotas, movimientos y la división', async () => {
    const { service, tx } = setup();

    await service.remove(userId, 'split-1');

    expect(tx.debtSettlementItem.deleteMany).toHaveBeenCalledWith({
      where: { settlementId: { in: ['st-1'] } },
    });
    expect(tx.debtInstallment.updateMany).toHaveBeenCalledWith({
      where: { debtId: { in: ['debt-1', 'debt-2'] } },
      data: { currentSettlementId: null },
    });
    expect(tx.debtInstallment.deleteMany).toHaveBeenCalledWith({
      where: { debtId: { in: ['debt-1', 'debt-2'] } },
    });
    // Desvincula el egreso propio antes de borrar movimientos (FK Restrict)
    expect(tx.debtSplit.update).toHaveBeenCalledWith({
      where: { id: 'split-1' },
      data: { userShareMovementUserId: null, userShareMovementId: null },
    });
    expect(
      (tx.debtSplit.update as unknown as { mock: { invocationCallOrder: number[] } })
        .mock.invocationCallOrder[0],
    ).toBeLessThan(
      (tx.movement.deleteMany as unknown as {
        mock: { invocationCallOrder: number[] };
      }).mock.invocationCallOrder[0],
    );
    expect(tx.movement.deleteMany).toHaveBeenCalledWith({
      where: {
        userId,
        OR: [{ debtId: { in: ['debt-1', 'debt-2'] } }, { userId, id: 9 }],
      },
    });
    expect(tx.debt.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['debt-1', 'debt-2'] } },
    });
    expect(tx.debtSplit.delete).toHaveBeenCalledWith({ where: { id: 'split-1' } });
  });

  it('bloquea la eliminación si alguna cuota ya fue cobrada o pagada', async () => {
    const { service, tx } = setup({ paidInstallments: 1 });

    await expect(service.remove(userId, 'split-1')).rejects.toThrow(
      /Deshacelos antes de eliminar/,
    );
    expect(tx.debtSplit.delete).not.toHaveBeenCalled();
  });

  it('falla si la división no existe para el usuario', async () => {
    const { service, prisma } = setup();
    prisma.debtSplit.findFirst.mockResolvedValueOnce(null as never);

    await expect(service.remove(userId, 'inexistente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
