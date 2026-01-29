'use client'

import { useState } from 'react'
import { useUpdateMember } from '@/hooks/use-members'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface BulkEditMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberIds: string[]
  onSuccess?: () => void
}

const NO_CHANGE = '__no_change__'

export function BulkEditMemberModal({
  open,
  onOpenChange,
  memberIds,
  onSuccess,
}: BulkEditMemberModalProps) {
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const updateMember = useUpdateMember()

  const [rank, setRank] = useState(NO_CHANGE)
  const [divisionId, setDivisionId] = useState(NO_CHANGE)
  const [memberStatusId, setMemberStatusId] = useState(NO_CHANGE)
  const [memberTypeId, setMemberTypeId] = useState(NO_CHANGE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleSubmit = async () => {
    // Build update data only for changed fields
    const updateData: Record<string, string> = {}
    if (rank !== NO_CHANGE) updateData.rank = rank
    if (divisionId !== NO_CHANGE) updateData.divisionId = divisionId
    if (memberStatusId !== NO_CHANGE) updateData.memberStatusId = memberStatusId
    if (memberTypeId !== NO_CHANGE) updateData.memberTypeId = memberTypeId

    // If nothing to update, just close
    if (Object.keys(updateData).length === 0) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    setProgress(0)

    try {
      // Update members sequentially with delay to avoid rate limiting
      for (let i = 0; i < memberIds.length; i++) {
        await updateMember.mutateAsync({
          id: memberIds[i],
          data: updateData,
        })
        setProgress(Math.round(((i + 1) / memberIds.length) * 100))
        // Small delay to avoid rate limiting (100ms between requests)
        if (i < memberIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update members:', error)
    } finally {
      setIsSubmitting(false)
      setProgress(0)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setRank(NO_CHANGE)
      setDivisionId(NO_CHANGE)
      setMemberStatusId(NO_CHANGE)
      setMemberTypeId(NO_CHANGE)
    }
    onOpenChange(open)
  }

  const hasChanges =
    rank !== NO_CHANGE ||
    divisionId !== NO_CHANGE ||
    memberStatusId !== NO_CHANGE ||
    memberTypeId !== NO_CHANGE

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {memberIds.length} Members</DialogTitle>
          <DialogDescription>
            Update fields for all selected members. Fields set to "Don't change" will keep their
            current values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rank */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Rank</legend>
            <select
              id="bulk-rank"
              className="select"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
            >
              <option value={NO_CHANGE}>Don&apos;t change</option>
              {enums?.ranks.map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Division */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Division</legend>
            <select
              id="bulk-division"
              className="select"
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
            >
              <option value={NO_CHANGE}>Don&apos;t change</option>
              {divisions?.divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Member Status */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Status</legend>
            <select
              id="bulk-status"
              className="select"
              value={memberStatusId}
              onChange={(e) => setMemberStatusId(e.target.value)}
            >
              <option value={NO_CHANGE}>Don&apos;t change</option>
              {enums?.memberStatuses.map((status: { id: string; name: string }) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </fieldset>

          {/* Member Type */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Member Type</legend>
            <select
              id="bulk-type"
              className="select"
              value={memberTypeId}
              onChange={(e) => setMemberTypeId(e.target.value)}
            >
              <option value={NO_CHANGE}>Don&apos;t change</option>
              {enums?.memberTypes.map((type: { id: string; name: string }) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
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
              <p className="text-sm text-base-content/60 text-center">Updating... {progress}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !hasChanges}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update {memberIds.length} Members
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
