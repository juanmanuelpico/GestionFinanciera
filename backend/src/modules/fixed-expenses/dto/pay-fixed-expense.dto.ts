import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';

export class PayFixedExpenseDto {
  @ApiProperty({
    example: '2026-11',
    description: 'Período que se paga (mes actual o anterior)',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'El período debe tener el formato YYYY-MM',
  })
  period!: string;

  @ApiProperty({ example: 1500.5, description: 'Importe real pagado' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  @Max(9999999999.99)
  amount!: number;

  @ApiProperty({
    example: '2026-11-06T12:00:00.000Z',
    description: 'Fecha y hora real del pago',
  })
  @IsDateString({}, { message: 'La fecha del pago no es válida' })
  paidAt!: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.DEBITO,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'El medio de pago no es válido' })
  paymentMethod?: PaymentMethod | null;

  @ApiPropertyOptional({ example: 'Detalle opcional', nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La observación no puede superar los 500 caracteres' })
  note?: string | null;
}
