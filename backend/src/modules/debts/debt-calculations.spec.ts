import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  addMonthsUtc,
  buildDueDates,
  buildInstallmentAmounts,
  parseDateOnly,
  suggestCardFirstDueDate,
  toDateOnly,
} from './debt-calculations.js';

const decimal = (value: string) => new Prisma.Decimal(value);

function sum(amounts: Prisma.Decimal[]): Prisma.Decimal {
  return amounts.reduce((acc, amount) => acc.add(amount), new Prisma.Decimal(0));
}

describe('buildInstallmentAmounts', () => {
  it('absorbe el resto en la última cuota sin perder centavos', () => {
    const amounts = buildInstallmentAmounts(decimal('100'), 3);

    expect(amounts.map((amount) => amount.toFixed(2))).toEqual([
      '33.33',
      '33.33',
      '33.34',
    ]);
    expect(sum(amounts).toFixed(2)).toBe('100.00');
  });

  it('mantiene cuotas iguales cuando el total es divisible', () => {
    const amounts = buildInstallmentAmounts(decimal('99.99'), 3);

    expect(amounts.map((amount) => amount.toFixed(2))).toEqual([
      '33.33',
      '33.33',
      '33.33',
    ]);
  });

  it('funciona con una sola cuota', () => {
    const amounts = buildInstallmentAmounts(decimal('1234.56'), 1);

    expect(amounts.map((amount) => amount.toFixed(2))).toEqual(['1234.56']);
  });

  it('no genera montos negativos en la última cuota', () => {
    const amounts = buildInstallmentAmounts(decimal('0.02'), 4);

    expect(sum(amounts).toFixed(2)).toBe('0.02');
    amounts.forEach((amount) => expect(amount.isNegative()).toBe(false));
  });
});

describe('addMonthsUtc', () => {
  it('recorta al último día de febrero no bisiesto', () => {
    expect(toDateOnly(addMonthsUtc(parseDateOnly('2026-01-31'), 1))).toBe(
      '2026-02-28',
    );
  });

  it('respeta febrero bisiesto', () => {
    expect(toDateOnly(addMonthsUtc(parseDateOnly('2028-01-31'), 1))).toBe(
      '2028-02-29',
    );
  });

  it('conserva el día cuando existe en el mes destino', () => {
    expect(toDateOnly(addMonthsUtc(parseDateOnly('2026-01-15'), 2))).toBe(
      '2026-03-15',
    );
  });
});

describe('buildDueDates', () => {
  it('genera un calendario mensual con recorte de fin de mes', () => {
    const dates = buildDueDates(parseDateOnly('2026-01-31'), 4);

    expect(dates.map(toDateOnly)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});

describe('suggestCardFirstDueDate', () => {
  it('patea al mes siguiente cuando el día de pago cae antes del cierre', () => {
    expect(
      toDateOnly(
        suggestCardFirstDueDate(
          parseDateOnly('2026-11-05'),
          25,
          10,
        ),
      ),
    ).toBe('2026-12-10');
  });

  it('usa el mismo mes cuando el vencimiento es posterior al cierre', () => {
    expect(
      toDateOnly(
        suggestCardFirstDueDate(
          parseDateOnly('2026-11-01'),
          25,
          30,
        ),
      ),
    ).toBe('2026-11-30');
  });

  it('mueve el cierre al mes siguiente para compras posteriores al cierre', () => {
    expect(
      toDateOnly(
        suggestCardFirstDueDate(
          parseDateOnly('2026-11-27'),
          25,
          10,
        ),
      ),
    ).toBe('2027-01-10');
  });

  it('recorta el día de pago en febrero', () => {
    expect(
      toDateOnly(
        suggestCardFirstDueDate(
          parseDateOnly('2026-02-15'),
          25,
          31,
        ),
      ),
    ).toBe('2026-02-28');
  });

  it('soporta el salto de año en el cierre', () => {
    expect(
      toDateOnly(
        suggestCardFirstDueDate(
          parseDateOnly('2026-12-28'),
          25,
          5,
        ),
      ),
    ).toBe('2027-02-05');
  });
});

describe('parseDateOnly', () => {
  it('convierte una fecha simple a medianoche UTC', () => {
    expect(parseDateOnly('2026-11-06').toISOString()).toBe(
      '2026-11-06T00:00:00.000Z',
    );
  });

  it('extrae el día calendario de un ISO con hora', () => {
    expect(toDateOnly(parseDateOnly('2026-11-06T14:30:00.000Z'))).toBe(
      '2026-11-06',
    );
  });
});
