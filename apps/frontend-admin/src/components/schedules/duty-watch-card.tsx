'use client'

import { useState } from 'react'
import { Users, Plus, X, Check, Loader2 } from 'lucide-react'
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
  useDeleteAssignment,
  usePublishSchedule,
  useDutyRoles,
  useDutyRolePositions,
} from '@/hooks/use-schedules'

interface DutyWatchCardProps {
  weekStartDate: string
}

// Duty Watch positions in display order
const DUTY_WATCH_POSITIONS = [
  { code: 'SWK', name: 'Senior Warden of the Keys', required: true },
  { code: 'DSWK', name: 'Deputy Senior Warden', required: true },
  { code: 'QM', name: 'Quartermaster', required: true },
  { code: 'BM', name: 'Bosun Mate', required: true },
  { code: 'APS', name: 'Assistant Petty Sailor', required: false },
]

interface PositionSlotProps {
  position: { code: string; name: string; required: boolean }
  assignment: {
    id: string
    member: { id: string; firstName: string; lastName: string; rank: string }
  } | null
  onAssign: () => void
  onRemove: () => void
  disabled?: boolean
}

function PositionSlot({ position, assignment, onAssign, onRemove, disabled }: PositionSlotProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg border">
      <div className="flex items-center gap-3">
        <Badge variant={assignment ? 'default' : 'outline'} className="w-16 justify-center">
          {position.code}
        </Badge>
        <div>
          <p className="font-medium text-sm">
            {assignment
              ? `${assignment.member.rank} ${assignment.member.firstName} ${assignment.member.lastName}`
              : position.name}
          </p>
          {!assignment && (
            <p className="text-xs text-base-content/60">
              {position.required ? 'Required' : 'Optional'}
            </p>
          )}
        </div>
      </div>
      <div>
        {assignment ? (
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onAssign} disabled={disabled}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function DutyWatchCard({ weekStartDate }: DutyWatchCardProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [removeAssignmentId, setRemoveAssignmentId] = useState<string | null>(null)

  const { data: dutyRoles } = useDutyRoles()
  const { data: schedules, isLoading } = useSchedulesByWeek(weekStartDate)

  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()
  const deleteAssignment = useDeleteAssignment()
  const publishSchedule = usePublishSchedule()

  // Find Duty Watch role and schedule
  const dutyWatchRole = dutyRoles?.data?.find((r) => r.code === 'DUTY_WATCH')
  const dutyWatchSchedule = schedules?.data?.find((s) => s.dutyRole.code === 'DUTY_WATCH')
  const { data: positions } = useDutyRolePositions(dutyWatchRole?.id || '')

  // Mock assignments for now - in real implementation, fetch schedule with assignments
  const assignments: Record<
    string,
    { id: string; member: { id: string; firstName: string; lastName: string; rank: string } }
  > = {}

  const handleAssignPosition = (positionCode: string) => {
    setSelectedPosition(positionCode)
    setIsMemberPickerOpen(true)
  }

  const handleMemberSelect = async (member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }) => {
    if (!dutyWatchRole) return

    const position = positions?.data?.find((p) => p.code === selectedPosition)

    try {
      let scheduleId = dutyWatchSchedule?.id

      // Create schedule if it doesn't exist
      if (!scheduleId) {
        const newSchedule = await createSchedule.mutateAsync({
          dutyRoleId: dutyWatchRole.id,
          weekStartDate,
        })
        scheduleId = newSchedule.id
      }

      // Create assignment
      await createAssignment.mutateAsync({
        scheduleId,
        data: {
          memberId: member.id,
          dutyPositionId: position?.id || null,
        },
      })
    } catch (error) {
      console.error('Failed to assign member:', error)
    }

    setSelectedPosition(null)
  }

  const handleRemoveAssignment = async () => {
    if (!dutyWatchSchedule || !removeAssignmentId) return

    try {
      await deleteAssignment.mutateAsync({
        scheduleId: dutyWatchSchedule.id,
        assignmentId: removeAssignmentId,
      })
    } catch (error) {
      console.error('Failed to remove assignment:', error)
    }

    setRemoveAssignmentId(null)
  }

  const handlePublish = async () => {
    if (!dutyWatchSchedule) return
    try {
      await publishSchedule.mutateAsync(dutyWatchSchedule.id)
    } catch (error) {
      console.error('Failed to publish schedule:', error)
    }
  }

  const assignedMemberIds = Object.values(assignments).map((a) => a.member.id)
  const missingRequired = DUTY_WATCH_POSITIONS.filter(
    (p) => p.required && !assignments[p.code]
  ).length

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duty Watch Team
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
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
              <Users className="h-5 w-5" />
              Duty Watch Team
            </CardTitle>
            <CardDescription>
              Tuesday &amp; Thursday evening watch. Responsible for lockup on those nights.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {dutyWatchSchedule && (
              <Badge variant={dutyWatchSchedule.status === 'published' ? 'default' : 'secondary'}>
                {dutyWatchSchedule.status}
              </Badge>
            )}
            {missingRequired > 0 && <Badge variant="destructive">{missingRequired} required</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {DUTY_WATCH_POSITIONS.map((position) => (
            <PositionSlot
              key={position.code}
              position={position}
              assignment={assignments[position.code] || null}
              onAssign={() => handleAssignPosition(position.code)}
              onRemove={() => {
                const assignment = assignments[position.code]
                if (assignment) setRemoveAssignmentId(assignment.id)
              }}
              disabled={createAssignment.isPending || deleteAssignment.isPending}
            />
          ))}
        </div>

        {dutyWatchSchedule && dutyWatchSchedule.status === 'draft' && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handlePublish}
              disabled={publishSchedule.isPending || missingRequired > 0}
            >
              {publishSchedule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Publish Schedule
            </Button>
          </div>
        )}

        {!dutyWatchSchedule && (
          <div className="mt-4 pt-4 border-t text-center text-sm text-base-content/60">
            Assign members to positions to create the Duty Watch schedule
          </div>
        )}
      </CardContent>

      <MemberPickerModal
        open={isMemberPickerOpen}
        onOpenChange={setIsMemberPickerOpen}
        onSelect={handleMemberSelect}
        title={`Assign ${selectedPosition}`}
        description="Select a qualified member for this position"
        filterQualification={
          selectedPosition === 'SWK' || selectedPosition === 'DSWK' ? selectedPosition : undefined
        }
        excludeMemberIds={assignedMemberIds}
      />

      <AlertDialog open={!!removeAssignmentId} onOpenChange={() => setRemoveAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the member from this position. You can assign someone else
              afterwards.
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
