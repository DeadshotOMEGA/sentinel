'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Shield, Trash2 } from 'lucide-react'
import { useBadges, useDeleteBadge, useUpdateBadge } from '@/hooks/use-badges'
import { Checkbox } from '@/components/ui/checkbox'
import { TableSkeleton } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { cn } from '@/lib/utils'
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

type BulkBadgeAction = 'decommission' | 'delete' | null

const columnHelper = createColumnHelper<BadgeWithAssignmentResponse>()

const statusClassMap: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-neutral',
  lost: 'badge-error',
  damaged: 'badge-warning',
  decommissioned: 'badge-neutral',
}

const assignmentClassMap: Record<string, string> = {
  member: 'badge-primary',
  visitor: 'badge-info',
  event: 'badge-secondary',
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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function BadgesTable({
  filters,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: BadgesTableProps) {
  const member = useAuthStore((state) => state.member)
  const canEdit = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  const [includeDecommissioned, setIncludeDecommissioned] = useState(false)
  const { data, isLoading, isError } = useBadges({
    ...filters,
    page,
    limit,
    includeDecommissioned,
  })
  const deleteBadge = useDeleteBadge()
  const updateBadge = useUpdateBadge()

  const [editingBadge, setEditingBadge] = useState<BadgeWithAssignmentResponse | null>(null)
  const [deletingBadge, setDeletingBadge] = useState<BadgeWithAssignmentResponse | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkAction, setBulkAction] = useState<BulkBadgeAction>(null)
  const [bulkActionError, setBulkActionError] = useState<string | null>(null)
  const [isBulkActing, setIsBulkActing] = useState(false)
  const [bulkDeleteUnassignFirst, setBulkDeleteUnassignFirst] = useState(false)

  useEffect(() => {
    setRowSelection({})
  }, [page, includeDecommissioned, filters.assignmentType, filters.search, filters.status])

  const selectedBadgeIds = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection]
  )
  const selectedCount = selectedBadgeIds.length

  const selectedBadges = useMemo(() => {
    if (!data?.badges) {
      return []
    }

    const selectedIds = new Set(selectedBadgeIds)
    return data.badges.filter((badge) => selectedIds.has(badge.id))
  }, [data?.badges, selectedBadgeIds])

  const hasAssignedSelection = selectedBadges.some((badge) => badge.assignmentType !== 'unassigned')

  const columns = useMemo(() => {
    const baseColumns = [
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
    ]

    if (!canEdit) {
      return baseColumns
    }

    return [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all badges"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select badge ${row.original.serialNumber}`}
          />
        ),
      }),
      ...baseColumns,
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
  }, [canEdit])

  const table = useReactTable({
    data: data?.badges ?? [],
    columns,
    state: { rowSelection },
    enableRowSelection: canEdit,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
    getRowId: (row) => row.id,
  })

  const total = data?.total ?? 0
  const showingStart = total === 0 ? 0 : (page - 1) * limit + 1
  const showingEnd = total === 0 ? 0 : Math.min(page * limit, total)

  const handleBulkDecommission = async () => {
    setIsBulkActing(true)
    setBulkActionError(null)

    const results = await Promise.allSettled(
      selectedBadgeIds.map((id) =>
        updateBadge.mutateAsync({ id, data: { status: 'decommissioned' } })
      )
    )

    const failedIds = selectedBadgeIds.filter((_, index) => results[index]?.status === 'rejected')
    const failedCount = failedIds.length
    const succeededCount = selectedBadgeIds.length - failedCount

    if (failedCount === 0) {
      setRowSelection({})
      setBulkAction(null)
      setIsBulkActing(false)
      return
    }

    const nextSelection: RowSelectionState = {}
    for (const id of failedIds) {
      nextSelection[id] = true
    }

    const firstFailure = results.find((result) => result.status === 'rejected')
    setRowSelection(nextSelection)
    setBulkActionError(
      `${failedCount} of ${selectedBadgeIds.length} badges failed to decommission. ${succeededCount} succeeded. ${getErrorMessage(firstFailure?.status === 'rejected' ? firstFailure.reason : null, '')}`.trim()
    )
    setIsBulkActing(false)
  }

  const handleBulkDelete = async () => {
    setIsBulkActing(true)
    setBulkActionError(null)

    const results = await Promise.allSettled(
      selectedBadgeIds.map((id) =>
        deleteBadge.mutateAsync({
          id,
          unassignFirst: bulkDeleteUnassignFirst,
        })
      )
    )

    const failedIds = selectedBadgeIds.filter((_, index) => results[index]?.status === 'rejected')
    const failedCount = failedIds.length
    const succeededCount = selectedBadgeIds.length - failedCount

    if (failedCount === 0) {
      setRowSelection({})
      setBulkAction(null)
      setIsBulkActing(false)
      return
    }

    const nextSelection: RowSelectionState = {}
    for (const id of failedIds) {
      nextSelection[id] = true
    }

    const firstFailure = results.find((result) => result.status === 'rejected')
    setRowSelection(nextSelection)
    setBulkActionError(
      `${failedCount} of ${selectedBadgeIds.length} badges failed to delete. ${succeededCount} succeeded. ${getErrorMessage(firstFailure?.status === 'rejected' ? firstFailure.reason : null, '')}`.trim()
    )
    setIsBulkActing(false)
  }

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
        <TableSkeleton rows={6} cols={canEdit ? 7 : 5} />
      </div>
    )
  }

  return (
    <>
      <div className="bg-base-100 border shadow-sm">
        {canEdit && selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-base-200/30 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{selectedCount} selected</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRowSelection({})}
                data-testid={TID.badges.bulk.clear}
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setBulkActionError(null)
                  setBulkAction('decommission')
                }}
                data-testid={TID.badges.bulk.decommission}
              >
                Decommission {selectedCount > 1 ? `(${selectedCount})` : ''}
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm"
                onClick={() => {
                  setBulkDeleteUnassignFirst(hasAssignedSelection)
                  setBulkActionError(null)
                  setBulkAction('delete')
                }}
                data-testid={TID.badges.bulk.delete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedCount > 1 ? `(${selectedCount})` : ''}
              </button>
            </div>
          </div>
        )}

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
                  <tr
                    key={row.id}
                    className={cn('hover', row.getIsSelected() ? 'bg-base-200/50' : '')}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    data-testid={TID.badges.row(row.id)}
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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={includeDecommissioned}
                onChange={(event) => setIncludeDecommissioned(event.target.checked)}
                data-testid={TID.badges.pagination.showDecommissioned}
              />
              <span className="text-sm text-base-content/60">Show decommissioned</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">Rows per page</span>
              <select
                className="select select-sm w-24"
                value={limit.toString()}
                onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
                data-testid={TID.badges.pagination.rowsPerPage}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-base-content/60">
              {total === 1 ? '1 badge' : `${total} badges`}
            </span>
            <span className="text-sm text-base-content/60">
              Showing {showingStart}-{showingEnd}
            </span>
            <span className="text-sm text-base-content/60">
              Page {data?.page ?? 1} of {data?.totalPages ?? 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
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
          open={!!editingBadge}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBadge(null)
            }
          }}
          mode="edit"
          badge={editingBadge}
        />
      )}

      {deletingBadge && (
        <DeleteBadgeDialog
          badge={deletingBadge}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingBadge(null)
            }
          }}
        />
      )}

      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBulkAction(null)
            setBulkActionError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'decommission'
                ? `Decommission ${selectedCount} badges?`
                : `Delete ${selectedCount} badges?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'decommission'
                ? 'This will retire the selected badges, clear any current assignments, and hide them from normal badge views.'
                : 'This only works for badges with no historical activity. Badges used in check-in or event history must be decommissioned instead.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {bulkAction === 'delete' && hasAssignedSelection && (
            <label className="flex items-start gap-3 rounded-box border border-base-300 px-4 py-3 text-sm">
              <Checkbox
                checked={bulkDeleteUnassignFirst}
                onCheckedChange={setBulkDeleteUnassignFirst}
                aria-label="Remove current assignments before deleting badges"
              />
              <span>Remove current member, visitor, or event assignments before deleting.</span>
            </label>
          )}

          {bulkActionError && (
            <div role="alert" className="alert alert-error">
              <div className="text-sm">{bulkActionError}</div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkActing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkAction === 'decommission' ? handleBulkDecommission : handleBulkDelete}
              disabled={isBulkActing}
              className={
                bulkAction === 'decommission'
                  ? 'btn-outline'
                  : 'bg-error text-error-content hover:bg-error/90'
              }
            >
              {isBulkActing && <ButtonSpinner />}
              {bulkAction === 'decommission'
                ? isBulkActing
                  ? 'Decommissioning...'
                  : 'Decommission'
                : isBulkActing
                  ? 'Deleting...'
                  : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
