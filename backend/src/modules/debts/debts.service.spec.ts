import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  DebtActorType,
  DebtKind,
  DebtMovementRole,
  DebtStatus,
  MovementType,
  Prisma,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { toDateOnly } from './debt-calculations.js';
import { DebtsService } from './debts.service.js';

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
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

const cardActor: ActorRow = {
  ...personActor,
  id: 'actor-2',
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

interface SetupOptions {
  actor?: ActorRow;
  available?: string | null;
}

function makeInstallment(
  number: number,
  amount: string,
  paid = false,
  paidAmount?: string,
) {
  const due = new Date(Date.UTC(2026, 11 + number, 10));
  return {
    id: `inst-${number}`,
    debtId: 'debt-1',
    number,
    dueDate: due,
    amount: new Prisma.Decimal(amount),
    paidAmount: new Prisma.Decimal(paidAmount ?? (paid ? amount : '0')),
    paidAt: paid ? new Date('2026-12-10T12:00:00.000Z') : null,
    currentSettlementId: paid ? 'st-1' : null,
    createdAt: new Date(),
  };
}

function makeDebtRow(kind: DebtKind, actor: ActorRow) {
  return {
    id: 'debt-1',
    userId,
    actorId: actor.id,
    kind,
    code: kind === DebtKind.PROPIA ? 'DP1' : 'DT1',
    currency: 'ARS',
    totalAmount: new Prisma.Decimal('100'),
    installmentCount: 3,
    operationDate: new Date('2026-11-06T00:00:00.000Z'),
    firstDueDate: new Date('2026-12-10T00:00:00.000Z'),
    note: null,
    status: DebtStatus.ACTIVA,
    createdAt: new Date('2026-11-06T12:00:00.000Z'),
    updatedAt: new Date('2026-11-06T12:00:00.000Z'),
    actor,
    split: null,
    installments: [
      makeInstallment(1, '33.33'),
      makeInstallment(2, '33.33'),
      makeInstallment(3, '33.34'),
    ],
    settlements: [],
  };
}

function setup(options: SetupOptions = {}) {
  const actor = options.actor ?? personActor;
  const createdRow = makeDebtRow(DebtKind.TERCERO, actor);
  let properSeq = 0;
  let thirdSeq = 0;

  const tx = {
    user: {
      update: vi.fn(
        async (args: { data: Record<string, unknown> }) => {
          if (args.data.debtProperSequence) {
            return { debtProperSequence: ++properSeq };
          }
          if (args.data.debtThirdSequence) {
            return { debtThirdSequence: ++thirdSeq };
          }
          return { movementSequence: 7 };
        },
      ),
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
        id: 7,
        userId,
        ...data,
      })),
    },
    debt: {
      create: vi.fn(
        async ({ data }: { data: Record<string, unknown> & { code: string } }) => ({
          ...createdRow,
          kind: data.kind,
          code: data.code,
          note: data.note,
        }),
      ),
    },
    debtInstallment: {
      createMany: vi.fn(
        async (_args: {
          data: { number: number; dueDate: Date; amount: string }[];
        }) => ({ count: 3 }),
      ),
    },
  };

  const prisma = {
    debtActor: {
      findFirst: vi.fn(
        async (args?: { where?: { id?: string } }) => {
          const id = args?.where?.id;
          if (id === cardActor.id) {
            return cardActor;
          }
          if (id === personActor.id) {
            return actor;
          }
          return null;
        },
      ),
    },
    user: {
      findUniqueOrThrow: vi.fn(async () => ({
        enabledCurrencies: ['ARS', 'USD'],
      })),
    },
    debt: {
      findFirst: vi.fn(async () => createdRow),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };

  const service = new DebtsService(prisma as unknown as PrismaService);

  return { service, prisma, tx, createdRow };
}

const thirdPartyDto = {
  kind: DebtKind.TERCERO,
  actorId: 'actor-1',
  currency: 'ARS' as const,
  totalAmount: 100,
  installmentCount: 3,
  operationDate: '2026-11-06',
  firstDueDate: '2026-12-10',
  note: 'Prestamo para el viaje',
};

