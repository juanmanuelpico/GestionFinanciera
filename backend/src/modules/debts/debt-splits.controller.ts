import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DebtSplitsService } from './debt-splits.service.js';
import { CreateDebtSplitDto } from './dto/create-debt-split.dto.js';
import { QueryDebtSplitsDto } from './dto/query-debt-splits.dto.js';

@ApiTags('debt-splits')
@ApiBearerAuth()
@Controller('debt-splits')
export class DebtSplitsController {
  constructor(private readonly debtSplitsService: DebtSplitsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar divisiones de gastos registradas' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryDebtSplitsDto) {
    return this.debtSplitsService.findAll(userId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un gasto común dividido y generar sus deudas',
  })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDebtSplitDto) {
    return this.debtSplitsService.create(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Eliminar una división y restablecer las deudas y movimientos',
  })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.debtSplitsService.remove(userId, id);
  }
}
