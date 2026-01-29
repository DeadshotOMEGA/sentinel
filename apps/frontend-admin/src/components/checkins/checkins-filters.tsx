'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDivisions } from '@/hooks/use-divisions'
import { X } from 'lucide-react'

interface CheckinsFiltersProps {
  filters: {
    divisionId?: string
    direction?: string
    startDate?: string
    endDate?: string
  }
  onFilterChange: (filters: Partial<CheckinsFiltersProps['filters']>) => void
}

export function CheckinsFilters({ filters, onFilterChange }: CheckinsFiltersProps) {
  const { data: divisions } = useDivisions()
  const [startDateInput, setStartDateInput] = useState(filters.startDate ?? '')
  const [endDateInput, setEndDateInput] = useState(filters.endDate ?? '')

  const handleStartDateChange = (value: string) => {
    setStartDateInput(value)
    if (value) {
      // Convert to ISO timestamp for API
      const date = new Date(value)
      date.setHours(0, 0, 0, 0)
      onFilterChange({ startDate: date.toISOString() })
    } else {
      onFilterChange({ startDate: undefined })
    }
  }

  const handleEndDateChange = (value: string) => {
    setEndDateInput(value)
    if (value) {
      // Convert to ISO timestamp for API
      const date = new Date(value)
      date.setHours(23, 59, 59, 999)
      onFilterChange({ endDate: date.toISOString() })
    } else {
      onFilterChange({ endDate: undefined })
    }
  }

  const handleClearFilters = () => {
    setStartDateInput('')
    setEndDateInput('')
    onFilterChange({
      divisionId: undefined,
      direction: undefined,
      startDate: undefined,
      endDate: undefined,
    })
  }

  const hasActiveFilters =
    filters.divisionId || filters.direction || filters.startDate || filters.endDate

  return (
    <div className="bg-base-100 p-4 rounded-lg border shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Start Date */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Start Date</legend>
          <Input
            id="startDate"
            type="date"
            value={startDateInput}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </fieldset>

        {/* End Date */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">End Date</legend>
          <Input
            id="endDate"
            type="date"
            value={endDateInput}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </fieldset>

        {/* Direction Filter */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Direction</legend>
          <select
            id="direction"
            className="select"
            value={filters.direction ?? 'all'}
            onChange={(e) =>
              onFilterChange({ direction: e.target.value === 'all' ? undefined : e.target.value })
            }
          >
            <option value="all">All Directions</option>
            <option value="in">Check In</option>
            <option value="out">Check Out</option>
          </select>
        </fieldset>

        {/* Division Filter */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Division</legend>
          <select
            id="division"
            className="select"
            value={filters.divisionId ?? 'all'}
            onChange={(e) =>
              onFilterChange({ divisionId: e.target.value === 'all' ? undefined : e.target.value })
            }
          >
            <option value="all">All Divisions</option>
            {divisions?.divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
