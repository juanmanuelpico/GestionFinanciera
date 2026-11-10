import { Module } from '@nestjs/common';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module.js';
import { SavingsController } from './savings.controller.js';
import { SavingsService } from './savings.service.js';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [SavingsController],
  providers: [SavingsService],
})
export class SavingsModule {}
