'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Users, Plus, X, Check, Pencil, AlertCircle, UserX, UserCheck } from 'lucide-react'
import { LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import { useQualificationTypes } from '@/hooks/use-qualifications'
import type { ChipVariant, ChipColor } from '@/components/ui/chip'
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
  useUpdateAssignment,
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
    status: 'assigned' | 'confirmed' | 'released'
    member: { id: string; firstName: string; lastName: string; rank: string }
  } | null
  chipVariant?: ChipVariant
  chipColor?: ChipColor
  isPublished: boolean
  onAssign: () => void
  onRemove: () => void
  onMarkUnfilled: () => void
  onMarkFilled: () => void
  disabled?: boolean
}

function PositionSlot({
  position,
  assignment,
  chipVariant,
  chipColor,
  isPublished,
  onAssign,
  onRemove,
  onMarkUnfilled,
  onMarkFilled,
  disabled,
}: PositionSlotProps) {
  const isUnfilled = assignment?.status === 'released'

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-lg',
        assignment
          ? isUnfilled
            ? 'bg-error/10 border border-error/30'
            : 'bg-base-200/50 border'
          : 'border-2 border-dashed'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Chip
          variant={chipVariant || 'flat'}
          color={chipColor || 'default'}
          size="sm"
          className="w-16 shrink-0 justify-center"
        >
          {position.code}
        </Chip>
        <div className="min-w-0">
          <p className={cn('font-medium text-sm truncate', isUnfilled && 'line-through text-base-content/50')}>
            {assignment
              ? `${assignment.member.rank} ${assignment.member.lastName}, ${assignment.member.firstName}`
              : position.name}
          </p>
          {isUnfilled && (
            <p className="text-xs text-error font-medium">Unfilled</p>
          )}
          {!assignment && (
            <p className="text-xs text-base-content/60">
              {position.required ? 'Required' : 'Optional'}
            </p>
          )}
        </div>
      </div>

      {/* Empty slot: show assign button (draft only) */}
      {!assignment && !isPublished && (
        <button
          className="btn btn-circle btn-sm btn-success btn-outline shrink-0"
          onClick={onAssign}
          disabled={disabled}
          title="Assign member"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {/* Filled slot actions */}
      {assignment && (
        <div className="flex items-center gap-1 shrink-0">
          {isUnfilled ? (
            /* Restore: always available on unfilled slots */
            <button
              className="btn btn-circle btn-sm btn-success btn-outline"
              onClick={onMarkFilled}
              disabled={disabled}
              title="Mark as filled"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          ) : (
            /* Mark unfilled: available in both draft and published */
            <button
              className="btn btn-circle btn-sm btn-warning btn-outline"
              onClick={onMarkUnfilled}
              disabled={disabled}
              title="Mark as unfilled"
            >
              <UserX className="h-4 w-4" />
            </button>
          )}
          {/* Remove entirely: draft only */}
          {!isPublished && (
            <button
              className="btn btn-circle btn-sm btn-error btn-outline"
              onClick={onRemove}
              disabled={disabled}
              title="Remove assignment"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
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

  // Fetch qualification types for chip styling lookup
  const { data: qualificationTypes } = useQualificationTypes()
  const qualChipStyleByCode = useMemo(() => {
    const map = new Map<string, { variant: ChipVariant; color: ChipColor }>()
    if (qualificationTypes) {
      for (const qt of qualificationTypes) {
        if (qt.tag) {
          map.set(qt.code, {
            variant: (qt.tag.chipVariant as ChipVariant) || 'solid',
            color: (qt.tag.chipColor as ChipColor) || 'default',
          })
        }
      }
    }
    return map
  }, [qualificationTypes])

  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()
  const deleteAssignment = useDeleteAssignment()
  const updateAssignment = useUpdateAssignment()
  const publishSchedule = usePublishSchedule()
  const revertToDraft = useRevertToDraft()

  // Find Duty Watch role and schedule
  const dutyWatchRole = dutyRoles?.data?.find((r) => r.code === 'DUTY_WATCH')
  const dutyWatchSchedule = schedules?.data?.find((s) => s.dutyRole.code === 'DUTY_WATCH')
  const { data: positions, isLoading: positionsLoading } = useDutyRolePositions(
    dutyWatchRole?.id || ''
  )

  const isPublished = dutyWatchSchedule?.status === 'published'

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
    status: 'assigned' | 'confirmed' | 'released'
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
          status: assignment.status as 'assigned' | 'confirmed' | 'released',
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
      toast.success(
        `Assigned ${member.rank} ${member.lastName}, ${member.firstName} to ${selectedPosition}`
      )
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

  const handleMarkUnfilled = async (assignmentId: string, memberName: string) => {
    if (!dutyWatchSchedule) return
    try {
      await updateAssignment.mutateAsync({
        scheduleId: dutyWatchSchedule.id,
        assignmentId,
        data: { status: 'released' },
      })
      toast.warning(`${memberName} marked as unfilled`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update assignment'
      toast.error(message)
    }
  }

  const handleMarkFilled = async (assignmentId: string, memberName: string) => {
    if (!dutyWatchSchedule) return
    try {
      await updateAssignment.mutateAsync({
        scheduleId: dutyWatchSchedule.id,
        assignmentId,
        data: { status: 'assigned' },
      })
      toast.success(`${memberName} restored to duty watch`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update assignment'
      toast.error(message)
    }
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

  // Only count non-released assignments as filling a slot
  const assignedMemberIds = dutyWatchSchedule?.assignments?.map((a) => a.memberId) ?? []
  const missingRequired = positionsList
    .filter((p) => p.required)
    .reduce((count, p) => {
      const activeAssignments = (assignmentsByPosition[p.code] ?? []).filter(
        (a) => a.status !== 'released'
      )
      return count + Math.max(0, p.maxSlots - activeAssignments.length)
    }, 0)

  const isMutating =
    createAssignment.isPending || deleteAssignment.isPending || updateAssignment.isPending

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
          <LoadingSpinner size="md" />
        </AppCardContent>
      </AppCard>
    )
  }

  const cardStatus = dutyWatchSchedule?.status === 'draft' ? ('warning' as const) : undefined

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
                <AppBadge status={isPublished ? 'success' : 'warning'}>
                  {isPublished ? 'Published' : 'Draft'}
                </AppBadge>
              )}
              {missingRequired > 0 && (
                <AppBadge status="error" className="whitespace-nowrap">
                  {missingRequired} Required
                </AppBadge>
              )}
            </div>
          </AppCardAction>
        </div>
      </AppCardHeader>
      <AppCardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {positionsList.flatMap((position) => {
            const positionAssignments = assignmentsByPosition[position.code] ?? []
            const chipStyle = qualChipStyleByCode.get(position.code)

            const filledSlots = positionAssignments.map((assignment, idx) => (
              <PositionSlot
                key={`${position.code}-${idx}`}
                position={position}
                assignment={assignment}
                chipVariant={chipStyle?.variant}
                chipColor={chipStyle?.color}
                isPublished={!!isPublished}
                onAssign={() => handleAssignPosition(position.code)}
                onRemove={() => setRemoveAssignmentId(assignment.id)}
                onMarkUnfilled={() =>
                  handleMarkUnfilled(
                    assignment.id,
                    `${assignment.member.rank} ${assignment.member.lastName}`
                  )
                }
                onMarkFilled={() =>
                  handleMarkFilled(
                    assignment.id,
                    `${assignment.member.rank} ${assignment.member.lastName}`
                  )
                }
                disabled={isMutating}
              />
            ))

            // In published mode, don't show empty slots for released assignments
            // (they're visually represented as "Unfilled" on the filled slot)
            const activeCount = isPublished
              ? positionAssignments.filter((a) => a.status !== 'released').length
              : positionAssignments.length
            const emptySlotCount = isPublished ? 0 : position.maxSlots - activeCount
            const emptySlots = Array.from({ length: emptySlotCount }, (_, idx) => (
              <PositionSlot
                key={`${position.code}-empty-${idx}`}
                position={position}
                assignment={null}
                chipVariant={chipStyle?.variant}
                chipColor={chipStyle?.color}
                isPublished={!!isPublished}
                onAssign={() => handleAssignPosition(position.code)}
                onRemove={() => {}}
                onMarkUnfilled={() => {}}
                onMarkFilled={() => {}}
                disabled={isMutating}
              />
            ))
            return [...filledSlots, ...emptySlots]
          })}
        </div>

        {dutyWatchSchedule && dutyWatchSchedule.status === 'draft' && (
          <div className="mt-4 flex justify-end">
            <button
              className="btn btn-primary btn-md"
              onClick={handlePublish}
              disabled={publishSchedule.isPending || missingRequired > 0}
            >
              {publishSchedule.isPending ? (
                <ButtonSpinner />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Publish Schedule
            </button>
          </div>
        )}

        {dutyWatchSchedule && dutyWatchSchedule.status === 'published' && (
          <div className="mt-4 flex justify-end">
            <button
              className="btn btn-outline btn-md"
              onClick={handleEdit}
              disabled={revertToDraft.isPending}
            >
              {revertToDraft.isPending ? (
                <ButtonSpinner />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Edit Schedule
            </button>
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
