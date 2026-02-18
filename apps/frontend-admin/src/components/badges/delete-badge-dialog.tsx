'use client'

import { useDeleteBadge } from '@/hooks/use-badges'
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
import type { BadgeWithAssignmentResponse } from '@sentinel/contracts'

interface DeleteBadgeDialogProps {
  badge: BadgeWithAssignmentResponse
  onOpenChange: (open: boolean) => void
}

export function DeleteBadgeDialog({ badge, onOpenChange }: DeleteBadgeDialogProps) {
  const deleteBadge = useDeleteBadge()

  const handleDelete = async () => {
    try {
      await deleteBadge.mutateAsync(badge.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete badge:', error)
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Badge</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{badge.serialNumber}</span>? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteBadge.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteBadge.isPending}
            className="bg-error hover:bg-error/90"
          >
            {deleteBadge.isPending && <ButtonSpinner />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
