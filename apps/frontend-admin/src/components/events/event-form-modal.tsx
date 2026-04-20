'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { TID } from '@/lib/test-ids'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

type FormErrors = {
  title?: string
  eventDate?: string
  metadata?: string
  timeRange?: string
}

function parseMetadataInput(rawMetadata: string): {
  value: Record<string, unknown> | null
  error?: string
} {
  if (!rawMetadata.trim()) {
    return { value: null }
  }

  try {
    const parsed = JSON.parse(rawMetadata) as unknown

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        value: null,
        error: 'Metadata must be a JSON object (for example: {"key": "value"}).',
      }
    }

    return { value: parsed as Record<string, unknown> }
  } catch (_error) {
    return {
      value: null,
      error: 'Metadata must be valid JSON (for example: {"key": "value"}).',
    }
  }
}

function validateForm(input: {
  title: string
  eventDate: string
  startTime: string
  endTime: string
  metadata: string
}): { errors: FormErrors; parsedMetadata: Record<string, unknown> | null } {
  const errors: FormErrors = {}

  if (!input.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (!input.eventDate.trim()) {
    errors.eventDate = 'Date is required.'
  }

  if (input.startTime && input.endTime && input.endTime < input.startTime) {
    errors.timeRange = 'End time must be later than start time.'
  }

  const metadataResult = parseMetadataInput(input.metadata)
  if (metadataResult.error) {
    errors.metadata = metadataResult.error
  }

  return {
    errors,
    parsedMetadata: metadataResult.value,
  }
}

export function EventFormModal({
  open,
  onOpenChange,
  event = null,
  onSuccess,
}: EventFormModalProps) {
  const isEditMode = !!event

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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const eventTypesQuery = useEventTypes()
  const createMutation = useCreateUnitEvent()
  const updateMutation = useUpdateUnitEvent()

  const eventTypes = eventTypesQuery.data ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isEventTypesLoading = eventTypesQuery.isLoading
  const isEventTypesError = eventTypesQuery.isError
  const hasNoEventTypes = !isEventTypesLoading && !isEventTypesError && eventTypes.length === 0

  const validationSummary = useMemo(() => {
    return Object.values(formErrors).filter(Boolean) as string[]
  }, [formErrors])

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

    setShowAdvanced(false)
    setFormErrors({})
    setSubmitError(null)
  }, [event, open])

  const clearFieldError = (field: keyof FormErrors) => {
    if (!formErrors[field]) {
      return
    }

    setFormErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const { errors, parsedMetadata } = validateForm({
      title,
      eventDate,
      startTime,
      endTime,
      metadata,
    })

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setSubmitError(null)

    const baseData = {
      title: title.trim(),
      eventTypeId: eventTypeId || null,
      eventDate,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location.trim() || null,
      description: description.trim() || null,
      organizer: organizer.trim() || null,
      requiresDutyWatch,
      metadata: parsedMetadata,
      notes: notes.trim() || null,
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
      const message = error instanceof Error ? error.message : 'Failed to save event. Please retry.'
      setSubmitError(message)
      console.error('Failed to save event:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto bg-base-100 p-[var(--space-4)]"
        testId="event-form-modal"
      >
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader className="mb-[var(--space-3)]">
            <DialogTitle>{isEditMode ? 'Edit event' : 'Create event'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-[var(--space-4)]">
            {submitError && (
              <div className="alert alert-error" role="alert" aria-live="assertive">
                <span>{submitError}</span>
              </div>
            )}

            {validationSummary.length > 0 && (
              <div className="alert alert-warning" role="alert" aria-live="polite">
                <span>
                  Please correct the highlighted field
                  {validationSummary.length > 1 ? 's' : ''} before submitting.
                </span>
              </div>
            )}

            <section
              className="space-y-[var(--space-3)] rounded-lg border border-base-300 bg-base-200 p-[var(--space-4)]"
              aria-label="Required event details"
            >
              <div className="flex items-center justify-between border-b border-base-300 pb-[var(--space-2)]">
                <p className="font-medium text-base-content">Required now</p>
                <span className="text-xs text-base-content/60">Fields with * are required</span>
              </div>

              <div className="space-y-[var(--space-3)]">
                <label className="input input-bordered w-full">
                  <span className="label">
                    Title <span className="text-error">*</span>
                  </span>
                  <input
                    className="grow"
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      clearFieldError('title')
                      setSubmitError(null)
                    }}
                    maxLength={200}
                    aria-required="true"
                    aria-invalid={formErrors.title ? 'true' : 'false'}
                    aria-describedby={formErrors.title ? 'event-form-title-error' : undefined}
                    disabled={isSubmitting}
                    data-testid={TID.events.form.title}
                  />
                </label>
                {formErrors.title && (
                  <p id="event-form-title-error" className="text-sm text-error" role="alert">
                    {formErrors.title}
                  </p>
                )}

                <label className="select w-full">
                  <span className="label">Event type</span>
                  <select
                    id="event-type"
                    value={eventTypeId ?? ''}
                    onChange={(e) => {
                      setEventTypeId(e.target.value || null)
                      setSubmitError(null)
                    }}
                    disabled={isSubmitting || isEventTypesLoading}
                    data-testid={TID.events.form.type}
                  >
                    <option value="">None</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                {isEventTypesLoading && (
                  <p className="text-xs text-base-content/60" aria-live="polite">
                    Loading event types...
                  </p>
                )}
                {hasNoEventTypes && (
                  <p className="text-xs text-base-content/60">
                    No event types configured yet. You can continue with "None".
                  </p>
                )}
                {isEventTypesError && (
                  <div className="alert alert-warning" role="alert">
                    <span>Event types are unavailable right now. You can continue with "None".</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-[var(--space-3)] xl:grid-cols-3">
                  <div>
                    <label className="input input-bordered w-full">
                      <span className="label">
                        Date <span className="text-error">*</span>
                      </span>
                      <input
                        className="grow"
                        id="event-date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => {
                          setEventDate(e.target.value)
                          clearFieldError('eventDate')
                          setSubmitError(null)
                        }}
                        aria-required="true"
                        aria-invalid={formErrors.eventDate ? 'true' : 'false'}
                        aria-describedby={formErrors.eventDate ? 'event-form-date-error' : undefined}
                        disabled={isSubmitting}
                        data-testid={TID.events.form.date}
                      />
                    </label>
                    {formErrors.eventDate && (
                      <p id="event-form-date-error" className="mt-[var(--space-1)] text-sm text-error" role="alert">
                        {formErrors.eventDate}
                      </p>
                    )}
                  </div>

                  <label className="input input-bordered w-full">
                    <span className="label">Start time</span>
                    <input
                      className="grow"
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value)
                        clearFieldError('timeRange')
                        setSubmitError(null)
                      }}
                      aria-invalid={formErrors.timeRange ? 'true' : 'false'}
                      aria-describedby={formErrors.timeRange ? 'event-form-time-error' : undefined}
                      disabled={isSubmitting}
                      data-testid={TID.events.form.startTime}
                    />
                  </label>

                  <label className="input input-bordered w-full">
                    <span className="label">End time</span>
                    <input
                      className="grow"
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value)
                        clearFieldError('timeRange')
                        setSubmitError(null)
                      }}
                      aria-invalid={formErrors.timeRange ? 'true' : 'false'}
                      aria-describedby={formErrors.timeRange ? 'event-form-time-error' : undefined}
                      disabled={isSubmitting}
                      data-testid={TID.events.form.endTime}
                    />
                  </label>
                </div>

                <p className="text-xs text-base-content/60">
                  If both times are set, end time must be later than start time.
                </p>
                {formErrors.timeRange && (
                  <p id="event-form-time-error" className="text-sm text-error" role="alert">
                    {formErrors.timeRange}
                  </p>
                )}

                <div className="rounded-md border border-base-300 bg-base-100 p-[var(--space-3)]">
                  <label
                    htmlFor="requires-duty-watch"
                    className="flex cursor-pointer items-start gap-[var(--space-2)]"
                  >
                    <Checkbox
                      id="requires-duty-watch"
                      checked={requiresDutyWatch}
                      onCheckedChange={(checked) => setRequiresDutyWatch(checked === true)}
                      disabled={isSubmitting}
                    />
                    <span className="space-y-1">
                      <span className="text-sm font-medium">Requires duty watch</span>
                      <span className="block text-xs text-base-content/60">
                        Creates standard duty positions for this event.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <div className="collapse collapse-arrow rounded-lg border border-base-300 bg-base-200">
              <input
                type="checkbox"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                aria-label="Toggle advanced details"
                disabled={isSubmitting}
              />
              <div className="collapse-title flex items-center justify-between font-medium">
                <span>Advanced details</span>
                <span className="text-xs font-normal text-base-content/60">Optional</span>
              </div>
              <div className="collapse-content space-y-[var(--space-3)]">
                <label className="input input-bordered w-full">
                  <span className="label">Location</span>
                  <input
                    className="grow"
                    id="location"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value)
                      setSubmitError(null)
                    }}
                    maxLength={200}
                    disabled={isSubmitting}
                    data-testid={TID.events.form.location}
                  />
                </label>

                <label className="input input-bordered w-full">
                  <span className="label">Organizer</span>
                  <input
                    className="grow"
                    id="organizer"
                    value={organizer}
                    onChange={(e) => {
                      setOrganizer(e.target.value)
                      setSubmitError(null)
                    }}
                    maxLength={200}
                    disabled={isSubmitting}
                  />
                </label>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Description</legend>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      setSubmitError(null)
                    }}
                    className="textarea textarea-bordered w-full"
                    rows={4}
                    disabled={isSubmitting}
                    data-testid={TID.events.form.description}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Notes</legend>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value)
                      setSubmitError(null)
                    }}
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    disabled={isSubmitting}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Metadata (JSON)</legend>
                  <textarea
                    id="metadata"
                    value={metadata}
                    onChange={(e) => {
                      setMetadata(e.target.value)
                      clearFieldError('metadata')
                      setSubmitError(null)
                    }}
                    className="textarea textarea-bordered w-full font-mono text-xs"
                    rows={5}
                    placeholder='{"key": "value"}'
                    aria-invalid={formErrors.metadata ? 'true' : 'false'}
                    aria-describedby={formErrors.metadata ? 'event-form-metadata-error' : 'event-form-metadata-help'}
                    disabled={isSubmitting}
                  />
                  <p id="event-form-metadata-help" className="mt-[var(--space-1)] text-xs text-base-content/60">
                    Optional machine-readable context as a JSON object.
                  </p>
                  {formErrors.metadata && (
                    <p id="event-form-metadata-error" className="mt-[var(--space-1)] text-sm text-error" role="alert">
                      {formErrors.metadata}
                    </p>
                  )}
                </fieldset>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-[var(--space-4)] border-t border-base-300 pt-[var(--space-3)]">
            <button
              type="button"
              className="btn btn-ghost btn-md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-testid={TID.events.form.cancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
              data-testid={TID.events.form.submit}
            >
              {isSubmitting && <ButtonSpinner />}
              {isEditMode ? 'Update event' : 'Create event'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
