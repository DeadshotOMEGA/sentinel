'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import {
  Users,
  CheckCircle2,
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
import type { DutyWatchTeamResponse } from '@sentinel/contracts'
import { useDdsStatus } from '@/hooks/use-dds'
import { useCheckoutOptions, useLockupStatus } from '@/hooks/use-lockup'
import { useQualificationTypes } from '@/hooks/use-qualifications'
import { useTonightDutyWatch } from '@/hooks/use-schedules'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { SetTodayDdsModal } from '@/components/dashboard/set-today-dds-modal'
import { TransferLockupScanModal } from '@/components/lockup/transfer-lockup-scan-modal'
import { ExecuteLockupModal } from '@/components/lockup/execute-lockup-modal'
import { OpenBuildingModal } from '@/components/lockup/open-building-modal'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import type { ChipColor, ChipVariant } from '@/components/ui/chip'
import { MotionButton } from '@/components/ui/motion-button'
import { TID } from '@/lib/test-ids'
import { getDutyWatchCoverageSummary } from '@/lib/dashboard-member-actions'

const DUTY_WATCH_POSITION_ORDER = ['SWK', 'DSWK', 'QM', 'BM', 'APS'] as const
const DUTY_WATCH_POSITION_ORDER_INDEX = new Map<string, number>(
  DUTY_WATCH_POSITION_ORDER.map((code, index) => [code, index])
)

function subscribeToAuthHydration(onStoreChange: () => void): () => void {
  const unsubscribe = useAuthStore.persist.onFinishHydration(onStoreChange)

  if (useAuthStore.persist.hasHydrated()) {
    globalThis.queueMicrotask(onStoreChange)
  }

  return unsubscribe
}

function getAuthHydrationSnapshot(): boolean {
  return useAuthStore.persist.hasHydrated()
}

function getServerAuthHydrationSnapshot(): boolean {
  return false
}

function getDutyWatchPositionSortIndex(assignment: DutyWatchTeamResponse['team'][number]): number {
  const code = assignment.position?.code
  if (!code) return Number.MAX_SAFE_INTEGER
  return DUTY_WATCH_POSITION_ORDER_INDEX.get(code.toUpperCase()) ?? Number.MAX_SAFE_INTEGER
}

function compareDutyWatchAssignments(
  left: DutyWatchTeamResponse['team'][number],
  right: DutyWatchTeamResponse['team'][number]
): number {
  const orderDifference = getDutyWatchPositionSortIndex(left) - getDutyWatchPositionSortIndex(right)
  if (orderDifference !== 0) return orderDifference

  const leftCode = left.position?.code ?? ''
  const rightCode = right.position?.code ?? ''
  if (leftCode !== rightCode) return leftCode.localeCompare(rightCode)

  const lastNameDifference = left.member.lastName.localeCompare(right.member.lastName)
  if (lastNameDifference !== 0) return lastNameDifference

  return left.member.firstName.localeCompare(right.member.firstName)
}

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

function formatDutyWatchMemberName(
  member: DutyWatchTeamResponse['team'][number]['member']
): string {
  return `${member.rank} ${member.firstName} ${member.lastName}`
}

function getDutyWatchPositionLabel(position: DutyWatchTeamResponse['team'][number]['position']): {
  shortLabel: string
  fullLabel: string
} {
  if (!position) {
    return {
      shortLabel: 'Duty',
      fullLabel: 'Duty Watch',
    }
  }

  return {
    shortLabel: position.code || position.name,
    fullLabel: position.name,
  }
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
  className,
}: {
  children: ReactNode
  accentColor?: 'error' | 'warning' | 'success' | 'info'
  helpId?: string
  className?: string
}) {
  const borderClass = accentColor ? ACCENT_BORDER_CLASSES[accentColor] : ''
  return (
    <div
      className={`stat relative overflow-visible bg-linear-to-br from-base-100 to-base-200 hover:from-base-200 hover:to-base-300/50 transition-all duration-200 ${borderClass} ${className ?? ''}`}
      data-help-id={helpId}
    >
      {children}
    </div>
  )
}

