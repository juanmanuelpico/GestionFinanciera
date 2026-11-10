import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto, TopCategoriesDto } from './dto/report-query.dto.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('savings/monthly')
  @ApiOperation({
    summary: 'Aportes, retiros, neto y media mensual de ahorros por período',
  })
  savingsMonthly(
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.savingsMonthly(userId, query);
  }

  @Get('movements/top-categories')
  @ApiOperation({
    summary: 'Top N de categorías más usadas por tipo y moneda',
  })
  topCategories(
    @CurrentUser('id') userId: string,
    @Query() query: TopCategoriesDto,
  ) {
    return this.reportsService.movementsTopCategories(userId, query);
  }

  @Get('movements/category-averages')
  @ApiOperation({
    summary: 'Total y promedio mensual por categoría en el período',
  })
  categoryAverages(
    @CurrentUser('id') userId: string,
    @Query() query: TopCategoriesDto,
  ) {
    return this.reportsService.movementsCategoryAverages(userId, query);
  }

  @Get('debts/stats')
  @ApiOperation({
    summary:
      'KPIs de deuda, serie mensual de cobros/pagos y ranking de deudores',
  })
  debtsStats(
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.debtsStats(userId, query);
  }

  @Get('fixed-expenses/monthly')
  @ApiOperation({
    summary: 'Gastos fijos esperados vs pagados por mes y cumplimiento',
  })
  fixedExpensesMonthly(
    @CurrentUser('id') userId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.fixedExpensesMonthly(userId, query);
  }
}
