import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  currentUtcPeriod,
  evaluateSpendingLimit,
  utcMonthRange,
} from './spending-limit.js';

describe('evaluateSpendingLimit', () => {
  const threshold = new Prisma.Decimal(1000);

  it('muestra OK con el porcentaje truncado hacia abajo', () => {
    expect(evaluateSpendingLimit(threshold, new Prisma.Decimal(799.99))).toEqual(
      { percent: 79.9, status: 'OK' },
    );
  });

  it('pasa a WARNING exactamente al 80 %', () => {
    expect(evaluateSpendingLimit(threshold, new Prisma.Decimal(800))).toEqual({
      percent: 80,
      status: 'WARNING',
    });
  });

  it('se mantiene en WARNING entre 80 y 100', () => {
    expect(evaluateSpendingLimit(threshold, new Prisma.Decimal(950))).toEqual({
      percent: 95,
      status: 'WARNING',
    });
  });

  it('pasa a EXCEEDED al llegar al 100 %', () => {
    expect(evaluateSpendingLimit(threshold, new Prisma.Decimal(1000))).toEqual(
      { percent: 100, status: 'EXCEEDED' },
    );
  });

  it('marca EXCEEDED por encima del umbral', () => {
    expect(evaluateSpendingLimit(threshold, new Prisma.Decimal(1250.5))).toEqual(
      { percent: 125, status: 'EXCEEDED' },
    );
  });
});

describe('utcMonthRange y currentUtcPeriod', () => {
  it('usa el mes calendario UTC y rola de año', () => {
    const date = new Date('2026-12-31T23:30:00.000Z');
    expect(currentUtcPeriod(date)).toBe('2026-12');

    const { start, end } = utcMonthRange(date);
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
