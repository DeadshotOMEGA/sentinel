import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Member,
  MemberWithDivision,
  CreateMemberInput,
  UpdateMemberInput,
  MemberType,
  MemberStatus,
  PaginationParams,
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
        m.division_id, m.member_type, m.status, m.email, m.mobile_phone, m.home_phone,
        m.employee_number, m.initials, m.mess, m.moc, m.class_details,
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
        mobile_phone: row.mobile_phone,
        home_phone: row.home_phone,
        employee_number: row.employee_number,
        initials: row.initials,
        mess: row.mess,
        moc: row.moc,
        class_details: row.class_details,
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
   * Find paginated members with optional filters
   */
  async findPaginated(
    params: PaginationParams,
    filters?: MemberFilters
  ): Promise<{ members: MemberWithDivision[]; total: number }> {
    if (!params.page || params.page < 1) {
      throw new Error('Invalid page number: must be >= 1');
    }
    if (!params.limit || params.limit < 1 || params.limit > 100) {
      throw new Error('Invalid limit: must be between 1 and 100');
    }

    const page = params.page;
    const limit = params.limit;
    const sortOrder = params.sortOrder ? params.sortOrder : 'asc';

    // Validate and sanitize sortBy column (allowlist to prevent SQL injection)
    const allowedSortColumns: Record<string, string> = {
      lastName: 'last_name',
      rank: 'rank',
      status: 'status',
      firstName: 'first_name',
      serviceNumber: 'service_number',
    };
    const sortByColumn = params.sortBy && allowedSortColumns[params.sortBy]
      ? allowedSortColumns[params.sortBy]
      : 'last_name';

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (filters?.divisionId) {
      conditions.push(`m.division_id = $${paramIndex++}`);
      queryParams.push(filters.divisionId);
    }

    if (filters?.memberType) {
      conditions.push(`m.member_type = $${paramIndex++}`);
      queryParams.push(filters.memberType);
    }

    if (filters?.status) {
      conditions.push(`m.status = $${paramIndex++}`);
      queryParams.push(filters.status);
    }

    if (filters?.search) {
      conditions.push(`(
        m.first_name ILIKE $${paramIndex} OR
        m.last_name ILIKE $${paramIndex} OR
        m.service_number ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Execute count and data queries in parallel
    const countQuery = `
      SELECT COUNT(*) as count
      FROM members m
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status, m.email, m.mobile_phone, m.home_phone,
        m.employee_number, m.initials, m.mess, m.moc, m.class_details,
        m.badge_id, m.created_at, m.updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      ${whereClause}
      ORDER BY m.${sortByColumn} ${sortOrder.toUpperCase()}, m.first_name ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const paginationParams = [...queryParams, limit, offset];

    const [countResult, rows] = await Promise.all([
      this.queryOne<{ count: string }>(countQuery, queryParams),
      this.queryAll<Record<string, unknown>>(dataQuery, paginationParams),
    ]);

    if (!countResult) {
      throw new Error('Failed to get member count');
    }

    const members = rows.map((row) => {
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
        mobile_phone: row.mobile_phone,
        home_phone: row.home_phone,
        employee_number: row.employee_number,
        initials: row.initials,
        mess: row.mess,
        moc: row.moc,
        class_details: row.class_details,
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

    return {
      members,
      total: parseInt(countResult.count),
    };
  }

  /**
   * Find member by ID
   */
  async findById(id: string): Promise<MemberWithDivision | null> {
    const query = `
      SELECT
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status, m.email, m.mobile_phone, m.home_phone,
        m.employee_number, m.initials, m.mess, m.moc, m.class_details,
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
      mobile_phone: row.mobile_phone,
      home_phone: row.home_phone,
      employee_number: row.employee_number,
      initials: row.initials,
      mess: row.mess,
      moc: row.moc,
      class_details: row.class_details,
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
        service_number, employee_number, first_name, last_name, initials, rank,
        division_id, mess, moc, member_type, class_details, status, email,
        home_phone, mobile_phone, badge_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.serviceNumber,
      data.employeeNumber ?? null,
      data.firstName,
      data.lastName,
      data.initials ?? null,
      data.rank,
      data.divisionId,
      data.mess ?? null,
      data.moc ?? null,
      data.memberType,
      data.classDetails ?? null,
      data.status,
      data.email ?? null,
      data.homePhone ?? null,
      data.mobilePhone ?? null,
      data.badgeId ?? null,
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
    if (data.employeeNumber !== undefined) {
      updates.push(`employee_number = $${paramIndex++}`);
      params.push(data.employeeNumber);
    }
    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(data.lastName);
    }
    if (data.initials !== undefined) {
      updates.push(`initials = $${paramIndex++}`);
      params.push(data.initials);
    }
    if (data.rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`);
      params.push(data.rank);
    }
    if (data.divisionId !== undefined) {
      updates.push(`division_id = $${paramIndex++}`);
      params.push(data.divisionId);
    }
    if (data.mess !== undefined) {
      updates.push(`mess = $${paramIndex++}`);
      params.push(data.mess);
    }
    if (data.moc !== undefined) {
      updates.push(`moc = $${paramIndex++}`);
      params.push(data.moc);
    }
    if (data.memberType !== undefined) {
      updates.push(`member_type = $${paramIndex++}`);
      params.push(data.memberType);
    }
    if (data.classDetails !== undefined) {
      updates.push(`class_details = $${paramIndex++}`);
      params.push(data.classDetails);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.homePhone !== undefined) {
      updates.push(`home_phone = $${paramIndex++}`);
      params.push(data.homePhone);
    }
    if (data.mobilePhone !== undefined) {
      updates.push(`mobile_phone = $${paramIndex++}`);
      params.push(data.mobilePhone);
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
   * Find members by IDs (batch operation to prevent N+1 queries)
   */
  async findByIds(ids: string[]): Promise<MemberWithDivision[]> {
    if (ids.length === 0) {
      return [];
    }

    const query = `
      SELECT
        m.id, m.service_number, m.first_name, m.last_name, m.rank,
        m.division_id, m.member_type, m.status, m.email, m.mobile_phone, m.home_phone,
        m.employee_number, m.initials, m.mess, m.moc, m.class_details,
        m.badge_id, m.created_at, m.updated_at,
        d.id as division_id, d.name as division_name, d.code as division_code,
        d.description as division_description, d.created_at as division_created_at,
        d.updated_at as division_updated_at
      FROM members m
      INNER JOIN divisions d ON m.division_id = d.id
      WHERE m.id = ANY($1)
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, [ids]);

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
        mobile_phone: row.mobile_phone,
        home_phone: row.home_phone,
        employee_number: row.employee_number,
        initials: row.initials,
        mess: row.mess,
        moc: row.moc,
        class_details: row.class_details,
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
   * Find members by service numbers (for import operations)
   */
  async findByServiceNumbers(serviceNumbers: string[]): Promise<Member[]> {
    if (serviceNumbers.length === 0) {
      return [];
    }

    const query = `
      SELECT *
      FROM members
      WHERE service_number = ANY($1)
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query, [serviceNumbers]);
    return rows.map((row) => toCamelCase<Member>(row));
  }

  /**
   * Bulk create members (for import operations)
   */
  async bulkCreate(members: CreateMemberInput[]): Promise<number> {
    if (members.length === 0) {
      return 0;
    }

    const client = await this.beginTransaction();

    try {
      let insertedCount = 0;

      for (const member of members) {
        if (!member.status) {
          member.status = 'active';
        }

        const query = `
          INSERT INTO members (
            service_number, employee_number, first_name, last_name, initials, rank,
            division_id, mess, moc, member_type, class_details, status, email,
            home_phone, mobile_phone, badge_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `;

        await client.query(query, [
          member.serviceNumber,
          member.employeeNumber ?? null,
          member.firstName,
          member.lastName,
          member.initials ?? null,
          member.rank,
          member.divisionId,
          member.mess ?? null,
          member.moc ?? null,
          member.memberType,
          member.classDetails ?? null,
          member.status,
          member.email ?? null,
          member.homePhone ?? null,
          member.mobilePhone ?? null,
          member.badgeId ?? null,
        ]);

        insertedCount++;
      }

      await this.commitTransaction(client);
      await this.invalidatePresenceCache();

      return insertedCount;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Bulk update members (for import operations)
   */
  async bulkUpdate(updates: Array<{ id: string; data: UpdateMemberInput }>): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    const client = await this.beginTransaction();

    try {
      let updatedCount = 0;

      for (const { id, data } of updates) {
        const updateFields: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (data.serviceNumber !== undefined) {
          updateFields.push(`service_number = $${paramIndex++}`);
          params.push(data.serviceNumber);
        }
        if (data.employeeNumber !== undefined) {
          updateFields.push(`employee_number = $${paramIndex++}`);
          params.push(data.employeeNumber);
        }
        if (data.firstName !== undefined) {
          updateFields.push(`first_name = $${paramIndex++}`);
          params.push(data.firstName);
        }
        if (data.lastName !== undefined) {
          updateFields.push(`last_name = $${paramIndex++}`);
          params.push(data.lastName);
        }
        if (data.initials !== undefined) {
          updateFields.push(`initials = $${paramIndex++}`);
          params.push(data.initials);
        }
        if (data.rank !== undefined) {
          updateFields.push(`rank = $${paramIndex++}`);
          params.push(data.rank);
        }
        if (data.divisionId !== undefined) {
          updateFields.push(`division_id = $${paramIndex++}`);
          params.push(data.divisionId);
        }
        if (data.mess !== undefined) {
          updateFields.push(`mess = $${paramIndex++}`);
          params.push(data.mess);
        }
        if (data.moc !== undefined) {
          updateFields.push(`moc = $${paramIndex++}`);
          params.push(data.moc);
        }
        if (data.memberType !== undefined) {
          updateFields.push(`member_type = $${paramIndex++}`);
          params.push(data.memberType);
        }
        if (data.classDetails !== undefined) {
          updateFields.push(`class_details = $${paramIndex++}`);
          params.push(data.classDetails);
        }
        if (data.status !== undefined) {
          updateFields.push(`status = $${paramIndex++}`);
          params.push(data.status);
        }
        if (data.email !== undefined) {
          updateFields.push(`email = $${paramIndex++}`);
          params.push(data.email);
        }
        if (data.homePhone !== undefined) {
          updateFields.push(`home_phone = $${paramIndex++}`);
          params.push(data.homePhone);
        }
        if (data.mobilePhone !== undefined) {
          updateFields.push(`mobile_phone = $${paramIndex++}`);
          params.push(data.mobilePhone);
        }
        if (data.badgeId !== undefined) {
          updateFields.push(`badge_id = $${paramIndex++}`);
          params.push(data.badgeId);
        }

        if (updateFields.length === 0) {
          continue; // Skip if no fields to update
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        const query = `
          UPDATE members
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;

        const result = await client.query(query, params);
        if (result.rowCount && result.rowCount > 0) {
          updatedCount++;
        }
      }

      await this.commitTransaction(client);
      await this.invalidatePresenceCache();

      return updatedCount;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Flag members for review (set status to pending_review)
   */
  async flagForReview(memberIds: string[]): Promise<void> {
    if (memberIds.length === 0) {
      return;
    }

    const query = `
      UPDATE members
      SET status = 'pending_review', updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1)
    `;

    await this.query(query, [memberIds]);
    await this.invalidatePresenceCache();
  }

  /**
   * Invalidate presence cache in Redis
   */
  private async invalidatePresenceCache(): Promise<void> {
    await redis.del('presence:stats');
  }
}

export const memberRepository = new MemberRepository();
