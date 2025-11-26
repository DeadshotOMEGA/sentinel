import { BaseRepository, toCamelCase, toSnakeCase } from './base-repository';
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
} from '../../../../shared/types';

interface EventPresenceStats {
  eventId: string;
  totalAttendees: number;
  activeAttendees: number;
  checkedOut: number;
  expired: number;
}

export class EventRepository extends BaseRepository {
  // ============================================================================
  // EVENT CRUD OPERATIONS
  // ============================================================================

  /**
   * Find all events
   */
  async findAll(): Promise<Event[]> {
    const query = `
      SELECT *
      FROM events
      ORDER BY start_date DESC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query);
    return rows.map((row) => toCamelCase<Event>(row));
  }

  /**
   * Find event by ID
   */
  async findById(id: string): Promise<Event | null> {
    const query = `
      SELECT *
      FROM events
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    return toCamelCase<Event>(row);
  }

  /**
   * Find event by code
   */
  async findByCode(code: string): Promise<Event | null> {
    const query = `
      SELECT *
      FROM events
      WHERE code = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [code]);
    if (!row) {
      return null;
    }

    return toCamelCase<Event>(row);
  }

  /**
   * Create a new event
   */
  async create(data: CreateEventInput): Promise<Event> {
    const status = data.status || 'draft';
    const autoExpire = data.autoExpireBadges ?? true;

    const query = `
      INSERT INTO events (
        name, code, description, start_date, end_date,
        status, auto_expire_badges, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.name,
      data.code,
      data.description || null,
      data.startDate,
      data.endDate,
      status,
      autoExpire,
      data.createdBy || null,
    ]);

    if (!row) {
      throw new Error('Failed to create event');
    }

