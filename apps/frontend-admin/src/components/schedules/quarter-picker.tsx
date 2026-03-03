'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'

/**
 * Quarter navigation component for viewing 3-month periods.
 *
 * @example
 * ```tsx
 * const [quarterStart, setQuarterStart] = useState(startOfQuarter(new Date()))
 * <QuarterPicker quarterStart={quarterStart} onQuarterChange={setQuarterStart} />
 * ```
 */

interface QuarterPickerProps {
  /** First day of the first month in quarter */
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
  const endMonth = addMonths(quarterStart, 2)
  const quarterLabel = `${format(quarterStart, 'MMM')} - ${format(endMonth, 'MMM')} ${year}`
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
