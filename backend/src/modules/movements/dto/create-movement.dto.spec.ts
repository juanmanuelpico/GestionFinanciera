import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { CreateMovementDto } from './create-movement.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const validPayload = {
  type: MovementType.EGRESO,
  amount: 1500.5,
  categoryId: 1,
  movementDate: '2026-11-02T14:30:00.000Z',
  currency: 'ARS',
};

function transform(payload: Record<string, unknown>) {
  return pipe.transform(payload, {
    type: 'body',
    metatype: CreateMovementDto,
  });
}

describe('CreateMovementDto (S4: campos obligatorios)', () => {
  it('acepta un movimiento completo', async () => {
    await expect(transform(validPayload)).resolves.toMatchObject({
      type: MovementType.EGRESO,
      currency: 'ARS',
    });
  });

  it.each(['type', 'currency', 'movementDate'])(
    'rechaza el alta si falta %s',
    async (field) => {
      const payload: Record<string, unknown> = { ...validPayload };
      delete payload[field];

      await expect(transform(payload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});
