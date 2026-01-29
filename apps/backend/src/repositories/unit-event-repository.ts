import type { PrismaClientInstance } from '@sentinel/database'
import { Prisma, prisma as defaultPrisma } from '@sentinel/database'

// ============================================================================
// Entity Types
// ============================================================================

/**
 * Unit event type entity from database
 */
export interface UnitEventTypeEntity {
  id: string
  name: string
  category: string
  defaultDurationMinutes: number
  requiresDutyWatch: boolean
  defaultMetadata: unknown
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Unit event entity from database
 */
export interface UnitEventEntity {
  id: string
  title: string
  eventTypeId: string | null
  eventDate: Date
  startTime: Date | null
  endTime: Date | null
  location: string | null
  description: string | null
  organizer: string | null
  requiresDutyWatch: boolean
  status: string
  metadata: unknown
  notes: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  eventType: { id: string; name: string; category: string } | null
}

/**
 * Unit event duty position entity from database
 */
export interface UnitEventDutyPositionEntity {
  id: string
  eventId: string
  code: string
  name: string
  description: string | null
  maxSlots: number
  isStandard: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Unit event duty assignment entity from database
 */
export interface UnitEventDutyAssignmentEntity {
  id: string
  eventId: string
  eventDutyPositionId: string | null
  memberId: string
  status: string
  isVolunteer: boolean
  confirmedAt: Date | null
  releasedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  member: {
    id: string
    firstName: string
    lastName: string
    rank: string
    serviceNumber: string
  }
  eventDutyPosition: {
    id: string
    code: string
    name: string
  } | null
}

/**
 * Unit event with full details
 */
export interface UnitEventWithDetails extends UnitEventEntity {
  dutyPositions: UnitEventDutyPositionEntity[]
  dutyAssignments: UnitEventDutyAssignmentEntity[]
}

/**
 * Input for creating a unit event
 */
export interface CreateUnitEventInput {
  title: string
  eventTypeId?: string | null
  eventDate: Date
  startTime?: Date | null
  endTime?: Date | null
  location?: string | null
  description?: string | null
  organizer?: string | null
  requiresDutyWatch?: boolean
  status?: string
  metadata?: Record<string, unknown> | null
  notes?: string | null
  createdBy?: string | null
}

/**
 * Input for updating a unit event
 */
export interface UpdateUnitEventInput {
  title?: string
  eventTypeId?: string | null
  eventDate?: Date
  startTime?: Date | null
  endTime?: Date | null
  location?: string | null
  description?: string | null
  organizer?: string | null
  requiresDutyWatch?: boolean
  metadata?: Record<string, unknown> | null
  notes?: string | null
}

/**
 * Unit event list filter options
 */
export interface UnitEventListFilter {
  startDate?: Date
  endDate?: Date
  category?: string
  status?: string
  requiresDutyWatch?: boolean
  limit?: number
  offset?: number
}

/**
 * Input for creating a duty position
 */
export interface CreatePositionInput {
  eventId: string
  code: string
  name: string
  description?: string | null
  maxSlots?: number
  isStandard?: boolean
  displayOrder?: number
}

/**
 * Input for updating a duty position
 */
export interface UpdatePositionInput {
  code?: string
  name?: string
  description?: string | null
  maxSlots?: number
  isStandard?: boolean
  displayOrder?: number
}

/**
 * Input for creating a duty assignment
 */
export interface CreateAssignmentInput {
  eventId: string
  eventDutyPositionId?: string | null
  memberId: string
  isVolunteer?: boolean
  notes?: string | null
}

// ============================================================================
// Prisma Include/Select Definitions
// ============================================================================

const assignmentInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rank: true,
      serviceNumber: true,
    },
  },
  eventDutyPosition: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
}

/**
 * Get full include object for unit event with all related data
 */
function getEventFullInclude() {
  return {
    eventType: {
      select: {
        id: true,
        name: true,
        category: true,
      },
    },
    dutyPositions: {
      orderBy: { displayOrder: 'asc' as const },
    },
    dutyAssignments: {
      include: assignmentInclude,
      orderBy: [
        { eventDutyPosition: { displayOrder: 'asc' as const } },
        { createdAt: 'asc' as const },
      ],
    },
  }
}

// ============================================================================
// Repository Class
// ============================================================================

/**
 * Repository for managing unit events and duty assignments
 */
