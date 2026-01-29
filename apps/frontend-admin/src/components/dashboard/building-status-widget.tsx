'use client'

import { Building2, Lock, Unlock, Loader2, User } from 'lucide-react'
import { useLockupStatus } from '@/hooks/use-lockup'
import { usePresence } from '@/hooks/use-presence'

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
          badgeClass: 'badge-success',
          Icon: Lock,
        }
      case 'locking_up':
        return {
          label: 'LOCKING UP',
          badgeClass: 'badge-warning',
          Icon: Loader2,
        }
      case 'open':
      default:
        return {
          label: 'OPEN',
          badgeClass: 'badge-info',
          Icon: Unlock,
        }
    }
  }

  const statusDisplay = getBuildingStatusDisplay(lockupStatus?.buildingStatus)
  const StatusIcon = statusDisplay.Icon

  // Get checked-in count from presence data
  const totalPresent = presence?.totalPresent ?? 0

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-2">
          <div className="btn btn-square btn-primary btn-soft btn-sm no-animation">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="card-title text-lg">Building Status</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2"></div>
            <div className="skeleton h-6 w-2/3"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span className={`badge ${statusDisplay.badgeClass} badge-lg gap-2`}>
                <StatusIcon
                  className={`h-4 w-4 ${
                    lockupStatus?.buildingStatus === 'locking_up' ? 'animate-spin' : ''
                  }`}
                />
                {statusDisplay.label}
              </span>
            </div>

            {/* People Count */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-base-content/60" />
              <span className="font-medium">{totalPresent}</span>
              <span className="text-base-content/60">
                {totalPresent === 1 ? 'person' : 'people'} checked in
              </span>
            </div>

            {/* Lockup Holder */}
            {lockupStatus?.currentHolder && lockupStatus.buildingStatus !== 'secured' && (
              <div className="pt-2 border-t border-base-300 text-sm">
                <span className="text-base-content/60">Lockup held by: </span>
                <span className="font-medium">{formatMemberName(lockupStatus.currentHolder)}</span>
                {lockupStatus.acquiredAt && (
                  <span className="text-base-content/60 ml-2">
                    since {formatTime(lockupStatus.acquiredAt)}
                  </span>
                )}
              </div>
            )}

            {/* Last Secured */}
            {lockupStatus?.buildingStatus === 'secured' && lockupStatus.securedBy && (
              <div className="pt-2 border-t border-base-300 text-sm">
                <span className="text-base-content/60">Secured by: </span>
                <span className="font-medium">{formatMemberName(lockupStatus.securedBy)}</span>
                {lockupStatus.securedAt && (
                  <span className="text-base-content/60 ml-2">
                    at {formatTime(lockupStatus.securedAt)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
