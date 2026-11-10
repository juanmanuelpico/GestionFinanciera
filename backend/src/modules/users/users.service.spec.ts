import { NotFoundException } from '@nestjs/common';
import {
  DashboardSection,
  PaymentMethod,
  ThemeColor,
  ThemeMode,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { UsersService } from './users.service.js';

const userId = '3f4f0f1e-0000-4000-8000-000000000000';

function createService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const service = new UsersService(prisma as unknown as PrismaService);

  return { service, prisma };
}

describe('UsersService preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve las preferencias del usuario en formato de la API', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      themeColor: ThemeColor.AMBER,
      themeMode: ThemeMode.DARK,
      dashboardSections: [
        DashboardSection.SAVINGS,
        DashboardSection.DOLLAR_QUOTES,
      ],
    });

    await expect(service.getPreferences(userId)).resolves.toEqual({
      themeColor: 'amber',
      themeMode: 'dark',
      dashboardSections: ['savings', 'dollarQuotes'],
    });
  });

  it('rechaza la consulta si el usuario no existe', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getPreferences(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('actualiza solo los campos recibidos y devuelve el estado final', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.user.update.mockResolvedValue({
      themeColor: ThemeColor.EMERALD,
      themeMode: ThemeMode.LIGHT,
      enabledCurrencies: ['ARS'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: [PaymentMethod.EFECTIVO],
      dashboardSections: [DashboardSection.SAVINGS],
    });

    await expect(
      service.updatePreferences(userId, {
        themeColor: 'emerald',
        dashboardSections: ['myDebts', 'dollarQuotes'],
      }),
    ).resolves.toEqual({
      themeColor: 'emerald',
      themeMode: 'light',
      enabledCurrencies: ['ARS'],
      headerCurrency: 'ARS',
      enabledPaymentMethods: [PaymentMethod.EFECTIVO],
      dashboardSections: ['savings'],
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        themeColor: ThemeColor.EMERALD,
        dashboardSections: [
          DashboardSection.MY_DEBTS,
          DashboardSection.DOLLAR_QUOTES,
        ],
      },
      select: {
        themeColor: true,
        themeMode: true,
        enabledCurrencies: true,
        headerCurrency: true,
        enabledPaymentMethods: true,
        dashboardSections: true,
      },
    });
  });
});
