'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'

/**
 * Month range navigation component for viewing six-month periods.
 *
 * @example
 * ```tsx
 * const [rangeStart, setRangeStart] = useState(startOfMonth(new Date()))
 * <QuarterPicker quarterStart={rangeStart} onQuarterChange={setRangeStart} />
 * ```
 */

interface QuarterPickerProps {
  /** First day of the first month in range */
  quarterStart: Date
  /** Callback when quarter changes */
  onQuarterChange: (start: Date) => void
}

export function QuarterPicker({ quarterStart, onQuarterChange }: QuarterPickerProps) {
  const handlePrevious = () => {
    onQuarterChange(subMonths(quarterStart, 1))
  }

  const handleNext = () => {
    onQuarterChange(addMonths(quarterStart, 1))
  }

  const year = format(quarterStart, 'yyyy')
  const endMonth = addMonths(quarterStart, 5)
  const endYear = format(endMonth, 'yyyy')
  const quarterLabel =
    year === endYear
      ? `${format(quarterStart, 'MMM')} - ${format(endMonth, 'MMM')} ${year}`
      : `${format(quarterStart, 'MMM yyyy')} - ${format(endMonth, 'MMM yyyy')}`
  const shortLabel = `${format(quarterStart, 'MMM')} - ${format(endMonth, 'MMM')}`

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-outline btn-square btn-md"
        onClick={handlePrevious}
        aria-label="Previous month range"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="min-w-[180px] text-center">
        <h2 className="text-lg font-semibold" aria-live="polite">
          <span className="hidden sm:inline">{quarterLabel}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </h2>
      </div>

      <button
        type="button"
        className="btn btn-outline btn-square btn-md"
        onClick={handleNext}
        aria-label="Next month range"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
