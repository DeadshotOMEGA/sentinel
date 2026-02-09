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
import { Pencil, Trash2, Plus, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import {
  useEnumList,
  useDeleteEnum,
  useReorderTags,
  type EnumType,
  type EnumItem,
} from '@/hooks/use-enum-management'
import { EnumFormModal } from './enum-form-modal'

interface EnumTableProps {
  enumType: EnumType
  title: string
  description: string
}

export function EnumTable({ enumType, title, description }: EnumTableProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EnumItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<EnumItem | null>(null)

  const isTagType = enumType === 'tags'
  const { data: items, isLoading, error } = useEnumList(enumType)
  const deleteEnum = useDeleteEnum(enumType)
  const reorderTags = useReorderTags()

  const handleDelete = async () => {
    if (!deletingItem) return
    try {
      await deleteEnum.mutateAsync(deletingItem.id)
      setDeletingItem(null)
    } catch {
      // Error is handled by the mutation
    }
  }

  const handleMoveUp = async (index: number) => {
    if (!items || index === 0) return
    const newOrder = [...items]
    const [item] = newOrder.splice(index, 1)
    newOrder.splice(index - 1, 0, item!)
    await reorderTags.mutateAsync(newOrder.map((i) => i.id))
  }

  const handleMoveDown = async (index: number) => {
    if (!items || index === items.length - 1) return
    const newOrder = [...items]
    const [item] = newOrder.splice(index, 1)
    newOrder.splice(index + 1, 0, item!)
    await reorderTags.mutateAsync(newOrder.map((i) => i.id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-error">Failed to load {title.toLowerCase()}</div>
  }

  // Determine number of columns based on enum type
  // Tags: Order, Name, Preview, Positional, Description, Usage, Actions = 7
  // Others: Code, Name, Preview, Description, Usage, Actions = 6
  const columnCount = isTagType ? 7 : 6

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
                {isTagType && (
                  <th className="text-base-content font-medium whitespace-nowrap w-[80px]">
                    Order
                  </th>
                )}
                {!isTagType && (
                  <th className="text-base-content font-medium whitespace-nowrap">Code</th>
                )}
                <th className="text-base-content font-medium whitespace-nowrap">Name</th>
                <th className="text-base-content font-medium whitespace-nowrap">Preview</th>
                {isTagType && (
                  <th className="text-base-content font-medium whitespace-nowrap">Positional</th>
                )}
                <th className="text-base-content font-medium whitespace-nowrap">Description</th>
                <th className="text-base-content font-medium whitespace-nowrap text-right">
                  Usage
                </th>
                <th className="text-base-content font-medium whitespace-nowrap w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={item.id} className="hover">
                    {isTagType && (
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn-ghost btn-square btn-md h-7 w-7"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || reorderTags.isPending}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-square btn-md h-7 w-7"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === items.length - 1 || reorderTags.isPending}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                    {!isTagType && 'code' in item && (
                      <td className="whitespace-nowrap font-mono text-sm">{item.code}</td>
                    )}
                    <td className="whitespace-nowrap font-medium">{item.name}</td>
                    <td className="whitespace-nowrap">
                      <Chip
                        variant={(item.chipVariant as ChipVariant) || 'solid'}
                        color={(item.chipColor as ChipColor) || 'default'}
                        size="sm"
                      >
                        {item.name}
                      </Chip>
                    </td>
                    {isTagType && (
                      <td className="whitespace-nowrap">
                        {'isPositional' in item && item.isPositional ? (
                          <span className="badge badge-secondary">Positional</span>
                        ) : (
                          <span className="text-base-content/40">-</span>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap text-base-content/60 max-w-[200px] truncate">
                      {item.description || '-'}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span
                        className={`badge ${item.usageCount && item.usageCount > 0 ? 'badge-secondary' : 'badge-outline'}`}
                      >
                        {item.usageCount ?? 0}
                      </span>
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
                          disabled={item.usageCount !== undefined && item.usageCount > 0}
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
                    colSpan={columnCount}
                    className="whitespace-nowrap text-center py-8 text-base-content/60"
                  >
                    No {title.toLowerCase()} found. Click &quot;Add New&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <EnumFormModal
        enumType={enumType}
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
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{' '}
              {title.toLowerCase().slice(0, -1)} &quot;{deletingItem?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error text-error-content hover:bg-error/90"
              disabled={deleteEnum.isPending}
            >
              {deleteEnum.isPending ? (
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
