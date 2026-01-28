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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExecuteLockupModal } from './execute-lockup-modal'
import { TransferLockupModal } from './transfer-lockup-modal'
import type { CheckoutOptionsResponse } from '@sentinel/contracts'

interface LockupOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
  checkoutOptions: CheckoutOptionsResponse
  onCheckoutComplete: () => void
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
    onCheckoutComplete()
  }

  const handleTransferComplete = () => {
    setShowTransferModal(false)
    onOpenChange(false)
    onCheckoutComplete()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Lockup Responsibility
            </DialogTitle>
            <DialogDescription>
              {memberName} currently holds lockup responsibility
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Info */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{memberName}</p>
                  <p className="text-sm text-muted-foreground">
                    You must transfer lockup or lock up the building before checking out
                  </p>
                </div>
              </div>
            </div>

            {/* Block Reason */}
            {checkoutOptions.blockReason && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                {checkoutOptions.blockReason}
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {canExecuteLockup && (
                <Button
                  variant="default"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setShowExecuteModal(true)}
                >
                  <Lock className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold">Lock Up Building</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Check out all remaining people and secure the building
                    </p>
                  </div>
                </Button>
              )}

              {canTransferLockup && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setShowTransferModal(true)}
                >
                  <ArrowRightLeft className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-semibold">Transfer Lockup</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Hand over lockup responsibility to another qualified member
                    </p>
                  </div>
                  {checkoutOptions.eligibleRecipients && (
                    <Badge variant="secondary" className="ml-auto">
                      {checkoutOptions.eligibleRecipients.length} available
                    </Badge>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
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
