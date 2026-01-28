'use client'

import { useState } from 'react'
import { User, Plus, Check, Loader2, AlertCircle } from 'lucide-react'
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
  useCreateSchedule,
  useCreateAssignment,
  usePublishSchedule,
  useDutyRoles,
} from '@/hooks/use-schedules'

interface DdsScheduleCardProps {
  weekStartDate: string
}

export function DdsScheduleCard({ weekStartDate }: DdsScheduleCardProps) {
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

  const { data: dutyRoles } = useDutyRoles()
  const { data: schedules, isLoading } = useSchedulesByWeek(weekStartDate)

  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()
  const publishSchedule = usePublishSchedule()

  // Find DDS duty role and schedule
  const ddsRole = dutyRoles?.data?.find((r) => r.code === 'DDS')
  const ddsSchedule = schedules?.data?.find((s) => s.dutyRole.code === 'DDS')

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
    // This would require fetching the full schedule to get the assignment ID
    // For now, we'll show a placeholder
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
        {!ddsSchedule ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
            <AlertCircle className="h-8 w-8 text-base-content/60 mb-2" />
            <p className="text-base-content/60 mb-4">No DDS schedule for this week</p>
            <Button onClick={() => setIsMemberPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign DDS
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* This is a simplified view - in real implementation, fetch assignments */}
            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">DDS Assigned</p>
                  <p className="text-sm text-base-content/60">Schedule created for this week</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsMemberPickerOpen(true)}>
                  Change
                </Button>
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
              This will remove the current DDS assignment. You can assign a new DDS afterwards.
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
