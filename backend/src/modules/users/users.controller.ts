import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto.js';
import { UsersService, type UserPreferences } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/preferences')
  @ApiOperation({ summary: 'Obtener las preferencias del usuario autenticado' })
  getPreferences(@CurrentUser('id') userId: string): Promise<UserPreferences> {
    return this.usersService.getPreferences(userId);
  }

  @Patch('me/preferences')
  @ApiOperation({
    summary: 'Actualizar las preferencias del usuario autenticado',
  })
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferences> {
    return this.usersService.updatePreferences(userId, dto);
  }
}
