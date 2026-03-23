'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Users,
  Lock,
  Unlock,
  DoorOpen,
  ShieldEllipsis,
  ShieldAlert,
  ShieldCheck,
  Clock,
  KeyRound,
  ArrowRightLeft,
} from 'lucide-react'
import { useDdsStatus } from '@/hooks/use-dds'
import { useCheckoutOptions, useLockupStatus } from '@/hooks/use-lockup'
import { useTonightDutyWatch } from '@/hooks/use-schedules'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { SetTodayDdsModal } from '@/components/dashboard/set-today-dds-modal'
import { TransferLockupScanModal } from '@/components/lockup/transfer-lockup-scan-modal'
import { ExecuteLockupModal } from '@/components/lockup/execute-lockup-modal'
import { OpenBuildingModal } from '@/components/lockup/open-building-modal'
import { TID } from '@/lib/test-ids'

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

function StatusActionsStat({
  isAdmin,
  isSecured,
  isOpenWithHolder,
  isOpenNoHolder,
  onOpenBuilding,
  onExecuteLockup,
  onSetTodayDds,
  onTransferLockup,
}: {
  isAdmin: boolean
  isSecured: boolean
  isOpenWithHolder: boolean
  isOpenNoHolder: boolean
  onOpenBuilding: () => void
  onExecuteLockup: () => void
  onSetTodayDds: () => void
  onTransferLockup: () => void
}) {
  const actionBaseClass =
    'btn btn-xs w-fit font-medium transition-all duration-200 shadow-sm hover:shadow-md btn-action disabled:opacity-40'

  return (
    <StatContainer helpId="dashboard.stat.actions">
      <div className="stat-desc">
        <div className="mt-1 flex flex-col items-start gap-1">
          {isSecured ? (
            <div
              className={!isAdmin ? 'tooltip tooltip-right' : ''}
              data-tip="Requires Admin level or higher"
            >
              <button
                className={`${actionBaseClass} btn-success justify-start`}
                disabled={!isAdmin}
                onClick={onOpenBuilding}
                data-testid={TID.dashboard.quickAction.openBuilding}
                data-help-id="dashboard.quick-actions.open-building"
              >
                <DoorOpen className="size-[1.1em] shrink-0" />
                Open Building
              </button>
            </div>
          ) : (
            <div
              className={!isAdmin || isOpenNoHolder ? 'tooltip tooltip-right' : ''}
              data-tip={!isAdmin ? 'Requires admin role' : 'No lockup holder assigned'}
            >
              <button
                className={`${actionBaseClass} btn-warning justify-start`}
                disabled={!isAdmin || isOpenNoHolder}
                onClick={onExecuteLockup}
                data-testid={TID.dashboard.quickAction.executeLockup}
                data-help-id="dashboard.quick-actions.execute-lockup"
              >
                <Lock className="size-[1.1em] shrink-0" />
                Execute Lockup
              </button>
            </div>
          )}

          <div
            className={!isAdmin ? 'tooltip tooltip-right' : ''}
            data-tip="Requires Admin level or higher"
          >
            <button
              className={`${actionBaseClass} btn-error justify-start`}
              disabled={!isAdmin}
              onClick={onSetTodayDds}
              data-testid={TID.dashboard.quickAction.setTodayDds}
            >
              <ShieldCheck className="size-[1.1em] shrink-0" />
              Transfer DDS
            </button>
          </div>

          {isOpenWithHolder && (
            <div
              className={!isAdmin ? 'tooltip tooltip-right' : ''}
              data-tip="Requires Admin level or higher"
            >
              <button
                className={`${actionBaseClass} btn-error justify-start`}
                disabled={!isAdmin}
                onClick={onTransferLockup}
                data-testid={TID.dashboard.quickAction.transferLockup}
                data-help-id="dashboard.quick-actions.transfer-lockup"
              >
                <ArrowRightLeft className="size-[1.1em] shrink-0" />
                Transfer Lockup
              </button>
            </div>
          )}
        </div>
      </div>
    </StatContainer>
  )
}

export function StatusStats() {
  const member = useAuthStore((state) => state.member)
  const [isTransferScanModalOpen, setIsTransferScanModalOpen] = useState(false)
  const [isSetTodayDdsOpen, setIsSetTodayDdsOpen] = useState(false)
  const [isOpenBuildingOpen, setIsOpenBuildingOpen] = useState(false)
  const [isLockupModalOpen, setIsLockupModalOpen] = useState(false)
  const { data: lockupStatus, isLoading: lockupLoading } = useLockupStatus()
  const currentHolder = lockupStatus?.currentHolder
  const buildingStatus = lockupStatus?.buildingStatus
  const { data: checkoutOptions } = useCheckoutOptions(currentHolder?.id ?? '')
  const isAdmin = (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const isSecured = buildingStatus === 'secured'
  const isOpenWithHolder = buildingStatus === 'open' && !!currentHolder
  const isOpenNoHolder = buildingStatus === 'open' && !currentHolder

  return (
    <div
      className="stats stats-vertical 2xl:stats-horizontal w-full shadow-md animate-fade-in"
      aria-live="polite"
      data-help-id="dashboard.status-stats"
    >
      <DdsStat />
      <DutyWatchStat />
      <BuildingStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
      <LockupHolderStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
      <StatusActionsStat
        isAdmin={isAdmin}
        isSecured={isSecured}
        isOpenWithHolder={isOpenWithHolder}
        isOpenNoHolder={isOpenNoHolder}
        onOpenBuilding={() => setIsOpenBuildingOpen(true)}
        onExecuteLockup={() => setIsLockupModalOpen(true)}
        onSetTodayDds={() => setIsSetTodayDdsOpen(true)}
        onTransferLockup={() => setIsTransferScanModalOpen(true)}
      />

      {isOpenWithHolder && currentHolder && (
        <ExecuteLockupModal
          open={isLockupModalOpen}
          onOpenChange={setIsLockupModalOpen}
          memberId={currentHolder.id}
          memberName={`${currentHolder.rank} ${currentHolder.firstName} ${currentHolder.lastName}`}
          onComplete={() => setIsLockupModalOpen(false)}
        />
      )}
      <OpenBuildingModal open={isOpenBuildingOpen} onOpenChange={setIsOpenBuildingOpen} />
      {isOpenWithHolder && currentHolder && (
        <TransferLockupScanModal
          open={isTransferScanModalOpen}
          onOpenChange={setIsTransferScanModalOpen}
          currentHolder={currentHolder}
          eligibleRecipients={checkoutOptions?.eligibleRecipients ?? []}
          onComplete={() => setIsTransferScanModalOpen(false)}
        />
      )}
      <SetTodayDdsModal open={isSetTodayDdsOpen} onOpenChange={setIsSetTodayDdsOpen} />
    </div>
  )
}
