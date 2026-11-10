import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  type PipeTransform,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  AdjustSavingDto,
  ConvertSavingDto,
  CreateSavingDto,
  QuerySavingEventsDto,
  QuerySummaryDto,
  ReturnSavingDto,
} from './dto/savings.dto.js';
import { savingCurrencies, type SavingCurrency } from './savings-calculations.js';
import { SavingsService } from './savings.service.js';

class ParseSavingCurrencyPipe implements PipeTransform<string, SavingCurrency> {
  transform(value: string): SavingCurrency {
    if (!savingCurrencies.includes(value as SavingCurrency)) {
      throw new BadRequestException('La moneda no es válida');
    }
    return value as SavingCurrency;
  }
}

@ApiTags('savings')
@ApiBearerAuth()
@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ahorros del usuario' })
  findAll(@CurrentUser('id') userId: string) {
    return this.savingsService.findAll(userId);
  }

  @Get('available')
  @ApiOperation({ summary: 'Disponible por billetera (ingresos - egresos)' })
  available(@CurrentUser('id') userId: string) {
    return this.savingsService.availableByCurrency(userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de ahorros por moneda y estimado convertido' })
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: QuerySummaryDto,
  ) {
    return this.savingsService.summary(userId, query.eurRate);
  }

  @Get('events')
  @ApiOperation({ summary: 'Historial de ahorros paginado y filtrable' })
  events(
    @CurrentUser('id') userId: string,
    @Query() query: QuerySavingEventsDto,
  ) {
    return this.savingsService.findEvents(userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear ahorro y descontar del disponible' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSavingDto) {
    return this.savingsService.create(userId, dto);
  }

  @Post('positions/:currency/adjust')
  @ApiOperation({ summary: 'Sumar o quitar ahorro (no impacta el disponible)' })
  adjust(
    @CurrentUser('id') userId: string,
    @Param('currency', ParseSavingCurrencyPipe) currency: SavingCurrency,
    @Body() dto: AdjustSavingDto,
  ) {
    return this.savingsService.adjust(userId, currency, dto);
  }

  @Post('positions/:currency/return')
  @ApiOperation({ summary: 'Devolver parte del ahorro al disponible' })
  returnToWallet(
    @CurrentUser('id') userId: string,
    @Param('currency', ParseSavingCurrencyPipe) currency: SavingCurrency,
    @Body() dto: ReturnSavingDto,
  ) {
    return this.savingsService.returnToWallet(userId, currency, dto);
  }

  @Post('positions/:currency/convert')
  @ApiOperation({ summary: 'Convertir el ahorro de una moneda a otra' })
  convert(
    @CurrentUser('id') userId: string,
    @Param('currency', ParseSavingCurrencyPipe) currency: SavingCurrency,
    @Body() dto: ConvertSavingDto,
  ) {
    return this.savingsService.convert(userId, currency, dto);
  }
}
