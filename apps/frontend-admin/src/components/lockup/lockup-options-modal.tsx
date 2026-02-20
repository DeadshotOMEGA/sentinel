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
import { AppCard, AppCardContent } from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
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
  const eligibleRecipientsCount = checkoutOptions.eligibleRecipients?.length ?? 0

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
        <DialogContent size="md" style={{ boxShadow: 'var(--shadow-2)' }}>
          <DialogHeader>
            <div
              className="flex items-start justify-between pr-10"
              style={{ gap: 'var(--space-3)' }}
            >
              <DialogTitle className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <AlertTriangle className="h-5 w-5 text-warning" />
                Lockup Responsibility
              </DialogTitle>
              <AppBadge status="warning" size="sm">
                Blocked
              </AppBadge>
            </div>
            <DialogDescription>
              {memberName} currently holds lockup responsibility
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
            <AppCard status="warning" className="border border-base-300 bg-base-200/40">
              <AppCardContent
                className="flex items-start"
                style={{ gap: 'var(--space-3)', padding: 'var(--space-4)' }}
              >
                <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-warning-fadded p-2 text-warning-fadded-content">
                  <User className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight text-base-content">{memberName}</p>
                  <p className="text-sm text-base-content/70">
                    You must transfer lockup or lock up the building before checking out
                  </p>
                </div>
              </AppCardContent>
            </AppCard>

            {checkoutOptions.blockReason && (
              <div role="alert" className="alert alert-warning alert-soft text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{checkoutOptions.blockReason}</span>
              </div>
            )}

            <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
              {canExecuteLockup && (
                <button
                  type="button"
                  className="btn btn-warning btn-md w-full h-auto justify-start border-base-300 normal-case"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                  onClick={() => setShowExecuteModal(true)}
                >
                  <div
                    className="flex w-full items-start justify-between text-left"
                    style={{ gap: 'var(--space-3)' }}
                  >
                    <div className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                      <Lock className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold leading-tight">Close Building (Lock Up)</p>
                        <p className="text-xs font-normal text-base-content/70">
                          Check out all remaining people and secure the building
                        </p>
                      </div>
                    </div>
                    <Chip variant="faded" color="warning" size="sm">
                      Bulk checkout
                    </Chip>
                  </div>
                </button>
              )}

              {canTransferLockup && (
                <button
                  type="button"
                  className="btn btn-outline btn-primary btn-md w-full h-auto justify-start normal-case"
                  style={{ padding: 'var(--space-3) var(--space-4)' }}
                  onClick={() => setShowTransferModal(true)}
                >
                  <div
                    className="flex w-full items-start justify-between text-left"
                    style={{ gap: 'var(--space-3)' }}
                  >
                    <div className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                      <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold leading-tight">Transfer Lockup</p>
                        <p className="text-xs font-normal text-base-content/70">
                          Hand over lockup responsibility to another qualified member
                        </p>
                      </div>
                    </div>
                    <Chip variant="faded" color="primary" size="sm">
                      {eligibleRecipientsCount > 0
                        ? `${eligibleRecipientsCount} eligible`
                        : 'No eligible members'}
                    </Chip>
                  </div>
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
