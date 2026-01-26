'use client'

import { useForm } from 'react-hook-form'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { useMembers } from '@/hooks/use-members'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { CreateCheckinInput } from '@sentinel/contracts'

interface ManualCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  memberId: string
  direction: 'IN' | 'OUT'
}

export function ManualCheckinModal({ open, onOpenChange }: ManualCheckinModalProps) {
  const { data: membersData } = useMembers({ limit: 100 }) // Get all members for dropdown
  const createCheckin = useCreateCheckin()

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      memberId: '',
      direction: 'IN',
    },
  })

  const selectedMemberId = watch('memberId')
  const selectedDirection = watch('direction')

  const onSubmit = async (data: FormData) => {
    try {
      const checkinData: CreateCheckinInput = {
        memberId: data.memberId,
        direction: data.direction,
        kioskId: 'ADMIN_MANUAL',
        method: 'manual',
      }

      await createCheckin.mutateAsync(checkinData)
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create manual check-in:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Check-in</DialogTitle>
          <DialogDescription>
            Record a manual check-in for a member who cannot use their badge.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Member Selection */}
          <div>
            <Label htmlFor="memberId">
              Member <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedMemberId}
              onValueChange={(value) => setValue('memberId', value, { shouldValidate: true })}
            >
              <SelectTrigger id="memberId">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {membersData?.members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.rank} {member.firstName} {member.lastName} ({member.serviceNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-sm text-destructive mt-1">{errors.memberId.message}</p>
            )}
          </div>

          {/* Direction Selection */}
          <div>
            <Label htmlFor="direction">
              Direction <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedDirection}
              onValueChange={(value) =>
                setValue('direction', value as 'IN' | 'OUT', { shouldValidate: true })
              }
            >
              <SelectTrigger id="direction">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Check In</SelectItem>
                <SelectItem value="OUT">Check Out</SelectItem>
              </SelectContent>
            </Select>
            {errors.direction && (
              <p className="text-sm text-destructive mt-1">{errors.direction.message}</p>
            )}
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
            <Button type="submit" disabled={isSubmitting || !selectedMemberId}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Check-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
