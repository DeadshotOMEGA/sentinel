import { describe, expect, it } from 'vitest'
import { DateTime } from 'luxon'
import {
  getOperationalDate,
  getOperationalWeek,
  isOperationalDay,
  isDutyWatchNight,
  getTimeUntilRollover,
  formatOperationalDate,
  getOperationalDateISO,
  parseOperationalDate,
  isInRolloverPeriod,
  getOperationalStatus,
  DEFAULT_TIMEZONE,
  OPERATIONAL_DAY_START_HOUR,
} from '../../../src/utils/operational-date.js'

describe('Operational Date Utilities', () => {
  const winnipegTimezone = DEFAULT_TIMEZONE

  describe('getOperationalDate', () => {
    it('should return same day when after 3am', () => {
      // January 15, 2026 at 4:00 AM Winnipeg time
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 4, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate())
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(15)
      expect(resultDt.month).toBe(1)
      expect(resultDt.year).toBe(2026)
    })

    it('should return previous day when before 3am', () => {
      // January 15, 2026 at 2:00 AM Winnipeg time - operationally still Jan 14
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 2, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate())
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(14)
      expect(resultDt.month).toBe(1)
      expect(resultDt.year).toBe(2026)
    })

    it('should return previous day at exactly midnight', () => {
      // January 15, 2026 at midnight - operationally still Jan 14
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 0, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate())
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(14)
    })

    it('should return same day at exactly 3am', () => {
      // January 15, 2026 at 3:00 AM - new operational day begins
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 3, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate())
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(15)
    })

    it('should handle month boundary correctly', () => {
      // February 1, 2026 at 1:00 AM - operationally still Jan 31
      const dt = DateTime.fromObject(
        { year: 2026, month: 2, day: 1, hour: 1, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate())
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(31)
      expect(resultDt.month).toBe(1)
    })

    it('should handle year boundary correctly', () => {
      // January 1, 2026 at 1:00 AM - operationally still Dec 31, 2025
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 1, hour: 1, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate())
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(31)
      expect(resultDt.month).toBe(12)
      expect(resultDt.year).toBe(2025)
    })

    it('should use custom day start hour', () => {
      // January 15, 2026 at 4:00 AM with day start at 5am - still previous day
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 4, minute: 0 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDate(dt.toJSDate(), { dayStartHour: 5 })
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(14)
    })
  })

  describe('getOperationalWeek', () => {
    it('should return Monday-to-Monday boundaries', () => {
      // January 15, 2026 is a Thursday
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 10 },
        { zone: winnipegTimezone }
      )
      const { start, end } = getOperationalWeek(dt.toJSDate())

      const startDt = DateTime.fromJSDate(start, { zone: winnipegTimezone })
      const endDt = DateTime.fromJSDate(end, { zone: winnipegTimezone })

      // Week should start on Monday Jan 12
      expect(startDt.weekday).toBe(1) // Monday
      expect(startDt.day).toBe(12)

      // Week should end on Monday Jan 19
      expect(endDt.weekday).toBe(1) // Monday
      expect(endDt.day).toBe(19)
    })

    it('should handle operational date before 3am', () => {
      // Wednesday Jan 14 at 2am is still Tuesday Jan 13 operationally
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 14, hour: 2 },
        { zone: winnipegTimezone }
      )
      const { start, end } = getOperationalWeek(dt.toJSDate())

      const startDt = DateTime.fromJSDate(start, { zone: winnipegTimezone })

      // Should be in week starting Monday Jan 12
      expect(startDt.day).toBe(12)
    })
  })

  describe('isOperationalDay', () => {
    it('should correctly identify day of week', () => {
      // January 15, 2026 is Thursday (day 4) at 10am
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 10 },
        { zone: winnipegTimezone }
      )

      expect(isOperationalDay(dt.toJSDate(), 4)).toBe(true) // Thursday
      expect(isOperationalDay(dt.toJSDate(), 2)).toBe(false) // Tuesday
    })

    it('should use operational date for early morning hours', () => {
      // Friday Jan 16 at 1am is still Thursday Jan 15 operationally
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 16, hour: 1 },
        { zone: winnipegTimezone }
      )

      expect(isOperationalDay(dt.toJSDate(), 4)).toBe(true) // Thursday
      expect(isOperationalDay(dt.toJSDate(), 5)).toBe(false) // Friday
    })
  })

  describe('isDutyWatchNight', () => {
    it('should return true for Tuesday', () => {
      // January 13, 2026 is Tuesday at 10am
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 13, hour: 10 },
        { zone: winnipegTimezone }
      )

      expect(isDutyWatchNight(dt.toJSDate())).toBe(true)
    })

    it('should return true for Thursday', () => {
      // January 15, 2026 is Thursday at 10am
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 10 },
        { zone: winnipegTimezone }
      )

      expect(isDutyWatchNight(dt.toJSDate())).toBe(true)
    })

    it('should return false for other days', () => {
      // January 14, 2026 is Wednesday
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 14, hour: 10 },
        { zone: winnipegTimezone }
      )

      expect(isDutyWatchNight(dt.toJSDate())).toBe(false)
    })

    it('should use operational date for early morning', () => {
      // Wednesday Jan 14 at 2am is still Tuesday Jan 13 operationally
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 14, hour: 2 },
        { zone: winnipegTimezone }
      )

      expect(isDutyWatchNight(dt.toJSDate())).toBe(true) // Still Tuesday
    })
  })

  describe('getTimeUntilRollover', () => {
    it('should return positive time when before 3am', () => {
      // This test uses current time, so just verify it returns a positive number
      const result = getTimeUntilRollover()
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('formatOperationalDate', () => {
    it('should format date correctly', () => {
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15 },
        { zone: winnipegTimezone }
      )
      const result = formatOperationalDate(dt.toJSDate())

      expect(result).toBe('Thursday, January 15, 2026')
    })
  })

  describe('getOperationalDateISO', () => {
    it('should return ISO date string', () => {
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 10 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDateISO(dt.toJSDate())

      expect(result).toBe('2026-01-15')
    })

    it('should return previous day ISO for early morning', () => {
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 2 },
        { zone: winnipegTimezone }
      )
      const result = getOperationalDateISO(dt.toJSDate())

      expect(result).toBe('2026-01-14')
    })
  })

  describe('parseOperationalDate', () => {
    it('should parse ISO date string', () => {
      const result = parseOperationalDate('2026-01-15')
      const resultDt = DateTime.fromJSDate(result, { zone: winnipegTimezone })

      expect(resultDt.day).toBe(15)
      expect(resultDt.month).toBe(1)
      expect(resultDt.year).toBe(2026)
    })

    it('should throw for invalid date', () => {
      expect(() => parseOperationalDate('invalid')).toThrow()
    })
  })

  describe('isInRolloverPeriod', () => {
    it('should return true when before 3am', () => {
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 2 },
        { zone: winnipegTimezone }
      )

      expect(isInRolloverPeriod(dt.toJSDate())).toBe(true)
    })

    it('should return false when after 3am', () => {
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 10 },
        { zone: winnipegTimezone }
      )

      expect(isInRolloverPeriod(dt.toJSDate())).toBe(false)
    })

    it('should return false at exactly 3am', () => {
      const dt = DateTime.fromObject(
        { year: 2026, month: 1, day: 15, hour: 3 },
        { zone: winnipegTimezone }
      )

      expect(isInRolloverPeriod(dt.toJSDate())).toBe(false)
    })
  })

  describe('getOperationalStatus', () => {
    it('should return complete status object', () => {
      const status = getOperationalStatus()

      expect(status).toHaveProperty('operationalDate')
      expect(status).toHaveProperty('operationalDateISO')
      expect(status).toHaveProperty('operationalDateFormatted')
      expect(status).toHaveProperty('calendarDate')
      expect(status).toHaveProperty('calendarDateISO')
      expect(status).toHaveProperty('isDifferentFromCalendar')
      expect(status).toHaveProperty('isInRolloverPeriod')
      expect(status).toHaveProperty('isDutyWatchNight')
      expect(status).toHaveProperty('msUntilRollover')
      expect(status).toHaveProperty('timezone')

      expect(status.timezone).toBe(DEFAULT_TIMEZONE)
    })
  })

  describe('constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_TIMEZONE).toBe('America/Winnipeg')
      expect(OPERATIONAL_DAY_START_HOUR).toBe(3)
    })
  })
})
