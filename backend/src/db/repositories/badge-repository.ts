import { prisma } from '../prisma';
import type { Badge as PrismaBadge } from '@prisma/client';
import type {
  Badge,
  CreateBadgeInput,
  BadgeAssignmentType,
  BadgeStatus,
  MemberWithDivision,
} from '../../../../shared/types';

interface BadgeFilters {
  status?: BadgeStatus;
  assignmentType?: BadgeAssignmentType;
}

/**
 * Convert Prisma Badge (with null) to shared Badge type (with undefined)
 */
function toBadge(prismaBadge: PrismaBadge): Badge {
  return {
    id: prismaBadge.id,
    serialNumber: prismaBadge.serialNumber,
    assignmentType: prismaBadge.assignmentType as BadgeAssignmentType,
    assignedToId: prismaBadge.assignedToId ?? undefined,
    status: prismaBadge.status as BadgeStatus,
    lastUsed: prismaBadge.lastUsed ?? undefined,
    createdAt: prismaBadge.createdAt ?? new Date(),
    updatedAt: prismaBadge.updatedAt ?? new Date(),
  };
}

export class BadgeRepository {
  /**
   * Find all badges with optional filters
   */
  async findAll(filters?: BadgeFilters): Promise<Badge[]> {
    const where: {
      status?: BadgeStatus;
      assignmentType?: BadgeAssignmentType;
    } = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.assignmentType) {
      where.assignmentType = filters.assignmentType;
    }

    const badges = await prisma.badge.findMany({
      where,
      orderBy: {
        serialNumber: 'asc',
      },
    });

    return badges.map(toBadge);
  }

  /**
   * Find badge by ID
   */
  async findById(id: string): Promise<Badge | null> {
    const badge = await prisma.badge.findUnique({
      where: { id },
    });

    return badge ? toBadge(badge) : null;
  }

  /**
   * Find badge by serial number (NFC UID)
   */
  async findBySerialNumber(serialNumber: string): Promise<Badge | null> {
    const badge = await prisma.badge.findUnique({
      where: { serialNumber },
    });

    return badge ? toBadge(badge) : null;
  }

  /**
   * Find badges by serial numbers (batch operation to prevent N+1 queries)
   */
  async findBySerialNumbers(serialNumbers: string[]): Promise<Badge[]> {
    if (serialNumbers.length === 0) {
      return [];
    }

    const badges = await prisma.badge.findMany({
      where: {
        serialNumber: {
          in: serialNumbers,
        },
      },
    });

    return badges.map(toBadge);
  }

  /**
   * Find badge by serial number with joined member data (for single checkin optimization)
   */
  async findBySerialNumberWithMember(serialNumber: string): Promise<{ badge: Badge; member: MemberWithDivision | null } | null> {
    const badge = await prisma.badge.findUnique({
      where: { serialNumber },
      include: {
        members: {
          where: {
            badgeId: {
              not: null,
            },
          },
          include: {
            division: true,
          },
          take: 1,
        },
      },
    });

    if (!badge) {
      return null;
    }

    // Extract member from the array (take 1 ensures max one member)
    const member = badge.members.length > 0 && badge.assignmentType === 'member'
      ? (badge.members[0] as MemberWithDivision)
      : null;

    // Remove the members array from badge before returning
    const { members: _, ...badgeData } = badge;

    return {
      badge: toBadge(badgeData),
      member,
    };
  }

  /**
   * Create a new badge
   */
  async create(data: CreateBadgeInput): Promise<Badge> {
    if (!data.serialNumber) {
      throw new Error('Serial number is required');
    }

    const badge = await prisma.badge.create({
      data: {
        serialNumber: data.serialNumber,
        assignmentType: data.assignmentType !== undefined ? data.assignmentType : 'unassigned',
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : null,
        status: data.status !== undefined ? data.status : 'active',
      },
    });

    return toBadge(badge);
  }

  /**
   * Assign badge to a member or event attendee
   */
  async assign(
    badgeId: string,
    assignedToId: string,
    assignmentType: BadgeAssignmentType
  ): Promise<Badge> {
    if (assignmentType === 'unassigned') {
      throw new Error('Cannot assign badge with type "unassigned"');
    }

    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: {
        assignmentType,
        assignedToId,
        updatedAt: new Date(),
      },
    });

    return toBadge(badge);
  }

  /**
   * Unassign badge
   */
  async unassign(badgeId: string): Promise<Badge> {
    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: {
        assignmentType: 'unassigned',
        assignedToId: null,
        updatedAt: new Date(),
      },
    });

    return toBadge(badge);
  }

  /**
   * Update badge status
   */
  async updateStatus(badgeId: string, status: BadgeStatus): Promise<Badge> {
    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return toBadge(badge);
  }
}

export const badgeRepository = new BadgeRepository();
