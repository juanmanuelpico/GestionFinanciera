import { Module } from '@nestjs/common';
import { DebtActorsController } from './debt-actors.controller.js';
import { DebtActorsService } from './debt-actors.service.js';
import { DebtSettlementsService } from './debt-settlements.service.js';
import { DebtSplitsController } from './debt-splits.controller.js';
import { DebtSplitsService } from './debt-splits.service.js';
import { DebtsController } from './debts.controller.js';
import { DebtsService } from './debts.service.js';

@Module({
  controllers: [DebtsController, DebtActorsController, DebtSplitsController],
  providers: [
    DebtsService,
    DebtActorsService,
    DebtSettlementsService,
    DebtSplitsService,
  ],
})
export class DebtsModule {}
