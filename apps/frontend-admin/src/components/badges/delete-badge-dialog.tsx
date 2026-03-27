'use client'

import { useEffect, useState } from 'react'
import { useDeleteBadge } from '@/hooks/use-badges'
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
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import type { BadgeWithAssignmentResponse } from '@sentinel/contracts'

interface DeleteBadgeDialogProps {
  badge: BadgeWithAssignmentResponse
  onOpenChange: (open: boolean) => void
}

export function DeleteBadgeDialog({ badge, onOpenChange }: DeleteBadgeDialogProps) {
  const deleteBadge = useDeleteBadge()
  const [unassignFirst, setUnassignFirst] = useState(badge.assignmentType !== 'unassigned')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUnassignFirst(badge.assignmentType !== 'unassigned')
    setError(null)
  }, [badge.assignmentType, badge.id])

  const handleDelete = async () => {
    try {
      setError(null)
      await deleteBadge.mutateAsync({
        id: badge.id,
        unassignFirst,
      })
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to delete badge')
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Badge</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-semibold">{badge.serialNumber}</span> only if it has no
            historical check-in or event activity. Otherwise, decommission it instead.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {badge.assignmentType !== 'unassigned' && (
          <label className="flex items-start gap-3 rounded-box border border-base-300 px-4 py-3 text-sm">
            <Checkbox
              checked={unassignFirst}
              onCheckedChange={setUnassignFirst}
              aria-label="Remove current assignments before deleting badge"
            />
            <span>Remove the current assignment before attempting to delete this badge.</span>
          </label>
        )}

        {error && (
          <div role="alert" className="alert alert-error">
            <div className="text-sm">{error}</div>
          </div>
        )}

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
