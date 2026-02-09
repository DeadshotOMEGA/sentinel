'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { User, Plus, Check, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import { AppBadge } from '@/components/ui/AppBadge'
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
import { MemberPickerModal } from '../member-picker-modal'
import {
  useSchedulesByWeek,
  useSchedule,
  useCreateSchedule,
  useCreateAssignment,
  useDeleteAssignment,
  usePublishSchedule,
  useRevertToDraft,
  useDutyRoles,
} from '@/hooks/use-schedules'
import { useModalContext } from './modal-context'
import { parseDateString } from '@/lib/date-utils'

export function DdsModal() {
  const { modal, closeModal } = useModalContext()
  const isOpen = modal.type === 'dds' && modal.weekStartDate !== null
  const weekStartDate = modal.weekStartDate ?? ''

  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  const { data: dutyRolesData } = useDutyRoles()
  const { data: schedulesData } = useSchedulesByWeek(weekStartDate)

  const ddsRole = dutyRolesData?.data?.find((r) => r.code === 'DDS')
  const ddsSchedule = schedulesData?.data?.find((s) => s.dutyRole.code === 'DDS')
  const { data: fullSchedule } = useSchedule(ddsSchedule?.id ?? '')
  const currentAssignment = fullSchedule?.assignments?.[0] ?? null

  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()
  const deleteAssignment = useDeleteAssignment()
  const publishSchedule = usePublishSchedule()
  const revertToDraft = useRevertToDraft()

  const weekLabel = weekStartDate ? format(parseDateString(weekStartDate), 'MMM d, yyyy') : ''

  const handleAssignMember = async (member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }) => {
    if (!ddsSchedule) {
      if (!ddsRole) return
      try {
        const newSchedule = await createSchedule.mutateAsync({
          dutyRoleId: ddsRole.id,
          weekStartDate,
        })
        await createAssignment.mutateAsync({
          scheduleId: newSchedule.id,
          data: { memberId: member.id },
        })
        toast.success(`Assigned ${member.rank} ${member.lastName} as DDS`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to assign DDS'
        toast.error(message)
      }
    } else {
      try {
        if (currentAssignment) {
          await deleteAssignment.mutateAsync({
            scheduleId: ddsSchedule.id,
            assignmentId: currentAssignment.id,
          })
        }
        await createAssignment.mutateAsync({
          scheduleId: ddsSchedule.id,
          data: { memberId: member.id },
        })
        toast.success(`Assigned ${member.rank} ${member.lastName} as DDS`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to assign DDS'
        toast.error(message)
      }
    }
  }

  const handleRemoveAssignment = async () => {
    if (!ddsSchedule || !currentAssignment) return
    try {
      await deleteAssignment.mutateAsync({
        scheduleId: ddsSchedule.id,
        assignmentId: currentAssignment.id,
      })
      toast.success('DDS assignment removed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove assignment'
      toast.error(message)
    }
    setIsRemoveDialogOpen(false)
  }

  const handlePublish = async () => {
    if (!ddsSchedule) return
    try {
      await publishSchedule.mutateAsync(ddsSchedule.id)
      toast.success('Schedule published')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish schedule'
      toast.error(message)
    }
  }

  const handleEdit = async () => {
    if (!ddsSchedule) return
    try {
      await revertToDraft.mutateAsync(ddsSchedule.id)
      toast.success('Schedule reverted to draft')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revert schedule'
      toast.error(message)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              DDS — Week of {weekLabel}
            </DialogTitle>
            <DialogDescription>
              Manage the Duty Day Staff assignment for this week.
            </DialogDescription>
          </DialogHeader>

          {!ddsSchedule || !currentAssignment ? (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-base-content/60 mb-4">No DDS assigned for this week</p>
              <button
                className="btn btn-primary btn-md"
                onClick={() => setIsMemberPickerOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign DDS
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {currentAssignment.member.rank} {currentAssignment.member.firstName}{' '}
                      {currentAssignment.member.lastName}
                    </p>
                    <p className="text-sm text-base-content/60">
                      {currentAssignment.member.serviceNumber}
                    </p>
                  </div>
                </div>
                {ddsSchedule.status === 'published' ? (
                  <AppBadge status="success">Published</AppBadge>
                ) : (
                  <AppBadge status="warning">Draft</AppBadge>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {ddsSchedule.status === 'draft' && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setIsMemberPickerOpen(true)}
                    >
                      Change
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setIsRemoveDialogOpen(true)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handlePublish}
                      disabled={publishSchedule.isPending}
                    >
                      {publishSchedule.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Publish
                    </button>
                  </>
                )}
                {ddsSchedule.status === 'published' && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleEdit}
                    disabled={revertToDraft.isPending}
                  >
                    {revertToDraft.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4 mr-1" />
                    )}
                    Edit
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MemberPickerModal
        open={isMemberPickerOpen}
        onOpenChange={setIsMemberPickerOpen}
        onSelect={handleAssignMember}
        title="Assign DDS"
        description="Select a qualified member to be DDS for this week"
        filterQualification="DDS"
      />

      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove DDS Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              {currentAssignment
                ? `${currentAssignment.member.rank} ${currentAssignment.member.firstName} ${currentAssignment.member.lastName}`
                : 'the current DDS'}{' '}
              from this week&apos;s schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAssignment}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
