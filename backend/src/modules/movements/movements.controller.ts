import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { QueryMovementsDto } from './dto/query-movements.dto.js';
import { UpdateMovementDto } from './dto/update-movement.dto.js';
import { MovementsService } from './movements.service.js';

@ApiTags('movements')
@ApiBearerAuth()
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar los movimientos del usuario autenticado' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryMovementsDto,
  ) {
    return this.movementsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un movimiento' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.movementsService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un movimiento' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.movementsService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un movimiento' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovementDto,
  ) {
    return this.movementsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un movimiento' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.movementsService.remove(userId, id);
  }
}
