'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WeekPickerProps {
  weekStartDate: string // YYYY-MM-DD format
  onWeekChange: (newDate: string) => void
}

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 6)

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

export function WeekPicker({ weekStartDate, onWeekChange }: WeekPickerProps) {
  const currentMonday = getMonday(new Date())
  const isCurrentWeek = weekStartDate === formatDateISO(currentMonday)

  const handlePreviousWeek = () => {
    const date = new Date(weekStartDate + 'T00:00:00')
    date.setDate(date.getDate() - 7)
    onWeekChange(formatDateISO(date))
  }

  const handleNextWeek = () => {
    const date = new Date(weekStartDate + 'T00:00:00')
    date.setDate(date.getDate() + 7)
    onWeekChange(formatDateISO(date))
  }

  const handleToday = () => {
    onWeekChange(formatDateISO(currentMonday))
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

      {!isCurrentWeek && (
        <Button variant="ghost" size="sm" onClick={handleToday}>
          Today
        </Button>
      )}
    </div>
  )
}
