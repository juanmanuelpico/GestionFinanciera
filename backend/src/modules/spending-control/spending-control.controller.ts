import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  SpendingControlService,
  type SpendingControlSummary,
} from './spending-control.service.js';

@ApiTags('spending-control')
@ApiBearerAuth()
@Controller('spending-control')
export class SpendingControlController {
  constructor(private readonly spendingControlService: SpendingControlService) {}

  @Get()
  @ApiOperation({
    summary: 'Estado de los umbrales de gasto del mes en curso',
  })
  getSummary(
    @CurrentUser('id') userId: string,
  ): Promise<SpendingControlSummary> {
    return this.spendingControlService.getSummary(userId);
  }
}
