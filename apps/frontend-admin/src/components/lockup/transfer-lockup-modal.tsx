'use client'

import { useState } from 'react'
import { ArrowRightLeft, Loader2, CheckCircle, User, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  memberId,
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
      <DialogContent className="max-w-lg">
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
                          <p className="text-xs text-base-content/60">
                            {recipient.serviceNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {recipient.qualifications.map((q) => (
                          <Badge
                            key={q.code}
                            variant="secondary"
                            className="text-xs"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {q.code}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!selectedRecipient}
              >
                Continue
              </Button>
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
              <DialogDescription>
                Verify transfer details before confirming
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Transfer Summary */}
              <div className="p-4 bg-base-200/50 rounded-lg border">
                <p className="text-sm text-base-content/60 mb-2">
                  Transferring lockup to:
                </p>
                <p className="text-lg font-semibold">{formatName(selectedRecipient)}</p>
                <div className="flex gap-1 mt-2">
                  {selectedRecipient.qualifications.map((q) => (
                    <Badge key={q.code} variant="outline" className="text-xs">
                      {q.code}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes Field */}
              <div className="space-y-2">
                <Label htmlFor="transfer-notes">Notes (optional)</Label>
                <Input
                  id="transfer-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for transfer..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={transferLockup.isPending}
              >
                {transferLockup.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm Transfer
              </Button>
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
              <DialogDescription>
                Lockup responsibility has been transferred
              </DialogDescription>
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
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
