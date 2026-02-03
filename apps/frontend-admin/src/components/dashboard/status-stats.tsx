'use client'

import { Users, CheckCircle2, DoorOpen, Building2, Lock, Unlock, Loader2, ShieldX, ShieldEllipsis, ShieldAlert, ShieldCheck, Clock, KeyRound, KeySquare } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'
import { useDdsStatus } from '@/hooks/use-dds'
import { useLockupStatus } from '@/hooks/use-lockup'
import { useTonightDutyWatch } from '@/hooks/use-schedules'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMemberName(member: { rank: string; firstName: string; lastName: string } | null): string {
  if (!member) return 'Unknown'
  return `${member.rank} ${member.lastName}`
}

function PresenceStat() {
  const { data, isLoading, isError } = usePresence()

  if (isError) {
    return (
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-title">Currently Present</div>
        <div className="stat-value text-error text-3xl">--</div>
        <div className="stat-desc text-error">Failed to load</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-title">Currently Present</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
    )
  }

  const totalPresent = data?.totalPresent ?? 0

  return (
    <div className="stat bg-base-200 w-flex-50">
      <div className="stat-title">Currently Present</div>
      <div className="stat-value text-success text-3xl">{totalPresent}</div>
      <div className="stat-desc">{totalPresent === 1 ? 'member' : 'members'} on site</div>
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
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-secondary">
          <ShieldEllipsis size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Day Staff</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
    )
  }

  if (!ddsStatus?.assignment) {
    return (
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-error">
          <ShieldAlert size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Day Staff</div>
        <div className="stat-value text-error text-3xl">Unassigned</div>
        <div className="stat-desc">
          {ddsStatus?.nextDds
            ? `Next DDS: ${formatNextDds(ddsStatus.nextDds)}`
            : 'No DDS for today'}
        </div>
      </div>
    )
  }

  return (
    <div className="stat bg-base-200 w-flex-50">
      <div className="stat-figure text-success">
        <ShieldCheck size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Day Staff</div>
      <div className="stat-value text-success text-3xl">{ddsStatus.assignment.member.name}</div>
      <div className="stat-desc">
        {ddsStatus.nextDds
          ? `Next DDS: ${formatNextDds(ddsStatus.nextDds)}`
          : 'On duty today'}
      </div>
    </div>
  )
}

function BuildingStat() {
  const { data: lockupStatus, isLoading } = useLockupStatus()

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
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-title">Building Status</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
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

  if (display.label === "Secured") {
    return (
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-error">
          <StatusIcon size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Building Status</div>
        <div className="stat-value text-error text-3xl">{display.label}</div>
        <div className="stat-desc">{getDesc()}</div>
      </div>
    )
  }

  return (
    <div className="stat bg-base-200 w-flex-50">
      <div className="stat-figure text-success">
        <StatusIcon size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Building Status</div>
      <div className="stat-value text-success text-3xl">{display.label}</div>
      <div className="stat-desc">{getDesc()}</div>
    </div>
  )
}

function LockupHolderStat() {
  const { data: lockupStatus, isLoading } = useLockupStatus()

  if (isLoading) {
    return (
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-secondary">
          <KeyRound size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Lockup Holder</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
    )
  }

  // Building is secured — hide this stat entirely
  if (lockupStatus?.buildingStatus === 'secured') {
    return null
  }

  // No one holds lockup
  if (!lockupStatus?.currentHolder) {
    return (
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-warning">
          <KeyRound size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Lockup Holder</div>
        <div className="stat-value text-warning text-2xl">No One</div>
        <div className="stat-desc">No one holds lockup</div>
      </div>
    )
  }

  // Someone holds lockup
  return (
    <div className="stat bg-base-200 w-flex-50">
      <div className="stat-figure text-info">
        <KeyRound size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Lockup Holder</div>
      <div className="stat-value text-info text-2xl">
        {formatMemberName(lockupStatus.currentHolder)}
      </div>
      <div className="stat-desc">
        {lockupStatus.acquiredAt ? `Since ${formatTime(lockupStatus.acquiredAt)}` : 'Currently responsible'}
      </div>
    </div>
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
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-secondary">
          <Users size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Watch Tonight</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
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
      <div className="stat bg-base-200 w-flex-50">
        <div className="stat-figure text-warning">
          <Users size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Duty Watch Tonight</div>
        <div className="stat-value text-warning text-lg">Unassigned</div>
        <div className="stat-desc">No team assigned</div>
      </div>
    )
  }

  return (
    <div className="stat bg-base-200 w-flex-50">
      <div className="stat-figure text-secondary">
        <Users size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Watch Tonight</div>
      <div className={`stat-value ${allCheckedIn ? 'text-success' : 'text-warning'}`}>
        {checkedInCount}/{team.length}
      </div>
      <div className="stat-desc flex items-center gap-1">
        {allCheckedIn ? (
          <span className="badge badge-success badge-sm">All Present</span>
        ) : (
          <>
            <Clock size={12} />
            <span>{team.length - checkedInCount} not checked in</span>
          </>
        )}
      </div>
    </div>
  )
}

export function StatusStats() {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-fit bg-base-100">
      <PresenceStat />
      <DdsStat />
      <DutyWatchStat />
      <BuildingStat />
      <LockupHolderStat />
    </div>
  )
}
