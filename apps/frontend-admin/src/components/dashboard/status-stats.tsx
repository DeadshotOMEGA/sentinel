'use client'

import type { ReactNode } from 'react'
import {
  Users,
  Lock,
  Unlock,
  ShieldEllipsis,
  ShieldAlert,
  ShieldCheck,
  Clock,
  KeyRound,
} from 'lucide-react'
import { useDdsStatus } from '@/hooks/use-dds'
import { useLockupStatus } from '@/hooks/use-lockup'
import { useTonightDutyWatch } from '@/hooks/use-schedules'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMemberName(
  member: { rank: string; firstName: string; lastName: string } | null
): string {
  if (!member) return 'Unknown'
  return `${member.rank} ${member.lastName} ${member.firstName.charAt(0)}`
}

// Accent border color mapping (Tailwind requires static classes)
const ACCENT_BORDER_CLASSES: Record<string, string> = {
  error: 'border-l-4 border-l-error',
  warning: 'border-l-4 border-l-warning',
  success: 'border-l-4 border-l-success',
  info: 'border-l-4 border-l-info',
}

// Shared stat container with hover state
function StatContainer({
  children,
  accentColor,
  helpId,
}: {
  children: ReactNode
  accentColor?: 'error' | 'warning' | 'success' | 'info'
  helpId?: string
}) {
  const borderClass = accentColor ? ACCENT_BORDER_CLASSES[accentColor] : ''
  return (
    <div
      className={`stat bg-linear-to-br from-base-100 to-base-200 hover:from-base-200 hover:to-base-300/50 transition-all duration-200 ${borderClass}`}
      data-help-id={helpId}
    >
      {children}
    </div>
  )
}

function DdsStat() {
  const { data: ddsStatus, isLoading } = useDdsStatus()

  const formatNextDds = (nextDds: { rank: string; lastName: string; firstName: string } | null) => {
    if (!nextDds) return null
    return `${nextDds.rank} ${nextDds.lastName}, ${nextDds.firstName}`
  }

  if (isLoading) {
    return (
      <StatContainer helpId="dashboard.stat.dds">
        <div className="stat-figure text-primary">
          <ShieldEllipsis size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Day Staff</div>
        <div className="stat-value">
          <span
            className="loading loading-dots loading-md"
            role="status"
            aria-label="Loading"
          ></span>
        </div>
        <div className="stat-desc">Loading...</div>
      </StatContainer>
    )
  }

  if (!ddsStatus?.assignment) {
    return (
      <StatContainer accentColor="warning" helpId="dashboard.stat.dds">
        <div className="stat-figure text-error">
          <ShieldAlert size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Day Staff</div>
        <div className="stat-value font-display text-error text-3xl">Unassigned</div>
        <div className="stat-desc">
          {ddsStatus?.nextDds
            ? `Next DDS: ${formatNextDds(ddsStatus.nextDds)}`
            : 'No DDS for today'}
        </div>
      </StatContainer>
    )
  }

  const onSite = ddsStatus.isDdsOnSite
  const nameColor = onSite ? 'text-success' : 'text-error'
  const subHeading = onSite ? 'DDS On Site' : 'Contact DDS Cell 204-612-4621'

  return (
    <StatContainer accentColor={onSite ? 'success' : 'error'} helpId="dashboard.stat.dds">
      <div className={`stat-figure ${nameColor}`}>
        <ShieldCheck size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Day Staff</div>
      <div className={`stat-value font-display ${nameColor} text-3xl`}>
        {ddsStatus.assignment.member.rank} {ddsStatus.assignment.member.lastName}{' '}
        {ddsStatus.assignment.member.firstName.charAt(0)}
      </div>
      <div className="stat-desc">{subHeading}</div>
    </StatContainer>
  )
}

function BuildingStat({
  lockupStatus,
  isLoading,
}: {
  lockupStatus: ReturnType<typeof useLockupStatus>['data']
  isLoading: boolean
}) {
  const getStatusDisplay = (status: string | undefined) => {
    switch (status) {
      case 'secured':
        return { label: 'Secured', color: 'text-primary', Icon: Lock }
      case 'locking_up':
        return { label: 'Locking Up', color: 'text-warning', Icon: Unlock }
      case 'open':
      default:
        return { label: 'Open', color: 'text-info', Icon: Unlock }
    }
  }

  if (isLoading) {
    return (
      <StatContainer helpId="dashboard.stat.building">
        <div className="stat-title">Building Status</div>
        <div className="stat-value">
          <span
            className="loading loading-dots loading-md"
            role="status"
            aria-label="Loading"
          ></span>
        </div>
        <div className="stat-desc">Loading...</div>
      </StatContainer>
    )
  }

  const display = getStatusDisplay(lockupStatus?.buildingStatus)
  const StatusIcon = display.Icon

  const getDesc = () => {
    if (lockupStatus?.buildingStatus === 'secured' && lockupStatus.securedBy) {
      return `Secured by ${formatMemberName(lockupStatus.securedBy)}${lockupStatus.securedAt ? ` at ${formatTime(lockupStatus.securedAt)}` : ''}`
    }
    if (lockupStatus?.currentHolder && lockupStatus.buildingStatus !== 'secured') {
      return `Held by ${formatMemberName(lockupStatus.currentHolder)}${lockupStatus.acquiredAt ? ` since ${formatTime(lockupStatus.acquiredAt)}` : ''}`
    }
    return 'No lockup in progress'
  }

  if (display.label === 'Secured') {
    return (
      <StatContainer accentColor="error" helpId="dashboard.stat.building">
        <div className="stat-figure text-error">
          <StatusIcon size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Building Status</div>
        <div className="stat-value font-display text-error text-3xl">{display.label}</div>
        <div className="stat-desc">{getDesc()}</div>
      </StatContainer>
    )
  }

  return (
    <StatContainer helpId="dashboard.stat.building">
      <div className="stat-figure text-success">
        <StatusIcon size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Building Status</div>
      <div className="stat-value font-display text-success text-3xl">{display.label}</div>
      <div className="stat-desc">{getDesc()}</div>
    </StatContainer>
  )
}

