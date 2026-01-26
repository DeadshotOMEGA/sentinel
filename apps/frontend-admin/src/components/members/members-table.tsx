'use client'

import { useState, useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMembers } from '@/hooks/use-members'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { MemberFormModal } from './member-form-modal'
import { DeleteMemberDialog } from './delete-member-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import type { MemberResponse } from '@sentinel/contracts'

interface MembersTableProps {
  filters: {
    page: number
    limit: number
    divisionId?: string
    rank?: string
    status?: string
    search?: string
  }
  onPageChange: (page: number) => void
}

const columnHelper = createColumnHelper<MemberResponse>()

export function MembersTable({ filters, onPageChange }: MembersTableProps) {
  const { data, isLoading, isError } = useMembers(filters)
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const user = useAuthStore((state) => state.user)
  const [editingMember, setEditingMember] = useState<MemberResponse | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)

  // Check if user can edit/delete
  const canEdit = user?.role && ['developer', 'admin'].includes(user.role)

  // Create lookup maps for IDs to names
  const divisionMap = useMemo(() => {
    if (!divisions?.divisions) return new Map<string, string>()
    return new Map(divisions.divisions.map((d) => [d.id, d.name]))
  }, [divisions])

  const memberStatusMap = useMemo(() => {
    if (!enums?.memberStatuses) return new Map<string, string>()
    return new Map(enums.memberStatuses.map((s) => [s.id, s.name]))
  }, [enums])

  const columns = [
    columnHelper.accessor('serviceNumber', {
      header: 'Service #',
      cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('rank', {
      header: 'Rank',
      cell: (info) => info.getValue(),
    }),
    columnHelper.display({
      id: 'name',
      header: 'Name',
      cell: (info) => {
        const member = info.row.original
        return `${member.firstName} ${member.lastName}`
      },
    }),
    columnHelper.accessor('divisionId', {
      header: 'Division',
      cell: (info) => divisionMap.get(info.getValue()) ?? 'N/A',
    }),
    columnHelper.accessor('memberStatusId', {
      header: 'Status',
      cell: (info) => {
        const statusId = info.getValue()
        if (!statusId) return <span className="text-muted-foreground">N/A</span>
        const statusName = memberStatusMap.get(statusId)
        return <Badge variant="default">{statusName ?? 'Unknown'}</Badge>
      },
    }),
    columnHelper.accessor('badgeId', {
      header: 'Badge',
      cell: (info) => {
        const badgeId = info.getValue()
        if (!badgeId) return <span className="text-muted-foreground">No Badge</span>
        return <span className="font-mono text-sm">{badgeId.slice(0, 8)}...</span>
      },
    }),
  ]

  if (canEdit) {
    columns.push(
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const member = info.row.original
          return (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingMember(member)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeletingMemberId(member.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )
        },
      })
    )
  }

  const table = useReactTable({
    data: data?.members ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  })

  if (isError) {
    return (
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <p className="text-sm text-destructive">Failed to load members</p>
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
    <>
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
                  No members found
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

      {/* Edit Modal */}
      {editingMember && (
        <MemberFormModal
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          mode="edit"
          member={editingMember}
        />
      )}

      {/* Delete Dialog */}
      {deletingMemberId && (
        <DeleteMemberDialog
          memberId={deletingMemberId}
          onOpenChange={(open) => !open && setDeletingMemberId(null)}
        />
      )}
    </>
  )
}
