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
  DebtStatus,
  MovementType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { computeSpendingAlert } from '../spending-control/spending-alert.js';
import type { SpendingAlert } from '../spending-control/spending-limit.js';
import { parseDateOnly, toDateOnly } from './debt-calculations.js';
import {
  createDebtMovement,
  ensureDebtCategory,
  rethrowAsConflict,
  walletAvailable,
} from './debt-movements.js';
import { middayUtc, DebtsService, type DebtDetailResponse } from './debts.service.js';
import type { PayDebtDto } from './dto/pay-debt.dto.js';

export interface DebtSettlementItemResponse {
  id: string;
  installmentId: string;
  installmentNumber: number;
  amount: string;
}

export interface DebtSettlementResponse {
  id: string;
  debtId: string;
  walletCurrency: string;
  paymentDate: string;
  totalAmount: string;
  installmentCount: number;
  status: DebtSettlementStatus;
  reversedAt: string | null;
  createdAt: string;
  items: DebtSettlementItemResponse[];
}

const settlementInclude = {
  items: { orderBy: { installmentNumber: 'asc' } },
} satisfies Prisma.DebtSettlementInclude;

type SettlementRow = Prisma.DebtSettlementGetPayload<{
  include: typeof settlementInclude;
}>;

interface SelectedInstallment {
  id: string;
  number: number;
  amount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
}

