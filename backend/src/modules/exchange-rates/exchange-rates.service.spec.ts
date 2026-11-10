import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXCHANGE_RATE_CACHE_TTL_MS,
  ExchangeRatesService,
} from './exchange-rates.service.js';

const quote = {
  compra: 1000,
  venta: 1050,
  casa: 'x',
  nombre: 'y',
  fechaActualizacion: '2026-11-04T00:00:00.000Z',
};

describe('ExchangeRatesService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('consulta blue, oficial y MEP y cachea el resultado', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(quote)));
    vi.stubGlobal('fetch', fetchMock);
    const service = new ExchangeRatesService();

    const first = await service.getDollarQuotes();
    await service.getDollarQuotes();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(first.BLUE.venta).toBe(1050);
    expect(first.MEP.type).toBe('MEP');
  });

  it('vuelve a consultar cuando expira la caché', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(quote)));
    vi.stubGlobal('fetch', fetchMock);
    const service = new ExchangeRatesService();

    await service.getDollarQuotes();
    vi.advanceTimersByTime(EXCHANGE_RATE_CACHE_TTL_MS + 1);
    await service.getDollarQuotes();

    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('responde error controlado si DolarApi falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('error', { status: 500 })),
    );
    const service = new ExchangeRatesService();

    await expect(service.getDollarQuotes()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
