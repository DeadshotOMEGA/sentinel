import { checkinRepository } from '../db/repositories/checkin-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { presenceService } from './presence-service';
import { securityAlertService } from './security-alert-service';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { validateCheckinTimestamp } from '../utils/timestamp-validator';
import { getKioskName } from '../utils/kiosk-names';
import { broadcastCheckin, broadcastPresenceUpdate } from '../websocket';
import type {
  Checkin,
  CheckinDirection,
  MemberWithDivision,
} from '../../../shared/types';

interface CheckinOptions {
  timestamp?: Date;
  kioskId?: string;
}

interface CheckinWarning {
  type: 'inactive_member';
  message: string;
}

interface CheckinResult {
  checkin: Checkin;
  member: MemberWithDivision;
  direction: CheckinDirection;
  warning?: CheckinWarning;
}

export class CheckinService {
  /**
   * Process a badge scan and create a checkin record
   * Handles badge validation, direction determination, duplicate detection, and broadcasting
   */
  async processCheckin(
    serialNumber: string,
    options: CheckinOptions
  ): Promise<CheckinResult> {
    const scanTimestamp = options.timestamp ?? new Date();

    // Validate timestamp if provided
    if (options.timestamp) {
      const timestampValidation = validateCheckinTimestamp(scanTimestamp);
      if (!timestampValidation.valid) {
        const reason = timestampValidation.reason;
        if (!reason) {
          throw new Error('Timestamp validation failed but no reason provided');
        }
        throw new ValidationError(
          'INVALID_TIMESTAMP',
          reason,
          reason
        );
      }
    }

    // Look up badge by serial number with joined member data (single query)
    const badgeWithMember = await badgeRepository.findBySerialNumberWithMember(serialNumber);
    if (!badgeWithMember) {
      // Create security alert for unknown badge
      if (options.kioskId) {
        await securityAlertService.createAlert({
          alertType: 'badge_unknown',
          severity: 'warning',
          badgeSerial: serialNumber,
          kioskId: options.kioskId,
          message: `Unknown badge scanned: ${serialNumber}`,
          details: {
            serialNumber,
            timestamp: scanTimestamp.toISOString(),
          },
        });
      }
      throw new NotFoundError(
        'BADGE_NOT_FOUND',
        `Badge with serial number ${serialNumber} not found`,
        'This badge is not registered in the system. Please contact an administrator.'
      );
    }

    const { badge, member } = badgeWithMember;

    // Check if badge is assigned
    if (badge.assignmentType === 'unassigned' || !badge.assignedToId) {
      throw new ValidationError(
        'BADGE_NOT_ASSIGNED',
        `Badge ${serialNumber} is not assigned to any member`,
        'This badge is not assigned to a member. Please contact an administrator.'
      );
    }

    // Check badge status
    if (badge.status !== 'active') {
      // Create security alert for disabled/inactive badge
      if (options.kioskId) {
        await securityAlertService.createAlert({
          alertType: 'badge_disabled',
          severity: 'critical',
          badgeSerial: serialNumber,
          memberId: member?.id,
          kioskId: options.kioskId,
          message: `Disabled badge scanned: ${serialNumber} (status: ${badge.status})`,
          details: {
            serialNumber,
            badgeStatus: badge.status,
            memberId: member?.id,
            memberName: member ? `${member.firstName} ${member.lastName}` : null,
            timestamp: scanTimestamp.toISOString(),
          },
        });
      }
      throw new ValidationError(
        'BADGE_INACTIVE',
        `Badge ${serialNumber} is ${badge.status}`,
        `This badge is ${badge.status}. Please contact an administrator.`
      );
    }

    // Only support member badges for now (not event attendees)
    if (badge.assignmentType !== 'member') {
      throw new ValidationError(
        'UNSUPPORTED_BADGE_TYPE',
        `Badge type ${badge.assignmentType} not supported for check-in`,
        'This badge type is not supported for check-in. Please contact an administrator.'
      );
    }

    const memberId = badge.assignedToId;

    // Validate member was loaded
    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member assigned to this badge does not exist. Please contact an administrator.'
      );
    }

    // Check member status - allow check-in but flag warning for inactive members
    let memberWarning: CheckinWarning | undefined;
    if (member.status === 'inactive') {
      // Create security alert for inactive member
      if (options.kioskId) {
        await securityAlertService.createAlert({
          alertType: 'inactive_member',
          severity: 'warning',
          badgeSerial: serialNumber,
          memberId: member.id,
          kioskId: options.kioskId,
          message: `Inactive member checked in: ${member.rank} ${member.firstName} ${member.lastName}`,
          details: {
            serialNumber,
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`,
            memberStatus: member.status,
            timestamp: scanTimestamp.toISOString(),
          },
        });
      }
      memberWarning = {
        type: 'inactive_member',
        message: 'This member is marked as inactive in the system.',
      };
    }

    // Get direction from Redis cache first, fall back to DB if cache miss
    let lastDirection = await presenceService.getMemberDirection(memberId);
    if (!lastDirection) {
      // Cache miss - query DB for last checkin
      const lastCheckin = await checkinRepository.findLatestByMember(memberId);
      lastDirection = lastCheckin?.direction ?? null;
    }

    const direction: CheckinDirection = lastDirection === 'in' ? 'out' : 'in';

    // Check for duplicate scans within 2 seconds (DB safety net)
    if (await this.isDuplicateScan(memberId, scanTimestamp)) {
      throw new ConflictError(
        'DUPLICATE_SCAN',
        'Duplicate scan within 2 seconds',
        'Please wait a moment before scanning again.'
      );
    }

    // Create checkin record
    const checkin = await checkinRepository.create({
      memberId,
      badgeId: badge.id,
      direction,
      timestamp: scanTimestamp,
      kioskId: options.kioskId,
      synced: true,
    });

    // Cache the new direction in Redis for next checkin
    await presenceService.setMemberDirection(memberId, direction);

    // Broadcast checkin event to WebSocket clients
    if (!options.kioskId) {
      throw new ValidationError(
        'KIOSK_ID_REQUIRED',
        'Kiosk ID is required for broadcasting checkin events',
        'Please ensure the kiosk ID is provided in the request.'
      );
    }

    broadcastCheckin({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      rank: member.rank,
      division: member.division.name,
      direction,
      timestamp: scanTimestamp.toISOString(),
      kioskId: options.kioskId,
      kioskName: getKioskName(options.kioskId),
    });

    // Broadcast updated presence stats
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    return {
      checkin,
      member,
      direction,
      warning: memberWarning,
    };
  }

  /**
   * Check if a scan is a duplicate (within 2 seconds of last checkin)
   * Must match kiosk successDisplayMs to prevent "ready but rejected" state
   */
  async isDuplicateScan(memberId: string, timestamp: Date): Promise<boolean> {
    const lastCheckin = await checkinRepository.findLatestByMember(memberId);

    if (!lastCheckin) {
      return false;
    }

    const timeDiff = timestamp.getTime() - lastCheckin.timestamp.getTime();
    return Math.abs(timeDiff) < 2000;
  }

  /**
   * Admin force checkout - Manually check out a member
   * Used when members forget to badge out
   */
  async adminCheckout(memberId: string): Promise<CheckinResult> {
    // Get member with division
    const member = await memberRepository.findById(memberId);
    if (!member) {
      throw new NotFoundError(
        'MEMBER_NOT_FOUND',
        `Member ${memberId} not found`,
        'The member you are trying to check out does not exist. Please verify the member ID.'
      );
    }

    // Get member's badge
    if (!member.badgeId) {
      throw new ValidationError(
        `Member ${memberId} does not have a badge assigned`,
        'This member does not have a badge assigned. Cannot create checkout record without a badge.',
        'Please assign a badge to this member before attempting to check them out.'
      );
    }

    // Verify member is currently checked in
    const lastDirection = await presenceService.getMemberDirection(memberId);
    if (lastDirection !== 'in') {
      const lastCheckin = await checkinRepository.findLatestByMember(memberId);
      const actualDirection = lastCheckin?.direction ?? null;

      if (actualDirection !== 'in') {
        throw new ValidationError(
          `Member ${memberId} is not currently checked in`,
          'This member is not currently checked in. Cannot check out a member who is already checked out.',
          'Please verify the member is currently present before attempting to force checkout.'
        );
      }
    }

    const checkoutTimestamp = new Date();

    // Create checkout checkin record
    const checkin = await checkinRepository.create({
      memberId,
      badgeId: member.badgeId,
      direction: 'out',
      timestamp: checkoutTimestamp,
      kioskId: 'admin-forced-checkout',
      synced: true,
    });

    // Update member direction cache
    await presenceService.setMemberDirection(memberId, 'out');

    // Broadcast checkin event to activity feed
    broadcastCheckin({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      rank: member.rank,
      division: member.division?.name ?? '',
      direction: 'out',
      timestamp: checkoutTimestamp.toISOString(),
      kioskId: 'admin-forced-checkout',
      kioskName: 'Admin Dashboard',
    });

    // Broadcast presence stats update
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);

    return {
      checkin,
      member,
      direction: 'out',
    };
  }
}

export const checkinService = new CheckinService();
