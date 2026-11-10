import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class QueryProjectionsDto {
  @ApiProperty({ example: '2026-11', description: 'Período YYYY-MM' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'El período debe tener el formato YYYY-MM',
  })
  period!: string;
}
