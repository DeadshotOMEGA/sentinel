/* global process */
'use client'

import { useState } from 'react'
import { Users, FileText, Lock, Radio, DoorOpen, ArrowRightLeft, ScanLine } from 'lucide-react'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { ExecuteLockupModal } from '@/components/lockup/execute-lockup-modal'
import { OpenBuildingModal } from '@/components/lockup/open-building-modal'
import { TransferLockupScanModal } from '@/components/lockup/transfer-lockup-scan-modal'
import { VisitorSigninModal } from '@/components/visitors/visitor-signin-modal'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'
import { KioskCheckinModal } from '@/components/dashboard/kiosk-checkin-modal'
import { useLockupStatus, useCheckoutOptions } from '@/hooks/use-lockup'
import { TID } from '@/lib/test-ids'
import { isSentinelBootstrapServiceNumber } from '@/lib/system-bootstrap'

export function QuickActionButtons() {
  const member = useAuthStore((state) => state.member)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false)
  const [isLockupModalOpen, setIsLockupModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false)
  const [isOpenBuildingOpen, setIsOpenBuildingOpen] = useState(false)
  const [isTransferScanModalOpen, setIsTransferScanModalOpen] = useState(false)
  const isDevMode = process.env.NODE_ENV === 'development'
  const isSentinelSystem = isSentinelBootstrapServiceNumber(member?.serviceNumber)

  const { data: lockupStatus } = useLockupStatus()
  const currentHolder = lockupStatus?.currentHolder
  const buildingStatus = lockupStatus?.buildingStatus

  const { data: checkoutOptions } = useCheckoutOptions(currentHolder?.id ?? '')

  // Check account level for permissions
  const canManualCheckin = (member?.accountLevel ?? 0) >= AccountLevel.QUARTERMASTER
  const isAdmin = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN

  // Context-sensitive lockup button logic
  const isSecured = buildingStatus === 'secured'
  const isOpenWithHolder = buildingStatus === 'open' && !!currentHolder
  const isOpenNoHolder = buildingStatus === 'open' && !currentHolder
  const actionBaseClass =
    'btn btn-sm min-h-9 px-3 text-sm justify-start md:justify-center font-medium transition-all duration-200 shadow-sm hover:shadow-md'

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      data-help-id="dashboard.quick-actions"
    >
      <button
        className={`${actionBaseClass} btn-primary btn-action`}
        onClick={() => setIsKioskModalOpen(true)}
        data-testid={TID.dashboard.quickAction.kiosk}
        data-help-id="dashboard.quick-actions.kiosk-checkin"
      >
        <ScanLine className="h-4 w-4" />
        Kiosk Check-In
      </button>

      <div
        className={!canManualCheckin ? 'tooltip' : ''}
        data-tip="Requires Quartermaster level or higher"
      >
        <button
          className={`${actionBaseClass} btn-primary btn-action disabled:opacity-40`}
          disabled={!canManualCheckin}
          onClick={() => setIsVisitorModalOpen(true)}
          data-testid={TID.dashboard.quickAction.visitorSignin}
          data-help-id="dashboard.quick-actions.visitor-signin"
        >
          <Users className="h-4 w-4" />
          Visitor Sign-in
        </button>
      </div>

      <button className={`${actionBaseClass} btn-outline btn-primary`} disabled>
        <FileText className="h-4 w-4" />
        Reports
      </button>

      {isSecured ? (
        <div className={!isAdmin ? 'tooltip' : ''} data-tip="Requires Admin level or higher">
          <button
            className={`${actionBaseClass} btn-success btn-action disabled:opacity-40`}
            disabled={!isAdmin}
            onClick={() => setIsOpenBuildingOpen(true)}
            data-testid={TID.dashboard.quickAction.openBuilding}
            data-help-id="dashboard.quick-actions.open-building"
          >
            <DoorOpen className="h-4 w-4" />
            Open Building
          </button>
        </div>
      ) : (
        <div
          className={!isAdmin || isOpenNoHolder ? 'tooltip' : ''}
          data-tip={!isAdmin ? 'Requires admin role' : 'No lockup holder assigned'}
        >
          <button
            className={`${actionBaseClass} btn-warning btn-action disabled:opacity-40`}
            disabled={!isAdmin || isOpenNoHolder}
            onClick={() => setIsLockupModalOpen(true)}
            data-testid={TID.dashboard.quickAction.executeLockup}
            data-help-id="dashboard.quick-actions.execute-lockup"
          >
            <Lock className="h-4 w-4" />
            Execute Lockup
          </button>
        </div>
      )}

      {isOpenWithHolder && (
        <div className={!isAdmin ? 'tooltip' : ''} data-tip="Requires Admin level or higher">
          <button
            className={`${actionBaseClass} btn-outline btn-warning disabled:opacity-40`}
            disabled={!isAdmin}
            onClick={() => setIsTransferScanModalOpen(true)}
            data-testid={TID.dashboard.quickAction.transferLockup}
            data-help-id="dashboard.quick-actions.transfer-lockup"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Lockup
          </button>
        </div>
      )}

      {(isDevMode || isSentinelSystem) && (
        <button
          className={`${actionBaseClass} btn-outline btn-accent`}
          onClick={() => setIsScanModalOpen(true)}
          data-testid={TID.dashboard.quickAction.simulateScan}
        >
          <Radio className="h-4 w-4" />
          Simulate Scan
        </button>
      )}

      <ManualCheckinModal open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen} />
      <VisitorSigninModal open={isVisitorModalOpen} onOpenChange={setIsVisitorModalOpen} />
      {isOpenWithHolder && currentHolder && (
        <ExecuteLockupModal
          open={isLockupModalOpen}
          onOpenChange={setIsLockupModalOpen}
          memberId={currentHolder.id}
          memberName={`${currentHolder.rank} ${currentHolder.firstName} ${currentHolder.lastName}`}
          onComplete={() => setIsLockupModalOpen(false)}
        />
      )}
      <OpenBuildingModal open={isOpenBuildingOpen} onOpenChange={setIsOpenBuildingOpen} />
      {isOpenWithHolder && currentHolder && (
        <TransferLockupScanModal
          open={isTransferScanModalOpen}
          onOpenChange={setIsTransferScanModalOpen}
          currentHolder={currentHolder}
          eligibleRecipients={checkoutOptions?.eligibleRecipients ?? []}
          onComplete={() => setIsTransferScanModalOpen(false)}
        />
      )}
      {(isDevMode || isSentinelSystem) && (
        <SimulateScanModal open={isScanModalOpen} onOpenChange={setIsScanModalOpen} />
      )}
      <KioskCheckinModal open={isKioskModalOpen} onOpenChange={setIsKioskModalOpen} />
    </div>
  )
}
