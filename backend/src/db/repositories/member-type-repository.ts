import { prisma } from '../prisma';
import type {
  MemberTypeEnum,
  CreateMemberTypeInput,
  UpdateMemberTypeInput,
} from '../../../../shared/types';

interface MemberTypeRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert database row to MemberTypeEnum
 */
function toMemberType(row: MemberTypeRow): MemberTypeEnum {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MemberTypeRepository {
  /**
   * Find all member types
   */
  async findAll(): Promise<MemberTypeEnum[]> {
    const rows = await prisma.$queryRaw<MemberTypeRow[]>`
      SELECT id, code, name, description, created_at, updated_at
      FROM member_types
      ORDER BY name
    `;

    return rows.map(toMemberType);
  }

  /**
   * Find member type by ID
   */
  async findById(id: string): Promise<MemberTypeEnum | null> {
    const rows = await prisma.$queryRaw<MemberTypeRow[]>`
      SELECT id, code, name, description, created_at, updated_at
      FROM member_types
      WHERE id = ${id}::uuid
    `;

    return rows.length > 0 ? toMemberType(rows[0]) : null;
  }

  /**
   * Find member type by code
   */
  async findByCode(code: string): Promise<MemberTypeEnum | null> {
    const rows = await prisma.$queryRaw<MemberTypeRow[]>`
      SELECT id, code, name, description, created_at, updated_at
      FROM member_types
      WHERE code = ${code}
    `;

    return rows.length > 0 ? toMemberType(rows[0]) : null;
  }

  /**
   * Create a new member type
   */
  async create(data: CreateMemberTypeInput): Promise<MemberTypeEnum> {
    const rows = await prisma.$queryRaw<MemberTypeRow[]>`
      INSERT INTO member_types (code, name, description)
      VALUES (${data.code}, ${data.name}, ${data.description ?? null})
      RETURNING id, code, name, description, created_at, updated_at
    `;

    if (rows.length === 0) {
      throw new Error('Failed to create member type');
    }

    return toMemberType(rows[0]);
  }

  /**
   * Update a member type
   */
  async update(id: string, data: UpdateMemberTypeInput): Promise<MemberTypeEnum> {
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

    setClauses.push('updated_at = NOW()');

    // Use raw query for dynamic update
    const rows = await prisma.$queryRawUnsafe<MemberTypeRow[]>(
      `UPDATE member_types SET ${setClauses.join(', ')} WHERE id = $${values.length + 1}::uuid RETURNING id, code, name, description, created_at, updated_at`,
      ...values,
      id
    );

    if (rows.length === 0) {
      throw new Error(`Member type not found: ${id}`);
    }

    return toMemberType(rows[0]);
  }

  /**
   * Delete a member type
   */
  async delete(id: string): Promise<void> {
    // Check usage first
    const usageCount = await this.getUsageCount(id);
    if (usageCount > 0) {
      throw new Error(`Cannot delete member type with ${usageCount} assigned members`);
    }

    const result = await prisma.$executeRaw`
      DELETE FROM member_types WHERE id = ${id}::uuid
    `;

    if (result === 0) {
      throw new Error(`Member type not found: ${id}`);
    }
  }

  /**
   * Get usage count for a member type
   */
  async getUsageCount(id: string): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM members
      WHERE member_type_id = ${id}::uuid
    `;

    return Number(rows[0]?.count ?? 0);
  }
}

export const memberTypeRepository = new MemberTypeRepository();