@Injectable()
export class DebtSettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly debtsService: DebtsService,
  ) {}

  async listForDebt(
    userId: string,
    debtId: string,
  ): Promise<DebtSettlementResponse[]> {
    await this.debtsService.loadDebt(userId, debtId);

    const settlements = await this.prisma.debtSettlement.findMany({
      where: { debtId },
      include: settlementInclude,
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((settlement) => this.toResponse(settlement));
  }

  async pay(
    userId: string,
    debtId: string,
    dto: PayDebtDto,
  ): Promise<DebtDetailResponse & { spendingAlert: SpendingAlert | null }> {
    const debt = await this.debtsService.loadDebt(userId, debtId);

    if (debt.status !== DebtStatus.ACTIVA) {
      throw new BadRequestException('La deuda ya está finalizada');
    }

    const pending = debt.installments.filter((item) => !item.paidAt);

    if (pending.length === 0) {
      throw new BadRequestException('No hay cuotas pendientes');
    }

    if (dto.quantity > pending.length) {
      throw new BadRequestException(
        `No podés liquidar más cuotas que las pendientes (${pending.length})`,
      );
    }

    const selected = pending.slice(0, dto.quantity);
    const isCard = debt.actor.type === DebtActorType.TARJETA;
    const zero = new Prisma.Decimal(0);
    const outstanding = debt.installments.reduce(
      (acc, installment) => acc.sub(installment.paidAmount),
      debt.totalAmount,
    );
    const amounts = this.resolveSelectedAmounts(
      selected,
      dto.amounts,
      isCard,
    );
    const total = amounts.reduce((acc, amount) => acc.add(amount), zero);

    if (!isCard && total.gt(outstanding)) {
      throw new BadRequestException(
        'El total ingresado supera el saldo restante de la deuda',
      );
    }

    const isOutgoing = debt.kind === DebtKind.PROPIA;
    const paymentDate = parseDateOnly(dto.paymentDate);
    const actorName =
      debt.actor.type === DebtActorType.PERSONA
        ? [debt.actor.firstName, debt.actor.lastName].filter(Boolean).join(' ')
        : (debt.actor.alias ?? '');

    let debtCategoryId: number | undefined;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (isOutgoing) {
            const available = await walletAvailable(tx, userId, debt.currency);

            if (available.lt(total)) {
              throw new BadRequestException(
                `Saldo insuficiente en la billetera ${debt.currency}: ` +
                  `disponible ${available.toFixed(2)}, se necesita ${total.toFixed(2)}`,
              );
            }
          }

          const categoryId = await ensureDebtCategory(tx, userId);
          debtCategoryId = categoryId;

          const settlement = await tx.debtSettlement.create({
            data: {
              debtId: debt.id,
              walletCurrency: debt.currency,
              paymentDate,
              totalAmount: total.toFixed(2),
              installmentCount: selected.length,
            },
          });

          for (const [index, installment] of selected.entries()) {
            const amount = amounts[index];
            const paidAmount = installment.paidAmount.add(amount);
            const completesInstallment = paidAmount.gte(installment.amount);
            const type = isOutgoing
              ? MovementType.EGRESO
              : MovementType.INGRESO;
            const action = isOutgoing ? 'Pago' : 'Cobro';
            const note = `${debt.code} — ${actorName} · ${action} Cuota ${installment.number}/${debt.installmentCount}`;

            const movement = await createDebtMovement(tx, userId, {
              type,
              amount,
              currency: debt.currency,
              categoryId,
              movementDate: middayUtc(paymentDate),
              note,
              debtId: debt.id,
              role: DebtMovementRole.CUOTA,
              paymentMethod: isCard
                ? PaymentMethod.CREDITO
                : null,
            });

            await tx.debtSettlementItem.create({
              data: {
                settlementId: settlement.id,
                installmentId: installment.id,
                installmentNumber: installment.number,
                amount: amount.toFixed(2),
                originalMovementUserId: userId,
                originalMovementId: movement.id,
              },
            });

            await tx.debtInstallment.update({
              where: { id: installment.id },
              data: {
                paidAmount: paidAmount.toFixed(2),
                ...(completesInstallment
                  ? {
                      paidAt: new Date(),
                      currentSettlementId: settlement.id,
                    }
                  : {}),
              },
            });
          }

          if (outstanding.sub(total).lte(zero)) {
            await tx.debt.update({
              where: { id: debt.id },
              data: { status: DebtStatus.FINALIZADA },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }

    const spendingAlert =
      isOutgoing && debtCategoryId !== undefined
        ? await computeSpendingAlert(this.prisma, {
            userId,
            categoryId: debtCategoryId,
            currency: debt.currency,
            movementDate: middayUtc(paymentDate),
          })
        : null;

    const detail = await this.debtsService.findDetail(userId, debtId);
    return { ...detail, spendingAlert };
  }

  private resolveSelectedAmounts(
    selected: SelectedInstallment[],
    amounts: number[] | undefined,
    isCard: boolean,
  ): Prisma.Decimal[] {
    if (isCard) {
      if (amounts) {
        throw new BadRequestException(
          'Los importes personalizados por cuota solo aplican a deudas con personas',
        );
      }

      return selected.map((installment) => installment.amount);
    }

    if (!amounts || amounts.length !== selected.length) {
      throw new BadRequestException(
        'Cada cuota seleccionada debe tener su propio importe',
      );
    }

    return amounts.map((amount) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Cada importe debe ser mayor a 0');
      }

      const decimal = new Prisma.Decimal(String(amount));

      if (decimal.dp() > 2) {
        throw new BadRequestException(
          'Cada importe debe tener como máximo 2 decimales',
        );
      }

      if (decimal.lte(0)) {
        throw new BadRequestException('Cada importe debe ser mayor a 0');
      }

      return decimal;
    });
  }

  async reverse(
    userId: string,
    debtId: string,
    settlementId: string,
  ): Promise<DebtDetailResponse> {
    const debt = await this.debtsService.loadDebt(userId, debtId);

    const settlement = await this.prisma.debtSettlement.findFirst({
      where: { id: settlementId, debtId: debt.id },
      include: settlementInclude,
    });

    if (!settlement) {
      throw new NotFoundException('La operación no fue encontrada');
    }

    if (settlement.status !== DebtSettlementStatus.ACTIVA) {
      throw new BadRequestException('Esta operación ya fue deshecha');
    }

    const isReversalOutgoing = debt.kind === DebtKind.TERCERO;

    const installmentsById = new Map(
      debt.installments.map((installment) => [installment.id, installment]),
    );
    const actorName =
      debt.actor.type === DebtActorType.PERSONA
        ? [debt.actor.firstName, debt.actor.lastName].filter(Boolean).join(' ')
        : (debt.actor.alias ?? '');
    const zero = new Prisma.Decimal(0);

    try {
      await this.prisma.$transaction(
        async (tx) => {
          if (isReversalOutgoing) {
            const available = await walletAvailable(
              tx,
              userId,
              settlement.walletCurrency,
            );

            if (available.lt(settlement.totalAmount)) {
              throw new BadRequestException(
                `Saldo insuficiente en la billetera ${settlement.walletCurrency}: ` +
                  `disponible ${available.toFixed(2)}, se necesita ${settlement.totalAmount.toFixed(2)} para deshacer este cobro`,
              );
            }
          }

          const categoryId = await ensureDebtCategory(tx, userId);
          const reversalDate = middayUtc(new Date());
          const action = isReversalOutgoing ? 'cobro' : 'pago';

          for (const item of settlement.items) {
            const installment = installmentsById.get(item.installmentId);

            if (!installment) {
              throw new BadRequestException(
                'La cuota de esta operación ya no existe',
              );
            }

            const paidAmount = installment.paidAmount.sub(item.amount);

            if (paidAmount.lt(zero)) {
              throw new BadRequestException(
                'El historial de pagos de la cuota es inconsistente',
              );
            }

            const stillCompleted = paidAmount.gte(installment.amount);
            const type = isReversalOutgoing
              ? MovementType.EGRESO
              : MovementType.INGRESO;
            const note = `${debt.code} — ${actorName} · Reversa de ${action} Cuota ${item.installmentNumber}/${debt.installmentCount}`;

            const movement = await createDebtMovement(tx, userId, {
              type,
              amount: item.amount,
              currency: settlement.walletCurrency,
              categoryId,
              movementDate: reversalDate,
              note,
              debtId: debt.id,
              role: DebtMovementRole.REVERSA,
              paymentMethod:
                debt.actor.type === DebtActorType.TARJETA
                  ? PaymentMethod.CREDITO
                  : null,
            });

            await tx.debtSettlementItem.update({
              where: { id: item.id },
              data: {
                reversalMovementUserId: userId,
                reversalMovementId: movement.id,
              },
            });

            await tx.debtInstallment.update({
              where: { id: installment.id },
              data: {
                paidAmount: paidAmount.toFixed(2),
                ...(stillCompleted
                  ? {}
                  : {
                      paidAt: null,
                      currentSettlementId: null,
                    }),
              },
            });
          }

          await tx.debtSettlement.update({
            where: { id: settlement.id },
            data: {
              status: DebtSettlementStatus.REVERTIDA,
              reversedAt: new Date(),
            },
          });

          await tx.debt.update({
            where: { id: debt.id },
            data: { status: DebtStatus.ACTIVA },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      rethrowAsConflict(error);
    }

    return this.debtsService.findDetail(userId, debtId);
  }

  private toResponse(settlement: SettlementRow): DebtSettlementResponse {
    return {
      id: settlement.id,
      debtId: settlement.debtId,
      walletCurrency: settlement.walletCurrency,
      paymentDate: toDateOnly(settlement.paymentDate),
      totalAmount: settlement.totalAmount.toFixed(2),
      installmentCount: settlement.installmentCount,
      status: settlement.status,
      reversedAt: settlement.reversedAt
        ? settlement.reversedAt.toISOString()
        : null,
      createdAt: settlement.createdAt.toISOString(),
      items: settlement.items.map((item) => ({
        id: item.id,
        installmentId: item.installmentId,
        installmentNumber: item.installmentNumber,
        amount: item.amount.toFixed(2),
      })),
    };
  }
}
