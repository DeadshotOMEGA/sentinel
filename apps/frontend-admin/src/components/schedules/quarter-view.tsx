'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementRef,
  type ReactNode,
} from 'react'
import { useQueries } from '@tanstack/react-query'
import { addDays, addMonths, eachWeekOfInterval, endOfMonth, format, startOfWeek } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { scheduleKeys } from '@/hooks/use-schedules'
import { useUnitEvents } from '@/hooks/use-events'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AppBadge } from '@/components/ui/AppBadge'
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from '@/components/ui/AppCard'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface QuarterViewProps {
  quarterStart: Date
  onWeekClick?: (weekStartDate: string) => void
}

interface ScheduleAssignment {
  id: string
  status: 'assigned' | 'confirmed' | 'released'
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
  }
  dutyPosition: {
    id: string
    code: string
    name: string
  } | null
}

interface ScheduleData {
  id: string
  weekStartDate: string
  status: 'draft' | 'published' | 'active' | 'archived'
  dutyRole: {
    id: string
    code: string
    name: string
  }
  assignments?: ScheduleAssignment[]
}

interface EventData {
  id: string
  title: string
  eventDate: string
  startTime: string | null
  endTime: string | null
  location: string | null
  status: string
  eventType: {
    id: string
    name: string
    category: string
  } | null
}

function formatMemberName(member: ScheduleAssignment['member']): string {
  return `${member.rank} ${member.lastName}`
}

function formatMemberFullName(member: ScheduleAssignment['member']): string {
  return `${member.rank} ${member.lastName}, ${member.firstName}`
}

function stopRowNavigation(event: { stopPropagation: () => void }) {
  event.stopPropagation()
}

