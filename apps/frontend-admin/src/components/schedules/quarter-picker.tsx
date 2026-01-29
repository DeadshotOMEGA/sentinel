'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, getQuarter } from 'date-fns'
import { Button } from '@/components/ui/button'

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
    onQuarterChange(subMonths(quarterStart, 3))
  }

  const handleNext = () => {
    onQuarterChange(addMonths(quarterStart, 3))
  }

  // Generate quarter label (e.g., "Q1 2026" or "Jan - Mar 2026")
  const quarter = getQuarter(quarterStart)
  const year = format(quarterStart, 'yyyy')
  const endMonth = addMonths(quarterStart, 2)
  const quarterLabel = `${format(quarterStart, 'MMM')} - ${format(endMonth, 'MMM')} ${year}`
  const shortLabel = `Q${quarter} ${year}`

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        aria-label="Previous quarter"
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[180px] text-center">
        <h2 className="text-lg font-semibold" aria-live="polite">
          <span className="hidden sm:inline">{quarterLabel}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </h2>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        aria-label="Next quarter"
        type="button"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
