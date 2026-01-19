import { prisma, Prisma } from '../db/prisma';
import { broadcastDdsUpdate } from '../websocket/broadcast';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { tagService } from './tag-service';
import type { DdsUpdateEvent, DdsStatus, DdsMemberInfo } from '../websocket/events';

interface MemberFromDb {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  division: {
    name: string;
  } | null;
}

interface AdminFromDb {
  fullName: string;
}

interface DdsAssignmentFromDb {
  id: string;
  memberId: string;
  assignedDate: Date;
  acceptedAt: Date | null;
  releasedAt: Date | null;
  transferredTo: string | null;
  assignedBy: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  member: MemberFromDb;
  assignedByAdmin: AdminFromDb | null;
}

interface DdsAssignmentWithMember {
  id: string;
  memberId: string;
  assignedDate: Date;
  acceptedAt: Date | null;
  releasedAt: Date | null;
  transferredTo: string | null;
  assignedBy: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  member: {
    id: string;
    name: string;
    rank: string;
    division: string | null;
  };
  assignedByAdminName: string | null;
}

interface ResponsibilityAuditLogEntry {
  id: string;
  memberId: string;
  tagName: string;
  action: string;
  fromMemberId: string | null;
  toMemberId: string | null;
  performedBy: string | null;
  performedByType: string;
  timestamp: Date;
  notes: string | null;
}

/**
 * Get today's date at midnight in local timezone as a Date object for Prisma queries
 */
function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Transform DB result to application type
 */
function transformAssignment(dbResult: DdsAssignmentFromDb): DdsAssignmentWithMember {
  return {
    id: dbResult.id,
    memberId: dbResult.memberId,
    assignedDate: dbResult.assignedDate,
    acceptedAt: dbResult.acceptedAt,
    releasedAt: dbResult.releasedAt,
    transferredTo: dbResult.transferredTo,
    assignedBy: dbResult.assignedBy,
    status: dbResult.status,
    notes: dbResult.notes,
    createdAt: dbResult.createdAt,
    updatedAt: dbResult.updatedAt,
    member: {
      id: dbResult.member.id,
      name: `${dbResult.member.firstName} ${dbResult.member.lastName}`,
      rank: dbResult.member.rank,
      division: dbResult.member.division?.name ?? null,
    },
    assignedByAdminName: dbResult.assignedByAdmin?.fullName ?? null,
  };
}

/**
 * Convert DDS assignment to WebSocket broadcast event
 */
function toUpdateEvent(assignment: DdsAssignmentWithMember): DdsUpdateEvent {
  const memberInfo: DdsMemberInfo = {
    id: assignment.member.id,
    name: assignment.member.name,
    rank: assignment.member.rank,
    division: assignment.member.division,
  };

  return {
    assignmentId: assignment.id,
    member: memberInfo,
    status: assignment.status as DdsStatus,
    assignedDate: assignment.assignedDate.toISOString(),
    acceptedAt: assignment.acceptedAt?.toISOString() ?? null,
    assignedBy: assignment.assignedByAdminName,
  };
}

const memberInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rank: true,
      division: {
        select: {
          name: true,
        },
      },
    },
  },
  assignedByAdmin: {
    select: {
      fullName: true,
    },
  },
} as const;

export class DdsService {
  /**
   * Get today's active DDS assignment with member details
   */
  async getCurrentDds(): Promise<DdsAssignmentWithMember | null> {
    const today = getTodayDate();

    const assignment = await prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
      include: memberInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!assignment) {
      return null;
    }

