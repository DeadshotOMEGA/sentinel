'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { useQueries } from '@tanstack/react-query'
import { Loader2, AlertCircle } from 'lucide-react'
import { scheduleKeys } from '@/hooks/use-schedules'
import { useUnitEvents } from '@/hooks/use-events'
import { apiClient } from '@/lib/api-client'
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from '@/components/ui/AppCard'
import { ModalProvider } from './modals/modal-context'
import { CalendarGrid } from './month-calendar/calendar-grid'
import { DdsModal } from './modals/dds-modal'
import { DutyWatchModal } from './modals/duty-watch-modal'
import { EventDetailModal } from './modals/event-detail-modal'
import { useCalendarDates } from './month-calendar/use-calendar-dates'

interface MonthCalendarViewProps {
  currentMonth: Date
  onWeekClick?: (weekStartDate: string) => void
}

interface EventData {
  id: string
  title: string
  eventDate: string
  startTime: string | null
  endTime: string | null
}

export function MonthCalendarView({ currentMonth, onWeekClick }: MonthCalendarViewProps) {
  const { startStr, endStr, weeks } = useCalendarDates(currentMonth)

  // Fetch each week individually using getSchedulesByWeek (includes assignments)
  const weekDateStrings = useMemo(
    () => weeks.map((w) => format(w, 'yyyy-MM-dd')),
    [weeks]
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

  const schedulesLoading = weekQueries.some((q) => q.isLoading)
  const schedulesError = weekQueries.find((q) => q.isError)
  const schedError = schedulesError?.error

  // Build schedulesByWeek map from individual week queries
  const schedulesByWeek = useMemo(() => {
    const map = new Map<string, Array<{
      id: string
      weekStartDate: string
      status: string
      dutyRole: { id: string; code: string; name: string }
      assignments?: Array<{
        id: string
        memberId: string
        member: { id: string; rank: string; firstName: string; lastName: string }
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
    }>>()
    for (let i = 0; i < weekDateStrings.length; i++) {
      const date = weekDateStrings[i]
      const data = weekQueries[i]?.data?.data
      if (data) {
        map.set(date, data)
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDateStrings, ...weekQueries.map((q) => q.data)])

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: evtError,
  } = useUnitEvents({ startDate: startStr, endDate: endStr })

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

  return (
    <ModalProvider>
      <CalendarGrid
        weeks={weeks}
        currentMonth={currentMonth}
        schedulesByWeek={schedulesByWeek}
        eventsByDate={eventsByDate}
        onWeekClick={onWeekClick}
      />
      <DdsModal />
      <DutyWatchModal />
      <EventDetailModal />
    </ModalProvider>
  )
}
