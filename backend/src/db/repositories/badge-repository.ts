import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Badge,
  CreateBadgeInput,
  BadgeAssignmentType,
  BadgeStatus,
} from '../../../../shared/types';

interface BadgeFilters {
  status?: BadgeStatus;
  assignmentType?: BadgeAssignmentType;
}

export class BadgeRepository extends BaseRepository {
  /**
   * Find all badges with optional filters
   */
  async findAll(filters?: BadgeFilters): Promise<Badge[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.assignmentType) {
      conditions.push(`assignment_type = $${paramIndex++}`);
      params.push(filters.assignmentType);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT *
      FROM badges
      ${whereClause}
      ORDER BY serial_number
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, params);
    return rows.map((row) => toCamelCase<Badge>(row));
  }

  /**
   * Find badge by ID
   */
  async findById(id: string): Promise<Badge | null> {
    const query = `
      SELECT *
      FROM badges
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    return toCamelCase<Badge>(row);
  }

  /**
   * Find badge by serial number (NFC UID)
   */
  async findBySerialNumber(serialNumber: string): Promise<Badge | null> {
    const query = `
      SELECT *
      FROM badges
      WHERE serial_number = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [serialNumber]);
    if (!row) {
      return null;
    }

    return toCamelCase<Badge>(row);
  }

  /**
   * Create a new badge
   */
  async create(data: CreateBadgeInput): Promise<Badge> {
    if (!data.assignmentType) {
      data.assignmentType = 'unassigned';
    }
    if (!data.status) {
      data.status = 'active';
    }

    const query = `
      INSERT INTO badges (
        serial_number, assignment_type, assigned_to_id, status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.serialNumber,
      data.assignmentType,
      data.assignedToId !== undefined ? data.assignedToId : null,
      data.status,
    ]);

    if (!row) {
      throw new Error('Failed to create badge');
    }

    return toCamelCase<Badge>(row);
  }

  /**
   * Assign badge to a member or event attendee
   */
  async assign(
    badgeId: string,
    assignedToId: string,
    assignmentType: BadgeAssignmentType
  ): Promise<Badge> {
    if (assignmentType === 'unassigned') {
      throw new Error('Cannot assign badge with type "unassigned"');
    }

    const query = `
      UPDATE badges
      SET assignment_type = $1,
          assigned_to_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      assignmentType,
      assignedToId,
      badgeId,
    ]);

    if (!row) {
      throw new Error(`Badge not found: ${badgeId}`);
    }

    return toCamelCase<Badge>(row);
  }

  /**
   * Unassign badge
   */
  async unassign(badgeId: string): Promise<Badge> {
    const query = `
      UPDATE badges
      SET assignment_type = 'unassigned',
          assigned_to_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [badgeId]);

    if (!row) {
      throw new Error(`Badge not found: ${badgeId}`);
    }

    return toCamelCase<Badge>(row);
  }

  /**
   * Update badge status
   */
  async updateStatus(badgeId: string, status: BadgeStatus): Promise<Badge> {
    const query = `
      UPDATE badges
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [status, badgeId]);

    if (!row) {
      throw new Error(`Badge not found: ${badgeId}`);
    }

    return toCamelCase<Badge>(row);
  }
}

export const badgeRepository = new BadgeRepository();
