import React, { memo } from 'react'
import { addDays, format, isBefore, startOfWeek } from 'date-fns'
import { WeekDdsCell } from './week-dds-cell'
import { DayCell } from './day-cell'
import { computeEffectiveCount } from '@/lib/merge-duty-watch'

interface ScheduleData {
  id: string
  weekStartDate: string
  status: string
  dutyRole: {
    id: string
    code: string
    name: string
  }
  assignments?: Array<{
    id: string
    memberId: string
    member: {
      id: string
      rank: string
      firstName: string
      lastName: string
    }
    dutyPosition?: { id: string; code: string; name: string } | null
    [key: string]: unknown
  }>
  nightOverrides?: Array<{
    nightDate: string
    overrideType: 'replace' | 'add' | 'remove'
    baseMemberId: string | null
    memberId: string | null
  }>
  [key: string]: unknown
}

interface EventData {
  id: string
  title: string
  eventDate: string
  startTime: string | null
  endTime: string | null
}

interface WeekRowProps {
  weekIdx: number
  weekStart: Date
  currentMonth: Date
  ddsSchedule: ScheduleData | undefined
  dutyWatchSchedule: ScheduleData | undefined
  eventsByDate: Map<string, EventData[]>
  focusedWeek: number
  focusedDay: number
  onWeekClick?: (weekStartDate: string) => void
}

export const WeekRow = memo(function WeekRow({
  weekIdx,
  weekStart,
  currentMonth,
  ddsSchedule,
  dutyWatchSchedule,
  eventsByDate,
  focusedWeek,
  focusedDay,
  onWeekClick,
}: WeekRowProps) {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const baseAssignments = dutyWatchSchedule?.assignments ?? []
  const nightOverrides = dutyWatchSchedule?.nightOverrides ?? []
  const currentWeekMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const isPastWeek = isBefore(weekStart, currentWeekMonday)

  return (
    <tr>
      <WeekDdsCell
        weekIdx={weekIdx}
        weekStart={weekStart}
        weekStartStr={weekStartStr}
        ddsSchedule={ddsSchedule}
        dutyWatchSchedule={dutyWatchSchedule}
        focusedWeek={focusedWeek}
        focusedDay={focusedDay}
        onWeekClick={onWeekClick}
        isPastWeek={isPastWeek}
      />
      {/* Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6 */}
      {Array.from({ length: 7 }, (_, dayOffset) => {
        const date = addDays(weekStart, dayOffset)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayEvents = eventsByDate.get(dateStr) ?? []

        // Only Tue (offset 1) and Thu (offset 3) are duty watch nights
        const isDwNight = dayOffset === 1 || dayOffset === 3
        let dutyWatch: {
          assignmentCount: number
          hasOverrides: boolean
          weekStartDate: string
        } | null = null
        if (isDwNight) {
          const { activeCount, hasOverrides } = computeEffectiveCount(
            baseAssignments,
            nightOverrides,
            dateStr
          )
          dutyWatch = { assignmentCount: activeCount, hasOverrides, weekStartDate: weekStartStr }
        }

        return (
          <DayCell
            key={dayOffset}
            weekIdx={weekIdx}
            dayOffset={dayOffset}
            date={date}
            currentMonth={currentMonth}
            events={dayEvents}
            dutyWatch={dutyWatch}
            focusedWeek={focusedWeek}
            focusedDay={focusedDay}
            isPastWeek={isPastWeek}
          />
        )
      })}
    </tr>
  )
})
