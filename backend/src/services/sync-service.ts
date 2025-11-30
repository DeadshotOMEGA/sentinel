import type { CheckinDirection, Badge, MemberWithDivision } from '../../../shared/types';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { validateCheckinTimestamp } from '../utils/timestamp-validator';
import { broadcastCheckin, broadcastPresenceUpdate } from '../websocket';

export interface BulkCheckinInput {
  serialNumber: string;
  timestamp: string;
  kioskId?: string;
  localTimestamp?: number;
  sequenceNumber?: number;
}

export interface BulkCheckinSuccess {
  serialNumber: string;
  timestamp: string;
  success: true;
  checkinId: string;
  memberId: string;
  memberName: string;
  direction: CheckinDirection;
}

export interface BulkCheckinError {
  serialNumber: string;
  timestamp: string;
  success: false;
  error: string;
}

export type BulkCheckinItemResult = BulkCheckinSuccess | BulkCheckinError;

export interface BulkCheckinResult {
  success: boolean;
  processed: number;
  failed: number;
  results: BulkCheckinItemResult[];
}

interface CheckinItem {
  serialNumber: string;
  timestamp: Date;
  kioskId: string;
  originalTimestampStr: string;
  localTimestamp?: number;
  sequenceNumber?: number;
  flaggedForReview: boolean;
  flagReason?: string;
}

interface DeduplicationKey {
  badgeId: string;
  kioskId: string;
}

/**
 * Validate clock drift and flag suspicious timestamps
 */
function validateClockDrift(
  localTimestamp: number | undefined,
  serverTime: Date
): { flagged: boolean; reason?: string } {
  if (!localTimestamp) {
    return { flagged: false };
  }

  const drift = Math.abs(serverTime.getTime() - localTimestamp);
  const MAX_DRIFT = 5 * 60 * 1000; // 5 minutes

  if (drift > MAX_DRIFT) {
    const driftMinutes = Math.floor(drift / 60000);
    return {
      flagged: true,
      reason: `Clock drift: ${driftMinutes} minute(s)`,
    };
  }

  return { flagged: false };
}

/**
 * Process bulk check-ins with validation, deduplication, and error handling
 */
