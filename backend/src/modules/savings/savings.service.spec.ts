import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  QuoteType,
  SavingEventType,
  SavingStatus,
} from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import type { ExchangeRatesService } from '../exchange-rates/exchange-rates.service.js';
import { SavingsService } from './savings.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

const quotes = {
  BLUE: { venta: 1200 },
  OFICIAL: { venta: 1000 },
  MEP: { venta: 1100 },
};

interface SetupOptions {
  savingOverrides?: Record<string, unknown>;
  positions?: Record<string, unknown>[];
  eventsTotal?: number;
  events?: Record<string, unknown>[];
}

function setup(options: SetupOptions = {}) {
  const saving = {
    id: 7,
    userId,
    currency: 'USD',
    amount: new Prisma.Decimal('100'),
    quoteType: QuoteType.OFICIAL,
    quoteRate: new Prisma.Decimal('1000'),
    estimatedDebit: new Prisma.Decimal('100000'),
    debitCurrency: 'ARS',
    purchaseDate: new Date('2026-11-01T00:00:00.000Z'),
    note: null,
    status: SavingStatus.ACTIVO,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...options.savingOverrides,
  };

  const positions = options.positions ?? [saving];

  const tx = {
    user: { update: vi.fn(async () => ({ movementSequence: 5 })) },
    category: { upsert: vi.fn(async () => ({ id: 3 })) },
    saving: {
      findMany: vi.fn(async (args?: { where?: { currency?: string } }) => {
        const currency = args?.where?.currency;
        return currency
          ? positions.filter((row) => row.currency === currency)
          : positions;
      }),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        ...saving,
        ...args.data,
        id: 8,
      })),
      update: vi.fn(
        async (args: { where: { id: number }; data: Record<string, unknown> }) => ({
          ...saving,
          ...args.data,
          id: args.where.id,
        }),
      ),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    movement: {
      create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({})),
    },
    savingEvent: {
      create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (client: typeof tx) => unknown)(tx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
    saving: { findFirst: vi.fn(async () => saving) },
    savingEvent: {
      count: vi.fn(async () => options.eventsTotal ?? 0),
      findMany: vi.fn(async () => options.events ?? []),
    },
  };

  const exchangeRates = {
    getDollarQuotes: vi.fn(async () => quotes),
  };

  const service = new SavingsService(
    prisma as unknown as PrismaService,
    exchangeRates as unknown as ExchangeRatesService,
  );
  return { service, tx, prisma };
}

const altaBase = {
  currency: 'USD' as const,
  amount: 100,
  quoteType: QuoteType.OFICIAL,
  debitCurrency: 'ARS' as const,
  purchaseDate: '2026-11-01T00:00:00.000Z',
};

