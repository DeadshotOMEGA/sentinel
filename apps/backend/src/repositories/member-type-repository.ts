import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  MemberTypeEnum,
  CreateMemberTypeInput,
  UpdateMemberTypeInput,
} from '@sentinel/types'

interface MemberTypeRow {
  id: string
  code: string
  name: string
  description: string | null
  created_at: Date
  updated_at: Date
}

function toMemberType(row: MemberTypeRow): MemberTypeEnum {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class MemberTypeRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findAll(): Promise<MemberTypeEnum[]> {
    const rows = await this.prisma.$queryRaw<MemberTypeRow[]>`
      SELECT id, code, name, description, created_at, updated_at
      FROM member_types
      ORDER BY name
    `
    return rows.map(toMemberType)
  }

  async findById(id: string): Promise<MemberTypeEnum | null> {
    const rows = await this.prisma.$queryRaw<MemberTypeRow[]>`
      SELECT id, code, name, description, created_at, updated_at
      FROM member_types
      WHERE id = ${id}::uuid
    `
    return rows.length > 0 ? toMemberType(rows[0]!) : null
  }

  async findByCode(code: string): Promise<MemberTypeEnum | null> {
    const rows = await this.prisma.$queryRaw<MemberTypeRow[]>`
      SELECT id, code, name, description, created_at, updated_at
      FROM member_types
      WHERE code = ${code}
    `
    return rows.length > 0 ? toMemberType(rows[0]!) : null
  }

  async create(data: CreateMemberTypeInput): Promise<MemberTypeEnum> {
    const rows = await this.prisma.$queryRaw<MemberTypeRow[]>`
      INSERT INTO member_types (code, name, description)
      VALUES (${data.code}, ${data.name}, ${data.description ?? null})
      RETURNING id, code, name, description, created_at, updated_at
    `
    if (rows.length === 0) {
      throw new Error('Failed to create member type')
    }
    return toMemberType(rows[0]!)
  }

  async update(id: string, data: UpdateMemberTypeInput): Promise<MemberTypeEnum> {
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update')
    }

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

    setClauses.push('updated_at = NOW()')

    const rows = await this.prisma.$queryRawUnsafe<MemberTypeRow[]>(
      `UPDATE member_types SET ${setClauses.join(', ')} WHERE id = $${values.length + 1}::uuid RETURNING id, code, name, description, created_at, updated_at`,
      ...values,
      id
    )

    if (rows.length === 0) {
      throw new Error(`Member type not found: ${id}`)
    }

    return toMemberType(rows[0]!)
  }

  async delete(id: string): Promise<void> {
    const usageCount = await this.getUsageCount(id)
    if (usageCount > 0) {
      throw new Error(`Cannot delete member type with ${usageCount} assigned members`)
    }

    const result = await this.prisma.$executeRaw`
      DELETE FROM member_types WHERE id = ${id}::uuid
    `

    if (result === 0) {
      throw new Error(`Member type not found: ${id}`)
    }
  }

  /**
   * Get usage count for a member type
   */
  async getUsageCount(id: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM members
      WHERE member_type_id = ${id}::uuid
    `
    return Number(rows[0]?.count ?? 0)
  }
}

export const memberTypeRepository = new MemberTypeRepository()
