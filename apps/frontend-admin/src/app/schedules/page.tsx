'use client'

import { useState, useMemo } from 'react'
import { addDays, startOfMonth } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { WeekPicker, type NavigationDirection } from '@/components/schedules/week-picker'
import { WeekColumn } from '@/components/schedules/week-column'
import { ScheduleViewTabs, type ScheduleView } from '@/components/schedules/schedule-view-tabs'
import { MonthPicker } from '@/components/schedules/month-picker'
import { QuarterPicker } from '@/components/schedules/quarter-picker'
import { MonthCalendarView } from '@/components/schedules/month-calendar-view'
import { QuarterView } from '@/components/schedules/quarter-view'
import { ScheduleErrorBoundary } from '@/components/schedules/error-boundary'
import { CalendarDays } from 'lucide-react'
import { getMonday, formatDateISO, getQuarterStart, parseDateString } from '@/lib/date-utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

const EASE_STANDARD: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

const subtleSlideVariants = {
  initial: (dir: NavigationDirection) => ({
    x: dir * 32,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.35, ease: EASE_STANDARD },
      opacity: { duration: 0.35 },
    },
  },
  exit: (dir: NavigationDirection) => ({
    x: dir * -32,
    opacity: 0,
    transition: {
      x: { duration: 0.3, ease: EASE_STANDARD },
      opacity: { duration: 0.3 },
    },
  }),
}

const instantVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
}

export default function SchedulesPage() {
  const [activeView, setActiveView] = useState<ScheduleView>('week')
  const [direction, setDirection] = useState<NavigationDirection>(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const activeVariants = prefersReducedMotion ? instantVariants : subtleSlideVariants

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

  const handleWeekChange = (newDate: string, dir: NavigationDirection) => {
    setDirection(dir)
    setWeekStartDate(newDate)
  }

  const handleWeekClickFromCalendar = (weekStartStr: string) => {
    setDirection(0)
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
            <WeekPicker weekStartDate={weekStartDate} onWeekChange={handleWeekChange} />
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
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={weekStartDate}
                custom={direction}
                variants={activeVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <WeekColumn weekStartDate={weekStartDate} />
                <WeekColumn weekStartDate={nextWeekStartDate} />
              </motion.div>
            </AnimatePresence>
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
