'use client'

import { useState } from 'react'
import { Lock, Loader2, User, Users, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePresentForLockup, useExecuteLockup } from '@/hooks/use-lockup'

interface ExecuteLockupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
  onComplete: () => void
}

export function ExecuteLockupModal({
  open,
  onOpenChange,
  memberId,
  memberName,
  onComplete,
}: ExecuteLockupModalProps) {
  const [note, setNote] = useState('')
  const [step, setStep] = useState<'confirm' | 'success'>('confirm')

  const { data: presentData, isLoading: loadingPresent } = usePresentForLockup()
  const executeLockup = useExecuteLockup()

  const handleExecute = async () => {
    try {
      await executeLockup.mutateAsync({
        memberId,
        data: { note: note || undefined },
      })
      setStep('success')
    } catch (error) {
      console.error('Failed to execute lockup:', error)
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      onComplete()
    }
    setStep('confirm')
    setNote('')
    onOpenChange(false)
  }

  const memberCount = presentData?.members.length || 0
  const visitorCount = presentData?.visitors.length || 0
  const totalCount = presentData?.totalCount || 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Lock Up Building
              </DialogTitle>
              <DialogDescription>
                This will check out all remaining people and secure the building
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Status */}
              {loadingPresent ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
                </div>
              ) : (
                <>
                  {/* People Still Present */}
                  <div className="p-4 bg-base-200/50 rounded-lg border">
                    <h4 className="font-medium mb-3">Currently Checked In</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-base-content/60" />
                        <span className="text-sm">{memberCount} members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-base-content/60" />
                        <span className="text-sm">{visitorCount} visitors</span>
                      </div>
                    </div>
                    {totalCount > 0 && (
                      <p className="text-xs text-base-content/60 mt-2">
                        These {totalCount} people will be force checked out
                      </p>
                    )}
                  </div>

                  {/* Member List Preview */}
                  {memberCount > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {presentData?.members.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-sm py-1 px-2 rounded bg-base-200/30"
                        >
                          <span>
                            {m.rank} {m.lastName}
                          </span>
                          <span className="badge badge-outline text-xs">{m.division}</span>
                        </div>
                      ))}
                      {memberCount > 5 && (
                        <p className="text-xs text-base-content/60 text-center py-1">
                          ... and {memberCount - 5} more
                        </p>
                      )}
                    </div>
                  )}

                  {/* Warning */}
                  {totalCount > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <span className="text-warning">
                        People still checked in will receive a missed checkout record
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Note Field */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Note (optional)</legend>
                <input
                  className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any notes about tonight's lockup..."
                />
              </fieldset>
            </div>

            <DialogFooter>
              <button type="button" className="btn btn-outline btn-md" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={handleExecute}
                disabled={executeLockup.isPending}
              >
                {executeLockup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Lock className="h-4 w-4 mr-2" />
                Confirm Lock Up
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                Building Secured
              </DialogTitle>
              <DialogDescription>The building has been successfully locked up</DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                <Lock className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-medium">Lockup Complete</p>
              <p className="text-sm text-base-content/60 mt-1">Secured by {memberName}</p>
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
