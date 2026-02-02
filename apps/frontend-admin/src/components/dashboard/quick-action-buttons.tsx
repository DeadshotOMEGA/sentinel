'use client'

import { useState } from 'react'
import { UserPlus, Users, FileText, Lock, Radio } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'
import { VisitorSigninModal } from '@/components/visitors/visitor-signin-modal'
import { SimulateScanModal } from '@/components/dev/simulate-scan-modal'

export function QuickActionButtons() {
  const user = useAuthStore((state) => state.user)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const isDevMode = process.env.NODE_ENV === 'development'

  // Check user role for permissions
  const canManualCheckin = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const canExecuteLockup = user?.role && ['developer', 'admin'].includes(user.role)

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        className="btn btn-primary"
        disabled={!canManualCheckin}
        onClick={() => setIsCheckinModalOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
        Manual Check-in
      </button>

      <button
        className="btn btn-primary"
        disabled={!canManualCheckin}
        onClick={() => setIsVisitorModalOpen(true)}
      >
        <Users className="h-4 w-4" />
        Visitor Sign-in
      </button>

      <button
        className="btn btn-primary"
        onClick={() => {
          // TODO: Navigate to reports
          console.log('Reports clicked')
        }}
      >
        <FileText className="h-4 w-4" />
        Reports
      </button>

      <button
        className="btn btn-secondary"
        disabled={!canExecuteLockup}
        onClick={() => {
          // TODO: Execute lockup confirmation dialog
          console.log('Execute lockup clicked')
        }}
      >
        <Lock className="h-4 w-4" />
        Execute Lockup
      </button>
      {isDevMode && (
        <button
          className="btn btn-accent"
          onClick={() => setIsScanModalOpen(true)}
        >
          <Radio className="h-4 w-4" />
          Simulate Scan
        </button>
      )}
      <ManualCheckinModal open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen} />
      <VisitorSigninModal open={isVisitorModalOpen} onOpenChange={setIsVisitorModalOpen} />
      {isDevMode && (
        <SimulateScanModal open={isScanModalOpen} onOpenChange={setIsScanModalOpen} />
      )}
    </div>
  )
}
