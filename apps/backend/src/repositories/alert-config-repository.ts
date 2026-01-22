import type { PrismaClient, AlertConfig } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'

/**
 * Repository for AlertConfig operations
 *
 * Manages security alert rule configurations
 */
export class AlertConfigRepository {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all alert configurations
   */
  async findAll(): Promise<AlertConfig[]> {
    return await this.prisma.alertConfig.findMany()
  }

  /**
   * Find alert configuration by key
   */
  async findByKey(key: string): Promise<AlertConfig | null> {
    return await this.prisma.alertConfig.findUnique({
      where: { key },
    })
  }

  /**
   * Upsert alert configuration (update or create)
   */
  async upsert(key: string, config: any): Promise<AlertConfig> {
    return await this.prisma.alertConfig.upsert({
      where: { key },
      update: {
        config,
        updatedAt: new Date(),
      },
      create: {
        key,
        config,
      },
    })
  }

  /**
   * Bulk upsert multiple configurations in a transaction
   */
  async bulkUpsert(configs: Record<string, any>): Promise<string[]> {
    const updated: string[] = []

    await this.prisma.$transaction(async (tx) => {
      for (const [key, config] of Object.entries(configs)) {
        await tx.alertConfig.upsert({
          where: { key },
          update: {
            config,
            updatedAt: new Date(),
          },
          create: {
            key,
            config,
          },
        })
        updated.push(key)
      }
    })

    return updated
  }
}
