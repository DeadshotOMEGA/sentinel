import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  Event as PrismaEvent,
  EventAttendee as PrismaEventAttendee,
  EventCheckin as PrismaEventCheckin,
} from '@sentinel/database'
import type {
  Event,
  EventAttendee,
  EventCheckin,
  EventStatus,
  AttendeeStatus,
  CreateEventInput,
  UpdateEventInput,
  CreateAttendeeInput,
  UpdateAttendeeInput,
  EventCheckinDirection,
} from '@sentinel/types'

interface EventPresenceStats {
  eventId: string
  totalAttendees: number
  activeAttendees: number
  checkedOut: number
  expired: number
}

/**
 * Convert Prisma Event to shared Event type
 */
function mapToEvent(event: PrismaEvent): Event {
  return {
    id: event.id,
    name: event.name,
    code: event.code,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    status: event.status as Event['status'],
    autoExpireBadges: event.autoExpireBadges ?? true,
    customRoles: event.customRoles as string[] | null,
    createdBy: event.createdBy,
    createdAt: event.createdAt ?? new Date(),
    updatedAt: event.updatedAt ?? new Date(),
  }
}

/**
 * Convert Prisma EventAttendee to shared EventAttendee type
 */
function mapToEventAttendee(attendee: PrismaEventAttendee): EventAttendee {
  return {
    id: attendee.id,
    eventId: attendee.eventId,
    name: attendee.name,
    rank: attendee.rank,
    organization: attendee.organization,
    role: attendee.role,
    badgeId: attendee.badgeId,
    badgeAssignedAt: attendee.badgeAssignedAt,
    accessStart: attendee.accessStart,
    accessEnd: attendee.accessEnd,
    status: attendee.status as EventAttendee['status'],
    createdAt: attendee.createdAt ?? new Date(),
    updatedAt: attendee.updatedAt ?? new Date(),
  }
}

/**
 * Convert Prisma EventCheckin to shared EventCheckin type
 */
function mapToEventCheckin(checkin: PrismaEventCheckin): EventCheckin {
  return {
    id: checkin.id,
    eventAttendeeId: checkin.eventAttendeeId,
    badgeId: checkin.badgeId,
    direction: checkin.direction as EventCheckin['direction'],
    timestamp: checkin.timestamp,
    kioskId: checkin.kioskId,
    createdAt: checkin.createdAt ?? new Date(),
  }
}

