import type { PrismaClient, report_settings } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'

type JsonValue = Prisma.JsonValue

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
  async findAll(): Promise<report_settings[]> {
    return await this.prisma.report_settings.findMany()
  }

  /**
   * Find report setting by key
   */
  async findByKey(key: string): Promise<report_settings | null> {
    return await this.prisma.report_settings.findUnique({
      where: { key },
    })
  }

  /**
   * Upsert report setting (update or create)
   */
  async upsert(key: string, value: unknown): Promise<report_settings> {
    return await this.prisma.report_settings.upsert({
      where: { key },
      update: {
        value: value as JsonValue,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: value as JsonValue,
      },
    })
  }

  /**
   * Bulk upsert multiple settings in a transaction
   */
  async bulkUpsert(settings: Record<string, unknown>): Promise<string[]> {
    const updated: string[] = []

    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.report_settings.upsert({
          where: { key },
          update: {
            value: value as JsonValue,
            updatedAt: new Date(),
          },
          create: {
            key,
            value: value as JsonValue,
          },
        })
        updated.push(key)
      }
    })

    return updated
  }
}
