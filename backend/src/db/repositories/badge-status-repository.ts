import { prisma } from '../prisma';
import type {
  BadgeStatusEnum,
  CreateBadgeStatusInput,
  UpdateBadgeStatusInput,
} from '../../../../shared/types';

interface BadgeStatusRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to BadgeStatusEnum
 */
function toBadgeStatus(row: BadgeStatusRow): BadgeStatusEnum {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class BadgeStatusRepository {
  /**
   * Find all badge statuses
   */
  async findAll(): Promise<BadgeStatusEnum[]> {
    const rows = await prisma.$queryRaw<BadgeStatusRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM badge_statuses
      ORDER BY name
    `;

    return rows.map(toBadgeStatus);
  }

  /**
   * Find badge status by ID
   */
  async findById(id: string): Promise<BadgeStatusEnum | null> {
    const rows = await prisma.$queryRaw<BadgeStatusRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM badge_statuses
      WHERE id = ${id}::uuid
    `;

    return rows.length > 0 ? toBadgeStatus(rows[0]) : null;
  }

  /**
   * Find badge status by code
   */
  async findByCode(code: string): Promise<BadgeStatusEnum | null> {
    const rows = await prisma.$queryRaw<BadgeStatusRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM badge_statuses
      WHERE code = ${code}
    `;

    return rows.length > 0 ? toBadgeStatus(rows[0]) : null;
  }

  /**
   * Create a new badge status
   */
  async create(data: CreateBadgeStatusInput): Promise<BadgeStatusEnum> {
    const rows = await prisma.$queryRaw<BadgeStatusRow[]>`
      INSERT INTO badge_statuses (code, name, description, color)
      VALUES (${data.code}, ${data.name}, ${data.description ?? null}, ${data.color ?? null})
      RETURNING id, code, name, description, color, created_at, updated_at
    `;

    if (rows.length === 0) {
      throw new Error('Failed to create badge status');
    }

    return toBadgeStatus(rows[0]);
  }

  /**
   * Update a badge status
   */
  async update(id: string, data: UpdateBadgeStatusInput): Promise<BadgeStatusEnum> {
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    // Build dynamic SET clause
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.code !== undefined) {
      setClauses.push(`code = $${values.length + 1}`);
      values.push(data.code);
    }
    if (data.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${values.length + 1}`);
      values.push(data.description);
    }
    if (data.color !== undefined) {
      setClauses.push(`color = $${values.length + 1}`);
      values.push(data.color);
    }

    setClauses.push('updated_at = NOW()');

    // Use raw query for dynamic update
    const rows = await prisma.$queryRawUnsafe<BadgeStatusRow[]>(
      `UPDATE badge_statuses SET ${setClauses.join(', ')} WHERE id = $${values.length + 1}::uuid RETURNING id, code, name, description, color, created_at, updated_at`,
      ...values,
      id
    );

    if (rows.length === 0) {
      throw new Error(`Badge status not found: ${id}`);
    }

    return toBadgeStatus(rows[0]);
  }

  /**
   * Delete a badge status
   */
  async delete(id: string): Promise<void> {
    // Check usage first
    const usageCount = await this.getUsageCount(id);
    if (usageCount > 0) {
      throw new Error(`Cannot delete badge status with ${usageCount} assigned badges`);
    }

    const result = await prisma.$executeRaw`
      DELETE FROM badge_statuses WHERE id = ${id}::uuid
    `;

    if (result === 0) {
      throw new Error(`Badge status not found: ${id}`);
    }
  }

  /**
   * Get usage count for a badge status
   */
  async getUsageCount(id: string): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM badges
      WHERE badge_status_id = ${id}::uuid
    `;

    return Number(rows[0]?.count ?? 0);
  }
}

export const badgeStatusRepository = new BadgeStatusRepository();