describe('DebtsService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea la deuda de terceros con cuotas exactas y un egreso inicial', async () => {
    const { service, tx } = setup({ available: '1000' });

    const result = await service.create(userId, thirdPartyDto);

    expect(tx.debtInstallment.createMany).toHaveBeenCalledWith({
      data: expect.any(Array),
    });

    const createManyCall = vi
      .mocked(tx.debtInstallment.createMany)
      .mock.calls[0];
    expect(createManyCall).toBeDefined();

    const installments = createManyCall![0]
      .data as readonly { number: number; dueDate: Date; amount: string }[];

    expect(installments.map((row) => row.amount)).toEqual([
      '33.33',
      '33.33',
      '33.34',
    ]);
    expect(installments.map((row) => toDateOnly(row.dueDate))).toEqual([
      '2026-12-10',
      '2027-01-10',
      '2027-02-10',
    ]);

    expect(tx.debt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: 'DT1' }),
    });

    expect(tx.movement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MovementType.EGRESO,
        amount: '100.00',
        currency: 'ARS',
        debtId: 'debt-1',
        debtMovementRole: DebtMovementRole.INICIAL,
        note: 'DT1 — Préstamo a Juan Pérez',
      }),
    });
    expect(result.paidInstallments).toBe(0);
    expect(result.remainingAmount).toBe('100.00');
  });

  it('rechaza prestar sin saldo suficiente y no crea nada', async () => {
    const { service, tx } = setup({ available: '50' });

    await expect(service.create(userId, thirdPartyDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.debt.create).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
  });

  it('crea un préstamo recibido con ingreso inicial y sin validar saldo', async () => {
    const { service, tx } = setup({ available: null });

    await service.create(userId, { ...thirdPartyDto, kind: DebtKind.PROPIA });

    expect(tx.debt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: 'DP1' }),
    });
    expect(tx.movement.groupBy).not.toHaveBeenCalled();
    expect(tx.movement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: MovementType.INGRESO,
        note: 'DP1 — Préstamo recibido de Juan Pérez',
      }),
    });
  });

  it('no genera movimiento inicial en una compra con tarjeta', async () => {
    const { service, tx } = setup();

    await service.create(userId, {
      ...thirdPartyDto,
      kind: DebtKind.PROPIA,
      actorId: 'actor-2',
    });

    expect(tx.movement.create).not.toHaveBeenCalled();
    expect(tx.debt.create).toHaveBeenCalled();
  });

  it('rechaza deudas de terceros con una tarjeta', async () => {
    const { service, prisma } = setup({ actor: cardActor });

    await expect(service.create(userId, thirdPartyDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza una billetera no habilitada', async () => {
    const { service } = setup();

    await expect(
      service.create(userId, { ...thirdPartyDto, currency: 'EUR' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falla con 404 si el actor no pertenece al usuario', async () => {
    const { service, prisma } = setup();
    prisma.debtActor.findFirst.mockResolvedValue(null as never);

    await expect(service.create(userId, thirdPartyDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('DebtsService.findDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resume el saldo con pagos parciales sin cerrar una cuota', async () => {
    const { service, createdRow } = setup();

    createdRow.installments = [
      makeInstallment(1, '33.33', false, '20'),
      makeInstallment(2, '33.33'),
      makeInstallment(3, '33.34'),
    ];

    const result = await service.findDetail(userId, 'debt-1');

    expect(result.paidInstallments).toBe(0);
    expect(result.paidAmount).toBe('20.00');
    expect(result.remainingAmount).toBe('80.00');
    expect(result.nextDueDate).toBe('2027-01-10');
    expect(result.paymentProgress).toBe('PARTIAL');
    expect(result.installments[0]).toEqual(
      expect.objectContaining({
        amount: '33.33',
        paidAmount: '20.00',
        paidAt: null,
      }),
    );
  });
});
