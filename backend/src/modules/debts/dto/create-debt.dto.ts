import { ApiProperty } from '@nestjs/swagger';
import { DebtKind } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { debtCurrencies, type DebtCurrency } from '../debt-calculations.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDebtDto {
  @ApiProperty({ enum: DebtKind, example: DebtKind.TERCERO })
  @IsEnum(DebtKind, { message: 'El tipo de deuda no es válido' })
  kind!: DebtKind;

  @ApiProperty({ description: 'ID del actor (persona o tarjeta)' })
  @IsUUID('4', { message: 'El actor no es válido' })
  actorId!: string;

  @ApiProperty({ enum: debtCurrencies, example: 'ARS' })
  @IsIn([...debtCurrencies], { message: 'La billetera no es válida' })
  currency!: DebtCurrency;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  @Max(9999999999.99)
  totalAmount!: number;

  @ApiProperty({ example: 3, minimum: 1, maximum: 120 })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad de cuotas debe ser un entero' })
  @Min(1, { message: 'La deuda necesita al menos una cuota' })
  @Max(120, { message: 'La deuda no puede superar las 120 cuotas' })
  installmentCount!: number;

  @ApiProperty({ example: '2026-11-06', description: 'Fecha del préstamo o compra' })
  @IsDateString({}, { message: 'La fecha de la operación no es válida' })
  operationDate!: string;

  @ApiProperty({ example: '2026-12-10', description: 'Primer vencimiento o cobro' })
  @IsDateString({}, { message: 'La fecha del primer vencimiento no es válida' })
  firstDueDate!: string;

  @ApiProperty({
    example: 'Zapatillas tamaño 42',
    description: 'Descripción de la deuda (obligatoria)',
  })
  @Transform(trimmed)
  @IsString({ message: 'La descripción es obligatoria' })
  @MinLength(1, { message: 'La descripción es obligatoria' })
  @MaxLength(500, { message: 'La descripción no puede superar los 500 caracteres' })
  note!: string;
}
