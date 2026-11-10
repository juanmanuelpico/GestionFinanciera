import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  MovementType,
  type Category,
  type Movement,
  type PaymentMethod,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { computeSpendingAlert } from '../spending-control/spending-alert.js';
import type { SpendingAlert } from '../spending-control/spending-limit.js';
import type { CreateMovementDto } from './dto/create-movement.dto.js';
import type { QueryMovementsDto } from './dto/query-movements.dto.js';
import type { UpdateMovementDto } from './dto/update-movement.dto.js';

type MovementForResponse = Movement & {
  category: Pick<Category, 'id' | 'name' | 'type'>;
};

type MovementWithCategory = MovementForResponse & {
  fixedExpensePayment: { id: string } | null;
};

export interface MovementResponse {
  id: number;
  type: MovementType;
  amount: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
    type: MovementType | null;
  };
  movementDate: string;
  currency: string;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  spendingAlert: SpendingAlert | null;
}

export interface PaginatedMovements {
  items: MovementResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const categorySelect = {
  id: true,
  name: true,
  type: true,
} satisfies Prisma.CategorySelect;

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: QueryMovementsDto,
  ): Promise<PaginatedMovements> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('El rango de fechas no es válido');
    }

    const where: Prisma.MovementWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(from || to
        ? {
            movementDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [total, movements] = await this.prisma.$transaction([
      this.prisma.movement.count({ where }),
      this.prisma.movement.findMany({
        where,
        orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: { select: categorySelect } },
      }),
    ]);

    return {
      items: movements.map((movement) => this.toResponse(movement)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(userId: string, id: number): Promise<MovementResponse> {
    const movement = await this.findOwnedMovement(userId, id);
    return this.toResponse(movement);
  }

  async create(
    userId: string,
    dto: CreateMovementDto,
  ): Promise<MovementResponse> {
    await this.assertCategory(userId, dto.categoryId, dto.type);

    const movement = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { movementSequence: { increment: 1 } },
        select: { movementSequence: true },
      });

      return tx.movement.create({
        data: {
          id: user.movementSequence,
          userId,
          type: dto.type,
          amount: dto.amount.toFixed(2),
          categoryId: dto.categoryId,
          movementDate: new Date(dto.movementDate),
          currency: dto.currency,
          paymentMethod: dto.paymentMethod ?? null,
          note: dto.note?.trim() || null,
        },
        include: { category: { select: categorySelect } },
      });
    });

    const spendingAlert =
      dto.type === MovementType.EGRESO
        ? await computeSpendingAlert(this.prisma, {
            userId,
            categoryId: dto.categoryId,
            currency: dto.currency,
            movementDate: new Date(dto.movementDate),
          })
        : null;

    return this.toResponse(movement, spendingAlert);
  }

  async update(
    userId: string,
    id: number,
    dto: UpdateMovementDto,
  ): Promise<MovementResponse> {
    const existing = await this.findOwnedMovement(userId, id);
    this.assertNotDebtMovement(existing);
    const type = dto.type ?? existing.type;
    const categoryId = dto.categoryId ?? existing.categoryId;

    await this.assertCategory(userId, categoryId, type);

    const data: Prisma.MovementUncheckedUpdateInput = {};

    if (dto.type !== undefined) data.type = dto.type;
    if (dto.amount !== undefined) data.amount = dto.amount.toFixed(2);
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.movementDate !== undefined) {
      data.movementDate = new Date(dto.movementDate);
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.paymentMethod !== undefined) {
      data.paymentMethod = dto.paymentMethod ?? null;
    }
    if (dto.note !== undefined) data.note = dto.note?.trim() || null;

    const movement = await this.prisma.movement.update({
      where: { userId_id: { userId, id } },
      data,
      include: { category: { select: categorySelect } },
    });

    return this.toResponse(movement);
  }

  async remove(userId: string, id: number): Promise<void> {
    const existing = await this.findOwnedMovement(userId, id);
    this.assertNotDebtMovement(existing);
    await this.prisma.movement.delete({
      where: { userId_id: { userId, id } },
    });
  }

  private assertNotDebtMovement(movement: MovementWithCategory): void {
    if (movement.debtId) {
      throw new BadRequestException(
        'Este movimiento pertenece al módulo de Deudas y debe gestionarse desde allí',
      );
    }

    if (movement.fixedExpensePayment) {
      throw new BadRequestException(
        'Este movimiento pertenece al módulo de Gastos fijos y debe gestionarse desde allí',
      );
    }
  }

  private async findOwnedMovement(
    userId: string,
    id: number,
  ): Promise<MovementWithCategory> {
    const movement = await this.prisma.movement.findUnique({
      where: { userId_id: { userId, id } },
      include: {
        category: { select: categorySelect },
        fixedExpensePayment: { select: { id: true } },
      },
    });

    if (!movement) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    return movement;
  }

  private async assertCategory(
    userId: string,
    categoryId: number,
    type: MovementType,
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true, type: true },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category.type && category.type !== type) {
      throw new BadRequestException(
        'La categoría no corresponde al tipo de movimiento',
      );
    }
  }

  private toResponse(
    movement: MovementForResponse,
    spendingAlert: SpendingAlert | null = null,
  ): MovementResponse {
    return {
      id: movement.id,
      type: movement.type,
      amount: movement.amount.toString(),
      categoryId: movement.categoryId,
      category: {
        id: movement.category.id,
        name: movement.category.name,
        type: movement.category.type,
      },
      movementDate: movement.movementDate.toISOString(),
      currency: movement.currency,
      paymentMethod: movement.paymentMethod,
      note: movement.note,
      createdAt: movement.createdAt.toISOString(),
      updatedAt: movement.updatedAt.toISOString(),
      spendingAlert,
    };
  }
}
