'use client'

import { useState, useMemo, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { Users, Check, Loader2, Pencil, Plus } from 'lucide-react'
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
import { DwPositionGrid } from './dw-position-grid'
import {
  useSchedulesByWeek,
  useCreateSchedule,
  useCreateAssignment,
  useDeleteAssignment,
  usePublishSchedule,
  useRevertToDraft,
  useDutyRoles,
  useDutyRolePositions,
  useDwOverrides,
  useCreateDwOverride,
  useDeleteDwOverride,
} from '@/hooks/use-schedules'
import { useModalContext } from './modal-context'
import { parseDateString } from '@/lib/date-utils'

type TabKey = 'base' | 'tuesday' | 'thursday'

export function DutyWatchModal() {
  const { modal, closeModal } = useModalContext()
  const isOpen = modal.type === 'duty-watch' && modal.weekStartDate !== null
  const weekStartDate = modal.weekStartDate ?? ''

  const [activeTab, setActiveTab] = useState<TabKey>('base')
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [removeType, setRemoveType] = useState<'assignment' | 'override'>('assignment')

  // Auto-select tab from nightDate
  useEffect(() => {
    if (!modal.nightDate) {
      setActiveTab('base')
      return
    }
    const d = parseDateString(modal.nightDate)
    const day = d.getDay()
    if (day === 2) setActiveTab('tuesday')
    else if (day === 4) setActiveTab('thursday')
    else setActiveTab('base')
  }, [modal.nightDate, modal.weekStartDate])

  const { data: dutyRolesData } = useDutyRoles()
  const { data: schedulesData } = useSchedulesByWeek(weekStartDate)

  const dutyWatchRole = dutyRolesData?.data?.find((r) => r.code === 'DUTY_WATCH')
  const dutyWatchSchedule = schedulesData?.data?.find((s) => s.dutyRole.code === 'DUTY_WATCH')
  const { data: positions } = useDutyRolePositions(dutyWatchRole?.id ?? '')

  // Compute Tuesday/Thursday dates from weekStartDate
  const tuesdayDate = weekStartDate
    ? format(addDays(parseDateString(weekStartDate), 1), 'yyyy-MM-dd')
    : ''
  const thursdayDate = weekStartDate
    ? format(addDays(parseDateString(weekStartDate), 3), 'yyyy-MM-dd')
    : ''

  const activeNightDate =
    activeTab === 'tuesday' ? tuesdayDate : activeTab === 'thursday' ? thursdayDate : ''

  // Fetch overrides for the active night tab
  const { data: overridesData } = useDwOverrides(
    dutyWatchSchedule?.id ?? '',
    activeNightDate || undefined
  )

  const createSchedule = useCreateSchedule()
  const createAssignment = useCreateAssignment()
  const deleteAssignment = useDeleteAssignment()
  const publishSchedule = usePublishSchedule()
  const revertToDraft = useRevertToDraft()
  const createDwOverride = useCreateDwOverride()
  const deleteDwOverride = useDeleteDwOverride()

  const weekLabel = weekStartDate ? format(parseDateString(weekStartDate), 'MMM d, yyyy') : ''

  const positionsData = positions?.data
  const positionsList = useMemo(() => {
    if (!positionsData) return []
    return [...positionsData]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p) => ({
        id: p.id,
        code: p.code,
        qualificationCode: p.code,
        name: p.name,
        required: true,
        maxSlots: p.maxSlots,
      }))
  }, [positionsData])

  // Build slots for BASE tab
  const baseSlotsByPosition = useMemo(() => {
    const result: Record<
      string,
      Array<{
        id: string
        member: { id: string; firstName: string; lastName: string; rank: string }
      }>
    > = {}
    if (!dutyWatchSchedule?.assignments) return result
    for (const assignment of dutyWatchSchedule.assignments) {
      if (assignment.dutyPosition) {
        const code = (assignment.dutyPosition as { code: string }).code
        if (!result[code]) result[code] = []
        result[code].push({
          id: assignment.id,
          member: assignment.member,
        })
      }
    }
    return result
  }, [dutyWatchSchedule?.assignments])

  // Build merged slots for NIGHT tabs (base + overrides)
  const nightSlotsByPosition = useMemo(() => {
    const result: Record<
      string,
      Array<{
        id: string
        member: { id: string; firstName: string; lastName: string; rank: string }
        isOverride?: boolean
        overrideType?: 'replace' | 'add' | 'remove'
      }>
    > = {}

    // Start with base assignments
    if (dutyWatchSchedule?.assignments) {
      for (const assignment of dutyWatchSchedule.assignments) {
        if (assignment.dutyPosition) {
          const code = (assignment.dutyPosition as { code: string }).code
          if (!result[code]) result[code] = []
          result[code].push({
            id: assignment.id,
            member: assignment.member,
          })
        }
      }
    }

    // Apply overrides
    const overrides = overridesData?.data ?? []
    for (const override of overrides) {
      const posCode = override.dutyPosition.code
      if (!result[posCode]) result[posCode] = []

      if (override.overrideType === 'remove' && override.baseMemberId) {
        // Remove the base member slot
        result[posCode] = result[posCode].filter(
          (s) => !(!s.isOverride && s.member.id === override.baseMemberId)
        )
      } else if (override.overrideType === 'replace' && override.baseMemberId && override.member) {
        // Replace: swap base member for override member
        result[posCode] = result[posCode].map((s) => {
          if (!s.isOverride && s.member.id === override.baseMemberId && override.member) {
            return {
              id: override.id,
              member: override.member,
              isOverride: true,
              overrideType: 'replace' as const,
            }
          }
          return s
        })
      } else if (override.overrideType === 'add' && override.member) {
        // Add: extra member
        result[posCode].push({
          id: override.id,
          member: override.member,
          isOverride: true,
          overrideType: 'add' as const,
        })
      }
    }

    return result
  }, [dutyWatchSchedule?.assignments, overridesData?.data])

  const assignedMemberIds =
    dutyWatchSchedule?.assignments?.map((a) => (a as { memberId: string }).memberId) ?? []

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
      if (activeTab === 'base') {
        // Base tab: create assignment
        let scheduleId = dutyWatchSchedule?.id
        if (!scheduleId) {
          const newSchedule = await createSchedule.mutateAsync({
            dutyRoleId: dutyWatchRole.id,
            weekStartDate,
          })
          scheduleId = newSchedule.id
        }
        await createAssignment.mutateAsync({
          scheduleId,
          data: {
            memberId: member.id,
            dutyPositionId: position?.id ?? null,
          },
        })
        toast.success(`Assigned ${member.rank} ${member.lastName} to ${selectedPosition}`)
      } else {
        // Night tab: create "add" override
        if (!dutyWatchSchedule?.id || !position?.id) return
        await createDwOverride.mutateAsync({
          scheduleId: dutyWatchSchedule.id,
          data: {
            nightDate: activeNightDate,
            dutyPositionId: position.id,
            overrideType: 'add',
            memberId: member.id,
          },
        })
        toast.success(`Added ${member.rank} ${member.lastName} for ${activeTab}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign member'
      toast.error(message)
    }
    setSelectedPosition(null)
  }

  const handleRemove = async () => {
    if (!dutyWatchSchedule || !removeId) return
    try {
      if (removeType === 'assignment') {
        await deleteAssignment.mutateAsync({
          scheduleId: dutyWatchSchedule.id,
          assignmentId: removeId,
        })
        toast.success('Assignment removed')
      } else {
        await deleteDwOverride.mutateAsync({
          scheduleId: dutyWatchSchedule.id,
          overrideId: removeId,
        })
        toast.success('Override reverted')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove'
      toast.error(message)
    }
    setRemoveId(null)
  }

  const handleRemoveForNight = (baseMemberId: string, positionId: string) => {
    if (!dutyWatchSchedule?.id) return
    createDwOverride.mutate(
      {
        scheduleId: dutyWatchSchedule.id,
        data: {
          nightDate: activeNightDate,
          dutyPositionId: positionId,
          overrideType: 'remove',
          baseMemberId,
        },
      },
      {
        onSuccess: () => toast.success('Member removed for this night'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed'),
      }
    )
  }

  const handleReplaceForNight = (baseMemberId: string, positionCode: string) => {
    // Open member picker — on select, create replace override
    setSelectedPosition(positionCode)
    // Store context for replace
    setReplaceContext({ baseMemberId })
    setIsMemberPickerOpen(true)
  }

  const [replaceContext, setReplaceContext] = useState<{ baseMemberId: string } | null>(null)

  const handleMemberSelectForReplace = async (member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }) => {
    if (!dutyWatchSchedule?.id || !replaceContext) return
    const position = positions?.data?.find((p) => p.code === selectedPosition)
    if (!position) return

    try {
      await createDwOverride.mutateAsync({
        scheduleId: dutyWatchSchedule.id,
        data: {
          nightDate: activeNightDate,
          dutyPositionId: position.id,
          overrideType: 'replace',
          baseMemberId: replaceContext.baseMemberId,
          memberId: member.id,
        },
      })
      toast.success(`Replaced member for ${activeTab}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to replace'
      toast.error(message)
    }
    setReplaceContext(null)
    setSelectedPosition(null)
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

  const isDraft = dutyWatchSchedule?.status === 'draft'
  const isPublished = dutyWatchSchedule?.status === 'published'
  const canEdit = isDraft || !dutyWatchSchedule

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Duty Watch — Week of {weekLabel}
                </DialogTitle>
                <DialogDescription>Manage base and per-night watch assignments.</DialogDescription>
              </div>
              {dutyWatchSchedule && (
                <AppBadge status={isPublished ? 'success' : 'warning'}>
                  {isPublished ? 'Published' : 'Draft'}
                </AppBadge>
              )}
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div role="tablist" className="tabs tabs-box mb-4">
            <button
              type="button"
              role="tab"
              id="tab-base"
              aria-selected={activeTab === 'base'}
              aria-controls="tabpanel-dw"
              className={`tab ${activeTab === 'base' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('base')}
            >
              Base (Tue+Thu)
            </button>
            <button
              type="button"
              role="tab"
              id="tab-tuesday"
              aria-selected={activeTab === 'tuesday'}
              aria-controls="tabpanel-dw"
              className={`tab ${activeTab === 'tuesday' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('tuesday')}
              disabled={!dutyWatchSchedule}
            >
              Tuesday
            </button>
            <button
              type="button"
              role="tab"
              id="tab-thursday"
              aria-selected={activeTab === 'thursday'}
              aria-controls="tabpanel-dw"
              className={`tab ${activeTab === 'thursday' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('thursday')}
              disabled={!dutyWatchSchedule}
            >
              Thursday
            </button>
          </div>

          {/* Tab content */}
          <div id="tabpanel-dw" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'base' ? (
              <DwPositionGrid
                positions={positionsList}
                slotsByPosition={baseSlotsByPosition}
                canEdit={canEdit}
                onAssign={handleAssignPosition}
                onRemove={(id) => {
                  setRemoveType('assignment')
                  setRemoveId(id)
                }}
                isAssigning={createAssignment.isPending}
                isRemoving={deleteAssignment.isPending}
              />
            ) : (
              <>
                <p className="text-xs text-base-content/60 mb-2">
                  Showing effective roster for{' '}
                  {activeTab === 'tuesday' ? `Tuesday ${tuesdayDate}` : `Thursday ${thursdayDate}`}.
                  Overrides are shown with dashed borders.
                </p>
                <DwPositionGrid
                  positions={positionsList}
                  slotsByPosition={nightSlotsByPosition}
                  canEdit={canEdit}
                  onAssign={handleAssignPosition}
                  onRemove={(id) => {
                    // Check if this is an override or base assignment
                    const isOverride = overridesData?.data?.some((o) => o.id === id)
                    setRemoveType(isOverride ? 'override' : 'assignment')
                    setRemoveId(id)
                  }}
                  isAssigning={createDwOverride.isPending}
                  isRemoving={deleteDwOverride.isPending}
                />

                {/* Override actions for base members on night tabs */}
                {canEdit && dutyWatchSchedule && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {positionsList.map((pos) => {
                      const baseSlots = baseSlotsByPosition[pos.code] ?? []
                      return baseSlots.map((slot) => {
                        // Check if already overridden for this night
                        const isAlreadyOverridden = overridesData?.data?.some(
                          (o) =>
                            o.baseMemberId === slot.member.id && o.dutyPosition.code === pos.code
                        )
                        if (isAlreadyOverridden) return null
                        return (
                          <div key={`override-actions-${slot.id}`} className="flex gap-1">
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleRemoveForNight(slot.member.id, pos.id)}
                              disabled={createDwOverride.isPending}
                              title={`Remove ${slot.member.lastName} for this night`}
                            >
                              Remove {slot.member.lastName}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleReplaceForNight(slot.member.id, pos.code)}
                              disabled={createDwOverride.isPending}
                              title={`Replace ${slot.member.lastName} for this night`}
                            >
                              Replace {slot.member.lastName}
                            </button>
                          </div>
                        )
                      })
                    })}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAssignPosition(positionsList[0]?.code ?? '')}
                      disabled={createDwOverride.isPending}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Extra
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          {isDraft && (
            <div className="mt-4 flex justify-end">
              <button
                className="btn btn-primary btn-md"
                onClick={handlePublish}
                disabled={publishSchedule.isPending}
              >
                {publishSchedule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Publish Schedule
              </button>
            </div>
          )}

          {isPublished && (
            <div className="mt-4 flex justify-end">
              <button
                className="btn btn-outline btn-md"
                onClick={handleEdit}
                disabled={revertToDraft.isPending}
              >
                {revertToDraft.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
        </DialogContent>
      </Dialog>

      <MemberPickerModal
        open={isMemberPickerOpen}
        onOpenChange={(open) => {
          setIsMemberPickerOpen(open)
          if (!open) setReplaceContext(null)
        }}
        onSelect={replaceContext ? handleMemberSelectForReplace : handleMemberSelect}
        title={replaceContext ? `Replace for ${activeTab}` : `Assign ${selectedPosition}`}
        description={
          replaceContext
            ? 'Select a replacement member for this night'
            : 'Select a qualified member for this position'
        }
        filterQualification={
          positionsList.find((p) => p.code === selectedPosition)?.qualificationCode
        }
        excludeMemberIds={assignedMemberIds}
      />

      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeType === 'override' ? 'Revert Override?' : 'Remove Assignment?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeType === 'override'
                ? 'This will revert the override and restore the base assignment for this night.'
                : 'This will remove the member from this position. You can assign someone else afterwards.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              {removeType === 'override' ? 'Revert' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
