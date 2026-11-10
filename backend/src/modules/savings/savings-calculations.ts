import { Prisma } from '@prisma/client';

export const savingCurrencies = ['ARS', 'USD', 'EUR'] as const;
export type SavingCurrency = (typeof savingCurrencies)[number];

export interface CurrencyAmount {
  currency: SavingCurrency;
  /** Pesos por unidad de la moneda. Ignorado para ARS (siempre 1). */
  rate: Prisma.Decimal | null;
}

export function rateOf(item: CurrencyAmount): Prisma.Decimal {
  if (item.currency === 'ARS') {
    return new Prisma.Decimal(1);
  }
  if (!item.rate || item.rate.lte(0)) {
    throw new Error(`Falta la cotización de ${item.currency}`);
  }
  return item.rate;
}

/**
 * Convierte un importe entre monedas usando ARS como pivote:
 * ARS = importe × cotización origen; destino = ARS ÷ cotización destino.
 * Redondea a 2 decimales (half-up).
 */
export function convertAmount(
  amount: Prisma.Decimal,
  from: CurrencyAmount,
  to: CurrencyAmount,
): Prisma.Decimal {
  if (from.currency === to.currency) {
    return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
  const ars = amount.mul(rateOf(from));
  return ars
    .div(rateOf(to))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Importe de la billetera (ingresos - egresos) de una moneda. */
export function walletBalance(
  rows: { type: 'INGRESO' | 'EGRESO'; amount: Prisma.Decimal }[],
): Prisma.Decimal {
  return rows.reduce(
    (acc, row) =>
      row.type === 'INGRESO' ? acc.add(row.amount) : acc.sub(row.amount),
    new Prisma.Decimal(0),
  );
}