function HoverDetail({
  trigger,
  children,
  widthClass = 'w-72',
}: {
  trigger: ReactNode
  children: ReactNode
  widthClass?: string
}) {
  const triggerRef = useRef<ElementRef<'button'> | null>(null)
  const popupRef = useRef<ElementRef<'div'> | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({
    opacity: 0,
    pointerEvents: 'none',
    position: 'fixed',
  })

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openPopup = () => {
    clearCloseTimer()
    setIsOpen(true)
  }

  const closePopup = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const updatePosition = () => {
      const triggerElement = triggerRef.current
      const popupElement = popupRef.current

      if (!triggerElement || !popupElement) {
        return
      }

      const triggerRect = triggerElement.getBoundingClientRect()
      const popupRect = popupElement.getBoundingClientRect()
      const viewportPadding = 12
      const gap = 8

      let left = triggerRect.right - popupRect.width
      if (left < viewportPadding) {
        left = viewportPadding
      }
      if (left + popupRect.width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - popupRect.width - viewportPadding
      }

      let top = triggerRect.top - popupRect.height - gap
      if (top < viewportPadding) {
        top = triggerRect.bottom + gap
      }
      if (top + popupRect.height > window.innerHeight - viewportPadding) {
        top = Math.max(viewportPadding, window.innerHeight - popupRect.height - viewportPadding)
      }

      setPopupStyle({
        left,
        opacity: 1,
        pointerEvents: 'auto',
        position: 'fixed',
        top,
        zIndex: 'var(--z-popover)',
      })
    }

    updatePosition()

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      clearCloseTimer()
    }
  }, [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex"
        onBlur={closePopup}
        onClick={stopRowNavigation}
        onFocus={openPopup}
        onKeyDown={stopRowNavigation}
        onMouseEnter={openPopup}
        onMouseLeave={closePopup}
      >
        {trigger}
      </button>
      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popupRef}
              className={cn(
                'card card-sm border border-base-300 bg-base-100 text-base-content shadow-xl',
                widthClass
              )}
              style={popupStyle}
              onClick={stopRowNavigation}
              onKeyDown={stopRowNavigation}
              onMouseEnter={openPopup}
              onMouseLeave={closePopup}
            >
              <div className="card-body gap-(--space-2) p-(--space-3) text-left">{children}</div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export function QuarterView({ quarterStart, onWeekClick }: QuarterViewProps) {
  const months = useMemo(
    () => [quarterStart, addMonths(quarterStart, 1), addMonths(quarterStart, 2)],
    [quarterStart]
  )

  const quarterEnd = endOfMonth(addMonths(quarterStart, 2))
  const gridStart = startOfWeek(quarterStart, { weekStartsOn: 1 })
  const gridEnd = addDays(startOfWeek(addDays(quarterEnd, 1), { weekStartsOn: 1 }), -3)

  const startStr = format(gridStart, 'yyyy-MM-dd')
  const endStr = format(gridEnd, 'yyyy-MM-dd')

  const quarterWeeks = useMemo(
    () =>
      eachWeekOfInterval(
        {
          start: gridStart,
          end: startOfWeek(quarterEnd, { weekStartsOn: 1 }),
        },
        { weekStartsOn: 1 }
      ),
    [gridStart, quarterEnd]
  )

  const weekDateStrings = useMemo(
    () => quarterWeeks.map((weekStart) => format(weekStart, 'yyyy-MM-dd')),
    [quarterWeeks]
  )

  const weekQueries = useQueries({
    queries: weekDateStrings.map((date) => ({
      queryKey: scheduleKeys.week(date),
      queryFn: async () => {
        const response = await apiClient.schedules.getSchedulesByWeek({
          params: { date },
        })
        if (response.status !== 200) {
          throw new Error('Failed to fetch schedules for week')
        }
        return response.body
      },
      enabled: !!date,
    })),
  })

  const schedulesLoading = weekQueries.some((query) => query.isLoading)
  const schedulesError = weekQueries.find((query) => query.isError)
  const schedError = schedulesError?.error

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: evtError,
  } = useUnitEvents({
    startDate: startStr,
    endDate: endStr,
  })

  const schedulesByWeek = new Map<string, ScheduleData[]>()
  for (let index = 0; index < weekDateStrings.length; index += 1) {
    const weekStartDate = weekDateStrings[index]
    const schedules = weekQueries[index]?.data?.data
    if (schedules) {
      schedulesByWeek.set(weekStartDate, schedules)
    }
  }

  const eventsByWeek = useMemo(() => {
    const map = new Map<string, EventData[]>()
    const events = (eventsData?.data ?? []) as EventData[]
    for (const event of events) {
      const weekStart = startOfWeek(new Date(event.eventDate), { weekStartsOn: 1 })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      const existingEvents = map.get(weekKey)
      if (existingEvents) {
        existingEvents.push(event)
      } else {
        map.set(weekKey, [event])
      }
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
          <p className="mt-1 text-sm text-base-content/60">{errMsg}</p>
        </AppCardContent>
      </AppCard>
    )
  }

  if (schedulesLoading || eventsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-(--space-6) lg:grid-cols-3">
      {months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart)
        const monthLabel = format(monthStart, 'MMMM yyyy')
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
              <div className="overflow-x-auto">
                <table className="table table-xs w-full">
                  <thead>
                    <tr>
                      <th className="w-20" scope="col">
                        Week
                      </th>
                      <th scope="col">DDS</th>
                      <th className="w-24 text-center" scope="col">
                        Duty
                      </th>
                      <th className="w-20 text-center" scope="col">
                        Events
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((weekStart) => {
                      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
                      const weekSchedules = schedulesByWeek.get(weekStartStr) ?? []
                      const ddsSchedule = weekSchedules.find(
                        (schedule) => schedule.dutyRole.code === 'DDS'
                      )
                      const dutyWatchSchedule = weekSchedules.find(
                        (schedule) => schedule.dutyRole.code === 'DUTY_WATCH'
                      )
                      const weekEvents = eventsByWeek.get(weekStartStr) ?? []
                      const activeDutyWatchAssignments =
                        dutyWatchSchedule?.assignments?.filter(
                          (assignment) => assignment.status !== 'released'
                        ) ?? []

                      const rowBgClass = cn({
                        'bg-success-fadded text-success-fadded-content':
                          ddsSchedule?.status === 'published',
                        'bg-warning-fadded text-base-content': ddsSchedule?.status === 'draft',
                      })

                      return (
                        <tr
                          key={weekStartStr}
                          className={cn(
                            'transition-colors',
                            onWeekClick && 'cursor-pointer hover:bg-base-200/70',
                            rowBgClass
                          )}
                          onClick={() => onWeekClick?.(weekStartStr)}
                        >
                          <td className="font-mono text-xs text-base-content/70">
                            {format(weekStart, 'MMM d')}
                          </td>
                          <td className="max-w-40 text-xs">
                            {ddsSchedule?.assignments?.[0] ? (
                              <div className="min-w-0">
                                <p className="truncate font-medium text-base-content">
                                  {formatMemberName(ddsSchedule.assignments[0].member)}
                                </p>
                                <p className="truncate text-xs text-base-content/60">
                                  {ddsSchedule.status === 'draft'
                                    ? 'Draft schedule'
                                    : 'Published schedule'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-base-content/40">—</span>
                            )}
                          </td>
                          <td className="text-center">
                            {dutyWatchSchedule ? (
                              <HoverDetail
                                trigger={
                                  <AppBadge
                                    status={
                                      activeDutyWatchAssignments.length > 0 ? 'success' : 'warning'
                                    }
                                    size="sm"
                                    className="cursor-help whitespace-nowrap"
                                  >
                                    {activeDutyWatchAssignments.length > 0
                                      ? `${activeDutyWatchAssignments.length} posts`
                                      : 'Unfilled'}
                                  </AppBadge>
                                }
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">
                                  Duty Watch
                                </p>
                                <p className="text-xs text-base-content/60">
                                  {dutyWatchSchedule.status === 'draft'
                                    ? 'Draft weekly schedule'
                                    : 'Published weekly schedule'}
                                </p>
                                <div className="space-y-(--space-2)">
                                  {(dutyWatchSchedule.assignments ?? []).length > 0 ? (
                                    dutyWatchSchedule.assignments?.map((assignment) => (
                                      <div
                                        key={assignment.id}
                                        className="flex items-start justify-between gap-(--space-2) border-b border-base-300/70 pb-(--space-2) last:border-b-0 last:pb-0"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-base-content">
                                            {formatMemberFullName(assignment.member)}
                                          </p>
                                          <p className="truncate text-xs text-base-content/65">
                                            {assignment.dutyPosition?.name ?? 'Duty Watch'}
                                          </p>
                                        </div>
                                        <AppBadge
                                          status={
                                            assignment.status === 'released' ? 'warning' : 'success'
                                          }
                                          size="sm"
                                          className="shrink-0"
                                        >
                                          {assignment.status === 'released'
                                            ? 'Released'
                                            : 'Assigned'}
                                        </AppBadge>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-base-content/60">
                                      No Duty Watch assignments for this week.
                                    </p>
                                  )}
                                </div>
                              </HoverDetail>
                            ) : (
                              <AppBadge status="neutral" size="sm" className="whitespace-nowrap">
                                None
                              </AppBadge>
                            )}
                          </td>
                          <td className="text-center">
                            {weekEvents.length > 0 ? (
                              <HoverDetail
                                trigger={
                                  <AppBadge
                                    status="info"
                                    size="sm"
                                    className="cursor-help whitespace-nowrap"
                                  >
                                    {weekEvents.length}
                                  </AppBadge>
                                }
                                widthClass="w-80"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/70">
                                  Events This Week
                                </p>
                                <div className="space-y-(--space-2)">
                                  {weekEvents.map((event) => (
                                    <div
                                      key={event.id}
                                      className="border-b border-base-300/70 pb-(--space-2) text-left last:border-b-0 last:pb-0"
                                    >
                                      <p className="text-sm font-medium text-base-content">
                                        {event.title}
                                      </p>
                                      <p className="text-xs text-base-content/65">
                                        {format(new Date(event.eventDate), 'EEE, MMM d')}
                                        {event.startTime ? ` • ${event.startTime}` : ''}
                                        {event.endTime ? `-${event.endTime}` : ''}
                                      </p>
                                      <p className="text-xs text-base-content/60">
                                        {event.location ||
                                          event.eventType?.name ||
                                          'No location set'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </HoverDetail>
                            ) : (
                              <span className="text-base-content/40">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </AppCardContent>
          </AppCard>
        )
      })}
    </div>
  )
}
