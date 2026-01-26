'use client'

import { useState, useEffect } from 'react'
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
import { useEnums } from '@/hooks/use-enums'
import { X, Search } from 'lucide-react'

interface MembersFiltersProps {
  filters: {
    divisionId?: string
    rank?: string
    status?: string
    search?: string
  }
  onFilterChange: (filters: Partial<MembersFiltersProps['filters']>) => void
}

export function MembersFilters({ filters, onFilterChange }: MembersFiltersProps) {
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
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
    })
  }

  const hasActiveFilters = filters.divisionId || filters.rank || filters.status || filters.search

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name or service number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
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

        {/* Rank Filter */}
        <div>
          <Label htmlFor="rank">Rank</Label>
          <Select
            value={filters.rank ?? 'all'}
            onValueChange={(value) => onFilterChange({ rank: value === 'all' ? undefined : value })}
          >
            <SelectTrigger id="rank">
              <SelectValue placeholder="All Ranks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ranks</SelectItem>
              {enums?.ranks.map((rank: string) => (
                <SelectItem key={rank} value={rank}>
                  {rank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) =>
              onFilterChange({ status: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
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
