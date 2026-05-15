'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EventStatusBadge } from './event-status-badge'
import { useDeleteUnitEvent } from '@/hooks/use-events'
import { formatUnitEventDateRange } from '@/lib/unit-event-dates'
import { TID } from '@/lib/test-ids'
import type { UnitEventResponse } from '@sentinel/contracts'

interface EventDeleteDialogProps {
  event: UnitEventResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function EventDeleteDialog({
  event,
  open,
  onOpenChange,
  onDeleted,
}: EventDeleteDialogProps) {
  const deleteEvent = useDeleteUnitEvent()

  const handleDelete = async () => {
    if (!event) return

    try {
      await deleteEvent.mutateAsync(event.id)
      toast.success(`Deleted ${event.title}`)
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete event'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible={!deleteEvent.isPending}>
      <DialogContent size="md" testId={TID.events.deleteDialog}>
        <DialogHeader>
          <DialogTitle>Delete event</DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-error/25 bg-error-fadded p-4 text-error-fadded-content">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">This permanently removes the event.</p>
                <p>
                  Duty Watch positions and assignments for this event are also removed. Visitor
                  records stay in Sentinel, but they will no longer be linked to this event.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-base-300 bg-base-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="text-sm text-base-content/60">{formatUnitEventDateRange(event)}</p>
                </div>
                <EventStatusBadge status={event.status} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteEvent.isPending}
            data-testid={TID.events.deleteCancel}
          >
            Keep event
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={handleDelete}
            disabled={!event || deleteEvent.isPending}
            data-testid={TID.events.deleteConfirm}
          >
            {deleteEvent.isPending ? <ButtonSpinner /> : <Trash2 className="h-4 w-4" />}
            Delete event
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
