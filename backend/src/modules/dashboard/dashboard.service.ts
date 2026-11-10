import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DebtKind,
  Prisma,
  SavingStatus,
  type DashboardSection,
} from '@prisma/client';
import {
  dashboardSectionIds,
  DASHBOARD_SECTION_TO_API,
  type DashboardSectionId,
} from '../../common/dashboard-sections.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  ExchangeRatesService,
  type DollarQuotesResponse,
} from '../exchange-rates/exchange-rates.service.js';
import {
  currentPeriod,
  parsePeriod,
} from '../fixed-expenses/fixed-expense-calculations.js';
import {
  savingCurrencies,
  type SavingCurrency,
} from '../savings/savings-calculations.js';
import {
  summarizeDebts,
  summarizeFixedExpenses,
  type DebtRow,
} from './dashboard-calculations.js';

export interface DashboardSavingsSummary {
  enabledCurrencies: SavingCurrency[];
  amounts: Record<SavingCurrency, number>;
}

export interface DashboardFixedExpensesSummary {
  period: string;
  paid: number;
  pending: number;
  overdue: number;
  dueSoon: number;
}

export interface DashboardMyDebtsSummary {
  peopleOwed: number;
  peopleWithActiveDebt: number;
  overdueDebts: number;
  overdueInstallments: number;
}

export interface DashboardThirdPartyDebtsSummary {
  peopleWhoOwe: number;
  peopleWithOverdue: number;
  activeDebts: number;
  overdueInstallments: number;
}

export interface DashboardSummary {
  sections: DashboardSectionId[];
  savings: DashboardSavingsSummary | null;
  fixedExpenses: DashboardFixedExpensesSummary | null;
  myDebts: DashboardMyDebtsSummary | null;
  thirdPartyDebts: DashboardThirdPartyDebtsSummary | null;
  dollarQuotes: DollarQuotesResponse | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  async summary(userId: string): Promise<DashboardSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { enabledCurrencies: true, dashboardSections: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const sections = this.toSections(user.dashboardSections);
    const has = (section: DashboardSectionId) => sections.includes(section);
    const enabledCurrencies = user.enabledCurrencies.filter(
      (currency): currency is SavingCurrency =>
        (savingCurrencies as readonly string[]).includes(currency),
    );

    const [savings, fixedExpenses, myDebts, thirdPartyDebts, dollarQuotes] =
      await Promise.all([
        has('savings')
          ? this.savingsSummary(userId, enabledCurrencies)
          : Promise.resolve(null),
        has('fixedExpenses')
          ? this.fixedExpensesSummary(userId)
          : Promise.resolve(null),
        has('myDebts')
          ? this.myDebtsSummary(userId)
          : Promise.resolve(null),
        has('thirdPartyDebts')
          ? this.thirdPartyDebtsSummary(userId)
          : Promise.resolve(null),
        has('dollarQuotes')
          ? this.exchangeRates.getDollarQuotes().catch(() => null)
          : Promise.resolve(null),
      ]);

    return {
      sections,
      savings,
      fixedExpenses,
      myDebts,
      thirdPartyDebts,
      dollarQuotes,
    };
  }

  private async savingsSummary(
    userId: string,
    enabledCurrencies: SavingCurrency[],
  ): Promise<DashboardSavingsSummary> {
    const rows = await this.prisma.saving.groupBy({
      by: ['currency'],
      where: { userId, status: SavingStatus.ACTIVO },
      _sum: { amount: true },
    });

    const amounts: Record<SavingCurrency, number> = { ARS: 0, USD: 0, EUR: 0 };

    for (const row of rows) {
      if (
        (savingCurrencies as readonly string[]).includes(row.currency)
      ) {
        amounts[row.currency as SavingCurrency] = Number(
          row._sum.amount ?? new Prisma.Decimal(0),
        );
      }
    }

    return { enabledCurrencies, amounts };
  }

  private async fixedExpensesSummary(
    userId: string,
  ): Promise<DashboardFixedExpensesSummary> {
    const period = currentPeriod();
    const periodStart = parsePeriod(period);

    const [expenses, payments] = await Promise.all([
      this.prisma.fixedExpense.findMany({
        where: { userId },
        select: { id: true, firstDueDate: true, intervalMonths: true },
      }),
      this.prisma.fixedExpensePayment.findMany({
        where: { period: periodStart, fixedExpense: { userId } },
        select: { fixedExpenseId: true },
      }),
    ]);

    const stats = summarizeFixedExpenses(
      expenses,
      new Set(payments.map((payment) => payment.fixedExpenseId)),
      periodStart,
      new Date(),
    );

    return { period, ...stats };
  }

  private async myDebtsSummary(
    userId: string,
  ): Promise<DashboardMyDebtsSummary> {
    const stats = await this.debtStats(userId, DebtKind.PROPIA);

    return {
      peopleOwed: stats.people,
      peopleWithActiveDebt: stats.activePeople,
      overdueDebts: stats.overdueDebts,
      overdueInstallments: stats.overdueInstallments,
    };
  }

  private async thirdPartyDebtsSummary(
    userId: string,
  ): Promise<DashboardThirdPartyDebtsSummary> {
    const stats = await this.debtStats(userId, DebtKind.TERCERO);

    return {
      peopleWhoOwe: stats.people,
      peopleWithOverdue: stats.peopleWithOverdue,
      activeDebts: stats.activeDebts,
      overdueInstallments: stats.overdueInstallments,
    };
  }

  private async debtStats(userId: string, kind: DebtKind) {
    const debts = await this.prisma.debt.findMany({
      where: { userId, kind },
      select: {
        actorId: true,
        status: true,
        actor: { select: { type: true } },
        installments: { select: { dueDate: true, paidAt: true } },
      },
    });

    const rows: DebtRow[] = debts.map((debt) => ({
      actorId: debt.actorId,
      actorType: debt.actor.type,
      status: debt.status,
      installments: debt.installments,
    }));

    return summarizeDebts(rows, new Date());
  }

  private toSections(sections: DashboardSection[]): DashboardSectionId[] {
    const enabled = new Set(sections.map((section) => DASHBOARD_SECTION_TO_API[section]));
    return dashboardSectionIds.filter((section) => enabled.has(section));
  }
}
