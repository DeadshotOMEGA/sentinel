'use client'

import { useMemo } from 'react'
import { addMonths, format, endOfMonth, eachWeekOfInterval, startOfWeek, addDays } from 'date-fns'
import { useSchedulesByDateRange } from '@/hooks/use-schedules'
import { useSchedulesByWeekGrouping } from '@/hooks/schedules'
import { useUnitEvents } from '@/hooks/use-events'
import { Loader2, AlertCircle } from 'lucide-react'
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard'
import { cn } from '@/lib/utils'

/**
 * Quarter view showing 3 months in compact tables.
 * Displays weekly schedules with DDS assignments, duty watch status, and event counts.
 *
 * @example
 * ```tsx
 * <QuarterView
 *   quarterStart={startOfQuarter(new Date())}
 *   onWeekClick={(date) => router.push(`/schedules/week/${date}`)}
 * />
 * ```
 */

interface QuarterViewProps {
  /** First day of the quarter (first day of the first month) */
  quarterStart: Date
  /** Optional callback when a week row is clicked */
  onWeekClick?: (weekStartDate: string) => void
}

interface EventData {
  id: string
  eventDate: string
}

export function QuarterView({ quarterStart, onWeekClick }: QuarterViewProps) {
  // Generate the 3 months in the quarter
  const months = useMemo(() => {
    return [quarterStart, addMonths(quarterStart, 1), addMonths(quarterStart, 2)]
  }, [quarterStart])

  // Calculate date range for entire quarter
  const quarterEnd = endOfMonth(addMonths(quarterStart, 2))
  const gridStart = startOfWeek(quarterStart, { weekStartsOn: 1 })
  const gridEnd = addDays(startOfWeek(addDays(quarterEnd, 1), { weekStartsOn: 1 }), -3) // Last Friday

  const startStr = format(gridStart, 'yyyy-MM-dd')
  const endStr = format(gridEnd, 'yyyy-MM-dd')

  // Fetch schedules and events for entire quarter
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

  // Group schedules by week
  const schedulesByWeek = useSchedulesByWeekGrouping(schedulesData)

  // Group events by week
  const eventsByWeek = useMemo(() => {
    const map = new Map<string, number>()
    const events = (eventsData?.data ?? []) as EventData[]
    for (const event of events) {
      const eventDate = new Date(event.eventDate)
      const weekStart = startOfWeek(eventDate, { weekStartsOn: 1 })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      map.set(weekKey, (map.get(weekKey) || 0) + 1)
    }
    return map
  }, [eventsData])

  if (schedulesError || eventsError) {
    const errMsg = schedError?.message ?? evtError?.message ?? 'Unknown error'
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle>Quarter View</AppCardTitle>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart)
        const monthLabel = format(monthStart, 'MMMM yyyy')

        // Get weeks in this month
        const weeks = eachWeekOfInterval(
          {
            start: startOfWeek(monthStart, { weekStartsOn: 1 }),
            end: startOfWeek(monthEnd, { weekStartsOn: 1 }),
          },
          { weekStartsOn: 1 }
        )

        return (
          <AppCard key={monthLabel}>
            <AppCardHeader>
              <AppCardTitle className="text-base">{monthLabel}</AppCardTitle>
            </AppCardHeader>
            <AppCardContent>
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th className="w-20" scope="col">
                      Week
                    </th>
                    <th scope="col">DDS</th>
                    <th className="w-12 text-center" scope="col">
                      Watch
                    </th>
                    <th className="w-16 text-center" scope="col">
                      Events
                    </th>
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

                    const eventCount = eventsByWeek.get(weekStartStr) || 0

                    const isDraft = ddsSchedule?.status === 'draft'
                    const isPublished = ddsSchedule?.status === 'published'

                    const rowBgClass = cn({
                      'bg-success/10': isPublished,
                      'bg-warning/10': isDraft,
                    })

                    return (
                      <tr
                        key={weekStartStr}
                        className={cn(
                          'hover:bg-base-200/50 cursor-pointer transition-colors',
                          rowBgClass
                        )}
                        onClick={() => onWeekClick?.(weekStartStr)}
                      >
                        <td className="text-xs">{format(weekStart, 'MMM d')}</td>
                        <td className="text-xs truncate max-w-25">
                          {ddsSchedule?.assignments?.[0] ? (
                            <span className="badge badge-primary badge-xs">
                              {ddsSchedule.assignments[0].member.rank}{' '}
                              {ddsSchedule.assignments[0].member.lastName}
                            </span>
                          ) : (
                            <span className="text-base-content/40">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {dutyWatchSchedule && (
                            <div
                              className={cn('status status-xs mx-auto', {
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
                        </td>
                        <td className="text-center">
                          {eventCount > 0 && (
                            <span className="badge badge-accent badge-xs">{eventCount}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </AppCardContent>
          </AppCard>
        )
      })}
    </div>
  )
}
