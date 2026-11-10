import { Module } from '@nestjs/common';
import { SpendingControlController } from './spending-control.controller.js';
import { SpendingControlService } from './spending-control.service.js';

@Module({
  controllers: [SpendingControlController],
  providers: [SpendingControlService],
})
export class SpendingControlModule {}
