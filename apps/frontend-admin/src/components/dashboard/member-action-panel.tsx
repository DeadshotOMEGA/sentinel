'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRightLeft,
  Clock3,
  DoorOpen,
  History,
  KeyRound,
  NotebookPen,
  ShieldCheck,
  ShieldPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PresentPerson } from '@sentinel/contracts'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
import { TransferLockupScanModal } from '@/components/lockup/transfer-lockup-scan-modal'
import { useCheckins, useManualCheckout } from '@/hooks/use-checkins'
import { useCheckoutOptions, useOpenBuilding } from '@/hooks/use-lockup'
import {
  useClearLiveDutyAssignment,
  useCreateDwOverride,
  useCreateLiveDutyAssignment,
  useCurrentDds,
  useDutyRolePositions,
  useDutyRoles,
  useTonightDutyWatch,
} from '@/hooks/use-schedules'
import {
  getDashboardDutyPositionCode,
  getQualifiedTemporaryDutyPositions,
  getTonightReplacementOptions,
} from '@/lib/dashboard-member-actions'
import { canEditHistoryEntries, getCurrentDdsEditorId } from '@/lib/history-permissions'
import { TID } from '@/lib/test-ids'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

export type MemberActionView =
  | 'menu'
  | 'manualCheckout'
  | 'temporaryRole'
  | 'tonightOverride'
  | 'transferLockup'
  | 'openBuilding'
  | 'history'

export type MemberActionDrawerSide = 'left' | 'right'

interface MemberActionPanelProps {
  className?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  person: PresentPerson | null
  view: MemberActionView
  onViewChange: (view: MemberActionView) => void
}

interface MenuActionButtonProps {
  icon: LucideIcon
  title: string
  description: string
  tone?: 'neutral' | 'info' | 'warning'
  badge?: ReactNode
  onClick: () => void
}

interface ActionViewShellProps {
  icon: LucideIcon
  title: string
  description: string
  summary: ReactNode
  onBack: () => void
  onClose: () => void
  children: ReactNode
}

function formatTimestamp(dateString: string): string {
  return new Date(dateString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCheckinTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHistoryDirection(direction: string): 'success' | 'neutral' {
  return direction === 'in' ? 'success' : 'neutral'
}

function MenuActionButton({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  badge,
  onClick,
}: MenuActionButtonProps) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start gap-(--space-3) rounded-box px-(--space-3) py-(--space-3) text-left hover:bg-base-200"
        onClick={onClick}
      >
        <span
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border',
            tone === 'warning'
              ? 'border-warning/35 bg-warning-fadded text-warning-fadded-content'
              : tone === 'info'
                ? 'border-info/35 bg-info-fadded text-info-fadded-content'
                : 'border-base-300 bg-base-200 text-base-content/70'
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-(--space-2)">
            <span className="text-sm leading-5 font-semibold text-base-content">{title}</span>
            {badge}
          </span>
          <span className="mt-1 block text-xs leading-5 text-base-content/60">{description}</span>
        </span>
      </button>
    </li>
  )
}

function ActionViewShell({
  icon: Icon,
  title,
  description,
  summary,
  onBack,
  onClose,
  children,
}: ActionViewShellProps) {
  return (
    <>
      <div className="border-b border-base-300 px-(--space-4) py-(--space-3)">
        <div className="flex items-start justify-between gap-(--space-3)">
          <div className="flex min-w-0 items-start gap-(--space-2)">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square mt-0.5 shrink-0"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to action menu</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-(--space-2)">
                <Icon className="size-4.5 shrink-0 text-primary" />
                <h3 className="truncate font-display text-base font-semibold text-base-content">
                  {title}
                </h3>
              </div>
              <p className="mt-1 text-sm leading-5 text-base-content/60">{description}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square shrink-0"
            onClick={onClose}
          >
            <X className="size-4" />
            <span className="sr-only">Close member actions</span>
          </button>
        </div>
        <div className="mt-(--space-3) flex flex-wrap gap-(--space-2)">{summary}</div>
      </div>
      <div className="grid gap-(--space-3) px-(--space-4) py-(--space-4)">{children}</div>
    </>
  )
}

