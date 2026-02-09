'use client'

import { useState, useMemo } from 'react'
import { useTags, useAssignTag } from '@/hooks/use-member-tags'
import { useQualificationTypes } from '@/hooks/use-qualifications'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Chip, type ChipVariant, type ChipColor } from '@/components/ui/chip'
import { ButtonSpinner } from '@/components/ui/loading-spinner'

interface BulkAssignTagModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberIds: string[]
  onSuccess?: () => void
}

export function BulkAssignTagModal({
  open,
  onOpenChange,
  memberIds,
  onSuccess,
}: BulkAssignTagModalProps) {
  const { data: allTags } = useTags()
  const { data: qualificationTypes } = useQualificationTypes()
  const assignTag = useAssignTag()

  const [tagId, setTagId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Filter out tags linked to qualifications (auto-assigned via qualification grants)
  const availableTags = useMemo(() => {
    if (!allTags) return []
    const qualificationTagIds = new Set(
      qualificationTypes?.filter((qt) => qt.tagId).map((qt) => qt.tagId) ?? []
    )
    return allTags.filter((tag) => !qualificationTagIds.has(tag.id))
  }, [allTags, qualificationTypes])

  const selectedTag = availableTags.find((t) => t.id === tagId)

  const handleSubmit = async () => {
    if (!tagId) return

    setIsSubmitting(true)
    setProgress(0)
    setError(null)

    const results: PromiseSettledResult<unknown>[] = []
    for (let i = 0; i < memberIds.length; i++) {
      const result = await Promise.allSettled([
        assignTag.mutateAsync({
          memberId: memberIds[i],
          data: { tagId },
        }),
      ])
      results.push(result[0])
      setProgress(Math.round(((i + 1) / memberIds.length) * 100))
      if (i < memberIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    const failedCount = results.filter((r) => r.status === 'rejected').length
    const succeededCount = results.filter((r) => r.status === 'fulfilled').length

    if (failedCount === 0) {
      onSuccess?.()
      onOpenChange(false)
    } else {
      setError(
        `${succeededCount} of ${memberIds.length} tags assigned successfully. ${failedCount} failed.`
      )
    }

    setIsSubmitting(false)
    setProgress(0)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTagId('')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Tag to {memberIds.length} Members</DialogTitle>
          <DialogDescription>Assign a tag to all selected members.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tag Selection */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Tag</legend>
            <select
              id="bulk-tag"
              className="select"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
            >
              <option value="">Select a tag...</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Tag Preview */}
          {selectedTag && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/60">Preview:</span>
              <Chip
                variant={(selectedTag.chipVariant as ChipVariant) || 'solid'}
                color={(selectedTag.chipColor as ChipColor) || 'default'}
              >
                {selectedTag.name}
              </Chip>
            </div>
          )}

          {/* Progress indicator */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="h-2 bg-base-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-base-content/60 text-center">Assigning... {progress}%</p>
            </div>
          )}

          {error && (
            <div role="alert" className="alert alert-error">
              <div className="text-sm">{error}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            className="btn btn-outline btn-md"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={handleSubmit}
            disabled={isSubmitting || !tagId}
          >
            {isSubmitting && <ButtonSpinner />}
            Assign to {memberIds.length} Members
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
