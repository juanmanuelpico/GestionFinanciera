import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, type Category } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { CategoriesService } from './categories.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

const baseCategory: Category = {
  id: 1,
  userId,
  name: 'Alimentos',
  type: MovementType.EGRESO,
  thresholdAmount: null,
  thresholdCurrency: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createService() {
  const prisma = {
    category: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    movement: {
      count: vi.fn(),
    },
    fixedExpense: {
      count: vi.fn(),
    },
  };

  const service = new CategoriesService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('CategoriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista solo las categorías del usuario con búsqueda y tipo', async () => {
    const { service, prisma } = createService();
    prisma.category.findMany.mockResolvedValue([baseCategory]);

    const result = await service.findAll(userId, {
      search: 'ali',
      type: MovementType.EGRESO,
    });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        name: { contains: 'ali', mode: 'insensitive' },
        type: MovementType.EGRESO,
      },
      orderBy: { name: 'asc' },
    });
    expect(result[0].name).toBe('Alimentos');
  });

  it('crea una categoría cuando el nombre está disponible', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue(baseCategory);

    const result = await service.create(userId, {
      name: 'Alimentos',
      type: MovementType.EGRESO,
    });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        userId,
        name: 'Alimentos',
        type: MovementType.EGRESO,
        thresholdAmount: null,
        thresholdCurrency: null,
      },
    });
    expect(result.id).toBe(baseCategory.id);
  });

  it('crea una categoría con umbral máximo y moneda', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue({
      ...baseCategory,
      thresholdAmount: new Prisma.Decimal(50000),
      thresholdCurrency: 'ARS',
    });

    const result = await service.create(userId, {
      name: 'Alimentos',
      thresholdAmount: 50000,
      thresholdCurrency: 'ARS',
    });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        userId,
        name: 'Alimentos',
        type: null,
        thresholdAmount: 50000,
        thresholdCurrency: 'ARS',
      },
    });
    expect(result.thresholdAmount).toBe('50000.00');
    expect(result.thresholdCurrency).toBe('ARS');
  });

  it('requiere moneda cuando se informa un umbral', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.create(userId, { name: 'Alimentos', thresholdAmount: 50000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un umbral negativo', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.create(userId, {
        name: 'Alimentos',
        thresholdAmount: -10,
        thresholdCurrency: 'ARS',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el umbral en cero deja a la categoría sin control', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue(baseCategory);

    await service.create(userId, {
      name: 'Alimentos',
      thresholdAmount: 0,
      thresholdCurrency: 'ARS',
    });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        userId,
        name: 'Alimentos',
        type: null,
        thresholdAmount: null,
        thresholdCurrency: null,
      },
    });
  });

  it('actualiza el umbral y lo puede quitar', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue({
      ...baseCategory,
      thresholdAmount: new Prisma.Decimal(50000),
      thresholdCurrency: 'ARS',
    });
    prisma.category.update.mockResolvedValue(baseCategory);

    await service.update(userId, baseCategory.id, { thresholdAmount: null });

    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: baseCategory.id },
      data: { thresholdAmount: null, thresholdCurrency: null },
    });
  });

  it('rechaza nombres duplicados sin distinguir mayúsculas', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue({ id: baseCategory.id });

    await expect(
      service.create(userId, { name: 'alimentos' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no elimina categorías con movimientos asociados', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(baseCategory);
    prisma.movement.count.mockResolvedValue(2);
    prisma.fixedExpense.count.mockResolvedValue(0);

    await expect(service.remove(userId, baseCategory.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('no elimina categorías con gastos fijos asociados', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(baseCategory);
    prisma.movement.count.mockResolvedValue(0);
    prisma.fixedExpense.count.mockResolvedValue(1);

    await expect(service.remove(userId, baseCategory.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('no convierte a Ingreso una categoría con gastos fijos', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(baseCategory);
    prisma.fixedExpense.count.mockResolvedValue(2);

    await expect(
      service.update(userId, baseCategory.id, { type: MovementType.INGRESO }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('rechaza actualizar una categoría de otro usuario', async () => {
    const { service, prisma } = createService();
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.update(userId, 99, { name: 'Otra' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
