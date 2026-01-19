import { prisma } from '../db/prisma';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { visitorRepository } from '../db/repositories/visitor-repository';
import { checkinService } from './checkin-service';
import { presenceService } from './presence-service';
import { broadcastVisitorSignout, broadcastPresenceUpdate, broadcastCheckin } from '../websocket/broadcast';
import { NotFoundError, ValidationError } from '../utils/errors';
import type { Member, MemberWithDivision, Visitor } from '../../../shared/types';

interface LockupPresentData {
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    division: string;
    divisionId: string;
    memberType: 'class_a' | 'class_b' | 'class_c' | 'reg_force';
    mess: string | null;
    checkedInAt: string;
    kioskId?: string;
  }>;
  visitors: Array<{
    id: string;
    name: string;
    organization: string;
    visitType: string;
    checkInTime: Date;
  }>;
}

interface LockupExecutionResult {
  checkedOut: {
    members: string[];
    visitors: string[];
  };
  auditLogId: string;
}

/**
 * Service for building lockup operations
 * Allows designated members with "Lockup" tag to bulk checkout all present people
 */
export class LockupService {
  /**
   * Check if a member has the "Lockup" tag
   * Used by kiosk to verify authorization before showing lockup option
   */
  async checkMemberHasLockupTag(memberId: string): Promise<boolean> {
    // Verify member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member does not exist in the system.'
      );
    }

    // Check if member has the "Lockup" tag
    const lockupTag = await prisma.memberTag.findFirst({
      where: {
        memberId,
        tag: {
          name: 'Lockup',
        },
      },
    });

    return lockupTag !== null;
  }

  /**
   * Get all currently present members and visitors for lockup confirmation screen
   */
  async getPresentMembersForLockup(): Promise<LockupPresentData> {
    const [members, visitors] = await Promise.all([
      checkinRepository.getPresentMembers(),
      visitorRepository.findActive(),
    ]);

    return {
      members,
      visitors: visitors.map((v) => ({
        id: v.id,
        name: v.name,
        organization: v.organization,
        visitType: v.visitType,
        checkInTime: v.checkInTime,
      })),
    };
  }

  /**
   * Execute building lockup - bulk checkout all present members and visitors
   * Creates audit log entry and broadcasts presence updates
   */
  async executeLockup(performedById: string, note?: string): Promise<LockupExecutionResult> {
    // Verify the performer exists and has Lockup tag
    const hasLockupTag = await this.checkMemberHasLockupTag(performedById);
    if (!hasLockupTag) {
      throw new ValidationError(
        'LOCKUP_NOT_AUTHORIZED',
        'Member is not authorized to perform lockup',
        'You do not have the Lockup tag required to perform building lockup.'
      );
    }

    // Get all present people
    const { members, visitors } = await this.getPresentMembersForLockup();

    const checkedOutMembers: string[] = [];
    const checkedOutVisitors: string[] = [];
    const now = new Date();

    // Process member checkouts
    for (const member of members) {
      try {
        // Skip the person performing the lockup - they will checkout last
        if (member.id === performedById) {
          continue;
        }

        // Get member's badge
        const memberData = await prisma.member.findUnique({
          where: { id: member.id },
          select: { badgeId: true, firstName: true, lastName: true, rank: true },
        });

        if (!memberData?.badgeId) {
          // Skip members without badges
          continue;
        }

        // Create checkout checkin record
        await checkinRepository.create({
          memberId: member.id,
          badgeId: memberData.badgeId,
          direction: 'out',
          timestamp: now,
          kioskId: 'lockup-checkout',
          synced: true,
        });

        // Update member direction cache
        await presenceService.setMemberDirection(member.id, 'out');

        // Broadcast checkin event
        broadcastCheckin({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          rank: member.rank,
          division: member.division,
          direction: 'out',
          timestamp: now.toISOString(),
          kioskId: 'lockup-checkout',
          kioskName: 'Building Lockup',
        });

        checkedOutMembers.push(member.id);
      } catch (error) {
        // Log but continue with other members
        console.error(`Failed to checkout member ${member.id} during lockup:`, error);
      }
    }

    // Process visitor checkouts
    for (const visitor of visitors) {
      try {
        const checkedOutVisitor = await visitorRepository.checkout(visitor.id);

        if (checkedOutVisitor.checkOutTime) {
          broadcastVisitorSignout({
            visitorId: checkedOutVisitor.id,
            checkOutTime: checkedOutVisitor.checkOutTime.toISOString(),
          });
        }

        checkedOutVisitors.push(visitor.id);
      } catch (error) {
        // Log but continue with other visitors
        console.error(`Failed to checkout visitor ${visitor.id} during lockup:`, error);
      }
    }

    // Now checkout the person performing the lockup
    const performer = members.find((m) => m.id === performedById);
    if (performer) {
      try {
        const performerData = await prisma.member.findUnique({
          where: { id: performedById },
          select: { badgeId: true, firstName: true, lastName: true, rank: true },
        });

        if (performerData?.badgeId) {
          await checkinRepository.create({
            memberId: performedById,
            badgeId: performerData.badgeId,
            direction: 'out',
            timestamp: now,
            kioskId: 'lockup-checkout',
            synced: true,
          });

          await presenceService.setMemberDirection(performedById, 'out');

          broadcastCheckin({
            memberId: performedById,
            memberName: `${performer.firstName} ${performer.lastName}`,
            rank: performer.rank,
            division: performer.division,
            direction: 'out',
            timestamp: now.toISOString(),
            kioskId: 'lockup-checkout',
            kioskName: 'Building Lockup',
          });

          checkedOutMembers.push(performedById);
        }
      } catch (error) {
        console.error(`Failed to checkout performer ${performedById} during lockup:`, error);
      }
    }

    // Create audit log entry
    const auditLog = await prisma.responsibilityAuditLog.create({
      data: {
        memberId: performedById,
        tagName: 'Lockup',
        action: 'building_lockup',
        performedBy: performedById,
        performedByType: 'member',
        notes: note ?? `Lockup executed. Checked out ${checkedOutMembers.length} members and ${checkedOutVisitors.length} visitors.`,
      },
    });

    // Broadcast single presence update at the end
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    return {
      checkedOut: {
        members: checkedOutMembers,
        visitors: checkedOutVisitors,
      },
      auditLogId: auditLog.id,
    };
  }
}

export const lockupService = new LockupService();
