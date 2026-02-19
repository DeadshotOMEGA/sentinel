'use client'

import { useMemo, useState } from 'react'
import { TID } from '@/lib/test-ids'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCheckins } from '@/hooks/use-checkins'
import { useAuthStore, AccountLevel } from '@/store/auth-store'

import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp, User, Users, Pencil } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'
import { EditCheckinModal } from './edit-checkin-modal'

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
  const member = useAuthStore((state) => state.member)
  const canEdit = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  const [editingCheckin, setEditingCheckin] = useState<CheckinWithMemberResponse | null>(null)

  const columns = useMemo(
    () => [
      columnHelper.accessor('timestamp', {
        header: 'Timestamp',
        cell: (info) => {
          const date = new Date(info.getValue())
          return (
            <div className="text-sm">
              <div className="font-medium">{date.toLocaleDateString()}</div>
              <div className="text-base-content/60">{date.toLocaleTimeString()}</div>
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'type',
        header: 'Type',
        cell: (info) => {
          const row = info.row.original
          const isVisitor = row.type === 'visitor'
          return (
            <span
              className={`badge ${isVisitor ? 'badge-secondary' : 'badge-outline'} flex items-center gap-1 w-fit`}
            >
              {isVisitor ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {isVisitor ? 'Visitor' : 'Member'}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'personName',
        header: 'Name',
        cell: (info) => {
          const row = info.row.original
          if (row.type === 'visitor') {
            return (
              <div className="text-sm">
                <div className="font-medium">
                  {row.visitorDisplayName ?? row.visitorName ?? 'Unknown Visitor'}
                </div>
                {row.visitorOrganization && (
                  <div className="text-base-content/60">{row.visitorOrganization}</div>
                )}
              </div>
            )
          }
          const member = row.member
          if (!member) return <span className="text-base-content/60">Unknown</span>
          return (
            <div className="text-sm">
              <div className="font-medium">
                {member.displayName ?? `${member.rank} ${member.firstName} ${member.lastName}`}
              </div>
              <div className="text-base-content/60">{member.serviceNumber}</div>
            </div>
          )
        },
      }),
      columnHelper.accessor('direction', {
        header: 'Direction',
        cell: (info) => {
          const direction = info.getValue()
          return (
            <span
              className={`badge ${direction === 'in' ? 'badge-primary' : 'badge-secondary'} flex items-center gap-1 w-fit`}
            >
              {direction === 'in' ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUp className="h-3 w-3" />
              )}
              {direction.toUpperCase()}
            </span>
          )
        },
      }),
      columnHelper.accessor('method', {
        header: 'Method',
        cell: (info) => {
          const method = info.getValue()
          return <span className="badge badge-outline capitalize">{method ?? 'badge'}</span>
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
          if (!flagged) return <span className="text-base-content/60">Normal</span>
          return <span className="badge badge-error text-xs">Flagged</span>
        },
      }),
      ...(canEdit
        ? [
            columnHelper.display({
              id: 'actions',
              header: '',
              cell: (info) => {
                const row = info.row.original
                // Visitor rows are synthetic (id = "v-in-..." / "v-out-..."), not real Checkin records
                if (row.type === 'visitor') return null
                return (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs gap-1"
                    title="Edit record"
                    onClick={() => setEditingCheckin(row)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )
              },
            }),
          ]
        : []),
    ],
    [canEdit]
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
      <div className="bg-base-100 p-6 border shadow-sm">
        <p className="text-sm text-error">Failed to load check-ins</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-base-100 border shadow-sm">
        <TableSkeleton rows={5} />
      </div>
    )
  }

  return (
    <>
      <div className="bg-base-100 border shadow-sm">
        <div className="relative w-full overflow-x-auto">
          <table className="table" data-testid={TID.checkins.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="hover">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="text-base-content font-medium whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover"
                    data-testid={TID.checkins.row(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr className="hover">
                  <td
                    colSpan={columns.length}
                    className="whitespace-nowrap h-24 text-center text-base-content/60"
                  >
                    No check-ins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">Rows per page</span>
            <select
              className="select select-bordered w-20"
              value={filters.limit.toString()}
              onChange={() => onPageChange(1)}
              data-testid={TID.checkins.pagination.rowsPerPage}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-base-content/60">
              Page {data?.page ?? 1} of {data?.totalPages ?? 1}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(filters.page - 1)}
                disabled={filters.page === 1}
                data-testid={TID.checkins.pagination.prev}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(filters.page + 1)}
                disabled={filters.page >= (data?.totalPages ?? 1)}
                data-testid={TID.checkins.pagination.next}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditCheckinModal
        checkin={editingCheckin}
        open={editingCheckin !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCheckin(null)
        }}
      />
    </>
  )
}
