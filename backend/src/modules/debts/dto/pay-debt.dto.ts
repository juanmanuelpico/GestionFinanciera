import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class PayDebtDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad de cuotas debe ser un entero' })
  @Min(1, { message: 'Hay que liquidar al menos una cuota' })
  quantity!: number;

  @ApiProperty({ example: '2026-11-06T00:00:00.000Z', description: 'Fecha real del cobro o pago' })
  @IsDateString({}, { message: 'La fecha del cobro o pago no es válida' })
  paymentDate!: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [33.33, 33.33],
    description:
      'Importes reales por cuota. Obligatorios para deudas con personas; omitibles en tarjetas.',
  })
  @IsOptional()
  @IsArray({ message: 'Los importes por cuota deben ser un arreglo' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(Number) : value,
  )
  @IsNumber({}, { each: true, message: 'Cada importe debe ser un número' })
  @Min(0.01, { each: true, message: 'Cada importe debe ser mayor a 0' })
  amounts?: number[];
}
