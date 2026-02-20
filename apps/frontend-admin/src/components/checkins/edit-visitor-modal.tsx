'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Pencil, Info } from 'lucide-react'
import { useVisitorById, useUpdateVisitor } from '@/hooks/use-visitors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditVisitorModalProps {
  visitorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VISIT_TYPES = ['guest', 'contractor', 'official', 'other'] as const
type VisitType = (typeof VISIT_TYPES)[number]

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  guest: 'Guest',
  contractor: 'Contractor',
  official: 'Official',
  other: 'Other',
}

interface EditVisitorFormData {
  name: string
  organization: string
  visitType: VisitType
  visitReason: string
  adminNotes: string
}

const DEFAULT_FORM_VALUES: EditVisitorFormData = {
  name: '',
  organization: '',
  visitType: 'guest',
  visitReason: '',
  adminNotes: '',
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Active / Not checked out'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return 'Unknown'
  return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
}

export function EditVisitorModal({ visitorId, open, onOpenChange }: EditVisitorModalProps) {
  const { data: visitor, isLoading, isError } = useVisitorById(open ? visitorId : null)
  const updateVisitor = useUpdateVisitor()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EditVisitorFormData>({
    defaultValues: DEFAULT_FORM_VALUES,
  })

  useEffect(() => {
    if (!open || !visitor) {
      reset(DEFAULT_FORM_VALUES, { keepDirty: false })
      return
    }

    reset(
      {
        name: visitor.name ?? '',
        organization: visitor.organization ?? '',
        visitType: visitor.visitType,
        visitReason: visitor.visitReason ?? '',
        adminNotes: visitor.adminNotes ?? '',
      },
      { keepDirty: false }
    )
  }, [open, visitor, reset])

  const handleClose = () => onOpenChange(false)

  const visitReasonValue = useWatch({ control, name: 'visitReason' }) ?? ''
  const adminNotesValue = useWatch({ control, name: 'adminNotes' }) ?? ''
  const nameValue = useWatch({ control, name: 'name' }) ?? ''

  const onSubmit = handleSubmit(async (values) => {
    if (!visitorId) return

    const trimmedName = values.name.trim()
    const trimmedOrganization = values.organization.trim()
    const trimmedVisitReason = values.visitReason.trim()
    const trimmedAdminNotes = values.adminNotes.trim()

    if (!trimmedName) {
      toast.error('Visitor name is required')
      return
    }

    try {
      await updateVisitor.mutateAsync({
        id: visitorId,
        data: {
          name: trimmedName,
          organization: trimmedOrganization || undefined,
          visitType: values.visitType,
          visitReason: trimmedVisitReason || undefined,
          adminNotes: trimmedAdminNotes || undefined,
        },
      })
      toast.success('Visitor information updated')
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update visitor'
      toast.error(message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" showCloseButton={false} className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center" style={{ gap: 'var(--space-2)' }}>
            <Pencil className="h-5 w-5" aria-hidden="true" />
            Edit Visitor
          </DialogTitle>
          <DialogDescription>
            Update visitor identity details for history and presence records.
          </DialogDescription>
        </DialogHeader>

        <div
          className="bg-info-fadded text-info-fadded-content flex items-start rounded text-sm"
          role="note"
          style={{
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <Info className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
          <span>Visitor timestamps remain unchanged. This updates identity metadata only.</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col" style={{ gap: 'var(--space-2)' }} aria-live="polite">
            <div className="skeleton h-4 w-48" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
        ) : isError || !visitor ? (
          <div className="alert alert-error alert-soft" role="alert">
            <span>Unable to load visitor details</span>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
              <div
                className="grid grid-cols-1 md:grid-cols-2 text-sm"
                style={{ gap: 'var(--space-2)' }}
              >
                <div className="bg-base-200 rounded" style={{ padding: 'var(--space-3)' }}>
                  <p className="text-base-content/60">Checked in</p>
                  <p className="font-medium">{formatTimestamp(visitor.checkInTime)}</p>
                </div>
                <div className="bg-base-200 rounded" style={{ padding: 'var(--space-3)' }}>
                  <p className="text-base-content/60">Checked out</p>
                  <p className="font-medium">{formatTimestamp(visitor.checkOutTime)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-2)' }}>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Full Name{' '}
                    <span className="text-error" aria-hidden="true">
                      *
                    </span>
                    <span className="sr-only">(required)</span>
                  </legend>
                  <input
                    id="edit-visitor-name"
                    type="text"
                    className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                    placeholder="Visitor full name"
                    maxLength={200}
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'edit-visitor-name-error' : undefined}
                    {...register('name', {
                      required: 'Visitor name is required',
                      validate: (value) =>
                        value.trim().length > 0 || 'Visitor name cannot be empty',
                    })}
                  />
                  {errors.name && (
                    <p id="edit-visitor-name-error" className="label text-error">
                      {errors.name.message}
                    </p>
                  )}
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Organization</legend>
                  <input
                    id="edit-visitor-organization"
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Company or organization"
                    maxLength={200}
                    {...register('organization')}
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Visit Type</legend>
                  <select
                    id="edit-visitor-type"
                    className="select select-bordered w-full"
                    {...register('visitType')}
                  >
                    {VISIT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {VISIT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Visit Reason</legend>
                  <textarea
                    id="edit-visitor-reason"
                    className="textarea textarea-bordered w-full resize-none"
                    rows={2}
                    placeholder="Purpose of visit"
                    maxLength={500}
                    aria-describedby="edit-visitor-reason-counter"
                    {...register('visitReason')}
                  />
                  <div className="label">
                    <span
                      id="edit-visitor-reason-counter"
                      className="label-text-alt text-base-content/50"
                    >
                      {visitReasonValue.length}/500 characters
                    </span>
                  </div>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Admin Notes</legend>
                  <textarea
                    id="edit-visitor-notes"
                    className="textarea textarea-bordered w-full resize-none"
                    rows={2}
                    placeholder="Internal notes (optional)"
                    maxLength={1000}
                    aria-describedby="edit-visitor-notes-counter"
                    {...register('adminNotes')}
                  />
                  <div className="label">
                    <span
                      id="edit-visitor-notes-counter"
                      className="label-text-alt text-base-content/50"
                    >
                      {adminNotesValue.length}/1000 characters
                    </span>
                  </div>
                </fieldset>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleClose}
                  disabled={isSubmitting || updateVisitor.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    isLoading ||
                    isError ||
                    !visitor ||
                    isSubmitting ||
                    updateVisitor.isPending ||
                    !nameValue.trim() ||
                    !isDirty
                  }
                  aria-busy={isSubmitting || updateVisitor.isPending}
                >
                  {isSubmitting || updateVisitor.isPending ? (
                    <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </DialogFooter>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
