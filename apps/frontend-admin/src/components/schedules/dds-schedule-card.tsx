'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { User, Plus, Check, Loader2, AlertCircle, X, Pencil } from 'lucide-react'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
  AppCardAction,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { Button } from '@/components/ui/button'
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
import { MemberPickerModal } from './member-picker-modal'
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

interface DdsScheduleCardProps {
  weekStartDate: string
  /** Pre-fetched schedules data (from WeekColumn). If provided, skips internal fetch. */
  schedules?: ReturnType<typeof useSchedulesByWeek>['data']
  /** Pre-fetched duty roles data (from WeekColumn). If provided, skips internal fetch. */
  dutyRoles?: ReturnType<typeof useDutyRoles>['data']
  /** External loading state when data is passed from parent */
  isLoading?: boolean
}

function formatMemberName(member: { rank: string; firstName: string; lastName: string }): string {
  return `${member.rank} ${member.firstName} ${member.lastName}`
}

export function DdsScheduleCard({
  weekStartDate,
  schedules: externalSchedules,
  dutyRoles: externalDutyRoles,
  isLoading: externalLoading,
}: DdsScheduleCardProps) {
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  // Use passed data if available, otherwise fetch internally
  const internalDutyRoles = useDutyRoles()
  const internalSchedules = useSchedulesByWeek(weekStartDate)

  const dutyRoles = externalDutyRoles ?? internalDutyRoles.data
  const schedules = externalSchedules ?? internalSchedules.data
  const isLoading = externalLoading ?? internalSchedules.isLoading
  const isError = !externalSchedules && internalSchedules.isError
  const error = !externalSchedules ? internalSchedules.error : null

  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()
  const deleteAssignment = useDeleteAssignment()
  const publishSchedule = usePublishSchedule()
  const revertToDraft = useRevertToDraft()

  // Find DDS duty role and schedule
  const ddsRole = dutyRoles?.data?.find((r) => r.code === 'DDS')
  const ddsSchedule = schedules?.data?.find((s) => s.dutyRole.code === 'DDS')

  // Fetch full schedule with assignments when we have a schedule
  const { data: fullSchedule } = useSchedule(ddsSchedule?.id ?? '')

  // Get the current DDS assignment (DDS is a single-person role)
  const currentAssignment = fullSchedule?.assignments?.[0] ?? null

  const handleAssignMember = async (member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }) => {
    if (!ddsSchedule) {
      // Create schedule first, then assign
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
        toast.success(`Assigned ${member.firstName} ${member.lastName} as DDS`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to assign DDS'
        toast.error(message)
      }
    } else {
      try {
        // Remove existing assignment first if changing
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
        toast.success(`Assigned ${member.firstName} ${member.lastName} as DDS`)
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

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            DDS (Duty Day Staff)
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load schedule</span>
          </div>
          <p className="text-sm text-base-content/60 mt-1">{error?.message}</p>
        </AppCardContent>
      </AppCard>
    )
  }

  if (isLoading) {
    return (
      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            DDS (Duty Day Staff)
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
        </AppCardContent>
      </AppCard>
    )
  }

  const cardStatus =
    ddsSchedule?.status === 'published'
      ? ('success' as const)
      : ddsSchedule
        ? ('warning' as const)
        : undefined

  return (
    <AppCard status={cardStatus}>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <AppCardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              DDS (Duty Day Staff)
            </AppCardTitle>
            <AppCardDescription>
              Assigned for the week. Responsible for daily lockup.
            </AppCardDescription>
          </div>
          {ddsSchedule && (
            <AppCardAction>
              <AppBadge status={ddsSchedule.status === 'published' ? 'success' : 'warning'}>
                {ddsSchedule.status}
              </AppBadge>
            </AppCardAction>
          )}
        </div>
      </AppCardHeader>
      <AppCardContent>
        {!ddsSchedule || !currentAssignment ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-8 w-8 text-base-content/60 mb-2" />
            <p className="text-base-content/60 mb-4">No DDS assigned for this week</p>
            <Button onClick={() => setIsMemberPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign DDS
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{formatMemberName(currentAssignment.member)}</p>
                  <p className="text-sm text-base-content/60">
                    {currentAssignment.member.serviceNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ddsSchedule.status === 'draft' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsMemberPickerOpen(true)}>
                      Change
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsRemoveDialogOpen(true)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {ddsSchedule.status === 'draft' && (
                  <Button size="sm" onClick={handlePublish} disabled={publishSchedule.isPending}>
                    {publishSchedule.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Publish
                  </Button>
                )}
                {ddsSchedule.status === 'published' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    disabled={revertToDraft.isPending}
                  >
                    {revertToDraft.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4 mr-1" />
                    )}
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </AppCardContent>

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
              {currentAssignment ? formatMemberName(currentAssignment.member) : 'the current DDS'}{' '}
              from this week&apos;s schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAssignment}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppCard>
  )
}
