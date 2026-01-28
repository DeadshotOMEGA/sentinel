'use client'

import { Building2, Lock, Unlock, Loader2, User } from 'lucide-react'
import { useLockupStatus } from '@/hooks/use-lockup'
import { usePresence } from '@/hooks/use-presence'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMemberName(member: { rank: string; firstName: string; lastName: string } | null): string {
  if (!member) return 'Unknown'
  return `${member.rank} ${member.lastName}`
}

export function BuildingStatusWidget() {
  const { data: lockupStatus, isLoading: loadingLockup } = useLockupStatus()
  const { data: presence, isLoading: loadingPresence } = usePresence()

  const isLoading = loadingLockup || loadingPresence

  const getBuildingStatusDisplay = (status: string | undefined) => {
    switch (status) {
      case 'secured':
        return {
          label: 'SECURED',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-600',
          Icon: Lock,
        }
      case 'locking_up':
        return {
          label: 'LOCKING UP',
          variant: 'secondary' as const,
          className: 'bg-yellow-500 text-yellow-900 hover:bg-yellow-500',
          Icon: Loader2,
        }
      case 'open':
      default:
        return {
          label: 'OPEN',
          variant: 'outline' as const,
          className: 'border-blue-500 text-blue-600',
          Icon: Unlock,
        }
    }
  }

  const statusDisplay = getBuildingStatusDisplay(lockupStatus?.buildingStatus)
  const StatusIcon = statusDisplay.Icon

  // Get checked-in count from presence data
  const totalPresent = presence?.totalPresent ?? 0

  return (
    <div className="relative isolate overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Building Status</h2>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-6 bg-muted rounded w-2/3"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <Badge className={cn('text-lg px-4 py-1', statusDisplay.className)}>
                <StatusIcon
                  className={cn(
                    'h-4 w-4 mr-2',
                    lockupStatus?.buildingStatus === 'locking_up' && 'animate-spin'
                  )}
                />
                {statusDisplay.label}
              </Badge>
            </div>

            {/* People Count */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totalPresent}</span>
              <span className="text-muted-foreground">
                {totalPresent === 1 ? 'person' : 'people'} checked in
              </span>
            </div>

            {/* Lockup Holder */}
            {lockupStatus?.currentHolder && lockupStatus.buildingStatus !== 'secured' && (
              <div className="pt-2 border-t text-sm">
                <span className="text-muted-foreground">Lockup held by: </span>
                <span className="font-medium">{formatMemberName(lockupStatus.currentHolder)}</span>
                {lockupStatus.acquiredAt && (
                  <span className="text-muted-foreground ml-2">
                    since {formatTime(lockupStatus.acquiredAt)}
                  </span>
                )}
              </div>
            )}

            {/* Last Secured */}
            {lockupStatus?.buildingStatus === 'secured' && lockupStatus.securedBy && (
              <div className="pt-2 border-t text-sm">
                <span className="text-muted-foreground">Secured by: </span>
                <span className="font-medium">{formatMemberName(lockupStatus.securedBy)}</span>
                {lockupStatus.securedAt && (
                  <span className="text-muted-foreground ml-2">
                    at {formatTime(lockupStatus.securedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subtle background effect */}
        <div
          className={cn(
            'absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl',
            lockupStatus?.buildingStatus === 'secured' && 'bg-green-500/10',
            lockupStatus?.buildingStatus === 'open' && 'bg-blue-500/10',
            lockupStatus?.buildingStatus === 'locking_up' && 'bg-yellow-500/10'
          )}
        />
      </div>
    </div>
  )
}
