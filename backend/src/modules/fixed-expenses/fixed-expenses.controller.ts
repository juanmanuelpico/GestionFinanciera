import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto.js';
import { PayFixedExpenseDto } from './dto/pay-fixed-expense.dto.js';
import { QueryProjectionsDto } from './dto/query-projections.dto.js';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto.js';
import { FixedExpensesService } from './fixed-expenses.service.js';

@ApiTags('fixed-expenses')
@ApiBearerAuth()
@Controller('fixed-expenses')
export class FixedExpensesController {
  constructor(private readonly fixedExpensesService: FixedExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar los gastos fijos del usuario autenticado' })
  findAll(@CurrentUser('id') userId: string) {
    return this.fixedExpensesService.findAll(userId);
  }

  @Get('projections')
  @ApiOperation({
    summary: 'Previsiones mensuales de los gastos fijos para un período',
  })
  projections(
    @CurrentUser('id') userId: string,
    @Query() query: QueryProjectionsDto,
  ) {
    return this.fixedExpensesService.projections(userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un gasto fijo recurrente' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFixedExpenseDto,
  ) {
    return this.fixedExpensesService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un gasto fijo' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedExpenseDto,
  ) {
    return this.fixedExpensesService.update(userId, id, dto);
  }

  @Post(':id/payments')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Pagar un período y generar automáticamente su egreso',
  })
  pay(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayFixedExpenseDto,
  ) {
    return this.fixedExpensesService.pay(userId, id, dto);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Historial de pagos de un gasto fijo' })
  history(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fixedExpensesService.findPayments(userId, id);
  }
}
