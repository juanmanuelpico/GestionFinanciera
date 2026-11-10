import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DebtSettlementsService } from './debt-settlements.service.js';
import { DebtsService } from './debts.service.js';
import { CreateDebtDto } from './dto/create-debt.dto.js';
import { PayDebtDto } from './dto/pay-debt.dto.js';
import { QueryDebtsDto } from './dto/query-debts.dto.js';

@ApiTags('debts')
@ApiBearerAuth()
@Controller('debts')
export class DebtsController {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly settlementsService: DebtSettlementsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar deudas propias o de terceros' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryDebtsDto) {
    return this.debtsService.findAll(userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una deuda y su calendario de cuotas' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDebtDto) {
    return this.debtsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una deuda con sus cuotas' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.debtsService.findDetail(userId, id);
  }

  @Get(':id/settlements')
  @ApiOperation({ summary: 'Listar cobros y pagos de una deuda' })
  settlements(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.settlementsService.listForDebt(userId, id);
  }

  @Post(':id/payments')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Cobrar o pagar la/s próxima/s cuota/s pendiente/s',
  })
  pay(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayDebtDto,
  ) {
    return this.settlementsService.pay(userId, id, dto);
  }

  @Post(':id/settlements/:settlementId/reverse')
  @HttpCode(201)
  @ApiOperation({ summary: 'Deshacer un cobro o pago con movimientos inversos' })
  reverse(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
  ) {
    return this.settlementsService.reverse(userId, id, settlementId);
  }
}
