'use client'

import { useState } from 'react'
import { Lock, ArrowRightLeft, X, AlertTriangle, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExecuteLockupModal } from './execute-lockup-modal'
import { TransferLockupModal } from './transfer-lockup-modal'
import type { CheckoutOptionsResponse } from '@sentinel/contracts'

interface LockupOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
  checkoutOptions: CheckoutOptionsResponse
  onCheckoutComplete: (action: 'transfer' | 'execute') => void
}

export function LockupOptionsModal({
  open,
  onOpenChange,
  memberId,
  memberName,
  checkoutOptions,
  onCheckoutComplete,
}: LockupOptionsModalProps) {
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const canExecuteLockup = checkoutOptions.availableOptions.includes('execute_lockup')
  const canTransferLockup = checkoutOptions.availableOptions.includes('transfer_lockup')

  const handleExecuteComplete = () => {
    setShowExecuteModal(false)
    onOpenChange(false)
    onCheckoutComplete('execute')
  }

  const handleTransferComplete = () => {
    setShowTransferModal(false)
    onOpenChange(false)
    onCheckoutComplete('transfer')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Lockup Responsibility
            </DialogTitle>
            <DialogDescription>
              {memberName} currently holds lockup responsibility
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Info */}
            <div className="p-4 bg-base-200/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-base-content/60" />
                <div>
                  <p className="font-medium">{memberName}</p>
                  <p className="text-sm text-base-content/60">
                    You must transfer lockup or lock up the building before checking out
                  </p>
                </div>
              </div>
            </div>

            {/* Block Reason */}
            {checkoutOptions.blockReason && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
                {checkoutOptions.blockReason}
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {canExecuteLockup && (
                <button
                  type="button"
                  className="btn btn-primary btn-md w-full justify-start h-auto py-4"
                  onClick={() => setShowExecuteModal(true)}
                >
                  <Lock className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold">Lock Up Building</p>
                    <p className="text-xs text-base-content/60 font-normal">
                      Check out all remaining people and secure the building
                    </p>
                  </div>
                </button>
              )}

              {canTransferLockup && (
                <button
                  type="button"
                  className="btn btn-outline btn-md w-full justify-start h-auto py-4"
                  onClick={() => setShowTransferModal(true)}
                >
                  <ArrowRightLeft className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold">Transfer Lockup</p>
                    <p className="text-xs text-base-content/60 font-normal">
                      Hand over lockup responsibility to another qualified member
                    </p>
                  </div>
                  {checkoutOptions.eligibleRecipients && (
                    <span className="badge badge-secondary ml-auto">
                      {checkoutOptions.eligibleRecipients.length} available
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                className="btn btn-ghost btn-md w-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Lockup Modal */}
      <ExecuteLockupModal
        open={showExecuteModal}
        onOpenChange={setShowExecuteModal}
        memberId={memberId}
        memberName={memberName}
        onComplete={handleExecuteComplete}
      />

      {/* Transfer Lockup Modal */}
      <TransferLockupModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        memberId={memberId}
        eligibleRecipients={checkoutOptions.eligibleRecipients || []}
        onComplete={handleTransferComplete}
      />
    </>
  )
}
