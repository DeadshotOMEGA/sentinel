'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { TID } from '@/lib/test-ids'

interface BadgesFiltersProps {
  filters: {
    search?: string
    status?: string
    assignmentType?: string
  }
  onFilterChange: (filters: Partial<BadgesFiltersProps['filters']>) => void
}

export function BadgesFilters({ filters, onFilterChange }: BadgesFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '')

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
      search: undefined,
      status: undefined,
      assignmentType: undefined,
    })
  }

  const hasActiveFilters = filters.search || filters.status || filters.assignmentType

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <fieldset className="fieldset md:col-span-2">
          <legend className="fieldset-legend">Search</legend>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/60" />
            <input
              className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed pl-9"
              id="badge-search"
              placeholder="Search by serial number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid={TID.badges.filter.search}
            />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Status</legend>
          <select
            id="badge-status"
            className="select"
            value={filters.status ?? 'all'}
            onChange={(e) =>
              onFilterChange({ status: e.target.value === 'all' ? undefined : e.target.value })
            }
            data-testid={TID.badges.filter.status}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="lost">Lost</option>
            <option value="damaged">Damaged</option>
          </select>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Assignment</legend>
          <select
            id="badge-assignment-type"
            className="select"
            value={filters.assignmentType ?? 'all'}
            onChange={(e) =>
              onFilterChange({
                assignmentType: e.target.value === 'all' ? undefined : e.target.value,
              })
            }
            data-testid={TID.badges.filter.assignmentType}
          >
            <option value="all">All Assignments</option>
            <option value="member">Member</option>
            <option value="visitor">Visitor</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </fieldset>

        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              className="btn btn-outline btn-sm w-full"
              onClick={handleClearFilters}
              data-testid={TID.badges.filter.clear}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
