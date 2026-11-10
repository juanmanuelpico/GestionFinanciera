import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DashboardService, type DashboardSummary } from './dashboard.service.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Resumen del dashboard según las secciones habilitadas',
  })
  summary(@CurrentUser('id') userId: string): Promise<DashboardSummary> {
    return this.dashboardService.summary(userId);
  }
}
