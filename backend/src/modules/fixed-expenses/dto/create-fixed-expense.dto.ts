import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { fixedExpenseCurrencies } from '../fixed-expense-calculations.js';

export class CreateFixedExpenseDto {
  @ApiProperty({ example: 'Alquiler' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El título es obligatorio' })
  @MinLength(1, { message: 'El título es obligatorio' })
  @MaxLength(120, { message: 'El título no puede superar los 120 caracteres' })
  title!: string;

  @ApiProperty({ example: 1500.5 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  @Max(9999999999.99)
  amount!: number;

  @ApiProperty({ enum: fixedExpenseCurrencies, example: 'ARS' })
  @IsIn([...fixedExpenseCurrencies], { message: 'La moneda no es válida' })
  currency!: (typeof fixedExpenseCurrencies)[number];

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({
    example: '2026-11-10',
    description: 'Próximo vencimiento: define el día habitual y el mes inicial',
  })
  @IsDateString({}, { message: 'La fecha del primer vencimiento no es válida' })
  firstDueDate!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 120 })
  @Type(() => Number)
  @IsInt({ message: 'La frecuencia debe ser una cantidad entera de meses' })
  @Min(1, { message: 'La frecuencia mínima es cada 1 mes' })
  @Max(120, { message: 'La frecuencia máxima es cada 120 meses' })
  intervalMonths!: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  active?: boolean;
}
