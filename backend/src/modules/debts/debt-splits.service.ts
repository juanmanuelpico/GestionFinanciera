import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DebtActorType,
  DebtKind,
  DebtMovementRole,
  MovementType,
  Prisma,
} from '@prisma/client';
import type { QueryDebtSplitsDto } from './dto/query-debt-splits.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { addMonthsUtc, parseDateOnly, toDateOnly } from './debt-calculations.js';
import { displayNameOf } from './debt-actors.service.js';
import { middayUtc } from './debts.service.js';
import {
  createDebtMovement,
  createSplitShareMovement,
  ensureDebtCategory,
  ensureSplitExpenseCategory,
  nextDebtCode,
  nextSplitCode,
  rethrowAsConflict,
  walletAvailable,
} from './debt-movements.js';
import type { CreateDebtSplitDto } from './dto/create-debt-split.dto.js';

export interface DebtSplitItemResponse {
  actorId: string;
  displayName: string;
  amount: string;
}

export interface DebtSplitDebtResponse {
  id: string;
  code: string;
  kind: DebtKind;
  totalAmount: string;
}

export interface DebtSplitResponse {
  id: string;
  code: string;
  currency: string;
  totalAmount: string;
  userAmount: string;
  payer: 'USER' | 'ACTOR';
  payerActorId: string | null;
  payerDisplayName: string | null;
  note: string | null;
  operationDate: string;
  items: DebtSplitItemResponse[];
  debts: DebtSplitDebtResponse[];
  createdAt: string;
}

