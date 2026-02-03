'use client'

import { useState } from 'react'
import { Tag, Plus, X, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Chip, type ChipVariant, type ChipColor } from '@/components/ui/chip'
import { useMemberTags, useTags, useAssignTag, useRemoveTag } from '@/hooks/use-member-tags'
import { useQualificationTypes } from '@/hooks/use-qualifications'
import type { MemberResponse } from '@sentinel/contracts'

interface MemberTagsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: MemberResponse | null
}

export function MemberTagsModal({ open, onOpenChange, member }: MemberTagsModalProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [removeTagId, setRemoveTagId] = useState<string | null>(null)
  const [assignTagId, setAssignTagId] = useState<string>('')

  const { data: memberTags, isLoading: loadingMemberTags } = useMemberTags(member?.id || '')
  const { data: allTags } = useTags()
  const { data: qualificationTypes } = useQualificationTypes()
  const assignTag = useAssignTag()
  const removeTag = useRemoveTag()

  const handleAssign = async () => {
    if (!member || !assignTagId) return

    try {
      await assignTag.mutateAsync({
        memberId: member.id,
        data: { tagId: assignTagId },
      })
      setIsAssignDialogOpen(false)
      setAssignTagId('')
    } catch (error) {
      console.error('Failed to assign tag:', error)
    }
  }

  const handleRemove = async () => {
    if (!member || !removeTagId) return

    try {
      await removeTag.mutateAsync({
        memberId: member.id,
        tagId: removeTagId,
      })
      setRemoveTagId(null)
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  // Get tags not already assigned to member and not linked to qualifications
  const assignedTagIds = new Set(memberTags?.map((mt) => mt.tagId) ?? [])
  const qualificationTagIds = new Set(
    qualificationTypes?.filter((qt) => qt.tagId).map((qt) => qt.tagId) ?? []
  )
  const availableTags = allTags?.filter(
    (tag) => !assignedTagIds.has(tag.id) && !qualificationTagIds.has(tag.id)
  )

  if (!member) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Member Tags
            </DialogTitle>
            <DialogDescription>
              {member.rank} {member.firstName} {member.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingMemberTags ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
              </div>
            ) : memberTags?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-base-content/60">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No tags assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {memberTags?.map((mt) => (
                  <div
                    key={mt.id}
                    className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Chip
                        variant={(mt.tag.chipVariant as ChipVariant) || 'solid'}
                        color={(mt.tag.chipColor as ChipColor) || 'default'}
                        size="sm"
                      >
                        {mt.tag.name}
                      </Chip>
                      {mt.tag.description && (
                        <span className="text-sm text-base-content/60">{mt.tag.description}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTagId(mt.tagId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <Button onClick={() => setIsAssignDialogOpen(true)} disabled={!availableTags?.length}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Tag
              </Button>
              {!availableTags?.length && allTags?.length && (
                <p className="text-xs text-base-content/60 mt-2">
                  Member has all available tags assigned
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Tag Dialog */}
      <AlertDialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTagId('')
          }
          setIsAssignDialogOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Select a tag to assign to {member.rank} {member.firstName} {member.lastName}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Tag</legend>
              <select
                className="select"
                value={assignTagId}
                onChange={(e) => setAssignTagId(e.target.value)}
              >
                <option value="" disabled>
                  Select tag...
                </option>
                {availableTags?.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                    {tag.description ? ` - ${tag.description}` : ''}
                  </option>
                ))}
              </select>
            </fieldset>

            {assignTagId && availableTags && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/60">Preview:</span>
                {(() => {
                  const selectedTag = availableTags.find((t) => t.id === assignTagId)
                  if (!selectedTag) return null
                  return (
                    <Chip
                      variant={(selectedTag.chipVariant as ChipVariant) || 'solid'}
                      color={(selectedTag.chipColor as ChipColor) || 'default'}
                      size="sm"
                    >
                      {selectedTag.name}
                    </Chip>
                  )
                })()}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAssignTagId('')
                setIsAssignDialogOpen(false)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAssign} disabled={!assignTagId || assignTag.isPending}>
              {assignTag.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Tag Confirmation Dialog */}
      <AlertDialog open={!!removeTagId} onOpenChange={() => setRemoveTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag from the member.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeTag.isPending}
              className="bg-error text-error-content hover:bg-error/90"
            >
              {removeTag.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
