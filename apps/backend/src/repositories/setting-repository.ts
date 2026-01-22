import type { PrismaClientInstance, Setting as PrismaSetting } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Prisma } from '@prisma/client'

type JsonValue = Prisma.JsonValue

/**
 * Setting entity (Prisma to shared type conversion)
 */
export interface Setting {
  id: string
  key: string
  value: unknown // JSON value
  category: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Create setting input
 */
export interface CreateSettingInput {
  key: string
  value: unknown
  category?: string
  description?: string
}

/**
 * Update setting input
 */
export interface UpdateSettingInput {
  value?: unknown
  description?: string
}

/**
 * Setting filter parameters
 */
export interface SettingFilters {
  category?: string
  search?: string
}

/**
 * Convert Prisma Setting (with null) to Setting type (with undefined)
 */
function toSetting(prismaSetting: PrismaSetting): Setting {
  return {
    id: prismaSetting.id,
    key: prismaSetting.key,
    value: prismaSetting.value,
    category: prismaSetting.category,
    description: prismaSetting.description ?? undefined,
    createdAt: prismaSetting.createdAt,
    updatedAt: prismaSetting.updatedAt,
  }
}

/**
 * Setting Repository
 *
 * Manages application configuration settings stored as key-value pairs
 */
export class SettingRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  /**
   * Find all settings with optional filters
   */
  async findAll(filters?: SettingFilters): Promise<Setting[]> {
    const where: Record<string, unknown> = {}

    if (filters?.category) {
      where.category = filters.category
    }

    if (filters?.search) {
      where.OR = [
        { key: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const settings = await this.prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    return settings.map(toSetting)
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<Setting | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    })

    return setting ? toSetting(setting) : null
  }

  /**
   * Find setting by ID
   */
  async findById(id: string): Promise<Setting | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { id },
    })

    return setting ? toSetting(setting) : null
  }

  /**
   * Find multiple settings by keys (batch operation)
   */
  async findByKeys(keys: string[]): Promise<Setting[]> {
    if (keys.length === 0) {
      return []
    }

    const settings = await this.prisma.setting.findMany({
      where: {
        key: { in: keys },
      },
    })

    return settings.map(toSetting)
  }

  /**
   * Create a new setting
   */
  async create(data: CreateSettingInput): Promise<Setting> {
    const setting = await this.prisma.setting.create({
      data: {
        key: data.key,
        value: data.value as JsonValue,
        category: data.category ?? 'system',
        description: data.description ?? null,
      },
    })

    return toSetting(setting)
  }

  /**
   * Update a setting by key
   */
  async updateByKey(key: string, data: UpdateSettingInput): Promise<Setting> {
    const updateData: Record<string, unknown> = {}

    if (data.value !== undefined) {
      updateData.value = data.value as JsonValue
    }

    if (data.description !== undefined) {
      updateData.description = data.description
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update')
    }

    const setting = await this.prisma.setting.update({
      where: { key },
      data: updateData,
    })

    return toSetting(setting)
  }

  /**
   * Delete a setting by key
   */
  async deleteByKey(key: string): Promise<void> {
    await this.prisma.setting.delete({
      where: { key },
    })
  }

  /**
   * Check if a setting exists by key
   */
  async existsByKey(key: string): Promise<boolean> {
    const count = await this.prisma.setting.count({
      where: { key },
    })

    return count > 0
  }

  /**
   * Get all settings for a specific category
   */
  async findByCategory(category: string): Promise<Setting[]> {
    const settings = await this.prisma.setting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    })

    return settings.map(toSetting)
  }

  /**
   * Bulk upsert settings (create or update)
   * Useful for initialization or migrations
   */
  async bulkUpsert(settings: CreateSettingInput[]): Promise<number> {
    if (settings.length === 0) {
      return 0
    }

    let upsertedCount = 0

    await this.prisma.$transaction(async (tx) => {
      for (const settingData of settings) {
        await tx.setting.upsert({
          where: { key: settingData.key },
          create: {
            key: settingData.key,
            value: settingData.value as JsonValue,
            category: settingData.category ?? 'system',
            description: settingData.description ?? null,
          },
          update: {
            value: settingData.value as JsonValue,
            description: settingData.description ?? null,
          },
        })
        upsertedCount++
      }
    })

    return upsertedCount
  }

  /**
   * Count settings by category
   */
  async countByCategory(): Promise<Record<string, number>> {
    const settings = await this.prisma.setting.findMany({
      select: { category: true },
    })

    const counts: Record<string, number> = {}

    for (const setting of settings) {
      counts[setting.category] = (counts[setting.category] || 0) + 1
    }

    return counts
  }
}

export const settingRepository = new SettingRepository()
