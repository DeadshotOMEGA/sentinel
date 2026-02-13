'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { useMembers } from '@/hooks/use-members'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import { AlertTriangle, Search, X } from 'lucide-react'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import type { CreateCheckinInput } from '@sentinel/contracts'
import { TID } from '@/lib/test-ids'

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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberInfo, setSelectedMemberInfo] = useState<{
    id: string
    rank: string
    firstName: string
    lastName: string
    serviceNumber: string
  } | null>(null)
  const showMemberList = !selectedMemberInfo
  const { data: membersData } = useMembers({
    limit: 100,
    search: showMemberList && memberSearch ? memberSearch : undefined,
  })
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

  const memberName = selectedMemberInfo
    ? `${selectedMemberInfo.rank} ${selectedMemberInfo.firstName} ${selectedMemberInfo.lastName}`
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
      setMemberSearch('')
      setSelectedMemberInfo(null)
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
      setMemberSearch('')
      setSelectedMemberInfo(null)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create manual check-in:', error)
    }
  }

  const handleLockupComplete = async (action: 'transfer' | 'execute') => {
    if (pendingCheckout && action === 'transfer') {
      // After transfer, member still needs checkout — create the record
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
    // After execute, member was already checked out by bulk checkout — no action needed
    setPendingCheckout(null)
    reset()
    setMemberSearch('')
    setSelectedMemberInfo(null)
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
              <div>
                {selectedMemberInfo ? (
                  <div className="input input-neutral flex items-center gap-2">
                    <span className="flex-1 truncate">
                      {selectedMemberInfo.rank} {selectedMemberInfo.lastName}, {selectedMemberInfo.firstName} ({selectedMemberInfo.serviceNumber.slice(-3)})
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={() => {
                        setValue('memberId', '', { shouldValidate: true })
                        setSelectedMemberInfo(null)
                        setMemberSearch('')
                        setTimeout(() => searchInputRef.current?.focus(), 0)
                      }}
                      disabled={isFormBusy}
                      data-testid={TID.checkins.manualModal.clearMember}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/60 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="input input-neutral w-full pl-10"
                        placeholder="Search by name or service number..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        disabled={isFormBusy}
                        data-testid={TID.checkins.manualModal.memberSearch}
                      />
                    </div>
                    <ul className="menu bg-base-200 rounded-box mt-2 w-full max-h-48 overflow-y-auto">
                      {membersData?.members.length === 0 ? (
                        <li className="disabled">
                          <span className="text-base-content/60">No members found</span>
                        </li>
                      ) : (
                        membersData?.members.map((member) => (
                          <li key={member.id}>
                            <button
                              type="button"
                              data-testid={TID.checkins.manualModal.memberOption(member.id)}
                              onClick={() => {
                                setValue('memberId', member.id, { shouldValidate: true })
                                setSelectedMemberInfo({
                                  id: member.id,
                                  rank: member.rank,
                                  firstName: member.firstName,
                                  lastName: member.lastName,
                                  serviceNumber: member.serviceNumber,
                                })
                                setMemberSearch('')
                              }}
                            >
                              <span className="font-medium">
                                {member.rank} {member.lastName}, {member.firstName}
                              </span>
                              <span className="text-xs opacity-60">
                                {member.serviceNumber.slice(-3)}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                )}
              </div>
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
                    data-testid={TID.checkins.manualModal.directionIn}
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
                    data-testid={TID.checkins.manualModal.directionOut}
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
                data-testid={TID.checkins.manualModal.cancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isFormBusy || !selectedMemberId}
                data-testid={TID.checkins.manualModal.submit}
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
