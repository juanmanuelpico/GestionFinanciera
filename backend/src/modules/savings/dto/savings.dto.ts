import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteType, SavingEventType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { savingCurrencies, type SavingCurrency } from '../savings-calculations.js';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSavingDto {
  @ApiProperty({ enum: savingCurrencies, example: 'USD' })
  @IsIn([...savingCurrencies], { message: 'La moneda no es válida' })
  currency!: SavingCurrency;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El importe debe tener como máximo 2 decimales' },
  )
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  @Max(999999999999.99)
  amount!: number;

  @ApiPropertyOptional({ enum: QuoteType, description: 'Obligatoria para USD y EUR' })
  @IsOptional()
  @IsEnum(QuoteType)
  quoteType?: QuoteType;

  @ApiPropertyOptional({ example: 1050, description: 'Obligatoria si quoteType es MANUAL' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cotización debe ser mayor a 0' })
  quoteRate?: number;

  @ApiProperty({ enum: savingCurrencies, example: 'ARS' })
  @IsIn([...savingCurrencies], { message: 'La billetera de descuento no es válida' })
  debitCurrency!: SavingCurrency;

  @ApiPropertyOptional({
    example: 1200,
    description:
      'Cotización manual de la billetera cuando es distinta de la moneda del ahorro y de ARS',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cotización de la billetera debe ser mayor a 0' })
  debitRate?: number;

  @ApiProperty({ example: '2026-11-02T14:30:00.000Z' })
  @IsDateString({}, { message: 'La fecha de compra no es válida' })
  purchaseDate!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export const adjustOperations = ['SUMAR', 'RESTAR'] as const;

export class AdjustSavingDto {
  @ApiProperty({ enum: adjustOperations })
  @IsIn([...adjustOperations])
  operation!: (typeof adjustOperations)[number];

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El importe debe tener como máximo 2 decimales' })
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  amount!: number;
}

export class ReturnSavingDto {
  @ApiProperty({ example: 50, description: 'Importe a devolver en la moneda de la posición' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El importe debe tener como máximo 2 decimales' })
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  amount!: number;

  @ApiProperty({ enum: savingCurrencies, example: 'ARS' })
  @IsIn([...savingCurrencies], { message: 'La billetera de destino no es válida' })
  walletCurrency!: SavingCurrency;

  @ApiPropertyOptional({
    enum: QuoteType,
    description:
      'Cotización de la moneda del ahorro (venta) cuando la billetera tiene otra moneda. Si se omite, se usa la registrada',
  })
  @IsOptional()
  @IsEnum(QuoteType)
  sourceQuoteType?: QuoteType;

  @ApiPropertyOptional({
    description: 'Cotización manual de la moneda del ahorro si sourceQuoteType es MANUAL',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cotización de origen debe ser mayor a 0' })
  sourceQuoteRate?: number;

  @ApiPropertyOptional({ description: 'Cotización manual de la billetera si corresponde' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cotización de la billetera debe ser mayor a 0' })
  walletRate?: number;
}

export class ConvertSavingDto {
  @ApiProperty({ example: 50, description: 'Importe a convertir en la moneda de origen' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El importe debe tener como máximo 2 decimales' })
  @IsPositive({ message: 'El importe debe ser mayor a 0' })
  amount!: number;

  @ApiProperty({ enum: savingCurrencies, description: 'Moneda de destino' })
  @IsIn([...savingCurrencies], { message: 'La moneda de destino no es válida' })
  currency!: SavingCurrency;

  @ApiPropertyOptional({
    enum: QuoteType,
    description: 'Cotización de la moneda de origen. Si se omite, se usa la del ahorro',
  })
  @IsOptional()
  @IsEnum(QuoteType)
  sourceQuoteType?: QuoteType;

  @ApiPropertyOptional({
    description: 'Cotización manual de la moneda de origen si sourceQuoteType es MANUAL',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cotización de origen debe ser mayor a 0' })
  sourceQuoteRate?: number;

  @ApiPropertyOptional({ enum: QuoteType, description: 'Cotización de la moneda destino. Obligatoria para USD y EUR' })
  @IsOptional()
  @IsEnum(QuoteType)
  quoteType?: QuoteType;

  @ApiPropertyOptional({ description: 'Cotización manual de la moneda destino si quoteType es MANUAL' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cotización de destino debe ser mayor a 0' })
  quoteRate?: number;
}

export class QuerySavingEventsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SavingEventType })
  @IsOptional()
  @IsEnum(SavingEventType)
  type?: SavingEventType;

  @ApiPropertyOptional({ enum: savingCurrencies })
  @IsOptional()
  @IsIn([...savingCurrencies], { message: 'La moneda no es válida' })
  currency?: SavingCurrency;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'compra' })
  @Transform(trimmed)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class QuerySummaryDto {
  @ApiPropertyOptional({ description: 'Cotización manual del euro (pesos por euro)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  eurRate?: number;
}
