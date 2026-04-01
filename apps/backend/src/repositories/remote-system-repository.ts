import type { PrismaClientInstance } from '@sentinel/database'
import { Prisma, prisma as defaultPrisma } from '@sentinel/database'

export interface RemoteSystemRecord {
  id: string
  code: string
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AdminRemoteSystemRecord extends RemoteSystemRecord {
  usageCount: number
  activeSessionCount: number
}

export interface CreateRemoteSystemRecordInput {
  code: string
  name: string
  description?: string | null
  displayOrder?: number
}

export interface UpdateRemoteSystemRecordInput {
  code?: string
  name?: string
  description?: string | null
  displayOrder?: number
  isActive?: boolean
}

function toRemoteSystemRecord(remoteSystem: {
  id: string
  code: string
  name: string
  description: string | null
  displayOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): RemoteSystemRecord {
  return {
    id: remoteSystem.id,
    code: remoteSystem.code,
    name: remoteSystem.name,
    description: remoteSystem.description,
    displayOrder: remoteSystem.displayOrder,
    isActive: remoteSystem.isActive,
    createdAt: remoteSystem.createdAt,
    updatedAt: remoteSystem.updatedAt,
  }
}

export class RemoteSystemRepository {
  private prisma: PrismaClientInstance

  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  async findActiveOptions(): Promise<RemoteSystemRecord[]> {
    const systems = await this.prisma.remoteSystem.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return systems.map(toRemoteSystemRecord)
  }

  async findById(id: string): Promise<RemoteSystemRecord | null> {
    const system = await this.prisma.remoteSystem.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return system ? toRemoteSystemRecord(system) : null
  }

  async findActiveById(id: string): Promise<RemoteSystemRecord | null> {
    const system = await this.prisma.remoteSystem.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return system ? toRemoteSystemRecord(system) : null
  }

  async findByCode(code: string): Promise<RemoteSystemRecord | null> {
    const system = await this.prisma.remoteSystem.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return system ? toRemoteSystemRecord(system) : null
  }

  async findAdminSystems(activeWithinSeconds: number = 120): Promise<AdminRemoteSystemRecord[]> {
    const now = new Date()
    const activeThreshold = new Date(now.getTime() - activeWithinSeconds * 1000)

    const [systems, usageCounts, activeCounts] = await Promise.all([
      this.prisma.remoteSystem.findMany({
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          displayOrder: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.memberSession.groupBy({
        by: ['remoteSystemId'],
        where: {
          remoteSystemId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.memberSession.groupBy({
        by: ['remoteSystemId'],
        where: {
          remoteSystemId: { not: null },
          endedAt: null,
          expiresAt: { gt: now },
          lastSeenAt: { gte: activeThreshold },
        },
        _count: { _all: true },
      }),
    ])

    const usageCountById = new Map(
      usageCounts
        .filter(
          (item): item is typeof item & { remoteSystemId: string } => item.remoteSystemId !== null
        )
        .map((item) => [item.remoteSystemId, item._count._all])
    )
    const activeCountById = new Map(
      activeCounts
        .filter(
          (item): item is typeof item & { remoteSystemId: string } => item.remoteSystemId !== null
        )
        .map((item) => [item.remoteSystemId, item._count._all])
    )

    return systems.map((system) => ({
      ...toRemoteSystemRecord(system),
      usageCount: usageCountById.get(system.id) ?? 0,
      activeSessionCount: activeCountById.get(system.id) ?? 0,
    }))
  }

  async create(data: CreateRemoteSystemRecordInput): Promise<RemoteSystemRecord> {
    const normalizedDescription = data.description?.trim() ? data.description.trim() : null
    const displayOrder = data.displayOrder ?? (await this.getNextDisplayOrder())

    const createData: Prisma.RemoteSystemCreateInput = {
      code: data.code,
      name: data.name,
      description: normalizedDescription,
      displayOrder,
      isActive: true,
    }

    const system = await this.prisma.remoteSystem.create({
      data: createData,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return toRemoteSystemRecord(system)
  }

  async update(id: string, data: UpdateRemoteSystemRecordInput): Promise<RemoteSystemRecord> {
    const updateData: Prisma.RemoteSystemUpdateInput = {}

    if (data.code !== undefined) {
      updateData.code = data.code
    }

    if (data.name !== undefined) {
      updateData.name = data.name
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() ? data.description.trim() : null
    }

    if (data.displayOrder !== undefined) {
      updateData.displayOrder = data.displayOrder
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No fields to update')
    }

    const system = await this.prisma.remoteSystem.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return toRemoteSystemRecord(system)
  }

  async reorder(remoteSystemIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      remoteSystemIds.map((id, index) =>
        this.prisma.remoteSystem.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    )
  }

  async delete(id: string): Promise<void> {
    await this.prisma.remoteSystem.delete({
      where: { id },
    })
  }

  async countUsage(id: string): Promise<number> {
    return this.prisma.memberSession.count({
      where: { remoteSystemId: id },
    })
  }

  async count(): Promise<number> {
    return this.prisma.remoteSystem.count()
  }

  private async getNextDisplayOrder(): Promise<number> {
    const latest = await this.prisma.remoteSystem.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })

    return (latest?.displayOrder ?? -1) + 1
  }
}
