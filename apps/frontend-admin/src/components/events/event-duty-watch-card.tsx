'use client'

import { useState } from 'react'
import { Plus, X, User } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { MemberPickerModal } from '@/components/schedules/member-picker-modal'
import { EventPositionForm } from './event-position-form'
import { useCreateEventAssignment, useDeleteEventAssignment } from '@/hooks/use-events'
import type {
  UnitEventDutyPositionResponse,
  UnitEventDutyAssignmentResponse,
} from '@sentinel/contracts'

interface EventDutyWatchCardProps {
  eventId: string
  positions: UnitEventDutyPositionResponse[]
  assignments: UnitEventDutyAssignmentResponse[]
  isEditable: boolean
}

export function EventDutyWatchCard({
  eventId,
  positions,
  assignments,
  isEditable,
}: EventDutyWatchCardProps) {
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null)
  const [showMemberPicker, setShowMemberPicker] = useState(false)
  const [showAddPosition, setShowAddPosition] = useState(false)

  const createAssignmentMutation = useCreateEventAssignment()
  const deleteAssignmentMutation = useDeleteEventAssignment()

  const sortedPositions = [...positions].sort((a, b) => a.displayOrder - b.displayOrder)

  const getAssignmentForPosition = (positionId: string) => {
    return assignments.find((assignment) => assignment.eventDutyPositionId === positionId)
  }

  const assignedMemberIds = assignments.map((a) => a.memberId)

  const handleAssignMember = (positionId: string) => {
    setSelectedPositionId(positionId)
    setShowMemberPicker(true)
  }

  const handleMemberSelect = async (member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }) => {
    if (!selectedPositionId) return

    try {
      await createAssignmentMutation.mutateAsync({
        eventId,
        data: {
          eventDutyPositionId: selectedPositionId,
          memberId: member.id,
          isVolunteer: false,
        },
      })
      setShowMemberPicker(false)
      setSelectedPositionId(null)
    } catch (error) {
      console.error('Failed to assign member:', error)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) return

    try {
      await deleteAssignmentMutation.mutateAsync({
        eventId,
        assignmentId,
      })
    } catch (error) {
      console.error('Failed to remove assignment:', error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Duty Watch Positions</CardTitle>
        </CardHeader>

        <CardContent>
          {sortedPositions.length === 0 ? (
            <div className="text-center py-8 text-base-content/60" role="status" aria-live="polite">
              <p>No duty positions defined for this event</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPositions.map((position) => {
                const assignment = getAssignmentForPosition(position.id)

                return (
                  <div
                    key={position.id}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {position.code} - {position.name}
                        </span>
                        {position.isStandard && (
                          <span className="badge badge-outline text-xs">Standard</span>
                        )}
                      </div>
                      {position.description && (
                        <p className="text-sm text-base-content/60 mt-1">{position.description}</p>
                      )}

                      {assignment ? (
                        <div className="flex items-center gap-2 mt-2">
                          <User className="h-4 w-4 text-base-content/60" />
                          <span className="text-sm">
                            {assignment.member.rank} {assignment.member.firstName}{' '}
                            {assignment.member.lastName}
                          </span>
                          <span
                            className="badge badge-outline text-xs"
                            aria-label={`Status: ${assignment.status}`}
                          >
                            {assignment.status}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="text-sm text-base-content/60">Unassigned</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {assignment
                        ? isEditable && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-square btn-sm"
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              disabled={deleteAssignmentMutation.isPending}
                              aria-label="Remove assignment"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )
                        : isEditable && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleAssignMember(position.id)}
                              aria-label={`Assign member to ${position.name}`}
                            >
                              Assign
                            </button>
                          )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>

        {isEditable && (
          <CardFooter>
            {showAddPosition ? (
              <EventPositionForm eventId={eventId} onClose={() => setShowAddPosition(false)} />
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm w-full"
                onClick={() => setShowAddPosition(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Position
              </button>
            )}
          </CardFooter>
        )}
      </Card>

      <MemberPickerModal
        open={showMemberPicker}
        onOpenChange={setShowMemberPicker}
        onSelect={handleMemberSelect}
        title="Assign Member to Position"
        description="Select a member to assign to this duty position"
        excludeMemberIds={assignedMemberIds}
      />
    </>
  )
}
