import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import {
  UnitEventRepository,
  type UnitEventTypeEntity,
  type UnitEventEntity,
  type UnitEventWithDetails,
  type UnitEventDutyPositionEntity,
  type UnitEventDutyAssignmentEntity,
  type UnitEventListFilter,
  type CreateUnitEventInput,
  type UpdateUnitEventInput,
} from '../repositories/unit-event-repository.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'

// ============================================================================
// Constants
// ============================================================================

const STANDARD_DUTY_POSITIONS = [
  { code: 'SWK', name: 'Senior Watchkeeper', displayOrder: 1 },
  { code: 'DSWK', name: 'Deputy Senior Watchkeeper', displayOrder: 2 },
  { code: 'QM', name: 'Quartermaster', displayOrder: 3 },
  { code: 'BM', name: "Bos'n Mate", displayOrder: 4 },
  { code: 'APS', name: 'Access Point Sentry', displayOrder: 5 },
]

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['confirmed', 'cancelled', 'postponed'],
  confirmed: ['in_progress', 'cancelled', 'postponed'],
  in_progress: ['completed', 'cancelled'],
  postponed: ['planned'],
  completed: [],
  cancelled: [],
}

// ============================================================================
// Service Class
// ============================================================================

export class UnitEventService {
  private repository: UnitEventRepository

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.repository = new UnitEventRepository(prisma)
  }

  // ==========================================================================
  // Event Types
  // ==========================================================================

  async getAllEventTypes(): Promise<UnitEventTypeEntity[]> {
    return this.repository.findAllEventTypes()
  }

  // ==========================================================================
  // Events CRUD
  // ==========================================================================

  async listEvents(
    filter: UnitEventListFilter = {}
  ): Promise<{ data: UnitEventEntity[]; total: number }> {
    const result = await this.repository.findEvents(filter)
    return { data: result.events, total: result.total }
  }

  async getEvent(id: string): Promise<UnitEventWithDetails> {
    const event = await this.repository.findEventById(id)
    if (!event) {
      throw new NotFoundError('Unit Event', id)
    }
    return event
  }

  async createEvent(input: CreateUnitEventInput): Promise<UnitEventWithDetails> {
    // Determine requiresDutyWatch - use provided value or inherit from event type
    let requiresDutyWatch = input.requiresDutyWatch ?? false

    if (input.eventTypeId && input.requiresDutyWatch === undefined) {
      const eventType = await this.repository.findEventTypeById(input.eventTypeId)
      if (eventType) {
        requiresDutyWatch = eventType.requiresDutyWatch
      }
    }

    const event = await this.repository.createEvent({
      ...input,
      requiresDutyWatch,
      status: input.status ?? 'draft',
    })

    // If event requires duty watch, auto-create standard positions
    if (requiresDutyWatch) {
      await this.createStandardDutyPositions(event.id, input.eventTypeId)
    }

    // Fetch and return with full details (positions were created after event)
    return this.getEvent(event.id)
  }

  async updateEvent(id: string, input: UpdateUnitEventInput): Promise<UnitEventWithDetails> {
    const event = await this.repository.findEventById(id)
    if (!event) {
      throw new NotFoundError('Unit Event', id)
    }

    await this.repository.updateEvent(id, input)

    // If requiresDutyWatch changed from false to true, add standard positions
    if (input.requiresDutyWatch === true && !event.requiresDutyWatch) {
      await this.createStandardDutyPositions(id, input.eventTypeId ?? event.eventTypeId)
    }

    return this.getEvent(id)
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.repository.findEventById(id)
    if (!event) {
      throw new NotFoundError('Unit Event', id)
    }
    await this.repository.deleteEvent(id)
  }

  async updateEventStatus(id: string, newStatus: string): Promise<UnitEventWithDetails> {
    const event = await this.repository.findEventById(id)
    if (!event) {
      throw new NotFoundError('Unit Event', id)
    }

    this.validateStatusTransition(event.status, newStatus)
    await this.repository.updateEventStatus(id, newStatus)
    return this.getEvent(id)
  }

  // ==========================================================================
  // Duty Positions
  // ==========================================================================

  async createPosition(
    eventId: string,
    input: { code: string; name: string; description?: string | null; maxSlots?: number }
  ): Promise<UnitEventDutyPositionEntity> {
    const event = await this.repository.findEventById(eventId)
    if (!event) {
      throw new NotFoundError('Unit Event', eventId)
    }

    const existing = await this.repository.findPositionByEventAndCode(eventId, input.code)
    if (existing) {
      throw new ConflictError(`Position with code '${input.code}' already exists for this event`)
    }

    return this.repository.createPosition({
      eventId,
      code: input.code,
      name: input.name,
      description: input.description,
      maxSlots: input.maxSlots ?? 1,
      isStandard: false,
    })
  }

  async updatePosition(
    eventId: string,
    positionId: string,
    input: { name?: string; description?: string | null; maxSlots?: number }
  ): Promise<UnitEventDutyPositionEntity> {
    const event = await this.repository.findEventById(eventId)
    if (!event) {
      throw new NotFoundError('Unit Event', eventId)
    }

    const position = await this.repository.findPositionById(positionId)
    if (!position || position.eventId !== eventId) {
      throw new NotFoundError('Duty Position', positionId)
    }

    return this.repository.updatePosition(positionId, input)
  }

  async deletePosition(eventId: string, positionId: string): Promise<void> {
    const event = await this.repository.findEventById(eventId)
    if (!event) {
      throw new NotFoundError('Unit Event', eventId)
    }

    const position = await this.repository.findPositionById(positionId)
    if (!position || position.eventId !== eventId) {
      throw new NotFoundError('Duty Position', positionId)
    }

    await this.repository.deletePosition(positionId)
  }

  // ==========================================================================
  // Duty Assignments
  // ==========================================================================

  async createAssignment(
    eventId: string,
    input: {
      eventDutyPositionId?: string | null
      memberId: string
      isVolunteer?: boolean
      notes?: string | null
    }
  ): Promise<UnitEventDutyAssignmentEntity> {
    const event = await this.repository.findEventById(eventId)
    if (!event) {
      throw new NotFoundError('Unit Event', eventId)
    }

    // Check for double-booking: member already assigned to this event at this position
    const alreadyAssigned = await this.repository.memberHasAssignmentInEvent(
      eventId,
      input.memberId,
      input.eventDutyPositionId
    )
    if (alreadyAssigned) {
      throw new ConflictError('Member is already assigned to this position on this event')
    }

    // Check if member has assignments on other events on the same date
    const conflictingAssignments = await this.repository.findMemberEventAssignmentsOnDate(
      input.memberId,
      event.eventDate
    )
    const otherEventConflicts = conflictingAssignments.filter(
      (a: UnitEventDutyAssignmentEntity) => a.eventId !== eventId
    )
    if (otherEventConflicts.length > 0) {
      throw new ConflictError('Member is already assigned to another event on this date')
    }

    // If position specified, verify it exists and check slot availability
    if (input.eventDutyPositionId) {
      const position = await this.repository.findPositionById(input.eventDutyPositionId)
      if (!position || position.eventId !== eventId) {
        throw new NotFoundError('Duty Position', input.eventDutyPositionId)
      }

      const currentCount = await this.repository.countAssignmentsForPosition(
        eventId,
        input.eventDutyPositionId
      )
      if (currentCount >= position.maxSlots) {
        throw new ConflictError(
          `Position '${position.name}' is at capacity (${position.maxSlots} slots)`
        )
      }
    }

    return this.repository.createAssignment({
      eventId,
      eventDutyPositionId: input.eventDutyPositionId,
      memberId: input.memberId,
      isVolunteer: input.isVolunteer,
      notes: input.notes,
    })
  }

  async deleteAssignment(eventId: string, assignmentId: string): Promise<void> {
    const event = await this.repository.findEventById(eventId)
    if (!event) {
      throw new NotFoundError('Unit Event', eventId)
    }

    const assignment = await this.repository.findAssignmentById(assignmentId)
    if (!assignment || assignment.eventId !== eventId) {
      throw new NotFoundError('Duty Assignment', assignmentId)
    }

    await this.repository.deleteAssignment(assignmentId)
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? []
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
      )
    }
  }

  private async createStandardDutyPositions(
    eventId: string,
    eventTypeId?: string | null
  ): Promise<void> {
    const positionsToCreate: Array<{ code: string; name: string; displayOrder: number }> = [
      ...STANDARD_DUTY_POSITIONS,
    ]

    // Check event type for additional default positions
    if (eventTypeId) {
      const eventType = await this.repository.findEventTypeById(eventTypeId)
      if (
        eventType?.defaultMetadata &&
        typeof eventType.defaultMetadata === 'object' &&
        eventType.defaultMetadata !== null &&
        'positions' in (eventType.defaultMetadata as Record<string, unknown>)
      ) {
        const meta = eventType.defaultMetadata as Record<string, unknown>
        const defaultPositions = meta.positions as Array<{
          code: string
          name: string
          displayOrder?: number
        }>
        if (Array.isArray(defaultPositions)) {
          for (const pos of defaultPositions) {
            positionsToCreate.push({
              code: pos.code,
              name: pos.name,
              displayOrder: pos.displayOrder ?? positionsToCreate.length + 1,
            })
          }
        }
      }
    }

    // Create positions (skip duplicates by code)
    const codes = new Set<string>()
    for (const position of positionsToCreate) {
      if (!codes.has(position.code)) {
        codes.add(position.code)
        try {
          await this.repository.createPosition({
            eventId,
            code: position.code,
            name: position.name,
            maxSlots: 1,
            displayOrder: position.displayOrder,
            isStandard: true,
          })
        } catch {
          // Skip if position already exists (unique constraint violation)
        }
      }
    }
  }
}
