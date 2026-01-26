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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
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
            <div>
              <Label htmlFor="serviceNumber">
                Service Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serviceNumber"
                {...register('serviceNumber', { required: 'Service number is required' })}
                placeholder="e.g., V123456"
              />
              {errors.serviceNumber && (
                <p className="text-sm text-destructive mt-1">{errors.serviceNumber.message}</p>
              )}
            </div>

            {/* Rank */}
            <div>
              <Label htmlFor="rank">
                Rank <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRank}
                onValueChange={(value) => setValue('rank', value, { shouldValidate: true })}
              >
                <SelectTrigger id="rank">
                  <SelectValue placeholder="Select rank" />
                </SelectTrigger>
                <SelectContent>
                  {enums?.ranks.map((rank: string) => (
                    <SelectItem key={rank} value={rank}>
                      {rank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rank && (
                <p className="text-sm text-destructive mt-1">{errors.rank.message}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <Label htmlFor="firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName', { required: 'First name is required' })}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName', { required: 'Last name is required' })}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
              )}
            </div>

            {/* Middle Initial */}
            <div>
              <Label htmlFor="middleInitial">Middle Initial</Label>
              <Input
                id="middleInitial"
                {...register('middleInitial')}
                placeholder="M"
                maxLength={5}
              />
            </div>

            {/* Division */}
            <div>
              <Label htmlFor="divisionId">
                Division <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedDivisionId}
                onValueChange={(value) => setValue('divisionId', value, { shouldValidate: true })}
              >
                <SelectTrigger id="divisionId">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions?.divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.divisionId && (
                <p className="text-sm text-destructive mt-1">{errors.divisionId.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="john.doe@forces.gc.ca"
              />
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                {...register('phoneNumber')}
                placeholder="555-1234"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Member' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
