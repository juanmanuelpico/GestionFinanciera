import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DebtActorType,
  Prisma,
  type DebtActor,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { isDebtCurrency } from './debt-calculations.js';
import type { CreateDebtActorDto } from './dto/create-debt-actor.dto.js';
import type { QueryDebtActorsDto } from './dto/query-debt-actors.dto.js';

export interface DebtActorResponse {
  id: string;
  type: DebtActorType;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  alias: string | null;
  issuer: string | null;
  brand: string | null;
  lastFour: string | null;
  closingDay: number | null;
  paymentDueDay: number | null;
  defaultWalletCurrency: string | null;
  debtCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDebtActors {
  items: DebtActorResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type ActorWithDebtCount = DebtActor & { _count: { debts: number } };

export function displayNameOf(actor: DebtActor): string {
  if (actor.type === DebtActorType.PERSONA) {
    return [actor.firstName, actor.lastName].filter(Boolean).join(' ');
  }

  return actor.alias ?? '';
}

@Injectable()
export class DebtActorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: QueryDebtActorsDto,
  ): Promise<PaginatedDebtActors> {
    const where: Prisma.DebtActorWhereInput = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { alias: { contains: query.search, mode: 'insensitive' } },
              { issuer: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, actors] = await this.prisma.$transaction([
      this.prisma.debtActor.count({ where }),
      this.prisma.debtActor.findMany({
        where,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
          { alias: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { debts: true } } },
      }),
    ]);

    return {
      items: actors.map((actor) => this.toResponse(actor)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async create(
    userId: string,
    dto: CreateDebtActorDto,
  ): Promise<DebtActorResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { enabledCurrencies: true },
    });

    const data = this.normalize(userId, dto, user.enabledCurrencies);
    const actor = await this.prisma.debtActor.create({
      data,
      include: { _count: { select: { debts: true } } },
    });

    return this.toResponse(actor);
  }

  async update(
    userId: string,
    id: string,
    dto: CreateDebtActorDto,
  ): Promise<DebtActorResponse> {
    const existing = await this.findOwnedActor(userId, id);

    if (existing.type !== dto.type) {
      const debtCount = await this.prisma.debt.count({
        where: { actorId: id },
      });

      if (debtCount > 0) {
        throw new BadRequestException(
          'No podés cambiar el tipo de un actor con deudas asociadas',
        );
      }
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { enabledCurrencies: true },
    });

    const data = this.normalize(userId, dto, user.enabledCurrencies);
    const actor = await this.prisma.debtActor.update({
      where: { id },
      data,
      include: { _count: { select: { debts: true } } },
    });

    return this.toResponse(actor);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedActor(userId, id);

    const debtCount = await this.prisma.debt.count({ where: { actorId: id } });

    if (debtCount > 0) {
      throw new ConflictException(
        'El actor tiene deudas asociadas y no podés eliminarlo',
      );
    }

    try {
      await this.prisma.debtActor.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'El actor tiene deudas asociadas y no podés eliminarlo',
        );
      }

      throw error;
    }
  }

  private normalize(
    userId: string,
    dto: CreateDebtActorDto,
    enabledCurrencies: string[],
  ): Prisma.DebtActorUncheckedCreateInput {
    if (dto.type === DebtActorType.PERSONA) {
      const firstName = dto.firstName?.trim() || '';
      const lastName = dto.lastName?.trim() || '';

      if (!firstName) {
        throw new BadRequestException('El nombre es obligatorio');
      }
      if (!lastName) {
        throw new BadRequestException('El apellido es obligatorio');
      }

      return {
        userId,
        type: DebtActorType.PERSONA,
        firstName,
        lastName,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        alias: null,
        issuer: null,
        brand: null,
        lastFour: null,
        closingDay: null,
        paymentDueDay: null,
        defaultWalletCurrency: null,
      };
    }

    const alias = dto.alias?.trim() || '';
    const issuer = dto.issuer?.trim() || '';
    const brand = dto.brand?.trim() || '';

    if (!alias) {
      throw new BadRequestException('El alias es obligatorio');
    }
    if (!issuer) {
      throw new BadRequestException('El banco o emisor es obligatorio');
    }
    if (!brand) {
      throw new BadRequestException('La marca es obligatoria');
    }
    if (!dto.closingDay || !dto.paymentDueDay) {
      throw new BadRequestException(
        'Indicá los días de cierre y de vencimiento de la tarjeta',
      );
    }

    if (
      !dto.defaultWalletCurrency ||
      !isDebtCurrency(dto.defaultWalletCurrency)
    ) {
      throw new BadRequestException(
        'Elegí una billetera válida para la tarjeta',
      );
    }

    if (!enabledCurrencies.includes(dto.defaultWalletCurrency)) {
      throw new BadRequestException(
        `La billetera ${dto.defaultWalletCurrency} no está habilitada`,
      );
    }

    return {
      userId,
      type: DebtActorType.TARJETA,
      firstName: null,
      lastName: null,
      phone: null,
      email: null,
      alias,
      issuer,
      brand,
      lastFour: dto.lastFour?.trim() || null,
      closingDay: dto.closingDay,
      paymentDueDay: dto.paymentDueDay,
      defaultWalletCurrency: dto.defaultWalletCurrency,
    };
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

  private toResponse(actor: ActorWithDebtCount): DebtActorResponse {
    return {
      id: actor.id,
      type: actor.type,
      displayName: displayNameOf(actor),
      firstName: actor.firstName,
      lastName: actor.lastName,
      phone: actor.phone,
      email: actor.email,
      alias: actor.alias,
      issuer: actor.issuer,
      brand: actor.brand,
      lastFour: actor.lastFour,
      closingDay: actor.closingDay,
      paymentDueDay: actor.paymentDueDay,
      defaultWalletCurrency: actor.defaultWalletCurrency,
      debtCount: actor._count.debts,
      createdAt: actor.createdAt.toISOString(),
      updatedAt: actor.updatedAt.toISOString(),
    };
  }
}
