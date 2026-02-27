'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateMember, useUpdateMember } from '@/hooks/use-members'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
import { useAuthStore, AccountLevel } from '@/store/auth-store'
import { TID } from '@/lib/test-ids'
import { SetPinModal } from './set-pin-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ButtonSpinner } from '@/components/ui/loading-spinner'
import type { MemberResponse, CreateMemberInput } from '@sentinel/contracts'

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

export function MemberFormModal({ open, onOpenChange, mode, member }: MemberFormModalProps) {
  const queryClient = useQueryClient()
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
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
  const actorLevel = signedInMember?.accountLevel ?? 0
  const canManageAccountLevel = actorLevel >= AccountLevel.ADMIN
  const canManagePin = actorLevel >= AccountLevel.ADMIN
  const canShowPinSection = mode === 'edit' && Boolean(member) && canManagePin

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && member) {
      reset({
        serviceNumber: member.serviceNumber,
        rank: member.rank,
        firstName: member.firstName,
        lastName: member.lastName,
        middleInitial: member.middleInitial ?? '',
        email: member.email ?? '',
        phoneNumber: member.phoneNumber ?? '',
        divisionId: member.divisionId ?? '',
        badgeId: member.badgeId ?? '',
        memberTypeId: member.memberTypeId ?? '',
        memberStatusId: member.memberStatusId ?? '',
        accountLevel: member.accountLevel,
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
  }, [mode, member, reset])

  const onSubmit = async (data: FormData) => {
    try {
      // Convert form data to CreateMemberInput
      const memberData: CreateMemberInput = {
        serviceNumber: data.serviceNumber,
        rank: data.rank as CreateMemberInput['rank'],
        firstName: data.firstName,
        lastName: data.lastName,
        middleInitial: data.middleInitial || undefined,
        divisionId: data.divisionId,
        email: data.email || undefined,
        phoneNumber: data.phoneNumber || undefined,
        badgeId: data.badgeId || undefined,
        memberTypeId: data.memberTypeId || undefined,
        memberStatusId: data.memberStatusId || undefined,
        accountLevel: canManageAccountLevel ? data.accountLevel : undefined,
      }

      if (mode === 'create') {
        await createMember.mutateAsync(memberData)
      } else if (member) {
        await updateMember.mutateAsync({ id: member.id, data: memberData })
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save member:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
        testId={TID.members.form.modal}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Member' : 'Edit Member'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new member to the system.' : 'Update member information.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Service Number */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Service Number <span className="text-error">*</span>
              </legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="serviceNumber"
                {...register('serviceNumber', { required: 'Service number is required' })}
                placeholder="e.g., V123456"
                data-testid={TID.members.form.serviceNumber}
              />
              {errors.serviceNumber && (
                <span className="label text-error">{errors.serviceNumber.message}</span>
              )}
            </fieldset>

            {/* Rank */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Rank <span className="text-error">*</span>
              </legend>
              <select
                id="rank"
                className="select"
                value={selectedRank}
                onChange={(e) => setValue('rank', e.target.value, { shouldValidate: true })}
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
              {errors.rank && <span className="label text-error">{errors.rank.message}</span>}
            </fieldset>

            {/* First Name */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                First Name <span className="text-error">*</span>
              </legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="firstName"
                {...register('firstName', { required: 'First name is required' })}
                placeholder="John"
                data-testid={TID.members.form.firstName}
              />
              {errors.firstName && (
                <span className="label text-error">{errors.firstName.message}</span>
              )}
            </fieldset>

            {/* Last Name */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Last Name <span className="text-error">*</span>
              </legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="lastName"
                {...register('lastName', { required: 'Last name is required' })}
                placeholder="Doe"
                data-testid={TID.members.form.lastName}
              />
              {errors.lastName && (
                <span className="label text-error">{errors.lastName.message}</span>
              )}
            </fieldset>

            {/* Middle Initial */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Middle Initial</legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="middleInitial"
                {...register('middleInitial')}
                placeholder="M"
                maxLength={5}
              />
            </fieldset>

            {/* Division */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                Division <span className="text-error">*</span>
              </legend>
              <select
                id="divisionId"
                className="select"
                value={selectedDivisionId}
                onChange={(e) => setValue('divisionId', e.target.value, { shouldValidate: true })}
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

            {/* Email */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email</legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="email"
                type="email"
                {...register('email')}
                placeholder="john.doe@forces.gc.ca"
              />
            </fieldset>

            {/* Phone Number */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Phone Number</legend>
              <input
                className="input input-bordered w-full disabled:opacity-50 disabled:cursor-not-allowed"
                id="phoneNumber"
                type="tel"
                {...register('phoneNumber')}
                placeholder="555-1234"
              />
            </fieldset>

            {/* Account Level */}
            {canManageAccountLevel && (
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Account Level</legend>
                <select
                  id="accountLevel"
                  className="select"
                  value={selectedAccountLevel}
                  onChange={(e) =>
                    setValue('accountLevel', Number(e.target.value) as FormData['accountLevel'], {
                      shouldValidate: true,
                    })
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
          </div>

          {canShowPinSection && member && (
            <div className="rounded-box border border-base-300 p-(--space-3)">
              <div className="mb-(--space-2) flex items-center justify-between gap-(--space-2)">
                <h3 className="font-medium">PIN Access</h3>
                <span
                  className={`badge ${member.mustChangePin ? 'badge-warning' : 'badge-success'}`}
                >
                  {member.mustChangePin ? 'PIN setup required' : 'PIN configured'}
                </span>
              </div>
              {member.mustChangePin && (
                <div role="alert" className="alert alert-warning mb-(--space-3) text-sm">
                  <span>
                    This member currently requires PIN setup/change before regular protected access.
                  </span>
                </div>
              )}
              <SetPinModalTrigger
                memberId={member.id}
                memberName={`${member.rank} ${member.lastName}`.trim()}
                required={member.mustChangePin}
                onPinSet={async () => {
                  await queryClient.invalidateQueries({ queryKey: ['members'] })
                  await queryClient.invalidateQueries({ queryKey: ['member', member.id] })
                }}
              />
            </div>
          )}

          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}

function SetPinModalTrigger({
  memberId,
  memberName,
  required,
  onPinSet,
}: {
  memberId: string
  memberName: string
  required: boolean
  onPinSet: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm ${required ? 'btn-warning' : 'btn-primary'}`}
        onClick={() => setOpen(true)}
      >
        {required ? 'Set PIN Now' : 'Change PIN'}
      </button>
      <SetPinModal
        open={open}
        onOpenChange={setOpen}
        memberId={memberId}
        memberName={memberName}
        onSuccess={onPinSet}
      />
    </>
  )
}
