import { describe, expect, it } from 'vitest';
import {
  dueDateForPeriod,
  isDueInPeriod,
  monthDiff,
  nextDueDate,
  parsePeriod,
  periodFromDate,
} from './fixed-expense-calculations.js';

const date = (iso: string) => new Date(iso);

describe('fixed-expense-calculations', () => {
  it('convierte períodos a fechas-only y viceversa', () => {
    expect(parsePeriod('2026-11')).toEqual(
      date('2026-11-01T00:00:00.000Z'),
    );
    expect(periodFromDate(date('2026-11-30T23:59:59.000Z'))).toBe('2026-11');
    expect(periodFromDate(date('2026-01-01T00:00:00.000Z'))).toBe('2026-01');
  });

  it('calcula diferencias de meses calendario', () => {
    expect(monthDiff(date('2026-01-15T00:00:00Z'), date('2026-11-01T00:00:00Z'))).toBe(10);
    expect(monthDiff(date('2026-11-05T00:00:00Z'), date('2026-04-01T00:00:00Z'))).toBe(-7);
    expect(monthDiff(date('2026-11-20T00:00:00Z'), date('2026-11-01T00:00:00Z'))).toBe(0);
  });

  it('un gasto mensual vence todos los meses desde el ancla', () => {
    const anchor = date('2026-05-10T00:00:00Z');

    expect(isDueInPeriod(anchor, 1, parsePeriod('2026-04'))).toBe(false);
    expect(isDueInPeriod(anchor, 1, parsePeriod('2026-05'))).toBe(true);
    expect(isDueInPeriod(anchor, 1, parsePeriod('2026-12'))).toBe(true);
    expect(isDueInPeriod(anchor, 1, parsePeriod('2027-06'))).toBe(true);
  });

  it('un gasto semestral vence cada 6 meses desde el ancla', () => {
    const anchor = date('2026-04-15T00:00:00Z');

    expect(isDueInPeriod(anchor, 6, parsePeriod('2026-04'))).toBe(true);
    expect(isDueInPeriod(anchor, 6, parsePeriod('2026-10'))).toBe(true);
    expect(isDueInPeriod(anchor, 6, parsePeriod('2026-07'))).toBe(false);
    expect(isDueInPeriod(anchor, 6, parsePeriod('2026-11'))).toBe(false);
    expect(isDueInPeriod(anchor, 6, parsePeriod('2027-04'))).toBe(true);
    expect(isDueInPeriod(anchor, 6, parsePeriod('2026-03'))).toBe(false);
  });

  it('recorta el día habitual al último día del mes', () => {
    const anchor = date('2026-01-31T00:00:00Z');

    expect(dueDateForPeriod(anchor, parsePeriod('2026-02'))).toEqual(
      date('2026-02-28T00:00:00Z'),
    );
    expect(dueDateForPeriod(anchor, parsePeriod('2028-02'))).toEqual(
      date('2028-02-29T00:00:00Z'),
    );
    expect(dueDateForPeriod(anchor, parsePeriod('2026-04'))).toEqual(
      date('2026-04-30T00:00:00Z'),
    );
    expect(dueDateForPeriod(anchor, parsePeriod('2026-03'))).toEqual(
      date('2026-03-31T00:00:00Z'),
    );
  });

  it('el próximo vencimiento nunca es anterior al mes actual', () => {
    const anchor = date('2020-01-10T00:00:00Z');

    // Desde 2026-11 (mes 82 de la serie), la serie cada 6 meses
    // (0, 6, 12, ... 78, 84) recién vuelve a vencer en 2027-01 (mes 84).
    const upcoming = nextDueDate(anchor, 6, date('2026-11-06T12:00:00Z'));
    expect(upcoming).toEqual(date('2027-01-10T00:00:00Z'));

    const beforeAnchor = nextDueDate(
      date('2027-03-05T00:00:00Z'),
      1,
      date('2026-11-06T12:00:00Z'),
    );
    expect(beforeAnchor).toEqual(date('2027-03-05T00:00:00Z'));
  });

  it('el próximo vencimiento respeta la frecuencia', () => {
    const anchor = date('2026-04-15T00:00:00Z');

    expect(
      nextDueDate(anchor, 6, date('2026-09-01T00:00:00Z')),
    ).toEqual(date('2026-10-15T00:00:00Z'));
  });
});
