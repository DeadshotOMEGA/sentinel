'use client'

import { use, useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  MapPin,
  Clock,
  User,
  Loader2,
  Edit,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UnitEventStatus } from '@sentinel/contracts'
import { useUnitEvent, useDeleteUnitEvent, useUpdateUnitEventStatus } from '@/hooks/use-events'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { EventDutyWatchCard } from '@/components/events/event-duty-watch-card'
import { EventFormModal } from '@/components/events/event-form-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

// Status transition mapping: which actions are available for each status
const STATUS_TRANSITIONS: Record<
  string,
  {
    next?: string
    label?: string
    actions?: Array<{ status: string; label: string; variant?: string }>
  }
> = {
  draft: {
    next: 'planned',
    label: 'Mark Planned',
    actions: [],
  },
  planned: {
    next: 'confirmed',
    label: 'Confirm',
    actions: [
      { status: 'cancelled', label: 'Cancel', variant: 'ghost' },
      { status: 'postponed', label: 'Postpone', variant: 'ghost' },
    ],
  },
  confirmed: {
    next: 'in_progress',
    label: 'Start',
    actions: [
      { status: 'cancelled', label: 'Cancel', variant: 'ghost' },
      { status: 'postponed', label: 'Postpone', variant: 'ghost' },
    ],
  },
  in_progress: {
    next: 'completed',
    label: 'Complete',
    actions: [],
  },
  completed: {},
  cancelled: {},
  postponed: {
    actions: [{ status: 'planned', label: 'Reschedule', variant: 'default' }],
  },
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const { data: event, isLoading, isError } = useUnitEvent(id)
  const deleteEvent = useDeleteUnitEvent()
  const updateStatus = useUpdateUnitEventStatus()

  const handleDelete = async () => {
    if (!event) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      await deleteEvent.mutateAsync(id)
      router.push('/events')
    } catch (error) {
      console.error('Failed to delete event:', error)
      window.alert('Failed to delete event. Please try again.')
    }
  }

  const handleStatusChange = async (newStatus: UnitEventStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus })
    } catch (_error) {
      window.alert('Failed to update event status. Please try again.')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" aria-hidden="true" />
          <p className="text-base-content/60">Loading event details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError || !event) {
    return (
      <div className="space-y-6">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content"
          aria-label="Back to events list"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Events
        </Link>
        <div role="alert" className="alert alert-error">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <div className="text-sm">
            {isError ? 'Failed to load event details. Please try again.' : 'Event not found.'}
          </div>
        </div>
      </div>
    )
  }

  const transitions = STATUS_TRANSITIONS[event.status] || {}
  const canEdit = event.status === 'draft' || event.status === 'planned'
  const canDelete = event.status === 'draft'
  const isDutyWatchEditable = event.status === 'draft' || event.status === 'planned'

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-base-content"
        aria-label="Back to events list"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Events
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
          <div className="flex items-center gap-2">
            <EventStatusBadge status={event.status} />
            {event.eventType && <span className="badge badge-outline">{event.eventType.name}</span>}
            {event.eventType?.category && (
              <span className="badge badge-ghost">
                {event.eventType.category.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsEditModalOpen(true)}
              aria-label="Edit event"
            >
              <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              aria-label="Delete event"
            >
              {deleteEvent.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status transition buttons */}
      {(transitions.next || (transitions.actions && transitions.actions.length > 0)) && (
        <div className="flex items-center gap-2">
          {transitions.next && transitions.label && (
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => handleStatusChange(transitions.next as UnitEventStatus)}
              disabled={updateStatus.isPending}
              aria-label={transitions.label}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
              ) : null}
              {transitions.label}
            </button>
          )}
          {transitions.actions?.map((action) => {
            const variantClass =
              action.variant === 'ghost'
                ? 'btn-ghost'
                : action.variant === 'default'
                  ? 'btn-primary'
                  : 'btn-outline'
            return (
              <button
                key={action.status}
                type="button"
                className={`btn ${variantClass} btn-md`}
                onClick={() => handleStatusChange(action.status as UnitEventStatus)}
                disabled={updateStatus.isPending}
                aria-label={action.label}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList role="tablist" aria-label="Event details tabs">
          <TabsTrigger value="overview" aria-controls="overview-panel">
            Overview
          </TabsTrigger>
          <TabsTrigger value="duty-watch" aria-controls="duty-watch-panel">
            Duty Watch
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" id="overview-panel" aria-labelledby="overview-tab">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <CalendarClock
                    className="h-5 w-5 text-base-content/60 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm text-base-content/60">Date</p>
                    <p className="font-medium">
                      {new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-CA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Time */}
                {(event.startTime || event.endTime) && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-base-content/60 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-base-content/60">Time</p>
                      <p className="font-medium">
                        {event.startTime || 'N/A'} {event.endTime && `- ${event.endTime}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-base-content/60 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-base-content/60">Location</p>
                      <p className="font-medium">{event.location}</p>
                    </div>
                  </div>
                )}

                {/* Organizer */}
                {event.organizer && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-base-content/60 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-sm text-base-content/60">Organizer</p>
                      <p className="font-medium">{event.organizer}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-base-content/60" aria-hidden="true" />
                    <p className="text-sm text-base-content/60">Description</p>
                  </div>
                  <p className="text-base-content whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {/* Notes */}
              {event.notes && (
                <div className="mt-6 p-4 bg-base-200 rounded-lg">
                  <p className="text-sm text-base-content/60 mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                </div>
              )}

              {/* Metadata */}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-base-content/60 mb-2">Additional Information</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(event.metadata as Record<string, unknown>).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-base-content/60">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duty Watch Tab */}
        <TabsContent value="duty-watch" id="duty-watch-panel" aria-labelledby="duty-watch-tab">
          <EventDutyWatchCard
            eventId={id}
            positions={event.dutyPositions || []}
            assignments={event.dutyAssignments || []}
            isEditable={isDutyWatchEditable}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <EventFormModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} event={event} />
    </div>
  )
}