export class UnitEventRepository {
  private prisma: PrismaClientInstance

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
  }

  // ==========================================================================
  // Event Types
  // ==========================================================================

  /**
   * Get all event types
   */
  async findAllEventTypes(): Promise<UnitEventTypeEntity[]> {
    const types = await this.prisma.unitEventType.findMany({
      orderBy: { displayOrder: 'asc' },
    })
    return types
  }

  /**
   * Get an event type by ID
   */
  async findEventTypeById(id: string): Promise<UnitEventTypeEntity | null> {
    const type = await this.prisma.unitEventType.findUnique({
      where: { id },
    })
    return type
  }

  // ==========================================================================
  // Unit Events
  // ==========================================================================

  /**
   * List events with filters
   */
  async findEvents(
    filter: UnitEventListFilter = {}
  ): Promise<{ events: UnitEventEntity[]; total: number }> {
    const where: Record<string, unknown> = {}

    if (filter.startDate) {
      where.eventDate = { gte: filter.startDate }
    }
    if (filter.endDate) {
      if (where.eventDate && typeof where.eventDate === 'object' && 'gte' in where.eventDate) {
        ;(where.eventDate as Record<string, unknown>).lte = filter.endDate
      } else {
        where.eventDate = { lte: filter.endDate }
      }
    }
    if (filter.category) {
      where.eventType = { category: filter.category }
    }
    if (filter.status) {
      where.status = filter.status
    }
    if (filter.requiresDutyWatch !== undefined) {
      where.requiresDutyWatch = filter.requiresDutyWatch
    }

    const [events, total] = await Promise.all([
      this.prisma.unitEvent.findMany({
        where,
        include: {
          eventType: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: { eventDate: 'desc' },
        take: filter.limit,
        skip: filter.offset,
      }),
      this.prisma.unitEvent.count({ where }),
    ])

    return { events, total }
  }

  /**
   * Get events by date range (basic list without full details)
   */
  async findEventsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<UnitEventEntity[]> {
    const events = await this.prisma.unitEvent.findMany({
      where: {
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: { eventDate: 'asc' },
    })
    return events
  }

  /**
   * Get an event by ID with full details
   */
  async findEventById(id: string): Promise<UnitEventWithDetails | null> {
    const event = await this.prisma.unitEvent.findUnique({
      where: { id },
      include: getEventFullInclude(),
    })
    return event as UnitEventWithDetails | null
  }

  /**
   * Create a new event
   */
  async createEvent(input: CreateUnitEventInput): Promise<UnitEventWithDetails> {
    const event = await this.prisma.unitEvent.create({
      data: {
        title: input.title,
        eventTypeId: input.eventTypeId,
        eventDate: input.eventDate,
        startTime: input.startTime,
        endTime: input.endTime,
        location: input.location,
        description: input.description,
        organizer: input.organizer,
        requiresDutyWatch: input.requiresDutyWatch ?? false,
        status: input.status ?? 'draft',
        metadata: input.metadata === null
          ? Prisma.JsonNull
          : input.metadata !== undefined
            ? (input.metadata as Prisma.InputJsonValue)
            : undefined,
        notes: input.notes,
        createdBy: input.createdBy,
      },
      include: getEventFullInclude(),
    })
    return event as UnitEventWithDetails
  }

  /**
   * Update an event
   */
  async updateEvent(id: string, data: UpdateUnitEventInput): Promise<UnitEventWithDetails> {
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) {
      updateData.title = data.title
    }
    if (data.eventTypeId !== undefined) {
      updateData.eventTypeId = data.eventTypeId
    }
    if (data.eventDate !== undefined) {
      updateData.eventDate = data.eventDate
    }
    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime
    }
    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime
    }
    if (data.location !== undefined) {
      updateData.location = data.location
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.organizer !== undefined) {
      updateData.organizer = data.organizer
    }
    if (data.requiresDutyWatch !== undefined) {
      updateData.requiresDutyWatch = data.requiresDutyWatch
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata === null
        ? Prisma.JsonNull
        : (data.metadata as Prisma.InputJsonValue)
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes
    }

    const event = await this.prisma.unitEvent.update({
      where: { id },
      data: updateData,
      include: getEventFullInclude(),
    })
    return event as UnitEventWithDetails
  }

  /**
   * Update event status
   */
  async updateEventStatus(id: string, status: string): Promise<UnitEventWithDetails> {
    const event = await this.prisma.unitEvent.update({
      where: { id },
      data: { status },
      include: getEventFullInclude(),
    })
    return event as UnitEventWithDetails
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    await this.prisma.unitEvent.delete({
      where: { id },
    })
  }

  /**
   * Count events with filters
   */
  async countEvents(filter: UnitEventListFilter = {}): Promise<number> {
    const where: Record<string, unknown> = {}

    if (filter.startDate) {
      where.eventDate = { gte: filter.startDate }
    }
    if (filter.endDate) {
      if (where.eventDate && typeof where.eventDate === 'object' && 'gte' in where.eventDate) {
        ;(where.eventDate as Record<string, unknown>).lte = filter.endDate
      } else {
        where.eventDate = { lte: filter.endDate }
      }
    }
    if (filter.category) {
      where.eventType = { category: filter.category }
    }
    if (filter.status) {
      where.status = filter.status
    }
    if (filter.requiresDutyWatch !== undefined) {
      where.requiresDutyWatch = filter.requiresDutyWatch
    }

    return this.prisma.unitEvent.count({ where })
  }

  // ==========================================================================
  // Duty Positions
  // ==========================================================================

  /**
   * Create a duty position for an event
   */
  async createPosition(input: CreatePositionInput): Promise<UnitEventDutyPositionEntity> {
    const position = await this.prisma.unitEventDutyPosition.create({
      data: {
        eventId: input.eventId,
        code: input.code,
        name: input.name,
        description: input.description,
        maxSlots: input.maxSlots ?? 1,
        isStandard: input.isStandard ?? false,
        displayOrder: input.displayOrder ?? 0,
      },
    })
    return position
  }

  /**
   * Update a duty position
   */
  async updatePosition(
    id: string,
    data: UpdatePositionInput
  ): Promise<UnitEventDutyPositionEntity> {
    const updateData: Record<string, unknown> = {}

    if (data.code !== undefined) {
      updateData.code = data.code
    }
    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.maxSlots !== undefined) {
      updateData.maxSlots = data.maxSlots
    }
    if (data.isStandard !== undefined) {
      updateData.isStandard = data.isStandard
    }
    if (data.displayOrder !== undefined) {
      updateData.displayOrder = data.displayOrder
    }

    const position = await this.prisma.unitEventDutyPosition.update({
      where: { id },
      data: updateData,
    })
    return position
  }

  /**
   * Delete a duty position
   */
  async deletePosition(id: string): Promise<void> {
    await this.prisma.unitEventDutyPosition.delete({
      where: { id },
    })
  }

  /**
   * Get a position by ID
   */
  async findPositionById(id: string): Promise<UnitEventDutyPositionEntity | null> {
    const position = await this.prisma.unitEventDutyPosition.findUnique({
      where: { id },
    })
    return position
  }

  /**
   * Find a position by event ID and code
   */
  async findPositionByEventAndCode(eventId: string, code: string): Promise<UnitEventDutyPositionEntity | null> {
    const position = await this.prisma.unitEventDutyPosition.findUnique({
      where: {
        eventId_code: {
          eventId,
          code,
        },
      },
    })
    return position
  }

  // ==========================================================================
  // Duty Assignments
  // ==========================================================================

  /**
   * Create a duty assignment
   */
  async createAssignment(input: CreateAssignmentInput): Promise<UnitEventDutyAssignmentEntity> {
    const assignment = await this.prisma.unitEventDutyAssignment.create({
      data: {
        eventId: input.eventId,
        eventDutyPositionId: input.eventDutyPositionId,
        memberId: input.memberId,
        isVolunteer: input.isVolunteer ?? false,
        notes: input.notes,
        status: 'assigned',
      },
      include: assignmentInclude,
    })
    return assignment
  }

  /**
   * Delete a duty assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    await this.prisma.unitEventDutyAssignment.delete({
      where: { id },
    })
  }

  /**
   * Get an assignment by ID
   */
  async findAssignmentById(id: string): Promise<UnitEventDutyAssignmentEntity | null> {
    const assignment = await this.prisma.unitEventDutyAssignment.findUnique({
      where: { id },
      include: assignmentInclude,
    })
    return assignment
  }

  /**
   * Check if a member already has an assignment in an event at a specific position
   */
  async memberHasAssignmentInEvent(
    eventId: string,
    memberId: string,
    positionId?: string | null
  ): Promise<boolean> {
    const where: Record<string, unknown> = {
      eventId,
      memberId,
    }

    if (positionId) {
      where.eventDutyPositionId = positionId
    }

    const count = await this.prisma.unitEventDutyAssignment.count({ where })
    return count > 0
  }

  /**
   * Count active assignments for a position in an event
   */
  async countAssignmentsForPosition(
    eventId: string,
    eventDutyPositionId: string
  ): Promise<number> {
    return this.prisma.unitEventDutyAssignment.count({
      where: {
        eventId,
        eventDutyPositionId,
        status: { not: 'released' },
      },
    })
  }

  /**
   * Find member's event assignments on a specific date (for conflict detection)
   */
  async findMemberEventAssignmentsOnDate(
    memberId: string,
    date: Date
  ): Promise<UnitEventDutyAssignmentEntity[]> {
    const assignments = await this.prisma.unitEventDutyAssignment.findMany({
      where: {
        memberId,
        event: {
          eventDate: date,
        },
        releasedAt: null,
      },
      include: assignmentInclude,
      orderBy: { createdAt: 'asc' },
    })
    return assignments
  }
}
