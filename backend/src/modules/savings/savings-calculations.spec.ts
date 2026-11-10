import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { convertAmount, walletBalance } from './savings-calculations.js';

const d = (value: string) => new Prisma.Decimal(value);

describe('savings-calculations', () => {
  it('misma moneda no aplica cotización', () => {
    const result = convertAmount(
      d('100'),
      { currency: 'USD', rate: d('1000') },
      { currency: 'USD', rate: null },
    );
    expect(result.toFixed(2)).toBe('100.00');
  });

  it('USD a ARS multiplica por la cotización', () => {
    const result = convertAmount(
      d('100'),
      { currency: 'USD', rate: d('1050') },
      { currency: 'ARS', rate: null },
    );
    expect(result.toFixed(2)).toBe('105000.00');
  });

  it('ARS a USD divide por la cotización', () => {
    const result = convertAmount(
      d('105000'),
      { currency: 'ARS', rate: null },
      { currency: 'USD', rate: d('1050') },
    );
    expect(result.toFixed(2)).toBe('100.00');
  });

  it('USD a EUR pasa por ARS', () => {
    const result = convertAmount(
      d('100'),
      { currency: 'USD', rate: d('1000') },
      { currency: 'EUR', rate: d('1250') },
    );
    expect(result.toFixed(2)).toBe('80.00');
  });

  it('redondea a dos decimales', () => {
    const result = convertAmount(
      d('10'),
      { currency: 'ARS', rate: null },
      { currency: 'USD', rate: d('3') },
    );
    expect(result.toFixed(2)).toBe('3.33');
  });

  it('falla si falta la cotización de una moneda extranjera', () => {
    expect(() =>
      convertAmount(
        d('10'),
        { currency: 'USD', rate: null },
        { currency: 'ARS', rate: null },
      ),
    ).toThrow('Falta la cotización de USD');
  });

  it('el disponible es ingresos menos egresos', () => {
    const balance = walletBalance([
      { type: 'INGRESO', amount: d('1000') },
      { type: 'EGRESO', amount: d('250.5') },
      { type: 'EGRESO', amount: d('100') },
    ]);
    expect(balance.toFixed(2)).toBe('649.50');
  });
});
