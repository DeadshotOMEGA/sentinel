import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Member,
  MemberWithDivision,
  CreateMemberInput,
  UpdateMemberInput,
  MemberType,
  MemberStatus,
} from '../../../../shared/types';
import { redis } from '../redis';

interface MemberFilters {
  divisionId?: string;
  memberType?: MemberType;
  status?: MemberStatus;
  search?: string;
}

export class MemberRepository extends BaseRepository {
  /**
   * Find all members with optional filters
   */
  async findAll(filters?: MemberFilters): Promise<MemberWithDivision[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.divisionId) {
      conditions.push(`m.division_id = $${paramIndex++}`);
      params.push(filters.divisionId);
    }

    if (filters?.memberType) {
      conditions.push(`m.member_type = $${paramIndex++}`);
      params.push(filters.memberType);
    }

    if (filters?.status) {
      conditions.push(`m.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.search) {
      conditions.push(`(
        m.first_name ILIKE $${paramIndex} OR
        m.last_name ILIKE $${paramIndex} OR
        m.service_number ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status, m.email, m.phone,
        m.badge_id, m.created_at, m.updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      ${whereClause}
      ORDER BY m.last_name, m.first_name
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, params);

    return rows.map((row) => {
      const member = toCamelCase<Member>({
        id: row.id,
        service_number: row.service_number,
        first_name: row.first_name,
        last_name: row.last_name,
        rank: row.rank,
        division_id: row.division_id,
        member_type: row.member_type,
        status: row.status,
        email: row.email,
        phone: row.phone,
        badge_id: row.badge_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });

      return {
        ...member,
        division: {
          id: row.division_id as string,
          name: row.division_name as string,
          code: row.division_code as string,
          description: row.division_description as string | undefined,
          createdAt: row.division_created_at as Date,
          updatedAt: row.division_updated_at as Date,
        },
      };
    });
  }

  /**
   * Find member by ID
   */
  async findById(id: string): Promise<MemberWithDivision | null> {
    const query = `
      SELECT
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status, m.email, m.phone,
        m.badge_id, m.created_at, m.updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      WHERE m.id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    const member = toCamelCase<Member>({
      id: row.id,
      service_number: row.service_number,
      first_name: row.first_name,
      last_name: row.last_name,
      rank: row.rank,
      division_id: row.division_id,
      member_type: row.member_type,
      status: row.status,
      email: row.email,
      phone: row.phone,
      badge_id: row.badge_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    return {
      ...member,
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

  /**
   * Find member by service number
   */
  async findByServiceNumber(serviceNumber: string): Promise<Member | null> {
    const query = `
      SELECT *
      FROM members
      WHERE service_number = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [serviceNumber]);
    if (!row) {
      return null;
    }

    return toCamelCase<Member>(row);
  }

  /**
   * Create a new member
   */
  async create(data: CreateMemberInput): Promise<Member> {
    if (!data.status) {
      data.status = 'active';
    }

    const query = `
      INSERT INTO members (
        service_number, first_name, last_name, rank, division_id,
        member_type, status, email, phone, badge_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.serviceNumber,
      data.firstName,
      data.lastName,
      data.rank,
      data.divisionId,
      data.memberType,
      data.status,
      data.email !== undefined ? data.email : null,
      data.phone !== undefined ? data.phone : null,
      data.badgeId !== undefined ? data.badgeId : null,
    ]);

    if (!row) {
      throw new Error('Failed to create member');
    }

    await this.invalidatePresenceCache();
    return toCamelCase<Member>(row);
  }

  /**
   * Update a member
   */
  async update(id: string, data: UpdateMemberInput): Promise<Member> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.serviceNumber !== undefined) {
      updates.push(`service_number = $${paramIndex++}`);
      params.push(data.serviceNumber);
    }
    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(data.lastName);
    }
    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`);
      params.push(data.rank);
    }
    if (data.divisionId !== undefined) {
      updates.push(`division_id = $${paramIndex++}`);
      params.push(data.divisionId);
    }
    if (data.memberType !== undefined) {
      updates.push(`member_type = $${paramIndex++}`);
      params.push(data.memberType);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    if (data.badgeId !== undefined) {
      updates.push(`badge_id = $${paramIndex++}`);
      params.push(data.badgeId);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE members
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, params);
    if (!row) {
      throw new Error(`Member not found: ${id}`);
    }

    await this.invalidatePresenceCache();
    return toCamelCase<Member>(row);
  }

  /**
   * Delete (soft delete) a member
   */
  async delete(id: string): Promise<void> {
    const query = `
      UPDATE members
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Member not found: ${id}`);
    }

    await this.invalidatePresenceCache();
  }

  /**
   * Get presence status for a member (present/absent)
   */
  async getPresenceStatus(memberId: string): Promise<'present' | 'absent'> {
    const query = `
      SELECT direction
      FROM checkins
      WHERE member_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const row = await this.queryOne<{ direction: 'in' | 'out' }>(query, [memberId]);
    return row?.direction === 'in' ? 'present' : 'absent';
  }

  /**
   * Invalidate presence cache in Redis
   */
  private async invalidatePresenceCache(): Promise<void> {
    await redis.del('presence:stats');
  }
}

export const memberRepository = new MemberRepository();
