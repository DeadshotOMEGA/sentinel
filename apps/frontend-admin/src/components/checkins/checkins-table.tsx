'use client'

import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCheckins } from '@/hooks/use-checkins'
import { Badge } from '@/components/ui/badge'
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
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'

interface CheckinsTableProps {
  filters: {
    page: number
    limit: number
    memberId?: string
    divisionId?: string
    direction?: string
    startDate?: string
    endDate?: string
  }
  onPageChange: (page: number) => void
}

const columnHelper = createColumnHelper<CheckinWithMemberResponse>()

export function CheckinsTable({ filters, onPageChange }: CheckinsTableProps) {
  const { data, isLoading, isError } = useCheckins(filters)

  const columns = useMemo(
    () => [
      columnHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: (info) => {
          const date = new Date(info.getValue())
          return (
            <div className="text-sm">
              <div className="font-medium">{date.toLocaleDateString()}</div>
              <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'memberName',
        header: 'Member',
        cell: (info) => {
          const member = info.row.original.member
          if (!member) return <span className="text-muted-foreground">Unknown</span>
          return (
            <div className="text-sm">
              <div className="font-medium">
                {member.rank} {member.firstName} {member.lastName}
              </div>
              <div className="text-muted-foreground">{member.serviceNumber}</div>
            </div>
          )
        },
      }),
      columnHelper.accessor('direction', {
        header: 'Direction',
        cell: (info) => {
          const direction = info.getValue()
          return (
            <Badge
              variant={direction === 'IN' ? 'default' : 'secondary'}
              className="flex items-center gap-1 w-fit"
            >
              {direction === 'IN' ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )}
              {direction}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('method', {
        header: 'Method',
        cell: (info) => {
          const method = info.getValue()
          return (
            <Badge variant="outline" className="capitalize">
              {method ?? 'badge'}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('kioskId', {
        header: 'Kiosk',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('flaggedForReview', {
        header: 'Status',
        cell: (info) => {
          const flagged = info.getValue()
          if (!flagged) return <span className="text-muted-foreground">Normal</span>
          return (
            <Badge variant="destructive" className="text-xs">
              Flagged
            </Badge>
          )
        },
      }),
    ],
    []
  )

  const table = useReactTable({
    data: data?.checkins ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  })

  if (isError) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <p className="text-sm text-destructive">Failed to load check-ins</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="animate-pulse p-6 space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
                className="h-24 text-center text-muted-foreground"
              >
                No check-ins found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-4 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={filters.limit.toString()} onValueChange={(_value) => onPageChange(1)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Page {data?.page ?? 1} of {data?.totalPages ?? 1}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(filters.page - 1)}
              disabled={filters.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(filters.page + 1)}
              disabled={filters.page >= (data?.totalPages ?? 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
