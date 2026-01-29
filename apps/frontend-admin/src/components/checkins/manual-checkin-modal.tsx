'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { useMembers } from '@/hooks/use-members'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import { AlertTriangle } from 'lucide-react'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import type { CreateCheckinInput } from '@sentinel/contracts'

interface ManualCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  memberId: string
  direction: 'in' | 'out'
}

export function ManualCheckinModal({ open, onOpenChange }: ManualCheckinModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { data: membersData } = useMembers({ limit: 100 })
  const createCheckin = useCreateCheckin()
  const [showLockupOptions, setShowLockupOptions] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState<FormData | null>(null)

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      memberId: '',
      direction: 'in',
    },
  })

  const selectedMemberId = watch('memberId')
  const selectedDirection = watch('direction')

  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } = useCheckoutOptions(
    selectedDirection === 'out' && selectedMemberId ? selectedMemberId : ''
  )

  const selectedMember = membersData?.members.find((m) => m.id === selectedMemberId)
  const memberName = selectedMember
    ? `${selectedMember.rank} ${selectedMember.firstName} ${selectedMember.lastName}`
    : ''

  const holdsLockup = checkoutOptions?.holdsLockup ?? false
  const canCheckoutNormally = checkoutOptions?.canCheckout ?? true
  const isFormBusy = isSubmitting || loadingCheckoutOptions

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

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPendingCheckout(null)
    }
  }, [open])

  const onSubmit = async (data: FormData) => {
    if (data.direction === 'out' && holdsLockup && !canCheckoutNormally) {
      setPendingCheckout(data)
      setShowLockupOptions(true)
      return
    }

    try {
      const checkinData: CreateCheckinInput = {
        memberId: data.memberId,
        direction: data.direction,
        kioskId: 'ADMIN_MANUAL',
        method: 'manual',
      }
      await createCheckin.mutateAsync(checkinData)
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create manual check-in:', error)
    }
  }

  const handleLockupComplete = async () => {
    if (pendingCheckout) {
      try {
        const checkinData: CreateCheckinInput = {
          memberId: pendingCheckout.memberId,
          direction: pendingCheckout.direction,
          kioskId: 'ADMIN_MANUAL',
          method: 'manual',
        }
        await createCheckin.mutateAsync(checkinData)
      } catch (error) {
        console.error('Failed to complete checkout after lockup:', error)
      }
    }
    setPendingCheckout(null)
    reset()
    onOpenChange(false)
  }

  return (
    <>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-md">
          {/* Header */}
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="text-lg font-bold">Manual Check-in</h3>
          <p className="text-base-content/60 text-sm mt-1">
            Record a manual check-in for a member who cannot use their badge.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {/* Member Selection */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Member <span className="text-error">*</span>
              </legend>
              <select
                className="select select-neutral"
                value={selectedMemberId}
                onChange={(e) => setValue('memberId', e.target.value, { shouldValidate: true })}
                disabled={isFormBusy}
              >
                <option value="" disabled>
                  Select member
                </option>
                {membersData?.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.rank} {member.lastName}, {member.firstName} ({member.serviceNumber.slice(-3)})
                  </option>
                ))}
              </select>
              {errors.memberId && (
                <span className="label text-error">{errors.memberId.message}</span>
              )}
            </fieldset>

            {/* Direction Selection */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Direction <span className="text-error">*</span>
              </legend>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    className="radio radio-primary"
                    checked={selectedDirection === 'in'}
                    onChange={() => setValue('direction', 'in', { shouldValidate: true })}
                    disabled={isFormBusy}
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="badge badge-success badge-sm">IN</span>
                    Check In
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    className="radio radio-primary"
                    checked={selectedDirection === 'out'}
                    onChange={() => setValue('direction', 'out', { shouldValidate: true })}
                    disabled={isFormBusy}
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="badge badge-error badge-sm">OUT</span>
                    Check Out
                  </span>
                </label>
              </div>
              {errors.direction && (
                <span className="label text-error">{errors.direction.message}</span>
              )}
            </fieldset>

            {/* Lockup Warning */}
            {selectedDirection === 'out' && selectedMemberId && holdsLockup && (
              <div role="alert" className="alert alert-warning">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <h4 className="font-bold">Lockup Holder</h4>
                  <p className="text-xs">
                    This member holds lockup responsibility. They must transfer lockup or lock up
                    the building before checking out.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => onOpenChange(false)}
                disabled={isFormBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isFormBusy || !selectedMemberId}
              >
                {isFormBusy && <span className="loading loading-spinner loading-sm" />}
                {selectedDirection === 'out' && holdsLockup
                  ? 'Handle Lockup & Check Out'
                  : 'Create Check-in'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Lockup Options Modal */}
      {checkoutOptions && (
        <LockupOptionsModal
          open={showLockupOptions}
          onOpenChange={setShowLockupOptions}
          memberId={selectedMemberId}
          memberName={memberName}
          checkoutOptions={checkoutOptions}
          onCheckoutComplete={handleLockupComplete}
        />
      )}
    </>
  )
}
