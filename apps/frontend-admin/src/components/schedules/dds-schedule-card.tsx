'use client'

import { useState } from 'react'
import { User, Plus, Check, Loader2, AlertCircle, X, Pencil } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
}

function formatMemberName(member: { rank: string; firstName: string; lastName: string }): string {
  return `${member.rank} ${member.firstName} ${member.lastName}`
}

export function DdsScheduleCard({ weekStartDate }: DdsScheduleCardProps) {
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  const { data: dutyRoles } = useDutyRoles()
  const { data: schedules, isLoading } = useSchedulesByWeek(weekStartDate)

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
      } catch (error) {
        console.error('Failed to assign DDS:', error)
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
      } catch (error) {
        console.error('Failed to assign DDS:', error)
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
    } catch (error) {
      console.error('Failed to remove DDS assignment:', error)
    }
    setIsRemoveDialogOpen(false)
  }

  const handlePublish = async () => {
    if (!ddsSchedule) return
    try {
      await publishSchedule.mutateAsync(ddsSchedule.id)
    } catch (error) {
      console.error('Failed to publish schedule:', error)
    }
  }

  const handleEdit = async () => {
    if (!ddsSchedule) return
    try {
      await revertToDraft.mutateAsync(ddsSchedule.id)
    } catch (error) {
      console.error('Failed to revert schedule to draft:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            DDS (Duty Day Staff)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              DDS (Duty Day Staff)
            </CardTitle>
            <CardDescription>Assigned for the week. Responsible for daily lockup.</CardDescription>
          </div>
          {ddsSchedule && (
            <Badge variant={ddsSchedule.status === 'published' ? 'default' : 'secondary'}>
              {ddsSchedule.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRemoveDialogOpen(true)}
                    >
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
                  <Button variant="outline" size="sm" onClick={handleEdit} disabled={revertToDraft.isPending}>
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
      </CardContent>

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
              This will remove {currentAssignment ? formatMemberName(currentAssignment.member) : 'the current DDS'} from this week&apos;s schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAssignment}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
