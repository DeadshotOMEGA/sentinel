'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, AlertTriangle, Trash2 } from 'lucide-react'
import { useUpdateCheckin, useDeleteCheckin } from '@/hooks/use-checkins'
import type { CheckinWithMemberResponse } from '@sentinel/contracts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface EditCheckinModalProps {
  checkin: CheckinWithMemberResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatForDatetimeLocal(isoString: string): string {
  // datetime-local input needs "YYYY-MM-DDTHH:mm" in local time
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDisplayName(checkin: CheckinWithMemberResponse): string {
  if (checkin.type === 'visitor') return checkin.visitorName ?? 'Unknown Visitor'
  if (!checkin.member) return 'Unknown Member'
  return `${checkin.member.rank} ${checkin.member.firstName} ${checkin.member.lastName}`
}

export function EditCheckinModal({ checkin, open, onOpenChange }: EditCheckinModalProps) {
  const updateCheckin = useUpdateCheckin()
  const deleteCheckin = useDeleteCheckin()

  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [timestamp, setTimestamp] = useState('')
  const [editReason, setEditReason] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Sync form state when checkin changes
  useEffect(() => {
    if (checkin) {
      setDirection(checkin.direction as 'in' | 'out')
      setTimestamp(formatForDatetimeLocal(checkin.timestamp))
      setEditReason('')
      setConfirmingDelete(false)
    }
  }, [checkin])

  if (!checkin) return null

  const parsedTimestamp = timestamp ? new Date(timestamp) : null
  const isDirty =
    direction !== checkin.direction ||
    (parsedTimestamp !== null &&
      !isNaN(parsedTimestamp.getTime()) &&
      parsedTimestamp.toISOString() !== new Date(checkin.timestamp).toISOString())

  const handleSave = async () => {
    if (!editReason.trim()) {
      toast.error('A reason for the edit is required')
      return
    }
    if (!parsedTimestamp || isNaN(parsedTimestamp.getTime())) {
      toast.error('Invalid timestamp')
      return
    }

    try {
      await updateCheckin.mutateAsync({
        id: checkin.id,
        data: {
          direction,
          timestamp: parsedTimestamp.toISOString(),
          editReason: editReason.trim(),
        },
      })
      toast.success('Check-in record updated')
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update check-in'
      toast.error(message)
    }
  }

  const handleDelete = async () => {
    if (!checkin) return
    try {
      await deleteCheckin.mutateAsync(checkin.id)
      toast.success('Check-in record deleted')
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete check-in'
      toast.error(message)
    }
  }

  const handleClose = () => {
    setConfirmingDelete(false)
    onOpenChange(false)
  }

  const displayName = getDisplayName(checkin)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2" style={{ gap: 'var(--space-2)' }}>
            <Pencil className="h-5 w-5" aria-hidden="true" />
            Edit Check-In Record
          </DialogTitle>
          <DialogDescription>{displayName}</DialogDescription>
        </DialogHeader>

        {/* Audit warning — informational banner uses fadded variant */}
        <div
          className="bg-warning-fadded text-warning-fadded-content flex items-start rounded text-sm"
          role="note"
          aria-label="Audit log notice"
          style={{ gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-3)' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
          <span>All edits are permanently logged with your name, timestamp, and reason.</span>
        </div>

        <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
          {/* Direction */}
          <div className="form-control">
            <div className="label">
              <span className="label-text font-medium">Direction</span>
            </div>
            <div className="flex" style={{ gap: 'var(--space-3)' }}>
              <label className="label cursor-pointer" style={{ gap: 'var(--space-2)' }}>
                <input
                  type="radio"
                  name="direction"
                  className="radio radio-primary radio-sm"
                  value="in"
                  checked={direction === 'in'}
                  onChange={() => setDirection('in')}
                />
                <span className="label-text">Check In</span>
              </label>
              <label className="label cursor-pointer" style={{ gap: 'var(--space-2)' }}>
                <input
                  type="radio"
                  name="direction"
                  className="radio radio-primary radio-sm"
                  value="out"
                  checked={direction === 'out'}
                  onChange={() => setDirection('out')}
                />
                <span className="label-text">Check Out</span>
              </label>
            </div>
          </div>

          {/* Timestamp */}
          <div className="form-control">
            <label className="label" htmlFor="edit-checkin-timestamp">
              <span className="label-text font-medium">Timestamp</span>
            </label>
            <input
              id="edit-checkin-timestamp"
              type="datetime-local"
              className="input input-bordered w-full"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              aria-required="false"
            />
          </div>

          {/* Read-only context fields */}
          <div
            className="grid grid-cols-2 text-sm text-base-content/60"
            style={{ gap: 'var(--space-3)' }}
          >
            <div>
              <span className="font-medium text-base-content">Kiosk</span>
              <p className="font-mono">{checkin.kioskId}</p>
            </div>
            <div>
              <span className="font-medium text-base-content">Method</span>
              <p className="capitalize">{checkin.method ?? 'badge'}</p>
            </div>
          </div>

          {/* Edit reason — required */}
          <div className="form-control">
            <label className="label" htmlFor="edit-checkin-reason">
              <span className="label-text font-medium">
                Reason for Edit <span className="text-error" aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </span>
            </label>
            <textarea
              id="edit-checkin-reason"
              className="textarea textarea-bordered w-full resize-none"
              rows={3}
              placeholder="e.g. Wrong member was manually checked in. Correcting timestamp from 19:45 to 20:15."
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              maxLength={500}
              aria-required="true"
              aria-describedby="edit-checkin-reason-counter"
            />
            <div className="label">
              <span
                id="edit-checkin-reason-counter"
                className="label-text-alt text-base-content/50"
                aria-live="polite"
                aria-atomic="true"
              >
                {editReason.length}/500 characters
              </span>
            </div>
          </div>
        </div>

        {confirmingDelete ? (
          <DialogFooter className="flex-col items-stretch" style={{ gap: 'var(--space-2)' }}>
            {/* Delete confirmation — full-strength error for destructive action */}
            <div
              className="alert alert-error py-2 text-sm"
              role="alert"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>This will permanently delete the check-in record. This cannot be undone.</span>
            </div>
            <div className="flex justify-end" style={{ gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteCheckin.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={handleDelete}
                disabled={deleteCheckin.isPending}
                aria-busy={deleteCheckin.isPending}
              >
                {deleteCheckin.isPending ? (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                {deleteCheckin.isPending ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost btn-error mr-auto"
              onClick={() => setConfirmingDelete(true)}
              disabled={updateCheckin.isPending}
              aria-label="Delete this check-in record"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              disabled={updateCheckin.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={updateCheckin.isPending || !isDirty || !editReason.trim()}
              aria-busy={updateCheckin.isPending}
            >
              {updateCheckin.isPending ? (
                <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              ) : (
                'Save Changes'
              )}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
