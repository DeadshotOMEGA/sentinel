'use client'

import { UserPlus, Users, FileText, Lock, CheckCircle2 } from 'lucide-react'
import { useDdsStatus } from '@/hooks/use-dds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth-store'

export function QuickActionsWidget() {
  const { data: ddsStatus, isLoading } = useDdsStatus()
  const user = useAuthStore((state) => state.user)

  // Check user role for permissions
  const canManualCheckin = user?.role && ['developer', 'admin', 'duty_watch'].includes(user.role)
  const canExecuteLockup = user?.role && ['developer', 'admin'].includes(user.role)

  const getDdsStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-600">
            Accepted
          </Badge>
        )
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'transferred':
        return <Badge variant="outline">Transferred</Badge>
      case 'released':
        return <Badge>Released</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
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
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Navigate to visitor sign-in
            console.log('Visitor sign-in clicked')
          }}
        >
          <Users className="h-4 w-4 mr-2" />
          Visitor Sign-in
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Navigate to reports
            console.log('Reports clicked')
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          Reports
        </Button>

        <Button
          variant="outline"
          size="sm"
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

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Daily Duty Staff
        </h3>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : ddsStatus?.assignment ? (
          <div className="text-sm">
            <p className="font-medium mb-1">{ddsStatus.assignment.member.name}</p>
            <div className="flex items-center gap-2">
              {getDdsStatusBadge(ddsStatus.assignment.status)}
              <span className="text-xs text-muted-foreground">
                {new Date(ddsStatus.assignment.assignedDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No DDS assigned for today</p>
        )}
      </div>
    </div>
  )
}
