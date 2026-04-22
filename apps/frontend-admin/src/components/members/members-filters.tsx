'use client'

import { useState, useEffect } from 'react'

import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { useQualificationTypes } from '@/hooks/use-qualifications'
import { X, Search } from 'lucide-react'
import { TID } from '@/lib/test-ids'

interface MembersFiltersProps {
  filters: {
    scope?: 'nominal_roll' | 'civilian_manual' | 'all'
    divisionId?: string
    rank?: string
    status?: string
    search?: string
    qualificationCode?: string
  }
  onFilterChange: (filters: Partial<MembersFiltersProps['filters']>) => void
  canViewPersonnelScope: boolean
}

export function MembersFilters({
  filters,
  onFilterChange,
  canViewPersonnelScope,
}: MembersFiltersProps) {
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
      scope: 'nominal_roll',
      divisionId: undefined,
      rank: undefined,
      status: 'active',
      search: undefined,
      qualificationCode: undefined,
    })
  }

  const hasActiveFilters =
    (canViewPersonnelScope && filters.scope && filters.scope !== 'nominal_roll') ||
    filters.divisionId ||
    filters.rank ||
    (filters.status && filters.status !== 'active') ||
    filters.search ||
    filters.qualificationCode

  return (
    <div className="p-4">
      <div
        className={`grid grid-cols-1 gap-4 ${canViewPersonnelScope ? 'md:grid-cols-7' : 'md:grid-cols-6'}`}
      >
        <label className="input w-full md:col-span-2">
          <span className="label">Search</span>
          <Search className="h-4 w-4 text-base-content/60" />
          <input
            id="search"
            className="grow"
            placeholder="Search by name or service number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid={TID.members.filter.search}
          />
        </label>

        {canViewPersonnelScope && (
          <label className="select w-full">
            <span className="label">Roster Scope</span>
            <select
              id="scope"
              value={filters.scope ?? 'nominal_roll'}
              onChange={(e) =>
                onFilterChange({
                  scope: e.target.value as 'nominal_roll' | 'civilian_manual' | 'all',
                })
              }
              data-testid={TID.members.filter.scope}
            >
              <option value="nominal_roll">Nominal Roll</option>
              <option value="civilian_manual">Civilian Staff</option>
              <option value="all">All Personnel</option>
            </select>
          </label>
        )}

        <label className="select w-full">
          <span className="label">Division</span>
          <select
            id="division"
            value={filters.divisionId ?? 'all'}
            onChange={(e) =>
              onFilterChange({ divisionId: e.target.value === 'all' ? undefined : e.target.value })
            }
            data-testid={TID.members.filter.division}
          >
            <option value="all">All Divisions</option>
            {divisions?.divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </label>

        <label className="select w-full">
          <span className="label">Rank</span>
          <select
            id="rank"
            value={filters.rank ?? 'all'}
            onChange={(e) =>
              onFilterChange({ rank: e.target.value === 'all' ? undefined : e.target.value })
            }
            data-testid={TID.members.filter.rank}
          >
            <option value="all">All Ranks</option>
            {enums?.ranks.map((rank: string) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </label>

        <label className="select w-full">
          <span className="label">Status</span>
          <select
            id="status"
            value={filters.status ?? 'active'}
            onChange={(e) =>
              onFilterChange({ status: e.target.value === 'all' ? undefined : e.target.value })
            }
            data-testid={TID.members.filter.status}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="select w-full">
          <span className="label">Qualification</span>
          <select
            id="qualification"
            value={filters.qualificationCode ?? 'all'}
            onChange={(e) =>
              onFilterChange({
                qualificationCode: e.target.value === 'all' ? undefined : e.target.value,
              })
            }
            data-testid={TID.members.filter.qualification}
          >
            <option value="all">All Qualifications</option>
            {qualificationTypes?.map((type) => (
              <option key={type.id} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
        </label>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              className="btn btn-outline btn-sm w-full"
              onClick={handleClearFilters}
              data-testid={TID.members.filter.clear}
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
