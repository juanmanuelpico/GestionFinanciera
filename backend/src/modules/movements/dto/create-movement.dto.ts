import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, PaymentMethod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const movementCurrencies = ['ARS', 'USD', 'EUR'] as const;
export type MovementCurrency = (typeof movementCurrencies)[number];

export class CreateMovementDto {
  @ApiProperty({ enum: MovementType, example: MovementType.EGRESO })
  @IsEnum(MovementType)
  type!: MovementType;

  @ApiProperty({ example: 1500.5 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  @Max(9999999999.99)
  amount!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({ example: '2026-11-02T14:30:00.000Z' })
  @IsDateString({}, { message: 'La fecha del movimiento no es válida' })
  movementDate!: string;

  @ApiProperty({ enum: movementCurrencies, example: 'ARS' })
  @IsIn([...movementCurrencies], { message: 'La moneda no es válida' })
  currency!: MovementCurrency;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CREDITO,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'El medio de pago no es válido' })
  paymentMethod?: PaymentMethod | null;

  @ApiPropertyOptional({ example: 'Compra semanal', nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
