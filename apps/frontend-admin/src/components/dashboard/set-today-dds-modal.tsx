'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  ArrowRightLeft,
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
import { useDdsStatus, useSetTodayDds, useTransferDds } from '@/hooks/use-dds'
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

function formatOperationalDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return dateString

  return new Date(year, month - 1, day).toLocaleDateString()
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
  const transferDds = useTransferDds()

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
  const handover = ddsStatus?.handover
  const isHandoverPending = handover?.isPending ?? false
  const currentHolder = lockupStatus?.currentHolder ?? null
  const hasActiveDds = currentAssignment?.status === 'active'
  const hasPendingDds = currentAssignment?.status === 'pending'
  const isTransferMode = isHandoverPending || hasActiveDds
  const pendingCandidate = hasPendingDds
    ? candidatePool.find((member) => member.id === currentAssignment?.memberId)
    : null
  const outgoingHandoverMember = handover?.outgoingDds
    ? {
        id: handover.outgoingDds.id,
        rank: handover.outgoingDds.rank,
        firstName: handover.outgoingDds.firstName,
        lastName: handover.outgoingDds.lastName,
        serviceNumber: null,
      }
    : null
  const incomingHandoverMember = handover?.incomingDds
    ? {
        id: handover.incomingDds.id,
        rank: handover.incomingDds.rank,
        firstName: handover.incomingDds.firstName,
        lastName: handover.incomingDds.lastName,
        serviceNumber: null,
      }
    : null
  const defaultPendingMemberId =
    hasPendingDds &&
    currentAssignment &&
    candidatePool.some((member) => member.id === currentAssignment.memberId)
      ? currentAssignment.memberId
      : null
  const defaultTransferMemberId =
    isTransferMode &&
    incomingHandoverMember &&
    candidatePool.some((member) => member.id === incomingHandoverMember.id)
      ? incomingHandoverMember.id
      : null
  const effectiveSelectedMemberId =
    selectedMemberId ?? defaultTransferMemberId ?? defaultPendingMemberId
  const recommendedTransferMemberId = incomingHandoverMember?.id ?? null
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
    currentAssignment?.status === 'active'
  const isPendingCurrentDds =
    effectiveSelectedMemberId !== null &&
    currentAssignment?.memberId === effectiveSelectedMemberId &&
    currentAssignment?.status === 'pending'
  const isOverrideSelection =
    effectiveSelectedMemberId !== null &&
    (isHandoverPending
      ? recommendedTransferMemberId !== null &&
        effectiveSelectedMemberId !== recommendedTransferMemberId
      : (hasPendingDds || isTransferMode) &&
        currentAssignment?.memberId !== effectiveSelectedMemberId)
  const shouldShowPicker = showMemberPicker || !hasPendingDds
  const selectedScheduledMember =
    incomingHandoverMember ??
    (scheduledDds?.dds
      ? {
          id: scheduledDds.dds.member.id,
          rank: scheduledDds.dds.member.rank,
          firstName: scheduledDds.dds.member.firstName,
          lastName: scheduledDds.dds.member.lastName,
          serviceNumber: null,
        }
      : null)
  const summaryMember = isHandoverPending
    ? (selectedMember ?? selectedScheduledMember ?? currentAssignmentMember)
    : (selectedMember ?? currentAssignmentMember)
  const activeMutation = isTransferMode ? transferDds : setTodayDds

  const handleClose = () => {
    setSearch('')
    setSelectedMemberId(null)
    setNote('')
    setShowMemberPicker(false)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!effectiveSelectedMemberId || isAlreadyCurrentDds) return
    const payloadNotes = note.trim() ? note.trim() : undefined

    if (isTransferMode) {
      transferDds.mutate(
        {
          toMemberId: effectiveSelectedMemberId,
          notes: payloadNotes,
        },
        {
          onSuccess: () => {
            handleClose()
          },
        }
      )
      return
    }

    setTodayDds.mutate(
      {
        memberId: effectiveSelectedMemberId,
        notes: payloadNotes,
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  const title = isHandoverPending
    ? 'Complete Weekly DDS Handover'
    : hasPendingDds
      ? "Resolve Today's DDS"
      : hasActiveDds
        ? "Transfer Today's DDS"
        : "Set Today's DDS"
  const description = isHandoverPending
    ? 'The outgoing DDS is still live. Transfer DDS to the incoming scheduled member or assign a replacement to complete the weekly handover.'
    : hasPendingDds
      ? 'The scheduled DDS is checked in and waiting for activation.'
      : hasActiveDds
        ? 'Transfer the live DDS for today without changing the weekly schedule.'
        : 'Assign a checked-in DDS-qualified member for today without changing the weekly schedule.'
  const actionLabel = isHandoverPending
    ? effectiveSelectedMemberId === incomingHandoverMember?.id
      ? 'Complete Handover'
      : 'Transfer DDS'
    : isPendingCurrentDds
      ? 'Confirm DDS'
      : isOverrideSelection
        ? 'Assign Different DDS'
        : hasActiveDds
          ? "Transfer Today's DDS"
          : "Assign Today's DDS"
  const actionClass = isPendingCurrentDds ? 'btn btn-success' : 'btn btn-primary'
  const statusCardTitle = isHandoverPending
    ? 'Weekly Handover Status'
    : hasPendingDds
      ? 'Recommended Resolution'
      : "Today's DDS Status"
  const statusCardDescription = isHandoverPending
    ? 'The outgoing DDS stays live until you record a transfer. The incoming scheduled DDS is the recommended handover target.'
    : hasPendingDds
      ? 'Confirm this member or use an override if the scheduled DDS cannot take the duty.'
      : hasActiveDds
        ? 'A live DDS is already active. Choose a different member only if an override is required.'
        : 'No live DDS is active right now. Assign a checked-in DDS-qualified member to cover today.'
  const pickerHeading = isTransferMode
    ? 'Choose Transfer Target'
    : hasPendingDds
      ? 'Choose Someone Else'
      : "Choose Today's DDS"
  const pickerDescription = isHandoverPending
    ? 'The incoming scheduled DDS is recommended. Choose someone else only when operations require an override.'
    : hasActiveDds
      ? 'Select a checked-in DDS-qualified member to receive today’s live DDS responsibility.'
      : hasPendingDds
        ? 'Only use this override path if the scheduled DDS cannot take the duty.'
        : 'Select a checked-in DDS-qualified member to cover today.'
  const noteHelper = isHandoverPending
    ? 'Recommended when documenting the weekly DDS handover or an override.'
    : isOverrideSelection
      ? 'Recommended when overriding the scheduled DDS.'
      : 'Optional admin note for the duty log.'
  const requirementItems: Array<{
    label: string
    detail?: string
    state: RequirementState
  }> = isHandoverPending
    ? [
        {
          label: 'Outgoing DDS is still live',
          detail: outgoingHandoverMember
            ? `${formatMemberName(outgoingHandoverMember)} remains responsible until transfer is recorded.`
            : 'Outgoing DDS could not be resolved.',
          state: outgoingHandoverMember ? 'met' : 'missing',
        },
        {
          label: 'Incoming scheduled DDS identified',
          detail: selectedScheduledMember
            ? formatMemberName(selectedScheduledMember)
            : 'No incoming scheduled DDS found.',
          state: selectedScheduledMember ? 'met' : 'missing',
        },
        {
          label: 'Transfer target checked in',
          detail: selectedMember
            ? `${formatMemberName(selectedMember)} is currently present.`
            : 'Select a checked-in DDS-qualified member to receive the handover.',
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
          label: 'Weekly handover completed',
          detail: 'A DDS transfer must be recorded before the incoming week takes over.',
          state: 'pending',
        },
      ]
    : [
        {
          label: 'Scheduled DDS identified',
          detail: selectedScheduledMember
            ? formatMemberName(selectedScheduledMember)
            : 'No scheduled DDS found',
          state: selectedScheduledMember ? 'met' : 'missing',
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
          {isHandoverPending && (
            <div
              role="alert"
              className="alert alert-soft border border-warning/30 bg-warning-fadded text-base-content"
            >
              <ArrowRightLeft className="h-5 w-5 text-warning" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AppBadge status="warning" size="sm">
                    Handover Pending
                  </AppBadge>
                  {handover?.firstOperationalDay && (
                    <AppBadge status="info" size="sm">
                      Since {formatOperationalDate(handover.firstOperationalDay)}
                    </AppBadge>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">
                  {outgoingHandoverMember
                    ? formatMemberName(outgoingHandoverMember)
                    : 'Outgoing DDS'}{' '}
                  is still the live DDS. Transfer responsibility to{' '}
                  {selectedScheduledMember
                    ? formatMemberName(selectedScheduledMember)
                    : 'the incoming scheduled DDS'}{' '}
                  to complete the weekly handover.
                </p>
              </div>
            </div>
          )}

          <AppCard status={hasPendingDds ? 'warning' : hasActiveDds ? 'info' : 'neutral'}>
            <AppCardHeader className="gap-1 px-4 py-3">
              <AppCardTitle className="text-base-content">{statusCardTitle}</AppCardTitle>
              <AppCardDescription>{statusCardDescription}</AppCardDescription>
            </AppCardHeader>
            <AppCardContent className="grid gap-3 px-4 pb-4 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="rounded-box border border-base-300 bg-base-100 p-3">
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  {isHandoverPending
                    ? 'Transfer Target'
                    : hasPendingDds
                      ? 'Pending DDS'
                      : selectedMember
                        ? 'Selected Member'
                        : 'Current Live DDS'}
                </p>
                <div className="mt-2 flex items-start gap-2.5">
                  <UserCheck className="mt-0.5 h-5 w-5 text-base-content/70" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight">
                      {formatMemberName(summaryMember)}
                    </p>
                    {(summaryMember?.serviceNumber ?? null) && (
                      <p className="mt-0.5 font-mono text-sm text-base-content/60">
                        {summaryMember?.serviceNumber}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isHandoverPending && (
                        <>
                          <AppBadge status="warning" size="sm">
                            OUTGOING DDS LIVE
                          </AppBadge>
                          {selectedScheduledMember && (
                            <AppBadge status="info" size="sm">
                              INCOMING SCHEDULED DDS
                            </AppBadge>
                          )}
                        </>
                      )}
                      {hasPendingDds && (
                        <AppBadge status="warning" size="sm">
                          Awaiting Confirmation
                        </AppBadge>
                      )}
                      {hasActiveDds && !isHandoverPending && (
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
                <label className="input input-bordered w-full" htmlFor="dds-admin-note">
                  <span className="label">Note (optional)</span>
                  <input
                    id="dds-admin-note"
                    type="text"
                    className="grow"
                    placeholder="e.g., scheduled DDS called in sick"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <p className="text-xs text-base-content/60">{noteHelper}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
              <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-3">
                {hasPendingDds || isTransferMode ? (
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

                {(hasPendingDds || isTransferMode) && (
                  <p className="text-xs text-base-content/60">
                    {isHandoverPending
                      ? 'Use the override path only when the incoming scheduled DDS cannot take over.'
                      : 'Use the override path only when the scheduled DDS cannot take the duty.'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="input input-bordered w-full" htmlFor="dds-admin-note">
                  <span className="label">Note (optional)</span>
                  <input
                    id="dds-admin-note"
                    type="text"
                    className="grow"
                    placeholder="e.g., scheduled DDS called in sick"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <p className="text-xs text-base-content/60">{noteHelper}</p>
              </div>
            </div>
          )}

          {activeMutation.isError && (
            <div role="alert" className="alert alert-error alert-soft">
              <span>{activeMutation.error.message}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <button className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className={actionClass}
            disabled={!effectiveSelectedMemberId || isAlreadyCurrentDds || activeMutation.isPending}
            onClick={handleSubmit}
          >
            {activeMutation.isPending && <ButtonSpinner />}
            {actionLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
