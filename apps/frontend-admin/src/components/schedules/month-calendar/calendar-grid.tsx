import React, { memo, useCallback, useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { IsoWeekday } from '@sentinel/contracts'
import { WeekRow } from './week-row'
import { sortIsoWeekdays } from '@/lib/iso-weekday'

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

interface CalendarGridProps {
  weeks: Date[]
  currentMonth: Date
  schedulesByWeek: Map<string, ScheduleData[]>
  eventsByDate: Map<string, EventData[]>
  dutyWatchDays: number[]
  onWeekClick?: (weekStartDate: string) => void
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TOTAL_COLS = 8 // Week/DDS + 7 days

export const CalendarGrid = memo(function CalendarGrid({
  weeks,
  currentMonth,
  schedulesByWeek,
  eventsByDate,
  dutyWatchDays,
  onWeekClick,
}: CalendarGridProps) {
  const [focusedCell, setFocusedCell] = useState<{ week: number; day: number }>({
    week: 0,
    day: 0,
  })

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalWeeks = weeks.length
      let { week, day } = focusedCell

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          week = Math.max(0, week - 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          week = Math.min(totalWeeks - 1, week + 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          day = Math.max(0, day - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          day = Math.min(TOTAL_COLS - 1, day + 1)
          break
        default:
          return
      }

      setFocusedCell({ week, day })
      const cellId = `cal-cell-${week}-${day}`
      document.getElementById(cellId)?.focus()
    },
    [focusedCell, weeks.length]
  )

  const columnHeaders = useMemo(() => {
    const normalizedDutyWatchDays = sortIsoWeekdays(dutyWatchDays)
    return [
      { key: 'week', label: 'Week / DDS', sublabel: null as string | null },
      ...DAY_HEADERS.map((label, index) => {
        const isoDay = (index + 1) as IsoWeekday
        return {
          key: label.toLowerCase(),
          label,
          sublabel: normalizedDutyWatchDays.includes(isoDay) ? '(DW)' : null,
        }
      }),
    ]
  }, [dutyWatchDays])

  return (
    <div className="overflow-x-auto">
      <table
        className="table table-fixed w-full border-collapse"
        role="grid"
        onKeyDown={handleGridKeyDown}
      >
        <thead>
          <tr>
            {columnHeaders.map((col) => (
              <th
                key={col.key}
                className={`text-center font-semibold p-2 bg-base-200 border-b-2 border-r${col.key === 'week' ? ' sticky left-0 z-10' : ''}`}
                scope="col"
              >
                {col.label}
                {col.sublabel && (
                  <span className="block text-xs font-normal text-base-content/60">
                    {col.sublabel}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((weekStart, weekIdx) => {
            const weekStartStr = format(weekStart, 'yyyy-MM-dd')
            const weekSchedules = schedulesByWeek.get(weekStartStr) ?? []
            const ddsSchedule = weekSchedules.find((s) => s.dutyRole.code === 'DDS')
            const dutyWatchSchedule = weekSchedules.find((s) => s.dutyRole.code === 'DUTY_WATCH')

            return (
              <WeekRow
                key={weekStartStr}
                weekIdx={weekIdx}
                weekStart={weekStart}
                currentMonth={currentMonth}
                ddsSchedule={ddsSchedule}
                dutyWatchSchedule={dutyWatchSchedule}
                eventsByDate={eventsByDate}
                dutyWatchDays={dutyWatchDays}
                focusedWeek={focusedCell.week}
                focusedDay={focusedCell.day}
                onWeekClick={onWeekClick}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
})
