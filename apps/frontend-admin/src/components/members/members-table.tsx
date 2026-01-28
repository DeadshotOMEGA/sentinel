'use client'

import React, { useState, useMemo } from 'react'
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
import { MemberQualificationsModal } from './member-qualifications-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Shield,
} from 'lucide-react'
// import { useAuthStore } from '@/store/auth-store' // Re-enable when auth is implemented
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
}

const columnHelper = createColumnHelper<MemberResponse>()

export function MembersTable({ filters }: MembersTableProps) {
  // Fetch all members (no pagination)
  const { data, isLoading, isError } = useMembers({ ...filters, page: 1, limit: 250 })
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const deleteMember = useDeleteMember()
  // const user = useAuthStore((state) => state.user) // Re-enable when auth is implemented

  // Selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Modal states
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)
  const [qualificationsMember, setQualificationsMember] = useState<MemberResponse | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Check if user can edit/delete
  // TODO: Re-enable when auth is implemented: user?.role && ['developer', 'admin'].includes(user.role)
  const canEdit = true

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
    return new Map(enums.rankDetails.map((r: { code: string; displayOrder: number }) => [r.code, r.displayOrder]))
  }, [enums])

  // Get selected members - keys are member IDs since we use getRowId
  const selectedMemberIds = useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key])
  }, [rowSelection])

  const selectedCount = selectedMemberIds.length

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true)
    try {
      await Promise.all(selectedMemberIds.map((id) => deleteMember.mutateAsync(id)))
      setRowSelection({})
      setShowBulkDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete members:', error)
    } finally {
      setIsBulkDeleting(false)
    }
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
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Service #
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('rank', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Rank
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: (info) => info.getValue(),
        sortingFn: (rowA, rowB) => {
          const rankA = rowA.original.rank
          const rankB = rowB.original.rank
          const orderA = rankOrderMap.get(rankA) ?? 0
          const orderB = rankOrderMap.get(rankB) ?? 0
          return orderA - orderB
        },
      }),
      columnHelper.display({
        id: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: (info) => {
          const member = info.row.original
          const toTitleCase = (str: string) =>
            str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
          return `${toTitleCase(member.lastName)}, ${toTitleCase(member.firstName)}`
        },
        enableSorting: true,
      }),
      columnHelper.accessor('divisionId', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Division
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: (info) => divisionMap.get(info.getValue()) ?? 'N/A',
        enableSorting: true,
      }),
      columnHelper.accessor('memberStatusId', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: (info): React.ReactNode => {
          const statusId = info.getValue() as string | null | undefined
          if (!statusId) return <span className="text-muted-foreground">N/A</span>
          const statusName = memberStatusMap.get(statusId)
          return <Badge variant="default">{String(statusName ?? 'Unknown')}</Badge>
        },
        enableSorting: true,
      }),
      columnHelper.accessor('badgeId', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Badge
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: (info) => {
          const badgeId = info.getValue()
          if (!badgeId) return <span className="text-muted-foreground">No Badge</span>
          return <span className="font-mono text-sm">{badgeId.slice(0, 8)}...</span>
        },
        enableSorting: true,
      }),
      columnHelper.display({
        id: 'qualifications',
        header: 'Quals',
        cell: (info) => {
          const member = info.row.original
          const quals = member.qualifications
          if (!quals || quals.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {quals.map((q) => (
                <Badge key={q.code} variant="secondary" className="text-xs">
                  {q.code}
                </Badge>
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
          header: 'Actions',
          cell: (info) => {
            const member = info.row.original
            return (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQualificationsMember(member)}
                  title="Manage qualifications"
                >
                  <Shield className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingMember(member)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeletingMemberId(member.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )
          },
          enableSorting: false,
        })
      )
    }

    return cols
  }, [canEdit, divisionMap, memberStatusMap])

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
      <div className="bg-card p-6 rounded-none border shadow-none">
        <p className="text-sm text-destructive">Failed to load members</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-none border shadow-none">
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
    <>
      <div className="bg-card rounded-none border shadow-none">
        {/* Bulk Actions Toolbar - always rendered to prevent layout shift */}
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b transition-all duration-200',
            selectedCount > 0 ? 'bg-muted/50 opacity-100' : 'opacity-0 h-0 py-0 overflow-hidden border-b-0'
          )}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'member' : 'members'} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear selection
            </Button>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedCount === 1) {
                    // Single edit - use regular form modal
                    const selectedId = selectedMemberIds[0]
                    if (selectedId && data?.members) {
                      const member = data.members.find((m) => m.id === selectedId)
                      if (member) setEditingMember(member)
                    }
                  } else {
                    // Bulk edit - use bulk edit modal
                    setShowBulkEditDialog(true)
                  }
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit {selectedCount > 1 ? `(${selectedCount})` : ''}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedCount > 1 ? `(${selectedCount})` : ''}
              </Button>
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={row.getIsSelected() ? 'bg-muted/50' : ''}
                >
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
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Footer with total count */}
        <div className="flex items-center justify-end px-4 py-3 border-t">
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingMember && (
        <MemberFormModal
          open={!!editingMember}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMember(null)
              setRowSelection({})
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
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} members?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected members and
              remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

      {/* Qualifications Modal */}
      <MemberQualificationsModal
        open={!!qualificationsMember}
        onOpenChange={(open) => !open && setQualificationsMember(null)}
        member={qualificationsMember}
      />
    </>
  )
}
