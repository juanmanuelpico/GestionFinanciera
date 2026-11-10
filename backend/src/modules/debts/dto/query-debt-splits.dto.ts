import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryDebtSplitsDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'cena',
    description: 'Filtro por descripción (nota) o código de la división',
  })
  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La búsqueda es demasiado larga' })
  search?: string;
}
