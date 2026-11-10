import { BadRequestException } from '@nestjs/common';

export const fixedExpenseCurrencies = ['ARS', 'USD', 'EUR'] as const;
export type FixedExpenseCurrency = (typeof fixedExpenseCurrencies)[number];

const PERIOD_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidPeriod(value: string): boolean {
  return PERIOD_REGEX.test(value);
}

/** Convierte 'YYYY-MM' en el primer día del mes (medianoche UTC). */
export function parsePeriod(value: string): Date {
  if (!isValidPeriod(value)) {
    throw new BadRequestException('El período debe tener el formato YYYY-MM');
  }

  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/** 'YYYY-MM' de una fecha (año/mes UTC, sin corrimiento de zona). */
export function periodFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Convierte 'YYYY-MM-DD' (o ISO completo) en un Date a medianoche UTC. */
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha no es válida');
    }
    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('La fecha no es válida');
  }

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  );
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Días del mes `monthIndex` que tiene el día original, recortado al fin de mes. */
function clampDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex))));
}

/** Diferencia en meses calendario entre dos fechas-only (UTC), target - anchor. */
export function monthDiff(anchor: Date, target: Date): number {
  return (
    (target.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (target.getUTCMonth() - anchor.getUTCMonth())
  );
}

/**
 * ¿Corresponde el vencimiento en el período indicado?
 * La serie arranca en el mes de `firstDueDate` y repite cada `intervalMonths`.
 */
export function isDueInPeriod(
  firstDueDate: Date,
  intervalMonths: number,
  periodStart: Date,
): boolean {
  const diff = monthDiff(firstDueDate, periodStart);
  return diff >= 0 && diff % intervalMonths === 0;
}

/** Vencimiento dentro del período: día habitual recortado al último día del mes. */
export function dueDateForPeriod(firstDueDate: Date, periodStart: Date): Date {
  return clampDay(
    periodStart.getUTCFullYear(),
    periodStart.getUTCMonth(),
    firstDueDate.getUTCDate(),
  );
}

export function currentPeriod(now: Date = new Date()): string {
  return periodFromDate(now);
}

/**
 * Próximo vencimiento desde el período actual (inclusive).
 * Devuelve null si el gasto nunca vuelve a vencer dentro del horizonte buscado.
 */
export function nextDueDate(
  firstDueDate: Date,
  intervalMonths: number,
  fromDate: Date = new Date(),
): Date {
  const fromPeriod = parsePeriod(periodFromDate(fromDate));
  const diff = monthDiff(firstDueDate, fromPeriod);

  if (diff <= 0) {
    return dueDateForPeriod(firstDueDate, firstDueDate);
  }

  const steps = Math.ceil(diff / intervalMonths);
  const targetMonth = firstDueDate.getUTCMonth() + steps * intervalMonths;
  const year = firstDueDate.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;

  return dueDateForPeriod(firstDueDate, new Date(Date.UTC(year, month, 1)));
}
