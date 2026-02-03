'use client'

import { useState, useMemo } from 'react'
import { Search, Database, ChevronRight, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TableInfo, TableName } from '@sentinel/contracts'
import { TABLE_CATEGORIES } from '@sentinel/contracts'

interface TableSidebarProps {
  tables: TableInfo[]
  selectedTable: TableName | null
  onSelectTable: (table: TableName) => void
  isLoading?: boolean
}

// Category metadata for styling
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Core: { icon: '🏢', color: 'text-blue-500' },
  Attendance: { icon: '📋', color: 'text-green-500' },
  'Unit Events': { icon: '📅', color: 'text-indigo-500' },
  Training: { icon: '📚', color: 'text-purple-500' },
  Audit: { icon: '🔍', color: 'text-orange-500' },
  Enums: { icon: '📝', color: 'text-cyan-500' },
  Config: { icon: '⚙️', color: 'text-gray-500' },
  DDS: { icon: '🎖️', color: 'text-amber-500' },
}

export function TableSidebar({
  tables,
  selectedTable,
  onSelectTable,
  isLoading,
}: TableSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Group tables by category
  const groupedTables = useMemo(() => {
    const groups: Record<string, TableInfo[]> = {}

    for (const [category, tableNames] of Object.entries(TABLE_CATEGORIES)) {
      groups[category] = tables.filter((t) => tableNames.includes(t.name))
    }

    return groups
  }, [tables])

  // Filter tables by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedTables
    }

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, TableInfo[]> = {}

    for (const [category, categoryTables] of Object.entries(groupedTables)) {
      const matching = categoryTables.filter((t) => t.name.toLowerCase().includes(query))
      if (matching.length > 0) {
        filtered[category] = matching
      }
    }

    return filtered
  }, [groupedTables, searchQuery])

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const formatRowCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className="w-64 border-r bg-base-100 flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-base-content/60" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-base-content/60">
            <Database className="h-5 w-5 animate-pulse mr-2" />
            Loading tables...
          </div>
        ) : Object.keys(filteredGroups).length === 0 ? (
          <div className="text-center py-8 text-base-content/60 text-sm">No tables found</div>
        ) : (
          Object.entries(filteredGroups).map(([category, categoryTables]) => {
            const isCollapsed = collapsedCategories.has(category)
            const meta = CATEGORY_META[category] || { icon: '📁', color: 'text-gray-500' }

            return (
              <div key={category} className="mb-2">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-base-content/60 hover:text-base-content transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{meta.icon}</span>
                  <span>{category}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {categoryTables.length}
                  </Badge>
                </button>

                {/* Tables in category */}
                {!isCollapsed && (
                  <div className="ml-4 space-y-0.5">
                    {categoryTables.map((table) => (
                      <button
                        key={table.name}
                        onClick={() => onSelectTable(table.name as TableName)}
                        className={cn(
                          'w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors',
                          selectedTable === table.name
                            ? 'bg-accent text-base-content font-medium'
                            : 'text-base-content/80 hover:bg-accent/50'
                        )}
                      >
                        <span className="truncate">{table.name}</span>
                        <Badge variant="outline" className="text-xs font-mono ml-2 shrink-0">
                          {formatRowCount(table.rowCount)}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
