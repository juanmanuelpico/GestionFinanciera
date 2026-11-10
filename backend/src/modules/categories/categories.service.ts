import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  MovementType,
  type Category,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { QueryCategoriesDto } from './dto/query-categories.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

export interface CategoryResponse {
  id: number;
  name: string;
  type: MovementType | null;
  thresholdAmount: string | null;
  thresholdCurrency: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ThresholdInput {
  thresholdAmount?: number | null;
  thresholdCurrency?: string | null;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: QueryCategoriesDto,
  ): Promise<CategoryResponse[]> {
    const where: Prisma.CategoryWhereInput = { userId };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.type) {
      where.type = query.type;
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => this.toResponse(category));
  }

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    await this.ensureNameIsAvailable(userId, dto.name);
    const threshold = this.normalizeThreshold(dto);

    try {
      const category = await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type ?? null,
          thresholdAmount: threshold.amount,
          thresholdCurrency: threshold.currency,
        },
      });

      return this.toResponse(category);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }

      throw error;
    }
  }

  async update(
    userId: string,
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    const existing = await this.findOwnedCategory(userId, id);

    if (dto.name !== undefined) {
      await this.ensureNameIsAvailable(userId, dto.name, id);
    }

    if (dto.type === MovementType.INGRESO) {
      const fixedExpenseCount = await this.prisma.fixedExpense.count({
        where: { userId, categoryId: id },
      });

      if (fixedExpenseCount > 0) {
        throw new ConflictException(
          'La categoría tiene gastos fijos asociados y no puede convertirse a Ingreso',
        );
      }
    }

    const threshold =
      dto.thresholdAmount !== undefined || dto.thresholdCurrency !== undefined
        ? this.normalizeThreshold(dto)
        : {
            amount: existing.thresholdAmount,
            currency: existing.thresholdCurrency,
          };

    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          thresholdAmount: threshold.amount,
          thresholdCurrency: threshold.currency,
        },
      });

      return this.toResponse(category);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }

      throw error;
    }
  }

  async remove(userId: string, id: number): Promise<void> {
    await this.findOwnedCategory(userId, id);

    const [movementCount, fixedExpenseCount] = await Promise.all([
      this.prisma.movement.count({ where: { userId, categoryId: id } }),
      this.prisma.fixedExpense.count({ where: { userId, categoryId: id } }),
    ]);

    if (movementCount > 0 || fixedExpenseCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la categoría porque tiene movimientos o gastos fijos asociados',
      );
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar la categoría porque tiene movimientos asociados',
        );
      }

      throw error;
    }
  }

  private normalizeThreshold(input: ThresholdInput): {
    amount: Prisma.Decimal | number | null;
    currency: string | null;
  } {
    const amount = input.thresholdAmount;

    if (amount === undefined || amount === null || amount === 0) {
      return { amount: null, currency: null };
    }

    if (amount < 0) {
      throw new BadRequestException('El umbral máximo no puede ser negativo');
    }

    const currency =
      input.thresholdCurrency === undefined ||
      input.thresholdCurrency === null ||
      input.thresholdCurrency === ''
        ? null
        : input.thresholdCurrency;

    if (!currency) {
      throw new BadRequestException(
        'El umbral máximo requiere una moneda (ARS, USD o EUR)',
      );
    }

    return { amount, currency };
  }

  private async findOwnedCategory(
    userId: string,
    id: number,
  ): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return category;
  }

  private async ensureNameIsAvailable(
    userId: string,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }

  private toResponse(category: Category): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      thresholdAmount:
        category.thresholdAmount === null
          ? null
          : category.thresholdAmount.toFixed(2),
      thresholdCurrency: category.thresholdCurrency,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
