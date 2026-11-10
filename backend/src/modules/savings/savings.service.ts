import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuoteType,
  SavingEventType,
  SavingStatus,
  type Saving,
  type SavingEvent,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { ExchangeRatesService, type DollarQuoteType } from '../exchange-rates/exchange-rates.service.js';
import type {
  AdjustSavingDto,
  ConvertSavingDto,
  CreateSavingDto,
  QuerySavingEventsDto,
  ReturnSavingDto,
} from './dto/savings.dto.js';
import {
  convertAmount,
  savingCurrencies,
  walletBalance,
  type CurrencyAmount,
  type SavingCurrency,
} from './savings-calculations.js';

export const SAVINGS_CATEGORY_NAME = 'Ahorro';

const QUOTE_TO_DOLLAR_TYPE: Partial<Record<QuoteType, DollarQuoteType>> = {
  BLUE: 'BLUE',
  OFICIAL: 'OFICIAL',
  MEP: 'MEP',
};

export interface SavingResponse {
  id: number;
  currency: SavingCurrency;
  amount: number;
  quoteType: QuoteType;
  quoteRate: number | null;
  estimatedDebit: number;
  debitCurrency: SavingCurrency;
  purchaseDate: Date;
  note: string | null;
  status: SavingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavingEventResponse {
  id: number;
  savingId: number;
  type: SavingEventType;
  amount: number;
  currency: SavingCurrency;
  sourceAmount: number | null;
  sourceCurrency: SavingCurrency | null;
  quoteType: QuoteType | null;
  quoteRate: number | null;
  walletImpactAmount: number | null;
  walletImpactCurrency: SavingCurrency | null;
  note: string | null;
  createdAt: Date;
}

export interface PaginatedSavingEvents {
  items: SavingEventResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SavingPositionResponse {
  amount: number;
  quoteType: QuoteType | null;
  quoteRate: number | null;
}

interface EventInput {
  type: SavingEventType;
  amount: Prisma.Decimal;
  currency: SavingCurrency;
  sourceAmount?: Prisma.Decimal | null;
  sourceCurrency?: SavingCurrency | null;
  quoteType: QuoteType | null;
  quoteRate: Prisma.Decimal | null;
  walletImpactAmount: Prisma.Decimal | null;
  walletImpactCurrency: SavingCurrency | null;
  note: string | null;
}

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRates: ExchangeRatesService,
  ) {}

