import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Division as PrismaDivision } from '@sentinel/database'
import type { Division, CreateDivisionInput, UpdateDivisionInput } from '@sentinel/types'

/**
 * Convert Prisma Division (null) to shared Division (undefined)
 */
function toDivision(d: PrismaDivision): Division {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description ?? undefined,
    createdAt: d.createdAt ?? new Date(),
    updatedAt: d.updatedAt ?? new Date(),
  }
}

export class DivisionRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all divisions
   */
  async findAll(): Promise<Division[]> {
    const divisions = await this.prisma.division.findMany({
      orderBy: {
        code: 'asc',
      },
    })

    return divisions.map(toDivision)
  }

  /**
   * Find division by ID
   */
  async findById(id: string): Promise<Division | null> {
    const division = await this.prisma.division.findUnique({
      where: { id },
    })

    return division ? toDivision(division) : null
  }

  /**
   * Find division by code
   */
  async findByCode(code: string): Promise<Division | null> {
    const division = await this.prisma.division.findUnique({
      where: { code },
    })

    return division ? toDivision(division) : null
  }

  /**
   * Create a new division
   */
  async create(data: CreateDivisionInput): Promise<Division> {
    const division = await this.prisma.division.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description ?? null,
      },
    })

    return toDivision(division)
  }

  /**
   * Update a division
   */
  async update(id: string, data: UpdateDivisionInput): Promise<Division> {
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update')
    }

    try {
      const division = await this.prisma.division.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.code !== undefined && { code: data.code }),
          ...(data.description !== undefined && { description: data.description }),
        },
      })

      return toDivision(division)
    } catch (error) {
      // Check if it's a Prisma known error
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string; meta?: unknown }

        // P2025 = Record not found
        if (prismaError.code === 'P2025') {
          throw new Error(`Division not found: ${id}`)
        }

        // P2002 = Unique constraint violation - let it propagate
        // This will be caught by the route handler and converted to 409
        throw error
      }

      // Unknown error - assume not found
      throw new Error(`Division not found: ${id}`)
    }
  }

  /**
   * Delete a division (only if no members assigned)
   */
  async delete(id: string): Promise<void> {
    // Check if any members are assigned to this division
    const memberCount = await this.prisma.member.count({
      where: { divisionId: id },
    })

    if (memberCount > 0) {
      throw new Error(`Cannot delete division with ${memberCount} assigned members`)
    }

    try {
      await this.prisma.division.delete({
        where: { id },
      })
    } catch (error) {
      throw new Error(`Division not found: ${id}`)
    }
  }

  /**
   * Get the count of members assigned to a division
   */
  async getUsageCount(id: string): Promise<number> {
    const count = await this.prisma.member.count({
      where: { divisionId: id },
    })
    return count
  }
}

export const divisionRepository = new DivisionRepository()
