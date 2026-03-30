'use client'

import { VisitorSelfSigninFlow } from '@/components/kiosk/visitor-self-signin-flow'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface VisitorSelfSigninModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kioskId: string
}

export function VisitorSelfSigninModal({
  open,
  onOpenChange,
  kioskId,
}: VisitorSelfSigninModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} dismissible>
      <DialogContent
        size="full"
        showCloseButton
        className="flex max-w-6xl flex-col overflow-hidden border border-base-300 bg-base-100"
        style={{ maxHeight: 'calc(100vh - var(--space-6))' }}
      >
        {open ? (
          <>
            <DialogHeader className="border-b border-base-300 bg-info-fadded/35 pb-4">
              <DialogTitle className="font-display text-3xl">Visitor Self Sign-In</DialogTitle>
              <DialogDescription>
                Follow the steps below to check into the Unit using the kiosk touch screen.
              </DialogDescription>
            </DialogHeader>

            <VisitorSelfSigninFlow
              kioskId={kioskId}
              layout="modal"
              onCancel={() => onOpenChange(false)}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
