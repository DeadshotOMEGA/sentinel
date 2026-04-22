'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Search, UserCheck, UserX, X } from 'lucide-react'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { useMembers } from '@/hooks/use-members'
import { usePresentPeople } from '@/hooks/use-present-people'
import { useCheckoutOptions } from '@/hooks/use-lockup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppCard, AppCardContent } from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { LockupOptionsModal } from '@/components/lockup/lockup-options-modal'
import type { CreateCheckinInput, PresentPerson } from '@sentinel/contracts'
import { TID } from '@/lib/test-ids'
import {
  evaluateManualCheckinEligibility,
  formatManualCheckinMemberLabel,
  resolveManualCheckinTimestamp,
  type ManualCheckinDirection,
  type ManualCheckinMemberOption,
} from './manual-checkin-modal.logic'

interface ManualCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManualCheckinModal({ open, onOpenChange }: ManualCheckinModalProps) {
  // eslint-disable-next-line no-undef -- DOM type available in browser build
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [recordedAt, setRecordedAt] = useState('')
  const [direction, setDirection] = useState<ManualCheckinDirection>('in')
  const [selectedMemberInfo, setSelectedMemberInfo] = useState<{
    id: string
    rank: string
    displayName?: string
    firstName: string
    lastName: string
    serviceNumber: string
  } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const showMemberList = !selectedMemberInfo
  const {
    data: membersData,
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useMembers({
    limit: 100,
    search: showMemberList && memberSearch ? memberSearch : undefined,
  })
  const {
    data: presentPeopleData,
    isLoading: isPresenceLoading,
    isError: isPresenceError,
  } = usePresentPeople()
  const createCheckin = useCreateCheckin()
  const [showLockupOptions, setShowLockupOptions] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState<{
    memberId: string
    direction: ManualCheckinDirection
  } | null>(null)

  const selectedMemberId = selectedMemberInfo?.id ?? ''

  const { data: checkoutOptions, isLoading: loadingCheckoutOptions } = useCheckoutOptions(
    direction === 'out' && selectedMemberId ? selectedMemberId : ''
  )

  const memberName = selectedMemberInfo
    ? (selectedMemberInfo.displayName ??
      `${selectedMemberInfo.rank} ${selectedMemberInfo.firstName} ${selectedMemberInfo.lastName}`)
    : ''

  const holdsLockup = checkoutOptions?.holdsLockup ?? false
  const canCheckoutNormally = checkoutOptions?.canCheckout ?? true
  const isFormBusy = createCheckin.isPending || loadingCheckoutOptions

  const members = useMemo<ManualCheckinMemberOption[]>(
    () =>
      membersData?.members.map((member) => ({
        id: member.id,
        rank: member.rank,
        displayName: member.displayName ?? null,
        firstName: member.firstName,
        lastName: member.lastName,
        serviceNumber: member.serviceNumber,
      })) ?? [],
    [membersData?.members]
  )

  const presentMemberIds = useMemo(
    () =>
      new Set(
        (presentPeopleData?.people ?? [])
          .filter(
            (person): person is PresentPerson & { type: 'member' } => person.type === 'member'
          )
          .map((person) => person.id)
      ),
    [presentPeopleData?.people]
  )

  const eligibility = useMemo(
    () =>
      evaluateManualCheckinEligibility({
        members,
        presentMemberIds,
        direction,
        selectedMemberId: selectedMemberInfo?.id ?? null,
        selectedMember: selectedMemberInfo,
      }),
    [direction, members, presentMemberIds, selectedMemberInfo]
  )
  const timestampResolution = useMemo(() => resolveManualCheckinTimestamp(recordedAt), [recordedAt])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPendingCheckout(null)
      setMemberSearch('')
      setRecordedAt('')
      setDirection('in')
      setSelectedMemberInfo(null)
      setSubmitError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [open, direction, selectedMemberInfo])

  const onSubmit = async () => {
    if (!selectedMemberInfo || !eligibility.selectedMemberEligible) {
      return
    }

    setSubmitError(null)

    if (timestampResolution.error) {
      return
    }

    if (direction === 'out' && holdsLockup && !canCheckoutNormally) {
      setPendingCheckout({ memberId: selectedMemberInfo.id, direction })
      setShowLockupOptions(true)
      return
    }

    try {
      const checkinData: CreateCheckinInput = {
        memberId: selectedMemberInfo.id,
        direction,
        kioskId: 'ADMIN_MANUAL',
        method: 'manual',
        ...(timestampResolution.isoTimestamp
          ? { timestamp: timestampResolution.isoTimestamp }
          : {}),
      }
      await createCheckin.mutateAsync(checkinData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create manual check-in:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to record manual presence')
    }
  }

  const handleLockupComplete = async (action: 'transfer' | 'execute') => {
    if (pendingCheckout && action === 'transfer') {
      // After transfer, member still needs checkout — create the record
      try {
        const checkinData: CreateCheckinInput = {
          memberId: pendingCheckout.memberId,
          direction: pendingCheckout.direction,
          kioskId: 'ADMIN_MANUAL',
          method: 'manual',
          ...(timestampResolution.isoTimestamp
            ? { timestamp: timestampResolution.isoTimestamp }
            : {}),
        }
        await createCheckin.mutateAsync(checkinData)
      } catch (error) {
        console.error('Failed to complete checkout after lockup:', error)
        setSubmitError(
          error instanceof Error ? error.message : 'Failed to complete checkout after lockup'
        )
        return
      }
    }

    setPendingCheckout(null)
    onOpenChange(false)
  }

  const handleMemberClear = () => {
    setSelectedMemberInfo(null)
    setMemberSearch('')
    setSubmitError(null)
    window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)
  }

