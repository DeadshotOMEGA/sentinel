import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Visitor,
  CreateVisitorInput,
} from '../../../../shared/types';

interface VisitorFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  visitType?: string;
  hostMemberId?: string;
}

export class VisitorRepository extends BaseRepository {
  /**
   * Find all visitors with optional filters
   */
  async findAll(filters?: VisitorFilters): Promise<Visitor[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.dateRange) {
      conditions.push(`check_in_time >= $${paramIndex++}`);
      params.push(filters.dateRange.start);
      conditions.push(`check_in_time <= $${paramIndex++}`);
      params.push(filters.dateRange.end);
    }

    if (filters?.visitType) {
      conditions.push(`visit_type = $${paramIndex++}`);
      params.push(filters.visitType);
    }

    if (filters?.hostMemberId) {
      conditions.push(`host_member_id = $${paramIndex++}`);
      params.push(filters.hostMemberId);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT *
      FROM visitors
      ${whereClause}
      ORDER BY check_in_time DESC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, params);
    return rows.map((row) => toCamelCase<Visitor>(row));
  }

  /**
   * Find visitor by ID
   */
  async findById(id: string): Promise<Visitor | null> {
    const query = `
      SELECT *
      FROM visitors
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    return toCamelCase<Visitor>(row);
  }

  /**
   * Find active visitors (not checked out)
   */
  async findActive(): Promise<Visitor[]> {
    const query = `
      SELECT *
      FROM visitors
      WHERE check_out_time IS NULL
      ORDER BY check_in_time DESC
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query);
    return rows.map((row) => toCamelCase<Visitor>(row));
  }

  /**
   * Create a new visitor
   */
  async create(data: CreateVisitorInput): Promise<Visitor> {
    if (!data.checkinTime) {
      data.checkinTime = new Date();
    }

    const query = `
      INSERT INTO visitors (
        name, organization, visit_type, host_member_id, event_id,
        visit_reason, check_in_time, temporary_badge_id, kiosk_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin')
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.name,
      data.organization,
      data.visitType,
      data.hostMemberId !== undefined ? data.hostMemberId : null,
      data.eventId !== undefined ? data.eventId : null,
      data.purpose !== undefined ? data.purpose : null,
      data.checkinTime,
      data.badgeId !== undefined ? data.badgeId : null,
    ]);

    if (!row) {
      throw new Error('Failed to create visitor');
    }

    return toCamelCase<Visitor>(row);
  }

  /**
   * Checkout a visitor (set checkout time to now)
   */
  async checkout(id: string): Promise<Visitor> {
    const query = `
      UPDATE visitors
      SET check_out_time = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      throw new Error(`Visitor not found: ${id}`);
    }

    return toCamelCase<Visitor>(row);
  }

  /**
   * Get count of active visitors (currently signed in)
   */
  async getActiveCount(): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM visitors
      WHERE check_out_time IS NULL
    `;

    const row = await this.queryOne<{ count: string }>(query);
    if (!row) {
      throw new Error('Failed to get active visitor count');
    }

    return parseInt(row.count);
  }
}

export const visitorRepository = new VisitorRepository();
