import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export const DOLAR_API_BASE_URL = 'https://dolarapi.com';
export const EXCHANGE_RATE_CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

export type DollarQuoteType = 'BLUE' | 'OFICIAL' | 'MEP';

const DOLAR_API_PATHS: Record<DollarQuoteType, string> = {
  BLUE: '/v1/dolares/blue',
  OFICIAL: '/v1/dolares/oficial',
  MEP: '/v1/dolares/bolsa',
};

export interface DollarQuote {
  type: DollarQuoteType;
  compra: number;
  venta: number;
  casa: string;
  nombre: string;
  fechaActualizacion: string;
}

export type DollarQuotesResponse = Record<DollarQuoteType, DollarQuote>;

interface DolarApiPayload {
  compra: number;
  venta: number;
  casa: string;
  nombre: string;
  fechaActualizacion: string;
}

@Injectable()
export class ExchangeRatesService {
  private cache: { value: DollarQuotesResponse; expiresAt: number } | null =
    null;

  async getDollarQuotes(): Promise<DollarQuotesResponse> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.value;
    }

    const entries = await Promise.all(
      (Object.keys(DOLAR_API_PATHS) as DollarQuoteType[]).map(
        async (type) => [type, await this.fetchQuote(type)] as const,
      ),
    );

    const value = Object.fromEntries(entries) as DollarQuotesResponse;
    this.cache = { value, expiresAt: now + EXCHANGE_RATE_CACHE_TTL_MS };
    return value;
  }

  private async fetchQuote(type: DollarQuoteType): Promise<DollarQuote> {
    try {
      const response = await fetch(
        `${DOLAR_API_BASE_URL}${DOLAR_API_PATHS[type]}`,
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
      );
      if (!response.ok) {
        throw new Error(`DolarApi respondió ${response.status}`);
      }
      const payload = (await response.json()) as DolarApiPayload;
      return { type, ...payload };
    } catch {
      throw new ServiceUnavailableException(
        'No se pudieron obtener las cotizaciones. Podés cargar la cotización manualmente.',
      );
    }
  }
}
