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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
          <div className="space-y-2">
            <Label htmlFor="bulk-rank">Rank</Label>
            <Select value={rank} onValueChange={setRank}>
              <SelectTrigger id="bulk-rank">
                <SelectValue placeholder="Don't change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>Don't change</SelectItem>
                {enums?.ranks.map((r: string) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Division */}
          <div className="space-y-2">
            <Label htmlFor="bulk-division">Division</Label>
            <Select value={divisionId} onValueChange={setDivisionId}>
              <SelectTrigger id="bulk-division">
                <SelectValue placeholder="Don't change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>Don't change</SelectItem>
                {divisions?.divisions.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Status */}
          <div className="space-y-2">
            <Label htmlFor="bulk-status">Status</Label>
            <Select value={memberStatusId} onValueChange={setMemberStatusId}>
              <SelectTrigger id="bulk-status">
                <SelectValue placeholder="Don't change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>Don't change</SelectItem>
                {enums?.memberStatuses.map((status: { id: string; name: string }) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Type */}
          <div className="space-y-2">
            <Label htmlFor="bulk-type">Member Type</Label>
            <Select value={memberTypeId} onValueChange={setMemberTypeId}>
              <SelectTrigger id="bulk-type">
                <SelectValue placeholder="Don't change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CHANGE}>Don't change</SelectItem>
                {enums?.memberTypes.map((type: { id: string; name: string }) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress indicator */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Updating... {progress}%
              </p>
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
