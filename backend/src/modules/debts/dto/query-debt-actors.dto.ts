import { ApiPropertyOptional } from '@nestjs/swagger';
import { DebtActorType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryDebtActorsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'juan' })
  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La búsqueda es demasiado larga' })
  search?: string;

  @ApiPropertyOptional({ enum: DebtActorType })
  @IsOptional()
  @IsEnum(DebtActorType, { message: 'El tipo de actor no es válido' })
  type?: DebtActorType;
}
