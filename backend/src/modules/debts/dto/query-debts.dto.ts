import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DebtActorType, DebtKind, DebtStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { debtCurrencies, type DebtCurrency } from '../debt-calculations.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryDebtsDto extends PaginationDto {
  @ApiProperty({ enum: DebtKind, description: 'Solapa activa de la pantalla' })
  @IsEnum(DebtKind, { message: 'El tipo de deuda no es válido' })
  kind!: DebtKind;

  @ApiPropertyOptional({ enum: DebtStatus })
  @IsOptional()
  @IsEnum(DebtStatus, { message: 'El estado no es válido' })
  status?: DebtStatus;

  @ApiPropertyOptional({ enum: DebtActorType })
  @IsOptional()
  @IsEnum(DebtActorType, { message: 'El tipo de actor no es válido' })
  actorType?: DebtActorType;

  @ApiPropertyOptional({ enum: debtCurrencies })
  @IsOptional()
  @IsIn([...debtCurrencies], { message: 'La moneda no es válida' })
  currency?: DebtCurrency;

  @ApiPropertyOptional({ example: 'juan' })
  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La búsqueda es demasiado larga' })
  search?: string;

  @ApiPropertyOptional({ example: 'zapatillas', description: 'Filtro por descripción de la deuda' })
  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La descripción es demasiado larga' })
  description?: string;
}
