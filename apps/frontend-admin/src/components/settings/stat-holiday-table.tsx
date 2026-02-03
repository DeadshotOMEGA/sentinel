'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil, Trash2, Plus, Loader2, CheckCircle, XCircle, Calendar } from 'lucide-react'
import {
  useStatHolidays,
  useDeleteStatHoliday,
} from '@/hooks/use-stat-holidays'
import { StatHolidayFormModal } from './stat-holiday-form-modal'
import type { StatHoliday } from '@sentinel/contracts'

interface StatHolidayTableProps {
  title: string
  description: string
}

export function StatHolidayTable({ title, description }: StatHolidayTableProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StatHoliday | null>(null)
  const [deletingItem, setDeletingItem] = useState<StatHoliday | null>(null)

  const { data, isLoading, error } = useStatHolidays({ year: selectedYear })
  const deleteMutation = useDeleteStatHoliday()

  const handleDelete = async () => {
    if (!deletingItem) return
    try {
      await deleteMutation.mutateAsync(deletingItem.id)
      setDeletingItem(null)
    } catch {
      // Error is displayed inline in the dialog via deleteMutation.error
    }
  }

  // Generate year options (current year +/- 2 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-error">
        Failed to load statutory holidays
      </div>
    )
  }

  const holidays = data?.holidays ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-base-content/60">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length > 0 ? (
              holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDate(holiday.date)}
                  </TableCell>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>
                    {holiday.province ? (
                      <Badge variant="outline">{holiday.province}</Badge>
                    ) : (
                      <Badge variant="secondary">Federal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {holiday.isActive ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingItem(holiday)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItem(holiday)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-base-content/60">
                  No statutory holidays found for {selectedYear}. Click &quot;Add Holiday&quot; to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <StatHolidayFormModal
        open={isCreateModalOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false)
            setEditingItem(null)
          }
        }}
        holiday={editingItem}
        mode={editingItem ? 'edit' : 'create'}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingItem(null)
            deleteMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the statutory holiday
              &quot;{deletingItem?.name}&quot; ({deletingItem?.date}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.error && (
            <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-sm text-error">
              {deleteMutation.error.message}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error text-error-content hover:bg-error/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Format a date string (YYYY-MM-DD) to a more readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-CA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