export async function processBulkCheckins(
  checkins: BulkCheckinInput[]
): Promise<BulkCheckinResult> {
  const results: BulkCheckinItemResult[] = [];
  const validatedCheckins: CheckinItem[] = [];
  const errorMap = new Map<number, string>();
  const serverTime = new Date();

  // Step 1: Validate all timestamps and detect clock drift
  for (let i = 0; i < checkins.length; i++) {
    const checkin = checkins[i];
    const timestamp = new Date(checkin.timestamp);

    const validation = validateCheckinTimestamp(timestamp);
    if (!validation.valid) {
      const reason = validation.reason;
      if (!reason) {
        throw new Error('Validation failed but no reason provided');
      }
      errorMap.set(i, reason);
      continue;
    }

    // Check for clock drift
    const driftCheck = validateClockDrift(checkin.localTimestamp, serverTime);

    validatedCheckins.push({
      serialNumber: checkin.serialNumber,
      timestamp,
      kioskId: checkin.kioskId ? checkin.kioskId : '',
      originalTimestampStr: checkin.timestamp,
      localTimestamp: checkin.localTimestamp,
      sequenceNumber: checkin.sequenceNumber,
      flaggedForReview: driftCheck.flagged,
      flagReason: driftCheck.reason,
    });
  }

  // Step 2: Sort by timestamp (oldest first)
  validatedCheckins.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Step 3: Deduplicate - same badge + same kiosk within 5 seconds = keep earliest only
  const seenDuplicates = new Set<string>();
  const deduplicatedCheckins: CheckinItem[] = [];
  const DEDUP_WINDOW_MS = 5000;

  for (let i = 0; i < validatedCheckins.length; i++) {
    const current = validatedCheckins[i];
    const dupKey = `${current.serialNumber}:${current.kioskId}`;

    // Check if this is a duplicate of a recently seen scan
    let isDuplicate = false;
    for (let j = i - 1; j >= 0 && !isDuplicate; j--) {
      const prev = validatedCheckins[j];
      const prevDupKey = `${prev.serialNumber}${prev.kioskId}`;

      if (
        prevDupKey === dupKey &&
        current.timestamp.getTime() - prev.timestamp.getTime() < DEDUP_WINDOW_MS
      ) {
        isDuplicate = true;
        seenDuplicates.add(dupKey);
      }
    }

    if (!isDuplicate) {
      deduplicatedCheckins.push(current);
    }
  }

  // Step 4: Batch load all required data upfront
  const serialNumbers = deduplicatedCheckins.map((c) => c.serialNumber);

  // Load all badges in one query
  const badges = await badgeRepository.findBySerialNumbers(serialNumbers);
  const badgeMap = new Map<string, Badge>();
  badges.forEach((badge) => {
    badgeMap.set(badge.serialNumber, badge);
  });

  // Extract member IDs from badges
  const memberIds = badges
    .filter((b) => b.assignmentType === 'member' && b.assignedToId)
    .map((b) => b.assignedToId as string);

  // Load all members in one query
  const members = await memberRepository.findByIds(memberIds);
  const memberMap = new Map<string, MemberWithDivision>();
  members.forEach((member) => {
    memberMap.set(member.id, member);
  });

  // Load all latest checkins in one query
  const latestCheckinsMap = await checkinRepository.findLatestByMembers(memberIds);

  // Step 5: Process valid, deduplicated checkins with batch-loaded data
  for (const checkinItem of deduplicatedCheckins) {
    try {
      const { serialNumber, timestamp, kioskId, originalTimestampStr } =
        checkinItem;

      // Look up badge from batch-loaded data
      const badge = badgeMap.get(serialNumber);
      if (!badge || badge.assignmentType !== 'member' || !badge.assignedToId) {
        results.push({
          serialNumber,
          timestamp: originalTimestampStr,
          success: false,
          error: 'Badge not found or not assigned',
        });
        continue;
      }

      const memberId = badge.assignedToId;

      // Check badge status
      if (badge.status !== 'active') {
        results.push({
          serialNumber,
          timestamp: originalTimestampStr,
          success: false,
          error: `Badge is ${badge.status}`,
        });
        continue;
      }

      // Get last checkin from batch-loaded data
      const lastCheckin = latestCheckinsMap.get(memberId);
      const direction: CheckinDirection =
        lastCheckin?.direction === 'in' ? 'out' : 'in';

      // Create checkin record with flagging if clock drift detected
      const checkin = await checkinRepository.create({
        memberId,
        badgeId: badge.id,
        direction,
        timestamp,
        kioskId: checkinItem.kioskId,
        synced: true,
        flaggedForReview: checkinItem.flaggedForReview,
        flagReason: checkinItem.flagReason,
      });

      // Get member info from batch-loaded data
      const member = memberMap.get(memberId);
      if (member && checkinItem.kioskId) {
        broadcastCheckin({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          rank: member.rank,
          division: member.division.name,
          direction,
          timestamp: timestamp.toISOString(),
          kioskId: checkinItem.kioskId,
        });
      }

      results.push({
        serialNumber,
        timestamp: originalTimestampStr,
        success: true,
        checkinId: checkin.id,
        memberId,
        memberName: member
          ? `${member.firstName} ${member.lastName}`
          : 'Unknown',
        direction,
      });
    } catch (error) {
      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        throw new Error(
          `Unexpected error type: ${typeof error}`
        );
      }
      results.push({
        serialNumber: checkinItem.serialNumber,
        timestamp: checkinItem.originalTimestampStr,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Broadcast updated presence stats after processing
  const successCount = results.filter((r) => r.success).length;
  if (successCount > 0) {
    const stats = await checkinRepository.getPresenceStats();
    broadcastPresenceUpdate(stats);
  }

  // Log flagged items for admin review
  const flaggedItems = deduplicatedCheckins.filter((item) => item.flaggedForReview);
  if (flaggedItems.length > 0) {
    const firstKioskId = flaggedItems[0]?.kioskId;
    if (!firstKioskId) {
      throw new Error('Flagged item missing kioskId');
    }
    console.warn('[Sync] Bulk sync has flagged items', {
      kioskId: firstKioskId,
      flaggedCount: flaggedItems.length,
      items: flaggedItems.map((item) => ({
        serialNumber: item.serialNumber,
        timestamp: item.timestamp.toISOString(),
        localTimestamp: item.localTimestamp,
        drift: item.localTimestamp
          ? Math.abs(serverTime.getTime() - item.localTimestamp)
          : null,
        reason: item.flagReason,
      })),
    });
  }

  // Add errors from timestamp validation
  for (const [originalIndex, errorReason] of errorMap.entries()) {
    const checkin = checkins[originalIndex];
    results.push({
      serialNumber: checkin.serialNumber,
      timestamp: checkin.timestamp,
      success: false,
      error: errorReason,
    });
  }

  const failedCount = results.filter((r) => !r.success).length;

  return {
    success: failedCount === 0,
    processed: successCount,
    failed: failedCount,
    results,
  };
}
