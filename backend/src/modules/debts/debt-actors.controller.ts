import {
  Body,
  Controller,
  Delete,
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
import { DebtActorsService } from './debt-actors.service.js';
import { CreateDebtActorDto } from './dto/create-debt-actor.dto.js';
import { QueryDebtActorsDto } from './dto/query-debt-actors.dto.js';

@ApiTags('debt-actors')
@ApiBearerAuth()
@Controller('debt-actors')
export class DebtActorsController {
  constructor(private readonly debtActorsService: DebtActorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar y buscar actores de deudas' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryDebtActorsDto,
  ) {
    return this.debtActorsService.findAll(userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un actor (Persona o Tarjeta)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDebtActorDto) {
    return this.debtActorsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un actor' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDebtActorDto,
  ) {
    return this.debtActorsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un actor sin deudas asociadas' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.debtActorsService.remove(userId, id);
  }
}
