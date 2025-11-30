import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Badge,
  CreateBadgeInput,
  BadgeAssignmentType,
  BadgeStatus,
  Member,
  MemberWithDivision,
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
   * Find badges by serial numbers (batch operation to prevent N+1 queries)
   */
  async findBySerialNumbers(serialNumbers: string[]): Promise<Badge[]> {
    if (serialNumbers.length === 0) {
      return [];
    }

    const query = `
      SELECT *
      FROM badges
      WHERE serial_number = ANY($1)
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, [serialNumbers]);
    return rows.map((row) => toCamelCase<Badge>(row));
  }

  /**
   * Find badge by serial number with joined member data (for single checkin optimization)
   */
  async findBySerialNumberWithMember(serialNumber: string): Promise<{ badge: Badge; member: MemberWithDivision | null } | null> {
    const query = `
      SELECT
        b.id as badge_id, b.serial_number, b.assignment_type, b.assigned_to_id,
        b.status as badge_status, b.created_at as badge_created_at, b.updated_at as badge_updated_at,
        m.id as member_id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status as member_status, m.email, m.mobile_phone, m.home_phone,
        m.employee_number, m.initials, m.mess, m.moc, m.class_details,
        m.badge_id as member_badge_id, m.created_at as member_created_at, m.updated_at as member_updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at
      FROM badges b
      LEFT JOIN members m ON b.assigned_to_id = m.id AND b.assignment_type = 'member'
      LEFT JOIN divisions d ON m.division_id = d.id
      WHERE b.serial_number = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [serialNumber]);
    if (!row) {
      return null;
    }

    const badge = toCamelCase<Badge>({
      id: row.badge_id,
      serial_number: row.serial_number,
      assignment_type: row.assignment_type,
      assigned_to_id: row.assigned_to_id,
      status: row.badge_status,
      created_at: row.badge_created_at,
      updated_at: row.badge_updated_at,
    });

    let member: MemberWithDivision | null = null;
    if (row.member_id) {
      const memberData = toCamelCase<Member>({
        id: row.member_id,
        service_number: row.service_number,
        first_name: row.first_name,
        last_name: row.last_name,
        rank: row.rank,
        division_id: row.division_id,
        member_type: row.member_type,
        status: row.member_status,
        email: row.email,
        mobile_phone: row.mobile_phone,
        home_phone: row.home_phone,
        employee_number: row.employee_number,
        initials: row.initials,
        mess: row.mess,
        moc: row.moc,
        class_details: row.class_details,
        badge_id: row.member_badge_id,
        created_at: row.member_created_at,
        updated_at: row.member_updated_at,
      });

      member = {
        ...memberData,
        division: {
          id: row.division_id as string,
          name: row.division_name as string,
          code: row.division_code as string,
          description: row.division_description as string | undefined,
          createdAt: row.division_created_at as Date,
          updatedAt: row.division_updated_at as Date,
        },
      };
    }

    return { badge, member };
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
