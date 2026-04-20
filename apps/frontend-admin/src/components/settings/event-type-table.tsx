'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
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
import { AppBadge } from '@/components/ui/AppBadge'
import { useDeleteEventType, useEventTypes } from '@/hooks/use-events'
import { EventTypeFormModal } from './event-type-form-modal'
import { TID } from '@/lib/test-ids'
import type { UnitEventTypeResponse } from '@sentinel/contracts'

interface EventTypeTableProps {
  title: string
  description: string
}

function formatCategory(category: UnitEventTypeResponse['category']): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function EventTypeTable({ title, description }: EventTypeTableProps) {
  const { data: eventTypes, isLoading, error } = useEventTypes()
  const deleteMutation = useDeleteEventType()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingType, setEditingType] = useState<UnitEventTypeResponse | null>(null)
  const [deletingType, setDeletingType] = useState<UnitEventTypeResponse | null>(null)

  const handleDelete = async () => {
    if (!deletingType) return

    try {
      await deleteMutation.mutateAsync(deletingType.id)
      setDeletingType(null)
    } catch {
      // mutation state handled in dialog
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (error) {
    return <div className="py-8 text-center text-error">Failed to load event types</div>
  }

  const rows = eventTypes ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-base-content/60">{description}</p>
        </div>
        <button
          className="btn btn-primary btn-md"
          onClick={() => setIsCreateOpen(true)}
          data-testid={TID.settings.eventTypes.addBtn}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </button>
      </div>

      <div className="border">
        <div className="relative w-full overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="hover">
                <th className="whitespace-nowrap font-medium text-base-content">Name</th>
                <th className="whitespace-nowrap font-medium text-base-content">Category</th>
                <th className="whitespace-nowrap font-medium text-base-content text-right">Duration</th>
                <th className="whitespace-nowrap font-medium text-base-content text-center">Duty Watch</th>
                <th className="whitespace-nowrap font-medium text-base-content text-right">Order</th>
                <th className="w-[100px] whitespace-nowrap font-medium text-base-content">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((item) => (
                  <tr key={item.id} className="hover">
                    <td className="whitespace-nowrap font-medium">{item.name}</td>
                    <td className="whitespace-nowrap">{formatCategory(item.category)}</td>
                    <td className="whitespace-nowrap text-right">{item.defaultDurationMinutes} min</td>
                    <td className="whitespace-nowrap text-center">
                      {item.requiresDutyWatch ? (
                        <AppBadge status="warning" size="sm">
                          Required
                        </AppBadge>
                      ) : (
                        <span className="text-base-content/40">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right">{item.displayOrder}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost btn-square btn-md"
                          onClick={() => setEditingType(item)}
                          data-testid={TID.settings.eventTypes.editBtn(item.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-square btn-md"
                          onClick={() => setDeletingType(item)}
                          data-testid={TID.settings.eventTypes.deleteBtn(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="hover">
                  <td colSpan={6} className="whitespace-nowrap py-8 text-center text-base-content/60">
                    No event types found. Click "Add New" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EventTypeFormModal
        open={isCreateOpen || !!editingType}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingType(null)
          }
        }}
        mode={editingType ? 'edit' : 'create'}
        item={editingType}
      />

      <AlertDialog open={!!deletingType} onOpenChange={(open) => !open && setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingType?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Existing events will lose this type reference.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteMutation.error && (
            <div className="alert alert-error" role="alert">
              <span>{deleteMutation.error.message}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel data-testid={TID.settings.eventTypes.deleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-error text-error-content hover:bg-error/90"
              data-testid={TID.settings.eventTypes.deleteConfirm}
            >
              {deleteMutation.isPending ? (
                <>
                  <ButtonSpinner /> Deleting...
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
