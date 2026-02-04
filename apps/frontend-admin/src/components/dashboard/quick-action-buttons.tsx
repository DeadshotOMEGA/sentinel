/* global process */
'use client'

import { useState } from 'react'
import { UserPlus, Users, FileText, Lock, Radio, DoorOpen } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { ExecuteLockupModal } from '@/components/lockup/execute-lockup-modal'
import { OpenBuildingModal } from '@/components/lockup/open-building-modal'
import { VisitorSigninModal } from '@/components/visitors/visitor-signin-modal'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'
import { useLockupStatus } from '@/hooks/use-lockup'

export function QuickActionButtons() {
  const user = useAuthStore((state) => state.user)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false)
  const [isLockupModalOpen, setIsLockupModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isOpenBuildingOpen, setIsOpenBuildingOpen] = useState(false)
  const isDevMode = process.env.NODE_ENV === 'development'

  const { data: lockupStatus } = useLockupStatus()
  const currentHolder = lockupStatus?.currentHolder
  const buildingStatus = lockupStatus?.buildingStatus

  // Check user role for permissions
  const canManualCheckin = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const isAdmin = user?.role && ['developer', 'admin'].includes(user.role)

  // Context-sensitive lockup button logic
  const isSecured = buildingStatus === 'secured'
  const isOpenWithHolder = buildingStatus === 'open' && !!currentHolder
  const isOpenNoHolder = buildingStatus === 'open' && !currentHolder

  return (
    <div className="flex flex-wrap gap-3">
      <div
        className={!canManualCheckin ? 'tooltip' : ''}
        data-tip="Requires duty_watch or admin role"
      >
        <button
          className="btn btn-primary btn-action shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40"
          disabled={!canManualCheckin}
          onClick={() => setIsCheckinModalOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Manual Check-in
        </button>
      </div>

      <div
        className={!canManualCheckin ? 'tooltip' : ''}
        data-tip="Requires duty_watch or admin role"
      >
        <button
          className="btn btn-primary btn-action shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40"
          disabled={!canManualCheckin}
          onClick={() => setIsVisitorModalOpen(true)}
        >
          <Users className="h-4 w-4" />
          Visitor Sign-in
        </button>
      </div>

      <button
        className="btn btn-outline btn-primary hover:shadow-md transition-all duration-200"
        disabled
      >
        <FileText className="h-4 w-4" />
        Reports
      </button>

      {isSecured ? (
        <div className={!isAdmin ? 'tooltip' : ''} data-tip="Requires admin role">
          <button
            className="btn btn-success btn-action shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40"
            disabled={!isAdmin}
            onClick={() => setIsOpenBuildingOpen(true)}
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
            className="btn btn-secondary btn-action shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40"
            disabled={!isAdmin || isOpenNoHolder}
            onClick={() => setIsLockupModalOpen(true)}
          >
            <Lock className="h-4 w-4" />
            Execute Lockup
          </button>
        </div>
      )}

      {isDevMode && (
        <button
          className="btn btn-outline btn-accent hover:shadow-md transition-all duration-200 ml-auto"
          onClick={() => setIsScanModalOpen(true)}
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
      {isDevMode && <SimulateScanModal open={isScanModalOpen} onOpenChange={setIsScanModalOpen} />}
    </div>
  )
}
