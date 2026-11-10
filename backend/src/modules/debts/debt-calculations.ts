import { Prisma } from '@prisma/client';

export const debtCurrencies = ['ARS', 'USD', 'EUR'] as const;
export type DebtCurrency = (typeof debtCurrencies)[number];

export function isDebtCurrency(value: string): value is DebtCurrency {
  return (debtCurrencies as readonly string[]).includes(value);
}

/** Convierte 'YYYY-MM-DD' (o ISO completo) en un Date a medianoche UTC. */
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Fecha inválida: ${value}`);
    }
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
      ),
    );
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${value}`);
  }
  return date;
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Fecha del día `day` en el mes indicado, recortada al último día del mes. */
function clampDay(year: number, monthIndex: number, day: number): Date {
  const clamped = Math.min(day, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, clamped));
}

/** Suma meses a una fecha-only conservando el día, recortado al fin de mes. */
export function addMonthsUtc(date: Date, months: number): Date {
  const baseDay = date.getUTCDate();
  const totalMonths = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;

  return clampDay(year, month, baseDay);
}

/**
 * Reparte el total entre las cuotas sin perder centavos:
 * las primeras N-1 se redondean hacia abajo y la última absorbe la diferencia.
 */
export function buildInstallmentAmounts(
  total: Prisma.Decimal,
  count: number,
): Prisma.Decimal[] {
  if (count < 1 || !Number.isInteger(count)) {
    throw new Error('La cantidad de cuotas debe ser un entero positivo');
  }

  const base = total.div(count).toDecimalPlaces(2, Prisma.Decimal.ROUND_FLOOR);
  const amounts: Prisma.Decimal[] = [];

  for (let index = 0; index < count - 1; index += 1) {
    amounts.push(base);
  }

  const allocated = base.mul(count - 1);
  amounts.push(total.sub(allocated).toDecimalPlaces(2));

  return amounts;
}

/** Calendario mensual de vencimientos a partir del primero (fechas-only UTC). */
export function buildDueDates(firstDueDate: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) =>
    addMonthsUtc(firstDueDate, index),
  );
}

/**
 * Primer vencimiento sugerido de una compra con tarjeta:
 * - la compra entra al resumen del mes en curso si ocurre a tiempo del cierre;
 * - si no, entra al cierre del mes siguiente;
 * - el vencimiento es el primer día de pago posterior al cierre del resumen.
 */
export function suggestCardFirstDueDate(
  purchaseDate: Date,
  closingDay: number,
  paymentDueDay: number,
): Date {
  const year = purchaseDate.getUTCFullYear();
  const month = purchaseDate.getUTCMonth();

  const currentClosing = clampDay(year, month, closingDay);
  const nextClosing = addMonthsUtc(currentClosing, 1);
  const statementClosing =
    purchaseDate.getTime() <= currentClosing.getTime()
      ? currentClosing
      : nextClosing;

  const closingYear = statementClosing.getUTCFullYear();
  const closingMonth = statementClosing.getUTCMonth();

  const sameMonthDue = clampDay(closingYear, closingMonth, paymentDueDay);
  if (sameMonthDue.getTime() > statementClosing.getTime()) {
    return sameMonthDue;
  }

  return clampDay(closingYear, closingMonth + 1, paymentDueDay);
}
