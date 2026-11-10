import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ExchangeRatesService,
  type DollarQuotesResponse,
} from './exchange-rates.service.js';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get('dollar')
  @ApiOperation({
    summary: 'Cotizaciones del dólar blue, oficial y MEP (DolarApi, con caché)',
  })
  getDollarQuotes(): Promise<DollarQuotesResponse> {
    return this.exchangeRatesService.getDollarQuotes();
  }
}
