'use client'

import { useState, useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { getCellRenderer } from './cell-renderers'
import { JsonViewerModal } from './json-viewer-modal'
import { cn } from '@/lib/utils'
import type { TableDataResponse, ColumnMetadata } from '@sentinel/contracts'

interface DatabaseTableProps {
  data: TableDataResponse | undefined
  isLoading: boolean
  isError: boolean
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

const columnHelper = createColumnHelper<Record<string, unknown>>()

export function DatabaseTable({
  data,
  isLoading,
  isError,
  page,
  limit,
  sortBy,
  sortOrder,
  onPageChange,
  onLimitChange,
  onSortChange,
}: DatabaseTableProps) {
  const [jsonModalOpen, setJsonModalOpen] = useState(false)
  const [jsonModalValue, setJsonModalValue] = useState<unknown>(null)
  const [jsonModalTitle, setJsonModalTitle] = useState('JSON Data')

  const handleJsonClick = (value: unknown, columnName?: string) => {
    setJsonModalValue(value)
    setJsonModalTitle(columnName ? `${columnName} - JSON Data` : 'JSON Data')
    setJsonModalOpen(true)
  }

  // Create columns dynamically from metadata
  const columns = useMemo(() => {
    if (!data?.columns) return []

    return data.columns.map((col: ColumnMetadata) => {
      return columnHelper.accessor(col.name, {
        header: () => {
          const isSorted = sortBy === col.name
          const Icon = !isSorted ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown

          return (
            <button
              className={cn(
                'flex items-center gap-1 hover:text-base-content transition-colors',
                isSorted && 'text-base-content'
              )}
              onClick={() => {
                if (isSorted) {
                  onSortChange(col.name, sortOrder === 'asc' ? 'desc' : 'asc')
                } else {
                  onSortChange(col.name, 'asc')
                }
              }}
            >
              {col.name}
              <Icon className="h-3.5 w-3.5" />
              {col.isPrimaryKey && <span className="text-xs text-primary ml-1">(PK)</span>}
              {col.isForeignKey && <span className="text-xs text-base-content/60 ml-1">(FK)</span>}
            </button>
          )
        },
        cell: (info) => {
          const value = info.getValue()
          return getCellRenderer(col.name, col.type, value, (v) => handleJsonClick(v, col.name))
        },
      })
    })
  }, [data?.columns, sortBy, sortOrder, onSortChange])

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  })

  if (isError) {
    return (
      <div className="bg-base-100 p-6 border shadow-sm">
        <p className="text-sm text-error">Failed to load table data</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-base-100 border shadow-sm">
        <div className="animate-pulse p-6 space-y-4">
          <div className="h-10 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-base-100 p-6 border shadow-sm flex items-center justify-center text-base-content/60">
        Select a table from the sidebar
      </div>
    )
  }

  return (
    <>
      <div className="bg-base-100 border shadow-sm flex flex-col h-full">
        {/* Table header info */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-base-200/30">
          <div>
            <h3 className="font-semibold">{data.table}</h3>
            <p className="text-sm text-base-content/60">{data.total.toLocaleString()} total rows</p>
          </div>
          <div className="text-sm text-base-content/60">{data.columns.length} columns</div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-base-100 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-base-100">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-base-content/60"
                  >
                    No data in this table
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">Rows per page</span>
            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                onLimitChange(parseInt(value, 10))
                onPageChange(1)
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-base-content/60">
              Page {page} of {data.totalPages}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= data.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      <JsonViewerModal
        open={jsonModalOpen}
        onOpenChange={setJsonModalOpen}
        value={jsonModalValue}
        title={jsonModalTitle}
      />
    </>
  )
}
