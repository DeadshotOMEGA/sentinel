import { eventRepository } from '../db/repositories/event-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import type { EventAttendee, Event } from '../../../shared/types';

export class EventService {
  /**
   * Close event and optionally expire all attendee badges
   */
  async closeEvent(eventId: string): Promise<{ event: Event; expiredCount: number }> {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    // Update event status to completed
    const updatedEvent = await eventRepository.update(eventId, { status: 'completed' });

    // Expire all badges if auto_expire_badges is enabled
    let expiredCount = 0;
    if (updatedEvent.autoExpireBadges) {
      // Get all attendees for this event
      const attendees = await eventRepository.findByEventId(eventId);

      // Expire each non-expired attendee
      for (const attendee of attendees) {
        if (attendee.status !== 'expired') {
          await eventRepository.updateAttendee(attendee.id, {
            status: 'expired',
            accessEnd: new Date(),
          });
          expiredCount++;
        }
      }
    }

    return {
      event: updatedEvent,
      expiredCount,
    };
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
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    // Verify attendee exists and belongs to this event
    const attendee = await eventRepository.findAttendeeById(attendeeId);
    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundError(
        'Attendee not found',
        `Attendee ${attendeeId} does not belong to event ${eventId}`,
        'Please check the attendee ID and try again.'
      );
    }

    // Verify badge exists
    const badge = await badgeRepository.findById(badgeId);
    if (!badge) {
      throw new NotFoundError(
        'Badge not found',
        `Badge ${badgeId} does not exist`,
        'Please check the badge ID and try again.'
      );
    }

    // Verify badge is available and active
    if (badge.status !== 'active') {
      throw new ValidationError(
        'Badge not available',
        `Badge ${badgeId} is ${badge.status}`,
        `This badge is ${badge.status} and cannot be assigned.`
      );
    }

    // Check if badge is already assigned
    if (badge.assignmentType !== 'unassigned' && badge.assignedToId) {
      throw new ConflictError(
        'Badge already assigned',
        `Badge ${badgeId} is already assigned`,
        'This badge is already assigned. Please select a different badge.'
      );
    }

    // Assign badge to attendee
    const updatedAttendee = await eventRepository.assignBadge(attendeeId, badgeId);

    // Assign badge to event in badge repository
    await badgeRepository.assign(badgeId, eventId, 'event');

    return updatedAttendee;
  }

  /**
   * Unassign badge from event attendee
   */
  async unassignBadgeFromAttendee(eventId: string, attendeeId: string): Promise<EventAttendee> {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    // Verify attendee exists and belongs to this event
    const attendee = await eventRepository.findAttendeeById(attendeeId);
    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundError(
        'Attendee not found',
        `Attendee ${attendeeId} does not belong to event ${eventId}`,
        'Please check the attendee ID and try again.'
      );
    }

    // If badge was assigned, unassign it in badges table
    if (attendee.badgeId) {
      await badgeRepository.unassign(attendee.badgeId);
    }

    // Unassign badge from attendee
    const updatedAttendee = await eventRepository.unassignBadge(attendeeId);

    return updatedAttendee;
  }

  /**
   * Get event presence statistics
   */
  async getEventPresenceStats(eventId: string): Promise<{
    eventId: string;
    totalAttendees: number;
    activeAttendees: number;
    checkedOut: number;
    expired: number;
    pending: number;
  }> {
    // Verify event exists
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundError(
        'Event not found',
        `Event ${eventId} does not exist`,
        'Please check the event ID and try again.'
      );
    }

    const stats = await eventRepository.getEventPresenceStats(eventId);

    return {
      eventId,
      totalAttendees: stats.totalAttendees,
      activeAttendees: stats.activeAttendees,
      checkedOut: stats.checkedOut,
      expired: stats.expired,
      pending: stats.totalAttendees - stats.activeAttendees - stats.checkedOut - stats.expired,
    };
  }

  /**
   * Validate event dates
   */
  validateEventDates(startDate: Date, endDate: Date): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      throw new ValidationError(
        'Invalid event dates',
        `End date (${end.toISOString()}) must be after or equal to start date (${start.toISOString()})`,
        'Please ensure the end date is on or after the start date.'
      );
    }
  }

  /**
   * Get available badges for assignment
   */
  async getAvailableBadges(limit: number = 100): Promise<Array<{ id: string; serialNumber: string }>> {
    const badges = await badgeRepository.findAll({
      status: 'active',
      assignmentType: 'unassigned',
    });

    return badges.slice(0, limit).map((badge) => ({
      id: badge.id,
      serialNumber: badge.serialNumber,
    }));
  }
}

export const eventService = new EventService();
