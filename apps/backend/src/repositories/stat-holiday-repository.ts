import type { PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

/**
 * Stat holiday entity
 */
export interface StatHolidayEntity {
  id: string
  date: Date
  name: string
  province: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Create stat holiday input
 */
export interface CreateStatHolidayInput {
  date: Date
  name: string
  province?: string | null
  isActive?: boolean
}

/**
 * Update stat holiday input
 */
export interface UpdateStatHolidayInput {
  date?: Date
  name?: string
  province?: string | null
  isActive?: boolean
}

/**
 * Repository for managing statutory holidays
 */
export class StatHolidayRepository {
  private prisma: PrismaClientInstance

  constructor(prisma: PrismaClientInstance = defaultPrisma) {
    this.prisma = prisma
  }

  /**
   * Find all stat holidays
   */
  async findAll(options?: {
    year?: number
    province?: string
    activeOnly?: boolean
  }): Promise<StatHolidayEntity[]> {
    const where: {
      date?: { gte?: Date; lt?: Date }
      province?: string | null
      isActive?: boolean
    } = {}

    if (options?.year) {
      where.date = {
        gte: new Date(`${options.year}-01-01`),
        lt: new Date(`${options.year + 1}-01-01`),
      }
    }

    if (options?.province !== undefined) {
      where.province = options.province || null
    }

    if (options?.activeOnly) {
      where.isActive = true
    }

    const holidays = await this.prisma.statHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return holidays
  }

  /**
   * Find a stat holiday by ID
   */
  async findById(id: string): Promise<StatHolidayEntity | null> {
    return this.prisma.statHoliday.findUnique({
      where: { id },
    })
  }

  /**
   * Find a stat holiday by date
   */
  async findByDate(date: Date): Promise<StatHolidayEntity | null> {
    // Normalize to start of day
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    return this.prisma.statHoliday.findUnique({
      where: { date: normalizedDate },
    })
  }

  /**
   * Check if a date is a statutory holiday
   */
  async isHoliday(date: Date): Promise<boolean> {
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)

    const holiday = await this.prisma.statHoliday.findFirst({
      where: {
        date: normalizedDate,
        isActive: true,
      },
      select: { id: true },
    })

    return holiday !== null
  }

  /**
   * Get all holidays in a date range
   */
  async findInRange(startDate: Date, endDate: Date): Promise<StatHolidayEntity[]> {
    return this.prisma.statHoliday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        isActive: true,
      },
      orderBy: { date: 'asc' },
    })
  }

  /**
   * Create a new stat holiday
   */
  async create(input: CreateStatHolidayInput): Promise<StatHolidayEntity> {
    // Normalize date to start of day
    const normalizedDate = new Date(input.date)
    normalizedDate.setHours(0, 0, 0, 0)

    return this.prisma.statHoliday.create({
      data: {
        date: normalizedDate,
        name: input.name,
        province: input.province ?? null,
        isActive: input.isActive ?? true,
      },
    })
  }

  /**
   * Update a stat holiday
   */
  async update(id: string, input: UpdateStatHolidayInput): Promise<StatHolidayEntity> {
    const data: {
      date?: Date
      name?: string
      province?: string | null
      isActive?: boolean
    } = {}

    if (input.date !== undefined) {
      const normalizedDate = new Date(input.date)
      normalizedDate.setHours(0, 0, 0, 0)
      data.date = normalizedDate
    }

    if (input.name !== undefined) {
      data.name = input.name
    }

    if (input.province !== undefined) {
      data.province = input.province
    }

    if (input.isActive !== undefined) {
      data.isActive = input.isActive
    }

    return this.prisma.statHoliday.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete a stat holiday
   */
  async delete(id: string): Promise<void> {
    await this.prisma.statHoliday.delete({
      where: { id },
    })
  }

  /**
   * Count stat holidays
   */
  async count(options?: {
    year?: number
    province?: string
    activeOnly?: boolean
  }): Promise<number> {
    const where: {
      date?: { gte?: Date; lt?: Date }
      province?: string | null
      isActive?: boolean
    } = {}

    if (options?.year) {
      where.date = {
        gte: new Date(`${options.year}-01-01`),
        lt: new Date(`${options.year + 1}-01-01`),
      }
    }

    if (options?.province !== undefined) {
      where.province = options.province || null
    }

    if (options?.activeOnly) {
      where.isActive = true
    }

    return this.prisma.statHoliday.count({ where })
  }
}
