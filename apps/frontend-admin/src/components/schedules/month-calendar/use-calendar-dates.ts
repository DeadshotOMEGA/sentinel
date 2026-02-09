import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  addDays,
  format,
} from 'date-fns'

interface CalendarDates {
  /** First Monday on the grid (may be in previous month) */
  startStr: string
  /** Last Sunday on the grid (may be in next month) */
  endStr: string
  /** Monday of each week row */
  weeks: Date[]
}

export function useCalendarDates(currentMonth: Date): CalendarDates {
  const monthTime = currentMonth.getTime()
  return useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return {
      startStr: format(gridStart, 'yyyy-MM-dd'),
      endStr: format(gridEnd, 'yyyy-MM-dd'),
      weeks: eachWeekOfInterval(
        { start: gridStart, end: addDays(gridEnd, -1) },
        { weekStartsOn: 1 }
      ),
    }
  }, [monthTime])
}
