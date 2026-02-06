'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  addDays,
  format,
  isSameMonth,
  isToday,
} from 'date-fns'
import {
  useSchedulesByDateRange,
  useCreateSchedule,
  useCreateAssignment,
  useDutyRoles,
} from '@/hooks/use-schedules'
import { useSchedulesByWeekGrouping } from '@/hooks/schedules'
import { useUnitEvents } from '@/hooks/use-events'
import { MemberPickerModal } from './member-picker-modal'
import { toast } from 'sonner'
import { Loader2, AlertCircle } from 'lucide-react'
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from '@/components/ui/AppCard'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Month calendar grid view displaying schedules and events for weekdays (Mon-Fri).
 * Shows DDS assignments, duty watch status, and unit events.
 *
 * @example
 * ```tsx
 * <MonthCalendarView
 *   currentMonth={new Date('2026-01-01')}
 *   onWeekClick={(date) => router.push(`/schedules/week/${date}`)}
 * />
 * ```
 */

interface MonthCalendarViewProps {
  /** The month to display (any date within the month) */
  currentMonth: Date
  /** Optional callback when a week row is clicked */
  onWeekClick?: (weekStartDate: string) => void
}

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
    member: {
      id: string
      rank: string
      firstName: string
      lastName: string
    }
  }>
}

interface EventData {
  id: string
  title: string
  eventDate: string
  startTime: string | null
  endTime: string | null
}

interface CalendarCellProps {
  weekIdx: number
  dayOffset: number
  currentDate: Date
  currentMonth: Date
  events: EventData[]
  dutyWatchSchedule: ScheduleData | undefined
  focusedWeek: number
  focusedDay: number
}

const CalendarCell = memo(function CalendarCell({
  weekIdx,
  dayOffset,
  currentDate,
  currentMonth,
  events,
  dutyWatchSchedule,
  focusedWeek,
  focusedDay,
}: CalendarCellProps) {
  const isTodayDate = isToday(currentDate)
  const isCurrentMonthDate = isSameMonth(currentDate, currentMonth)
  const showDutyWatch = dayOffset === 1 || dayOffset === 3

  return (
    <td
      key={dayOffset}
      id={`cal-cell-${weekIdx}-${dayOffset}`}
      role="gridcell"
      tabIndex={weekIdx === focusedWeek && focusedDay === dayOffset ? 0 : -1}
      className={cn('p-2 align-top focus:outline-2 focus:outline-primary', {
        'ring-2 ring-primary ring-inset': isTodayDate,
        'opacity-50': !isCurrentMonthDate,
      })}
    >
      <div className="flex flex-col gap-1">
        {showDutyWatch && dutyWatchSchedule && (
          <div
            className={cn('status status-sm', {
              'status-success':
                dutyWatchSchedule.assignments && dutyWatchSchedule.assignments.length > 0,
              'status-warning':
                !dutyWatchSchedule.assignments || dutyWatchSchedule.assignments.length === 0,
            })}
            aria-label={
              dutyWatchSchedule.assignments && dutyWatchSchedule.assignments.length > 0
                ? 'Duty watch assigned'
                : 'Duty watch partially assigned'
            }
          />
        )}
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="badge badge-accent badge-sm truncate max-w-full hover:badge-accent-focus transition-colors"
            title={event.title}
          >
            {event.title}
          </Link>
        ))}
      </div>
    </td>
  )
})

