'use client'

import { useState, useMemo } from 'react'
import { addDays, startOfMonth } from 'date-fns'
import { WeekPicker } from '@/components/schedules/week-picker'
import { WeekColumn } from '@/components/schedules/week-column'
import { ScheduleViewTabs, type ScheduleView } from '@/components/schedules/schedule-view-tabs'
import { MonthPicker } from '@/components/schedules/month-picker'
import { QuarterPicker } from '@/components/schedules/quarter-picker'
import { MonthCalendarView } from '@/components/schedules/month-calendar-view'
import { QuarterView } from '@/components/schedules/quarter-view'
import { ScheduleErrorBoundary } from '@/components/schedules/error-boundary'
import { CalendarDays } from 'lucide-react'
import { getMonday, formatDateISO, getQuarterStart, parseDateString } from '@/lib/date-utils'

export default function SchedulesPage() {
  const [activeView, setActiveView] = useState<ScheduleView>('week')

  // Week view state
  const [weekStartDate, setWeekStartDate] = useState(() => {
    return formatDateISO(getMonday(new Date()))
  })

  // Second week for 2-week side-by-side
  const nextWeekStartDate = useMemo(() => {
    const current = parseDateString(weekStartDate)
    return formatDateISO(addDays(current, 7))
  }, [weekStartDate])

  // Month view state
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))

  // Quarter view state
  const [quarterStart, setQuarterStart] = useState(() => getQuarterStart(new Date()))

  const handleWeekClickFromCalendar = (weekStartStr: string) => {
    setWeekStartDate(weekStartStr)
    setActiveView('week')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Schedules
          </h1>
          <p className="text-base-content/60">Manage DDS and Duty Watch assignments</p>
        </div>
        <div className="flex items-center gap-4">
          <ScheduleViewTabs activeView={activeView} onViewChange={setActiveView} />
          {activeView === 'week' && (
            <WeekPicker weekStartDate={weekStartDate} onWeekChange={setWeekStartDate} />
          )}
          {activeView === 'month' && (
            <MonthPicker currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
          )}
          {activeView === 'quarter' && (
            <QuarterPicker quarterStart={quarterStart} onQuarterChange={setQuarterStart} />
          )}
        </div>
      </div>

      {/* View Content */}
      <div id="schedule-view-panel" role="tabpanel">
        <ScheduleErrorBoundary>
          {activeView === 'week' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeekColumn weekStartDate={weekStartDate} />
              <WeekColumn weekStartDate={nextWeekStartDate} />
            </div>
          )}

          {activeView === 'month' && (
            <MonthCalendarView
              currentMonth={currentMonth}
              onWeekClick={handleWeekClickFromCalendar}
            />
          )}

          {activeView === 'quarter' && (
            <QuarterView quarterStart={quarterStart} onWeekClick={handleWeekClickFromCalendar} />
          )}
        </ScheduleErrorBoundary>
      </div>
    </div>
  )
}
