'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppBadge } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { useDdsStatus, useSetTodayDds } from '@/hooks/use-dds'
import { useLockupStatus } from '@/hooks/use-lockup'
import { useLockupEligibleMembers } from '@/hooks/use-qualifications'
import { useCurrentDds } from '@/hooks/use-schedules'

interface SetTodayDdsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DisplayMember {
  id: string
  rank: string
  firstName: string
  lastName: string
  serviceNumber?: string | null
}

type RequirementState = 'met' | 'pending' | 'missing'

function formatMemberName(member: DisplayMember | null): string {
  if (!member) return 'None assigned'
  return `${member.rank} ${member.firstName} ${member.lastName}`
}

function buildAssignmentMember(
  assignment: {
    memberId: string
    member: {
      rank: string
      firstName: string
      lastName: string
    }
  } | null,
  serviceNumber?: string | null
): DisplayMember | null {
  if (!assignment) return null

  return {
    id: assignment.memberId,
    rank: assignment.member.rank,
    firstName: assignment.member.firstName,
    lastName: assignment.member.lastName,
    serviceNumber: serviceNumber ?? null,
  }
}

function RequirementItem({
  label,
  detail,
  state,
}: {
  label: string
  detail?: string
  state: RequirementState
}) {
  const stateConfig = {
    met: {
      icon: CheckCircle2,
      iconClass: 'text-success',
      detailClass: 'text-base-content/60',
      stateText: 'Met',
      stateClass: 'text-success',
      iconSurfaceClass: 'bg-success-fadded/70 text-success-fadded-content',
    },
    pending: {
      icon: CircleAlert,
      iconClass: 'text-warning',
      detailClass: 'text-base-content/60',
      stateText: 'Action Needed',
      stateClass: 'text-warning',
      iconSurfaceClass: 'bg-warning-fadded/80 text-warning-fadded-content',
    },
    missing: {
      icon: CircleDashed,
      iconClass: 'text-error',
      detailClass: 'text-base-content/60',
      stateText: 'Not Met',
      stateClass: 'text-error',
      iconSurfaceClass: 'bg-error-fadded/70 text-error-fadded-content',
    },
  } as const

  const config = stateConfig[state]
  const Icon = config.icon

  return (
    <li className="list-row items-start px-3 py-2">
      <div
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-box ${config.iconSurfaceClass}`}
      >
        <Icon className={`h-4 w-4 ${config.iconClass}`} />
      </div>
      <div className="list-col-grow min-w-0">
        <p className="text-sm font-medium text-base-content">{label}</p>
        {detail && <p className={`mt-0.5 text-xs ${config.detailClass}`}>{detail}</p>}
      </div>
      <div
        className={`pt-0.5 text-[11px] font-semibold uppercase tracking-wide ${config.stateClass}`}
      >
        {config.stateText}
      </div>
    </li>
  )
}

export function SetTodayDdsModal({ open, onOpenChange }: SetTodayDdsModalProps) {
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showMemberPicker, setShowMemberPicker] = useState(false)

  const { data: ddsStatus } = useDdsStatus()
  const { data: scheduledDds } = useCurrentDds()
  const { data: lockupStatus } = useLockupStatus()
  const { data: eligibleMembers, isLoading: loadingEligible } = useLockupEligibleMembers({
    checkedInOnly: true,
  })
  const setTodayDds = useSetTodayDds()

  const candidatePool = useMemo(
    () =>
      eligibleMembers?.data.filter((member) =>
        member.qualifications.some((qualification) => qualification.code === 'DDS')
      ) ?? [],
    [eligibleMembers]
  )

  const candidates = useMemo(() => {
    if (!search.trim()) return candidatePool

    const query = search.toLowerCase()
    return candidatePool.filter(
      (member) =>
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        member.rank.toLowerCase().includes(query) ||
        member.serviceNumber.toLowerCase().includes(query)
    )
  }, [candidatePool, search])

  const currentAssignment = ddsStatus?.assignment ?? null
  const currentHolder = lockupStatus?.currentHolder ?? null
  const hasActiveDds = currentAssignment?.status === 'active'
  const hasPendingDds = currentAssignment?.status === 'pending'
  const pendingCandidate = hasPendingDds
    ? candidatePool.find((member) => member.id === currentAssignment?.memberId)
    : null
  const defaultPendingMemberId =
    hasPendingDds &&
    currentAssignment &&
    candidatePool.some((member) => member.id === currentAssignment.memberId)
      ? currentAssignment.memberId
      : null
  const effectiveSelectedMemberId = selectedMemberId ?? defaultPendingMemberId
  const currentAssignmentMember = buildAssignmentMember(
    currentAssignment,
    pendingCandidate?.serviceNumber ?? null
  )
  const selectedCandidate =
    candidatePool.find((member) => member.id === effectiveSelectedMemberId) ?? null
  const selectedMember =
    selectedCandidate ??
    (currentAssignmentMember?.id === effectiveSelectedMemberId ? currentAssignmentMember : null)

  const isAlreadyCurrentDds =
    effectiveSelectedMemberId !== null &&
    currentAssignment?.memberId === effectiveSelectedMemberId &&
    currentAssignment.status === 'active'
  const isPendingCurrentDds =
    effectiveSelectedMemberId !== null &&
    currentAssignment?.memberId === effectiveSelectedMemberId &&
    currentAssignment.status === 'pending'
  const isOverrideSelection =
    hasPendingDds &&
    effectiveSelectedMemberId !== null &&
    currentAssignment?.memberId !== effectiveSelectedMemberId
  const shouldShowPicker = showMemberPicker || !hasPendingDds

  const handleClose = () => {
    setSearch('')
    setSelectedMemberId(null)
    setNote('')
    setShowMemberPicker(false)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!effectiveSelectedMemberId || isAlreadyCurrentDds) return
    setTodayDds.mutate(
      {
        memberId: effectiveSelectedMemberId,
        notes: note.trim() ? note.trim() : undefined,
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  const title = hasPendingDds
    ? "Resolve Today's DDS"
    : hasActiveDds
      ? "Replace Today's DDS"
      : "Set Today's DDS"
  const description = hasPendingDds
    ? 'The scheduled DDS is checked in and waiting for activation.'
    : hasActiveDds
      ? 'Replace the live DDS for today without changing the weekly schedule.'
      : 'Assign a checked-in DDS-qualified member for today without changing the weekly schedule.'
  const actionLabel = isPendingCurrentDds
    ? 'Confirm DDS'
    : isOverrideSelection
      ? 'Assign Different DDS'
      : hasActiveDds
        ? "Replace Today's DDS"
        : "Assign Today's DDS"
  const actionClass = isPendingCurrentDds ? 'btn btn-success' : 'btn btn-primary'
  const statusCardTitle = hasPendingDds ? 'Recommended Resolution' : "Today's DDS Status"
  const statusCardDescription = hasPendingDds
    ? 'Confirm this member or use an override if the scheduled DDS cannot take the duty.'
    : hasActiveDds
      ? 'A live DDS is already active. Choose a different member only if an override is required.'
      : 'No live DDS is active right now. Assign a checked-in DDS-qualified member to cover today.'
  const pickerHeading = hasPendingDds ? 'Choose Someone Else' : "Choose Today's DDS"
  const pickerDescription = hasPendingDds
    ? 'Only use this override path if the scheduled DDS cannot take the duty.'
    : 'Select a checked-in DDS-qualified member to cover today.'
  const noteHelper = isOverrideSelection
    ? 'Recommended when overriding the scheduled DDS.'
    : 'Optional admin note for the duty log.'
  const requirementItems: Array<{
    label: string
    detail?: string
    state: RequirementState
  }> = [
    {
      label: 'Scheduled DDS identified',
      detail: scheduledDds?.dds
        ? formatMemberName(scheduledDds.dds.member)
        : 'No scheduled DDS found',
      state: scheduledDds?.dds ? 'met' : 'missing',
    },
    {
      label: 'Member checked in',
      detail: selectedMember
        ? `${formatMemberName(selectedMember)} is currently present.`
        : 'No checked-in DDS selected.',
      state: selectedMember ? 'met' : 'missing',
    },
    {
      label: 'Building open',
      detail:
        lockupStatus?.buildingStatus === 'secured'
          ? 'Building is still secured.'
          : 'Building is open for today.',
      state: lockupStatus?.buildingStatus === 'secured' ? 'missing' : 'met',
    },
    {
      label: 'Lockup holder assigned',
      detail: currentHolder ? formatMemberName(currentHolder) : 'No lockup holder assigned.',
      state: currentHolder ? 'met' : 'missing',
    },
    {
      label: 'DDS confirmed for today',
      detail: hasPendingDds
        ? 'Admin confirmation is still required.'
        : hasActiveDds
          ? 'Live DDS is already active.'
          : 'DDS still needs to be assigned.',
      state: hasPendingDds ? 'pending' : hasActiveDds ? 'met' : 'missing',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent size="full" className="max-w-4xl gap-4">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <AppCard status={hasPendingDds ? 'warning' : hasActiveDds ? 'info' : 'neutral'}>
            <AppCardHeader className="gap-1 px-4 py-3">
              <AppCardTitle className="text-base-content">{statusCardTitle}</AppCardTitle>
              <AppCardDescription>{statusCardDescription}</AppCardDescription>
            </AppCardHeader>
            <AppCardContent className="grid gap-3 px-4 pb-4 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="rounded-box border border-base-300 bg-base-100 p-3">
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  {hasPendingDds
                    ? 'Pending DDS'
                    : selectedMember
                      ? 'Selected Member'
                      : 'Current Live DDS'}
                </p>
                <div className="mt-2 flex items-start gap-2.5">
                  <UserCheck className="mt-0.5 h-5 w-5 text-base-content/70" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight">
                      {formatMemberName(selectedMember ?? currentAssignmentMember)}
                    </p>
                    {(selectedMember?.serviceNumber ?? currentAssignmentMember?.serviceNumber) && (
                      <p className="mt-0.5 font-mono text-sm text-base-content/60">
                        {selectedMember?.serviceNumber ?? currentAssignmentMember?.serviceNumber}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {hasPendingDds && (
                        <AppBadge status="warning" size="sm">
                          Awaiting Confirmation
                        </AppBadge>
                      )}
                      {hasActiveDds && (
                        <AppBadge status="success" size="sm">
                          Active DDS
                        </AppBadge>
                      )}
                      {isOverrideSelection && (
                        <AppBadge status="info" size="sm">
                          Override Selected
                        </AppBadge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    Activation Requirements
                  </p>
                  <p className="mt-0.5 text-sm text-base-content/70">
                    Confirm only when all required conditions are satisfied.
                  </p>
                </div>
                <ul className="list rounded-box border border-base-300 bg-base-100">
                  {requirementItems.map((item) => (
                    <RequirementItem
                      key={item.label}
                      label={item.label}
                      detail={item.detail}
                      state={item.state}
                    />
                  ))}
                </ul>
              </div>
            </AppCardContent>
          </AppCard>

          {shouldShowPicker ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
              <div className="space-y-3 rounded-box border border-base-300 bg-base-100 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{pickerHeading}</p>
                    <p className="text-sm text-base-content/70">{pickerDescription}</p>
                  </div>
                  {hasPendingDds && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline btn-neutral"
                      onClick={() => setShowMemberPicker(false)}
                    >
                      <ChevronDown className="h-4 w-4 rotate-180" />
                      Hide Override
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/50" />
                  <input
                    type="text"
                    className="input input-bordered w-full pl-10"
                    placeholder="Search checked-in DDS-qualified members..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="max-h-56 overflow-y-auto rounded-box border border-base-300 bg-base-100">
                  {loadingEligible ? (
                    <div className="flex justify-center p-6">
                      <span
                        className="loading loading-spinner loading-md"
                        role="status"
                        aria-label="Loading"
                      ></span>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="p-4 text-sm text-base-content/70">
                      No checked-in DDS-qualified members are available right now.
                    </div>
                  ) : (
                    candidates.map((member) => {
                      const isSelected = effectiveSelectedMemberId === member.id
                      const isCurrent = currentAssignment?.memberId === member.id

                      return (
                        <button
                          key={member.id}
                          type="button"
                          className={`flex w-full items-start justify-between gap-4 border-b border-base-300 px-4 py-3 text-left transition-colors last:border-b-0 ${
                            isSelected
                              ? 'bg-primary-fadded text-primary-fadded-content'
                              : 'hover:bg-base-200'
                          }`}
                          onClick={() => setSelectedMemberId(member.id)}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {member.rank} {member.firstName} {member.lastName}
                            </p>
                            <p className="font-mono text-sm opacity-75">{member.serviceNumber}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {isCurrent && (
                              <AppBadge status={hasPendingDds ? 'warning' : 'info'} size="sm">
                                {hasPendingDds ? 'PENDING NOW' : 'LIVE DDS'}
                              </AppBadge>
                            )}
                            <AppBadge status="success" size="sm">
                              CHECKED IN
                            </AppBadge>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-3">
                <label
                  className="text-sm font-medium text-base-content/80"
                  htmlFor="dds-admin-note"
                >
                  Note (optional)
                </label>
                <p className="text-xs text-base-content/60">{noteHelper}</p>
                <input
                  id="dds-admin-note"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., scheduled DDS called in sick"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
              <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-3">
                {hasPendingDds ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline btn-neutral justify-start"
                    onClick={() => setShowMemberPicker(true)}
                  >
                    <ChevronDown className="h-4 w-4" />
                    Choose Someone Else
                  </button>
                ) : (
                  <div>
                    <p className="font-semibold">{pickerHeading}</p>
                    <p className="text-sm text-base-content/70">{pickerDescription}</p>
                  </div>
                )}

                {hasPendingDds && (
                  <p className="text-xs text-base-content/60">
                    Use the override path only when the scheduled DDS cannot take the duty.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-base-content/80"
                  htmlFor="dds-admin-note"
                >
                  Note (optional)
                </label>
                <p className="text-xs text-base-content/60">{noteHelper}</p>
                <input
                  id="dds-admin-note"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., scheduled DDS called in sick"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>
          )}

          {setTodayDds.isError && (
            <div role="alert" className="alert alert-error alert-soft">
              <span>{setTodayDds.error.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <button className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className={actionClass}
            disabled={!effectiveSelectedMemberId || isAlreadyCurrentDds || setTodayDds.isPending}
            onClick={handleSubmit}
          >
            {setTodayDds.isPending && <ButtonSpinner />}
            {actionLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