export function MonthCalendarView({ currentMonth, onWeekClick }: MonthCalendarViewProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [focusedCell, setFocusedCell] = useState<{ week: number; day: number }>({ week: 0, day: 0 })

  const { data: dutyRoles } = useDutyRoles()
  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()

  // Consolidate all date computations into a single stable useMemo
  const { startStr, endStr, weeks } = useMemo(() => {
    const ms = startOfMonth(currentMonth)
    const me = endOfMonth(currentMonth)
    const gs = startOfWeek(ms, { weekStartsOn: 1 })
    const ge = endOfWeek(me, { weekStartsOn: 1 })
    const lf = addDays(ge, -2)
    return {
      startStr: format(gs, 'yyyy-MM-dd'),
      endStr: format(lf, 'yyyy-MM-dd'),
      weeks: eachWeekOfInterval({ start: gs, end: lf }, { weekStartsOn: 1 }),
    }
  }, [currentMonth.getTime()])

  // Fetch schedules and events for the entire month grid
  const {
    data: schedulesData,
    isLoading: schedulesLoading,
    isError: schedulesError,
    error: schedError,
  } = useSchedulesByDateRange(startStr, endStr)
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: evtError,
  } = useUnitEvents({
    startDate: startStr,
    endDate: endStr,
  })

  // Group schedules by week start date
  const schedulesByWeek = useSchedulesByWeekGrouping(schedulesData)

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventData[]>()
    const events = (eventsData?.data ?? []) as EventData[]
    for (const event of events) {
      const dateKey = event.eventDate
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(event)
    }
    return map
  }, [eventsData])

  const handleWeekClick = (weekStart: Date) => {
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    if (onWeekClick) {
      onWeekClick(weekStartStr)
    }
  }

  const handleAssignDds = (weekStart: Date) => {
    setSelectedWeek(format(weekStart, 'yyyy-MM-dd'))
    setIsMemberPickerOpen(true)
  }

  const handleMemberSelected = async (member: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }) => {
    const ddsRole = dutyRoles?.data?.find((r) => r.code === 'DDS')
    if (!ddsRole || !selectedWeek) return

    try {
      const newSchedule = await createSchedule.mutateAsync({
        dutyRoleId: ddsRole.id,
        weekStartDate: selectedWeek,
      })
      await createAssignment.mutateAsync({
        scheduleId: newSchedule.id,
        data: { memberId: member.id },
      })
      toast.success(`Assigned ${member.rank} ${member.lastName} as DDS`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign DDS'
      toast.error(message)
    }

    setIsMemberPickerOpen(false)
    setSelectedWeek(null)
  }

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalWeeks = weeks.length
      const totalDays = 5 // Mon-Fri
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
          day = Math.min(totalDays - 1, day + 1)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (day === 0 && weeks[week]) {
            handleWeekClick(weeks[week])
          }
          return
        default:
          return
      }

      setFocusedCell({ week, day })
      const cellId = `cal-cell-${week}-${day}`
      document.getElementById(cellId)?.focus()
    },
    [focusedCell, weeks]
  )

  if (schedulesError || eventsError) {
    const errMsg = schedError?.message ?? evtError?.message ?? 'Unknown error'
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Month Calendar</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load schedule</span>
          </div>
          <p className="text-sm text-base-content/60 mt-1">{errMsg}</p>
        </AppCardContent>
      </AppCard>
    )
  }

  if (schedulesLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-base-content/60" />
      </div>
    )
  }

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  return (
    <>
      <div className="overflow-x-auto">
        <table
          className="table table-fixed w-full border-collapse"
          role="grid"
          onKeyDown={handleGridKeyDown}
        >
          <thead>
            <tr className="border-b-2">
              {weekdays.map((day) => (
                <th key={day} className="text-center font-semibold p-2 bg-base-200" scope="col">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((weekStart: Date, weekIdx: number) => {
              const weekStartStr = format(weekStart, 'yyyy-MM-dd')
              const weekSchedules = schedulesByWeek.get(weekStartStr) || []

              const ddsSchedule = weekSchedules.find((s) => s.dutyRole.code === 'DDS')
              const dutyWatchSchedule = weekSchedules.find((s) => s.dutyRole.code === 'DUTY_WATCH')

              // Calculate row background based on schedule status
              const isDraft = ddsSchedule?.status === 'draft'
              const isPublished = ddsSchedule?.status === 'published'

              const rowBgClass = cn({
                'bg-success/10': isPublished,
                'bg-warning/10': isDraft,
              })

              return (
                <tr key={weekStartStr} className={cn('border-b', rowBgClass)}>
                  {/* Monday - Week start + DDS badge */}
                  <td
                    id={`cal-cell-${weekIdx}-0`}
                    role="gridcell"
                    tabIndex={weekIdx === focusedCell.week && focusedCell.day === 0 ? 0 : -1}
                    className="p-2 align-top focus:outline-2 focus:outline-primary"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleWeekClick(weekStart)}
                        className="text-sm font-medium hover:text-primary transition-colors text-left"
                        aria-label={`Week starting ${format(weekStart, 'MMM d')}`}
                        type="button"
                      >
                        {format(weekStart, 'MMM d')}
                      </button>

                      {ddsSchedule ? (
                        <div className="badge badge-primary badge-sm truncate max-w-full">
                          {ddsSchedule.assignments?.[0]
                            ? `${ddsSchedule.assignments[0].member.rank} ${ddsSchedule.assignments[0].member.lastName}`
                            : 'Unassigned'}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAssignDds(weekStart)}
                          className="badge badge-ghost badge-sm hover:badge-primary transition-colors"
                          aria-label={`Assign DDS for week of ${format(weekStart, 'MMM d')}`}
                          type="button"
                        >
                          —
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Tue-Fri cells */}
                  {[1, 2, 3, 4].map((dayOffset) => {
                    const currentDate = addDays(weekStart, dayOffset)
                    const dateStr = format(currentDate, 'yyyy-MM-dd')
                    const dayEvents = eventsByDate.get(dateStr) || []

                    return (
                      <CalendarCell
                        key={dayOffset}
                        weekIdx={weekIdx}
                        dayOffset={dayOffset}
                        currentDate={currentDate}
                        currentMonth={currentMonth}
                        events={dayEvents}
                        dutyWatchSchedule={dutyWatchSchedule}
                        focusedWeek={focusedCell.week}
                        focusedDay={focusedCell.day}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <MemberPickerModal
        open={isMemberPickerOpen}
        onOpenChange={setIsMemberPickerOpen}
        onSelect={handleMemberSelected}
        title="Assign DDS"
        description="Select a qualified member to be DDS for this week"
        filterQualification="DDS"
      />
    </>
  )
}
