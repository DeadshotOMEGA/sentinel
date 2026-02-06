'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Users, Plus, X, Check, Loader2, Pencil, AlertCircle } from 'lucide-react'
import {
  AppCard,
  AppCardContent,
  AppCardDescription,
  AppCardHeader,
  AppCardTitle,
  AppCardAction,
} from '@/components/ui/AppCard'
import { AppBadge } from '@/components/ui/AppBadge'
import { Chip } from '@/components/ui/chip'
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
  useCreateSchedule,
  useCreateAssignment,
  useDeleteAssignment,
  usePublishSchedule,
  useRevertToDraft,
  useDutyRoles,
  useDutyRolePositions,
} from '@/hooks/use-schedules'

interface DutyWatchCardProps {
  weekStartDate: string
  /** Pre-fetched schedules data (from WeekColumn). If provided, skips internal fetch. */
  schedules?: ReturnType<typeof useSchedulesByWeek>['data']
  /** Pre-fetched duty roles data (from WeekColumn). If provided, skips internal fetch. */
  dutyRoles?: ReturnType<typeof useDutyRoles>['data']
  /** External loading state when data is passed from parent */
  isLoading?: boolean
}

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
        <Chip
          variant="flat"
          color={assignment ? 'primary' : 'default'}
          size="sm"
          className="w-16 justify-center"
        >
          {position.code}
        </Chip>
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

export function DutyWatchCard({
  weekStartDate,
  schedules: externalSchedules,
  dutyRoles: externalDutyRoles,
  isLoading: externalLoading,
}: DutyWatchCardProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [removeAssignmentId, setRemoveAssignmentId] = useState<string | null>(null)

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

  // Find Duty Watch role and schedule
  const dutyWatchRole = dutyRoles?.data?.find((r) => r.code === 'DUTY_WATCH')
  const dutyWatchSchedule = schedules?.data?.find((s) => s.dutyRole.code === 'DUTY_WATCH')
  const { data: positions, isLoading: positionsLoading } = useDutyRolePositions(
    dutyWatchRole?.id || ''
  )

  // Derive positions list from API data, sorted by displayOrder
  const positionsList = useMemo(() => {
    if (!positions?.data) return []
    return [...positions.data]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p) => ({
        code: p.code,
        qualificationCode: p.code,
        name: p.name,
        required: true,
        maxSlots: p.maxSlots,
      }))
  }, [positions?.data])

  // Build assignments map from schedule data, keyed by position code (supports multiple per position)
  type AssignmentEntry = {
    id: string
    member: { id: string; firstName: string; lastName: string; rank: string }
  }
  const assignmentsByPosition: Record<string, AssignmentEntry[]> = {}
  if (dutyWatchSchedule?.assignments) {
    for (const assignment of dutyWatchSchedule.assignments) {
      if (assignment.dutyPosition) {
        const code = assignment.dutyPosition.code
        if (!assignmentsByPosition[code]) {
          assignmentsByPosition[code] = []
        }
        assignmentsByPosition[code].push({
          id: assignment.id,
          member: assignment.member,
        })
      }
    }
  }

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
      toast.success(`Assigned ${member.rank} ${member.lastName} to ${selectedPosition}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign member'
      toast.error(message)
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
      toast.success('Assignment removed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove assignment'
      toast.error(message)
    }

    setRemoveAssignmentId(null)
  }

  const handlePublish = async () => {
    if (!dutyWatchSchedule) return
    try {
      await publishSchedule.mutateAsync(dutyWatchSchedule.id)
      toast.success('Duty Watch schedule published')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish schedule'
      toast.error(message)
    }
  }

  const handleEdit = async () => {
    if (!dutyWatchSchedule) return
    try {
      await revertToDraft.mutateAsync(dutyWatchSchedule.id)
      toast.success('Schedule reverted to draft')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revert schedule'
      toast.error(message)
    }
  }

  const assignedMemberIds = dutyWatchSchedule?.assignments?.map((a) => a.memberId) ?? []
  const missingRequired = positionsList
    .filter((p) => p.required)
    .reduce(
      (count, p) => count + Math.max(0, p.maxSlots - (assignmentsByPosition[p.code]?.length ?? 0)),
      0
    )

  if (isError) {
    return (
      <AppCard status="error">
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duty Watch Team
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

  if (isLoading || positionsLoading) {
    return (
      <AppCard>
        <AppCardHeader>
          <AppCardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duty Watch Team
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-base-content/60" />
        </AppCardContent>
      </AppCard>
    )
  }

  const cardStatus =
    dutyWatchSchedule?.status === 'published'
      ? ('success' as const)
      : dutyWatchSchedule
        ? ('warning' as const)
        : undefined

  return (
    <AppCard status={cardStatus}>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <AppCardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Duty Watch Team
            </AppCardTitle>
            <AppCardDescription>
              Tuesday &amp; Thursday evening watch. Responsible for lockup on those nights.
            </AppCardDescription>
          </div>
          <AppCardAction>
            <div className="flex items-center gap-2">
              {dutyWatchSchedule && (
                <AppBadge status={dutyWatchSchedule.status === 'published' ? 'success' : 'warning'}>
                  {dutyWatchSchedule.status}
                </AppBadge>
              )}
              {missingRequired > 0 && (
                <AppBadge status="error">{missingRequired} required</AppBadge>
              )}
            </div>
          </AppCardAction>
        </div>
      </AppCardHeader>
      <AppCardContent>
        <div className="space-y-2">
          {positionsList.flatMap((position) => {
            const positionAssignments = assignmentsByPosition[position.code] ?? []
            const filledSlots = positionAssignments.map((assignment, idx) => (
              <PositionSlot
                key={`${position.code}-${idx}`}
                position={position}
                assignment={assignment}
                onAssign={() => handleAssignPosition(position.code)}
                onRemove={() => setRemoveAssignmentId(assignment.id)}
                disabled={createAssignment.isPending || deleteAssignment.isPending}
              />
            ))
            const emptySlotCount = position.maxSlots - positionAssignments.length
            const emptySlots = Array.from({ length: emptySlotCount }, (_, idx) => (
              <PositionSlot
                key={`${position.code}-empty-${idx}`}
                position={position}
                assignment={null}
                onAssign={() => handleAssignPosition(position.code)}
                onRemove={() => {}}
                disabled={createAssignment.isPending || deleteAssignment.isPending}
              />
            ))
            return [...filledSlots, ...emptySlots]
          })}
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

        {dutyWatchSchedule && dutyWatchSchedule.status === 'published' && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={handleEdit} disabled={revertToDraft.isPending}>
              {revertToDraft.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Edit Schedule
            </Button>
          </div>
        )}

        {!dutyWatchSchedule && (
          <div className="mt-4 pt-4 border-t text-center text-sm text-base-content/60">
            Assign members to positions to create the Duty Watch schedule
          </div>
        )}
      </AppCardContent>

      <MemberPickerModal
        open={isMemberPickerOpen}
        onOpenChange={setIsMemberPickerOpen}
        onSelect={handleMemberSelect}
        title={`Assign ${selectedPosition}`}
        description="Select a qualified member for this position"
        filterQualification={
          positionsList.find((p) => p.code === selectedPosition)?.qualificationCode
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
    </AppCard>
  )
}
