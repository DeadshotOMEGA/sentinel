'use client'

import { Users, CheckCircle2, Building2, Lock, Unlock, Loader2, ShieldX, ShieldEllipsis, ShieldAlert, ShieldCheck } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'
import { useDdsStatus } from '@/hooks/use-dds'
import { useLockupStatus } from '@/hooks/use-lockup'

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
      <div className="stat w-50">
        <div className="stat-title">Currently Present</div>
        <div className="stat-value text-error">--</div>
        <div className="stat-desc text-error">Failed to load</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="stat w-50">
        <div className="stat-title">Currently Present</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
    )
  }

  const totalPresent = data?.totalPresent ?? 0

  return (
    <div className="stat w-50">
      <div className="stat-title">Currently Present</div>
      <div className="stat-value text-primary">{totalPresent}</div>
      <div className="stat-desc">{totalPresent === 1 ? 'member' : 'members'} on site</div>
    </div>
  )
}

function DdsStat() {
  const { data: ddsStatus, isLoading } = useDdsStatus()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <span className="badge badge-success badge-sm">Accepted</span>
      case 'pending':
        return <span className="badge badge-ghost badge-sm">Pending</span>
      case 'transferred':
        return <span className="badge badge-outline badge-sm">Transferred</span>
      case 'released':
        return <span className="badge badge-sm">Released</span>
      default:
        return <span className="badge badge-ghost badge-sm">{status}</span>
    }
  }

  if (isLoading) {
    return (
      <div className="stat w-50">
        <div className="stat-figure text-secondary">
          <ShieldEllipsis size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Daily Duty Staff</div>
        <div className="stat-value"><span className="loading loading-dots loading-md"></span></div>
        <div className="stat-desc">Loading...</div>
      </div>
    )
  }

  if (!ddsStatus?.assignment) {
    return (
      <div className="stat w-50">
        <div className="stat-figure text-error">
          <ShieldAlert size={32} strokeWidth={2} />
        </div>
        <div className="stat-title">Daily Duty Staff</div>
        <div className="stat-value text-error text-lg">Unassigned</div>
        <div className="stat-desc">No DDS for today</div>
      </div>
    )
  }

  return (
    <div className="stat w-50">
      <div className="stat-figure text-secondary">
        <ShieldCheck size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Daily Duty Staff</div>
      <div className="stat-value text-success text-lg">{ddsStatus.assignment.member.name}</div>
      <div className="stat-desc flex items-center gap-1">
        {getStatusBadge(ddsStatus.assignment.status)}
        <span>{new Date(ddsStatus.assignment.assignedDate).toLocaleDateString()}</span>
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
      <div className="stat w-50">
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
    return null
  }

  return (
    <div className="stat w-50">
      <div className="stat-title">Building Status</div>
      <div className={`stat-value flex items-center gap-2 ${display.color}`}>
        <StatusIcon className={`h-6 w-6 ${lockupStatus?.buildingStatus === 'locking_up' ? 'animate-spin' : ''}`} />
        {display.label}
      </div>
      <div className="stat-desc">{getDesc()}</div>
    </div>
  )
}

export function StatusStats() {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow w-fit bg-base-100">
      <PresenceStat />
      <DdsStat />
      <BuildingStat />
    </div>
  )
}
