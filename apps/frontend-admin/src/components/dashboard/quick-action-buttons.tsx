/* global process */
'use client'

import { useState } from 'react'
import { Users, Radio, ScanLine } from 'lucide-react'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { VisitorSigninModal } from '@/components/visitors/visitor-signin-modal'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'
import { KioskCheckinModal } from '@/components/dashboard/kiosk-checkin-modal'
import { TID } from '@/lib/test-ids'
import { isSentinelBootstrapServiceNumber } from '@/lib/system-bootstrap'

export function QuickActionButtons() {
  const member = useAuthStore((state) => state.member)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false)
  const isDevMode = process.env.NODE_ENV === 'development'
  const isSentinelSystem = isSentinelBootstrapServiceNumber(member?.serviceNumber)

  // Check account level for permissions
  const canManualCheckin = (member?.accountLevel ?? 0) >= AccountLevel.QUARTERMASTER
  const actionBaseClass =
    'btn justify-self-start justify-start md:justify-center font-medium transition-all duration-200 shadow-sm hover:shadow-md'

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
      data-help-id="dashboard.quick-actions"
    >
      <button
        className={`${actionBaseClass} btn-sm btn-primary btn-action`}
        onClick={() => setIsKioskModalOpen(true)}
        data-testid={TID.dashboard.quickAction.kiosk}
        data-help-id="dashboard.quick-actions.kiosk-checkin"
      >
        <ScanLine className="size-[1.1em] shrink-0" />
        Kiosk Check-In
      </button>

      <button
        className={`${actionBaseClass} btn-sm btn-primary btn-action disabled:opacity-40`}
        disabled={!canManualCheckin}
        onClick={() => setIsVisitorModalOpen(true)}
        data-testid={TID.dashboard.quickAction.visitorSignin}
        data-help-id="dashboard.quick-actions.visitor-signin"
      >
        <Users className="size-[1.1em] shrink-0" />
        Visitor Sign-in
      </button>

      {(isDevMode || isSentinelSystem) && (
        <button
          className={`${actionBaseClass} btn-sm btn-outline btn-accent`}
          onClick={() => setIsScanModalOpen(true)}
          data-testid={TID.dashboard.quickAction.simulateScan}
        >
          <Radio className="size-[1.1em] shrink-0" />
          Simulate Scan
        </button>
      )}

      <ManualCheckinModal open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen} />
      <VisitorSigninModal open={isVisitorModalOpen} onOpenChange={setIsVisitorModalOpen} />
      {(isDevMode || isSentinelSystem) && (
        <SimulateScanModal open={isScanModalOpen} onOpenChange={setIsScanModalOpen} />
      )}
      <KioskCheckinModal open={isKioskModalOpen} onOpenChange={setIsKioskModalOpen} />
    </div>
  )
}
