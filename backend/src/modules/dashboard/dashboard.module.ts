import { Module } from '@nestjs/common';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [ExchangeRatesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