describe('SavingsService', () => {
  describe('alta (S6, S7)', () => {
    it('descuenta en ARS usando la cotización elegida y genera EGRESO + evento', async () => {
      const { service, tx } = setup({ positions: [] });

      await service.create(userId, altaBase);

      expect(tx.movement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 5,
          type: 'EGRESO',
          currency: 'ARS',
          categoryId: 3,
        }),
      });
      const movement = tx.movement.create.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
      };
      expect(movement.amount.toFixed(2)).toBe('100000.00');
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ALTA',
          quoteType: QuoteType.OFICIAL,
          walletImpactCurrency: 'ARS',
        }),
      });
    });

    it('usa la cotización de DolarApi del tipo elegido', async () => {
      const { service, tx } = setup({ positions: [] });

      await service.create(userId, altaBase);

      const movement = tx.movement.create.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
      };
      expect(movement.amount.toFixed(2)).toBe('100000.00');
    });

    it('suma a la posición existente y recalcula la cotización ponderada', async () => {
      const { service, tx } = setup({
        savingOverrides: { amount: new Prisma.Decimal('100'), quoteRate: new Prisma.Decimal('1000') },
      });

      await service.create(userId, { ...altaBase, amount: 100, quoteRate: 1200, quoteType: QuoteType.MANUAL });

      const update = tx.saving.update.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
        quoteRate: Prisma.Decimal;
      };
      expect(update.amount.toFixed(2)).toBe('200.00');
      expect(update.quoteRate.toFixed(4)).toBe('1100.0000');
      expect(tx.saving.create).not.toHaveBeenCalled();
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ALTA',
          amount: expect.any(Prisma.Decimal),
          quoteType: QuoteType.MANUAL,
        }),
      });
    });

    it('exige cotización manual de la billetera si es otra moneda extranjera', async () => {
      const { service } = setup();

      await expect(
        service.create(userId, {
          ...altaBase,
          currency: 'EUR',
          quoteType: QuoteType.MANUAL,
          quoteRate: 1200,
          debitCurrency: 'USD',
        }),
      ).rejects.toThrow('Ingresá la cotización de USD para la billetera');
    });

    it('rechaza EUR con cotización de DolarApi (solo manual)', async () => {
      const { service } = setup();

      await expect(
        service.create(userId, {
          ...altaBase,
          currency: 'EUR',
          quoteType: QuoteType.OFICIAL,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('ajuste (S10)', () => {
    it('quitar más de lo que tiene se rechaza sin registrar eventos', async () => {
      const { service, tx } = setup();

      await expect(
        service.adjust(userId, 'USD', { operation: 'RESTAR', amount: 150 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.savingEvent.create).not.toHaveBeenCalled();
      expect(tx.movement.create).not.toHaveBeenCalled();
    });

    it('ajustar no crea movimientos (no toca el disponible)', async () => {
      const { service, tx } = setup();

      await service.adjust(userId, 'USD', { operation: 'SUMAR', amount: 20 });

      expect(tx.movement.create).not.toHaveBeenCalled();
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'AJUSTE_SUMA',
          quoteRate: expect.any(Prisma.Decimal),
        }),
      });
    });

    it('restar todo cierra el ahorro', async () => {
      const { service, tx } = setup();

      await service.adjust(userId, 'USD', { operation: 'RESTAR', amount: 100 });

      expect(tx.saving.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({ status: SavingStatus.CERRADO }),
      });
    });

    it('devuelve 404 si no hay posición en esa moneda', async () => {
      const { service } = setup({ positions: [] });

      await expect(
        service.adjust(userId, 'USD', { operation: 'SUMAR', amount: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('devolver (S8)', () => {
    it('devuelve un importe parcial y deja el resto en el ahorro', async () => {
      const { service, tx } = setup();

      await service.returnToWallet(userId, 'USD', {
        amount: 40,
        walletCurrency: 'ARS',
      });

      const movement = tx.movement.create.mock.calls[0][0].data as {
        type: string;
        currency: string;
        amount: Prisma.Decimal;
      };
      expect(movement.type).toBe('INGRESO');
      expect(movement.currency).toBe('ARS');
      expect(movement.amount.toFixed(2)).toBe('40000.00');
      expect(tx.saving.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { amount: expect.any(Prisma.Decimal) },
      });
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DEVOLUCION',
          amount: expect.any(Prisma.Decimal),
          walletImpactAmount: expect.any(Prisma.Decimal),
          walletImpactCurrency: 'ARS',
        }),
      });
    });

    it('usa la cotización de origen elegida al devolver a otra moneda', async () => {
      const { service, tx } = setup();

      await service.returnToWallet(userId, 'USD', {
        amount: 40,
        walletCurrency: 'ARS',
        sourceQuoteType: QuoteType.MANUAL,
        sourceQuoteRate: 1500,
      });

      const movement = tx.movement.create.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
      };
      expect(movement.amount.toFixed(2)).toBe('60000.00');
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DEVOLUCION',
          quoteType: QuoteType.MANUAL,
          quoteRate: expect.any(Prisma.Decimal),
        }),
      });
      const event = tx.savingEvent.create.mock.calls[0][0].data as {
        quoteRate: Prisma.Decimal;
      };
      expect(event.quoteRate.toFixed(4)).toBe('1500.0000');
    });

    it('devolver todo cierra el ahorro', async () => {
      const { service, tx } = setup();

      await service.returnToWallet(userId, 'USD', {
        amount: 100,
        walletCurrency: 'ARS',
      });

      expect(tx.saving.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({ status: SavingStatus.CERRADO }),
      });
    });

    it('rechaza devolver más de lo ahorrado', async () => {
      const { service, tx } = setup();

      await expect(
        service.returnToWallet(userId, 'USD', {
          amount: 150,
          walletCurrency: 'ARS',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.movement.create).not.toHaveBeenCalled();
    });
  });

  describe('convertir (S9)', () => {
    it('convierte de ARS a USD con cotización manual sin crear movimientos', async () => {
      const { service, tx } = setup({
        savingOverrides: {
          currency: 'ARS',
          amount: new Prisma.Decimal('105000'),
          quoteType: QuoteType.MANUAL,
          quoteRate: null,
        },
      });

      await service.convert(userId, 'ARS', {
        amount: 105000,
        currency: 'USD',
        quoteType: QuoteType.MANUAL,
        quoteRate: 1050,
      });

      expect(tx.saving.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({
          currency: 'USD',
          amount: expect.any(Prisma.Decimal),
        }),
      });
      const data = tx.saving.update.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
      };
      expect(data.amount.toFixed(2)).toBe('100.00');
      expect(tx.movement.create).not.toHaveBeenCalled();
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CONVERSION',
          currency: 'USD',
          quoteType: QuoteType.MANUAL,
          sourceCurrency: 'ARS',
          sourceAmount: expect.any(Prisma.Decimal),
        }),
      });
      const event = tx.savingEvent.create.mock.calls[0][0].data as {
        sourceAmount: Prisma.Decimal;
      };
      expect(event.sourceAmount.toFixed(2)).toBe('105000.00');
    });

    it('usa la cotización de origen elegida al vender a otra moneda', async () => {
      const { service, tx } = setup();

      await service.convert(userId, 'USD', {
        amount: 100,
        currency: 'ARS',
        sourceQuoteType: QuoteType.MANUAL,
        sourceQuoteRate: 1500,
      });

      const data = tx.saving.update.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
        currency: string;
      };
      expect(data.currency).toBe('ARS');
      expect(data.amount.toFixed(2)).toBe('150000.00');
      expect(tx.savingEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CONVERSION',
          currency: 'ARS',
          sourceCurrency: 'USD',
          sourceAmount: expect.any(Prisma.Decimal),
          quoteType: QuoteType.MANUAL,
          quoteRate: expect.any(Prisma.Decimal),
        }),
      });
      const event = tx.savingEvent.create.mock.calls[0][0].data as {
        quoteRate: Prisma.Decimal;
        sourceAmount: Prisma.Decimal;
      };
      expect(event.sourceAmount.toFixed(2)).toBe('100.00');
      expect(event.quoteRate.toFixed(4)).toBe('1500.0000');
    });

    it('convierte un importe parcial y deja el resto en la moneda original', async () => {
      const { service, tx } = setup();

      await service.convert(userId, 'USD', {
        amount: 40,
        currency: 'ARS',
        sourceQuoteType: QuoteType.MANUAL,
        sourceQuoteRate: 1500,
      });

      expect(tx.saving.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'ARS',
          amount: expect.any(Prisma.Decimal),
        }),
      });
      const created = tx.saving.create.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
      };
      expect(created.amount.toFixed(2)).toBe('60000.00');

      const sourceUpdate = tx.saving.update.mock.calls.find(
        (call) => (call[0] as { where: { id: number } }).where.id === 7,
      );
      const data = (
        sourceUpdate as unknown as [{ data: { amount: Prisma.Decimal } }]
      )[0].data;
      expect(data.amount.toFixed(2)).toBe('60.00');

      const event = tx.savingEvent.create.mock.calls[0][0].data as {
        sourceAmount: Prisma.Decimal;
        sourceCurrency: string;
      };
      expect(event.sourceAmount.toFixed(2)).toBe('40.00');
      expect(event.sourceCurrency).toBe('USD');
    });

    it('rechaza convertir más de lo ahorrado', async () => {
      const { service, tx } = setup();

      await expect(
        service.convert(userId, 'USD', {
          amount: 150,
          currency: 'ARS',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.savingEvent.create).not.toHaveBeenCalled();
    });

    it('fusiona con la posición existente en la moneda destino', async () => {
      const { service, tx } = setup({
        positions: [
          {
            id: 7,
            userId,
            currency: 'ARS',
            amount: new Prisma.Decimal('105000'),
            quoteType: QuoteType.MANUAL,
            quoteRate: null,
            estimatedDebit: new Prisma.Decimal('105000'),
            debitCurrency: 'ARS',
            purchaseDate: new Date('2026-11-01T00:00:00.000Z'),
            note: null,
            status: SavingStatus.ACTIVO,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 8,
            userId,
            currency: 'USD',
            amount: new Prisma.Decimal('50'),
            quoteType: QuoteType.OFICIAL,
            quoteRate: new Prisma.Decimal('1000'),
            estimatedDebit: new Prisma.Decimal('50000'),
            debitCurrency: 'ARS',
            purchaseDate: new Date('2026-11-02T00:00:00.000Z'),
            note: null,
            status: SavingStatus.ACTIVO,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      await service.convert(userId, 'ARS', {
        amount: 105000,
        currency: 'USD',
        quoteType: QuoteType.MANUAL,
        quoteRate: 1050,
      });

      expect(tx.saving.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: {
          amount: new Prisma.Decimal(0),
          status: SavingStatus.CERRADO,
        },
      });
      const destinationUpdate = tx.saving.update.mock.calls.find(
        (call) => (call[0] as { where: { id: number } }).where.id === 8,
      );
      expect(destinationUpdate).toBeTruthy();
      const data = (
        destinationUpdate as unknown as [
          { data: { amount: Prisma.Decimal } },
        ]
      )[0].data;
      expect(data.amount.toFixed(2)).toBe('150.00');
    });

    it('fusiona un importe parcial con la posición destino y deja el resto', async () => {
      const { service, tx } = setup({
        positions: [
          {
            id: 7,
            userId,
            currency: 'USD',
            amount: new Prisma.Decimal('100'),
            quoteType: QuoteType.OFICIAL,
            quoteRate: new Prisma.Decimal('1000'),
            estimatedDebit: new Prisma.Decimal('100000'),
            debitCurrency: 'ARS',
            purchaseDate: new Date('2026-11-01T00:00:00.000Z'),
            note: null,
            status: SavingStatus.ACTIVO,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 8,
            userId,
            currency: 'ARS',
            amount: new Prisma.Decimal('500'),
            quoteType: QuoteType.MANUAL,
            quoteRate: null,
            estimatedDebit: new Prisma.Decimal('500'),
            debitCurrency: 'ARS',
            purchaseDate: new Date('2026-11-02T00:00:00.000Z'),
            note: null,
            status: SavingStatus.ACTIVO,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      await service.convert(userId, 'USD', {
        amount: 40,
        currency: 'ARS',
      });

      const destination = tx.saving.update.mock.calls.find(
        (call) => (call[0] as { where: { id: number } }).where.id === 8,
      );
      const destinationData = (
        destination as unknown as [{ data: { amount: Prisma.Decimal } }]
      )[0].data;
      expect(destinationData.amount.toFixed(2)).toBe('40500.00');

      const source = tx.saving.update.mock.calls.find(
        (call) => (call[0] as { where: { id: number } }).where.id === 7,
      );
      const sourceData = (
        source as unknown as [{ data: { amount: Prisma.Decimal } }]
      )[0].data;
      expect(sourceData.amount.toFixed(2)).toBe('60.00');
      expect(tx.saving.create).not.toHaveBeenCalled();
    });

    it('rechaza convertir a la misma moneda', async () => {
      const { service } = setup();

      await expect(
        service.convert(userId, 'USD', {
          amount: 1,
          currency: 'USD',
          quoteType: QuoteType.OFICIAL,
        }),
      ).rejects.toThrow('El ahorro ya está en esa moneda');
    });
  });

  describe('consolidación de posición (una activa por moneda)', () => {
    it('suma duplicados, reasigna eventos y cierra las filas extra', async () => {
      const { service, tx } = setup({
        positions: [
          {
            id: 7,
            userId,
            currency: 'USD',
            amount: new Prisma.Decimal('100'),
            quoteType: QuoteType.OFICIAL,
            quoteRate: new Prisma.Decimal('1000'),
            estimatedDebit: new Prisma.Decimal('100000'),
            debitCurrency: 'ARS',
            purchaseDate: new Date('2026-11-01T00:00:00.000Z'),
            note: null,
            status: SavingStatus.ACTIVO,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 9,
            userId,
            currency: 'USD',
            amount: new Prisma.Decimal('50'),
            quoteType: QuoteType.MANUAL,
            quoteRate: new Prisma.Decimal('1200'),
            estimatedDebit: new Prisma.Decimal('60000'),
            debitCurrency: 'ARS',
            purchaseDate: new Date('2026-11-02T00:00:00.000Z'),
            note: null,
            status: SavingStatus.ACTIVO,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      await service.adjust(userId, 'USD', { operation: 'SUMAR', amount: 10 });

      expect(tx.savingEvent.updateMany).toHaveBeenCalledWith({
        where: { userId, savingId: { in: [9] } },
        data: { savingId: 7 },
      });
      expect(tx.saving.updateMany).toHaveBeenCalledWith({
        where: { userId, id: { in: [9] } },
        data: { amount: new Prisma.Decimal(0), status: SavingStatus.CERRADO },
      });
      const firstUpdate = tx.saving.update.mock.calls[0][0].data as {
        amount: Prisma.Decimal;
        quoteRate: Prisma.Decimal;
      };
      expect(firstUpdate.amount.toFixed(2)).toBe('150.00');
      expect(firstUpdate.quoteRate.toFixed(4)).toBe('1066.6667');
    });
  });

  describe('historial filtrado y paginado', () => {
    it('aplica filtros y devuelve meta de paginación', async () => {
      const event = {
        id: 1,
        savingId: 7,
        type: SavingEventType.ALTA,
        amount: new Prisma.Decimal('100'),
        currency: 'USD',
        sourceAmount: null,
        sourceCurrency: null,
        quoteType: QuoteType.OFICIAL,
        quoteRate: new Prisma.Decimal('1000'),
        walletImpactAmount: new Prisma.Decimal('100000'),
        walletImpactCurrency: 'ARS',
        note: 'compra',
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
      };
      const { service, prisma } = setup({ eventsTotal: 21, events: [event] });

      const result = await service.findEvents(userId, {
        page: 2,
        limit: 20,
        type: SavingEventType.ALTA,
        currency: 'USD',
        search: 'compra',
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-30T23:59:59.999Z',
      });

      expect(prisma.savingEvent.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId,
          type: SavingEventType.ALTA,
          currency: 'USD',
          note: { contains: 'compra', mode: 'insensitive' },
        }),
      });
      expect(prisma.savingEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      });
      expect(result.items[0]).toMatchObject({
        quoteType: QuoteType.OFICIAL,
        quoteRate: 1000,
        walletImpactAmount: 100000,
        walletImpactCurrency: 'ARS',
        note: 'compra',
      });
    });

    it('rechaza un rango de fechas inválido', async () => {
      const { service } = setup();

      await expect(
        service.findEvents(userId, {
          page: 1,
          limit: 20,
          from: '2026-11-30T00:00:00.000Z',
          to: '2026-11-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
