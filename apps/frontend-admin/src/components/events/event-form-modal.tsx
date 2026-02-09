'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateUnitEvent, useUpdateUnitEvent, useEventTypes } from '@/hooks/use-events'
import type {
  UnitEventWithDetailsResponse,
  CreateUnitEventInput,
  UpdateUnitEventInput,
} from '@sentinel/contracts'

interface EventFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: UnitEventWithDetailsResponse | null
  onSuccess?: () => void
}

export function EventFormModal({
  open,
  onOpenChange,
  event = null,
  onSuccess,
}: EventFormModalProps) {
  const isEditMode = !!event

  // Form state
  const [title, setTitle] = useState('')
  const [eventTypeId, setEventTypeId] = useState<string | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [requiresDutyWatch, setRequiresDutyWatch] = useState(false)
  const [notes, setNotes] = useState('')
  const [metadata, setMetadata] = useState('')

  // Collapsible sections
  const [locationOpen, setLocationOpen] = useState(false)
  const [dutyWatchOpen, setDutyWatchOpen] = useState(false)
  const [additionalOpen, setAdditionalOpen] = useState(false)

  const { data: eventTypesData } = useEventTypes()
  const createMutation = useCreateUnitEvent()
  const updateMutation = useUpdateUnitEvent()

  const eventTypes = eventTypesData ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setEventTypeId(event.eventTypeId)
      setEventDate(event.eventDate)
      setStartTime(event.startTime ?? '')
      setEndTime(event.endTime ?? '')
      setLocation(event.location ?? '')
      setDescription(event.description ?? '')
      setOrganizer(event.organizer ?? '')
      setRequiresDutyWatch(event.requiresDutyWatch)
      setNotes(event.notes ?? '')
      setMetadata(event.metadata ? JSON.stringify(event.metadata, null, 2) : '')
    } else {
      // Reset form
      setTitle('')
      setEventTypeId(null)
      setEventDate('')
      setStartTime('')
      setEndTime('')
      setLocation('')
      setDescription('')
      setOrganizer('')
      setRequiresDutyWatch(false)
      setNotes('')
      setMetadata('')
    }
  }, [event, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    let parsedMetadata: Record<string, unknown> | null = null
    if (metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(metadata)
      } catch (_error) {
        window.alert('Invalid JSON in metadata field')
        return
      }
    }

    const baseData = {
      title,
      eventTypeId: eventTypeId || null,
      eventDate,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null,
      description: description || null,
      organizer: organizer || null,
      requiresDutyWatch,
      metadata: parsedMetadata,
      notes: notes || null,
    }

    try {
      if (isEditMode) {
        const updateData: UpdateUnitEventInput = baseData
        await updateMutation.mutateAsync({ id: event.id, data: updateData })
      } else {
        const createData: CreateUnitEventInput = {
          ...baseData,
          status: 'draft',
        }
        await createMutation.mutateAsync(createData)
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the event details below.'
                : 'Fill in the details to create a new unit event.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Section 1: Basic Info (always visible) */}
            <div className="space-y-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Title <span className="text-error">*</span>
                </legend>
                <input
                  className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  aria-required="true"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Event Type</legend>
                <select
                  id="event-type"
                  className="select"
                  value={eventTypeId ?? ''}
                  onChange={(e) => setEventTypeId(e.target.value || null)}
                >
                  <option value="">None</option>
                  {eventTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </fieldset>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Date <span className="text-error">*</span>
                  </legend>
                  <input
                    className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    aria-required="true"
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Start Time</legend>
                  <input
                    className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">End Time</legend>
                  <input
                    className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </fieldset>
              </div>
            </div>

            {/* Section 2: Location & Details (collapsible) */}
            <div className="collapse collapse-arrow bg-base-200 rounded-lg">
              <input
                type="checkbox"
                checked={locationOpen}
                onChange={(e) => setLocationOpen(e.target.checked)}
                aria-label="Toggle location and details section"
              />
              <div className="collapse-title font-medium flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Location & Details
              </div>
              <div className="collapse-content space-y-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Location</legend>
                  <input
                    className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={200}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Description</legend>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    rows={4}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Organizer</legend>
                  <input
                    className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    id="organizer"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    maxLength={200}
                  />
                </fieldset>
              </div>
            </div>

            {/* Section 3: Duty Watch (collapsible) */}
            <div className="collapse collapse-arrow bg-base-200 rounded-lg">
              <input
                type="checkbox"
                checked={dutyWatchOpen}
                onChange={(e) => setDutyWatchOpen(e.target.checked)}
                aria-label="Toggle duty watch section"
              />
              <div className="collapse-title font-medium flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Duty Watch
              </div>
              <div className="collapse-content space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="requires-duty-watch"
                    checked={requiresDutyWatch}
                    onCheckedChange={(checked) => setRequiresDutyWatch(checked as boolean)}
                  />
                  <div>
                    <label
                      htmlFor="requires-duty-watch"
                      className="flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 cursor-pointer"
                    >
                      Requires Duty Watch
                    </label>
                    {requiresDutyWatch && (
                      <p className="text-xs text-base-content/60 mt-1">
                        Standard duty positions will be automatically created for this event.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Additional (collapsible) */}
            <div className="collapse collapse-arrow bg-base-200 rounded-lg">
              <input
                type="checkbox"
                checked={additionalOpen}
                onChange={(e) => setAdditionalOpen(e.target.checked)}
                aria-label="Toggle additional information section"
              />
              <div className="collapse-title font-medium flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Additional Information
              </div>
              <div className="collapse-content space-y-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Notes</legend>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="textarea textarea-bordered w-full"
                    rows={3}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Metadata (JSON)</legend>
                  <textarea
                    id="metadata"
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                    className="textarea textarea-bordered w-full font-mono text-xs"
                    rows={5}
                    placeholder='{"key": "value"}'
                  />
                </fieldset>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-ghost btn-md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-md" disabled={isSubmitting}>
              {isSubmitting && <ButtonSpinner />}
              {isEditMode ? 'Update Event' : 'Create Event'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
