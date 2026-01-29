'use client'

import { useState, useMemo } from 'react'
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
  isSameDay,
} from 'date-fns'
import { useSchedulesByDateRange } from '@/hooks/use-schedules'
import { useUnitEvents } from '@/hooks/use-events'
import { MemberPickerModal } from './member-picker-modal'
import { Loader2 } from 'lucide-react'
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

export function MonthCalendarView({ currentMonth, onWeekClick }: MonthCalendarViewProps) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)

  // Calculate the date range for the calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  // Get first Monday and last Friday of the grid
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Only include weekdays (Monday to Friday)
  const firstMonday = gridStart
  const lastFriday = addDays(gridEnd, -2) // Sunday -> Friday

  const startStr = format(firstMonday, 'yyyy-MM-dd')
  const endStr = format(lastFriday, 'yyyy-MM-dd')

  // Fetch schedules and events for the entire month grid
  const { data: schedulesData, isLoading: schedulesLoading } = useSchedulesByDateRange(
    startStr,
    endStr
  )
  const { data: eventsData, isLoading: eventsLoading } = useUnitEvents({
    startDate: startStr,
    endDate: endStr,
  })

  // Generate week rows
  const weeks = useMemo(() => {
    const weeksArray = eachWeekOfInterval(
      {
        start: firstMonday,
        end: lastFriday,
      },
      { weekStartsOn: 1 }
    )
    return weeksArray
  }, [firstMonday, lastFriday])

  // Group schedules by week start date
  const schedulesByWeek = useMemo(() => {
    const map = new Map<string, ScheduleData[]>()
    const schedules = (schedulesData?.data ?? []) as ScheduleData[]
    for (const schedule of schedules) {
      const weekKey = schedule.weekStartDate
      if (!map.has(weekKey)) {
        map.set(weekKey, [])
      }
      map.get(weekKey)!.push(schedule)
    }
    return map
  }, [schedulesData])

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
    // This would need integration with schedule creation
    // For now, just close the modal
    console.log('Assign member', member, 'to week', selectedWeek)
    setIsMemberPickerOpen(false)
    setSelectedWeek(null)
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
        <table className="table table-fixed w-full border-collapse">
          <thead>
            <tr className="border-b-2">
              {weekdays.map((day) => (
                <th
                  key={day}
                  className="text-center font-semibold p-2 bg-base-200"
                  scope="col"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((weekStart: Date) => {
              const weekStartStr = format(weekStart, 'yyyy-MM-dd')
              const weekSchedules = schedulesByWeek.get(weekStartStr) || []

              const ddsSchedule = weekSchedules.find((s) => s.dutyRole.code === 'DDS')
              const dutyWatchSchedule = weekSchedules.find(
                (s) => s.dutyRole.code === 'DUTY_WATCH'
              )

              // Calculate row background based on schedule status
              const isDraft = ddsSchedule?.status === 'draft'
              const isPublished = ddsSchedule?.status === 'published'
              const isUnassigned = !ddsSchedule

              const rowBgClass = cn({
                'bg-success/10': isPublished,
                'bg-warning/10': isDraft,
              })

              return (
                <tr key={weekStartStr} className={cn('border-b', rowBgClass)}>
                  {/* Monday - Week start + DDS badge */}
                  <td className="p-2 align-top">
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

                  {/* Tue - Duty Watch status + events */}
                  {[1, 2, 3, 4].map((dayOffset) => {
                    const currentDate = addDays(weekStart, dayOffset)
                    const dateStr = format(currentDate, 'yyyy-MM-dd')
                    const dayEvents = eventsByDate.get(dateStr) || []
                    const isTodayDate = isToday(currentDate)
                    const isCurrentMonth = isSameMonth(currentDate, currentMonth)

                    // Show duty watch status on Tue and Thu
                    const showDutyWatch = dayOffset === 1 || dayOffset === 3

                    return (
                      <td
                        key={dayOffset}
                        className={cn('p-2 align-top', {
                          'ring-2 ring-primary ring-inset': isTodayDate,
                          'opacity-50': !isCurrentMonth,
                        })}
                      >
                        <div className="flex flex-col gap-1">
                          {showDutyWatch && dutyWatchSchedule && (
                            <div
                              className={cn('status status-sm', {
                                'status-success':
                                  dutyWatchSchedule.assignments &&
                                  dutyWatchSchedule.assignments.length > 0,
                                'status-warning':
                                  !dutyWatchSchedule.assignments ||
                                  dutyWatchSchedule.assignments.length === 0,
                              })}
                              aria-label={
                                dutyWatchSchedule.assignments &&
                                dutyWatchSchedule.assignments.length > 0
                                  ? 'Duty watch assigned'
                                  : 'Duty watch partially assigned'
                              }
                            />
                          )}

                          {dayEvents.map((event) => (
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