function LockupHolderStat({
  lockupStatus,
  isLoading,
}: {
  lockupStatus: ReturnType<typeof useLockupStatus>['data']
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <StatContainer helpId="dashboard.stat.lockup-holder">
        <div className="stat-figure text-primary">
          <KeyRound size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Lockup Holder</div>
        <div className="stat-value">
          <span
            className="loading loading-dots loading-md"
            role="status"
            aria-label="Loading"
          ></span>
        </div>
        <div className="stat-desc">Loading...</div>
      </StatContainer>
    )
  }

  // Building is secured — hide this stat entirely
  if (lockupStatus?.buildingStatus === 'secured') {
    return null
  }

  // No one holds lockup
  if (!lockupStatus?.currentHolder) {
    return (
      <StatContainer accentColor="warning" helpId="dashboard.stat.lockup-holder">
        <div className="stat-figure text-warning">
          <KeyRound size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Lockup Holder</div>
        <div className="stat-value font-display text-warning text-3xl">No One</div>
        <div className="stat-desc">No one holds lockup</div>
      </StatContainer>
    )
  }

  // Someone holds lockup
  return (
    <StatContainer helpId="dashboard.stat.lockup-holder">
      <div className="stat-figure text-primary">
        <KeyRound size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Lockup Holder</div>
      <div className="stat-value font-display text-primary text-3xl">
        {formatMemberName(lockupStatus.currentHolder)}
      </div>
      <div className="stat-desc">
        {lockupStatus.acquiredAt
          ? `Since ${formatTime(lockupStatus.acquiredAt)}`
          : 'Currently responsible'}
      </div>
    </StatContainer>
  )
}

function DutyWatchStat() {
  const { data: dutyWatch, isLoading, isError } = useTonightDutyWatch()

  // Don't render if not a Duty Watch night
  if (!isLoading && !isError && !dutyWatch?.isDutyWatchNight) {
    return null
  }

  if (isLoading) {
    return (
      <StatContainer helpId="dashboard.stat.duty-watch">
        <div className="stat-figure text-primary">
          <Users size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Watch Tonight</div>
        <div className="stat-value">
          <span
            className="loading loading-dots loading-md"
            role="status"
            aria-label="Loading"
          ></span>
        </div>
        <div className="stat-desc">Loading...</div>
      </StatContainer>
    )
  }

  if (isError || !dutyWatch?.isDutyWatchNight) {
    return null
  }

  const team = dutyWatch.team || []
  const checkedInCount = team.filter((m: { isCheckedIn: boolean }) => m.isCheckedIn).length
  const allCheckedIn = checkedInCount === team.length && team.length > 0

  if (team.length === 0) {
    return (
      <StatContainer accentColor="warning" helpId="dashboard.stat.duty-watch">
        <div className="stat-figure text-warning">
          <Users size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Watch Tonight</div>
        <div className="stat-value font-display text-warning text-3xl">Unassigned</div>
        <div className="stat-desc">No team assigned</div>
      </StatContainer>
    )
  }

  return (
    <StatContainer
      accentColor={allCheckedIn ? undefined : 'warning'}
      helpId="dashboard.stat.duty-watch"
    >
      <div className={`stat-figure ${allCheckedIn ? 'text-primary' : 'text-warning'}`}>
        <Users size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Watch Tonight</div>
      <div
        className={`stat-value font-display text-3xl ${allCheckedIn ? 'text-primary' : 'text-warning'}`}
      >
        {checkedInCount}/{team.length}
      </div>
      <div className="stat-desc flex items-center gap-1">
        {allCheckedIn ? (
          <span>All checked in</span>
        ) : (
          <>
            <Clock size={12} />
            <span>{team.length - checkedInCount} not checked in</span>
          </>
        )}
      </div>
    </StatContainer>
  )
}

export function StatusStats() {
  const { data: lockupStatus, isLoading: lockupLoading } = useLockupStatus()

  return (
    <div
      className="stats stats-vertical lg:stats-horizontal shadow-lg w-fit stats-panel animate-fade-in"
      aria-live="polite"
      data-help-id="dashboard.status-stats"
    >
      <DdsStat />
      <DutyWatchStat />
      <BuildingStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
      <LockupHolderStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
    </div>
  )
}
