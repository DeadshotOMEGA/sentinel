'use client'

import { useState, useMemo } from 'react'
import { addDays, startOfMonth } from 'date-fns'
import { WeekPicker } from '@/components/schedules/week-picker'
import { DdsScheduleCard } from '@/components/schedules/dds-schedule-card'
import { DutyWatchCard } from '@/components/schedules/duty-watch-card'
import { ScheduleViewTabs, type ScheduleView } from '@/components/schedules/schedule-view-tabs'
import { MonthPicker } from '@/components/schedules/month-picker'
import { QuarterPicker } from '@/components/schedules/quarter-picker'
import { MonthCalendarView } from '@/components/schedules/month-calendar-view'
import { QuarterView } from '@/components/schedules/quarter-view'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CalendarDays, Info } from 'lucide-react'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateISO(date: Date): string {
  return date.toISOString().substring(0, 10)
}

function getQuarterStart(date: Date): Date {
  const month = date.getMonth()
  const quarterMonth = month - (month % 3)
  return new Date(date.getFullYear(), quarterMonth, 1)
}

export default function SchedulesPage() {
  const [activeView, setActiveView] = useState<ScheduleView>('week')

  // Week view state
  const [weekStartDate, setWeekStartDate] = useState(() => {
    return formatDateISO(getMonday(new Date()))
  })

  // Second week for 2-week side-by-side
  const nextWeekStartDate = useMemo(() => {
    const current = new Date(weekStartDate + 'T00:00:00')
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
          <p className="text-base-content/60">
            Manage DDS and Duty Watch assignments
          </p>
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
        {activeView === 'week' && (
          <>
            {/* 2-Week Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Week */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Week of {new Date(weekStartDate + 'T00:00:00').toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
                <DdsScheduleCard weekStartDate={weekStartDate} />
                <DutyWatchCard weekStartDate={weekStartDate} />
              </div>

              {/* Next Week */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Week of {new Date(nextWeekStartDate + 'T00:00:00').toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
                <DdsScheduleCard weekStartDate={nextWeekStartDate} />
                <DutyWatchCard weekStartDate={nextWeekStartDate} />
              </div>
            </div>
          </>
        )}

        {activeView === 'month' && (
          <MonthCalendarView
            currentMonth={currentMonth}
            onWeekClick={handleWeekClickFromCalendar}
          />
        )}

        {activeView === 'quarter' && (
          <QuarterView
            quarterStart={quarterStart}
            onWeekClick={handleWeekClickFromCalendar}
          />
        )}
      </div>
    </div>
  )
}
