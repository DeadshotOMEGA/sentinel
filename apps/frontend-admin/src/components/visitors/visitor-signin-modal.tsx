'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateVisitor, useAvailableTemporaryBadges } from '@/hooks/use-visitors'
import { useMembers } from '@/hooks/use-members'
import { useUnitEvents } from '@/hooks/use-events'
import { useAuthStore } from '@/store/auth-store'
import { Search, X } from 'lucide-react'
import type { CreateVisitorInput } from '@sentinel/contracts'

interface VisitorSigninModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  name: string
  organization: string
  visitType: 'contractor' | 'guest' | 'official' | 'other'
  visitReason: string
  hostMemberId: string
  eventId: string
  temporaryBadgeId: string
  adminNotes: string
}

export function VisitorSigninModal({ open, onOpenChange }: VisitorSigninModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const member = useAuthStore((state) => state.member)

  const [submitError, setSubmitError] = useState<string | null>(null)

  // Host member search state
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedHost, setSelectedHost] = useState<{
    id: string
    rank: string
    firstName: string
    lastName: string
  } | null>(null)
  const showMemberList = !selectedHost

  const { data: membersData } = useMembers({
    limit: 50,
    search: showMemberList && memberSearch ? memberSearch : undefined,
  })

  const { data: eventsData } = useUnitEvents({
    status: 'confirmed',
    limit: '50',
  })

  const { data: availableBadges } = useAvailableTemporaryBadges()

  const createVisitor = useCreateVisitor()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      organization: '',
      visitType: 'guest',
      visitReason: '',
      hostMemberId: '',
      eventId: '',
      temporaryBadgeId: '',
      adminNotes: '',
    },
  })

  const selectedBadgeId = watch('temporaryBadgeId')
  const nameRegister = register('name', { required: 'Name is required' })

  // Sync open prop with dialog element
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Notify parent when dialog closes (ESC key, backdrop click)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => onOpenChange(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onOpenChange])

  // Focus name input when modal opens, reset state when it closes
  useEffect(() => {
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 0)
    } else {
      reset()
      setMemberSearch('')
      setSelectedHost(null)
      setSubmitError(null)
    }
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    try {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const visitorData: CreateVisitorInput = {
        name: data.name,
        visitType: data.visitType,
        kioskId: 'ADMIN_MANUAL',
        checkInMethod: 'admin_manual',
        ...(member?.id && UUID_RE.test(member.id) ? { createdByAdmin: member.id } : {}),
      }

      if (data.organization) visitorData.organization = data.organization
      if (data.visitReason) visitorData.visitReason = data.visitReason
      if (data.hostMemberId) visitorData.hostMemberId = data.hostMemberId
      if (data.eventId) visitorData.eventId = data.eventId
      if (data.temporaryBadgeId) visitorData.temporaryBadgeId = data.temporaryBadgeId
      if (data.adminNotes) visitorData.adminNotes = data.adminNotes

      await createVisitor.mutateAsync(visitorData)
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in visitor'
      setSubmitError(message)
    }
  }

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box max-w-lg">
        {/* Header */}
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>
        <h3 className="text-lg font-bold">Visitor Sign-in</h3>
        <p className="text-base-content/60 text-sm mt-1">
          Register a visitor and sign them in to the building.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {/* Name */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Name <span className="text-error">*</span>
            </legend>
            <input
              type="text"
              className="input input-neutral w-full"
              placeholder="Visitor full name"
              disabled={isSubmitting}
              {...nameRegister}
              ref={(el) => {
                nameRegister.ref(el)
                nameInputRef.current = el
              }}
            />
            {errors.name && (
              <span className="label text-error">{errors.name.message}</span>
            )}
          </fieldset>

          {/* Organization */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Organization</legend>
            <input
              type="text"
              className="input input-neutral w-full"
              placeholder="Company or organization"
              {...register('organization')}
              disabled={isSubmitting}
            />
          </fieldset>

          {/* Visit Type */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Visit Type <span className="text-error">*</span>
            </legend>
            <select
              className="select select-neutral w-full"
              {...register('visitType', { required: 'Visit type is required' })}
              disabled={isSubmitting}
            >
              <option value="guest">Guest</option>
              <option value="contractor">Contractor</option>
              <option value="official">Official</option>
              <option value="other">Other</option>
            </select>
            {errors.visitType && (
              <span className="label text-error">{errors.visitType.message}</span>
            )}
          </fieldset>

          {/* Visit Reason */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Visit Reason</legend>
            <input
              type="text"
              className="input input-neutral w-full"
              placeholder="Purpose of visit"
              {...register('visitReason')}
              disabled={isSubmitting}
            />
          </fieldset>

          {/* Host Member */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Host Member</legend>
            <div>
              {selectedHost ? (
                <div className="input input-neutral flex items-center gap-2">
                  <span className="flex-1 truncate">
                    {selectedHost.rank} {selectedHost.lastName}, {selectedHost.firstName}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-circle"
                    onClick={() => {
                      setValue('hostMemberId', '')
                      setSelectedHost(null)
                      setMemberSearch('')
                    }}
                    disabled={isSubmitting}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/60 pointer-events-none" />
                    <input
                      type="text"
                      className="input input-neutral w-full pl-10"
                      placeholder="Search by name..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  {memberSearch && (
                    <ul className="menu bg-base-200 rounded-box mt-2 w-full max-h-36 overflow-y-auto">
                      {membersData?.members.length === 0 ? (
                        <li className="disabled">
                          <span className="text-base-content/60">No members found</span>
                        </li>
                      ) : (
                        membersData?.members.map((member) => (
                          <li key={member.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setValue('hostMemberId', member.id)
                                setSelectedHost({
                                  id: member.id,
                                  rank: member.rank,
                                  firstName: member.firstName,
                                  lastName: member.lastName,
                                })
                                setMemberSearch('')
                              }}
                            >
                              <span className="font-medium">
                                {member.rank} {member.lastName}, {member.firstName}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          </fieldset>

          {/* Event */}
          {eventsData?.data && eventsData.data.length > 0 && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Event</legend>
              <select
                className="select select-neutral w-full"
                {...register('eventId')}
                disabled={isSubmitting}
              >
                <option value="">No event</option>
                {eventsData.data.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </fieldset>
          )}

          {/* Temporary Badge */}
          {availableBadges && availableBadges.length > 0 && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Temporary Badge</legend>
              <select
                className="select select-neutral w-full"
                {...register('temporaryBadgeId')}
                disabled={isSubmitting}
              >
                <option value="">No badge</option>
                {availableBadges.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.serialNumber}
                  </option>
                ))}
              </select>
              {selectedBadgeId && (
                <p className="text-xs text-info mt-1">
                  Badge will be assigned to visitor and released on sign-out.
                </p>
              )}
            </fieldset>
          )}

          {/* Admin Notes */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Admin Notes</legend>
            <textarea
              className="textarea textarea-neutral w-full"
              placeholder="Optional notes..."
              rows={2}
              {...register('adminNotes')}
              disabled={isSubmitting}
            />
          </fieldset>

          {/* Submit Error */}
          {submitError && (
            <div role="alert" className="alert alert-error">
              <span className="text-sm">{submitError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm" />}
              Sign In Visitor
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  )
}
