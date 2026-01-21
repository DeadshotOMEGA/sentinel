import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  MemberStatusEnum,
  CreateMemberStatusInput,
  UpdateMemberStatusInput,
} from '@sentinel/types'

interface MemberStatusRow {
  id: string
  code: string
  name: string
  description: string | null
  color: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Convert database row to MemberStatusEnum
 */
function toMemberStatus(row: MemberStatusRow): MemberStatusEnum {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class MemberStatusRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all member statuses
   */
  async findAll(): Promise<MemberStatusEnum[]> {
    const rows = await this.prisma.$queryRaw<MemberStatusRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM member_statuses
      ORDER BY name
    `

    return rows.map(toMemberStatus)
  }

  /**
   * Find member status by ID
   */
  async findById(id: string): Promise<MemberStatusEnum | null> {
    const rows = await this.prisma.$queryRaw<MemberStatusRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM member_statuses
      WHERE id = ${id}::uuid
    `

    return rows.length > 0 ? toMemberStatus(rows[0]!) : null
  }

  /**
   * Find member status by code
   */
  async findByCode(code: string): Promise<MemberStatusEnum | null> {
    const rows = await this.prisma.$queryRaw<MemberStatusRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM member_statuses
      WHERE code = ${code}
    `

    return rows.length > 0 ? toMemberStatus(rows[0]!) : null
  }

  /**
   * Create a new member status
   */
  async create(data: CreateMemberStatusInput): Promise<MemberStatusEnum> {
    const rows = await this.prisma.$queryRaw<MemberStatusRow[]>`
      INSERT INTO member_statuses (code, name, description, color)
      VALUES (${data.code}, ${data.name}, ${data.description ?? null}, ${data.color ?? null})
      RETURNING id, code, name, description, color, created_at, updated_at
    `

    if (rows.length === 0) {
      throw new Error('Failed to create member status')
    }

    return toMemberStatus(rows[0]!)
  }

  /**
   * Update a member status
   */
  async update(id: string, data: UpdateMemberStatusInput): Promise<MemberStatusEnum> {
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update')
    }

    // Build dynamic SET clause
    const setClauses: string[] = []
    const values: unknown[] = []

    if (data.code !== undefined) {
      setClauses.push(`code = $${values.length + 1}`)
      values.push(data.code)
    }
    if (data.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`)
      values.push(data.name)
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${values.length + 1}`)
      values.push(data.description)
    }
    if (data.color !== undefined) {
      setClauses.push(`color = $${values.length + 1}`)
      values.push(data.color)
    }

    setClauses.push('updated_at = NOW()')

    // Use raw query for dynamic update
    const rows = await this.prisma.$queryRawUnsafe<MemberStatusRow[]>(
      `UPDATE member_statuses SET ${setClauses.join(', ')} WHERE id = $${values.length + 1}::uuid RETURNING id, code, name, description, color, created_at, updated_at`,
      ...values,
      id
    )

    if (rows.length === 0) {
      throw new Error(`Member status not found: ${id}`)
    }

    return toMemberStatus(rows[0]!)
  }

  /**
   * Delete a member status
   */
  async delete(id: string): Promise<void> {
    // Check usage first
    const usageCount = await this.getUsageCount(id)
    if (usageCount > 0) {
      throw new Error(`Cannot delete member status with ${usageCount} assigned members`)
    }

    const result = await this.prisma.$executeRaw`
      DELETE FROM member_statuses WHERE id = ${id}::uuid
    `

    if (result === 0) {
      throw new Error(`Member status not found: ${id}`)
    }
  }

  /**
   * Get usage count for a member status
   */
  async getUsageCount(id: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM members
      WHERE member_status_id = ${id}::uuid
    `
    return Number(rows[0]?.count ?? 0)
  }
}

export const memberStatusRepository = new MemberStatusRepository()
