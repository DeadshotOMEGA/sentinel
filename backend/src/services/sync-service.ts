import type { CheckinDirection } from '../../../shared/types';
import { checkinRepository } from '../db/repositories/checkin-repository';
import { badgeRepository } from '../db/repositories/badge-repository';
import { memberRepository } from '../db/repositories/member-repository';
import { validateCheckinTimestamp } from '../utils/timestamp-validator';
import { broadcastCheckin, broadcastPresenceUpdate } from '../websocket';

export interface BulkCheckinInput {
  serialNumber: string;
  timestamp: string;
  kioskId?: string;
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
}

interface DeduplicationKey {
  badgeId: string;
  kioskId: string;
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

  // Step 1: Validate all timestamps
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

    validatedCheckins.push({
      serialNumber: checkin.serialNumber,
      timestamp,
      kioskId: checkin.kioskId ? checkin.kioskId : '',
      originalTimestampStr: checkin.timestamp,
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

  // Step 4: Process valid, deduplicated checkins
  for (const checkinItem of deduplicatedCheckins) {
    try {
      const { serialNumber, timestamp, kioskId, originalTimestampStr } =
        checkinItem;

      // Look up badge
      const badge = await badgeRepository.findBySerialNumber(serialNumber);
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

      // Get last checkin to determine direction
      const lastCheckin = await checkinRepository.findLatestByMember(memberId);
      const direction: CheckinDirection =
        lastCheckin?.direction === 'in' ? 'out' : 'in';

      // Create checkin record
      const checkin = await checkinRepository.create({
        memberId,
        badgeId: badge.id,
        direction,
        timestamp,
        kioskId: checkinItem.kioskId,
        synced: true,
      });

      // Get member info for broadcast
      const member = await memberRepository.findById(memberId);
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
