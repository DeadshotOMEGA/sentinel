'use client'

import { useMemo, useState } from 'react'
import { ArrowRightLeft, CircleAlert, Search, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppAlert } from '@/components/ui/AppAlert'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import { AppCard, AppCardContent } from '@/components/ui/AppCard'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { useDdsStatus, useSetTodayDds, useTransferDds } from '@/hooks/use-dds'
import { useLockupStatus } from '@/hooks/use-lockup'
import { useLockupEligibleMembers } from '@/hooks/use-qualifications'
import { useCurrentDds } from '@/hooks/use-schedules'
import {
  buildSetTodayDdsModalPresentation,
  type DisplayMember,
  type RequirementCheck,
} from './set-today-dds-modal.logic'

interface SetTodayDdsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

function checkStateToStatus(check: RequirementCheck): AppBadgeStatus {
  if (check.state === 'met') return 'success'
  if (check.state === 'pending') return 'warning'
  return 'error'
}

function checkStateToLabel(check: RequirementCheck): string {
  if (check.state === 'met') return 'Met'
  if (check.state === 'pending') return 'Pending'
  return 'Missing'
}

function getBlockerCardCopy(blocker: RequirementCheck): {
  title: string
  description: string
  tone: 'error' | 'warning'
} {
  if (blocker.id === 'no-candidates') {
    return {
      title: 'No transfer targets available',
      description: 'Ensure another DDS-qualified member is checked into the unit.',
      tone: 'error',
    }
  }

  if (blocker.id === 'target-selected') {
    return {
      title: 'No transfer target selected',
      description: 'Select the member you want to transfer DDS to from the list above.',
      tone: 'warning',
    }
  }

  if (blocker.id === 'different-from-current') {
    return {
      title: 'Choose a different transfer target',
      description: 'Select a member other than the current live DDS.',
      tone: 'warning',
    }
  }

  if (blocker.id === 'current-dds-missing') {
    return {
      title: 'Current live DDS unavailable',
      description: 'Refresh status and reopen this modal before transferring responsibility.',
      tone: 'error',
    }
  }

  return {
    title: blocker.label,
    description: blocker.detail,
    tone: blocker.state === 'missing' ? 'warning' : 'error',
  }
}

