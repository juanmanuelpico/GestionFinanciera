import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export const thresholdCurrencies = ['ARS', 'USD', 'EUR'] as const;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentos' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  name!: string;

  @ApiPropertyOptional({ enum: MovementType, nullable: true })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType | null;

  @ApiPropertyOptional({ example: 50000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El umbral debe tener como máximo 2 decimales' },
  )
  @Max(9999999999.99)
  thresholdAmount?: number | null;

  @ApiPropertyOptional({ enum: thresholdCurrencies, nullable: true })
  @IsOptional()
  @IsIn([...thresholdCurrencies], { message: 'La moneda del umbral no es válida' })
  thresholdCurrency?: string | null;
}
