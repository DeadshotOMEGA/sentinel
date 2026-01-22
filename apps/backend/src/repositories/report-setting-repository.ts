import type { PrismaClient, ReportSetting } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Prisma } from '@prisma/client'

/**
 * Repository for ReportSetting operations
 *
 * Manages key-value report configuration settings
 */
export class ReportSettingRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all report settings
   */
  async findAll(): Promise<ReportSetting[]> {
    return await this.prisma.reportSetting.findMany()
  }

  /**
   * Find report setting by key
   */
  async findByKey(key: string): Promise<ReportSetting | null> {
    return await this.prisma.reportSetting.findUnique({
      where: { key },
    })
  }

  /**
   * Upsert report setting (update or create)
   */
  async upsert(key: string, value: any): Promise<ReportSetting> {
    return await this.prisma.reportSetting.upsert({
      where: { key },
      update: {
        value,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
      },
    })
  }

  /**
   * Bulk upsert multiple settings in a transaction
   */
  async bulkUpsert(settings: Record<string, any>): Promise<string[]> {
    const updated: string[] = []

    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.reportSetting.upsert({
          where: { key },
          update: {
            value,
            updatedAt: new Date(),
          },
          create: {
            key,
            value,
          },
        })
        updated.push(key)
      }
    })

    return updated
  }
}
