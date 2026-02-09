'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { useMembers, useDeleteMember } from '@/hooks/use-members'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { MemberFormModal } from './member-form-modal'
import { DeleteMemberDialog } from './delete-member-dialog'
import { BulkEditMemberModal } from './bulk-edit-member-modal'
import { BulkGrantQualificationModal } from './bulk-grant-qualification-modal'
import { BulkAssignTagModal } from './bulk-assign-tag-modal'
import { MemberQualificationsModal } from './member-qualifications-modal'
import { MemberTagsModal } from './member-tags-modal'

import { Chip, type ChipVariant, type ChipColor } from '@/components/ui/chip'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Pencil, Trash2, X, Shield, Tag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { SortableHeader } from './sortable-header'
import { cn } from '@/lib/utils'
import type { MemberResponse } from '@sentinel/contracts'

interface MembersTableProps {
  filters: {
    divisionId?: string
    rank?: string
    status?: string
    search?: string
    qualificationCode?: string
  }
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

const columnHelper = createColumnHelper<MemberResponse>()

export function MembersTable({
  filters,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: MembersTableProps) {
  const { data, isLoading, isError } = useMembers({ ...filters, page, limit })
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const deleteMember = useDeleteMember()
  const user = useAuthStore((state) => state.user)

  // Selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Clear selection when page changes
  useEffect(() => {
    setRowSelection({})
  }, [page])

  // Modal states
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)
  const [qualificationsMember, setQualificationsMember] = useState<MemberResponse | null>(null)
  const [tagsMember, setTagsMember] = useState<MemberResponse | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [showBulkGrantQualDialog, setShowBulkGrantQualDialog] = useState(false)
  const [showBulkAssignTagDialog, setShowBulkAssignTagDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)

  // Check if user can edit/delete
  const canEdit = user?.role != null && ['developer', 'admin'].includes(user.role)

  // Create lookup maps for IDs to names
  const divisionMap = useMemo(() => {
    if (!divisions?.divisions) return new Map<string, string>()
    return new Map(divisions.divisions.map((d) => [d.id, d.name]))
  }, [divisions])

  const memberStatusMap = useMemo(() => {
    if (!enums?.memberStatuses) return new Map<string, string>()
    return new Map(enums.memberStatuses.map((s: { id: string; name: string }) => [s.id, s.name]))
  }, [enums])

  // Rank order map for proper military rank sorting (higher displayOrder = more senior)
  const rankOrderMap = useMemo(() => {
    if (!enums?.rankDetails) return new Map<string, number>()
    return new Map(
      enums.rankDetails.map((r: { code: string; displayOrder: number }) => [r.code, r.displayOrder])
    )
  }, [enums])

  // Get selected members - keys are member IDs since we use getRowId
  const selectedMemberIds = useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key])
  }, [rowSelection])

  const selectedCount = selectedMemberIds.length

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true)
    setBulkDeleteError(null)

    const results = await Promise.allSettled(
      selectedMemberIds.map((id) => deleteMember.mutateAsync(id))
    )

    const failedCount = results.filter((r) => r.status === 'rejected').length
    const succeededCount = results.filter((r) => r.status === 'fulfilled').length

    if (failedCount === 0) {
      setRowSelection({})
      setShowBulkDeleteDialog(false)
    } else {
      // Keep only failed rows selected
      const failedIds = selectedMemberIds.filter((_, i) => results[i].status === 'rejected')
      const newSelection: RowSelectionState = {}
      for (const id of failedIds) {
        newSelection[id] = true
      }
      setRowSelection(newSelection)
      setBulkDeleteError(
        `${failedCount} of ${selectedMemberIds.length} deletions failed. ${succeededCount} succeeded.`
      )
    }

    setIsBulkDeleting(false)
  }

  // Define columns
  const columns = useMemo(() => {
    const cols = [
      // Selection checkbox column
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 40,
      }),
      columnHelper.accessor('serviceNumber', {
        header: ({ column }) => <SortableHeader column={column} label="Service #" />,
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
        size: 80,
      }),
      columnHelper.accessor('rank', {
        header: ({ column }) => <SortableHeader column={column} label="Rank" />,
        cell: (info) => info.getValue(),
        sortingFn: (rowA, rowB) => {
          const rankA = rowA.original.rank
          const rankB = rowB.original.rank
          const orderA = rankOrderMap.get(rankA) ?? 0
          const orderB = rankOrderMap.get(rankB) ?? 0
          return orderA - orderB
        },
        size: 70,
      }),
      columnHelper.display({
        id: 'name',
        header: ({ column }) => <SortableHeader column={column} label="Name" />,
        cell: (info) => {
          const member = info.row.original
          const toTitleCase = (str: string) =>
            str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
          return `${toTitleCase(member.lastName)}, ${toTitleCase(member.firstName)}`
        },
        enableSorting: true,
      }),
      columnHelper.accessor('divisionId', {
        header: ({ column }) => <SortableHeader column={column} label="Division" />,
        cell: (info) => divisionMap.get(info.getValue()) ?? 'N/A',
        enableSorting: true,
      }),
      columnHelper.accessor('memberStatusId', {
        header: ({ column }) => (
          <SortableHeader column={column} label="Status" className="flex justify-center" />
        ),
        cell: (info): React.ReactNode => {
          const statusId = info.getValue() as string | null | undefined
          if (!statusId)
            return (
              <div className="flex justify-center">
                <span className="text-base-content/60">N/A</span>
              </div>
            )
          const statusName = memberStatusMap.get(statusId)
          return (
            <div className="flex justify-center">
              <span className="badge badge-primary">{String(statusName ?? 'Unknown')}</span>
            </div>
          )
        },
        enableSorting: true,
        size: 70,
      }),
      columnHelper.display({
        id: 'badge',
        header: ({ column }) => (
          <SortableHeader column={column} label="Badge" className="flex justify-center" />
        ),
        cell: (info) => {
          const member = info.row.original
          if (!member.badgeId)
            return (
              <div className="flex justify-center">
                <span className="text-base-content/60">—</span>
              </div>
            )
          const badgeStatus = member.badgeStatus
          if (badgeStatus) {
            return (
              <div className="flex justify-center">
                <Chip
                  variant={(badgeStatus.chipVariant as ChipVariant) || 'solid'}
                  color={(badgeStatus.chipColor as ChipColor) || 'default'}
                  size="sm"
                >
                  {badgeStatus.name}
                </Chip>
              </div>
            )
          }
          // Fallback if no badge status but badge is assigned
          return (
            <div className="flex justify-center">
              <Chip variant="solid" color="success" size="sm">
                Assigned
              </Chip>
            </div>
          )
        },
        enableSorting: true,
        size: 90,
      }),
      columnHelper.display({
        id: 'qualifications',
        header: 'Quals / Tags',
        cell: (info) => {
          const member = info.row.original
          const quals = member.qualifications ?? []
          const tags = member.tags ?? []

          // Get tag IDs that are already linked to qualifications
          const qualTagIds = new Set(quals.map((q) => q.tagId).filter(Boolean))

          // Filter out tags that are already represented by a qualification
          const additionalTags = tags.filter((t) => !qualTagIds.has(t.id))

          if (quals.length === 0 && additionalTags.length === 0) {
            return <span className="text-base-content/60">—</span>
          }

          return (
            <div className="flex flex-wrap gap-1">
              {quals.map((q) => (
                <Chip
                  key={`qual-${q.code}`}
                  variant={(q.chipVariant as ChipVariant) || 'solid'}
                  color={(q.chipColor as ChipColor) || 'default'}
                  size="sm"
                >
                  {q.code}
                </Chip>
              ))}
              {additionalTags.map((t) => (
                <Chip
                  key={`tag-${t.id}`}
                  variant={(t.chipVariant as ChipVariant) || 'solid'}
                  color={(t.chipColor as ChipColor) || 'default'}
                  size="sm"
                >
                  {t.name}
                </Chip>
              ))}
            </div>
          )
        },
        enableSorting: false,
      }),
    ]

    if (canEdit) {
      cols.push(
        columnHelper.display({
          id: 'actions',
          header: () => <span className="block text-center">Actions</span>,
          cell: (info) => {
            const member = info.row.original
            return (
              <div className="flex items-center justify-center">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQualificationsMember(member)}
                  title="Manage qualifications"
                >
                  <Shield className="h-4 w-4" />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setTagsMember(member)}
                  title="Manage tags"
                >
                  <Tag className="h-4 w-4" />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingMember(member)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDeletingMemberId(member.id)}
                >
                  <Trash2 className="h-4 w-4 text-error" />
                </button>
              </div>
            )
          },
          enableSorting: false,
          size: 120,
        })
      )
    }

    return cols
  }, [canEdit, divisionMap, memberStatusMap, rankOrderMap])

  const table = useReactTable({
    data: data?.members ?? [],
    columns,
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
    getRowId: (row) => row.id,
  })

  if (isError) {
    return (
      <div className="bg-base-100 p-6 rounded-none border shadow-none">
        <p className="text-sm text-error">Failed to load members</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-base-100 rounded-none border shadow-none">
        <div className="animate-pulse p-6 space-y-4">
          <div className="h-10 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
          <div className="h-12 bg-base-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-base-100 rounded-none border shadow-none">
        {/* Bulk Actions Toolbar - always rendered to prevent layout shift */}
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b transition-all duration-200',
            selectedCount > 0
              ? 'bg-base-200/50 opacity-100'
              : 'opacity-0 h-0 py-0 overflow-hidden border-b-0'
          )}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'member' : 'members'} selected
            </span>
            <button
              className="btn btn-ghost btn-sm text-base-content/60"
              onClick={() => setRowSelection({})}
            >
              <X className="h-4 w-4 mr-1" />
              Clear selection
            </button>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (selectedCount === 1) {
                    const selectedId = selectedMemberIds[0]
                    if (selectedId && data?.members) {
                      const member = data.members.find((m) => m.id === selectedId)
                      if (member) setEditingMember(member)
                    }
                  } else {
                    setShowBulkEditDialog(true)
                  }
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit {selectedCount > 1 ? `(${selectedCount})` : ''}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowBulkGrantQualDialog(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Quals
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowBulkAssignTagDialog(true)}
              >
                <Tag className="h-4 w-4 mr-2" />
                Tags
              </button>
              <button
                className="btn btn-error btn-sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedCount > 1 ? `(${selectedCount})` : ''}
              </button>
            </div>
          )}
        </div>

        <div className="relative w-full overflow-x-auto">
          <table className="table table-fixed">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="hover">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-base-content font-medium whitespace-nowrap"
                      style={{ width: header.column.columnDef.size }}
                    >
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
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="whitespace-nowrap"
                        style={{ width: cell.column.columnDef.size }}
                      >
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
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">Rows per page</span>
            <select
              className="select select-sm"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-base-content/60">
              Page {page} of {data?.totalPages ?? 1} ({data?.total ?? 0}{' '}
              {(data?.total ?? 0) === 1 ? 'member' : 'members'})
            </span>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= (data?.totalPages ?? 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <MemberFormModal
          open={!!editingMember}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMember(null)
            }
          }}
          mode="edit"
          member={editingMember}
        />
      )}

      {/* Delete Single Member Dialog */}
      {deletingMemberId && (
        <DeleteMemberDialog
          memberId={deletingMemberId}
          onOpenChange={(open) => !open && setDeletingMemberId(null)}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          if (open) setBulkDeleteError(null)
          setShowBulkDeleteDialog(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} members?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected members and
              remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkDeleteError && (
            <div role="alert" className="alert alert-error">
              <div className="text-sm">{bulkDeleteError}</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-error text-error-content hover:bg-error/90"
            >
              {isBulkDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Modal */}
      <BulkEditMemberModal
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        memberIds={selectedMemberIds}
        onSuccess={() => setRowSelection({})}
      />

      {/* Bulk Grant Qualification Modal */}
      <BulkGrantQualificationModal
        open={showBulkGrantQualDialog}
        onOpenChange={setShowBulkGrantQualDialog}
        memberIds={selectedMemberIds}
        onSuccess={() => setRowSelection({})}
      />

      {/* Bulk Assign Tag Modal */}
      <BulkAssignTagModal
        open={showBulkAssignTagDialog}
        onOpenChange={setShowBulkAssignTagDialog}
        memberIds={selectedMemberIds}
        onSuccess={() => setRowSelection({})}
      />

      {/* Qualifications Modal */}
      <MemberQualificationsModal
        open={!!qualificationsMember}
        onOpenChange={(open) => !open && setQualificationsMember(null)}
        member={qualificationsMember}
      />

      {/* Tags Modal */}
      <MemberTagsModal
        open={!!tagsMember}
        onOpenChange={(open) => !open && setTagsMember(null)}
        member={tagsMember}
      />
    </>
  )
}
