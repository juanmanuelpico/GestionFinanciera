import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { debtCurrencies, type DebtCurrency } from '../debt-calculations.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDebtSplitItemDto {
  @ApiProperty({ description: 'ID del actor (persona)' })
  @IsUUID('4', { message: 'El actor no es válido' })
  actorId!: string;

  @ApiProperty({ example: 250, description: 'Cuánto gastó esa persona' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @Min(0, { message: 'El importe no puede ser negativo' })
  @Max(9999999999.99)
  amount!: number;
}

export class CreateDebtSplitDto {
  @ApiProperty({ enum: debtCurrencies, example: 'ARS' })
  @IsIn([...debtCurrencies], { message: 'La billetera no es válida' })
  currency!: DebtCurrency;

  @ApiProperty({ example: 1000, description: 'Monto total del gasto común' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @IsPositive({ message: 'El total del gasto debe ser mayor a 0' })
  @Max(9999999999.99)
  totalAmount!: number;

  @ApiProperty({ example: 400, description: 'Cuánto gastó el usuario' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @Min(0, { message: 'Tu parte no puede ser negativa' })
  @Max(9999999999.99)
  userAmount!: number;

  @ApiProperty({ enum: ['USER', 'ACTOR'], description: 'Quién pagó la cuenta' })
  @IsIn(['USER', 'ACTOR'], { message: 'El pagador no es válido' })
  payer!: 'USER' | 'ACTOR';

  @ApiPropertyOptional({
    description: 'Actor que pagó la cuenta (obligatorio si payer = ACTOR)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El pagador no es válido' })
  payerActorId?: string;

  @ApiProperty({ type: [CreateDebtSplitItemDto], description: 'Partes por actor' })
  @ValidateNested({ each: true })
  @Type(() => CreateDebtSplitItemDto)
  @ArrayMinSize(1, { message: 'Elegí al menos un actor' })
  @ArrayMaxSize(50, { message: 'La división admite como máximo 50 actores' })
  items!: CreateDebtSplitItemDto[];

  @ApiProperty({
    example: 'Cena del grupo',
    description: 'Descripción de la división (obligatoria)',
  })
  @Transform(trimmed)
  @IsString({ message: 'La descripción es obligatoria' })
  @MinLength(1, { message: 'La descripción es obligatoria' })
  @MaxLength(500, {
    message: 'La descripción no puede superar los 500 caracteres',
  })
  note!: string;
}