    return transformAssignment(assignment);
  }

  /**
   * Member self-accepts DDS at kiosk (first check-in of day)
   */
  async acceptDds(memberId: string): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate();

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member attempting to accept DDS does not exist.'
      );
    }

    // Check if DDS already exists for today
    const existingDds = await prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
    });

    if (existingDds) {
      throw new ConflictError(
        'DDS_ALREADY_ASSIGNED',
        'A DDS has already been assigned for today',
        'Someone else has already accepted DDS responsibility for today.'
      );
    }

    // Create the DDS assignment
    const assignment = await prisma.ddsAssignment.create({
      data: {
        memberId,
        assignedDate: today,
        acceptedAt: new Date(),
        status: 'active',
      },
      include: memberInclude,
    });

    // Create audit log entry
    await prisma.responsibilityAuditLog.create({
      data: {
        memberId,
        tagName: 'DDS',
        action: 'self_accepted',
        performedBy: memberId,
        performedByType: 'member',
      },
    });

    // Auto-transfer Lockup tag to new DDS holder
    try {
      await tagService.transferLockupTag(
        memberId,
        memberId,
        'system',
        'Auto-transferred on DDS acceptance'
      );
    } catch (error) {
      // Fail silently - don't block DDS assignment
      console.error('Failed to auto-transfer Lockup tag:', error);
    }

    const result = transformAssignment(assignment);

    // Broadcast update
    broadcastDdsUpdate(toUpdateEvent(result));

    return result;
  }

  /**
   * Admin assigns DDS to a member
   */
  async assignDds(
    memberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate();

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member you are trying to assign DDS to does not exist.'
      );
    }

    // Check if DDS already exists for today
    const existingDds = await prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
    });

    if (existingDds) {
      throw new ConflictError(
        'DDS_ALREADY_ASSIGNED',
        'A DDS has already been assigned for today',
        'Use the transfer endpoint to change the DDS holder.'
      );
    }

    // Create the DDS assignment
    const assignment = await prisma.ddsAssignment.create({
      data: {
        memberId,
        assignedDate: today,
        acceptedAt: new Date(),
        assignedBy: adminId,
        status: 'active',
        notes: notes ?? null,
      },
      include: memberInclude,
    });

    // Create audit log entry
    await prisma.responsibilityAuditLog.create({
      data: {
        memberId,
        tagName: 'DDS',
        action: 'assigned',
        toMemberId: memberId,
        performedBy: adminId,
        performedByType: 'admin',
        notes: notes ?? null,
      },
    });

    const result = transformAssignment(assignment);

    // Broadcast update
    broadcastDdsUpdate(toUpdateEvent(result));

    return result;
  }

  /**
   * Admin transfers DDS from current holder to another member
   */
  async transferDds(
    toMemberId: string,
    adminId: string,
    notes?: string
  ): Promise<DdsAssignmentWithMember> {
    const today = getTodayDate();

    // Check if target member exists
    const targetMember = await prisma.member.findUnique({
      where: { id: toMemberId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!targetMember) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${toMemberId} not found`,
        'The member you are trying to transfer DDS to does not exist.'
      );
    }

    // Find current active DDS assignment
    const currentDds = await prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
    });

    if (!currentDds) {
      throw new NotFoundError(
        'NO_CURRENT_DDS',
        'No DDS assignment exists for today',
        'Assign a DDS first before attempting to transfer.'
      );
    }

    if (currentDds.memberId === toMemberId) {
      throw new ValidationError(
        'SAME_MEMBER',
        'Cannot transfer DDS to the same member',
        'The target member is already the current DDS holder.'
      );
    }

    // Use a transaction to update old assignment and create new one
    const [, newAssignment] = await prisma.$transaction([
      // Mark old assignment as transferred
      prisma.ddsAssignment.update({
        where: { id: currentDds.id },
        data: {
          status: 'transferred',
          transferredTo: toMemberId,
          releasedAt: new Date(),
        },
      }),
      // Create new assignment
      prisma.ddsAssignment.create({
        data: {
          memberId: toMemberId,
          assignedDate: today,
          acceptedAt: new Date(),
          assignedBy: adminId,
          status: 'active',
          notes: notes ?? null,
        },
        include: memberInclude,
      }),
    ]);

    // Create audit log entry
    await prisma.responsibilityAuditLog.create({
      data: {
        memberId: toMemberId,
        tagName: 'DDS',
        action: 'transferred',
        fromMemberId: currentDds.memberId,
        toMemberId: toMemberId,
        performedBy: adminId,
        performedByType: 'admin',
        notes: notes ?? null,
      },
    });

    const result = transformAssignment(newAssignment);

    // Broadcast update
    broadcastDdsUpdate(toUpdateEvent(result));

    return result;
  }

  /**
   * Release DDS role (during checkout or by admin)
   */
  async releaseDds(adminId?: string, notes?: string): Promise<void> {
    const today = getTodayDate();

    // Find current active DDS assignment
    const currentDds = await prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
      include: memberInclude,
    });

    if (!currentDds) {
      throw new NotFoundError(
        'NO_CURRENT_DDS',
        'No DDS assignment exists for today',
        'There is no active DDS to release.'
      );
    }

    // Update assignment to released
    await prisma.ddsAssignment.update({
      where: { id: currentDds.id },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    });

    // Create audit log entry
    await prisma.responsibilityAuditLog.create({
      data: {
        memberId: currentDds.memberId,
        tagName: 'DDS',
        action: 'released',
        fromMemberId: currentDds.memberId,
        performedBy: adminId ?? currentDds.memberId,
        performedByType: adminId ? 'admin' : 'member',
        notes: notes ?? null,
      },
    });

    // Broadcast update with released status
    const result = transformAssignment(currentDds);
    const event = toUpdateEvent(result);
    event.status = 'released';
    broadcastDdsUpdate(event);
  }

  /**
   * Check if DDS exists for today (used by kiosk to show/hide DDS button)
   */
  async hasDdsForToday(): Promise<boolean> {
    const today = getTodayDate();

    const assignment = await prisma.ddsAssignment.findFirst({
      where: {
        assignedDate: today,
        status: {
          in: ['pending', 'active'],
        },
      },
      select: { id: true },
    });

    return assignment !== null;
  }

  /**
   * Get audit log entries for DDS responsibility
   */
  async getAuditLog(
    memberId?: string,
    limit: number = 50
  ): Promise<ResponsibilityAuditLogEntry[]> {
    const whereClause: Prisma.ResponsibilityAuditLogWhereInput = {
      tagName: 'DDS',
    };

    if (memberId) {
      whereClause.OR = [
        { memberId },
        { fromMemberId: memberId },
        { toMemberId: memberId },
      ];
    }

    const logs = await prisma.responsibilityAuditLog.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      memberId: log.memberId,
      tagName: log.tagName,
      action: log.action,
      fromMemberId: log.fromMemberId,
      toMemberId: log.toMemberId,
      performedBy: log.performedBy,
      performedByType: log.performedByType,
      timestamp: log.timestamp,
      notes: log.notes,
    }));
  }
}

export const ddsService = new DdsService();
