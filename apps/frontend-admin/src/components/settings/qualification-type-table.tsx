'use client'

import { useState } from 'react'

import { Chip, type ChipVariant, type ChipColor } from '@/components/ui/chip'
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
import { Pencil, Trash2, Plus, Loader2, CheckCircle, XCircle, Link2 } from 'lucide-react'
import {
  useQualificationTypeList,
  useDeleteQualificationType,
  type QualificationTypeItem,
} from '@/hooks/use-qualification-type-management'
import { QualificationTypeFormModal } from './qualification-type-form-modal'

interface QualificationTypeTableProps {
  title: string
  description: string
}

export function QualificationTypeTable({ title, description }: QualificationTypeTableProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<QualificationTypeItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<QualificationTypeItem | null>(null)

  const { data: items, isLoading, error } = useQualificationTypeList()
  const deleteMutation = useDeleteQualificationType()

  const handleDelete = async () => {
    if (!deletingItem) return
    try {
      await deleteMutation.mutateAsync(deletingItem.id)
      setDeletingItem(null)
    } catch {
      // Error is displayed inline in the dialog via deleteMutation.error
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-error">Failed to load qualification types</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-base-content/60">{description}</p>
        </div>
        <button className="btn btn-primary btn-md" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </button>
      </div>

      <div className="border">
        <div className="relative w-full overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="hover">
                <th className="text-base-content font-medium whitespace-nowrap">Code</th>
                <th className="text-base-content font-medium whitespace-nowrap">Name</th>
                <th className="text-base-content font-medium whitespace-nowrap">Lockup</th>
                <th className="text-base-content font-medium whitespace-nowrap">Linked Tag</th>
                <th className="text-base-content font-medium whitespace-nowrap">Preview</th>
                <th className="text-base-content font-medium whitespace-nowrap w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover">
                    <td className="whitespace-nowrap font-mono text-sm">{item.code}</td>
                    <td className="whitespace-nowrap font-medium">{item.name}</td>
                    <td className="whitespace-nowrap">
                      {item.canReceiveLockup ? (
                        <span className="badge badge-secondary gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="badge badge-outline gap-1">
                          <XCircle className="h-3 w-3" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {item.tag ? (
                        <span className="badge badge-outline gap-1">
                          <Link2 className="h-3 w-3" />
                          {item.tag.name}
                        </span>
                      ) : (
                        <span className="text-base-content/60 text-sm">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {item.tag ? (
                        <Chip
                          variant={(item.tag.chipVariant as ChipVariant) || 'solid'}
                          color={(item.tag.chipColor as ChipColor) || 'default'}
                          size="sm"
                        >
                          {item.name}
                        </Chip>
                      ) : (
                        <Chip variant="solid" color="default" size="sm">
                          {item.name}
                        </Chip>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost btn-square btn-md"
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-square btn-md"
                          onClick={() => setDeletingItem(item)}
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
                    colSpan={6}
                    className="whitespace-nowrap text-center py-8 text-base-content/60"
                  >
                    No qualification types found. Click &quot;Add New&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <QualificationTypeFormModal
        open={isCreateModalOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false)
            setEditingItem(null)
          }
        }}
        item={editingItem}
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
              This action cannot be undone. This will permanently delete the qualification type
              &quot;{deletingItem?.name}&quot;.
              {deletingItem && (
                <span className="block mt-2 text-warning">
                  Note: This will fail if any members have this qualification assigned.
                </span>
              )}
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
