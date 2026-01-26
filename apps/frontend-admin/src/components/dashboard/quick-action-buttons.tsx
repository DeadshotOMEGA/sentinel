'use client'

import { UserPlus, Users, FileText, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'

export function QuickActionButtons() {
  const user = useAuthStore((state) => state.user)

  // Check user role for permissions
  const canManualCheckin = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const canExecuteLockup = user?.role && ['developer', 'admin'].includes(user.role)

  return (
    <div className="flex gap-3 mb-6">
      <Button
        variant="default"
        disabled={!canManualCheckin}
        onClick={() => {
          // TODO: Open manual check-in modal
          console.log('Manual check-in clicked')
        }}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Manual Check-in
      </Button>

      <Button
        variant="default"
        onClick={() => {
          // TODO: Navigate to visitor sign-in
          console.log('Visitor sign-in clicked')
        }}
      >
        <Users className="h-4 w-4 mr-2" />
        Visitor Sign-in
      </Button>

      <Button
        variant="default"
        onClick={() => {
          // TODO: Navigate to reports
          console.log('Reports clicked')
        }}
      >
        <FileText className="h-4 w-4 mr-2" />
        Reports
      </Button>

      <Button
        variant="destructive"
        disabled={!canExecuteLockup}
        onClick={() => {
          // TODO: Execute lockup confirmation dialog
          console.log('Execute lockup clicked')
        }}
      >
        <Lock className="h-4 w-4 mr-2" />
        Execute Lockup
      </Button>
    </div>
  )
}
