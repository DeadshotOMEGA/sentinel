import { describe, expect, it } from 'vitest'
import { formatReportDateTime, formatReportTime } from './report-formatters'

describe('report formatters', () => {
  it('formats report times in military HHmm style', () => {
    const timestamp = new Date(2026, 5, 15, 8, 1).toISOString()

    expect(formatReportTime(timestamp)).toBe('0801')
  })

  it('formats report date-times with military HHmm time', () => {
    const timestamp = new Date(2026, 5, 15, 16, 30).toISOString()

    expect(formatReportDateTime(timestamp)).toBe('Jun 15, 1630')
  })

  it('preserves invalid timestamp values for diagnosis', () => {
    expect(formatReportTime('not-a-date')).toBe('not-a-date')
    expect(formatReportDateTime('not-a-date')).toBe('not-a-date')
  })
})
