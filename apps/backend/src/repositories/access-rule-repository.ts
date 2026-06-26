import type { AccessRule as PrismaAccessRule, PrismaClientInstance } from '@sentinel/database'
import { prisma as defaultPrisma, Prisma } from '@sentinel/database'

export type AccessRuleStatus = 'active' | 'retired_unknown'

export interface AccessRuleRecord {
  id: string
  key: string
  configuredMinimumLevel: number
  configuredFloorLevel?: number
  localDescription?: string
  status: AccessRuleStatus
  createdAt: Date
  updatedAt: Date
  updatedByMemberId?: string
}

export interface UpdateAccessRuleRecordInput {
  configuredMinimumLevel?: number
  configuredFloorLevel?: number
  localDescription?: string | null
  status?: AccessRuleStatus
  updatedByMemberId?: string | null
}

function toAccessRuleRecord(rule: PrismaAccessRule): AccessRuleRecord {
  return {
    id: rule.id,
    key: rule.key,
    configuredMinimumLevel: rule.configuredMinimumLevel,
    configuredFloorLevel: rule.configuredFloorLevel ?? undefined,
    localDescription: rule.localDescription ?? undefined,
    status: rule.status === 'retired_unknown' ? 'retired_unknown' : 'active',
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    updatedByMemberId: rule.updatedByMemberId ?? undefined,
  }
}

export class AccessRuleRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findAll(): Promise<AccessRuleRecord[]> {
    const rules = await this.prisma.accessRule.findMany({
      orderBy: { key: 'asc' },
    })

    return rules.map(toAccessRuleRecord)
  }

  async findByKey(key: string): Promise<AccessRuleRecord | null> {
    const rule = await this.prisma.accessRule.findUnique({
      where: { key },
    })

    return rule ? toAccessRuleRecord(rule) : null
  }

  async reconcile(
    catalogRules: readonly {
      key: string
      configuredMinimumLevel: number
      configuredFloorLevel: number
    }[],
    updatedByMemberId?: string
  ): Promise<AccessRuleRecord[]> {
    const catalogKeys = new Set(catalogRules.map((rule) => rule.key))

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const rule of catalogRules) {
        await tx.accessRule.upsert({
          where: { key: rule.key },
          create: {
            key: rule.key,
            configuredMinimumLevel: rule.configuredMinimumLevel,
            configuredFloorLevel: rule.configuredFloorLevel,
            status: 'active',
            updatedByMemberId: updatedByMemberId ?? null,
          },
          update: {
            status: 'active',
          },
        })

        await tx.accessRule.updateMany({
          where: {
            key: rule.key,
            configuredFloorLevel: null,
          },
          data: {
            configuredFloorLevel: rule.configuredFloorLevel,
            updatedByMemberId: updatedByMemberId ?? null,
          },
        })
      }

      const existing = await tx.accessRule.findMany({
        select: { key: true, status: true },
      })

      const unknownKeys = existing
        .filter((rule) => !catalogKeys.has(rule.key) && rule.status !== 'retired_unknown')
        .map((rule) => rule.key)

      if (unknownKeys.length > 0) {
        await tx.accessRule.updateMany({
          where: { key: { in: unknownKeys } },
          data: {
            status: 'retired_unknown',
            updatedByMemberId: updatedByMemberId ?? null,
          },
        })
      }
    })

    return this.findAll()
  }

  async updateByKey(key: string, data: UpdateAccessRuleRecordInput): Promise<AccessRuleRecord> {
    const updateData: Prisma.AccessRuleUpdateInput = {}

    if (data.configuredMinimumLevel !== undefined) {
      updateData.configuredMinimumLevel = data.configuredMinimumLevel
    }

    if (data.configuredFloorLevel !== undefined) {
      updateData.configuredFloorLevel = data.configuredFloorLevel
    }

    if (data.localDescription !== undefined) {
      updateData.localDescription = data.localDescription
    }

    if (data.status !== undefined) {
      updateData.status = data.status
    }

    if (data.updatedByMemberId !== undefined) {
      updateData.updatedByMember =
        data.updatedByMemberId === null
          ? { disconnect: true }
          : { connect: { id: data.updatedByMemberId } }
    }

    const rule = await this.prisma.accessRule.update({
      where: { key },
      data: updateData,
    })

    return toAccessRuleRecord(rule)
  }
}
