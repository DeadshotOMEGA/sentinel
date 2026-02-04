'use client'

import type { ReactNode } from 'react'
import {
  Users,
  Lock,
  Unlock,
  Loader2,
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
  return `${member.rank} ${member.lastName}`
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
}: {
  children: ReactNode
  accentColor?: 'error' | 'warning' | 'success' | 'info'
}) {
  const borderClass = accentColor ? ACCENT_BORDER_CLASSES[accentColor] : ''
  return (
    <div
      className={`stat bg-gradient-to-br from-base-100 to-base-200 hover:from-base-200 hover:to-base-300/50 transition-all duration-200 ${borderClass}`}
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
      <StatContainer>
        <div className="stat-figure text-secondary">
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
      <StatContainer accentColor="warning">
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

  return (
    <StatContainer>
      <div className="stat-figure text-success">
        <ShieldCheck size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Day Staff</div>
      <div className="stat-value font-display text-success text-3xl">
        {ddsStatus.assignment.member.name}
      </div>
      <div className="stat-desc">
        {ddsStatus.nextDds ? `Next DDS: ${formatNextDds(ddsStatus.nextDds)}` : 'On duty today'}
      </div>
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
        return { label: 'Secured', color: 'text-success', Icon: Lock }
      case 'locking_up':
        return { label: 'Locking Up', color: 'text-warning', Icon: Loader2 }
      case 'open':
      default:
        return { label: 'Open', color: 'text-info', Icon: Unlock }
    }
  }

  if (isLoading) {
    return (
      <StatContainer>
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
      <StatContainer accentColor="error">
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
    <StatContainer>
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
      <StatContainer>
        <div className="stat-figure text-secondary">
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
      <StatContainer accentColor="warning">
        <div className="stat-figure text-warning">
          <KeyRound size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Lockup Holder</div>
        <div className="stat-value font-display text-warning text-2xl">No One</div>
        <div className="stat-desc">No one holds lockup</div>
      </StatContainer>
    )
  }

  // Someone holds lockup
  return (
    <StatContainer>
      <div className="stat-figure text-info">
        <KeyRound size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Lockup Holder</div>
      <div className="stat-value font-display text-info text-2xl">
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
      <StatContainer>
        <div className="stat-figure text-secondary">
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
      <StatContainer accentColor="warning">
        <div className="stat-figure text-warning">
          <Users size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Watch Tonight</div>
        <div className="stat-value font-display text-warning text-lg">Unassigned</div>
        <div className="stat-desc">No team assigned</div>
      </StatContainer>
    )
  }

  return (
    <StatContainer accentColor={allCheckedIn ? undefined : 'warning'}>
      <div className={`stat-figure ${allCheckedIn ? 'text-success' : 'text-warning'}`}>
        <Users size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Watch Tonight</div>
      <div className={`stat-value font-display ${allCheckedIn ? 'text-success' : 'text-warning'}`}>
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
      className="stats stats-vertical lg:stats-horizontal shadow-lg w-fit stats-panel rounded-xl animate-fade-in"
      aria-live="polite"
    >
      <DdsStat />
      <DutyWatchStat />
      <BuildingStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
      <LockupHolderStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
    </div>
  )
}
