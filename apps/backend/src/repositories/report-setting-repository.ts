import type { PrismaClient, ReportSetting } from "@sentinel/database";
import { prisma as defaultPrisma, Prisma } from "@sentinel/database";

/**
 * Repository for ReportSetting operations
 *
 * Manages key-value report configuration settings
 */
export class ReportSettingRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Find all report settings
   */
  async findAll(): Promise<ReportSetting[]> {
    return await this.prisma.reportSetting.findMany();
  }

  /**
   * Find report setting by key
   */
  async findByKey(key: string): Promise<ReportSetting | null> {
    return await this.prisma.reportSetting.findUnique({
      where: { key },
    });
  }

  /**
   * Upsert report setting (update or create)
   */
  async upsert(key: string, value: unknown): Promise<ReportSetting> {
    return await this.prisma.reportSetting.upsert({
      where: { key },
      update: {
        value: value as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Bulk upsert multiple settings in a transaction
   */
  async bulkUpsert(settings: Record<string, unknown>): Promise<string[]> {
    const updated: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        await tx.reportSetting.upsert({
          where: { key },
          update: {
            value: value as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
          create: {
            key,
            value: value as Prisma.InputJsonValue,
          },
        });
        updated.push(key);
      }
    });

    return updated;
  }
}
