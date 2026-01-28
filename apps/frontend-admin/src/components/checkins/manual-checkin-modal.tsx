'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { useMembers } from '@/hooks/use-members'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle } from 'lucide-react'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import type { CreateCheckinInput } from '@sentinel/contracts'

interface ManualCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  memberId: string
  direction: 'IN' | 'OUT'
}

export function ManualCheckinModal({ open, onOpenChange }: ManualCheckinModalProps) {
  const { data: membersData } = useMembers({ limit: 100 }) // Get all members for dropdown
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
      direction: 'IN',
    },
  })

  const selectedMemberId = watch('memberId')
  const selectedDirection = watch('direction')

  // Fetch checkout options when checking out
  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } = useCheckoutOptions(
    selectedDirection === 'OUT' && selectedMemberId ? selectedMemberId : ''
  )

  // Get selected member details for display
  const selectedMember = membersData?.members.find((m) => m.id === selectedMemberId)
  const memberName = selectedMember
    ? `${selectedMember.rank} ${selectedMember.firstName} ${selectedMember.lastName}`
    : ''

  // Check if member holds lockup and can't checkout normally
  const holdsLockup = checkoutOptions?.holdsLockup ?? false
  const canCheckoutNormally = checkoutOptions?.canCheckout ?? true

  const onSubmit = async (data: FormData) => {
    // If checking out and member holds lockup, show lockup options
    if (data.direction === 'OUT' && holdsLockup && !canCheckoutNormally) {
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
    // After lockup handled, complete the checkout
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

  // Reset pending checkout when modal closes
  useEffect(() => {
    if (!open) {
      setPendingCheckout(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Check-in</DialogTitle>
          <DialogDescription>
            Record a manual check-in for a member who cannot use their badge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Member Selection */}
          <div>
            <Label htmlFor="memberId">
              Member <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedMemberId}
              onValueChange={(value) => setValue('memberId', value, { shouldValidate: true })}
            >
              <SelectTrigger id="memberId">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {membersData?.members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.rank} {member.firstName} {member.lastName} ({member.serviceNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-sm text-destructive mt-1">{errors.memberId.message}</p>
            )}
          </div>

          {/* Direction Selection */}
          <div>
            <Label htmlFor="direction">
              Direction <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedDirection}
              onValueChange={(value) =>
                setValue('direction', value as 'IN' | 'OUT', { shouldValidate: true })
              }
            >
              <SelectTrigger id="direction">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Check In</SelectItem>
                <SelectItem value="OUT">Check Out</SelectItem>
              </SelectContent>
            </Select>
            {errors.direction && (
              <p className="text-sm text-destructive mt-1">{errors.direction.message}</p>
            )}
          </div>

          {/* Lockup Warning */}
          {selectedDirection === 'OUT' && selectedMemberId && holdsLockup && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-yellow-700">Lockup Holder</p>
                <p className="text-yellow-600">
                  This member holds lockup responsibility. They must transfer lockup or lock up the building before checking out.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedMemberId || loadingCheckoutOptions}
            >
              {(isSubmitting || loadingCheckoutOptions) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedDirection === 'OUT' && holdsLockup ? 'Handle Lockup & Check Out' : 'Create Check-in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

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
    </Dialog>
  )
}