export class EventRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  // ============================================================================
  // EVENT CRUD OPERATIONS
  // ============================================================================

  /**
   * Find all events
   */
  async findAll(): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      orderBy: {
        startDate: 'desc',
      },
    })

    return events.map(mapToEvent)
  }

  /**
   * Find event by ID
   */
  async findById(id: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    })

    return event ? mapToEvent(event) : null
  }

  /**
   * Find event by code
   */
  async findByCode(code: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { code },
    })

    return event ? mapToEvent(event) : null
  }

  /**
   * Create a new event
   */
  async create(data: CreateEventInput): Promise<Event> {
    if (!data.status) {
      throw new Error('Event status is required')
    }
    if (data.autoExpireBadges === undefined) {
      throw new Error('autoExpireBadges must be explicitly set')
    }

    // Validate UUID format for createdBy
    const isValidUUID =
      data.createdBy &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.createdBy)

    const event = await this.prisma.event.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        autoExpireBadges: data.autoExpireBadges,
        createdBy: isValidUUID ? data.createdBy : null,
      },
    })

    return mapToEvent(event)
  }

  /**
   * Update an event
   */
  async update(id: string, data: UpdateEventInput): Promise<Event> {
    // Build update data object dynamically
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.code !== undefined) {
      updateData.code = data.code
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.autoExpireBadges !== undefined) {
      updateData.autoExpireBadges = data.autoExpireBadges
    }
    if ('customRoles' in data) {
      updateData.customRoles = data.customRoles
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update')
    }

    // updatedAt is automatically handled by Prisma default
    updateData.updatedAt = new Date()

    try {
      const event = await this.prisma.event.update({
        where: { id },
        data: updateData,
      })

      return mapToEvent(event)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error(`Event not found: ${id}`)
      }
      throw error
    }
  }

  /**
   * Delete an event (hard delete)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.event.delete({
        where: { id },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error(`Event not found: ${id}`)
      }
      throw error
    }
  }

  // ============================================================================
  // EVENT ATTENDEE CRUD OPERATIONS
  // ============================================================================

  /**
   * Find all attendees for an event
   */
  async findByEventId(eventId: string): Promise<EventAttendee[]> {
    const attendees = await this.prisma.eventAttendee.findMany({
      where: { eventId },
      orderBy: {
        name: 'asc',
      },
    })

    return attendees.map(mapToEventAttendee)
  }

  /**
   * Find attendee by ID
   */
  async findAttendeeById(id: string): Promise<EventAttendee | null> {
    const attendee = await this.prisma.eventAttendee.findUnique({
      where: { id },
    })

    return attendee ? mapToEventAttendee(attendee) : null
  }

  /**
   * Add a new attendee to an event
   */
  async addAttendee(data: CreateAttendeeInput): Promise<EventAttendee> {
    if (!data.status) {
      throw new Error('Attendee status is required')
    }

    const attendee = await this.prisma.eventAttendee.create({
      data: {
        eventId: data.eventId,
        name: data.name,
        rank: data.rank ?? null,
        organization: data.organization,
        role: data.role,
        badgeId: data.badgeId ?? null,
        badgeAssignedAt: data.badgeAssignedAt ?? null,
        accessStart: data.accessStart ?? null,
        accessEnd: data.accessEnd ?? null,
        status: data.status,
      },
    })

    return mapToEventAttendee(attendee)
  }

  /**
   * Update an event attendee
   */
  async updateAttendee(id: string, data: UpdateAttendeeInput): Promise<EventAttendee> {
    // Build update data object dynamically
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.rank !== undefined) {
      updateData.rank = data.rank
    }
    if (data.organization !== undefined) {
      updateData.organization = data.organization
    }
    if (data.role !== undefined) {
      updateData.role = data.role
    }
    if (data.badgeId !== undefined) {
      updateData.badgeId = data.badgeId
    }
    if (data.badgeAssignedAt !== undefined) {
      updateData.badgeAssignedAt = data.badgeAssignedAt
    }
    if (data.accessStart !== undefined) {
      updateData.accessStart = data.accessStart
    }
    if (data.accessEnd !== undefined) {
      updateData.accessEnd = data.accessEnd
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update')
    }

    // updatedAt is automatically handled by Prisma default
    updateData.updatedAt = new Date()

    try {
      const attendee = await this.prisma.eventAttendee.update({
        where: { id },
        data: updateData,
      })

      return mapToEventAttendee(attendee)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error(`Event attendee not found: ${id}`)
      }
      throw error
    }
  }

  /**
   * Remove an attendee from an event
   */
  async removeAttendee(id: string): Promise<void> {
    try {
      await this.prisma.eventAttendee.delete({
        where: { id },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error(`Event attendee not found: ${id}`)
      }
      throw error
    }
  }

  // ============================================================================
  // BADGE ASSIGNMENT OPERATIONS
  // ============================================================================

  /**
   * Assign a badge to an event attendee
   */
  async assignBadge(attendeeId: string, badgeId: string): Promise<EventAttendee> {
    try {
      const attendee = await this.prisma.eventAttendee.update({
        where: { id: attendeeId },
        data: {
          badgeId,
          badgeAssignedAt: new Date(),
          updatedAt: new Date(),
        },
      })

      return mapToEventAttendee(attendee)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error(`Event attendee not found: ${attendeeId}`)
      }
      throw error
    }
  }

  /**
   * Unassign a badge from an event attendee
   */
  async unassignBadge(attendeeId: string): Promise<EventAttendee> {
    try {
      const attendee = await this.prisma.eventAttendee.update({
        where: { id: attendeeId },
        data: {
          badgeId: null,
          badgeAssignedAt: null,
          updatedAt: new Date(),
        },
      })

      return mapToEventAttendee(attendee)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error(`Event attendee not found: ${attendeeId}`)
      }
      throw error
    }
  }

  // ============================================================================
  // PRESENCE/CHECK-IN OPERATIONS
  // ============================================================================

  /**
   * Get presence statistics for an event
   */
  async getEventPresenceStats(eventId: string): Promise<EventPresenceStats> {
    // Use Prisma's groupBy for aggregated statistics
    const attendees = await this.prisma.eventAttendee.findMany({
      where: { eventId },
      select: { status: true },
    })

    if (attendees.length === 0) {
      throw new Error(`No attendees found for event: ${eventId}`)
    }

    const stats = {
      eventId,
      totalAttendees: attendees.length,
      activeAttendees: attendees.filter((a) => a.status === 'active').length,
      checkedOut: attendees.filter((a) => a.status === 'checked_out').length,
      expired: attendees.filter((a) => a.status === 'expired').length,
    }

    return stats
  }

  /**
   * Get active attendees for an event
   */
  async getActiveAttendees(eventId: string): Promise<EventAttendee[]> {
    const attendees = await this.prisma.eventAttendee.findMany({
      where: {
        eventId,
        status: 'active',
      },
      orderBy: {
        name: 'asc',
      },
    })

    return attendees.map(mapToEventAttendee)
  }

  /**
   * Record an event attendee check-in or check-out
   */
  async recordCheckin(
    eventAttendeeId: string,
    badgeId: string,
    direction: EventCheckinDirection,
    kioskId: string,
    timestamp: Date = new Date()
  ): Promise<EventCheckin> {
    const checkin = await this.prisma.eventCheckin.create({
      data: {
        eventAttendeeId,
        badgeId,
        direction,
        timestamp,
        kioskId,
      },
    })

    return mapToEventCheckin(checkin)
  }

  /**
   * Get check-in history for an event attendee
   */
  async getAttendeeCheckins(eventAttendeeId: string): Promise<EventCheckin[]> {
    const checkins = await this.prisma.eventCheckin.findMany({
      where: { eventAttendeeId },
      orderBy: {
        timestamp: 'desc',
      },
    })

    return checkins.map(mapToEventCheckin)
  }

  /**
   * Get last check-in direction for an attendee (to determine current status)
   */
  async getLastCheckinDirection(eventAttendeeId: string): Promise<EventCheckinDirection | null> {
    const checkin = await this.prisma.eventCheckin.findFirst({
      where: { eventAttendeeId },
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        direction: true,
      },
    })

    return (checkin?.direction as EventCheckinDirection) || null
  }
}

export const eventRepository = new EventRepository()
