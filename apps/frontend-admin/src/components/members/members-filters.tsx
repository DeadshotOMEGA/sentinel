'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { useQualificationTypes } from '@/hooks/use-qualifications'
import { X, Search } from 'lucide-react'

interface MembersFiltersProps {
  filters: {
    divisionId?: string
    rank?: string
    status?: string
    search?: string
    qualificationCode?: string
  }
  onFilterChange: (filters: Partial<MembersFiltersProps['filters']>) => void
}

export function MembersFilters({ filters, onFilterChange }: MembersFiltersProps) {
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const { data: qualificationTypes } = useQualificationTypes()
  const [searchInput, setSearchInput] = useState(filters.search ?? '')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ search: searchInput || undefined })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, filters.search, onFilterChange])

  const handleClearFilters = () => {
    setSearchInput('')
    onFilterChange({
      divisionId: undefined,
      rank: undefined,
      status: undefined,
      search: undefined,
      qualificationCode: undefined,
    })
  }

  const hasActiveFilters =
    filters.divisionId ||
    filters.rank ||
    filters.status ||
    filters.search ||
    filters.qualificationCode

  return (
    <div className="p-4 rounded-lg border-none mb-6">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Search */}
        <fieldset className="fieldset md:col-span-2">
          <legend className="fieldset-legend">Search</legend>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/60" />
            <Input
              id="search"
              placeholder="Search by name or service number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
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

        {/* Rank Filter */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Rank</legend>
          <select
            id="rank"
            className="select"
            value={filters.rank ?? 'all'}
            onChange={(e) => onFilterChange({ rank: e.target.value === 'all' ? undefined : e.target.value })}
          >
            <option value="all">All Ranks</option>
            {enums?.ranks.map((rank: string) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Status Filter */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Status</legend>
          <select
            id="status"
            className="select"
            value={filters.status ?? 'all'}
            onChange={(e) =>
              onFilterChange({ status: e.target.value === 'all' ? undefined : e.target.value })
            }
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </fieldset>

        {/* Qualification Filter */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Qualification</legend>
          <select
            id="qualification"
            className="select"
            value={filters.qualificationCode ?? 'all'}
            onChange={(e) =>
              onFilterChange({ qualificationCode: e.target.value === 'all' ? undefined : e.target.value })
            }
          >
            <option value="all">All Qualifications</option>
            {qualificationTypes?.data.map((type) => (
              <option key={type.id} value={type.code}>
                {type.name}
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
