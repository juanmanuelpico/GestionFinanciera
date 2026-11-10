import { Module } from '@nestjs/common';
import { FixedExpensesController } from './fixed-expenses.controller.js';
import { FixedExpensesService } from './fixed-expenses.service.js';

@Module({
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService],
})
export class FixedExpensesModule {}
