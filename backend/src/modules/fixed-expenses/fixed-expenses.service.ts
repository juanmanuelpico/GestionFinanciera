import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MovementType,
  PaymentMethod,
  Prisma,
  type Category,
  type FixedExpense,
  type FixedExpensePayment,
  type Movement,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { computeSpendingAlert } from '../spending-control/spending-alert.js';
import type { SpendingAlert } from '../spending-control/spending-limit.js';
import {
  currentPeriod,
  dueDateForPeriod,
  isDueInPeriod,
  nextDueDate as computeNextDueDate,
  parseDateOnly,
  parsePeriod,
  periodFromDate,
  toDateOnly,
} from './fixed-expense-calculations.js';
import type { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto.js';
import type { PayFixedExpenseDto } from './dto/pay-fixed-expense.dto.js';
import type { QueryProjectionsDto } from './dto/query-projections.dto.js';
import type { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto.js';

const categorySelect = {
  id: true,
  name: true,
  type: true,
} satisfies Prisma.CategorySelect;

type CategorySummary = Pick<Category, 'id' | 'name' | 'type'>;
type FixedExpenseWithCategory = FixedExpense & { category: CategorySummary };

export interface FixedExpenseResponse {
  id: string;
  title: string;
  amount: string;
  currency: string;
  categoryId: number;
  category: CategorySummary;
  firstDueDate: string;
  dueDay: number;
  intervalMonths: number;
  active: boolean;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FixedExpensePaymentResponse {
  id: string;
  period: string;
  dueDate: string;
  paidAt: string;
  amount: string;
  currency: string;
  paymentMethod: PaymentMethod | null;
  movement: {
    id: number;
    categoryId: number;
    category: { id: number; name: string };
    note: string | null;
  };
  spendingAlert: SpendingAlert | null;
}

export interface FixedExpenseProjection {
  fixedExpenseId: string;
  title: string;
  amount: string;
  currency: string;
  categoryId: number;
  category: CategorySummary;
  intervalMonths: number;
  active: boolean;
  period: string;
  dueDate: string;
  status: 'PENDIENTE' | 'PAGADO';
  payment: FixedExpensePaymentResponse | null;
}

type PaymentRow = FixedExpensePayment & {
  movement: Movement & { category: CategorySummary };
  fixedExpense: FixedExpenseWithCategory;
};

@Injectable()
export class FixedExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<FixedExpenseResponse[]> {
    const expenses = await this.prisma.fixedExpense.findMany({
      where: { userId },
      include: { category: { select: categorySelect } },
      orderBy: [{ active: 'desc' }, { title: 'asc' }],
    });

    return expenses.map((expense) => this.toResponse(expense));
  }

  async create(
    userId: string,
    dto: CreateFixedExpenseDto,
  ): Promise<FixedExpenseResponse> {
    const currency = dto.currency;
    await this.assertWalletEnabled(userId, currency);
    const category = await this.assertCategory(userId, dto.categoryId);
    const firstDueDate = parseDateOnly(dto.firstDueDate);

    const expense = await this.prisma.fixedExpense.create({
      data: {
        userId,
        title: dto.title,
        amount: dto.amount.toFixed(2),
        currency,
        categoryId: category.id,
        firstDueDate,
        dueDay: firstDueDate.getUTCDate(),
        intervalMonths: dto.intervalMonths,
        active: dto.active ?? true,
      },
      include: { category: { select: categorySelect } },
    });

    return this.toResponse(expense);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateFixedExpenseDto,
  ): Promise<FixedExpenseResponse> {
    await this.findOwnedExpense(userId, id);

    const data: Prisma.FixedExpenseUncheckedUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.amount !== undefined) data.amount = dto.amount.toFixed(2);
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.intervalMonths !== undefined) {
      data.intervalMonths = dto.intervalMonths;
    }
    if (dto.currency !== undefined) {
      await this.assertWalletEnabled(userId, dto.currency);
      data.currency = dto.currency;
    }
    if (dto.categoryId !== undefined) {
      const category = await this.assertCategory(userId, dto.categoryId);
      data.categoryId = category.id;
    }
    if (dto.firstDueDate !== undefined) {
      const firstDueDate = parseDateOnly(dto.firstDueDate);
      data.firstDueDate = firstDueDate;
      data.dueDay = firstDueDate.getUTCDate();
    }

    const expense = await this.prisma.fixedExpense.update({
      where: { id },
      data,
      include: { category: { select: categorySelect } },
    });

    return this.toResponse(expense);
  }

  async projections(
    userId: string,
    query: QueryProjectionsDto,
  ): Promise<FixedExpenseProjection[]> {
    const periodStart = parsePeriod(query.period);

    const [expenses, payments] = await this.prisma.$transaction([
      this.prisma.fixedExpense.findMany({
        where: { userId },
        include: { category: { select: categorySelect } },
      }),
      this.prisma.fixedExpensePayment.findMany({
        where: { period: periodStart, fixedExpense: { userId } },
        include: {
          movement: { include: { category: { select: categorySelect } } },
          fixedExpense: { include: { category: { select: categorySelect } } },
        },
      }),
    ]);

    const dueExpenses = expenses.filter((expense) =>
      isDueInPeriod(expense.firstDueDate, expense.intervalMonths, periodStart),
    );

    const paymentByExpenseId = new Map(
      payments.map((payment) => [payment.fixedExpenseId, payment]),
    );

    const projections: FixedExpenseProjection[] = dueExpenses.map((expense) => {
      const payment = paymentByExpenseId.get(expense.id) ?? null;

      return {
        fixedExpenseId: expense.id,
        title: expense.title,
        amount: expense.amount.toFixed(2),
        currency: expense.currency,
        categoryId: expense.categoryId,
        category: expense.category,
        intervalMonths: expense.intervalMonths,
        active: expense.active,
        period: query.period,
        dueDate: toDateOnly(
          dueDateForPeriod(expense.firstDueDate, periodStart),
        ),
        status: payment ? ('PAGADO' as const) : ('PENDIENTE' as const),
        payment: payment ? this.toPaymentResponse(payment) : null,
      };
    });

    for (const payment of payments) {
      const isCovered = dueExpenses.some(
        (expense) => expense.id === payment.fixedExpenseId,
      );

      if (isCovered) {
        continue;
      }

      const expense = payment.fixedExpense;
      projections.push({
        fixedExpenseId: expense.id,
        title: expense.title,
        amount: expense.amount.toFixed(2),
        currency: expense.currency,
        categoryId: expense.categoryId,
        category: expense.category,
        intervalMonths: expense.intervalMonths,
        active: expense.active,
        period: query.period,
        dueDate: toDateOnly(payment.dueDate),
        status: 'PAGADO',
        payment: this.toPaymentResponse(payment),
      });
    }

    projections.sort((a, b) =>
      a.dueDate === b.dueDate
        ? a.title.localeCompare(b.title)
        : a.dueDate.localeCompare(b.dueDate),
    );

    return projections;
  }

  async pay(
    userId: string,
    fixedExpenseId: string,
    dto: PayFixedExpenseDto,
  ): Promise<FixedExpensePaymentResponse> {
    const expense = await this.findOwnedExpense(userId, fixedExpenseId);

    if (!expense.active) {
      throw new BadRequestException(
        'El gasto fijo está inactivo. Reactivalo para registrar el pago.',
      );
    }

    const periodStart = parsePeriod(dto.period);

    if (!isDueInPeriod(expense.firstDueDate, expense.intervalMonths, periodStart)) {
      throw new BadRequestException(
        `Este gasto fijo no vence en el período ${dto.period}`,
      );
    }

    if (periodStart > parsePeriod(currentPeriod())) {
      throw new BadRequestException('No se pueden pagar períodos futuros');
    }

    if (expense.category.type && expense.category.type !== MovementType.EGRESO) {
      throw new BadRequestException(
        'La categoría del gasto fijo no corresponde a un egreso',
      );
    }

    const dueDate = dueDateForPeriod(expense.firstDueDate, periodStart);
    const paidAt = new Date(dto.paidAt);
    const note = dto.note?.trim()
      ? `${dto.note.trim()} · ${expense.title} · Período ${dto.period}`
      : `Gasto fijo: ${expense.title} · Período ${dto.period}`;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.user.update({
            where: { id: userId },
            data: { movementSequence: { increment: 1 } },
            select: { movementSequence: true },
          });

          const movement = await tx.movement.create({
            data: {
              id: user.movementSequence,
              userId,
              type: MovementType.EGRESO,
              amount: dto.amount.toFixed(2),
              categoryId: expense.categoryId,
              movementDate: paidAt,
              currency: expense.currency,
              paymentMethod: dto.paymentMethod ?? null,
              note,
            },
          });

          await tx.fixedExpensePayment.create({
            data: {
              fixedExpenseId: expense.id,
              period: periodStart,
              dueDate,
              paidAt,
              movementUserId: userId,
              movementId: movement.id,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowPaymentError(error, dto.period);
    }

    const payment = await this.prisma.fixedExpensePayment.findFirstOrThrow({
      where: { fixedExpenseId: expense.id, period: periodStart },
      include: {
        movement: { include: { category: { select: categorySelect } } },
        fixedExpense: { include: { category: { select: categorySelect } } },
      },
    });

    const spendingAlert = await computeSpendingAlert(this.prisma, {
      userId,
      categoryId: expense.categoryId,
      currency: expense.currency,
      movementDate: paidAt,
    });

    return { ...this.toPaymentResponse(payment), spendingAlert };
  }

  async findPayments(
    userId: string,
    fixedExpenseId: string,
  ): Promise<{
    fixedExpense: FixedExpenseResponse;
    items: FixedExpensePaymentResponse[];
  }> {
    const expense = await this.findOwnedExpense(userId, fixedExpenseId);

    const payments = await this.prisma.fixedExpensePayment.findMany({
      where: { fixedExpenseId: expense.id },
      include: {
        movement: { include: { category: { select: categorySelect } } },
        fixedExpense: { include: { category: { select: categorySelect } } },
      },
      orderBy: { paidAt: 'desc' },
    });

    return {
      fixedExpense: this.toResponse(expense),
      items: payments.map((payment) => this.toPaymentResponse(payment)),
    };
  }

  private async findOwnedExpense(
    userId: string,
    id: string,
  ): Promise<FixedExpenseWithCategory> {
    const expense = await this.prisma.fixedExpense.findFirst({
      where: { id, userId },
      include: { category: { select: categorySelect } },
    });

    if (!expense) {
      throw new NotFoundException('Gasto fijo no encontrado');
    }

    return expense;
  }

  private async assertCategory(
    userId: string,
    categoryId: number,
  ): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category.type && category.type !== MovementType.EGRESO) {
      throw new BadRequestException(
        'La categoría del gasto fijo debe ser de egreso o no tener tipo',
      );
    }

    return category;
  }

  private async assertWalletEnabled(
    userId: string,
    currency: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { enabledCurrencies: true },
    });

    if (!user.enabledCurrencies.includes(currency)) {
      throw new BadRequestException(
        `La billetera ${currency} no está habilitada`,
      );
    }
  }

  private rethrowPaymentError(error: unknown, period: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `El período ${period} de este gasto fijo ya fue pagado`,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      throw new ConflictException(
        'Ocurrió un conflicto con otra operación financiera. Intentá nuevamente.',
      );
    }

    throw error;
  }

  private toResponse(expense: FixedExpenseWithCategory): FixedExpenseResponse {
    return {
      id: expense.id,
      title: expense.title,
      amount: expense.amount.toFixed(2),
      currency: expense.currency,
      categoryId: expense.categoryId,
      category: expense.category,
      firstDueDate: toDateOnly(expense.firstDueDate),
      dueDay: expense.dueDay,
      intervalMonths: expense.intervalMonths,
      active: expense.active,
      nextDueDate: expense.active
        ? toDateOnly(
            computeNextDueDate(expense.firstDueDate, expense.intervalMonths),
          )
        : null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private toPaymentResponse(payment: PaymentRow): FixedExpensePaymentResponse {
    return {
      id: payment.id,
      period: periodFromDate(payment.period),
      dueDate: toDateOnly(payment.dueDate),
      paidAt: payment.paidAt.toISOString(),
      amount: payment.movement.amount.toFixed(2),
      currency: payment.movement.currency,
      paymentMethod: payment.movement.paymentMethod,
      movement: {
        id: payment.movement.id,
        categoryId: payment.movement.categoryId,
        category: {
          id: payment.movement.category.id,
          name: payment.movement.category.name,
        },
        note: payment.movement.note,
      },
      spendingAlert: null,
    };
  }
}
