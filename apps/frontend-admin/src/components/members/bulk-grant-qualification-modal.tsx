'use client'

import { useState } from 'react'
import { useQualificationTypes, useGrantQualification } from '@/hooks/use-qualifications'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ButtonSpinner } from '@/components/ui/loading-spinner'

interface BulkGrantQualificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberIds: string[]
  onSuccess?: () => void
}

export function BulkGrantQualificationModal({
  open,
  onOpenChange,
  memberIds,
  onSuccess,
}: BulkGrantQualificationModalProps) {
  const { data: qualificationTypes } = useQualificationTypes()
  const grantQualification = useGrantQualification()

  const [qualificationTypeId, setQualificationTypeId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const sortedQualificationTypes = qualificationTypes
    ? [...qualificationTypes].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    : []

  const handleSubmit = async () => {
    if (!qualificationTypeId) return

    setIsSubmitting(true)
    setProgress(0)
    setError(null)

    const results: PromiseSettledResult<unknown>[] = []
    for (let i = 0; i < memberIds.length; i++) {
      const result = await Promise.allSettled([
        grantQualification.mutateAsync({
          memberId: memberIds[i],
          data: {
            qualificationTypeId,
            expiresAt: expiresAt || undefined,
            notes: notes || undefined,
          },
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
        `${succeededCount} of ${memberIds.length} members granted successfully. ${failedCount} failed.`
      )
    }

    setIsSubmitting(false)
    setProgress(0)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setQualificationTypeId('')
      setExpiresAt('')
      setNotes('')
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Grant Qualification to {memberIds.length} Members</DialogTitle>
          <DialogDescription>Grant a qualification to all selected members.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Qualification Type */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Qualification Type</legend>
            <select
              id="bulk-qualification-type"
              className="select"
              value={qualificationTypeId}
              onChange={(e) => setQualificationTypeId(e.target.value)}
            >
              <option value="">Select a qualification...</option>
              {sortedQualificationTypes.map((qt) => (
                <option key={qt.id} value={qt.id}>
                  {qt.code} — {qt.name}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Expiration Date */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Expiration Date (optional)</legend>
            <input
              id="bulk-expiration"
              type="datetime-local"
              className="input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </fieldset>

          {/* Notes */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Notes (optional)</legend>
            <input
              className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
              id="bulk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Granted during training weekend"
            />
          </fieldset>

          {/* Progress indicator */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="h-2 bg-base-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-base-content/60 text-center">Granting... {progress}%</p>
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
            disabled={isSubmitting || !qualificationTypeId}
          >
            {isSubmitting && <ButtonSpinner />}
            Grant to {memberIds.length} Members
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
