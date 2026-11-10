import {
  DashboardSection,
  DebtActorType,
  DebtStatus,
  Prisma,
} from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import type { ExchangeRatesService } from '../exchange-rates/exchange-rates.service.js';
import { DashboardService } from './dashboard.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';
const now = new Date('2026-11-06T12:00:00.000Z');

const allSections = [
  DashboardSection.SAVINGS,
  DashboardSection.FIXED_EXPENSES,
  DashboardSection.MY_DEBTS,
  DashboardSection.THIRD_PARTY_DEBTS,
  DashboardSection.DOLLAR_QUOTES,
];

function createService(sections: DashboardSection[] = allSections) {
  const prisma = {
    user: {
      findUnique: vi.fn(async () => ({
        enabledCurrencies: ['ARS', 'USD'],
        dashboardSections: sections,
      })),
    },
    saving: {
      groupBy: vi.fn(async () => [
        { currency: 'ARS', _sum: { amount: new Prisma.Decimal(1500) } },
      ]),
    },
    fixedExpense: {
      findMany: vi.fn(async () => [
        {
          id: 'rent',
          firstDueDate: new Date('2026-01-01T00:00:00.000Z'),
          intervalMonths: 1,
        },
      ]),
    },
    fixedExpensePayment: {
      findMany: vi.fn(async () => []),
    },
    debt: {
      findMany: vi.fn(
        async ({ where }: { where: { kind: 'PROPIA' | 'TERCERO' } }) => {
          if (where.kind === 'PROPIA') {
            return [
              {
                actorId: 'person-a',
                status: DebtStatus.ACTIVA,
                actor: { type: DebtActorType.PERSONA },
                installments: [
                  {
                    dueDate: new Date('2026-10-01T00:00:00.000Z'),
                    paidAt: null,
                  },
                ],
              },
            ];
          }

          return [
            {
              actorId: 'person-d',
              status: DebtStatus.ACTIVA,
              actor: { type: DebtActorType.PERSONA },
              installments: [
                {
                  dueDate: new Date('2026-10-02T00:00:00.000Z'),
                  paidAt: null,
                },
                {
                  dueDate: new Date('2026-10-03T00:00:00.000Z'),
                  paidAt: null,
                },
              ],
            },
          ];
        },
      ),
    },
  };

  const exchangeRates = {
    getDollarQuotes: vi.fn(async () => ({
      BLUE: { type: 'BLUE', compra: 1000, venta: 1010, casa: 'blue' },
      OFICIAL: { type: 'OFICIAL', compra: 900, venta: 910, casa: 'oficial' },
      MEP: { type: 'MEP', compra: 950, venta: 960, casa: 'bolsa' },
    })),
  };

  const service = new DashboardService(
    prisma as unknown as PrismaService,
    exchangeRates as unknown as ExchangeRatesService,
  );

  return { service, prisma, exchangeRates };
}

describe('DashboardService.summary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arma el resumen de las secciones habilitadas', async () => {
    const { service } = createService();

    const summary = await service.summary(userId);

    expect(summary.sections).toEqual([
      'savings',
      'fixedExpenses',
      'myDebts',
      'thirdPartyDebts',
      'dollarQuotes',
    ]);
    expect(summary.savings).toEqual({
      enabledCurrencies: ['ARS', 'USD'],
      amounts: { ARS: 1500, USD: 0, EUR: 0 },
    });
    expect(summary.fixedExpenses).toEqual({
      period: '2026-11',
      paid: 0,
      pending: 1,
      overdue: 1,
      dueSoon: 0,
    });
    expect(summary.myDebts).toEqual({
      peopleOwed: 1,
      peopleWithActiveDebt: 1,
      overdueDebts: 1,
      overdueInstallments: 1,
    });
    expect(summary.thirdPartyDebts).toEqual({
      peopleWhoOwe: 1,
      peopleWithOverdue: 1,
      activeDebts: 1,
      overdueInstallments: 2,
    });
    expect(summary.dollarQuotes?.OFICIAL.venta).toBe(910);
  });

  it('omite las secciones deshabilitadas sin consultar sus datos', async () => {
    const { service, prisma, exchangeRates } = createService([
      DashboardSection.SAVINGS,
    ]);

    const summary = await service.summary(userId);

    expect(summary.sections).toEqual(['savings']);
    expect(summary.fixedExpenses).toBeNull();
    expect(summary.myDebts).toBeNull();
    expect(summary.thirdPartyDebts).toBeNull();
    expect(summary.dollarQuotes).toBeNull();
    expect(prisma.debt.findMany).not.toHaveBeenCalled();
    expect(exchangeRates.getDollarQuotes).not.toHaveBeenCalled();
  });

  it('devuelve cotizaciones nulas si DolarApi falla', async () => {
    const { service, exchangeRates } = createService([
      DashboardSection.DOLLAR_QUOTES,
    ]);
    exchangeRates.getDollarQuotes.mockRejectedValueOnce(new Error('caída'));

    const summary = await service.summary(userId);

    expect(summary.dollarQuotes).toBeNull();
  });
});