    return toCamelCase<Event>(row);
  }

  /**
   * Update an event
   */
  async update(id: string, data: UpdateEventInput): Promise<Event> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      params.push(data.code);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      params.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      params.push(data.endDate);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.autoExpireBadges !== undefined) {
      updates.push(`auto_expire_badges = $${paramIndex++}`);
      params.push(data.autoExpireBadges);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, params);
    if (!row) {
      throw new Error(`Event not found: ${id}`);
    }

    return toCamelCase<Event>(row);
  }

  /**
   * Delete an event (hard delete)
   */
  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM events
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Event not found: ${id}`);
    }
  }

  // ============================================================================
  // EVENT ATTENDEE CRUD OPERATIONS
  // ============================================================================

  /**
   * Find all attendees for an event
   */
  async findByEventId(eventId: string): Promise<EventAttendee[]> {
    const query = `
      SELECT *
      FROM event_attendees
      WHERE event_id = $1
      ORDER BY name ASC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, [eventId]);
    return rows.map((row) => toCamelCase<EventAttendee>(row));
  }

  /**
   * Find attendee by ID
   */
  async findAttendeeById(id: string): Promise<EventAttendee | null> {
    const query = `
      SELECT *
      FROM event_attendees
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    return toCamelCase<EventAttendee>(row);
  }

  /**
   * Add a new attendee to an event
   */
  async addAttendee(data: CreateAttendeeInput): Promise<EventAttendee> {
    const status = data.status || 'pending';

    const query = `
      INSERT INTO event_attendees (
        event_id, name, rank, organization, role,
        badge_id, badge_assigned_at, access_start, access_end, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.eventId,
      data.name,
      data.rank || null,
      data.organization,
      data.role,
      data.badgeId || null,
      data.badgeAssignedAt || null,
      data.accessStart || null,
      data.accessEnd || null,
      status,
    ]);

    if (!row) {
      throw new Error('Failed to add event attendee');
    }

    return toCamelCase<EventAttendee>(row);
  }

  /**
   * Update an event attendee
   */
  async updateAttendee(id: string, data: UpdateAttendeeInput): Promise<EventAttendee> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`);
      params.push(data.rank);
    }
    if (data.organization !== undefined) {
      updates.push(`organization = $${paramIndex++}`);
      params.push(data.organization);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(data.role);
    }
    if (data.badgeId !== undefined) {
      updates.push(`badge_id = $${paramIndex++}`);
      params.push(data.badgeId);
    }
    if (data.badgeAssignedAt !== undefined) {
      updates.push(`badge_assigned_at = $${paramIndex++}`);
      params.push(data.badgeAssignedAt);
    }
    if (data.accessStart !== undefined) {
      updates.push(`access_start = $${paramIndex++}`);
      params.push(data.accessStart);
    }
    if (data.accessEnd !== undefined) {
      updates.push(`access_end = $${paramIndex++}`);
      params.push(data.accessEnd);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE event_attendees
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, params);
    if (!row) {
      throw new Error(`Event attendee not found: ${id}`);
    }

    return toCamelCase<EventAttendee>(row);
  }

  /**
   * Remove an attendee from an event
   */
  async removeAttendee(id: string): Promise<void> {
    const query = `
      DELETE FROM event_attendees
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Event attendee not found: ${id}`);
    }
  }

  // ============================================================================
  // BADGE ASSIGNMENT OPERATIONS
  // ============================================================================

  /**
   * Assign a badge to an event attendee
   */
  async assignBadge(attendeeId: string, badgeId: string): Promise<EventAttendee> {
    const query = `
      UPDATE event_attendees
      SET badge_id = $1, badge_assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [badgeId, attendeeId]);
    if (!row) {
      throw new Error(`Event attendee not found: ${attendeeId}`);
    }

    return toCamelCase<EventAttendee>(row);
  }

  /**
   * Unassign a badge from an event attendee
   */
  async unassignBadge(attendeeId: string): Promise<EventAttendee> {
    const query = `
      UPDATE event_attendees
      SET badge_id = NULL, badge_assigned_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [attendeeId]);
    if (!row) {
      throw new Error(`Event attendee not found: ${attendeeId}`);
    }

    return toCamelCase<EventAttendee>(row);
  }

  // ============================================================================
  // PRESENCE/CHECK-IN OPERATIONS
  // ============================================================================

  /**
   * Get presence statistics for an event
   */
  async getEventPresenceStats(eventId: string): Promise<EventPresenceStats> {
    const query = `
      SELECT
        event_id,
        COUNT(*) as total_attendees,
        COUNT(*) FILTER (WHERE status = 'active') as active_attendees,
        COUNT(*) FILTER (WHERE status = 'checked_out') as checked_out,
        COUNT(*) FILTER (WHERE status = 'expired') as expired
      FROM event_attendees
      WHERE event_id = $1
      GROUP BY event_id
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [eventId]);
    if (!row) {
      throw new Error(`No attendees found for event: ${eventId}`);
    }

    const eventIdValue = row.event_id;
    const totalAttendeesValue = row.total_attendees;
    const activeAttendeesValue = row.active_attendees;
    const checkedOutValue = row.checked_out;
    const expiredValue = row.expired;

    if (
      typeof eventIdValue !== 'string' ||
      typeof totalAttendeesValue === 'undefined' ||
      typeof activeAttendeesValue === 'undefined' ||
      typeof checkedOutValue === 'undefined' ||
      typeof expiredValue === 'undefined'
    ) {
      throw new Error('Invalid response from presence statistics query');
    }

    return {
      eventId: eventIdValue,
      totalAttendees: parseInt(totalAttendeesValue as string, 10),
      activeAttendees: parseInt(activeAttendeesValue as string, 10),
      checkedOut: parseInt(checkedOutValue as string, 10),
      expired: parseInt(expiredValue as string, 10),
    };
  }

  /**
   * Get active attendees for an event
   */
  async getActiveAttendees(eventId: string): Promise<EventAttendee[]> {
    const query = `
      SELECT *
      FROM event_attendees
      WHERE event_id = $1 AND status = 'active'
      ORDER BY name ASC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, [eventId]);
    return rows.map((row) => toCamelCase<EventAttendee>(row));
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
    const query = `
      INSERT INTO event_checkins (
        event_attendee_id, badge_id, direction, timestamp, kiosk_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      eventAttendeeId,
      badgeId,
      direction,
      timestamp,
      kioskId,
    ]);

    if (!row) {
      throw new Error('Failed to record event check-in');
    }

    return toCamelCase<EventCheckin>(row);
  }

  /**
   * Get check-in history for an event attendee
   */
  async getAttendeeCheckins(eventAttendeeId: string): Promise<EventCheckin[]> {
    const query = `
      SELECT *
      FROM event_checkins
      WHERE event_attendee_id = $1
      ORDER BY timestamp DESC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, [eventAttendeeId]);
    return rows.map((row) => toCamelCase<EventCheckin>(row));
  }

  /**
   * Get last check-in direction for an attendee (to determine current status)
   */
  async getLastCheckinDirection(eventAttendeeId: string): Promise<EventCheckinDirection | null> {
    const query = `
      SELECT direction
      FROM event_checkins
      WHERE event_attendee_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const row = await this.queryOne<{ direction: EventCheckinDirection }>(query, [
      eventAttendeeId,
    ]);
    return row?.direction || null;
  }
}

export const eventRepository = new EventRepository();