export interface PaginatedDebtSplits {
  items: DebtSplitResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const splitInclude = {
  items: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
  debts: true,
  payer: true,
} satisfies Prisma.DebtSplitInclude;

type SplitWithRelations = Prisma.DebtSplitGetPayload<{
  include: typeof splitInclude;
}>;

const MAX_NOTE_LENGTH = 500;

/** Nota de deudas/movimientos generados por una división, recortada al máximo. */
function splitNote(base: string, note: string | null): string {
  if (!note) {
    return base;
  }

  return `${base}: ${note}`.slice(0, MAX_NOTE_LENGTH);
}

@Injectable()
export class DebtSplitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: QueryDebtSplitsDto,
  ): Promise<PaginatedDebtSplits> {
    const where: Prisma.DebtSplitWhereInput = {
      userId,
      ...(query.search
        ? {
            OR: [
              { note: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.debtSplit.count({ where }),
      this.prisma.debtSplit.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: splitInclude,
      }),
    ]);

    return {
      items: rows.map((row) => this.toResponse(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async findDetail(userId: string, id: string): Promise<DebtSplitResponse> {
    return this.toResponse(await this.loadSplit(userId, id));
  }

  async create(
    userId: string,
    dto: CreateDebtSplitDto,
  ): Promise<DebtSplitResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { enabledCurrencies: true },
    });

    if (!user.enabledCurrencies.includes(dto.currency)) {
      throw new BadRequestException(
        `La billetera ${dto.currency} no está habilitada`,
      );
    }

    const actorIds = dto.items.map((item) => item.actorId);

    if (new Set(actorIds).size !== actorIds.length) {
      throw new BadRequestException(
        'Elegí actores distintos en cada fila de la división',
      );
    }

    const actors = await this.prisma.debtActor.findMany({
      where: { id: { in: actorIds }, userId },
    });

    if (actors.length !== actorIds.length) {
      throw new NotFoundException('Alguno de los actores no existe');
    }

    if (actors.some((actor) => actor.type !== DebtActorType.PERSONA)) {
      throw new BadRequestException(
        'En una división de gastos solo pueden participar personas',
      );
    }

    const total = new Prisma.Decimal(dto.totalAmount);
    const userAmount = new Prisma.Decimal(dto.userAmount);
    const itemAmounts = dto.items.map((item) => ({
      actorId: item.actorId,
      amount: new Prisma.Decimal(item.amount),
    }));

    const partsSum = itemAmounts.reduce(
      (acc, item) => acc.add(item.amount),
      userAmount,
    );

    if (!partsSum.toDecimalPlaces(2).equals(total.toDecimalPlaces(2))) {
      throw new BadRequestException(
        'La suma de tu parte y la de cada actor debe ser igual al total del gasto',
      );
    }

    const byId = new Map(actors.map((actor) => [actor.id, actor]));

    if (dto.payer === 'ACTOR') {
      if (!dto.payerActorId || !byId.has(dto.payerActorId)) {
        throw new BadRequestException(
          'Quien pagó la cuenta debe ser uno de los actores de la división',
        );
      }

      if (userAmount.lte(0)) {
        throw new BadRequestException(
          'Si pagó otra persona, tu parte debe ser mayor a 0 para registrar la deuda',
        );
      }
    }

    const note = dto.note.trim();
    const operationDate = parseDateOnly(new Date().toISOString());
    const firstDueDate = addMonthsUtc(operationDate, 1);
    const payerActorId = dto.payer === 'ACTOR' ? dto.payerActorId : null;

    let splitId: string;

    try {
      splitId = await this.prisma.$transaction(
        async (tx) => {
          if (dto.payer === 'USER') {
            const available = await walletAvailable(tx, userId, dto.currency);

            if (available.lt(total)) {
              throw new BadRequestException(
                `Saldo insuficiente en la billetera ${dto.currency}: ` +
                  `disponible ${available.toFixed(2)}, se necesita ${total.toFixed(2)}`,
              );
            }
          }

          const splitCode = await nextSplitCode(tx, userId);

          const split = await tx.debtSplit.create({
            data: {
              userId,
              code: splitCode,
              currency: dto.currency,
              totalAmount: total.toFixed(2),
              userAmount: userAmount.toFixed(2),
              paidByActorId: payerActorId,
              note,
              operationDate,
              items: {
                create: itemAmounts.map((item) => ({
                  actorId: item.actorId,
                  amount: item.amount.toFixed(2),
                })),
              },
            },
            select: { id: true },
          });

          if (dto.payer === 'USER') {
            const debtCategoryId = await ensureDebtCategory(tx, userId);

            for (const item of itemAmounts) {
              if (item.amount.lte(0)) {
                continue;
              }

              const actorName = displayNameOf(byId.get(item.actorId)!);
              const debtCode = await nextDebtCode(tx, userId, DebtKind.TERCERO);
              const debt = await tx.debt.create({
                data: {
                  userId,
                  actorId: item.actorId,
                  kind: DebtKind.TERCERO,
                  code: debtCode,
                  currency: dto.currency,
                  totalAmount: item.amount.toFixed(2),
                  installmentCount: 1,
                  operationDate,
                  firstDueDate,
                  note: splitNote(`Deuda por división ${splitCode}`, note),
                  splitId: split.id,
                },
              });

              await tx.debtInstallment.create({
                data: {
                  debtId: debt.id,
                  number: 1,
                  dueDate: firstDueDate,
                  amount: item.amount.toFixed(2),
                },
              });

              await createDebtMovement(tx, userId, {
                type: MovementType.EGRESO,
                amount: item.amount,
                currency: dto.currency,
                categoryId: debtCategoryId,
                movementDate: middayUtc(operationDate),
                note: splitNote(
                  `${debt.code} — Préstamo a ${actorName} (por división ${splitCode})`,
                  note,
                ),
                debtId: debt.id,
                role: DebtMovementRole.INICIAL,
              });
            }

            if (userAmount.gt(0)) {
              const splitCategoryId = await ensureSplitExpenseCategory(
                tx,
                userId,
              );

              const movement = await createSplitShareMovement(tx, userId, {
                amount: userAmount,
                currency: dto.currency,
                categoryId: splitCategoryId,
                movementDate: middayUtc(operationDate),
                note: splitNote(
                  `${splitCode} — Mi parte de un gasto común`,
                  note,
                ),
              });

              await tx.debtSplit.update({
                where: { id: split.id },
                data: {
                  userShareMovementUserId: userId,
                  userShareMovementId: movement.id,
                },
              });
            }
          } else {
            const payerActor = byId.get(payerActorId!)!;
            const debtCode = await nextDebtCode(tx, userId, DebtKind.PROPIA);
            const debt = await tx.debt.create({
              data: {
                userId,
                actorId: payerActor.id,
                kind: DebtKind.PROPIA,
                code: debtCode,
                currency: dto.currency,
                totalAmount: userAmount.toFixed(2),
                installmentCount: 1,
                operationDate,
                firstDueDate,
                note: splitNote(
                  `Deuda con ${displayNameOf(payerActor)} por división ${splitCode}`,
                  note,
                ),
                splitId: split.id,
              },
            });

            await tx.debtInstallment.create({
              data: {
                debtId: debt.id,
                number: 1,
                dueDate: firstDueDate,
                amount: userAmount.toFixed(2),
              },
            });
          }

          return split.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }

    return this.findDetail(userId, splitId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const split = await this.loadSplit(userId, id);

    const debtIds = split.debts.map((debt) => debt.id);

    if (debtIds.length > 0) {
      const paidCount = await this.prisma.debtInstallment.count({
        where: { debtId: { in: debtIds }, paidAmount: { gt: 0 } },
      });

      if (paidCount > 0) {
        throw new BadRequestException(
          'Las deudas de esta división ya tienen cobros o pagos. ' +
            'Deshacelos antes de eliminar la división.',
        );
      }
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (debtIds.length > 0) {
            const settlements = await tx.debtSettlement.findMany({
              where: { debtId: { in: debtIds } },
              select: { id: true },
            });

            if (settlements.length > 0) {
              await tx.debtSettlementItem.deleteMany({
                where: { settlementId: { in: settlements.map((s) => s.id) } },
              });
            }

            await tx.debtInstallment.updateMany({
              where: { debtId: { in: debtIds } },
              data: { currentSettlementId: null },
            });

            await tx.debtSettlement.deleteMany({
              where: { debtId: { in: debtIds } },
            });
          }

          await tx.debtInstallment.deleteMany({
            where: { debtId: { in: debtIds } },
          });

          // La división referencia el egreso de la parte propia con FK Restrict:
          // hay que desvincularla antes de borrar el movimiento.
          if (split.userShareMovementId !== null) {
            await tx.debtSplit.update({
              where: { id },
              data: {
                userShareMovementUserId: null,
                userShareMovementId: null,
              },
            });
          }

          await tx.movement.deleteMany({
            where: {
              userId,
              OR: [
                ...(debtIds.length > 0 ? [{ debtId: { in: debtIds } }] : []),
                ...(split.userShareMovementId !== null
                  ? [
                      {
                        userId,
                        id: split.userShareMovementId,
                      },
                    ]
                  : []),
              ],
            },
          });

          if (debtIds.length > 0) {
            await tx.debt.deleteMany({ where: { id: { in: debtIds } } });
          }

          await tx.debtSplit.delete({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }
  }

  private async loadSplit(
    userId: string,
    id: string,
  ): Promise<SplitWithRelations> {
    const split = await this.prisma.debtSplit.findFirst({
      where: { id, userId },
      include: splitInclude,
    });

    if (!split) {
      throw new NotFoundException('División de gastos no encontrada');
    }

    return split;
  }

  private toResponse(split: SplitWithRelations): DebtSplitResponse {
    return {
      id: split.id,
      code: split.code,
      currency: split.currency,
      totalAmount: split.totalAmount.toFixed(2),
      userAmount: split.userAmount.toFixed(2),
      payer: split.paidByActorId ? 'ACTOR' : 'USER',
      payerActorId: split.paidByActorId,
      payerDisplayName: split.payer ? displayNameOf(split.payer) : null,
      note: split.note,
      operationDate: toDateOnly(split.operationDate),
      items: split.items.map((item) => ({
        actorId: item.actorId,
        displayName: displayNameOf(item.actor),
        amount: item.amount.toFixed(2),
      })),
      debts: split.debts.map((debt) => ({
        id: debt.id,
        code: debt.code,
        kind: debt.kind,
        totalAmount: debt.totalAmount.toFixed(2),
      })),
      createdAt: split.createdAt.toISOString(),
    };
  }
}
