import { describe, expect, it } from 'vitest'
import {
  currentPeriodValue,
  formatPeriodLabel,
  isPayablePeriod,
  shiftPeriod,
} from './recurrence'

describe('recurrence', () => {
  it('usa el mes local como período actual', () => {
    expect(currentPeriodValue(new Date(2026, 10, 6))).toBe('2026-11')
    expect(currentPeriodValue(new Date(2026, 0, 1))).toBe('2026-01')
  })

  it('mueve períodos cruzando el año', () => {
    expect(shiftPeriod('2026-11', -1)).toBe('2026-10')
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01')
  })

  it('permite pagar períodos actuales o anteriores', () => {
    const now = new Date(2026, 10, 6)

    expect(isPayablePeriod('2026-11', now)).toBe(true)
    expect(isPayablePeriod('2020-11', now)).toBe(true)
    expect(isPayablePeriod('2026-12', now)).toBe(false)
  })

  it('formatea el período como mes largo', () => {
    expect(formatPeriodLabel('2026-11')).toMatch(/^Noviembre( de)? 2026$/)
  })
})