export function MemberActionPanel({
  className,
  open,
  onOpenChange,
  person,
  view,
  onViewChange,
}: MemberActionPanelProps) {
  const signedInMember = useAuthStore((state) => state.member)
  const { data: currentDds } = useCurrentDds()
  const { data: dutyRolesData } = useDutyRoles()
  const { data: tonightDutyWatch } = useTonightDutyWatch()
  const { data: checkoutOptions } = useCheckoutOptions(person?.type === 'member' ? person.id : '')
  const manualCheckout = useManualCheckout()
  const createLiveDutyAssignment = useCreateLiveDutyAssignment()
  const clearLiveDutyAssignment = useClearLiveDutyAssignment()
  const createDwOverride = useCreateDwOverride()
  const openBuilding = useOpenBuilding()
  const historyQuery = useCheckins({
    memberId: person?.type === 'member' ? person.id : undefined,
    limit: 6,
    page: 1,
    enabled: open && person?.type === 'member' && view === 'history',
  })

  const dutyWatchRole = dutyRolesData?.data.find((role) => role.code === 'DUTY_WATCH')
  const { data: dutyPositionsData } = useDutyRolePositions(dutyWatchRole?.id ?? '')

  const [manualCheckoutReason, setManualCheckoutReason] = useState('')
  const [temporaryRoleNote, setTemporaryRoleNote] = useState('')
  const [temporaryRoleId, setTemporaryRoleId] = useState('')
  const [clearTemporaryRoleNote, setClearTemporaryRoleNote] = useState('')
  const [replacementAssignmentId, setReplacementAssignmentId] = useState('')
  const [replacementNote, setReplacementNote] = useState('')
  const [openBuildingNote, setOpenBuildingNote] = useState('')
  const [transferLockupNote, setTransferLockupNote] = useState('')
  const [transferLockupOpen, setTransferLockupOpen] = useState(false)

  const canManageActions = canEditHistoryEntries(signedInMember, getCurrentDdsEditorId(currentDds))

  const qualifiedTemporaryPositions = useMemo(
    () =>
      person?.type === 'member'
        ? getQualifiedTemporaryDutyPositions(person, dutyPositionsData?.data)
        : [],
    [dutyPositionsData?.data, person]
  )

  const tonightReplacementOptions = useMemo(
    () => (person?.type === 'member' ? getTonightReplacementOptions(person, tonightDutyWatch) : []),
    [person, tonightDutyWatch]
  )

  const selectedReplacementOption = tonightReplacementOptions.find(
    (option) => option.assignmentId === replacementAssignmentId
  )

  useEffect(() => {
    if (!person || person.type !== 'member') {
      return
    }

    setManualCheckoutReason('')
    setTemporaryRoleNote(person.liveDutyAssignment?.notes ?? '')
    setTemporaryRoleId(person.liveDutyAssignment?.dutyPositionId ?? '')
    setClearTemporaryRoleNote('')
    setReplacementAssignmentId('')
    setReplacementNote('')
    setOpenBuildingNote('')
    setTransferLockupNote('')
    setTransferLockupOpen(false)
  }, [person])

  useEffect(() => {
    if (!temporaryRoleId && qualifiedTemporaryPositions[0]) {
      setTemporaryRoleId(qualifiedTemporaryPositions[0].id)
    }
  }, [qualifiedTemporaryPositions, temporaryRoleId])

  useEffect(() => {
    if (!replacementAssignmentId && tonightReplacementOptions[0]) {
      setReplacementAssignmentId(tonightReplacementOptions[0].assignmentId)
    }
  }, [replacementAssignmentId, tonightReplacementOptions])

  if (!open || !person || person.type !== 'member') {
    return null
  }

  const memberLabel = `${person.rank ?? ''} ${person.lastName ?? person.name}`.trim()
  const memberSubLabel = [person.firstName, person.divisionCode ?? person.division]
    .filter(Boolean)
    .join(' • ')

  const displayDutyCode = getDashboardDutyPositionCode(person)
  const currentLiveAssignmentId = person.liveDutyAssignment?.id ?? null
  const canManualCheckout = person.lockupActions?.canManualCheckout ?? false
  const canOpenBuilding = person.lockupActions?.canOpenBuilding ?? false
  const holdsLockup = person.lockupActions?.holdsLockup ?? false

  const handleClose = () => {
    onViewChange('menu')
    onOpenChange(false)
  }

  const handleManualCheckout = async () => {
    if (!manualCheckoutReason.trim()) {
      toast.error('A reason is required for manual checkout')
      return
    }

    try {
      const result = await manualCheckout.mutateAsync({
        memberId: person.id,
        data: { reason: manualCheckoutReason.trim() },
      })
      toast.success(result.message)
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create manual checkout')
    }
  }

  const handleAssignTemporaryRole = async () => {
    if (!temporaryRoleId) {
      toast.error('Select a temporary role first')
      return
    }

    if (person.liveDutyAssignment?.dutyPositionId === temporaryRoleId) {
      toast.error('This temporary role is already active')
      return
    }

    try {
      const selectedRole = qualifiedTemporaryPositions.find(
        (position) => position.id === temporaryRoleId
      )
      const result = await createLiveDutyAssignment.mutateAsync({
        memberId: person.id,
        dutyPositionId: temporaryRoleId,
        notes: temporaryRoleNote.trim() ? temporaryRoleNote.trim() : null,
      })
      toast.success(
        `${memberLabel} is now covering ${selectedRole?.code ?? result.dutyPosition.code} for this check-in`
      )
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign temporary role')
    }
  }

  const handleClearTemporaryRole = async () => {
    if (!currentLiveAssignmentId) {
      return
    }

    try {
      const result = await clearLiveDutyAssignment.mutateAsync({
        assignmentId: currentLiveAssignmentId,
        data: {
          notes: clearTemporaryRoleNote.trim() ? clearTemporaryRoleNote.trim() : null,
        },
      })
      toast.success(`Cleared temporary ${result.dutyPosition.code} coverage`)
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear temporary role')
    }
  }

  const handleCreateTonightOverride = async () => {
    if (!selectedReplacementOption || !tonightDutyWatch?.operationalDate) {
      toast.error('Choose a scheduled role to replace tonight')
      return
    }

    try {
      await createDwOverride.mutateAsync({
        scheduleId: selectedReplacementOption.scheduleId,
        data: {
          nightDate: tonightDutyWatch.operationalDate,
          dutyPositionId: selectedReplacementOption.positionId,
          overrideType: 'replace',
          memberId: person.id,
          baseMemberId: selectedReplacementOption.replacingMemberId,
          notes: replacementNote.trim() ? replacementNote.trim() : null,
        },
      })
      toast.success(
        `${memberLabel} is now covering ${selectedReplacementOption.positionCode} tonight`
      )
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tonight override')
    }
  }

  const handleOpenBuilding = async () => {
    try {
      await openBuilding.mutateAsync({
        memberId: person.id,
        data: {
          note: openBuildingNote.trim() ? openBuildingNote.trim() : undefined,
        },
      })
      toast.success(`Building opened as ${memberLabel}`)
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open building')
    }
  }

  const summaryBadges = (
    <>
      <AppBadge status="info" size="sm" className="gap-1">
        <Clock3 className="size-3.5" />
        In at {formatCheckinTime(person.checkInTime)}
      </AppBadge>
      {person.scheduledDutyTonight?.dutyPosition?.code ? (
        <AppBadge status="neutral" size="sm">
          Tonight {person.scheduledDutyTonight.dutyPosition.code}
          {person.scheduledDutyTonight.source === 'night_override' ? ' override' : ''}
        </AppBadge>
      ) : (
        <AppBadge status="neutral" size="sm">
          No watch slot tonight
        </AppBadge>
      )}
      {person.liveDutyAssignment ? (
        <AppBadge status="warning" size="sm">
          Temp {person.liveDutyAssignment.dutyPosition.code}
        </AppBadge>
      ) : null}
      {holdsLockup ? (
        <AppBadge status="warning" size="sm" className="gap-1">
          <KeyRound className="size-3.5" />
          Lockup holder
        </AppBadge>
      ) : canOpenBuilding ? (
        <Chip size="sm" variant="faded" color="info">
          Can open building
        </Chip>
      ) : null}
      {!person.liveDutyAssignment && displayDutyCode ? (
        <Chip size="sm" variant="faded" color="secondary">
          Active role: {displayDutyCode}
        </Chip>
      ) : null}
    </>
  )

  const menuContent = (
    <>
      <div className="border-b border-base-300 px-(--space-4) py-(--space-3)">
        <div className="flex items-start justify-between gap-(--space-3)">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
              Member Actions
            </p>
            <h3 className="truncate font-display text-lg font-semibold text-base-content">
              {memberLabel}
            </h3>
            <p className="mt-1 text-sm text-base-content/60">
              {memberSubLabel || 'Checked in member'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square shrink-0"
            onClick={handleClose}
          >
            <X className="size-4" />
            <span className="sr-only">Close member actions</span>
          </button>
        </div>
        <div className="mt-(--space-3) flex flex-wrap gap-(--space-2)">{summaryBadges}</div>
      </div>

      <div className="grid gap-(--space-3) px-(--space-3) py-(--space-3)">
        {!canManageActions && (
          <div className="rounded-box border border-warning/35 bg-warning-fadded px-(--space-3) py-(--space-2.5) text-xs leading-5 text-warning-fadded-content">
            Operational changes require admin or active DDS access. History is still available.
          </div>
        )}

        <ul className="menu gap-1 rounded-box bg-base-100 p-0">
          <MenuActionButton
            icon={NotebookPen}
            title="Manual Check Out"
            description={
              canManualCheckout
                ? 'Record a corrective checkout when someone forgot to scan out.'
                : holdsLockup
                  ? 'Currently blocked because this member still holds lockup.'
                  : 'Review the checkout requirements and add the corrective reason.'
            }
            tone="warning"
            badge={
              canManualCheckout ? (
                <AppBadge status="warning" size="sm">
                  Ready
                </AppBadge>
              ) : undefined
            }
            onClick={() => onViewChange('manualCheckout')}
          />
          <MenuActionButton
            icon={ShieldPlus}
            title="Temporary Role"
            description={
              person.liveDutyAssignment
                ? `Active now as ${person.liveDutyAssignment.dutyPosition.code}. Update or clear live coverage.`
                : 'Assign live coverage for this check-in without changing the weekly schedule.'
            }
            tone="info"
            badge={
              person.liveDutyAssignment ? (
                <AppBadge status="warning" size="sm">
                  Active
                </AppBadge>
              ) : qualifiedTemporaryPositions.length > 0 ? (
                <AppBadge status="info" size="sm">
                  Qualified
                </AppBadge>
              ) : undefined
            }
            onClick={() => onViewChange('temporaryRole')}
          />
          <MenuActionButton
            icon={ShieldCheck}
            title="Tonight Schedule Override"
            description={
              tonightDutyWatch?.isDutyWatchNight
                ? 'Write a same-night Duty Watch replacement for the operational roster.'
                : 'Open the override card to see why tonight cannot be replaced from the dashboard.'
            }
            tone="warning"
            badge={
              tonightReplacementOptions.length > 0 ? (
                <AppBadge status="warning" size="sm">
                  {tonightReplacementOptions.length} options
                </AppBadge>
              ) : undefined
            }
            onClick={() => onViewChange('tonightOverride')}
          />
          {holdsLockup && (
            <MenuActionButton
              icon={ArrowRightLeft}
              title="Transfer Lockup"
              description="Move lockup responsibility to another qualified checked-in member."
              tone="warning"
              badge={
                <AppBadge status="warning" size="sm">
                  Holder
                </AppBadge>
              }
              onClick={() => onViewChange('transferLockup')}
            />
          )}
          {canOpenBuilding && (
            <MenuActionButton
              icon={DoorOpen}
              title="Open Building"
              description="Open the building as this member and record the opening note."
              tone="info"
              onClick={() => onViewChange('openBuilding')}
            />
          )}
          <MenuActionButton
            icon={History}
            title="Recent Check-In History"
            description="Review the latest check-in and checkout events for this member."
            onClick={() => onViewChange('history')}
          />
        </ul>
      </div>

      <div className="flex items-center justify-between gap-(--space-3) border-t border-base-300 px-(--space-4) py-(--space-3)">
        <p className="text-xs text-base-content/50">Use Close or press Esc to dismiss.</p>
        <Link href="/schedules" className="btn btn-ghost btn-xs">
          Deeper schedule edits
        </Link>
      </div>
    </>
  )

  const actionContent = (() => {
    switch (view) {
      case 'manualCheckout':
        return (
          <ActionViewShell
            icon={NotebookPen}
            title="Manual Check Out"
            description="Create a corrective checkout entry for a missed badge-out."
            summary={summaryBadges}
            onBack={() => onViewChange('menu')}
            onClose={handleClose}
          >
            {!canManualCheckout && (
              <div className="rounded-box border border-info/35 bg-info-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-info-fadded-content">
                {holdsLockup
                  ? 'This member still holds lockup. Transfer or execute lockup before checking them out.'
                  : 'Manual checkout is not currently available for this member.'}
              </div>
            )}
            <label className="fieldset">
              <legend className="fieldset-legend">Admin reason</legend>
              <textarea
                className="textarea textarea-bordered min-h-24 w-full"
                maxLength={500}
                placeholder="Explain why this corrective checkout is needed."
                value={manualCheckoutReason}
                onChange={(event) => setManualCheckoutReason(event.target.value)}
                disabled={!canManageActions || !canManualCheckout || manualCheckout.isPending}
              />
            </label>
            <div className="flex justify-end gap-(--space-2)">
              <button
                type="button"
                className="btn btn-warning btn-sm"
                disabled={
                  !canManageActions ||
                  !canManualCheckout ||
                  !manualCheckoutReason.trim() ||
                  manualCheckout.isPending
                }
                onClick={handleManualCheckout}
                data-testid={TID.dashboard.memberActions.manualCheckout(person.id)}
              >
                {manualCheckout.isPending && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Check Out Manually
              </button>
            </div>
          </ActionViewShell>
        )

      case 'temporaryRole':
        return (
          <ActionViewShell
            icon={ShieldPlus}
            title="Temporary Role"
            description="Assign or clear live coverage for the rest of this member's current check-in."
            summary={summaryBadges}
            onBack={() => onViewChange('menu')}
            onClose={handleClose}
          >
            {person.liveDutyAssignment && (
              <div className="rounded-box border border-info/35 bg-info-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-info-fadded-content">
                Currently covering {person.liveDutyAssignment.dutyPosition.code} since{' '}
                {formatTimestamp(person.liveDutyAssignment.startedAt)}.
              </div>
            )}
            {qualifiedTemporaryPositions.length === 0 ? (
              <div className="rounded-box border border-warning/35 bg-warning-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-warning-fadded-content">
                No qualified temporary Duty Watch roles are available for this member.
              </div>
            ) : (
              <>
                <label className="fieldset">
                  <legend className="fieldset-legend">Qualified role</legend>
                  <select
                    className="select select-bordered w-full"
                    value={temporaryRoleId}
                    onChange={(event) => setTemporaryRoleId(event.target.value)}
                    disabled={!canManageActions || createLiveDutyAssignment.isPending}
                  >
                    {qualifiedTemporaryPositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.code} • {position.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fieldset">
                  <legend className="fieldset-legend">Admin note</legend>
                  <textarea
                    className="textarea textarea-bordered min-h-20 w-full"
                    maxLength={500}
                    placeholder="Why is this temporary role being assigned?"
                    value={temporaryRoleNote}
                    onChange={(event) => setTemporaryRoleNote(event.target.value)}
                    disabled={!canManageActions || createLiveDutyAssignment.isPending}
                  />
                </label>
                <div className="flex justify-end gap-(--space-2)">
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    disabled={
                      !canManageActions || !temporaryRoleId || createLiveDutyAssignment.isPending
                    }
                    onClick={handleAssignTemporaryRole}
                    data-testid={TID.dashboard.memberActions.temporaryRole(person.id)}
                  >
                    {createLiveDutyAssignment.isPending && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    {person.liveDutyAssignment ? 'Switch Temporary Role' : 'Assign Temporary Role'}
                  </button>
                </div>
              </>
            )}

            {person.liveDutyAssignment && (
              <>
                <div className="divider my-0">Clear Active Role</div>
                <label className="fieldset">
                  <legend className="fieldset-legend">Clear note</legend>
                  <textarea
                    className="textarea textarea-bordered min-h-20 w-full"
                    maxLength={500}
                    placeholder="Why is this temporary role ending early?"
                    value={clearTemporaryRoleNote}
                    onChange={(event) => setClearTemporaryRoleNote(event.target.value)}
                    disabled={!canManageActions || clearLiveDutyAssignment.isPending}
                  />
                </label>
                <div className="flex justify-end gap-(--space-2)">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={!canManageActions || clearLiveDutyAssignment.isPending}
                    onClick={handleClearTemporaryRole}
                    data-testid={TID.dashboard.memberActions.clearTemporaryRole(person.id)}
                  >
                    {clearLiveDutyAssignment.isPending && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    Clear Temporary Role
                  </button>
                </div>
              </>
            )}
          </ActionViewShell>
        )

      case 'tonightOverride':
        return (
          <ActionViewShell
            icon={ShieldCheck}
            title="Tonight Schedule Override"
            description="Write a same-night Duty Watch replacement without editing the whole week."
            summary={summaryBadges}
            onBack={() => onViewChange('menu')}
            onClose={handleClose}
          >
            {!tonightDutyWatch?.isDutyWatchNight ? (
              <div className="rounded-box border border-info/35 bg-info-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-info-fadded-content">
                Tonight is not configured as a Duty Watch night.
              </div>
            ) : tonightReplacementOptions.length === 0 ? (
              <div className="rounded-box border border-warning/35 bg-warning-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-warning-fadded-content">
                No replaceable scheduled roles match this member&apos;s qualifications tonight.
              </div>
            ) : (
              <>
                <label className="fieldset">
                  <legend className="fieldset-legend">Replace this scheduled role</legend>
                  <select
                    className="select select-bordered w-full"
                    value={replacementAssignmentId}
                    onChange={(event) => setReplacementAssignmentId(event.target.value)}
                    disabled={!canManageActions || createDwOverride.isPending}
                  >
                    {tonightReplacementOptions.map((option) => (
                      <option key={option.assignmentId} value={option.assignmentId}>
                        {option.positionCode} • replacing {option.replacingMemberLabel}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedReplacementOption && (
                  <div className="rounded-box border border-base-300 bg-base-200 px-(--space-3) py-(--space-3) text-sm leading-5 text-base-content/70">
                    This will replace {selectedReplacementOption.replacingMemberLabel} on{' '}
                    {selectedReplacementOption.positionCode} for operational date{' '}
                    {tonightDutyWatch.operationalDate}.
                  </div>
                )}
                <label className="fieldset">
                  <legend className="fieldset-legend">Admin note</legend>
                  <textarea
                    className="textarea textarea-bordered min-h-20 w-full"
                    maxLength={500}
                    placeholder="Why is this schedule override being created?"
                    value={replacementNote}
                    onChange={(event) => setReplacementNote(event.target.value)}
                    disabled={!canManageActions || createDwOverride.isPending}
                  />
                </label>
              </>
            )}
            <div className="flex items-center justify-between gap-(--space-2)">
              <Link href="/schedules" className="btn btn-ghost btn-sm">
                Open schedules
              </Link>
              <button
                type="button"
                className="btn btn-warning btn-sm"
                disabled={
                  !canManageActions || !selectedReplacementOption || createDwOverride.isPending
                }
                onClick={handleCreateTonightOverride}
                data-testid={TID.dashboard.memberActions.tonightOverride(person.id)}
              >
                {createDwOverride.isPending && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Create Override
              </button>
            </div>
          </ActionViewShell>
        )

      case 'transferLockup':
        return (
          <ActionViewShell
            icon={ArrowRightLeft}
            title="Transfer Lockup"
            description="Hand lockup responsibility to another qualified checked-in member."
            summary={summaryBadges}
            onBack={() => onViewChange('menu')}
            onClose={handleClose}
          >
            {!holdsLockup ? (
              <div className="rounded-box border border-info/35 bg-info-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-info-fadded-content">
                This member is not currently holding lockup responsibility.
              </div>
            ) : (
              <>
                <div className="rounded-box border border-warning/35 bg-warning-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-warning-fadded-content">
                  {memberLabel} currently holds lockup. Transfer it before attempting a checkout.
                </div>
                {(checkoutOptions?.eligibleRecipients?.length ?? 0) === 0 && (
                  <div className="rounded-box border border-warning/35 bg-warning-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-warning-fadded-content">
                    No qualified checked-in recipients are currently available to receive lockup.
                  </div>
                )}
                <label className="fieldset">
                  <legend className="fieldset-legend">Transfer note</legend>
                  <textarea
                    className="textarea textarea-bordered min-h-20 w-full"
                    maxLength={500}
                    placeholder="Why is lockup being transferred?"
                    value={transferLockupNote}
                    onChange={(event) => setTransferLockupNote(event.target.value)}
                    disabled={!canManageActions}
                  />
                </label>
                <div className="flex justify-end gap-(--space-2)">
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    disabled={
                      !canManageActions || (checkoutOptions?.eligibleRecipients?.length ?? 0) === 0
                    }
                    onClick={() => setTransferLockupOpen(true)}
                    data-testid={TID.dashboard.memberActions.transferLockup(person.id)}
                  >
                    <ArrowRightLeft className="size-4" />
                    Transfer Lockup
                  </button>
                </div>
              </>
            )}
          </ActionViewShell>
        )

      case 'openBuilding':
        return (
          <ActionViewShell
            icon={DoorOpen}
            title="Open Building"
            description="Open the building as this member and record the operational context."
            summary={summaryBadges}
            onBack={() => onViewChange('menu')}
            onClose={handleClose}
          >
            {!canOpenBuilding ? (
              <div className="rounded-box border border-info/35 bg-info-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-info-fadded-content">
                This member cannot open the building right now.
              </div>
            ) : (
              <>
                <div className="rounded-box border border-info/35 bg-info-fadded px-(--space-3) py-(--space-3) text-sm leading-5 text-info-fadded-content">
                  This member is checked in, qualified, and currently eligible to open the building.
                </div>
                <label className="fieldset">
                  <legend className="fieldset-legend">Opening note</legend>
                  <textarea
                    className="textarea textarea-bordered min-h-20 w-full"
                    maxLength={500}
                    placeholder="Add any context for opening the building."
                    value={openBuildingNote}
                    onChange={(event) => setOpenBuildingNote(event.target.value)}
                    disabled={!canManageActions || openBuilding.isPending}
                  />
                </label>
                <div className="flex justify-end gap-(--space-2)">
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    disabled={!canManageActions || openBuilding.isPending}
                    onClick={handleOpenBuilding}
                    data-testid={TID.dashboard.memberActions.openBuilding(person.id)}
                  >
                    {openBuilding.isPending && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                    Open Building
                  </button>
                </div>
              </>
            )}
          </ActionViewShell>
        )

      case 'history':
        return (
          <ActionViewShell
            icon={History}
            title="Recent Check-In History"
            description="Review this member's latest check-in and checkout events."
            summary={summaryBadges}
            onBack={() => onViewChange('menu')}
            onClose={handleClose}
          >
            {historyQuery.isLoading ? (
              <div className="flex items-center gap-(--space-2) text-sm text-base-content/60">
                <span className="loading loading-spinner loading-sm" />
                Loading recent history…
              </div>
            ) : historyQuery.data?.checkins?.length ? (
              <div className="grid gap-(--space-2)">
                {historyQuery.data.checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="flex flex-wrap items-center justify-between gap-(--space-3) rounded-box border border-base-300 bg-base-100 px-(--space-3) py-(--space-3)"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-base-content">
                        {formatTimestamp(checkin.timestamp)}
                      </p>
                      <p className="text-sm text-base-content/60">
                        {checkin.kioskId} • {checkin.method ?? 'badge'}
                      </p>
                    </div>
                    <AppBadge status={formatHistoryDirection(checkin.direction)} size="sm">
                      {checkin.direction === 'in' ? 'Checked In' : 'Checked Out'}
                    </AppBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-base-content/60">
                No recent history found for this member.
              </div>
            )}
          </ActionViewShell>
        )

      case 'menu':
      default:
        return menuContent
    }
  })()

  return (
    <>
      <aside
        className={cn(
          'card card-sm min-h-0 overflow-hidden border border-base-300 bg-base-100 text-base-content shadow-xl',
          className
        )}
        data-testid={TID.dashboard.memberActions.panel(person.id)}
      >
        <div className="card-body min-h-0 gap-0 overflow-y-auto p-0">{actionContent}</div>
      </aside>

      {holdsLockup && (
        <TransferLockupScanModal
          open={transferLockupOpen}
          onOpenChange={setTransferLockupOpen}
          currentHolder={{
            id: person.id,
            rank: person.rank ?? '',
            firstName: person.firstName ?? '',
            lastName: person.lastName ?? person.name,
          }}
          eligibleRecipients={checkoutOptions?.eligibleRecipients ?? []}
          notes={transferLockupNote}
          onComplete={handleClose}
        />
      )}
    </>
  )
}
