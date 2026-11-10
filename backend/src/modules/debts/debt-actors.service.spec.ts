import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DebtActorType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { DebtActorsService } from './debt-actors.service.js';

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

const baseActor: ActorRow = {
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

function setup(options: { enabledCurrencies?: string[] } = {}) {
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn(async () => ({
        enabledCurrencies: options.enabledCurrencies ?? ['ARS'],
      })),
    },
    debtActor: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseActor,
        ...data,
        _count: { debts: 0 },
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseActor,
        ...data,
        _count: { debts: 0 },
      })),
      delete: vi.fn(async () => baseActor),
      findFirst: vi.fn(async () => baseActor),
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    debt: { count: vi.fn(async () => 0) },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };

  const service = new DebtActorsService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('DebtActorsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea una persona y anula los campos de tarjeta', async () => {
    const { service, prisma } = setup();

    const result = await service.create(userId, {
      type: DebtActorType.PERSONA,
      firstName: ' Juan ',
      lastName: 'Pérez',
      alias: 'Ignorada',
    });

    expect(prisma.debtActor.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        type: DebtActorType.PERSONA,
        firstName: 'Juan',
        alias: null,
        closingDay: null,
      }),
      include: { _count: { select: { debts: true } } },
    });
    expect(result.displayName).toBe('Juan Pérez');
  });

  it('crea una tarjeta con billetera habilitada', async () => {
    const { service, prisma } = setup();

    await service.create(userId, {
      type: DebtActorType.TARJETA,
      alias: 'Visa Galicia',
      issuer: 'Banco Galicia',
      brand: 'Visa',
      lastFour: '1234',
      closingDay: 25,
      paymentDueDay: 10,
      defaultWalletCurrency: 'ARS',
    });

    expect(prisma.debtActor.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: DebtActorType.TARJETA,
        firstName: null,
        defaultWalletCurrency: 'ARS',
      }),
      include: { _count: { select: { debts: true } } },
    });
  });

  it('rechaza una tarjeta con billetera no habilitada', async () => {
    const { service, prisma } = setup({ enabledCurrencies: ['USD'] });

    await expect(
      service.create(userId, {
        type: DebtActorType.TARJETA,
        alias: 'Visa',
        issuer: 'Galicia',
        brand: 'Visa',
        closingDay: 25,
        paymentDueDay: 10,
        defaultWalletCurrency: 'ARS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.debtActor.create).not.toHaveBeenCalled();
  });

  it('no permite cambiar el tipo de un actor con deudas', async () => {
    const { service, prisma } = setup();
    prisma.debt.count.mockResolvedValue(2);

    await expect(
      service.update(userId, 'actor-1', {
        type: DebtActorType.TARJETA,
        alias: 'Visa',
        issuer: 'Galicia',
        brand: 'Visa',
        closingDay: 25,
        paymentDueDay: 10,
        defaultWalletCurrency: 'ARS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite eliminar un actor con deudas asociadas', async () => {
    const { service, prisma } = setup();
    prisma.debt.count.mockResolvedValue(1);

    await expect(service.remove(userId, 'actor-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.debtActor.delete).not.toHaveBeenCalled();
  });

  it('elimina un actor sin deudas', async () => {
    const { service, prisma } = setup();

    await service.remove(userId, 'actor-1');

    expect(prisma.debtActor.delete).toHaveBeenCalledWith({
      where: { id: 'actor-1' },
    });
  });

  it('devuelve 404 si el actor no es del usuario', async () => {
    const { service, prisma } = setup();
    prisma.debtActor.findFirst.mockResolvedValue(null as never);

    await expect(service.remove(userId, 'otro')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('filtra la búsqueda por todos los nombres del actor', async () => {
    const { service, prisma } = setup();
    vi.spyOn(prisma.debtActor, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.debtActor, 'findMany').mockResolvedValue([]);

    await service.findAll(userId, {
      page: 1,
      limit: 20,
      search: 'juan',
      type: DebtActorType.PERSONA,
    });

    expect(prisma.debtActor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
          type: DebtActorType.PERSONA,
          OR: expect.arrayContaining([
            { lastName: { contains: 'juan', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });
});
