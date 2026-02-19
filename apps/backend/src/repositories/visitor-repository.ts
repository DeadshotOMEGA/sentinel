import type { PrismaClientInstance, Visitor as PrismaVisitor } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Visitor, CreateVisitorInput, UpdateVisitorInput } from '@sentinel/types'
import {
  buildLegacyVisitorName,
  buildVisitorDisplayName,
  computeCollisionKey,
  getVisitorInitials,
  normalizeNamePart,
  splitLegacyVisitorName,
} from '../utils/display-name.js'

interface VisitorFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  visitType?: string
  hostMemberId?: string
}

export class VisitorRepository {
  private prisma: PrismaClientInstance

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClientInstance) {
    this.prisma = prismaClient || defaultPrisma
  }

  private getDisplayKeyForVisitor(visitor: {
    firstName?: string | null
    lastName?: string | null
  }): string {
    const initials = getVisitorInitials(visitor.firstName)
    return computeCollisionKey(visitor.lastName, initials)
  }

  private async recomputeDisplayNamesByKeys(
    tx: PrismaClientInstance,
    keys: Set<string>
  ): Promise<void> {
    const normalizedKeys = Array.from(keys).filter(Boolean)
    if (normalizedKeys.length === 0) return

    const visitors = await tx.visitor.findMany({
      select: {
        id: true,
        name: true,
        rankPrefix: true,
        firstName: true,
        lastName: true,
      },
    })

    const collisionCounts = new Map<string, number>()
    for (const visitor of visitors) {
      const key = this.getDisplayKeyForVisitor(visitor)
      if (!key) continue
      collisionCounts.set(key, (collisionCounts.get(key) ?? 0) + 1)
    }

    const updates = visitors
      .filter((visitor) => normalizedKeys.includes(this.getDisplayKeyForVisitor(visitor)))
      .map((visitor) => {
        const key = this.getDisplayKeyForVisitor(visitor)
        const useLongForm = (collisionCounts.get(key) ?? 0) > 1
        const displayName = buildVisitorDisplayName({
          rankPrefix: visitor.rankPrefix,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          legacyName: visitor.name,
          useLongForm,
        })
        return tx.visitor.update({
          where: { id: visitor.id },
          data: { displayName },
        })
      })

    if (updates.length > 0) {
      await Promise.all(updates)
    }
  }
  /**
   * Find all visitors with optional filters
   */
  async findAll(filters?: VisitorFilters): Promise<Visitor[]> {
    const where: {
      checkInTime?: { gte: Date; lte: Date }
      visitType?: string
      hostMemberId?: string
    } = {}

    if (filters?.dateRange) {
      where.checkInTime = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      }
    }

    if (filters?.visitType) {
      where.visitType = filters.visitType
    }

    if (filters?.hostMemberId) {
      where.hostMemberId = filters.hostMemberId
    }

    const visitors = await this.prisma.visitor.findMany({
      where,
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    })

    return visitors.map(this.toVisitorType)
  }

  /**
   * Find visitor by ID
   */
  async findById(id: string): Promise<Visitor | null> {
    const visitor = await this.prisma.visitor.findUnique({
      where: { id },
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    })

    if (!visitor) {
      return null
    }

    return this.toVisitorType(visitor)
  }

  /**
   * Find active visitors (not checked out)
   */
  async findActive(): Promise<Visitor[]> {
    const visitors = await this.prisma.visitor.findMany({
      where: {
        checkOutTime: null,
      },
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    })

    return visitors.map(this.toVisitorType)
  }

  /**
   * Find active visitors with relations (host member, event)
   */
  async findActiveWithRelations(): Promise<
    Array<
      Visitor & {
        hostName?: string
        eventName?: string
        visitTypeInfo?: { id: string; name: string; chipVariant?: string; chipColor?: string }
      }
    >
  > {
    const visitors = await this.prisma.visitor.findMany({
      where: {
        checkOutTime: null,
      },
      orderBy: {
        checkInTime: 'desc',
      },
      include: {
        event: true,
        hostMember: true,
        badge: true,
        visitTypeRef: true,
      },
    })

    return visitors.map((v) => this.toVisitorWithRelations(v))
  }

  /**
   * Create a new visitor
   */
  async create(data: CreateVisitorInput): Promise<Visitor> {
    const fallbackSplit = splitLegacyVisitorName(data.name ?? '')
    const rankPrefix = normalizeNamePart(data.rankPrefix ?? fallbackSplit.rankPrefix)
    const firstName = normalizeNamePart(data.firstName ?? fallbackSplit.firstName)
    const lastName = normalizeNamePart(data.lastName ?? fallbackSplit.lastName)
    const legacyName = buildLegacyVisitorName({
      rankPrefix,
      firstName,
      lastName,
      legacyName: data.name,
    })

    const visitor = await this.prisma.$transaction(async (tx) => {
      const created = await tx.visitor.create({
        data: {
          name: legacyName,
          rankPrefix: rankPrefix || null,
          firstName: firstName || null,
          lastName: lastName || null,
          organization: data.organization,
          visitType: data.visitType,
          visitTypeId: data.visitTypeId ?? null,
          hostMemberId: data.hostMemberId ?? null,
          eventId: data.eventId ?? null,
          visitReason: data.visitReason ?? null,
          checkInTime: data.checkInTime ?? new Date(),
          checkOutTime: data.checkOutTime ?? null,
          temporaryBadgeId: data.temporaryBadgeId ?? null,
          kioskId: data.kioskId,
          adminNotes: data.adminNotes ?? null,
          checkInMethod: data.checkInMethod ?? null,
          createdByAdmin: data.createdByAdmin ?? null,
        },
      })

      const key = this.getDisplayKeyForVisitor(created)
      if (key) {
        await this.recomputeDisplayNamesByKeys(
          tx as unknown as PrismaClientInstance,
          new Set([key])
        )
      } else {
        await tx.visitor.update({
          where: { id: created.id },
          data: {
            displayName: buildVisitorDisplayName({
              rankPrefix: created.rankPrefix,
              firstName: created.firstName,
              lastName: created.lastName,
              legacyName: created.name,
            }),
          },
        })
      }

      return tx.visitor.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          event: true,
          hostMember: true,
          badge: true,
        },
      })
    })

    return this.toVisitorType(visitor as PrismaVisitor)
  }

  /**
   * Update visitor details (event, host, purpose)
   */
  async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
    const visitor = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.visitor.findUniqueOrThrow({
        where: { id },
        select: { id: true, name: true, rankPrefix: true, firstName: true, lastName: true },
      })
      const keysToRecompute = new Set<string>()
      const oldKey = this.getDisplayKeyForVisitor(existing)
      if (oldKey) keysToRecompute.add(oldKey)

      const splitFromLegacy =
        data.name !== undefined ? splitLegacyVisitorName(data.name ?? '') : undefined

      const rankPrefix =
        data.rankPrefix !== undefined
          ? normalizeNamePart(data.rankPrefix)
          : splitFromLegacy?.rankPrefix !== undefined
            ? normalizeNamePart(splitFromLegacy.rankPrefix)
            : normalizeNamePart(existing.rankPrefix)
      const firstName =
        data.firstName !== undefined
          ? normalizeNamePart(data.firstName)
          : splitFromLegacy?.firstName !== undefined
            ? normalizeNamePart(splitFromLegacy.firstName)
            : normalizeNamePart(existing.firstName)
      const lastName =
        data.lastName !== undefined
          ? normalizeNamePart(data.lastName)
          : splitFromLegacy?.lastName !== undefined
            ? normalizeNamePart(splitFromLegacy.lastName)
            : normalizeNamePart(existing.lastName)
      const legacyName = buildLegacyVisitorName({
        rankPrefix,
        firstName,
        lastName,
        legacyName: data.name ?? existing.name,
      })

      await tx.visitor.update({
        where: { id },
        data: {
          name: legacyName,
          rankPrefix: rankPrefix || null,
          firstName: firstName || null,
          lastName: lastName || null,
          organization: data.organization !== undefined ? data.organization : undefined,
          visitType: data.visitType !== undefined ? data.visitType : undefined,
          visitTypeId: data.visitTypeId !== undefined ? data.visitTypeId : undefined,
          eventId: data.eventId !== undefined ? data.eventId : undefined,
          hostMemberId: data.hostMemberId !== undefined ? data.hostMemberId : undefined,
          visitReason: data.visitReason !== undefined ? data.visitReason : undefined,
          checkInTime: data.checkInTime !== undefined ? data.checkInTime : undefined,
          checkOutTime: data.checkOutTime !== undefined ? data.checkOutTime : undefined,
          temporaryBadgeId: data.temporaryBadgeId !== undefined ? data.temporaryBadgeId : undefined,
          kioskId: data.kioskId !== undefined ? data.kioskId : undefined,
          adminNotes: data.adminNotes !== undefined ? data.adminNotes : undefined,
          checkInMethod: data.checkInMethod !== undefined ? data.checkInMethod : undefined,
        },
      })

      const newKey = computeCollisionKey(lastName, getVisitorInitials(firstName))
      if (newKey) keysToRecompute.add(newKey)

      if (keysToRecompute.size > 0) {
        await this.recomputeDisplayNamesByKeys(
          tx as unknown as PrismaClientInstance,
          keysToRecompute
        )
      }

      return tx.visitor.findUniqueOrThrow({
        where: { id },
        include: {
          event: true,
          hostMember: true,
          badge: true,
        },
      })
    })

    return this.toVisitorType(visitor as PrismaVisitor)
  }

  /**
   * Checkout a visitor (set checkout time to now)
   */
  async checkout(id: string): Promise<Visitor> {
    const visitor = await this.prisma.visitor.update({
      where: { id },
      data: {
        checkOutTime: new Date(),
      },
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    })

    return this.toVisitorType(visitor)
  }

  /**
   * Get count of active visitors (currently signed in)
   */
  async getActiveCount(): Promise<number> {
    return await this.prisma.visitor.count({
      where: {
        checkOutTime: null,
      },
    })
  }

  /**
   * Find visitor history with pagination and filters
   */
  async findHistory(
    filters: {
      startDate?: Date
      endDate?: Date
      visitType?: string
      organization?: string
    },
    pagination: {
      page: number
      limit: number
    }
  ): Promise<{
    visitors: Array<{
      id: string
      name: string
      organization: string
      visitType: string
      purpose?: string
      hostName?: string
      eventName?: string
      checkInTime: Date
      checkOutTime?: Date
      duration?: number
      checkInMethod: string
      adminNotes?: string
      createdAt: Date
    }>
    total: number
  }> {
    const where: {
      checkInTime?: { gte: Date; lte: Date }
      visitType?: string
      organization?: { contains: string; mode: 'insensitive' }
    } = {}

    if (filters.startDate && filters.endDate) {
      where.checkInTime = {
        gte: filters.startDate,
        lte: filters.endDate,
      }
    }

    if (filters.visitType) {
      where.visitType = filters.visitType
    }

    if (filters.organization) {
      where.organization = {
        contains: filters.organization,
        mode: 'insensitive',
      }
    }

    const skip = (pagination.page - 1) * pagination.limit

    const [total, visitors] = await Promise.all([
      this.prisma.visitor.count({ where }),
      this.prisma.visitor.findMany({
        where,
        orderBy: {
          checkInTime: 'desc',
        },
        skip,
        take: pagination.limit,
        include: {
          hostMember: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
          event: {
            select: {
              name: true,
            },
          },
        },
      }),
    ])

    return {
      visitors: visitors.map((v) => {
        const duration = v.checkOutTime
          ? Math.round((v.checkOutTime.getTime() - v.checkInTime.getTime()) / (1000 * 60))
          : undefined

        return {
          id: v.id,
          name: v.name,
          organization: v.organization || '',
          visitType: v.visitType,
          purpose: v.visitReason ? v.visitReason : undefined,
          hostName: v.hostMember
            ? (v.hostMember.displayName ?? `${v.hostMember.firstName} ${v.hostMember.lastName}`)
            : undefined,
          eventName: v.event?.name ? v.event.name : undefined,
          checkInTime: v.checkInTime,
          checkOutTime: v.checkOutTime ? v.checkOutTime : undefined,
          duration,
          checkInMethod: v.checkInMethod ? v.checkInMethod : 'kiosk',
          adminNotes: v.adminNotes ? v.adminNotes : undefined,
          createdAt: v.createdAt ? v.createdAt : v.checkInTime,
        }
      }),
      total,
    }
  }

  /**
   * Convert Prisma visitor to shared Visitor type
   */
  private toVisitorType(visitor: PrismaVisitor): Visitor {
    const checkInMethod = visitor.checkInMethod
      ? (visitor.checkInMethod as 'kiosk' | 'admin_manual')
      : 'kiosk'

    return {
      id: visitor.id,
      name: visitor.name,
      rankPrefix: visitor.rankPrefix ? visitor.rankPrefix : undefined,
      firstName: visitor.firstName ? visitor.firstName : undefined,
      lastName: visitor.lastName ? visitor.lastName : undefined,
      displayName:
        visitor.displayName ??
        buildVisitorDisplayName({
          rankPrefix: visitor.rankPrefix,
          firstName: visitor.firstName,
          lastName: visitor.lastName,
          legacyName: visitor.name,
        }),
      organization: visitor.organization || undefined,
      visitType: visitor.visitType as Visitor['visitType'],
      hostMemberId: visitor.hostMemberId ? visitor.hostMemberId : undefined,
      eventId: visitor.eventId ? visitor.eventId : undefined,
      visitReason: visitor.visitReason ? visitor.visitReason : undefined,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime ? visitor.checkOutTime : undefined,
      temporaryBadgeId: visitor.temporaryBadgeId ? visitor.temporaryBadgeId : undefined,
      kioskId: visitor.kioskId,
      adminNotes: visitor.adminNotes ? visitor.adminNotes : undefined,
      checkInMethod,
      createdByAdmin: visitor.createdByAdmin ? visitor.createdByAdmin : undefined,
      createdAt: visitor.createdAt ? visitor.createdAt : new Date(),
    }
  }

  /**
   * Convert Prisma visitor with relations to extended type for activity feed
   */
  toVisitorWithRelations(
    visitor: PrismaVisitor & {
      hostMember?: { firstName: string; lastName: string; displayName?: string | null } | null
      event?: { name: string } | null
      visitTypeRef?: {
        id: string
        name: string
        chipVariant?: string | null
        chipColor?: string | null
      } | null
    }
  ): Visitor & {
    hostName?: string
    eventName?: string
    visitTypeInfo?: { id: string; name: string; chipVariant?: string; chipColor?: string }
  } {
    const base = this.toVisitorType(visitor)
    return {
      ...base,
      hostName: visitor.hostMember
        ? (visitor.hostMember.displayName ??
          `${visitor.hostMember.firstName} ${visitor.hostMember.lastName}`)
        : undefined,
      eventName: visitor.event?.name ?? undefined,
      visitTypeInfo: visitor.visitTypeRef
        ? {
            id: visitor.visitTypeRef.id,
            name: visitor.visitTypeRef.name,
            chipVariant: visitor.visitTypeRef.chipVariant ?? undefined,
            chipColor: visitor.visitTypeRef.chipColor ?? undefined,
          }
        : undefined,
    }
  }
}

export const visitorRepository = new VisitorRepository()