  const submitLabel =
    direction === 'out' && holdsLockup && !canCheckoutNormally
      ? 'Handle lockup and check out'
      : direction === 'out'
        ? 'Record check-out'
        : 'Record check-in'

  const hasSelectedMember = Boolean(selectedMemberInfo)
  const canSubmit =
    hasSelectedMember &&
    eligibility.selectedMemberEligible &&
    !timestampResolution.error &&
    !isFormBusy &&
    !(direction === 'out' && selectedMemberId && loadingCheckoutOptions)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="lg"
          className="max-h-[85vh] overflow-hidden"
          testId={TID.checkins.manualModal.dialog}
        >
          <DialogHeader className="mb-0">
            <div className="flex items-start justify-between gap-(--space-3) pr-10">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-(--space-2) font-display">
                  <ArrowRightLeft className="size-5 text-primary" />
                  Manual in/out
                </DialogTitle>
                <DialogDescription>
                  Pick a direction, then choose the member to record.
                </DialogDescription>
              </div>
              <AppBadge status="info" size="sm">
                DDS/Admin
              </AppBadge>
            </div>
          </DialogHeader>

          <div className="grid gap-(--space-4)">
            <fieldset className="grid gap-(--space-2)">
              <legend className="text-sm font-medium text-base-content">Direction</legend>
              <div
                className="grid grid-cols-2 gap-(--space-2)"
                role="radiogroup"
                aria-label="Manual direction"
              >
                <button
                  type="button"
                  className={`btn h-auto justify-start px-(--space-3) py-(--space-3) normal-case ${direction === 'in' ? 'btn-success' : 'btn-outline border-base-300 bg-base-100 text-base-content'}`}
                  onClick={() => {
                    setDirection('in')
                    setSubmitError(null)
                  }}
                  disabled={isFormBusy}
                  aria-pressed={direction === 'in'}
                  data-testid={TID.checkins.manualModal.directionIn}
                >
                  <UserCheck className="size-4 shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">Check in</span>
                    <span className="block text-xs opacity-80">Show absent members first</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`btn h-auto justify-start px-(--space-3) py-(--space-3) normal-case ${direction === 'out' ? 'btn-error' : 'btn-outline border-base-300 bg-base-100 text-base-content'}`}
                  onClick={() => {
                    setDirection('out')
                    setSubmitError(null)
                  }}
                  disabled={isFormBusy}
                  aria-pressed={direction === 'out'}
                  data-testid={TID.checkins.manualModal.directionOut}
                >
                  <UserX className="size-4 shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">Check out</span>
                    <span className="block text-xs opacity-80">Show present members first</span>
                  </span>
                </button>
              </div>
            </fieldset>

            <div className="grid gap-(--space-2)">
              <label
                className="input input-bordered input-sm w-full"
                htmlFor={TID.checkins.manualModal.timestamp}
              >
                <span className="label">Recorded time</span>
                <input
                  id={TID.checkins.manualModal.timestamp}
                  type="datetime-local"
                  className="grow"
                  value={recordedAt}
                  onChange={(event) => {
                    setRecordedAt(event.target.value)
                    setSubmitError(null)
                  }}
                  disabled={isFormBusy}
                  data-testid={TID.checkins.manualModal.timestamp}
                />
              </label>
              <p className="text-xs text-base-content/55">
                Leave blank to use the current local time.
              </p>
              {timestampResolution.error ? (
                <p className="text-xs text-error" role="alert">
                  {timestampResolution.error}
                </p>
              ) : null}
            </div>

            <div className="grid gap-(--space-2)">
              <label className="input input-bordered input-sm w-full">
                <span className="label">Search</span>
                <Search className="h-4 w-4 text-base-content/50 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="grow"
                  placeholder="Search by name or service number..."
                  value={memberSearch}
                  onChange={(event) => {
                    setMemberSearch(event.target.value)
                    setSubmitError(null)
                  }}
                  disabled={isFormBusy || !!selectedMemberInfo}
                  data-testid={TID.checkins.manualModal.memberSearch}
                />
              </label>
              <p className="text-xs text-base-content/55">
                Only eligible members stay selectable for the chosen direction.
              </p>
            </div>

            {selectedMemberInfo ? (
              <AppCard className="border border-base-300 bg-base-200/50">
                <AppCardContent className="flex items-center gap-(--space-3) p-(--space-3)">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fadded text-primary-fadded-content">
                    <ArrowRightLeft className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-base-content/55">
                      Selected member
                    </p>
                    <p className="truncate text-sm font-semibold text-base-content">
                      {formatManualCheckinMemberLabel(selectedMemberInfo)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-circle"
                    onClick={handleMemberClear}
                    disabled={isFormBusy}
                    data-testid={TID.checkins.manualModal.clearMember}
                  >
                    <X className="size-3.5" />
                    <span className="sr-only">Clear selected member</span>
                  </button>
                </AppCardContent>
              </AppCard>
            ) : null}

            <div className="min-h-64 overflow-hidden rounded-box border border-base-300 bg-base-100">
              {isPresenceError || isMembersError ? (
                <div className="grid gap-(--space-3) p-(--space-4)">
                  <AppCard status="error" className="border border-base-300">
                    <AppCardContent className="flex items-start gap-(--space-3) p-(--space-4)">
                      <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-error" />
                      <div>
                        <p className="text-sm font-semibold text-base-content">
                          Manual presence is unavailable
                        </p>
                        <p className="text-sm text-base-content/65">
                          Close the modal and retry once member and presence data have loaded again.
                        </p>
                      </div>
                    </AppCardContent>
                  </AppCard>
                </div>
              ) : isMembersLoading || membersData === undefined || isPresenceLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <span className="loading loading-spinner loading-md text-base-content/60" />
                </div>
              ) : eligibility.eligibleMembers.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-(--space-2) px-(--space-4) text-center">
                  <Search className="size-5 text-base-content/35" />
                  <p className="text-sm font-medium text-base-content">No eligible members found</p>
                  <p className="max-w-sm text-sm text-base-content/60">
                    {direction === 'in'
                      ? 'Try a different search or switch to check out to see members who are already present.'
                      : 'Try a different search or switch to check in to see members who are currently absent.'}
                  </p>
                </div>
              ) : (
                <ul className="menu max-h-64 overflow-y-auto p-(--space-2)">
                  {eligibility.eligibleMembers.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        className="flex items-center justify-between gap-(--space-3)"
                        data-testid={TID.checkins.manualModal.memberOption(member.id)}
                        onClick={() => {
                          setSelectedMemberInfo({
                            id: member.id,
                            rank: member.rank,
                            displayName: member.displayName ?? undefined,
                            firstName: member.firstName,
                            lastName: member.lastName,
                            serviceNumber: member.serviceNumber,
                          })
                          setMemberSearch('')
                          setSubmitError(null)
                        }}
                      >
                        <span className="min-w-0 text-left">
                          <span className="block truncate text-sm font-medium text-base-content">
                            {member.displayName ??
                              `${member.rank} ${member.lastName}, ${member.firstName}`}
                          </span>
                          <span className="block text-xs text-base-content/55">
                            {member.serviceNumber.slice(-3)}
                          </span>
                        </span>
                        <AppBadge status={direction === 'in' ? 'success' : 'neutral'} size="sm">
                          {direction === 'in' ? 'Ready in' : 'Present'}
                        </AppBadge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {eligibility.selectedMemberReason ? (
              <div
                role="alert"
                className="alert alert-warning alert-soft text-sm text-base-content"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>{eligibility.selectedMemberReason}</span>
              </div>
            ) : null}

            {direction === 'out' && selectedMemberId && loadingCheckoutOptions ? (
              <div className="alert text-sm text-base-content">
                <span className="loading loading-spinner loading-xs" />
                <span>Checking lockup status before checkout.</span>
              </div>
            ) : null}

            {direction === 'out' && selectedMemberId && holdsLockup ? (
              <AppCard status="warning" className="border border-base-300 bg-warning-fadded/60">
                <AppCardContent className="flex items-start gap-(--space-3) p-(--space-4)">
                  <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warning-fadded-content" />
                  <div>
                    <p className="text-sm font-semibold text-warning-fadded-content">
                      Lockup must be resolved first
                    </p>
                    <p className="text-sm text-warning-fadded-content/80">
                      This member holds lockup responsibility. Continue to transfer lockup or finish
                      building lockup before checkout completes.
                    </p>
                  </div>
                </AppCardContent>
              </AppCard>
            ) : null}

            {submitError ? (
              <div
                role="alert"
                aria-live="polite"
                className="alert alert-error alert-soft text-sm text-base-content"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-(--space-4)">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onOpenChange(false)}
              data-testid={TID.checkins.manualModal.cancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void onSubmit()}
              disabled={!canSubmit || isPresenceError || isMembersError}
              data-testid={TID.checkins.manualModal.submit}
            >
              {isFormBusy ? <span className="loading loading-spinner loading-sm" /> : null}
              {submitLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lockup Options Modal */}
      {checkoutOptions && (
        <LockupOptionsModal
          open={showLockupOptions}
          onOpenChange={setShowLockupOptions}
          memberId={selectedMemberId}
          memberName={memberName}
          checkoutOptions={checkoutOptions}
          onCheckoutComplete={handleLockupComplete}
        />
      )}
    </>
  )
}
