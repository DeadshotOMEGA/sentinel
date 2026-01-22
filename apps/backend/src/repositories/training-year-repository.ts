import type { PrismaClient, TrainingYear } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'

/**
 * Repository for TrainingYear operations
 *
 * Manages fiscal training years with:
 * - Holiday exclusions (date ranges)
 * - Day exceptions (specific cancelled/off days)
 * - Current year flag (only one can be current)
 */
export class TrainingYearRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all training years ordered by start date (newest first)
   */
  async findAll(): Promise<TrainingYear[]> {
    return await this.prisma.trainingYear.findMany({
      orderBy: { startDate: 'desc' },
    })
  }

  /**
   * Find the current training year
   */
  async findCurrent(): Promise<TrainingYear | null> {
    return await this.prisma.trainingYear.findFirst({
      where: { isCurrent: true },
    })
  }

  /**
   * Find training year by ID
   */
  async findById(id: string): Promise<TrainingYear | null> {
    return await this.prisma.trainingYear.findUnique({
      where: { id },
    })
  }

  /**
   * Create new training year
   *
   * If isCurrent is true, a database trigger will automatically
   * unset isCurrent on all other training years.
   */
  async create(data: Prisma.TrainingYearCreateInput): Promise<TrainingYear> {
    return await this.prisma.trainingYear.create({
      data,
    })
  }

  /**
   * Update training year
   *
   * If setting isCurrent to true, a database trigger will automatically
   * unset isCurrent on all other training years.
   */
  async update(id: string, data: Prisma.TrainingYearUpdateInput): Promise<TrainingYear> {
    return await this.prisma.trainingYear.update({
      where: { id },
      data,
    })
  }

  /**
   * Set a training year as current
   *
   * Database trigger automatically unsets isCurrent on other years.
   */
  async setCurrent(id: string): Promise<TrainingYear> {
    return await this.prisma.trainingYear.update({
      where: { id },
      data: { isCurrent: true },
    })
  }

  /**
   * Delete training year
   *
   * Note: Should not delete the current training year.
   * This validation is handled in the route layer.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.trainingYear.delete({
      where: { id },
    })
  }

  /**
   * Check if a training year is current
   */
  async isCurrent(id: string): Promise<boolean> {
    const trainingYear = await this.prisma.trainingYear.findUnique({
      where: { id },
      select: { isCurrent: true },
    })
    return trainingYear?.isCurrent ?? false
  }
}
