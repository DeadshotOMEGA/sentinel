'use client'

import { useDeleteMember, useMember } from '@/hooks/use-members'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ButtonSpinner } from '@/components/ui/loading-spinner'

interface DeleteMemberDialogProps {
  memberId: string
  onOpenChange: (open: boolean) => void
}

export function DeleteMemberDialog({ memberId, onOpenChange }: DeleteMemberDialogProps) {
  const { data: member } = useMember(memberId)
  const deleteMember = useDeleteMember()

  const handleDelete = async () => {
    try {
      await deleteMember.mutateAsync(memberId)
      toast.success(
        member
          ? `${member.firstName} ${member.lastName} moved to inactive members`
          : 'Member deactivated'
      )
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate member')
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to deactivate{' '}
            <span className="font-semibold">
              {member ? `${member.firstName} ${member.lastName}` : 'this member'}
            </span>
            ? Historical records will be preserved, the member will be removed from the default
            active roster, and protected access will no longer be treated as active.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMember.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMember.isPending}
            className="bg-error hover:bg-error/90"
          >
            {deleteMember.isPending && <ButtonSpinner />}
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
