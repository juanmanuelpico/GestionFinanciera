import { describe, expect, it } from 'vitest'
import {
  convertValue,
  quoteOptionsFor,
  resolveQuoteRate,
  walletNeedsManualRate,
} from './estimate'
import type { DollarQuotes } from './types'

const quotes = {
  BLUE: { type: 'BLUE', compra: 1, venta: 1200, casa: '', nombre: '', fechaActualizacion: '' },
  OFICIAL: { type: 'OFICIAL', compra: 1, venta: 1000, casa: '', nombre: '', fechaActualizacion: '' },
  MEP: { type: 'MEP', compra: 1, venta: 1100, casa: '', nombre: '', fechaActualizacion: '' },
} as DollarQuotes

describe('estimate', () => {
  it('misma moneda no cambia el importe', () => {
    expect(
      convertValue(100, { currency: 'USD', rate: 1000 }, { currency: 'USD', rate: null }),
    ).toBe(100)
  })

  it('USD a ARS multiplica por la cotización', () => {
    expect(
      convertValue(100, { currency: 'USD', rate: 1000 }, { currency: 'ARS', rate: null }),
    ).toBe(100000)
  })

  it('devuelve null si falta cotización', () => {
    expect(
      convertValue(100, { currency: 'USD', rate: null }, { currency: 'ARS', rate: null }),
    ).toBeNull()
  })

  it('exige cotización manual solo para billeteras extranjeras distintas', () => {
    expect(walletNeedsManualRate('USD', 'USD')).toBe(false)
    expect(walletNeedsManualRate('USD', 'ARS')).toBe(false)
    expect(walletNeedsManualRate('USD', 'EUR')).toBe(true)
  })

  it('resuelve la cotización del tipo elegido de DolarApi (venta)', () => {
    expect(resolveQuoteRate('USD', 'BLUE', null, quotes)).toBe(1200)
    expect(resolveQuoteRate('USD', 'MEP', null, quotes)).toBe(1100)
    expect(resolveQuoteRate('USD', 'MANUAL', 990, quotes)).toBe(990)
    expect(resolveQuoteRate('ARS', undefined, null, quotes)).toBe(1)
  })

  it('EUR solo admite cotización manual', () => {
    expect(quoteOptionsFor('EUR')).toEqual(['MANUAL'])
    expect(resolveQuoteRate('EUR', 'OFICIAL', null, quotes)).toBeNull()
  })
})
