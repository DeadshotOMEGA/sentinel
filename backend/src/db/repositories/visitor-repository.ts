import { prisma } from '../prisma';
import type { Visitor as PrismaVisitor } from '@prisma/client';
import type {
  Visitor,
  CreateVisitorInput,
} from '../../../../shared/types';

interface VisitorFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  visitType?: string;
  hostMemberId?: string;
}

export class VisitorRepository {
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

    const visitors = await prisma.visitor.findMany({
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
    const visitor = await prisma.visitor.findUnique({
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
    const visitors = await prisma.visitor.findMany({
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
   * Create a new visitor
   */
  async create(data: CreateVisitorInput): Promise<Visitor> {
    const visitor = await prisma.visitor.create({
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
   * Checkout a visitor (set checkout time to now)
   */
  async checkout(id: string): Promise<Visitor> {
    const visitor = await prisma.visitor.update({
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
    return await prisma.visitor.count({
      where: {
        checkOutTime: null,
      },
    });
  }

  /**
   * Convert Prisma visitor to shared Visitor type
   */
  private toVisitorType(visitor: PrismaVisitor): Visitor {
    if (!visitor.organization) {
      throw new Error(`Visitor ${visitor.id} has no organization`);
    }

    return {
      id: visitor.id,
      name: visitor.name,
      organization: visitor.organization,
      visitType: visitor.visitType as Visitor['visitType'],
      hostMemberId: visitor.hostMemberId ?? undefined,
      eventId: visitor.eventId ?? undefined,
      purpose: visitor.visitReason ?? undefined,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime ?? undefined,
      badgeId: visitor.temporaryBadgeId ?? undefined,
      createdAt: visitor.createdAt ?? new Date(),
    };
  }
}

export const visitorRepository = new VisitorRepository();
