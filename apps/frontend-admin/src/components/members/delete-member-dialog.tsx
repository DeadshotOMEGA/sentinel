'use client'

import { useDeleteMember, useMember } from '@/hooks/use-members'
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
import { Loader2 } from 'lucide-react'

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
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete member:', error)
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              {member ? `${member.firstName} ${member.lastName}` : 'this member'}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMember.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMember.isPending}
            className="bg-error hover:bg-error/90"
          >
            {deleteMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
