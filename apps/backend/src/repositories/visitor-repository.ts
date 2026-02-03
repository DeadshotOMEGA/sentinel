import type { PrismaClientInstance, Visitor as PrismaVisitor } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Visitor, CreateVisitorInput, UpdateVisitorInput } from '@sentinel/types'

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
    Array<Visitor & { hostName?: string; eventName?: string; visitTypeInfo?: { id: string; name: string; chipVariant?: string; chipColor?: string } }>
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
    const visitor = await this.prisma.visitor.create({
      data: {
        name: data.name,
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
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    })

    return this.toVisitorType(visitor)
  }

  /**
   * Update visitor details (event, host, purpose)
   */
  async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
    const visitor = await this.prisma.visitor.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
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
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    })

    return this.toVisitorType(visitor)
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
              firstName: true,
              lastName: true,
              rank: true,
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
            ? `${v.hostMember.rank} ${v.hostMember.firstName} ${v.hostMember.lastName}`
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
      hostMember?: { firstName: string; lastName: string; rank: string } | null
      event?: { name: string } | null
      visitTypeRef?: { id: string; name: string; chipVariant?: string | null; chipColor?: string | null } | null
    }
  ): Visitor & { hostName?: string; eventName?: string; visitTypeInfo?: { id: string; name: string; chipVariant?: string; chipColor?: string } } {
    const base = this.toVisitorType(visitor)
    return {
      ...base,
      hostName: visitor.hostMember
        ? `${visitor.hostMember.rank} ${visitor.hostMember.firstName} ${visitor.hostMember.lastName}`
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
