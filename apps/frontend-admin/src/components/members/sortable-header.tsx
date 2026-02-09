import type { Column } from '@tanstack/react-table'
import type { MemberResponse } from '@sentinel/contracts'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface SortableHeaderProps {
  column: Column<MemberResponse, unknown>
  label: string
  className?: string
}

export function SortableHeader({ column, label, className }: SortableHeaderProps) {
  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-ghost btn-sm -ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </button>
    </div>
  )
}