  async findAll(userId: string): Promise<SavingResponse[]> {
    const savings = await this.prisma.saving.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { purchaseDate: 'desc' }],
    });
    return savings.map((saving) => this.toResponse(saving));
  }

  async findEvents(
    userId: string,
    query: QuerySavingEventsDto,
  ): Promise<PaginatedSavingEvents> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('El rango de fechas no es válido');
    }

    const search = query.search?.trim();
    const where: Prisma.SavingEventWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(search
        ? { note: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const [total, events] = await this.prisma.$transaction([
      this.prisma.savingEvent.count({ where }),
      this.prisma.savingEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: events.map((event) => this.toEventResponse(event)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async create(userId: string, dto: CreateSavingDto): Promise<SavingResponse> {
    const quote = await this.resolveQuote(dto.currency, dto.quoteType, dto.quoteRate);
    const contribution = { currency: dto.currency, rate: quote.rate };
    const wallet = await this.resolveWallet(
      contribution,
      dto.debitCurrency,
      dto.debitRate,
    );
    const newAmount = new Prisma.Decimal(dto.amount);
    const estimatedDebit = convertAmount(newAmount, contribution, wallet);
    const purchaseDate = new Date(dto.purchaseDate);
    const note = dto.note?.trim() || null;

    const created = await this.prisma.$transaction(async (tx) => {
      const categoryId = await this.ensureSavingsCategory(tx, userId);
      const position = await this.ensurePosition(tx, userId, dto.currency);

      let record: Saving;
      if (position) {
        record = await tx.saving.update({
          where: { id: position.id },
          data: {
            amount: position.amount.add(newAmount),
            quoteRate: this.weightedRate(
              position.amount,
              position.quoteRate,
              newAmount,
              quote.rate,
              dto.currency,
            ),
          },
        });
      } else {
        record = await tx.saving.create({
          data: {
            userId,
            currency: dto.currency,
            amount: newAmount,
            quoteType: quote.quoteType,
            quoteRate: quote.rate?.toDecimalPlaces(4) ?? null,
            estimatedDebit,
            debitCurrency: dto.debitCurrency,
            purchaseDate,
            note,
          },
        });
      }

      await this.createMovement(tx, userId, {
        type: 'EGRESO',
        amount: estimatedDebit,
        currency: dto.debitCurrency,
        categoryId,
        movementDate: purchaseDate,
        note: `Ahorro #${record.id}`,
      });

      await this.createEvent(tx, userId, record.id, {
        type: SavingEventType.ALTA,
        amount: newAmount,
        currency: dto.currency,
        quoteType: quote.quoteType,
        quoteRate: quote.rate,
        walletImpactAmount: estimatedDebit,
        walletImpactCurrency: dto.debitCurrency,
        note,
      });

      return record;
    });

    return this.toResponse(created);
  }

  async adjust(
    userId: string,
    currency: SavingCurrency,
    dto: AdjustSavingDto,
  ): Promise<SavingResponse> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const position = await this.requirePosition(tx, userId, currency);
      const delta = new Prisma.Decimal(dto.amount);

      if (dto.operation === 'RESTAR' && delta.gt(position.amount)) {
        throw new BadRequestException(
          'No podés quitar más de lo que tiene ahorrado',
        );
      }

      const next =
        dto.operation === 'SUMAR' ? position.amount.add(delta) : position.amount.sub(delta);

      const record = await tx.saving.update({
        where: { id: position.id },
        data: {
          amount: next,
          ...(next.isZero() ? { status: SavingStatus.CERRADO } : {}),
        },
      });

      await this.createEvent(tx, userId, position.id, {
        type:
          dto.operation === 'SUMAR'
            ? SavingEventType.AJUSTE_SUMA
            : SavingEventType.AJUSTE_RESTA,
        amount: delta,
        currency,
        quoteType: position.quoteType,
        quoteRate: position.quoteRate,
        walletImpactAmount: null,
        walletImpactCurrency: null,
        note: null,
      });

      return record;
    });

    return this.toResponse(updated);
  }

  async returnToWallet(
    userId: string,
    currency: SavingCurrency,
    dto: ReturnSavingDto,
  ): Promise<SavingResponse> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const position = await this.requirePosition(tx, userId, currency);
      const amount = new Prisma.Decimal(dto.amount);

      if (amount.gt(position.amount)) {
        throw new BadRequestException(
          'No podés devolver más de lo que tiene ahorrado',
        );
      }

      // Cotización de venta de la moneda del ahorro: la elegida en el diálogo
      // o la registrada. Permite devolver a un valor distinto del de compra.
      const sourceQuote = dto.sourceQuoteType
        ? await this.resolveQuote(
            currency,
            dto.sourceQuoteType,
            dto.sourceQuoteRate,
          )
        : { quoteType: position.quoteType, rate: position.quoteRate };
      const source: CurrencyAmount = {
        currency,
        rate: currency === 'ARS' ? null : sourceQuote.rate,
      };

      const wallet = await this.resolveWallet(
        source,
        dto.walletCurrency,
        dto.walletRate,
      );
      const value = convertAmount(amount, source, wallet);
      const categoryId = await this.ensureSavingsCategory(tx, userId);

      await this.createMovement(tx, userId, {
        type: 'INGRESO',
        amount: value,
        currency: dto.walletCurrency,
        categoryId,
        movementDate: new Date(),
        note: `Devolución ahorro ${currency}`,
      });

      const next = position.amount.sub(amount);
      const record = await tx.saving.update({
        where: { id: position.id },
        data: {
          amount: next,
          ...(next.isZero() ? { status: SavingStatus.CERRADO } : {}),
        },
      });

      await this.createEvent(tx, userId, position.id, {
        type: SavingEventType.DEVOLUCION,
        amount,
        currency,
        quoteType: sourceQuote.quoteType,
        quoteRate: sourceQuote.rate,
        walletImpactAmount: value,
        walletImpactCurrency: dto.walletCurrency,
        note: null,
      });

      return record;
    });

    return this.toResponse(updated);
  }

  async convert(
    userId: string,
    currency: SavingCurrency,
    dto: ConvertSavingDto,
  ): Promise<SavingResponse> {
    if (dto.currency === currency) {
      throw new BadRequestException('El ahorro ya está en esa moneda');
    }

    const target = await this.resolveQuote(
      dto.currency,
      dto.quoteType,
      dto.quoteRate,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const position = await this.requirePosition(tx, userId, currency);
      const amount = new Prisma.Decimal(dto.amount);

      if (amount.gt(position.amount)) {
        throw new BadRequestException(
          'No podés convertir más de lo que tiene ahorrado',
        );
      }

      // Cotización de origen: la elegida en el diálogo o la registrada en el
      // ahorro. Permite vender a un valor distinto del de compra.
      const sourceQuote = dto.sourceQuoteType
        ? await this.resolveQuote(
            currency,
            dto.sourceQuoteType,
            dto.sourceQuoteRate,
          )
        : { quoteType: position.quoteType, rate: position.quoteRate };

      const source: CurrencyAmount = {
        currency,
        rate: currency === 'ARS' ? null : sourceQuote.rate,
      };
      const converted = convertAmount(amount, source, {
        currency: dto.currency,
        rate: target.rate,
      });
      const remaining = position.amount.sub(amount);
      const closed = remaining.isZero();
      const destination = await this.ensurePosition(tx, userId, dto.currency);

      // El historial muestra la cotización de la moneda extranjera: la de
      // origen (venta) si la hay; si no, la de destino (compra).
      const snapshot =
        currency !== 'ARS'
          ? { quoteType: sourceQuote.quoteType, quoteRate: sourceQuote.rate }
          : { quoteType: target.quoteType, quoteRate: target.rate };

      const event: EventInput = {
        type: SavingEventType.CONVERSION,
        amount: converted,
        currency: dto.currency,
        sourceAmount: amount,
        sourceCurrency: currency,
        quoteType: snapshot.quoteType,
        quoteRate: snapshot.quoteRate,
        walletImpactAmount: null,
        walletImpactCurrency: null,
        note: null,
      };

      if (destination) {
        const record = await tx.saving.update({
          where: { id: destination.id },
          data: {
            amount: destination.amount.add(converted),
            quoteRate: this.weightedRate(
              destination.amount,
              destination.quoteRate,
              converted,
              target.rate,
              dto.currency,
            ),
          },
        });

        await tx.saving.update({
          where: { id: position.id },
          data: {
            amount: remaining,
            ...(closed ? { status: SavingStatus.CERRADO } : {}),
          },
        });

        await this.createEvent(tx, userId, destination.id, event);
        return record;
      }

      if (closed) {
        const record = await tx.saving.update({
          where: { id: position.id },
          data: {
            currency: dto.currency,
            amount: converted,
            quoteType: target.quoteType,
            quoteRate: target.rate?.toDecimalPlaces(4) ?? null,
          },
        });

        await this.createEvent(tx, userId, position.id, event);
        return record;
      }

      const record = await tx.saving.create({
        data: {
          userId,
          currency: dto.currency,
          amount: converted,
          quoteType: target.quoteType,
          quoteRate: target.rate?.toDecimalPlaces(4) ?? null,
          estimatedDebit: this.informationalDebit(
            converted,
            dto.currency,
            target.rate,
            position.debitCurrency as SavingCurrency,
          ),
          debitCurrency: position.debitCurrency,
          purchaseDate: new Date(),
          note: null,
        },
      });

      await tx.saving.update({
        where: { id: position.id },
        data: { amount: remaining },
      });

      await this.createEvent(tx, userId, record.id, event);
      return record;
    });

    return this.toResponse(updated);
  }

  async availableByCurrency(
    userId: string,
  ): Promise<Record<SavingCurrency, number>> {
    const rows = await this.prisma.movement.findMany({
      where: { userId },
      select: { type: true, amount: true, currency: true },
    });
    const result: Record<SavingCurrency, number> = { ARS: 0, USD: 0, EUR: 0 };
    for (const currency of savingCurrencies) {
      const balance = walletBalance(
        rows.filter((row) => row.currency === currency),
      );
      result[currency] = Number(balance.toFixed(2));
    }
    return result;
  }

  async summary(userId: string, eurRate?: number) {
    const [savings, available, user, quotes] = await Promise.all([
      this.prisma.saving.findMany({
        where: { userId, status: SavingStatus.ACTIVO },
        orderBy: [{ purchaseDate: 'asc' }, { id: 'asc' }],
        select: {
          currency: true,
          amount: true,
          quoteType: true,
          quoteRate: true,
        },
      }),
      this.availableByCurrency(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { enabledCurrencies: true, headerCurrency: true },
      }),
      this.exchangeRates.getDollarQuotes().catch(() => null),
    ]);

    const totals: Record<SavingCurrency, number> = { ARS: 0, USD: 0, EUR: 0 };
    const positions: Record<SavingCurrency, SavingPositionResponse> = {
      ARS: { amount: 0, quoteType: null, quoteRate: null },
      USD: { amount: 0, quoteType: null, quoteRate: null },
      EUR: { amount: 0, quoteType: null, quoteRate: null },
    };
    const rateSums: Record<SavingCurrency, Prisma.Decimal> = {
      ARS: new Prisma.Decimal(0),
      USD: new Prisma.Decimal(0),
      EUR: new Prisma.Decimal(0),
    };

    for (const saving of savings) {
      const currency = saving.currency as SavingCurrency;
      const amount = new Prisma.Decimal(saving.amount);
      totals[currency] += Number(saving.amount);
      positions[currency].amount = totals[currency];
      positions[currency].quoteType ??= saving.quoteType;

      if (currency !== 'ARS' && saving.quoteRate !== null) {
        rateSums[currency] = rateSums[currency].add(
          amount.mul(saving.quoteRate),
        );
      }
    }

    for (const currency of savingCurrencies) {
      if (currency === 'ARS' || totals[currency] === 0) continue;
      positions[currency].quoteRate = Number(
        rateSums[currency]
          .div(totals[currency])
          .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
      );
    }

    const usdRate = quotes ? new Prisma.Decimal(quotes.OFICIAL.venta) : null;
    const eur = eurRate ? new Prisma.Decimal(eurRate) : null;
    const rateByCurrency: Record<SavingCurrency, Prisma.Decimal | null> = {
      ARS: new Prisma.Decimal(1),
      USD: usdRate,
      EUR: eur,
    };

    // Total en ARS: null si falta la cotización de alguna moneda con saldo.
    const totalArs = this.totalArs(totals, rateByCurrency);
    const totalUsd =
      totalArs !== null && usdRate
        ? Number(totalArs.div(usdRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP))
        : null;

    return {
      enabledCurrencies: user?.enabledCurrencies ?? ['ARS'],
      headerCurrency: user?.headerCurrency ?? 'ARS',
      available,
      savingsByCurrency: totals,
      positions,
      estimate: {
        ars: totalArs === null ? null : Number(totalArs.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)),
        usd: totalUsd,
        usdRateUsed: usdRate ? Number(usdRate) : null,
      },
    };
  }

  private totalArs(
    totals: Record<SavingCurrency, number>,
    rates: Record<SavingCurrency, Prisma.Decimal | null>,
  ): Prisma.Decimal | null {
    let sum = new Prisma.Decimal(0);
    for (const currency of savingCurrencies) {
      const amount = new Prisma.Decimal(totals[currency]);
      if (amount.isZero()) continue;
      if (currency === 'ARS') {
        sum = sum.add(amount);
        continue;
      }
      const rate = rates[currency];
      if (!rate) return null;
      sum = sum.add(amount.mul(rate));
    }
    return sum;
  }

  /**
   * Una posición activa por moneda. Si existieran varias (datos viejos), las
   * consolida en la más antigua reasignando los eventos y cerrando las demás.
   */
  private async ensurePosition(
    tx: Prisma.TransactionClient,
    userId: string,
    currency: SavingCurrency,
  ): Promise<Saving | null> {
    const rows = await tx.saving.findMany({
      where: { userId, currency, status: SavingStatus.ACTIVO },
      orderBy: [{ purchaseDate: 'asc' }, { id: 'asc' }],
    });

    if (rows.length === 0) {
      return null;
    }

    const [survivor, ...rest] = rows;
    if (rest.length === 0) {
      return survivor;
    }

    const total = rows.reduce(
      (acc, row) => acc.add(row.amount),
      new Prisma.Decimal(0),
    );
    const updated = await tx.saving.update({
      where: { id: survivor.id },
      data: {
        amount: total,
        quoteRate: this.weightedRateFromRows(rows, currency),
      },
    });

    const restIds = rest.map((row) => row.id);
    await tx.savingEvent.updateMany({
      where: { userId, savingId: { in: restIds } },
      data: { savingId: survivor.id },
    });
    await tx.saving.updateMany({
      where: { userId, id: { in: restIds } },
      data: { amount: new Prisma.Decimal(0), status: SavingStatus.CERRADO },
    });

    return updated;
  }

  private async requirePosition(
    tx: Prisma.TransactionClient,
    userId: string,
    currency: SavingCurrency,
  ): Promise<Saving> {
    const position = await this.ensurePosition(tx, userId, currency);
    if (!position) {
      throw new NotFoundException(`No hay ahorro en ${currency}`);
    }
    return position;
  }

  private weightedRate(
    currentAmount: Prisma.Decimal,
    currentRate: Prisma.Decimal | null,
    addedAmount: Prisma.Decimal,
    addedRate: Prisma.Decimal | null,
    currency: SavingCurrency,
  ): Prisma.Decimal | null {
    if (currency === 'ARS') {
      return null;
    }
    const total = currentAmount.add(addedAmount);
    if (total.isZero()) {
      return addedRate?.toDecimalPlaces(4) ?? null;
    }
    const currentValue = currentAmount.mul(currentRate ?? addedRate ?? 0);
    const addedValue = addedAmount.mul(addedRate ?? 0);
    return currentValue
      .add(addedValue)
      .div(total)
      .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
  }

  private weightedRateFromRows(
    rows: Saving[],
    currency: SavingCurrency,
  ): Prisma.Decimal | null {
    if (currency === 'ARS') {
      return null;
    }
    let amount = new Prisma.Decimal(0);
    let value = new Prisma.Decimal(0);
    for (const row of rows) {
      if (row.quoteRate === null) continue;
      amount = amount.add(row.amount);
      value = value.add(row.amount.mul(row.quoteRate));
    }
    if (amount.isZero()) {
      return rows.find((row) => row.quoteRate !== null)?.quoteRate ?? null;
    }
    return value
      .div(amount)
      .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
  }

  /**
   * Estimado informativo de lo descontado para una fila creada por una
   * conversión parcial. El dato real por operación vive en los eventos.
   */
  private informationalDebit(
    amount: Prisma.Decimal,
    currency: SavingCurrency,
    rate: Prisma.Decimal | null,
    debitCurrency: SavingCurrency,
  ): Prisma.Decimal {
    if (debitCurrency === currency) {
      return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }
    if (debitCurrency === 'ARS') {
      const valueRate = currency === 'ARS' ? new Prisma.Decimal(1) : rate;
      if (!valueRate) {
        return new Prisma.Decimal(0);
      }
      return amount
        .mul(valueRate)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }
    return new Prisma.Decimal(0);
  }

  /**
   * Cotización para una moneda: ARS no usa cotización; USD puede usar
   * DolarApi (blue/oficial/MEP) o manual; EUR solo manual.
   */
  private async resolveQuote(
    currency: SavingCurrency,
    quoteType: QuoteType | undefined,
    quoteRate: number | undefined,
  ): Promise<{ quoteType: QuoteType; rate: Prisma.Decimal | null }> {
    if (currency === 'ARS') {
      return { quoteType: QuoteType.MANUAL, rate: null };
    }
    if (!quoteType) {
      throw new BadRequestException('Elegí la cotización');
    }
    if (quoteType === QuoteType.MANUAL) {
      if (!quoteRate) {
        throw new BadRequestException('Ingresá la cotización manual');
      }
      return { quoteType, rate: new Prisma.Decimal(quoteRate) };
    }
    const dollarType = QUOTE_TO_DOLLAR_TYPE[quoteType];
    if (currency !== 'USD' || !dollarType) {
      throw new BadRequestException(
        `${currency} solo admite cotización manual`,
      );
    }
    const quotes = await this.exchangeRates.getDollarQuotes();
    return {
      quoteType,
      rate: new Prisma.Decimal(quotes[dollarType].venta),
    };
  }

  /**
   * Cotización de la billetera de descuento o destino. Si es la misma moneda
   * del ahorro o ARS no hace falta; si es otra moneda extranjera, la cotización
   * manual es obligatoria.
   */
  private async resolveWallet(
    source: CurrencyAmount,
    walletCurrency: SavingCurrency,
    walletRate: number | undefined,
  ): Promise<CurrencyAmount> {
    if (walletCurrency === source.currency || walletCurrency === 'ARS') {
      return { currency: walletCurrency, rate: walletCurrency === 'ARS' ? null : source.rate };
    }
    if (!walletRate) {
      throw new BadRequestException(
        `Ingresá la cotización de ${walletCurrency} para la billetera`,
      );
    }
    return { currency: walletCurrency, rate: new Prisma.Decimal(walletRate) };
  }

  private currencyAmountOf(saving: Saving): CurrencyAmount {
    return {
      currency: saving.currency as SavingCurrency,
      rate: saving.quoteRate,
    };
  }

  private async ensureSavingsCategory(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<number> {
    const category = await tx.category.upsert({
      where: { userId_name: { userId, name: SAVINGS_CATEGORY_NAME } },
      update: {},
      create: { userId, name: SAVINGS_CATEGORY_NAME, type: null },
      select: { id: true },
    });
    return category.id;
  }

  private async createMovement(
    tx: Prisma.TransactionClient,
    userId: string,
    input: {
      type: 'INGRESO' | 'EGRESO';
      amount: Prisma.Decimal;
      currency: SavingCurrency;
      categoryId: number;
      movementDate: Date;
      note: string;
    },
  ): Promise<void> {
    const user = await tx.user.update({
      where: { id: userId },
      data: { movementSequence: { increment: 1 } },
      select: { movementSequence: true },
    });
    await tx.movement.create({
      data: {
        id: user.movementSequence,
        userId,
        type: input.type,
        amount: input.amount.toDecimalPlaces(2),
        categoryId: input.categoryId,
        movementDate: input.movementDate,
        currency: input.currency,
        note: input.note,
      },
    });
  }

  private async createEvent(
    tx: Prisma.TransactionClient,
    userId: string,
    savingId: number,
    input: EventInput,
  ): Promise<void> {
    await tx.savingEvent.create({
      data: {
        userId,
        savingId,
        type: input.type,
        amount: input.amount.toDecimalPlaces(2),
        currency: input.currency,
        sourceAmount: input.sourceAmount?.toDecimalPlaces(2) ?? null,
        sourceCurrency: input.sourceCurrency ?? null,
        quoteType: input.quoteType,
        quoteRate: input.quoteRate?.toDecimalPlaces(4) ?? null,
        walletImpactAmount: input.walletImpactAmount?.toDecimalPlaces(2) ?? null,
        walletImpactCurrency: input.walletImpactCurrency,
        note: input.note,
      },
    });
  }

  private toResponse(saving: Saving): SavingResponse {
    return {
      id: saving.id,
      currency: saving.currency as SavingCurrency,
      amount: Number(saving.amount),
      quoteType: saving.quoteType,
      quoteRate: saving.quoteRate === null ? null : Number(saving.quoteRate),
      estimatedDebit: Number(saving.estimatedDebit),
      debitCurrency: saving.debitCurrency as SavingCurrency,
      purchaseDate: saving.purchaseDate,
      note: saving.note,
      status: saving.status,
      createdAt: saving.createdAt,
      updatedAt: saving.updatedAt,
    };
  }

  private toEventResponse(event: SavingEvent): SavingEventResponse {
    return {
      id: event.id,
      savingId: event.savingId,
      type: event.type,
      amount: Number(event.amount),
      currency: event.currency as SavingCurrency,
      sourceAmount:
        event.sourceAmount === null ? null : Number(event.sourceAmount),
      sourceCurrency:
        (event.sourceCurrency as SavingCurrency | null) ?? null,
      quoteType: event.quoteType,
      quoteRate: event.quoteRate === null ? null : Number(event.quoteRate),
      walletImpactAmount:
        event.walletImpactAmount === null
          ? null
          : Number(event.walletImpactAmount),
      walletImpactCurrency:
        (event.walletImpactCurrency as SavingCurrency | null) ?? null,
      note: event.note,
      createdAt: event.createdAt,
    };
  }
}
