'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useBadge, useBadges } from '@/hooks/use-badges'
import { useCreateMember, useMember, useUpdateMember } from '@/hooks/use-members'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { TID } from '@/lib/test-ids'
import { SetPinModal } from './set-pin-modal'
import { AppBadge, type AppBadgeStatus } from '@/components/ui/AppBadge'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
} from '@/components/ui/AppCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import type {
  BadgeWithAssignmentResponse,
  MemberResponse,
  CreateMemberInput,
  UpdateMemberInput,
} from '@sentinel/contracts'

interface MemberFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  member?: MemberResponse
}

type FormData = Omit<CreateMemberInput, 'rank' | 'divisionId'> & {
  rank: string
  divisionId: string
}

function badgeRecordStatusToAppBadgeStatus(
  status: BadgeWithAssignmentResponse['status']
): AppBadgeStatus {
  switch (status) {
    case 'active':
      return 'success'
    case 'lost':
    case 'damaged':
      return 'warning'
    case 'inactive':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function badgeSummaryToAppBadgeStatus(
  badgeStatus: MemberResponse['badgeStatus'] | undefined
): AppBadgeStatus {
  switch (badgeStatus?.chipColor) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'info':
      return 'info'
    default:
      return 'neutral'
  }
}

function formatBadgeLastUsed(lastUsed: string | null): string {
  if (!lastUsed) {
    return 'No scans recorded'
  }

  return new Date(lastUsed).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatBadgeOptionLabel(
  badge: BadgeWithAssignmentResponse,
  currentBadgeId: string | null | undefined
): string {
  const suffix: string[] = []

  if (badge.id === currentBadgeId) {
    suffix.push('current')
  }

  if (badge.status !== 'active') {
    suffix.push(badge.status)
  }

  return suffix.length > 0 ? `${badge.serialNumber} (${suffix.join(', ')})` : badge.serialNumber
}

export function MemberFormModal({ open, onOpenChange, mode, member }: MemberFormModalProps) {
  const queryClient = useQueryClient()
  const [badgeSearch, setBadgeSearch] = useState('')
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
  const { data: liveMember } = useMember(open && member?.id ? member.id : '')
  const resolvedMember = mode === 'edit' ? (liveMember ?? member) : member
  const currentBadgeId = resolvedMember?.badgeId ?? ''
  const { data: currentBadgeData } = useBadge(currentBadgeId)
  const { data: badgesData, isLoading: isBadgesLoading } = useBadges({
    page: 1,
    limit: 100,
    search: badgeSearch.trim() || undefined,
    status: 'active',
    unassignedOnly: true,
  })
  const signedInMember = useAuthStore((state) => state.member)
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      serviceNumber: '',
      rank: '',
      firstName: '',
      lastName: '',
      middleInitial: '',
      email: '',
      phoneNumber: '',
      divisionId: '',
      badgeId: '',
      memberTypeId: '',
      memberStatusId: '',
      accountLevel: AccountLevel.BASIC,
    },
  })

  const selectedRank = watch('rank')
  const selectedDivisionId = watch('divisionId')
  const selectedAccountLevel = watch('accountLevel')
  const selectedMemberTypeId = watch('memberTypeId')
  const selectedMemberStatusId = watch('memberStatusId')
  const selectedBadgeId = watch('badgeId')
  const actorLevel = signedInMember?.accountLevel ?? 0
  const canManageAccountLevel = actorLevel >= AccountLevel.ADMIN
  const canManagePin = actorLevel >= AccountLevel.ADMIN
  const canShowPinSection = mode === 'edit' && Boolean(member) && canManagePin

  useEffect(() => {
    if (mode === 'edit' && resolvedMember) {
      reset({
        serviceNumber: resolvedMember.serviceNumber,
        rank: resolvedMember.rank,
        firstName: resolvedMember.firstName,
        lastName: resolvedMember.lastName,
        middleInitial: resolvedMember.middleInitial ?? '',
        email: resolvedMember.email ?? '',
        phoneNumber: resolvedMember.phoneNumber ?? '',
        divisionId: resolvedMember.divisionId ?? '',
        badgeId: resolvedMember.badgeId ?? '',
        memberTypeId: resolvedMember.memberTypeId ?? '',
        memberStatusId: resolvedMember.memberStatusId ?? '',
        accountLevel: resolvedMember.accountLevel,
      })
    } else {
      reset({
        serviceNumber: '',
        rank: '',
        firstName: '',
        lastName: '',
        middleInitial: '',
        email: '',
        phoneNumber: '',
        divisionId: '',
        badgeId: '',
        memberTypeId: '',
        memberStatusId: '',
        accountLevel: AccountLevel.BASIC,
      })
    }

    setBadgeSearch('')
  }, [mode, resolvedMember, reset])

  const currentBadge = useMemo(() => {
    if (!resolvedMember?.badgeId) {
      return null
    }

    if (currentBadgeData?.id === resolvedMember.badgeId) {
      return currentBadgeData
    }

    return badgesData?.badges.find((badge) => badge.id === resolvedMember.badgeId) ?? null
  }, [badgesData?.badges, currentBadgeData, resolvedMember?.badgeId])

  const selectedBadge = useMemo(() => {
    if (!selectedBadgeId) {
      return null
    }

    if (currentBadgeData?.id === selectedBadgeId) {
      return currentBadgeData
    }

    return badgesData?.badges.find((badge) => badge.id === selectedBadgeId) ?? null
  }, [badgesData?.badges, currentBadgeData, selectedBadgeId])

  const badgeOptions = useMemo(() => {
    const search = badgeSearch.trim().toLowerCase()
    const optionsMap = new Map((badgesData?.badges ?? []).map((badge) => [badge.id, badge]))

    if (currentBadgeData) {
      optionsMap.set(currentBadgeData.id, currentBadgeData)
    }

    return [...optionsMap.values()]
      .filter((badge) => {
        if (badge.id === currentBadgeId || badge.id === selectedBadgeId) {
          return true
        }

        if (badge.assignmentType === 'unassigned' && badge.status === 'active') {
          return true
        }

        return false
      })
      .filter((badge) => {
        if (!search) {
          return true
        }

        return badge.serialNumber.toLowerCase().includes(search)
      })
      .sort((left, right) => left.serialNumber.localeCompare(right.serialNumber))
  }, [badgesData?.badges, badgeSearch, currentBadgeData, currentBadgeId, selectedBadgeId])

  const onSubmit = async (data: FormData) => {
    try {
      if (mode === 'create') {
        const memberData: CreateMemberInput = {
          serviceNumber: data.serviceNumber,
          rank: data.rank as CreateMemberInput['rank'],
          firstName: data.firstName,
          lastName: data.lastName,
          middleInitial: data.middleInitial || undefined,
          divisionId: data.divisionId,
          email: data.email || undefined,
          phoneNumber: data.phoneNumber || undefined,
          memberTypeId: data.memberTypeId || undefined,
          memberStatusId: data.memberStatusId || undefined,
          accountLevel: canManageAccountLevel ? data.accountLevel : undefined,
        }

        await createMember.mutateAsync(memberData)
        toast.success(`Created member ${data.firstName} ${data.lastName}`)
      } else if (resolvedMember) {
        const memberData: UpdateMemberInput = {
          serviceNumber: data.serviceNumber,
          rank: data.rank as CreateMemberInput['rank'],
          firstName: data.firstName,
          lastName: data.lastName,
          middleInitial: data.middleInitial || undefined,
          divisionId: data.divisionId,
          email: data.email || undefined,
          phoneNumber: data.phoneNumber || undefined,
          badgeId: data.badgeId ? data.badgeId : null,
          memberTypeId: data.memberTypeId || undefined,
          memberStatusId: data.memberStatusId || undefined,
          accountLevel: canManageAccountLevel ? data.accountLevel : undefined,
        }

        await updateMember.mutateAsync({ id: resolvedMember.id, data: memberData })
        toast.success(`Updated ${resolvedMember.displayName}`)
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save member')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="max-h-[92vh] w-[92vw] max-w-336 overflow-hidden p-0"
        testId={TID.members.form.modal}
      >
        <DialogHeader className="border-b border-base-300 px-(--space-6) py-(--space-4) pr-(--space-10)">
          <DialogTitle>{mode === 'create' ? 'Create Member' : 'Member Details'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add the member profile first. Badge assignment and PIN access can be configured after creation.'
              : `Review profile, unit placement, and badge access for ${resolvedMember?.displayName ?? 'this member'}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[calc(92vh-7.5rem)] flex-col">
          <div className="min-h-0 overflow-y-auto overflow-x-hidden px-(--space-6) py-(--space-4)">
            <div className="grid gap-(--space-4) 2xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,26rem)]">
              <div className="min-w-0 space-y-(--space-3)">
                <AppCard className="min-w-0 border border-base-300 shadow-sm">
                  <AppCardHeader className="border-b border-base-300 pb-(--space-3)">
                    <AppCardTitle>Identity</AppCardTitle>
                    <AppCardDescription>
                      Core identifying information used throughout the member roster.
                    </AppCardDescription>
                  </AppCardHeader>
                  <AppCardContent className="pt-(--space-3)">
                    <div className="grid gap-(--space-3) md:grid-cols-2 xl:grid-cols-3">
                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">
                          Service Number <span className="text-error">*</span>
                        </legend>
                        <input
                          className="input input-bordered input-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
                          id="serviceNumber"
                          {...register('serviceNumber', { required: 'Service number is required' })}
                          placeholder="e.g., V123456"
                          data-testid={TID.members.form.serviceNumber}
                        />
                        {errors.serviceNumber && (
                          <span className="label text-error">{errors.serviceNumber.message}</span>
                        )}
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">
                          Rank <span className="text-error">*</span>
                        </legend>
                        <select
                          id="rank"
                          className="select select-bordered select-sm w-full"
                          value={selectedRank}
                          onChange={(e) =>
                            setValue('rank', e.target.value, { shouldValidate: true })
                          }
                          data-testid={TID.members.form.rank}
                        >
                          <option value="" disabled>
                            Select rank
                          </option>
                          {enums?.ranks.map((rank: string) => (
                            <option key={rank} value={rank}>
                              {rank}
                            </option>
                          ))}
                        </select>
                        {errors.rank && (
                          <span className="label text-error">{errors.rank.message}</span>
                        )}
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">
                          Last Name <span className="text-error">*</span>
                        </legend>
                        <input
                          className="input input-bordered input-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
                          id="lastName"
                          {...register('lastName', { required: 'Last name is required' })}
                          placeholder="Doe"
                          data-testid={TID.members.form.lastName}
                        />
                        {errors.lastName && (
                          <span className="label text-error">{errors.lastName.message}</span>
                        )}
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">
                          First Name <span className="text-error">*</span>
                        </legend>
                        <input
                          className="input input-bordered input-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
                          id="firstName"
                          {...register('firstName', { required: 'First name is required' })}
                          placeholder="John"
                          data-testid={TID.members.form.firstName}
                        />
                        {errors.firstName && (
                          <span className="label text-error">{errors.firstName.message}</span>
                        )}
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">Initials</legend>
                        <input
                          className="input input-bordered input-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
                          id="middleInitial"
                          {...register('middleInitial')}
                          placeholder="M"
                          maxLength={5}
                        />
                      </fieldset>
                    </div>
                  </AppCardContent>
                </AppCard>

                <AppCard className="min-w-0 border border-base-300 shadow-sm">
                  <AppCardHeader className="border-b border-base-300 pb-(--space-3)">
                    <AppCardTitle>Organization & Contact</AppCardTitle>
                    <AppCardDescription>
                      Unit placement, personnel classification, and primary contact details.
                    </AppCardDescription>
                  </AppCardHeader>
                  <AppCardContent className="pt-(--space-3)">
                    <div className="grid gap-(--space-3) md:grid-cols-2">
                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">
                          Division <span className="text-error">*</span>
                        </legend>
                        <select
                          id="divisionId"
                          className="select select-bordered select-sm w-full"
                          value={selectedDivisionId}
                          onChange={(e) =>
                            setValue('divisionId', e.target.value, { shouldValidate: true })
                          }
                          data-testid={TID.members.form.division}
                        >
                          <option value="" disabled>
                            Select division
                          </option>
                          {divisions?.divisions.map((division) => (
                            <option key={division.id} value={division.id}>
                              {division.name}
                            </option>
                          ))}
                        </select>
                        {errors.divisionId && (
                          <span className="label text-error">{errors.divisionId.message}</span>
                        )}
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">Member Type</legend>
                        <select
                          id="memberTypeId"
                          className="select select-bordered select-sm w-full"
                          value={selectedMemberTypeId}
                          onChange={(e) =>
                            setValue('memberTypeId', e.target.value, { shouldValidate: true })
                          }
                        >
                          <option value="">No member type assigned</option>
                          {enums?.memberTypes.map((memberType: { id: string; name: string }) => (
                            <option key={memberType.id} value={memberType.id}>
                              {memberType.name}
                            </option>
                          ))}
                        </select>
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">Member Status</legend>
                        <select
                          id="memberStatusId"
                          className="select select-bordered select-sm w-full"
                          value={selectedMemberStatusId}
                          onChange={(e) =>
                            setValue('memberStatusId', e.target.value, { shouldValidate: true })
                          }
                        >
                          <option value="">No member status assigned</option>
                          {enums?.memberStatuses.map(
                            (memberStatus: { id: string; name: string }) => (
                              <option key={memberStatus.id} value={memberStatus.id}>
                                {memberStatus.name}
                              </option>
                            )
                          )}
                        </select>
                      </fieldset>

                      <fieldset className="fieldset min-w-0">
                        <legend className="fieldset-legend">Phone Number</legend>
                        <input
                          className="input input-bordered input-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
                          id="phoneNumber"
                          type="tel"
                          {...register('phoneNumber')}
                          placeholder="555-1234"
                        />
                      </fieldset>

                      <fieldset className="fieldset min-w-0 md:col-span-2">
                        <legend className="fieldset-legend">Email</legend>
                        <input
                          className="input input-bordered input-sm w-full disabled:cursor-not-allowed disabled:opacity-50"
                          id="email"
                          type="email"
                          {...register('email')}
                          placeholder="john.doe@forces.gc.ca"
                        />
                      </fieldset>
                    </div>
                  </AppCardContent>
                </AppCard>
              </div>

              <div className="min-w-0 space-y-(--space-3)">
                <AppCard className="min-w-0 border border-base-300 shadow-sm">
                  <AppCardHeader className="border-b border-base-300 pb-(--space-3)">
                    <AppCardTitle>Badge & Access</AppCardTitle>
                    <AppCardDescription>
                      Manage badge assignment, protected PIN access, and administrative access
                      level.
                    </AppCardDescription>
                  </AppCardHeader>
                  <AppCardContent className="space-y-(--space-3) px-(--space-6) pb-(--space-5) pt-(--space-3)">
                    {mode === 'edit' && resolvedMember ? (
                      <>
                        <div className="flex flex-wrap gap-(--space-2)">
                          <AppBadge
                            status={
                              currentBadge
                                ? badgeRecordStatusToAppBadgeStatus(currentBadge.status)
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {currentBadge ? `Badge ${currentBadge.status}` : 'No badge assigned'}
                          </AppBadge>
                          <AppBadge
                            status={resolvedMember.mustChangePin ? 'warning' : 'success'}
                            size="sm"
                          >
                            {resolvedMember.mustChangePin ? 'PIN setup required' : 'PIN configured'}
                          </AppBadge>
                        </div>

                        <div className="rounded-box border border-base-300 bg-base-200/40 p-(--space-3)">
                          <div className="grid gap-(--space-3) sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                                Current Badge
                              </p>
                              <p className="mt-(--space-1) font-mono text-sm">
                                {currentBadge?.serialNumber ?? 'No badge assigned'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                                Last Badge Use
                              </p>
                              <p className="mt-(--space-1) text-sm text-base-content/80">
                                {currentBadge
                                  ? formatBadgeLastUsed(currentBadge.lastUsed)
                                  : 'No scans recorded'}
                              </p>
                            </div>
                            {resolvedMember.badgeStatus && (
                              <div className="sm:col-span-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                                  Member Access
                                </p>
                                <div className="mt-(--space-1)">
                                  <AppBadge
                                    status={badgeSummaryToAppBadgeStatus(
                                      resolvedMember.badgeStatus
                                    )}
                                    size="sm"
                                  >
                                    {resolvedMember.badgeStatus.name}
                                  </AppBadge>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <fieldset className="fieldset min-w-0">
                          <legend className="fieldset-legend">Find Badge</legend>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/60" />
                            <input
                              className="input input-bordered input-sm w-full max-w-full pl-9"
                              value={badgeSearch}
                              onChange={(event) => setBadgeSearch(event.target.value)}
                              placeholder="Filter badge list by serial number..."
                            />
                          </div>
                          <p className="label text-base-content/60">
                            Showing active unassigned badges plus the member&apos;s current badge.
                          </p>
                        </fieldset>

                        <fieldset className="fieldset min-w-0">
                          <legend className="fieldset-legend">Assigned Badge</legend>
                          <select
                            id="badgeId"
                            className="select select-bordered select-sm w-full max-w-full"
                            value={selectedBadgeId}
                            onChange={(event) =>
                              setValue('badgeId', event.target.value, { shouldValidate: true })
                            }
                          >
                            <option value="">No badge assigned</option>
                            {badgeOptions.map((badge) => (
                              <option key={badge.id} value={badge.id}>
                                {formatBadgeOptionLabel(badge, resolvedMember.badgeId)}
                              </option>
                            ))}
                          </select>
                          {isBadgesLoading ? (
                            <p className="label text-base-content/60">Loading badge inventory...</p>
                          ) : badgeOptions.length === 0 ? (
                            <p className="label text-base-content/60">
                              No matching badges are available for assignment.
                            </p>
                          ) : null}
                        </fieldset>

                        <div className="rounded-box border border-base-300 p-(--space-3)">
                          <div className="space-y-(--space-2)">
                            <div>
                              <p className="text-sm font-medium">
                                {selectedBadge ? 'Selected badge' : 'Badge assignment'}
                              </p>
                              <p className="text-sm text-base-content/60">
                                {selectedBadge
                                  ? 'Saving will move this badge assignment to the member.'
                                  : 'Choose “No badge assigned” to remove access from the member.'}
                              </p>
                            </div>
                            {selectedBadge && (
                              <AppBadge
                                status={badgeRecordStatusToAppBadgeStatus(selectedBadge.status)}
                                size="sm"
                              >
                                {selectedBadge.status}
                              </AppBadge>
                            )}
                          </div>

                          {selectedBadge && (
                            <dl className="mt-(--space-3) grid gap-(--space-3) text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                                  Serial
                                </dt>
                                <dd className="font-mono">{selectedBadge.serialNumber}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                                  Last Used
                                </dt>
                                <dd>{formatBadgeLastUsed(selectedBadge.lastUsed)}</dd>
                              </div>
                            </dl>
                          )}
                        </div>

                        {canManageAccountLevel && (
                          <fieldset className="fieldset min-w-0">
                            <legend className="fieldset-legend">Account Level</legend>
                            <select
                              id="accountLevel"
                              className="select select-bordered select-sm w-full max-w-full"
                              value={selectedAccountLevel}
                              onChange={(e) =>
                                setValue(
                                  'accountLevel',
                                  Number(e.target.value) as FormData['accountLevel'],
                                  { shouldValidate: true }
                                )
                              }
                            >
                              <option value={AccountLevel.BASIC}>Basic (1)</option>
                              <option value={AccountLevel.QUARTERMASTER}>Quartermaster (2)</option>
                              <option value={AccountLevel.LOCKUP}>Lockup (3)</option>
                              <option value={AccountLevel.COMMAND}>Command (4)</option>
                              <option value={AccountLevel.ADMIN}>Admin (5)</option>
                              {actorLevel >= AccountLevel.DEVELOPER && (
                                <option value={AccountLevel.DEVELOPER}>Developer (6)</option>
                              )}
                            </select>
                          </fieldset>
                        )}

                        {canShowPinSection && (
                          <div className="rounded-box border border-base-300 p-(--space-3)">
                            <div className="space-y-(--space-2)">
                              <div>
                                <h3 className="text-sm font-medium">PIN Access</h3>
                                <p className="text-sm text-base-content/60">
                                  Protected login uses the assigned badge and a 4-digit PIN.
                                </p>
                              </div>
                              <AppBadge
                                status={resolvedMember.mustChangePin ? 'warning' : 'success'}
                                size="sm"
                              >
                                {resolvedMember.mustChangePin ? 'Set PIN now' : 'PIN active'}
                              </AppBadge>
                            </div>

                            {resolvedMember.mustChangePin && (
                              <div
                                role="alert"
                                className="alert alert-warning mt-(--space-3) text-sm"
                              >
                                <span>
                                  This member still needs an initial or replacement PIN before
                                  regular protected access.
                                </span>
                              </div>
                            )}

                            <div className="mt-(--space-3)">
                              <button
                                type="button"
                                className={`btn btn-sm ${resolvedMember.mustChangePin ? 'btn-warning' : 'btn-primary'}`}
                                onClick={() => setPinModalOpen(true)}
                              >
                                {resolvedMember.mustChangePin ? 'Set PIN' : 'Change PIN'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="rounded-box border border-base-300 bg-base-200/40 p-(--space-3)">
                          <p className="text-sm font-medium">Access setup comes next</p>
                          <p className="mt-(--space-2) text-sm text-base-content/60">
                            Create the member profile first. Badge assignment and PIN setup are
                            managed from the edit view so you can see current badge status and
                            access details together.
                          </p>
                        </div>

                        {canManageAccountLevel && (
                          <fieldset className="fieldset min-w-0">
                            <legend className="fieldset-legend">Account Level</legend>
                            <select
                              id="accountLevel"
                              className="select select-bordered select-sm w-full max-w-full"
                              value={selectedAccountLevel}
                              onChange={(e) =>
                                setValue(
                                  'accountLevel',
                                  Number(e.target.value) as FormData['accountLevel'],
                                  { shouldValidate: true }
                                )
                              }
                            >
                              <option value={AccountLevel.BASIC}>Basic (1)</option>
                              <option value={AccountLevel.QUARTERMASTER}>Quartermaster (2)</option>
                              <option value={AccountLevel.LOCKUP}>Lockup (3)</option>
                              <option value={AccountLevel.COMMAND}>Command (4)</option>
                              <option value={AccountLevel.ADMIN}>Admin (5)</option>
                              {actorLevel >= AccountLevel.DEVELOPER && (
                                <option value={AccountLevel.DEVELOPER}>Developer (6)</option>
                              )}
                            </select>
                          </fieldset>
                        )}
                      </>
                    )}
                  </AppCardContent>
                </AppCard>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-0 border-t border-base-300 px-(--space-6) py-(--space-3)">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-testid={TID.members.form.cancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
              data-testid={TID.members.form.submit}
            >
              {isSubmitting && <ButtonSpinner />}
              {mode === 'create' ? 'Create Member' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>

        {resolvedMember && (
          <SetPinModal
            open={pinModalOpen}
            onOpenChange={setPinModalOpen}
            memberId={resolvedMember.id}
            memberName={resolvedMember.displayName}
            onSuccess={async () => {
              await queryClient.invalidateQueries({ queryKey: ['members'] })
              await queryClient.invalidateQueries({ queryKey: ['member', resolvedMember.id] })
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
