import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import type { Visitor as PrismaVisitor } from '@prisma/client'
import type {
  Visitor,
  CreateVisitorInput,
  UpdateVisitorInput,
} from '@sentinel/types'

interface VisitorFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  visitType?: string
  hostMemberId?: string
}

export class VisitorRepository {
  private prisma: PrismaClient

  /**
   * @param prismaClient - Optional Prisma client (injected in tests)
   */
  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma
  }
  /**
   * Find all visitors with optional filters
   */
  async findAll(filters?: VisitorFilters): Promise<Visitor[]> {
    const where: {
      checkInTime?: { gte: Date; lte: Date };
      visitType?: string;
      hostMemberId?: string;
    } = {};

    if (filters?.dateRange) {
      where.checkInTime = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    if (filters?.visitType) {
      where.visitType = filters.visitType;
    }

    if (filters?.hostMemberId) {
      where.hostMemberId = filters.hostMemberId;
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
    });

    return visitors.map(this.toVisitorType);
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
    });

    if (!visitor) {
      return null;
    }

    return this.toVisitorType(visitor);
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
    });

    return visitors.map(this.toVisitorType);
  }

  /**
   * Find active visitors with relations (host member, event)
   */
  async findActiveWithRelations(): Promise<Array<Visitor & { hostName?: string; eventName?: string }>> {
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
    });

    return visitors.map(v => this.toVisitorWithRelations(v));
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
        hostMemberId: data.hostMemberId ?? null,
        eventId: data.eventId ?? null,
        visitReason: data.purpose ?? null,
        checkInTime: data.checkInTime ?? new Date(),
        temporaryBadgeId: data.badgeId ?? null,
        kioskId: 'admin',
      },
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    });

    return this.toVisitorType(visitor);
  }

  /**
   * Update visitor details (event, host, purpose)
   */
  async update(id: string, data: UpdateVisitorInput): Promise<Visitor> {
    const visitor = await this.prisma.visitor.update({
      where: { id },
      data: {
        eventId: data.eventId !== undefined ? data.eventId : undefined,
        hostMemberId: data.hostMemberId !== undefined ? data.hostMemberId : undefined,
        visitReason: data.purpose !== undefined ? data.purpose : undefined,
      },
      include: {
        event: true,
        hostMember: true,
        badge: true,
      },
    });

    return this.toVisitorType(visitor);
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
    });

    return this.toVisitorType(visitor);
  }

  /**
   * Get count of active visitors (currently signed in)
   */
  async getActiveCount(): Promise<number> {
    return await this.prisma.visitor.count({
      where: {
        checkOutTime: null,
      },
    });
  }

  /**
   * Find visitor history with pagination and filters
   */
  async findHistory(
    filters: {
      startDate?: Date;
      endDate?: Date;
      visitType?: string;
      organization?: string;
    },
    pagination: {
      page: number;
      limit: number;
    }
  ): Promise<{
    visitors: Array<{
      id: string;
      name: string;
      organization: string;
      visitType: string;
      purpose?: string;
      hostName?: string;
      eventName?: string;
      checkInTime: Date;
      checkOutTime?: Date;
      duration?: number;
      checkInMethod: string;
      adminNotes?: string;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const where: {
      checkInTime?: { gte: Date; lte: Date };
      visitType?: string;
      organization?: { contains: string; mode: 'insensitive' };
    } = {};

    if (filters.startDate && filters.endDate) {
      where.checkInTime = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    if (filters.visitType) {
      where.visitType = filters.visitType;
    }

    if (filters.organization) {
      where.organization = {
        contains: filters.organization,
        mode: 'insensitive',
      };
    }

    const skip = (pagination.page - 1) * pagination.limit;

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
    ]);

    return {
      visitors: visitors.map((v) => {
        if (!v.organization) {
          throw new Error(`Visitor ${v.id} missing required organization field`);
        }

        const duration =
          v.checkOutTime
            ? Math.round((v.checkOutTime.getTime() - v.checkInTime.getTime()) / (1000 * 60))
            : undefined;

        return {
          id: v.id,
          name: v.name,
          organization: v.organization,
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
        };
      }),
      total,
    };
  }

  /**
   * Convert Prisma visitor to shared Visitor type
   */
  private toVisitorType(visitor: PrismaVisitor): Visitor {
    if (!visitor.organization) {
      throw new Error(`Visitor ${visitor.id} has no organization`);
    }

    const checkInMethod = visitor.checkInMethod
      ? (visitor.checkInMethod as 'kiosk' | 'admin_manual')
      : 'kiosk';

    return {
      id: visitor.id,
      name: visitor.name,
      organization: visitor.organization,
      visitType: visitor.visitType as Visitor['visitType'],
      hostMemberId: visitor.hostMemberId ? visitor.hostMemberId : undefined,
      eventId: visitor.eventId ? visitor.eventId : undefined,
      purpose: visitor.visitReason ? visitor.visitReason : undefined,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime ? visitor.checkOutTime : undefined,
      badgeId: visitor.temporaryBadgeId ? visitor.temporaryBadgeId : undefined,
      adminNotes: visitor.adminNotes ? visitor.adminNotes : undefined,
      checkInMethod,
      createdByAdmin: visitor.createdByAdmin ? visitor.createdByAdmin : undefined,
      createdAt: visitor.createdAt ? visitor.createdAt : new Date(),
    };
  }

  /**
   * Convert Prisma visitor with relations to extended type for activity feed
   */
  toVisitorWithRelations(visitor: PrismaVisitor & {
    hostMember?: { firstName: string; lastName: string; rank: string } | null;
    event?: { name: string } | null;
  }): Visitor & { hostName?: string; eventName?: string } {
    const base = this.toVisitorType(visitor);
    return {
      ...base,
      hostName: visitor.hostMember
        ? `${visitor.hostMember.rank} ${visitor.hostMember.firstName} ${visitor.hostMember.lastName}`
        : undefined,
      eventName: visitor.event?.name ?? undefined,
    };
  }
}

export const visitorRepository = new VisitorRepository();
