import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { EventRepository } from '../repositories/event-repository.js'
import { BadgeRepository } from '../repositories/badge-repository.js'
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js'
import type { EventAttendee, Event } from '@sentinel/types'
import { broadcastEventUpdate } from '../websocket/broadcast.js'

export class EventService {
  private eventRepo: EventRepository
  private badgeRepo: BadgeRepository

  constructor(prismaClient?: PrismaClient) {
    const prisma = prismaClient || getPrismaClient()
    this.eventRepo = new EventRepository(prisma)
    this.badgeRepo = new BadgeRepository(prisma)
  }

  /**
   * Close event and optionally expire all attendee badges
   */
  async closeEvent(eventId: string): Promise<{ event: Event; expiredCount: number }> {
    // Verify event exists
    const event = await this.eventRepo.findById(eventId)
    if (!event) {
      throw new NotFoundError('Event', eventId)
    }

    // Update event status to completed
    const updatedEvent = await this.eventRepo.update(eventId, { status: 'completed' })

    // Expire all badges if auto_expire_badges is enabled
    let expiredCount = 0
    if (updatedEvent.autoExpireBadges) {
      // Get all attendees for this event
      const attendees = await this.eventRepo.findByEventId(eventId)

      // Expire each non-expired attendee
      for (const attendee of attendees) {
        if (attendee.status !== 'expired') {
          await this.eventRepo.updateAttendee(attendee.id, {
            status: 'expired',
            accessEnd: new Date(),
          })
          expiredCount++
        }
      }
    }

    // Broadcast event update
    broadcastEventUpdate({
      id: updatedEvent.id,
      action: 'closed',
      name: updatedEvent.name,
      status: updatedEvent.status,
      timestamp: new Date().toISOString(),
    })

    return {
      event: updatedEvent,
      expiredCount,
    }
  }

  /**
   * Assign badge to event attendee
   */
  async assignBadgeToAttendee(
    eventId: string,
    attendeeId: string,
    badgeId: string
  ): Promise<EventAttendee> {
    // Verify event exists
    const event = await this.eventRepo.findById(eventId)
    if (!event) {
      throw new NotFoundError('Event', eventId)
    }

    // Verify attendee exists and belongs to this event
    const attendee = await this.eventRepo.findAttendeeById(attendeeId)
    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundError('Attendee', attendeeId)
    }

    // Verify badge exists
    const badge = await this.badgeRepo.findById(badgeId)
    if (!badge) {
      throw new NotFoundError('Badge', badgeId)
    }

    // Verify badge is available and active
    if (badge.status !== 'active') {
      throw new ValidationError(`Badge ${badgeId} is ${badge.status} and cannot be assigned`)
    }

    // Check if badge is already assigned
    if (badge.assignmentType !== 'unassigned' && badge.assignedToId) {
      throw new ConflictError(`Badge ${badgeId} is already assigned`)
    }

    // Assign badge to attendee
    const updatedAttendee = await this.eventRepo.assignBadge(attendeeId, badgeId)

    // Assign badge to event in badge repository
    await this.badgeRepo.assign(badgeId, eventId, 'event')

    return updatedAttendee
  }

  /**
   * Unassign badge from event attendee
   */
  async unassignBadgeFromAttendee(eventId: string, attendeeId: string): Promise<EventAttendee> {
    // Verify event exists
    const event = await this.eventRepo.findById(eventId)
    if (!event) {
      throw new NotFoundError('Event', eventId)
    }

    // Verify attendee exists and belongs to this event
    const attendee = await this.eventRepo.findAttendeeById(attendeeId)
    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundError('Attendee', attendeeId)
    }

    // If badge was assigned, unassign it in badges table (only if it's an event badge)
    if (attendee.badgeId) {
      const badge = await this.badgeRepo.findById(attendee.badgeId)
      // Only unassign if badge was assigned to the event (temporary badge)
      // Don't unassign member badges - they belong to the member permanently
      if (badge && badge.assignmentType === 'event') {
        await this.badgeRepo.unassign(attendee.badgeId)
      }
    }

    // Unassign badge from attendee record (clears the link, doesn't affect badge assignment)
    const updatedAttendee = await this.eventRepo.unassignBadge(attendeeId)

    return updatedAttendee
  }

  /**
   * Get event presence statistics
   */
  async getEventPresenceStats(eventId: string): Promise<{
    eventId: string
    totalAttendees: number
    activeAttendees: number
    checkedOut: number
    expired: number
    pending: number
  }> {
    // Verify event exists
    const event = await this.eventRepo.findById(eventId)
    if (!event) {
      throw new NotFoundError('Event', eventId)
    }

    const stats = await this.eventRepo.getEventPresenceStats(eventId)

    return {
      eventId,
      totalAttendees: stats.totalAttendees,
      activeAttendees: stats.activeAttendees,
      checkedOut: stats.checkedOut,
      expired: stats.expired,
      pending: stats.totalAttendees - stats.activeAttendees - stats.checkedOut - stats.expired,
    }
  }

  /**
   * Validate event dates
   */
  validateEventDates(startDate: Date, endDate: Date): void {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end < start) {
      throw new ValidationError(
        `End date (${end.toISOString()}) must be after or equal to start date (${start.toISOString()})`
      )
    }
  }

  /**
   * Get available badges for assignment
   */
  async getAvailableBadges(
    limit: number = 100
  ): Promise<Array<{ id: string; serialNumber: string }>> {
    const badges = await this.badgeRepo.findAll({
      status: 'active',
      assignmentType: 'unassigned',
    })

    return badges.slice(0, limit).map((badge) => ({
      id: badge.id,
      serialNumber: badge.serialNumber,
    }))
  }
}

export const eventService = new EventService()