export function SetTodayDdsModal({ open, onOpenChange }: SetTodayDdsModalProps) {
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { data: ddsStatus } = useDdsStatus()
  const { data: scheduledDds } = useCurrentDds()
  const { data: lockupStatus } = useLockupStatus()
  const { data: eligibleMembers, isLoading: loadingEligible } = useLockupEligibleMembers({
    checkedInOnly: true,
  })
  const setTodayDds = useSetTodayDds()
  const transferDds = useTransferDds()

  const currentAssignment = ddsStatus?.assignment ?? null
  const handover = ddsStatus?.handover
  const isHandoverPending = handover?.isPending ?? false
  const currentHolder = lockupStatus?.currentHolder ?? null
  const hasActiveDds = currentAssignment?.status === 'active'
  const hasPendingDds = currentAssignment?.status === 'pending'
  const isTransferMode = isHandoverPending || hasActiveDds
  const excludedTransferTargetMemberId = isTransferMode
    ? (currentAssignment?.memberId ?? handover?.outgoingDds?.id ?? null)
    : null

  const candidatePool = useMemo(
    () =>
      eligibleMembers?.data.filter((member) => {
        const isQualified = member.qualifications.some(
          (qualification) => qualification.code === 'DDS'
        )

        if (!isQualified) return false
        if (!excludedTransferTargetMemberId) return true

        return member.id !== excludedTransferTargetMemberId
      }) ?? [],
    [eligibleMembers, excludedTransferTargetMemberId]
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

  const presentation = buildSetTodayDdsModalPresentation({
    isHandoverPending,
    hasActiveDds,
    hasPendingDds,
    isOverrideSelection,
    isPendingCurrentDds,
    isAlreadyCurrentDds,
    loadingEligible,
    candidateCount: candidatePool.length,
    handoverFirstOperationalDay: handover?.firstOperationalDay ?? null,
    selectedMember,
    currentAssignmentMember,
    selectedScheduledMember,
    outgoingHandoverMember,
    currentHolder,
    buildingStatus: lockupStatus?.buildingStatus ?? null,
  })

  const activeMutation = isTransferMode ? transferDds : setTodayDds
  const canSubmit = presentation.canSubmit && !activeMutation.isPending
  const hasNoEligibleCandidates = !loadingEligible && candidatePool.length === 0

  const handleClose = () => {
    setSearch('')
    setSelectedMemberId(null)
    setNote('')
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

  const actionClass =
    presentation.primaryActionTone === 'success' ? 'btn btn-success' : 'btn btn-primary'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent size="xl" className="gap-4">
        <DialogHeader className="mb-0">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {presentation.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <AppCard>
            <AppCardContent className="px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <div className="rounded-box border border-base-300 bg-base-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    {presentation.summaryCurrentLabel}
                  </p>
                  <p className="mt-1 text-base font-semibold text-base-content">
                    {presentation.summaryCurrentMemberName}
                  </p>
                </div>

                <div className="flex justify-center">
                  <ArrowRightLeft className="h-5 w-5 text-base-content/60" />
                </div>

                <div className="rounded-box border border-base-300 bg-base-100 p-3">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">
                    {presentation.summaryTargetLabel}
                  </p>
                  <p className="mt-1 text-base font-semibold text-base-content">
                    {presentation.summaryTargetMemberName}
                  </p>
                </div>
              </div>
            </AppCardContent>
          </AppCard>

          <AppCard>
            <AppCardContent className="space-y-3 px-4 py-3">
              <label className="text-sm text-base-content/80" htmlFor="dds-target-search">
                {presentation.pickerInstruction}
              </label>

              <div className="join w-full">
                <label className="input input-bordered join-item w-full">
                  <Search className="h-4 w-4 shrink-0 text-base-content/50" />
                  <input
                    id="dds-target-search"
                    type="text"
                    className="grow text-base-content placeholder:text-base-content/55"
                    placeholder="Search checked-in DDS-qualified members"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline btn-neutral join-item"
                  onClick={() => setSearch('')}
                  disabled={!search.trim()}
                >
                  Clear
                </button>
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
                  hasNoEligibleCandidates ? (
                    <div className="p-4 text-sm text-base-content/60">No members listed.</div>
                  ) : (
                    <div className="p-4 text-sm text-base-content/70">
                      No members match this search.
                    </div>
                  )
                ) : (
                  candidates.map((member) => {
                    const isSelected = effectiveSelectedMemberId === member.id
                    const isCurrentAssignment = currentAssignment?.memberId === member.id
                    const isRecommended =
                      isHandoverPending && recommendedTransferMemberId === member.id

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
                          {isRecommended && (
                            <AppBadge status="info" size="sm">
                              Recommended
                            </AppBadge>
                          )}
                          {hasPendingDds && isCurrentAssignment && (
                            <AppBadge status="warning" size="sm">
                              Pending DDS
                            </AppBadge>
                          )}
                          <AppBadge status="success" size="sm">
                            Checked in
                          </AppBadge>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </AppCardContent>
          </AppCard>

          {presentation.blockers.length > 0 && (
            <div className="space-y-2" role="alert" aria-live="polite">
              {presentation.blockers.map((blocker) => {
                const blockerCopy = getBlockerCardCopy(blocker)

                return (
                  <AppAlert
                    key={blocker.id}
                    tone={blockerCopy.tone}
                    heading={blockerCopy.title}
                    description={blockerCopy.description}
                    icon={
                      <CircleAlert
                        className={`h-6 w-6 shrink-0 ${
                          blockerCopy.tone === 'error' ? 'text-error' : 'text-warning'
                        }`}
                      />
                    }
                  />
                )
              })}
            </div>
          )}

          <details className="rounded-box border border-base-300 bg-base-100">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-base-content">
              Optional details ({presentation.metChecks.length} checks met)
            </summary>
            <div className="space-y-3 border-t border-base-300 px-4 py-3">
              <ul className="space-y-2">
                {presentation.detailsChecks.map((check) => (
                  <li
                    key={check.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-box border border-base-300 bg-base-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-base-content">{check.label}</p>
                      <p className="text-xs text-base-content/65">{check.detail}</p>
                    </div>
                    <AppBadge status={checkStateToStatus(check)} size="sm">
                      {checkStateToLabel(check)}
                    </AppBadge>
                  </li>
                ))}
              </ul>

              <div className="space-y-1">
                <label className="text-sm text-base-content/80" htmlFor="dds-admin-note">
                  Note (optional)
                </label>
                <input
                  id="dds-admin-note"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="e.g., scheduled DDS called in sick"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p className="text-xs text-base-content/60">{presentation.noteHelper}</p>
              </div>
            </div>
          </details>

          {activeMutation.isError && (
            <AppAlert tone="error">{activeMutation.error.message}</AppAlert>
          )}
        </div>

        <DialogFooter>
          <button className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button className={actionClass} disabled={!canSubmit} onClick={handleSubmit}>
            {activeMutation.isPending && <ButtonSpinner />}
            {presentation.primaryActionLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
