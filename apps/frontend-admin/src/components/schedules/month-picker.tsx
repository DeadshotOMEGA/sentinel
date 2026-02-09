'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'

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
      <button
        type="button"
        className="btn btn-outline btn-square btn-md"
        onClick={handlePrevious}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="min-w-[180px] text-center">
        <h2 className="text-lg font-semibold" aria-live="polite">
          {monthLabel}
        </h2>
      </div>

      <button
        type="button"
        className="btn btn-outline btn-square btn-md"
        onClick={handleNext}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <button type="button" className="btn btn-ghost btn-sm" onClick={handleToday}>
        Today
      </button>
    </div>
  )
}