function DdsStat({
  isAdmin,
  onResolvePendingDds,
}: {
  isAdmin: boolean
  onResolvePendingDds: () => void
}) {
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

  const assignmentStatus = ddsStatus.assignment.status
  const handover = ddsStatus.handover
  const isHandoverPending = handover.isPending
  const onSite = ddsStatus.isDdsOnSite
  const isAccepted = assignmentStatus === 'active'
  const isPendingDds = assignmentStatus === 'pending'
  const accentColor = isHandoverPending
    ? 'warning'
    : isAccepted
      ? onSite
        ? 'success'
        : 'error'
      : 'warning'
  const nameColor = isHandoverPending
    ? 'text-warning'
    : isAccepted
      ? onSite
        ? 'text-success'
        : 'text-error'
      : 'text-warning'
  const subHeading = isHandoverPending
    ? 'Outgoing DDS remains live until weekly handover is completed.'
    : isAccepted
      ? onSite
        ? 'DDS On Site'
        : 'Contact DDS Cell 204-612-4621'
      : 'DDS Scheduled, Awaiting Acceptance'
  const incomingHandoverName = handover.incomingDds ? formatMemberName(handover.incomingDds) : null

  return (
    <StatContainer accentColor={accentColor} helpId="dashboard.stat.dds">
      <div className={`stat-figure ${nameColor}`}>
        <ShieldCheck size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Day Staff</div>
      <div className={`stat-value font-display ${nameColor} text-3xl`}>
        {ddsStatus.assignment.member.rank} {ddsStatus.assignment.member.lastName}{' '}
        {ddsStatus.assignment.member.firstName.charAt(0)}
      </div>
      <div className="stat-desc flex w-full flex-col gap-2">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="min-w-0">{subHeading}</span>
          {(isPendingDds || isHandoverPending) && (
            <div
              className={!isAdmin ? 'tooltip tooltip-right' : ''}
              data-tip="Requires Admin level or higher"
            >
              <MotionButton
                className="btn btn-xs border font-medium transition-all duration-200 shadow-sm hover:shadow-md btn-action stats-action-button stats-action-success"
                disabled={!isAdmin}
                onClick={onResolvePendingDds}
              >
                {isHandoverPending ? 'Complete Handover' : 'Accept DDS'}
              </MotionButton>
            </div>
          )}
        </div>
        {isHandoverPending && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AppBadge status="warning" size="sm">
              Handover Pending
            </AppBadge>
            {incomingHandoverName && (
              <span className="text-xs text-base-content/70">Incoming: {incomingHandoverName}</span>
            )}
          </div>
        )}
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
  const { data: qualificationTypes } = useQualificationTypes()
  const qualChipStyleByCode = useMemo(() => {
    const map = new Map<string, { variant: ChipVariant; color: ChipColor }>()
    if (qualificationTypes) {
      for (const qt of qualificationTypes) {
        if (qt.tag) {
          map.set(qt.code, {
            variant: (qt.tag.chipVariant as ChipVariant) || 'solid',
            color: (qt.tag.chipColor as ChipColor) || 'default',
          })
        }
      }
    }
    return map
  }, [qualificationTypes])
  const team = useMemo(
    () => [...(dutyWatch?.team || [])].sort(compareDutyWatchAssignments),
    [dutyWatch?.team]
  )

  // Don't render if not a Duty Watch night
  if (!isLoading && !isError && !dutyWatch?.isDutyWatchNight) {
    return null
  }

  if (isLoading) {
    return (
      <StatContainer
        helpId="dashboard.stat.duty-watch"
        className="hover:z-(--z-tooltip) focus-within:z-(--z-tooltip)"
      >
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

  const coverageSummary = getDutyWatchCoverageSummary(dutyWatch)
  const checkedInCount = coverageSummary.coveredCount
  const plannedCount = coverageSummary.plannedCount
  const allCheckedIn = coverageSummary.allCovered

  if (plannedCount === 0 && coverageSummary.liveOnlyCount === 0) {
    return (
      <StatContainer
        accentColor="warning"
        helpId="dashboard.stat.duty-watch"
        className="hover:z-(--z-tooltip) focus-within:z-(--z-tooltip)"
      >
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
      className="hover:z-(--z-tooltip) focus-within:z-(--z-tooltip)"
    >
      <div className={`stat-figure ${allCheckedIn ? 'text-primary' : 'text-warning'}`}>
        <Users size={32} strokeWidth={2} />
      </div>
      <div className="stat-title">Duty Watch Tonight</div>
      <div
        className={`stat-value font-display text-3xl ${allCheckedIn ? 'text-primary' : 'text-warning'}`}
      >
        <div className="dropdown dropdown-hover dropdown-bottom dropdown-start w-full">
          <div
            tabIndex={0}
            role="button"
            className="inline-flex cursor-help items-center"
            aria-label="View tonight's Duty Watch team"
          >
            {checkedInCount}/{plannedCount || team.length}
          </div>
          <div
            tabIndex={0}
            className="dropdown-content z-(--z-tooltip) mt-3 w-96 max-w-[calc(100vw-var(--space-8))] whitespace-normal rounded-box border border-base-300 bg-base-100 p-0 font-sans text-base-content normal-case shadow-xl"
          >
            <div className="space-y-1 border-b border-base-300 px-4 py-3">
              <p className="text-sm leading-tight font-semibold text-base-content">
                Tonight&apos;s Duty Watch
              </p>
              <p className="text-xs leading-5 font-normal text-base-content/60">
                Scheduled members, their assigned watch positions, and any temporary live coverage
                that is currently covering a slot.
              </p>
            </div>
            <ul className="list rounded-box bg-base-100">
              {team.map((assignment) => {
                const positionLabel = getDutyWatchPositionLabel(assignment.position)
                const chipStyle = assignment.position?.code
                  ? qualChipStyleByCode.get(assignment.position.code)
                  : undefined
                const isCovered = assignment.isCheckedIn || Boolean(assignment.liveCoverage)

                return (
                  <li
                    key={assignment.assignmentId}
                    className="list-row grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
                  >
                    <div className="min-w-20 shrink-0">
                      <Chip
                        size="sm"
                        variant={chipStyle?.variant ?? 'flat'}
                        color={chipStyle?.color ?? 'default'}
                        className="font-mono uppercase tracking-wide"
                        title={positionLabel.fullLabel}
                      >
                        {positionLabel.shortLabel}
                      </Chip>
                    </div>
                    <div className="list-col-grow min-w-0">
                      <p className="truncate text-sm font-medium text-base-content">
                        {formatDutyWatchMemberName(assignment.member)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-base-content/60">
                        {positionLabel.fullLabel}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-base-content/50">
                        {assignment.member.serviceNumber}
                      </p>
                      {assignment.liveCoverage && (
                        <p className="mt-1 text-xs text-warning">
                          Covered live by{' '}
                          {formatDutyWatchMemberName(assignment.liveCoverage.member)}
                        </p>
                      )}
                      {assignment.source === 'live_only' && (
                        <p className="mt-1 text-xs text-info">Temporary live-only coverage</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center justify-end pt-0.5">
                      {isCovered ? (
                        <AppBadge status="success" size="sm" className="gap-1">
                          <CheckCircle2 className="size-3.5" />
                          {assignment.liveCoverage ? 'Covered' : 'Present'}
                        </AppBadge>
                      ) : (
                        <AppBadge status="neutral" size="sm">
                          Not In
                        </AppBadge>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
      <div className="stat-desc flex items-center gap-1">
        {allCheckedIn ? (
          <span>
            All scheduled slots covered
            {coverageSummary.liveOnlyCount > 0
              ? ` + ${coverageSummary.liveOnlyCount} live-only`
              : ''}
          </span>
        ) : (
          <>
            <Clock size={12} />
            <span>
              {coverageSummary.uncoveredCount} uncovered
              {coverageSummary.liveOnlyCount > 0
                ? ` • ${coverageSummary.liveOnlyCount} live-only`
                : ''}
            </span>
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
  ddsActionLabel,
  onOpenBuilding,
  onExecuteLockup,
  onSetTodayDds,
  onTransferLockup,
}: {
  isAdmin: boolean
  isSecured: boolean
  isOpenWithHolder: boolean
  isOpenNoHolder: boolean
  ddsActionLabel: string
  onOpenBuilding: () => void
  onExecuteLockup: () => void
  onSetTodayDds: () => void
  onTransferLockup: () => void
}) {
  const primaryActionClass =
    'btn btn-sm w-full min-w-44 justify-start border font-semibold transition-all duration-200 shadow-sm hover:shadow-md btn-action stats-action-button disabled:opacity-40'
  const transferActionClass =
    'btn btn-xs w-full justify-center border font-medium transition-all duration-200 shadow-sm hover:shadow-md btn-action stats-action-button disabled:opacity-40'
  const transferGridClass = isOpenWithHolder
    ? 'grid grid-cols-2 gap-[var(--space-1)]'
    : 'grid grid-cols-1 gap-[var(--space-1)]'

  return (
    <StatContainer helpId="dashboard.stat.actions">
      <div className="stat-desc">
        <div className="mt-[var(--space-1)] flex min-w-48 flex-col items-stretch gap-[var(--space-2)]">
          {isSecured ? (
            <div
              className={!isAdmin ? 'tooltip tooltip-right' : ''}
              data-tip="Requires Admin level or higher"
            >
              <MotionButton
                className={`${primaryActionClass} stats-action-success`}
                disabled={!isAdmin}
                onClick={onOpenBuilding}
                data-testid={TID.dashboard.quickAction.openBuilding}
                data-help-id="dashboard.quick-actions.open-building"
              >
                <DoorOpen className="size-[1.1em] shrink-0" />
                Open Building
              </MotionButton>
            </div>
          ) : (
            <div
              className={!isAdmin || isOpenNoHolder ? 'tooltip tooltip-right' : ''}
              data-tip={!isAdmin ? 'Requires admin role' : 'No lockup holder assigned'}
            >
              <MotionButton
                className={`${primaryActionClass} stats-action-error stats-action-emphasis-error`}
                disabled={!isAdmin || isOpenNoHolder}
                onClick={onExecuteLockup}
                data-testid={TID.dashboard.quickAction.executeLockup}
                data-help-id="dashboard.quick-actions.execute-lockup"
              >
                <Lock className="size-[1.1em] shrink-0" />
                Execute Lockup
              </MotionButton>
            </div>
          )}

          <div className="flex flex-col gap-[var(--space-1)]">
            <p className="text-[0.68rem] leading-none font-semibold tracking-wide text-base-content/60 uppercase">
              Transfer
            </p>
            <div className={transferGridClass} aria-label="Transfer quick actions">
              <div
                className={`w-full ${!isAdmin ? 'tooltip tooltip-right' : ''}`}
                data-tip="Requires Admin level or higher"
              >
                <MotionButton
                  className={`${transferActionClass} stats-action-warning`}
                  disabled={!isAdmin}
                  onClick={onSetTodayDds}
                  title={ddsActionLabel}
                  aria-label={ddsActionLabel}
                  data-testid={TID.dashboard.quickAction.setTodayDds}
                  data-help-id="dashboard.quick-actions.transfer-dds"
                >
                  <ShieldCheck className="size-[1.1em] shrink-0" />
                  DDS
                </MotionButton>
              </div>

              {isOpenWithHolder && (
                <div
                  className={`w-full ${!isAdmin ? 'tooltip tooltip-right' : ''}`}
                  data-tip="Requires Admin level or higher"
                >
                  <MotionButton
                    className={`${transferActionClass} stats-action-warning`}
                    disabled={!isAdmin}
                    onClick={onTransferLockup}
                    data-testid={TID.dashboard.quickAction.transferLockup}
                    data-help-id="dashboard.quick-actions.transfer-lockup"
                  >
                    <ArrowRightLeft className="size-[1.1em] shrink-0" />
                    Lockup
                  </MotionButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StatContainer>
  )
}

export function StatusStats() {
  const member = useAuthStore((state) => state.member)
  const hasHydrated = useSyncExternalStore(
    subscribeToAuthHydration,
    getAuthHydrationSnapshot,
    getServerAuthHydrationSnapshot
  )
  const [isTransferScanModalOpen, setIsTransferScanModalOpen] = useState(false)
  const [isSetTodayDdsOpen, setIsSetTodayDdsOpen] = useState(false)
  const [isOpenBuildingOpen, setIsOpenBuildingOpen] = useState(false)
  const [isLockupModalOpen, setIsLockupModalOpen] = useState(false)
  const { data: lockupStatus, isLoading: lockupLoading } = useLockupStatus()
  const { data: ddsStatus } = useDdsStatus()
  const currentHolder = lockupStatus?.currentHolder
  const buildingStatus = lockupStatus?.buildingStatus
  const { data: checkoutOptions } = useCheckoutOptions(currentHolder?.id ?? '')
  const isAdmin = hasHydrated && (member?.accountLevel ?? 0) >= AccountLevel.ADMIN
  const isSecured = buildingStatus === 'secured'
  const isOpenWithHolder = buildingStatus === 'open' && !!currentHolder
  const isOpenNoHolder = buildingStatus === 'open' && !currentHolder
  const ddsActionLabel = ddsStatus?.handover.isPending ? 'Complete Handover' : 'Transfer DDS'

  return (
    <div
      className="stats stats-vertical 2xl:stats-horizontal relative isolate z-(--z-dropdown) w-full overflow-visible shadow-md animate-fade-in"
      aria-live="polite"
      data-help-id="dashboard.status-stats"
    >
      <DdsStat isAdmin={isAdmin} onResolvePendingDds={() => setIsSetTodayDdsOpen(true)} />
      <DutyWatchStat />
      <BuildingStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
      <LockupHolderStat lockupStatus={lockupStatus} isLoading={lockupLoading} />
      <StatusActionsStat
        isAdmin={isAdmin}
        isSecured={isSecured}
        isOpenWithHolder={isOpenWithHolder}
        isOpenNoHolder={isOpenNoHolder}
        ddsActionLabel={ddsActionLabel}
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
