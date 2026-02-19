'use client'

import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Shield, Trash2 } from 'lucide-react'
import { useBadges } from '@/hooks/use-badges'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { TID } from '@/lib/test-ids'
import { BadgeFormModal } from './badge-form-modal'
import { DeleteBadgeDialog } from './delete-badge-dialog'
import type { BadgeWithAssignmentResponse } from '@sentinel/contracts'

interface BadgesTableProps {
  filters: {
    search?: string
    status?: string
    assignmentType?: string
  }
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const columnHelper = createColumnHelper<BadgeWithAssignmentResponse>()

const statusClassMap: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-neutral',
  lost: 'badge-error',
  damaged: 'badge-warning',
}

const assignmentClassMap: Record<string, string> = {
  member: 'badge-primary',
  visitor: 'badge-info',
  unassigned: 'badge-outline',
}

function formatLastUsed(lastUsed: string | null) {
  if (!lastUsed) return 'Never'
  const date = new Date(lastUsed)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function BadgesTable({
  filters,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: BadgesTableProps) {
  const { data, isLoading, isError } = useBadges({
    ...filters,
    page,
    limit,
  })
  const member = useAuthStore((state) => state.member)
  const canEdit = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  const [editingBadge, setEditingBadge] = useState<BadgeWithAssignmentResponse | null>(null)
  const [deletingBadge, setDeletingBadge] = useState<BadgeWithAssignmentResponse | null>(null)

  const columns = useMemo(
    () => [
      columnHelper.accessor('serialNumber', {
        header: 'Serial Number',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue()
          return (
            <span className={`badge capitalize ${statusClassMap[status] ?? 'badge-outline'}`}>
              {status}
            </span>
          )
        },
      }),
      columnHelper.accessor('assignmentType', {
        header: 'Assignment',
        cell: (info) => {
          const assignmentType = info.getValue()
          return (
            <span
              className={`badge capitalize ${assignmentClassMap[assignmentType] ?? 'badge-outline'}`}
            >
              {assignmentType}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'assignedTo',
        header: 'Assigned To',
        cell: (info) => {
          const badge = info.row.original
          return badge.assignedTo?.name ?? <span className="text-base-content/50">Unassigned</span>
        },
      }),
      columnHelper.accessor('lastUsed', {
        header: 'Last Used',
        cell: (info) => {
          const lastUsed = info.getValue()
          if (!lastUsed) return <span className="text-base-content/50">Never</span>
          return formatLastUsed(lastUsed)
        },
      }),
      ...(canEdit
        ? [
            columnHelper.display({
              id: 'actions',
              header: '',
              cell: (info) => {
                const badge = info.row.original
                return (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingBadge(badge)}
                      data-testid={TID.badges.rowAction(badge.id, 'edit')}
                      title={`Edit badge ${badge.serialNumber}`}
                      aria-label={`Edit badge ${badge.serialNumber}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => setDeletingBadge(badge)}
                      data-testid={TID.badges.rowAction(badge.id, 'delete')}
                      title={`Delete badge ${badge.serialNumber}`}
                      aria-label={`Delete badge ${badge.serialNumber}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              },
            }),
          ]
        : []),
    ],
    [canEdit]
  )

  const table = useReactTable({
    data: data?.badges ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
    getRowId: (row) => row.id,
  })

  const total = data?.total ?? 0
  const showingStart = total === 0 ? 0 : (page - 1) * limit + 1
  const showingEnd = total === 0 ? 0 : Math.min(page * limit, total)

  if (isError) {
    return (
      <div className="bg-base-100 p-6 border shadow-sm">
        <p className="text-sm text-error">Failed to load badges</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-base-100 border shadow-sm">
        <TableSkeleton rows={6} cols={5} />
      </div>
    )
  }

  return (
    <>
      <div className="bg-base-100 border shadow-sm">
        <div className="relative w-full overflow-x-auto">
          <table className="table table-zebra" data-testid={TID.badges.table}>
            <thead className="sticky top-0 z-10 bg-base-100">
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
                  <tr key={row.id} className="hover" data-testid={TID.badges.row(row.id)}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr className="hover">
                  <td colSpan={columns.length}>
                    <EmptyState
                      icon={Shield}
                      title="No badges found"
                      description="Try adjusting your search or filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">Rows per page</span>
            <select
              className="select select-bordered w-24"
              value={limit.toString()}
              onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
              data-testid={TID.badges.pagination.rowsPerPage}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-base-content/60">
              {total === 1 ? '1 badge' : `${total} badges`}
            </span>
            <span className="text-sm text-base-content/60">
              Showing {showingStart}-{showingEnd}
            </span>
            <span className="text-sm text-base-content/60">
              Page {data?.page ?? 1} of {data?.totalPages ?? 1}
            </span>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                data-testid={TID.badges.pagination.prev}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= (data?.totalPages ?? 1)}
                data-testid={TID.badges.pagination.next}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingBadge && (
        <BadgeFormModal
          open={editingBadge !== null}
          onOpenChange={(open) => {
            if (!open) setEditingBadge(null)
          }}
          mode="edit"
          badge={editingBadge}
        />
      )}

      {deletingBadge && (
        <DeleteBadgeDialog
          badge={deletingBadge}
          onOpenChange={(open) => !open && setDeletingBadge(null)}
        />
      )}
    </>
  )
}
