'use client'

import { useState } from 'react'
import { ArrowRightLeft, CheckCircle, User, Shield } from 'lucide-react'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useTransferLockup } from '@/hooks/use-lockup'
import type { EligibleRecipient } from '@sentinel/contracts'

interface TransferLockupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  eligibleRecipients: EligibleRecipient[]
  onComplete: () => void
}

export function TransferLockupModal({
  open,
  onOpenChange,
  memberId: _memberId,
  eligibleRecipients,
  onComplete,
}: TransferLockupModalProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<EligibleRecipient | null>(null)
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select')

  const transferLockup = useTransferLockup()

  const handleTransfer = async () => {
    if (!selectedRecipient) return

    try {
      await transferLockup.mutateAsync({
        toMemberId: selectedRecipient.id,
        reason: 'checkout_transfer',
        notes: notes || undefined,
      })
      setStep('success')
    } catch (error) {
      console.error('Failed to transfer lockup:', error)
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      onComplete()
    }
    setStep('select')
    setSelectedRecipient(null)
    setNotes('')
    onOpenChange(false)
  }

  const formatName = (r: EligibleRecipient) => `${r.rank} ${r.firstName} ${r.lastName}`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg">
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transfer Lockup
              </DialogTitle>
              <DialogDescription>
                Select a qualified member to receive lockup responsibility
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {eligibleRecipients.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No eligible recipients available</p>
                  <p className="text-xs mt-1">
                    Members must be checked in and have a lockup qualification
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {eligibleRecipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                        selectedRecipient?.id === recipient.id
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300 hover:border-base-content/30 hover:bg-base-200/50'
                      )}
                      onClick={() => setSelectedRecipient(recipient)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200">
                          <User className="h-5 w-5 text-base-content/60" />
                        </div>
                        <div>
                          <p className="font-medium">{formatName(recipient)}</p>
                          <p className="text-xs text-base-content/60">{recipient.serviceNumber}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {recipient.qualifications.map((q) => (
                          <span key={q.code} className="badge badge-secondary text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            {q.code}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <button type="button" className="btn btn-outline btn-md" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={() => setStep('confirm')}
                disabled={!selectedRecipient}
              >
                Continue
              </button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && selectedRecipient && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Confirm Transfer
              </DialogTitle>
              <DialogDescription>Verify transfer details before confirming</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Transfer Summary */}
              <div className="p-4 bg-base-200/50 rounded-lg border">
                <p className="text-sm text-base-content/60 mb-2">Transferring lockup to:</p>
                <p className="text-lg font-semibold">{formatName(selectedRecipient)}</p>
                <div className="flex gap-1 mt-2">
                  {selectedRecipient.qualifications.map((q) => (
                    <span key={q.code} className="badge badge-outline text-xs">
                      {q.code}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes Field */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Notes (optional)</legend>
                <input
                  className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  id="transfer-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for transfer..."
                />
              </fieldset>
            </div>

            <DialogFooter>
              <button
                type="button"
                className="btn btn-outline btn-md"
                onClick={() => setStep('select')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={handleTransfer}
                disabled={transferLockup.isPending}
              >
                {transferLockup.isPending && <ButtonSpinner />}
                Confirm Transfer
              </button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && selectedRecipient && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                Transfer Complete
              </DialogTitle>
              <DialogDescription>Lockup responsibility has been transferred</DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                <ArrowRightLeft className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-medium">Lockup Transferred</p>
              <p className="text-sm text-base-content/60 mt-1">
                {formatName(selectedRecipient)} now holds lockup responsibility
              </p>
            </div>

            <DialogFooter>
              <button type="button" className="btn btn-primary btn-md w-full" onClick={handleClose}>
                Done
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
