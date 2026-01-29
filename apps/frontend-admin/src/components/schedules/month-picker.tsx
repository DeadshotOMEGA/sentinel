'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'
import { Button } from '@/components/ui/button'

/**
 * Month navigation component with prev/next controls and today button.
 *
 * @example
 * ```tsx
 * const [month, setMonth] = useState(startOfMonth(new Date()))
 * <MonthPicker currentMonth={month} onMonthChange={setMonth} />
 * ```
 */

interface MonthPickerProps {
  /** First day of the displayed month */
  currentMonth: Date
  /** Callback when month changes */
  onMonthChange: (month: Date) => void
}

export function MonthPicker({ currentMonth, onMonthChange }: MonthPickerProps) {
  const handlePrevious = () => {
    onMonthChange(subMonths(currentMonth, 1))
  }

  const handleNext = () => {
    onMonthChange(addMonths(currentMonth, 1))
  }

  const handleToday = () => {
    onMonthChange(startOfMonth(new Date()))
  }

  const monthLabel = format(currentMonth, 'MMMM yyyy')

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        aria-label="Previous month"
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[180px] text-center">
        <h2 className="text-lg font-semibold" aria-live="polite">
          {monthLabel}
        </h2>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        aria-label="Next month"
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={handleToday} type="button">
        Today
      </Button>
    </div>
  )
}
