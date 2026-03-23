'use client'

import { useMemo, useState } from 'react'
import { Search, ShieldCheck, UserCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppBadge } from '@/components/ui/AppBadge'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import { useDdsStatus, useSetTodayDds } from '@/hooks/use-dds'
import { useLockupStatus } from '@/hooks/use-lockup'
import { useLockupEligibleMembers } from '@/hooks/use-qualifications'
import { useCurrentDds } from '@/hooks/use-schedules'

interface SetTodayDdsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatMemberName(
  member: {
    rank: string
    firstName: string
    lastName: string
  } | null
): string {
  if (!member) return 'None assigned'
  return `${member.rank} ${member.firstName} ${member.lastName}`
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

  const candidates = useMemo(() => {
    const members =
      eligibleMembers?.data.filter((member) =>
        member.qualifications.some((qualification) => qualification.code === 'DDS')
      ) ?? []

    if (!search.trim()) return members

    const query = search.toLowerCase()
    return members.filter(
      (member) =>
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        member.rank.toLowerCase().includes(query) ||
        member.serviceNumber.toLowerCase().includes(query)
    )
  }, [eligibleMembers, search])

  const selectedMember =
    candidates.find((member) => member.id === selectedMemberId) ??
    eligibleMembers?.data.find((member) => member.id === selectedMemberId) ??
    null

  const currentAssignment = ddsStatus?.assignment ?? null
  const currentHolder = lockupStatus?.currentHolder ?? null
  const hasActiveDds = currentAssignment?.status === 'active'
  const isAlreadyCurrentDds =
    selectedMemberId !== null &&
    currentAssignment?.memberId === selectedMemberId &&
    currentAssignment.status === 'active'

  const handleClose = () => {
    setSearch('')
    setSelectedMemberId(null)
    setNote('')
    onOpenChange(false)
  }

  const handleSubmit = () => {
    if (!selectedMemberId || isAlreadyCurrentDds) return
    setTodayDds.mutate(
      {
        memberId: selectedMemberId,
        notes: note.trim() ? note.trim() : undefined,
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  const actionLabel = hasActiveDds ? "Replace Today's DDS" : "Assign Today's DDS"

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Set Today&apos;s DDS
          </DialogTitle>
          <DialogDescription>
            Assign or replace the live DDS for today without changing the weekly schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  Current Live DDS
                </p>
                <p className="font-semibold">
                  {currentAssignment
                    ? formatMemberName(currentAssignment.member)
                    : 'No active DDS yet'}
                </p>
                {currentAssignment && currentAssignment.status !== 'active' && (
                  <p className="text-sm text-base-content/70">Scheduled, but not yet accepted.</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  Scheduled DDS
                </p>
                <p className="font-semibold">
                  {scheduledDds?.dds
                    ? formatMemberName(scheduledDds.dds.member)
                    : 'No scheduled DDS found'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-base-content/60">
                  Building Status
                </p>
                <p className="font-semibold capitalize">
                  {lockupStatus?.buildingStatus ?? 'unknown'}
                </p>
                <p className="text-sm text-base-content/70">
                  Lockup holder: {formatMemberName(currentHolder)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentAssignment ? (
                  <AppBadge status={hasActiveDds ? 'warning' : 'info'}>
                    {hasActiveDds ? 'DDS ACTIVE' : 'DDS PENDING'}
                  </AppBadge>
                ) : (
                  <AppBadge status="error">DDS NEEDED</AppBadge>
                )}
                {lockupStatus?.buildingStatus === 'secured' ? (
                  <AppBadge status="error">BUILDING SECURED</AppBadge>
                ) : (
                  <AppBadge status="success">BUILDING OPEN</AppBadge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/50" />
              <input
                type="text"
                className="input input-bordered w-full pl-10"
                placeholder="Search present DDS-qualified members..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-box border border-base-300 bg-base-100">
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
                  const isSelected = selectedMemberId === member.id
                  const isCurrent = currentAssignment?.memberId === member.id

                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={`flex w-full items-start justify-between gap-3 border-b border-base-300 px-4 py-3 text-left transition-colors last:border-b-0 ${
                        isSelected
                          ? 'bg-primary-fadded text-primary-fadded-content'
                          : 'hover:bg-base-200'
                      }`}
                      onClick={() => setSelectedMemberId(member.id)}
                    >
                      <div>
                        <p className="font-semibold">
                          {member.rank} {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm opacity-80">{member.serviceNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isCurrent && <AppBadge status="warning">CURRENT DDS</AppBadge>}
                        <AppBadge status="success">CHECKED IN</AppBadge>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {selectedMember && (
              <div className="rounded-box border border-base-300 bg-base-200/60 p-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-content/60">
                      Selected Member
                    </p>
                    <p className="font-semibold">
                      {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                    {isAlreadyCurrentDds && (
                      <p className="text-sm text-warning-fadded-content">
                        This member is already today&apos;s DDS.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text">Note (optional)</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="e.g., scheduled DDS called in sick"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            {setTodayDds.isError && (
              <div role="alert" className="alert alert-error alert-soft">
                <span>{setTodayDds.error.message}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <button className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!selectedMemberId || isAlreadyCurrentDds || setTodayDds.isPending}
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
