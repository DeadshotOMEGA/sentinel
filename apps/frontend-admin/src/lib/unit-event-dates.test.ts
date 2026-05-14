import { describe, expect, it } from 'vitest'
import {
  expandUnitEventDateKeys,
  formatUnitEventDateRange,
  isMultiDayUnitEvent,
} from './unit-event-dates'

describe('unit event date helpers', () => {
  it('formats single-day events as one date', () => {
    const event = { eventDate: '2026-05-29', endDate: null }

    expect(isMultiDayUnitEvent(event)).toBe(false)
    expect(formatUnitEventDateRange(event)).toBe('May 29, 2026')
    expect(expandUnitEventDateKeys(event)).toEqual(['2026-05-29'])
  })

  it('formats and expands multi-day events', () => {
    const event = { eventDate: '2026-05-29', endDate: '2026-05-31' }

    expect(isMultiDayUnitEvent(event)).toBe(true)
    expect(formatUnitEventDateRange(event, 'MMM d')).toBe('May 29 - May 31')
    expect(expandUnitEventDateKeys(event)).toEqual(['2026-05-29', '2026-05-30', '2026-05-31'])
  })
})
