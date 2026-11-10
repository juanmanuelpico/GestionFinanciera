import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DebtActorType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { debtCurrencies, type DebtCurrency } from '../debt-calculations.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const isPerson = (dto: { type: DebtActorType }) =>
  dto.type === DebtActorType.PERSONA;

const isCard = (dto: { type: DebtActorType }) =>
  dto.type === DebtActorType.TARJETA;

export class CreateDebtActorDto {
  @ApiProperty({ enum: DebtActorType, example: DebtActorType.PERSONA })
  @IsEnum(DebtActorType, { message: 'El tipo de actor no es válido' })
  type!: DebtActorType;

  @ApiPropertyOptional({ example: 'Juan', description: 'Obligatorio para Persona' })
  @Transform(trimmed)
  @ValidateIf(isPerson)
  @IsOptional()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre no es válido' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez', description: 'Obligatorio para Persona' })
  @Transform(trimmed)
  @ValidateIf(isPerson)
  @IsOptional()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString({ message: 'El apellido no es válido' })
  @MaxLength(60, { message: 'El apellido no puede superar los 60 caracteres' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+54 11 5555-5555' })
  @Transform(trimmed)
  @ValidateIf(isPerson)
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono es demasiado largo' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @Transform(trimmed)
  @ValidateIf(isPerson)
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ example: 'Visa Galicia', description: 'Obligatorio para Tarjeta' })
  @Transform(trimmed)
  @ValidateIf(isCard)
  @IsOptional()
  @IsNotEmpty({ message: 'El alias es obligatorio' })
  @IsString({ message: 'El alias no es válido' })
  @MaxLength(60, { message: 'El alias no puede superar los 60 caracteres' })
  alias?: string;

  @ApiPropertyOptional({ example: 'Banco Galicia', description: 'Obligatorio para Tarjeta' })
  @Transform(trimmed)
  @ValidateIf(isCard)
  @IsOptional()
  @IsNotEmpty({ message: 'El banco o emisor es obligatorio' })
  @IsString({ message: 'El banco o emisor no es válido' })
  @MaxLength(60, { message: 'El banco no puede superar los 60 caracteres' })
  issuer?: string;

  @ApiPropertyOptional({ example: 'Visa', description: 'Obligatorio para Tarjeta' })
  @Transform(trimmed)
  @ValidateIf(isCard)
  @IsOptional()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  @IsString({ message: 'La marca no es válida' })
  @MaxLength(30, { message: 'La marca no puede superar los 30 caracteres' })
  brand?: string;

  @ApiPropertyOptional({ example: '1234', description: 'Últimos 4 dígitos (opcional)' })
  @Transform(trimmed)
  @ValidateIf(isCard)
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'Ingresá exactamente los últimos 4 dígitos' })
  lastFour?: string | null;

  @ApiPropertyOptional({ example: 25, description: 'Día de cierre (obligatorio para Tarjeta)' })
  @ValidateIf(isCard)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El día de cierre debe ser un entero' })
  @Min(1, { message: 'El día de cierre debe estar entre 1 y 31' })
  @Max(31, { message: 'El día de cierre debe estar entre 1 y 31' })
  closingDay?: number;

  @ApiPropertyOptional({ example: 10, description: 'Día de vencimiento (obligatorio para Tarjeta)' })
  @ValidateIf(isCard)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El día de vencimiento debe ser un entero' })
  @Min(1, { message: 'El día de vencimiento debe estar entre 1 y 31' })
  @Max(31, { message: 'El día de vencimiento debe estar entre 1 y 31' })
  paymentDueDay?: number;

  @ApiPropertyOptional({
    enum: debtCurrencies,
    example: 'ARS',
    description: 'Billetera de pago predeterminada (obligatoria para Tarjeta)',
  })
  @ValidateIf(isCard)
  @IsOptional()
  @IsIn([...debtCurrencies], { message: 'La billetera predeterminada no es válida' })
  defaultWalletCurrency?: DebtCurrency;
}
