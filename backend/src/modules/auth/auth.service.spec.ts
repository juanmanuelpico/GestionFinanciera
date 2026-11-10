import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { AuthService } from './auth.service.js';

const baseUser = {
  id: '3f4f0f1e-0000-4000-8000-000000000000',
  email: 'user@finanzas.local',
  passwordHash: bcrypt.hashSync('Password123!', 4),
  name: 'Test User',
  role: 'USER' as Role,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('signed-token'),
  };
  const configService = {
    getOrThrow: vi.fn((key: string) =>
      key.includes('Secret') ? 'test_secret_value_123456' : '15m',
    ),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
  );

  return { service, prisma, jwtService };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza un registro con email existente', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(baseUser);

    await expect(
      service.register({
        email: baseUser.email,
        password: 'Password123!',
        name: 'Test User',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza credenciales inválidas', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nadie@finanzas.local', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('emite tokens y persiste el refresh token al iniciar sesión', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(baseUser);

    const session = await service.login({
      email: baseUser.email,
      password: 'Password123!',
    });

    expect(session.user.email).toBe(baseUser.email);
    expect(session.accessToken).toBe('signed-token');
    expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('rota el refresh token de forma atómica al renovar la sesión', async () => {
    const { service, prisma } = createService();
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.findUnique.mockResolvedValue(baseUser);

    const session = await service.refresh(baseUser.id, 'raw-refresh-token');

    expect(session.accessToken).toBe('signed-token');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledOnce();
    expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
  });

  it('rechaza un refresh ya usado o revocado por otra petición concurrente', async () => {
    const { service, prisma } = createService();
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refresh(baseUser.id, 'raw-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('firma cada refresh token con un jti distinto', async () => {
    const { service, prisma, jwtService } = createService();
    prisma.user.findUnique.mockResolvedValue(baseUser);

    await service.login({
      email: baseUser.email,
      password: 'Password123!',
    });
    await service.login({
      email: baseUser.email,
      password: 'Password123!',
    });

    const refreshPayloads = jwtService.signAsync.mock.calls
      .map(([payload]) => payload as { jti?: string })
      .filter((payload) => payload.jti !== undefined);

    expect(refreshPayloads).toHaveLength(2);
    expect(refreshPayloads[0].jti).not.toBe(refreshPayloads[1].jti);
  });
});
