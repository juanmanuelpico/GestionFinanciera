import { ConflictException } from '@nestjs/common';
import {
  DebtKind,
  DebtMovementRole,
  MovementType,
  PaymentMethod,
  Prisma,
  type Movement,
} from '@prisma/client';

export const DEBT_CATEGORY_NAME = 'Deudas';
export const SPLIT_EXPENSE_CATEGORY_NAME = 'Gasto fijo';

type TransactionClient = Prisma.TransactionClient;

export async function ensureDebtCategory(
  tx: TransactionClient,
  userId: string,
): Promise<number> {
  const category = await tx.category.upsert({
    where: { userId_name: { userId, name: DEBT_CATEGORY_NAME } },
    update: {},
    create: { userId, name: DEBT_CATEGORY_NAME, type: null },
    select: { id: true },
  });

  return category.id;
}

/** Categoría para la parte propia de una división de gastos. */
export async function ensureSplitExpenseCategory(
  tx: TransactionClient,
  userId: string,
): Promise<number> {
  const category = await tx.category.upsert({
    where: { userId_name: { userId, name: SPLIT_EXPENSE_CATEGORY_NAME } },
    update: {},
    create: { userId, name: SPLIT_EXPENSE_CATEGORY_NAME, type: null },
    select: { id: true },
  });

  return category.id;
}

/** Disponible de la billetera dentro de la transacción (ingresos - egresos). */
export async function walletAvailable(
  tx: TransactionClient,
  userId: string,
  currency: string,
): Promise<Prisma.Decimal> {
  const grouped = await tx.movement.groupBy({
    by: ['type'],
    where: { userId, currency },
    _sum: { amount: true },
  });

  let available = new Prisma.Decimal(0);

  for (const row of grouped) {
    const sum = row._sum.amount ?? new Prisma.Decimal(0);
    available =
      row.type === MovementType.INGRESO
        ? available.add(sum)
        : available.sub(sum);
  }

  return available;
}

/** Crea un movimiento del módulo de deudas con su identificador secuencial. */
export async function createDebtMovement(
  tx: TransactionClient,
  userId: string,
  input: {
    type: MovementType;
    amount: Prisma.Decimal;
    currency: string;
    categoryId: number;
    movementDate: Date;
    note: string;
    debtId: string;
    role: DebtMovementRole;
    paymentMethod?: PaymentMethod | null;
  },
): Promise<Movement> {
  const user = await tx.user.update({
    where: { id: userId },
    data: { movementSequence: { increment: 1 } },
    select: { movementSequence: true },
  });

  return tx.movement.create({
    data: {
      id: user.movementSequence,
      userId,
      type: input.type,
      amount: input.amount.toDecimalPlaces(2).toFixed(2),
      categoryId: input.categoryId,
      movementDate: input.movementDate,
      currency: input.currency,
      paymentMethod: input.paymentMethod ?? null,
      note: input.note,
      debtId: input.debtId,
      debtMovementRole: input.role,
    },
  });
}

/** Crea el egreso de la parte propia de una división de gastos (sin deuda asociada). */
export async function createSplitShareMovement(
  tx: TransactionClient,
  userId: string,
  input: {
    amount: Prisma.Decimal;
    currency: string;
    categoryId: number;
    movementDate: Date;
    note: string;
    paymentMethod?: PaymentMethod | null;
  },
): Promise<Movement> {
  const user = await tx.user.update({
    where: { id: userId },
    data: { movementSequence: { increment: 1 } },
    select: { movementSequence: true },
  });

  return tx.movement.create({
    data: {
      id: user.movementSequence,
      userId,
      type: MovementType.EGRESO,
      amount: input.amount.toDecimalPlaces(2).toFixed(2),
      categoryId: input.categoryId,
      movementDate: input.movementDate,
      currency: input.currency,
      paymentMethod: input.paymentMethod ?? null,
      note: input.note,
    },
  });
}

/** Siguiente código de deuda del usuario: DP para propias, DT para de terceros. */
export async function nextDebtCode(
  tx: TransactionClient,
  userId: string,
  kind: DebtKind,
): Promise<string> {
  if (kind === DebtKind.PROPIA) {
    const user = await tx.user.update({
      where: { id: userId },
      data: { debtProperSequence: { increment: 1 } },
      select: { debtProperSequence: true },
    });

    return `DP${user.debtProperSequence}`;
  }

  const user = await tx.user.update({
    where: { id: userId },
    data: { debtThirdSequence: { increment: 1 } },
    select: { debtThirdSequence: true },
  });

  return `DT${user.debtThirdSequence}`;
}

/** Siguiente código de división de gastos del usuario (DG). */
export async function nextSplitCode(
  tx: TransactionClient,
  userId: string,
): Promise<string> {
  const user = await tx.user.update({
    where: { id: userId },
    data: { splitSequence: { increment: 1 } },
    select: { splitSequence: true },
  });

  return `DG${user.splitSequence}`;
}

/** Traduce los errores de serialización a un conflicto accionable. */
export function rethrowAsConflict(error: unknown): never {
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
