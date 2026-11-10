import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  ThemeColor,
  ThemeMode,
  type DashboardSection,
  type User,
} from '@prisma/client';
import {
  toDashboardSectionIds,
  toDashboardSections,
  type DashboardSectionId,
} from '../../common/dashboard-sections.js';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  ThemeColorId,
  ThemeModeId,
  UpdateUserPreferencesDto,
  WalletCurrencyId,
} from './dto/update-user-preferences.dto.js';

export interface UserPreferences {
  themeColor: ThemeColorId;
  themeMode: ThemeModeId;
  enabledCurrencies: WalletCurrencyId[];
  headerCurrency: WalletCurrencyId;
  enabledPaymentMethods: PaymentMethod[];
  dashboardSections: DashboardSectionId[];
}

const THEME_COLOR_TO_API: Record<ThemeColor, ThemeColorId> = {
  [ThemeColor.BLUE]: 'blue',
  [ThemeColor.AMBER]: 'amber',
  [ThemeColor.EMERALD]: 'emerald',
};

const API_TO_THEME_COLOR: Record<ThemeColorId, ThemeColor> = {
  blue: ThemeColor.BLUE,
  amber: ThemeColor.AMBER,
  emerald: ThemeColor.EMERALD,
};

const PREFERENCES_SELECT = {
  themeColor: true,
  themeMode: true,
  enabledCurrencies: true,
  headerCurrency: true,
  enabledPaymentMethods: true,
  dashboardSections: true,
} as const;

const THEME_MODE_TO_API: Record<ThemeMode, ThemeModeId> = {
  [ThemeMode.LIGHT]: 'light',
  [ThemeMode.DARK]: 'dark',
};

const API_TO_THEME_MODE: Record<ThemeModeId, ThemeMode> = {
  light: ThemeMode.LIGHT,
  dark: ThemeMode.DARK,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PREFERENCES_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.toPreferences(user);
  }

  async updatePreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferences> {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.enabledCurrencies || dto.headerCurrency) {
      const current = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { enabledCurrencies: true, headerCurrency: true },
      });
      const enabled = dto.enabledCurrencies ?? current.enabledCurrencies;
      const header = dto.headerCurrency ?? current.headerCurrency;
      if (!enabled.includes(header)) {
        throw new BadRequestException(
          'La billetera del header debe estar entre las monedas habilitadas',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.themeColor
          ? { themeColor: API_TO_THEME_COLOR[dto.themeColor] }
          : {}),
        ...(dto.themeMode
          ? { themeMode: API_TO_THEME_MODE[dto.themeMode] }
          : {}),
        ...(dto.enabledCurrencies
          ? { enabledCurrencies: dto.enabledCurrencies }
          : {}),
        ...(dto.headerCurrency ? { headerCurrency: dto.headerCurrency } : {}),
        ...(dto.enabledPaymentMethods
          ? { enabledPaymentMethods: dto.enabledPaymentMethods }
          : {}),
        ...(dto.dashboardSections
          ? { dashboardSections: toDashboardSections(dto.dashboardSections) }
          : {}),
      },
      select: PREFERENCES_SELECT,
    });

    return this.toPreferences(user);
  }

  private toPreferences(user: {
    themeColor: ThemeColor;
    themeMode: ThemeMode;
    enabledCurrencies: string[];
    headerCurrency: string;
    enabledPaymentMethods: PaymentMethod[];
    dashboardSections: DashboardSection[];
  }): UserPreferences {
    return {
      themeColor: THEME_COLOR_TO_API[user.themeColor],
      themeMode: THEME_MODE_TO_API[user.themeMode],
      enabledCurrencies: user.enabledCurrencies as WalletCurrencyId[],
      headerCurrency: user.headerCurrency as WalletCurrencyId,
      enabledPaymentMethods: user.enabledPaymentMethods,
      dashboardSections: toDashboardSectionIds(user.dashboardSections),
    };
  }
}
