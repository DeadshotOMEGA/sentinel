import type { PrismaClient, alert_configs } from '@sentinel/database'
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
  async findAll(): Promise<alert_configs[]> {
    return await this.prisma.alert_configs.findMany()
  }

  /**
   * Find alert configuration by key
   */
  async findByKey(key: string): Promise<alert_configs | null> {
    return await this.prisma.alert_configs.findUnique({
      where: { key },
    })
  }

  /**
   * Upsert alert configuration (update or create)
   */
  async upsert(key: string, config: unknown): Promise<alert_configs> {
    return await this.prisma.alert_configs.upsert({
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
  async bulkUpsert(configs: Record<string, unknown>): Promise<string[]> {
    const updated: string[] = []

    await this.prisma.$transaction(async (tx) => {
      for (const [key, config] of Object.entries(configs)) {
        await tx.alert_configs.upsert({
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
