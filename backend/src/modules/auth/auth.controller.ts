import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { parseDurationToSeconds } from '../../common/utils/duration.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthSession, PublicUser } from './auth.service.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import type { RefreshTokenUser } from './strategies/jwt-refresh.strategy.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

interface SessionResponse {
  user: PublicUser;
  accessToken: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar un usuario' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Usuario creado' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session = await this.authService.register(dto);
    return this.respondWithSession(response, session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session = await this.authService.login(dto);
    return this.respondWithSession(response, session);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar el access token' })
  async refresh(
    @Req() request: Request & { user: RefreshTokenUser },
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const session = await this.authService.refresh(
      request.user.sub,
      request.user.refreshToken,
    );
    return this.respondWithSession(response, session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const cookies = (request as Request & { cookies?: Record<string, string> })
      .cookies;
    await this.authService.logout(cookies?.refresh_token);
    response.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { message: 'Sesión cerrada' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  me(@CurrentUser('id') userId: string): Promise<PublicUser> {
    return this.authService.me(userId);
  }

  private respondWithSession(
    response: Response,
    session: AuthSession,
  ): SessionResponse {
    this.setRefreshCookie(response, session.refreshToken);
    return { user: session.user, accessToken: session.accessToken };
  }

  private setRefreshCookie(response: Response, token: string): void {
    const maxAge =
      parseDurationToSeconds(
        this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
      ) * 1000;
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: REFRESH_COOKIE_PATH,
      maxAge,
    });
  }
}
