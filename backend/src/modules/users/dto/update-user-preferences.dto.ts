import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, IsOptional } from 'class-validator';
import {
  dashboardSectionIds,
  type DashboardSectionId,
} from '../../../common/dashboard-sections.js';

export const themeColorIds = ['blue', 'amber', 'emerald'] as const;
export type ThemeColorId = (typeof themeColorIds)[number];

export const themeModeIds = ['light', 'dark'] as const;
export type ThemeModeId = (typeof themeModeIds)[number];

export const walletCurrencyIds = ['ARS', 'USD', 'EUR'] as const;
export type WalletCurrencyId = (typeof walletCurrencyIds)[number];

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ enum: walletCurrencyIds, isArray: true, example: ['ARS'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Habilitá al menos una moneda' })
  @ArrayMaxSize(3)
  @IsIn([...walletCurrencyIds], { each: true })
  enabledCurrencies?: WalletCurrencyId[];

  @ApiPropertyOptional({ enum: walletCurrencyIds, example: 'ARS' })
  @IsOptional()
  @IsIn([...walletCurrencyIds])
  headerCurrency?: WalletCurrencyId;

  @ApiPropertyOptional({ enum: themeColorIds, example: 'blue' })
  @IsOptional()
  @IsIn([...themeColorIds])
  themeColor?: ThemeColorId;

  @ApiPropertyOptional({ enum: themeModeIds, example: 'light' })
  @IsOptional()
  @IsIn([...themeModeIds])
  themeMode?: ThemeModeId;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    isArray: true,
    example: [PaymentMethod.EFECTIVO, PaymentMethod.TRANSFERENCIA],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Habilitá al menos un medio de pago' })
  @ArrayMaxSize(6)
  @IsEnum(PaymentMethod, { each: true, message: 'El medio de pago no es válido' })
  enabledPaymentMethods?: PaymentMethod[];

  @ApiPropertyOptional({
    enum: dashboardSectionIds,
    isArray: true,
    example: [...dashboardSectionIds],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(dashboardSectionIds.length)
  @IsIn([...dashboardSectionIds], { each: true })
  dashboardSections?: DashboardSectionId[];
}
