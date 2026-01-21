import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type {
  VisitTypeEnum,
  CreateVisitTypeInput,
  UpdateVisitTypeInput,
} from '@sentinel/types'

interface VisitTypeRow {
  id: string
  code: string
  name: string
  description: string | null
  color: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Convert database row to VisitTypeEnum
 */
function toVisitType(row: VisitTypeRow): VisitTypeEnum {
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

export class VisitTypeRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all visit types
   */
  async findAll(): Promise<VisitTypeEnum[]> {
    const rows = await this.prisma.$queryRaw<VisitTypeRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM visit_types
      ORDER BY name
    `

    return rows.map(toVisitType)
  }

  /**
   * Find visit type by ID
   */
  async findById(id: string): Promise<VisitTypeEnum | null> {
    const rows = await this.prisma.$queryRaw<VisitTypeRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM visit_types
      WHERE id = ${id}::uuid
    `

    return rows.length > 0 ? toVisitType(rows[0]!) : null
  }

  /**
   * Find visit type by code
   */
  async findByCode(code: string): Promise<VisitTypeEnum | null> {
    const rows = await this.prisma.$queryRaw<VisitTypeRow[]>`
      SELECT id, code, name, description, color, created_at, updated_at
      FROM visit_types
      WHERE code = ${code}
    `

    return rows.length > 0 ? toVisitType(rows[0]!) : null
  }

  /**
   * Create a new visit type
   */
  async create(data: CreateVisitTypeInput): Promise<VisitTypeEnum> {
    const rows = await this.prisma.$queryRaw<VisitTypeRow[]>`
      INSERT INTO visit_types (code, name, description, color)
      VALUES (${data.code}, ${data.name}, ${data.description ?? null}, ${data.color ?? null})
      RETURNING id, code, name, description, color, created_at, updated_at
    `

    if (rows.length === 0) {
      throw new Error('Failed to create visit type')
    }

    return toVisitType(rows[0]!)
  }

  /**
   * Update a visit type
   */
  async update(id: string, data: UpdateVisitTypeInput): Promise<VisitTypeEnum> {
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
    const rows = await this.prisma.$queryRawUnsafe<VisitTypeRow[]>(
      `UPDATE visit_types SET ${setClauses.join(', ')} WHERE id = $${values.length + 1}::uuid RETURNING id, code, name, description, color, created_at, updated_at`,
      ...values,
      id
    )

    if (rows.length === 0) {
      throw new Error(`Visit type not found: ${id}`)
    }

    return toVisitType(rows[0]!)
  }

  /**
   * Delete a visit type
   */
  async delete(id: string): Promise<void> {
    // Check usage first
    const usageCount = await this.getUsageCount(id)
    if (usageCount > 0) {
      throw new Error(`Cannot delete visit type with ${usageCount} assigned visitors`)
    }

    const result = await this.prisma.$executeRaw`
      DELETE FROM visit_types WHERE id = ${id}::uuid
    `

    if (result === 0) {
      throw new Error(`Visit type not found: ${id}`)
    }
  }

  /**
   * Get usage count for a visit type
   */
  async getUsageCount(id: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM visitors
      WHERE visit_type_id = ${id}::uuid
    `
    return Number(rows[0]?.count ?? 0)
  }
}

export const visitTypeRepository = new VisitTypeRepository()
