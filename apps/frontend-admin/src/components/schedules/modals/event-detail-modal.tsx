'use client'

import { format } from 'date-fns'
import { Calendar, Clock, MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AppBadge } from '@/components/ui/AppBadge'
import { useUnitEvent } from '@/hooks/use-events'
import { useModalContext } from './modal-context'
import { parseDateString } from '@/lib/date-utils'

export function EventDetailModal() {
  const { modal, closeModal } = useModalContext()
  const isOpen = modal.type === 'event' && modal.eventId !== null
  const eventId = modal.eventId ?? ''

  const { data: event, isLoading } = useUnitEvent(eventId)

  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
    confirmed: 'success',
    tentative: 'warning',
    cancelled: 'error' as 'info', // closest available
    draft: 'neutral',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-base-content/60">
            Loading event details...
          </div>
        ) : event ? (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
              <DialogDescription>{event.description ?? 'No description'}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-base-content/60" />
                <span>{format(parseDateString(event.eventDate), 'EEEE, MMMM d, yyyy')}</span>
              </div>

              {/* Time */}
              {(event.startTime || event.endTime) && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-base-content/60" />
                  <span>
                    {event.startTime ?? '—'} — {event.endTime ?? '—'}
                  </span>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-base-content/60" />
                  <span>{event.location}</span>
                </div>
              )}

              {/* Status & category */}
              <div className="flex items-center gap-2">
                {event.status && (
                  <AppBadge status={statusMap[event.status] ?? 'neutral'} size="sm">
                    {event.status}
                  </AppBadge>
                )}
                {event.eventType?.category && (
                  <span className="badge badge-outline badge-sm">{event.eventType.category}</span>
                )}
                {event.requiresDutyWatch && (
                  <AppBadge status="info" size="sm">
                    Requires DW
                  </AppBadge>
                )}
              </div>
            </div>

            <DialogFooter showCloseButton />
          </>
        ) : (
          <div className="text-center py-8 text-base-content/60">Event not found</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
