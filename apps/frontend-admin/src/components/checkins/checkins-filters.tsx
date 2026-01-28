'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDateInput}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>

        {/* End Date */}
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDateInput}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>

        {/* Direction Filter */}
        <div>
          <Label htmlFor="direction">Direction</Label>
          <Select
            value={filters.direction ?? 'all'}
            onValueChange={(value) =>
              onFilterChange({ direction: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger id="direction">
              <SelectValue placeholder="All Directions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Directions</SelectItem>
              <SelectItem value="IN">Check In</SelectItem>
              <SelectItem value="OUT">Check Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Division Filter */}
        <div>
          <Label htmlFor="division">Division</Label>
          <Select
            value={filters.divisionId ?? 'all'}
            onValueChange={(value) =>
              onFilterChange({ divisionId: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger id="division">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions?.divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
