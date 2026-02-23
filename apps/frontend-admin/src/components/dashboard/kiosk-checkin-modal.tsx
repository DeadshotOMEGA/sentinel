'use client'

import { KioskCheckinScreen } from '@/components/dashboard/kiosk-checkin-screen'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface KioskCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KioskCheckinModal({ open, onOpenChange }: KioskCheckinModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        showCloseButton={false}
        className="max-h-[95vh] overflow-hidden p-0"
      >
        <KioskCheckinScreen isActive={open} onClose={() => onOpenChange(false)} mode="embedded" />
      </DialogContent>
    </Dialog>
  )
}
