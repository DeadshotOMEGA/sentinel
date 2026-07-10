'use client'

import { useState } from 'react'
import { ArrowRightLeft, CheckCircle, User, Shield, AlertCircle } from 'lucide-react'
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
import { useTransferLockup, useVerifyBadge } from '@/hooks/use-lockup'
import type { EligibleRecipient } from '@sentinel/contracts'

interface TransferLockupScanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentHolder: { id: string; rank: string; firstName: string; lastName: string }
  eligibleRecipients: EligibleRecipient[]
  notes?: string | null
  onComplete: () => void
}

type Step = 'select' | 'scan' | 'success'

export function TransferLockupScanModal({
  open,
  onOpenChange,
  currentHolder,
  eligibleRecipients,
  notes,
  onComplete,
}: TransferLockupScanModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedRecipient, setSelectedRecipient] = useState<EligibleRecipient | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [authorizationIdentifier, setAuthorizationIdentifier] = useState('')
  const [newHolder, setNewHolder] = useState<EligibleRecipient | null>(null)

  const verifyBadge = useVerifyBadge()
  const transferLockup = useTransferLockup()

  const handleAuthorizeTransfer = async (identifier: string) => {
    const trimmedIdentifier = identifier.trim()

    if (!trimmedIdentifier) {
      setScanError('Enter or scan the current holder, Admin, or Developer badge or service number.')
      return
    }

    setScanError(null)

    let verifyResult
    try {
      verifyResult = await verifyBadge.mutateAsync({ identifier: trimmedIdentifier })
    } catch {
      setScanError('Badge or service number not recognized. Check the entry and try again.')
      return
    }

    if (!verifyResult.authorized) {
      setScanError(
        'This identity is not authorized to approve lockup transfers. Use the current lockup holder, Admin, or Developer.'
      )
      return
    }

    if (!selectedRecipient) return

    try {
      await transferLockup.mutateAsync({
        toMemberId: selectedRecipient.id,
        reason: 'manual',
        notes: notes?.trim() ? notes.trim() : null,
      })
      setNewHolder(selectedRecipient)
      setAuthorizationIdentifier('')
      setStep('success')
    } catch {
      setScanError('Transfer failed. Please try again.')
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      onComplete()
    }
    setStep('select')
    setSelectedRecipient(null)
    setScanError(null)
    setAuthorizationIdentifier('')
    setNewHolder(null)
    onOpenChange(false)
  }

  const formatName = (r: { rank: string; firstName: string; lastName: string }) =>
    `${r.rank} ${r.firstName} ${r.lastName}`

  const isPending = verifyBadge.isPending || transferLockup.isPending

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
                Select a qualified member to receive lockup responsibility from{' '}
                {formatName(currentHolder)}
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
                disabled={!selectedRecipient}
                onClick={() => setStep('scan')}
              >
                Continue
              </button>
            </DialogFooter>
          </>
        )}

        {step === 'scan' && selectedRecipient && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Authorize Transfer
              </DialogTitle>
              <DialogDescription>
                Transferring lockup to {formatName(selectedRecipient)}. Authorize with the current
                holder, Admin, or Developer.
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4 py-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleAuthorizeTransfer(authorizationIdentifier)
              }}
            >
              <div className="p-3 bg-base-200/50 rounded-lg border text-sm">
                <p className="text-base-content/60 text-xs mb-1">Authorized identities:</p>
                <p className="font-medium">{formatName(currentHolder)} (current holder)</p>
                <p className="text-base-content/60 text-xs mt-1">or any Admin / Developer</p>
              </div>

              {isPending ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <ButtonSpinner className="h-8 w-8" />
                  <p className="text-sm text-base-content/60">Verifying authorization...</p>
                </div>
              ) : (
                <fieldset className="fieldset space-y-(--space-3)">
                  <legend className="fieldset-legend">Badge or service number</legend>
                  <label className="input input-lg w-full">
                    <Shield className="h-5 w-5 text-base-content/50" />
                    <input
                      type="text"
                      className="grow font-mono tracking-[0.12em]"
                      placeholder="Scan badge or enter service number"
                      value={authorizationIdentifier}
                      onChange={(event) => {
                        setAuthorizationIdentifier(event.target.value)
                        setScanError(null)
                      }}
                      autoComplete="off"
                      autoFocus
                    />
                  </label>
                  <p className="label text-base-content/60">
                    Press Enter or choose Authorize Transfer.
                  </p>
                </fieldset>
              )}

              {scanError && (
                <div role="alert" className="alert alert-error text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}
            </form>

            <DialogFooter>
              <button
                type="button"
                className="btn btn-outline btn-md"
                disabled={isPending}
                onClick={() => {
                  setScanError(null)
                  setStep('select')
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                disabled={isPending || !authorizationIdentifier.trim()}
                onClick={() => {
                  void handleAuthorizeTransfer(authorizationIdentifier)
                }}
              >
                {isPending ? <ButtonSpinner /> : null}
                Authorize Transfer
              </button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && newHolder && (
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
                {formatName(newHolder)} now holds lockup responsibility
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
