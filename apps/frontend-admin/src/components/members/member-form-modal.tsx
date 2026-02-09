'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useCreateMember, useUpdateMember } from '@/hooks/use-members'
import { useDivisions } from '@/hooks/use-divisions'
import { useEnums } from '@/hooks/use-enums'
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
  const { data: divisions } = useDivisions()
  const { data: enums } = useEnums()
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
    },
  })

  const selectedRank = watch('rank')
  const selectedDivisionId = watch('divisionId')

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
        divisionId: member.divisionId,
        badgeId: member.badgeId ?? '',
        memberTypeId: member.memberTypeId ?? '',
        memberStatusId: member.memberStatusId ?? '',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          </div>

          <DialogFooter>
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-md" disabled={isSubmitting}>
              {isSubmitting && <ButtonSpinner />}
              {mode === 'create' ? 'Create Member' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
