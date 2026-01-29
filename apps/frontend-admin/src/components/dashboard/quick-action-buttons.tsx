'use client'

import { useState } from 'react'
import { UserPlus, Users, FileText, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { ManualCheckinModal } from '@/components/checkins/manual-checkin-modal'

export function QuickActionButtons() {
  const user = useAuthStore((state) => state.user)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)

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
        onClick={() => {
          // TODO: Navigate to visitor sign-in
          console.log('Visitor sign-in clicked')
        }}
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
      <div className="divider divider-primary"></div>
      <button className="btn btn-neutral">Neutral</button>
      <button className="btn btn-primary">Primary</button>
      <button className="btn btn-secondary">Secondary</button>
      <button className="btn btn-accent">Accent</button>
      <button className="btn btn-info">Info</button>
      <button className="btn btn-success">Success</button>
      <button className="btn btn-warning">Warning</button>
      <button className="btn btn-error">Error</button>

      <ManualCheckinModal open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen} />
    </div>
  )
}
