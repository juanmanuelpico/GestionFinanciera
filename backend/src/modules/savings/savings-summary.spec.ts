import { Prisma, QuoteType } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import type { ExchangeRatesService } from '../exchange-rates/exchange-rates.service.js';
import { SavingsService } from './savings.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

function setup(options: {
  savings: { currency: string; amount: string; quoteRate?: string }[];
  movements: { type: 'INGRESO' | 'EGRESO'; amount: string; currency: string }[];
  quotesFail?: boolean;
}) {
  const prisma = {
    saving: {
      findMany: vi.fn(async () =>
        options.savings.map((row) => ({
          currency: row.currency,
          amount: new Prisma.Decimal(row.amount),
          quoteType: QuoteType.MANUAL,
          quoteRate: row.quoteRate ? new Prisma.Decimal(row.quoteRate) : null,
        })),
      ),
    },
    movement: {
      findMany: vi.fn(async () =>
        options.movements.map((row) => ({
          type: row.type,
          currency: row.currency,
          amount: new Prisma.Decimal(row.amount),
        })),
      ),
    },
    user: {
      findUnique: vi.fn(async () => ({
        enabledCurrencies: ['ARS', 'USD'],
        headerCurrency: 'ARS',
      })),
    },
  };

  const exchangeRates = {
    getDollarQuotes: vi.fn(async () => {
      if (options.quotesFail) throw new Error('DolarApi caída');
      return {
        OFICIAL: { venta: 1000 },
      };
    }),
  };

  const service = new SavingsService(
    prisma as unknown as PrismaService,
    exchangeRates as unknown as ExchangeRatesService,
  );
  return { service };
}

describe('SavingsService.summary (S12, S1)', () => {
  it('estima el total en pesos y dólares con la cotización oficial', async () => {
    const { service } = setup({
      savings: [
        { currency: 'ARS', amount: '100' },
        { currency: 'USD', amount: '100' },
      ],
      movements: [],
    });

    const summary = await service.summary(userId);

    expect(summary.estimate.ars).toBe(100100);
    expect(summary.estimate.usd).toBe(100.1);
    expect(summary.estimate.usdRateUsed).toBe(1000);
  });

  it('expone la posición por moneda con cotización ponderada', async () => {
    const { service } = setup({
      savings: [
        { currency: 'USD', amount: '100', quoteRate: '1000' },
        { currency: 'USD', amount: '100', quoteRate: '1200' },
      ],
      movements: [],
    });

    const summary = await service.summary(userId);

    expect(summary.positions.USD).toEqual({
      amount: 200,
      quoteType: QuoteType.MANUAL,
      quoteRate: 1100,
    });
    expect(summary.positions.ARS.amount).toBe(0);
    expect(summary.positions.ARS.quoteRate).toBeNull();
  });

  it('muestra sin estimado si falla DolarApi y hay ahorros en USD', async () => {
    const { service } = setup({
      savings: [{ currency: 'USD', amount: '100' }],
      movements: [],
      quotesFail: true,
    });

    const summary = await service.summary(userId);

    expect(summary.estimate.ars).toBeNull();
    expect(summary.estimate.usd).toBeNull();
  });

  it('calcula el disponible por billetera como ingresos menos egresos', async () => {
    const { service } = setup({
      savings: [],
      movements: [
        { type: 'INGRESO', amount: '1000', currency: 'ARS' },
        { type: 'EGRESO', amount: '400', currency: 'ARS' },
        { type: 'INGRESO', amount: '50', currency: 'USD' },
      ],
    });

    const available = await service.availableByCurrency(userId);

    expect(available).toEqual({ ARS: 600, USD: 50, EUR: 0 });
  });
});
