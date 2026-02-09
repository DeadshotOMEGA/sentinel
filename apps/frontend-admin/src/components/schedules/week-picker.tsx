'use client'

import { addDays } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMonday, formatDateISO, parseDateString } from '@/lib/date-utils'

export type NavigationDirection = -1 | 0 | 1

interface WeekPickerProps {
  weekStartDate: string // YYYY-MM-DD format
  onWeekChange: (newDate: string, direction: NavigationDirection) => void
}

function formatWeekLabel(dateStr: string): string {
  const date = parseDateString(dateStr)
  const endDate = addDays(date, 6)

  const startMonth = date.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' })
  const startDay = date.getDate()
  const endDay = endDate.getDate()
  const year = date.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

export function WeekPicker({ weekStartDate, onWeekChange }: WeekPickerProps) {
  const currentMonday = getMonday(new Date())
  const isCurrentWeek = weekStartDate === formatDateISO(currentMonday)

  const handlePreviousWeek = () => {
    const date = parseDateString(weekStartDate)
    onWeekChange(formatDateISO(addDays(date, -7)), -1)
  }

  const handleNextWeek = () => {
    const date = parseDateString(weekStartDate)
    onWeekChange(formatDateISO(addDays(date, 7)), 1)
  }

  const handleToday = () => {
    onWeekChange(formatDateISO(currentMonday), 0)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePreviousWeek} title="Previous week">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 px-4 py-2 bg-base-200 rounded-md min-w-[200px] justify-center">
        <CalendarDays className="h-4 w-4 text-base-content/60" />
        <span className="font-medium">{formatWeekLabel(weekStartDate)}</span>
      </div>

      <Button variant="outline" size="icon" onClick={handleNextWeek} title="Next week">
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleToday}
        className={isCurrentWeek ? 'invisible' : ''}
      >
        Today
      </Button>
    </div>
  )
}
