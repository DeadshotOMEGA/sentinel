import type { PrismaClient } from "@sentinel/database";
import { prisma as defaultPrisma, Prisma } from "@sentinel/database";

/**
 * Repository for AlertConfig operations
 *
 * Manages security alert rule configurations
 */
export class AlertConfigRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Find all alert configurations
   */
  async findAll() {
    return await this.prisma.alertConfig.findMany();
  }

  /**
   * Find alert configuration by key
   */
  async findByKey(key: string) {
    return await this.prisma.alertConfig.findUnique({
      where: { key },
    });
  }

  /**
   * Upsert alert configuration (update or create)
   */
  async upsert(key: string, config: Record<string, unknown>) {
    // Convert unknown to JSON-serializable value using Prisma.JsonValue
    const jsonConfig: Prisma.InputJsonValue = JSON.parse(JSON.stringify(config));
    return await this.prisma.alertConfig.upsert({
      where: { key },
      update: {
        config: jsonConfig,
        updatedAt: new Date(),
      },
      create: {
        key,
        config: jsonConfig,
      },
    });
  }

  /**
   * Bulk upsert multiple configurations in a transaction
   */
  async bulkUpsert(configs: Record<string, Record<string, unknown>>): Promise<string[]> {
    const updated: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [key, config] of Object.entries(configs)) {
        // Convert unknown to JSON-serializable value using Prisma.JsonValue
        const jsonConfig: Prisma.InputJsonValue = JSON.parse(JSON.stringify(config));
        await tx.alertConfig.upsert({
          where: { key },
          update: {
            config: jsonConfig,
            updatedAt: new Date(),
          },
          create: {
            key,
            config: jsonConfig,
          },
        });
        updated.push(key);
      }
    });

    return updated;
  }
}
