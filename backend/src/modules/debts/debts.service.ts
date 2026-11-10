import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DebtActorType,
  DebtKind,
  DebtMovementRole,
  DebtSettlementStatus,
  MovementType,
  Prisma,
  type DebtActor,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  buildDueDates,
  buildInstallmentAmounts,
  parseDateOnly,
} from './debt-calculations.js';
import {
  createDebtMovement,
  ensureDebtCategory,
  nextDebtCode,
  rethrowAsConflict,
  walletAvailable,
} from './debt-movements.js';
import {
  mapDebtResponse,
  mapInstallment,
  type DebtInstallmentResponse,
  type DebtResponse,
} from './debt-response.js';
import type { CreateDebtDto } from './dto/create-debt.dto.js';
import type { QueryDebtsDto } from './dto/query-debts.dto.js';

export interface PaginatedDebts {
  items: DebtResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type DebtDetailResponse = DebtResponse & {
  installments: DebtInstallmentResponse[];
};

const debtWithListInclude = {
  actor: true,
  installments: { orderBy: { number: 'asc' } },
  settlements: {
    where: { status: DebtSettlementStatus.ACTIVA },
    select: { id: true },
  },
  split: { select: { code: true } },
} satisfies Prisma.DebtInclude;

type DebtListRow = Prisma.DebtGetPayload<{
  include: typeof debtWithListInclude;
}>;

/** Mediodía UTC del día calendario: evita corrimientos al mostrar en local. */
export function middayUtc(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12,
      0,
      0,
    ),
  );
}

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryDebtsDto): Promise<PaginatedDebts> {
    const where: Prisma.DebtWhereInput = {
      userId,
      kind: query.kind,
      ...(query.status ? { status: query.status } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.actorType ? { actor: { type: query.actorType } } : {}),
      ...(query.description
        ? {
            note: { contains: query.description, mode: 'insensitive' as const },
          }
        : {}),
      ...(query.search
        ? {
            actor: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { alias: { contains: query.search, mode: 'insensitive' } },
                { issuer: { contains: query.search, mode: 'insensitive' } },
                { brand: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.debt.count({ where }),
      this.prisma.debt.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: debtWithListInclude,
      }),
    ]);

    return {
      items: rows.map((row) => this.toListResponse(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async findDetail(userId: string, id: string): Promise<DebtDetailResponse> {
    const debt = await this.loadDebt(userId, id);

    return {
      ...this.toListResponse(debt),
      installments: debt.installments.map(mapInstallment),
    };
  }

  async create(userId: string, dto: CreateDebtDto): Promise<DebtDetailResponse> {
    const actor = await this.findOwnedActor(userId, dto.actorId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { enabledCurrencies: true },
    });

    if (dto.kind === DebtKind.TERCERO && actor.type !== DebtActorType.PERSONA) {
      throw new BadRequestException(
        'Las deudas con terceros solo pueden ser con personas',
      );
    }

    if (actor.type === DebtActorType.TARJETA && dto.kind !== DebtKind.PROPIA) {
      throw new BadRequestException(
        'Las tarjetas solo pueden generar deudas propias',
      );
    }

    if (!user.enabledCurrencies.includes(dto.currency)) {
      throw new BadRequestException(
        `La billetera ${dto.currency} no está habilitada`,
      );
    }

    const total = new Prisma.Decimal(dto.totalAmount);
    const amounts = buildInstallmentAmounts(total, dto.installmentCount);
    const operationDate = parseDateOnly(dto.operationDate);
    const firstDueDate = parseDateOnly(dto.firstDueDate);
    const dueDates = buildDueDates(firstDueDate, dto.installmentCount);
    const isCardDebt = actor.type === DebtActorType.TARJETA;

    let debtId: string;

    try {
      debtId = await this.prisma.$transaction(
        async (tx) => {
          if (dto.kind === DebtKind.TERCERO) {
            const available = await walletAvailable(tx, userId, dto.currency);

            if (available.lt(total)) {
              throw new BadRequestException(
                `Saldo insuficiente en la billetera ${dto.currency}: ` +
                  `disponible ${available.toFixed(2)}, se necesita ${total.toFixed(2)}`,
              );
            }
          }

          const categoryId = await ensureDebtCategory(tx, userId);
          const code = await nextDebtCode(tx, userId, dto.kind);

          const debt = await tx.debt.create({
            data: {
              userId,
              actorId: actor.id,
              kind: dto.kind,
              code,
              currency: dto.currency,
              totalAmount: total.toFixed(2),
              installmentCount: dto.installmentCount,
              operationDate,
              firstDueDate,
              note: dto.note?.trim() || null,
            },
          });

          await tx.debtInstallment.createMany({
            data: amounts.map((amount, index) => ({
              debtId: debt.id,
              number: index + 1,
              dueDate: dueDates[index],
              amount: amount.toFixed(2),
            })),
          });

          if (!isCardDebt) {
            const actorName = [actor.firstName, actor.lastName]
              .filter(Boolean)
              .join(' ');
            const baseNote =
              dto.kind === DebtKind.TERCERO
                ? `Préstamo a ${actorName}`
                : `Préstamo recibido de ${actorName}`;

            await createDebtMovement(tx, userId, {
              type:
                dto.kind === DebtKind.TERCERO
                  ? MovementType.EGRESO
                  : MovementType.INGRESO,
              amount: total,
              currency: dto.currency,
              categoryId,
              movementDate: middayUtc(operationDate),
              note: `${debt.code} — ${baseNote}`,
              debtId: debt.id,
              role: DebtMovementRole.INICIAL,
            });
          }

          return debt.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }

    return this.findDetail(userId, debtId);
  }

  async loadDebt(userId: string, id: string): Promise<DebtListRow> {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId },
      include: debtWithListInclude,
    });

    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }

    return debt;
  }

  toListResponse(debt: DebtListRow): DebtResponse {
    return mapDebtResponse(debt, {
      hasActiveSettlement: debt.settlements.length > 0,
      splitCode: debt.split?.code ?? null,
    });
  }

  private async findOwnedActor(userId: string, id: string): Promise<DebtActor> {
    const actor = await this.prisma.debtActor.findFirst({
      where: { id, userId },
    });

    if (!actor) {
      throw new NotFoundException('Actor no encontrado');
    }

    return actor;
  }
}
