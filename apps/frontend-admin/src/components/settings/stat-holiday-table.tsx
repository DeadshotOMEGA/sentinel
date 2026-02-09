'use client'

import { useState } from 'react'

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
import { Pencil, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
import { useStatHolidays, useDeleteStatHoliday } from '@/hooks/use-stat-holidays'
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
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-error">Failed to load statutory holidays</div>
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
          <select
            className="select select-bordered w-[120px]"
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-md" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </button>
        </div>
      </div>

      <div className="border">
        <div className="relative w-full overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="hover">
                <th className="text-base-content font-medium whitespace-nowrap">Date</th>
                <th className="text-base-content font-medium whitespace-nowrap">Name</th>
                <th className="text-base-content font-medium whitespace-nowrap">Province</th>
                <th className="text-base-content font-medium whitespace-nowrap">Status</th>
                <th className="text-base-content font-medium whitespace-nowrap w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {holidays.length > 0 ? (
                holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover">
                    <td className="whitespace-nowrap font-mono text-sm">
                      {formatDate(holiday.date)}
                    </td>
                    <td className="whitespace-nowrap font-medium">{holiday.name}</td>
                    <td className="whitespace-nowrap">
                      {holiday.province ? (
                        <span className="badge badge-outline">{holiday.province}</span>
                      ) : (
                        <span className="badge badge-secondary">Federal</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {holiday.isActive ? (
                        <span className="badge badge-secondary gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-outline gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost btn-square btn-md"
                          onClick={() => setEditingItem(holiday)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-square btn-md"
                          onClick={() => setDeletingItem(holiday)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="hover">
                  <td
                    colSpan={5}
                    className="whitespace-nowrap text-center py-8 text-base-content/60"
                  >
                    No statutory holidays found for {selectedYear}. Click &quot;Add Holiday&quot; to
                    create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  <ButtonSpinner />
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
