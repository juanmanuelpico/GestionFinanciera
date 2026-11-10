import { ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  Matches,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const reportCurrencies = ['ARS', 'USD', 'EUR'] as const;
export type ReportCurrency = (typeof reportCurrencies)[number];

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const periodMessage = 'El período debe tener el formato YYYY-MM';

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2026-01', description: PERIOD_PATTERN.source })
  @IsOptional()
  @Matches(PERIOD_PATTERN, { message: periodMessage })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11' })
  @IsOptional()
  @Matches(PERIOD_PATTERN, { message: periodMessage })
  to?: string;

  @ApiPropertyOptional({ enum: reportCurrencies, description: 'Billetera analizada (default: la del encabezado)' })
  @IsOptional()
  @IsIn([...reportCurrencies], { message: 'La moneda no es válida' })
  currency?: ReportCurrency;
}

export class TopCategoriesDto extends ReportQueryDto {
  @ApiPropertyOptional({ enum: MovementType, description: 'Sin filtro si se omite' })
  @IsOptional()
  @IsEnum(MovementType, { message: 'El tipo no es válido' })
  type?: MovementType;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El top N debe ser un entero' })
  @Min(1, { message: 'El top N debe ser al menos 1' })
  @Max(50, { message: 'El top N no puede superar 50' })
  limit: number = 10;
}
