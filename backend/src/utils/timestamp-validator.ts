import { logger } from './logger';

/**
 * Validates check-in timestamps according to business rules
 * Prevents timestamp manipulation attacks (HIGH-6)
 */

interface TimestampValidationResult {
  valid: boolean;
  reason?: string;
}

// Security settings to prevent backdated check-ins
const MAX_PAST_MS = 5 * 60 * 1000; // 5 minutes - reject anything older
const MAX_FUTURE_MS = 30 * 1000; // 30 seconds - allow for clock drift tolerance

export function validateCheckinTimestamp(
  timestamp: Date,
  serverTime: Date = new Date()
): TimestampValidationResult {
  if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
    return {
      valid: false,
      reason: 'Invalid timestamp format',
    };
  }

  const timeDiffMs = serverTime.getTime() - timestamp.getTime();

  // Check if timestamp is too far in the future
  if (timeDiffMs < -MAX_FUTURE_MS) {
    const secondsInFuture = Math.round(-timeDiffMs / 1000);
    logger.warn('Suspicious timestamp detected', {
      type: 'timestamp_future',
      timestamp: timestamp.toISOString(),
      serverTime: serverTime.toISOString(),
      secondsInFuture,
      securityViolation: 'HIGH-6',
    });
    return {
      valid: false,
      reason: `Timestamp is ${secondsInFuture} seconds in the future. Check-in timestamps cannot be in the future.`,
    };
  }

  // Check if timestamp is too old (backdated)
  if (timeDiffMs > MAX_PAST_MS) {
    const secondsInPast = Math.round(timeDiffMs / 1000);
    logger.warn('Suspicious timestamp detected', {
      type: 'timestamp_backdated',
      timestamp: timestamp.toISOString(),
      serverTime: serverTime.toISOString(),
      secondsInPast,
      securityViolation: 'HIGH-6',
    });
    return {
      valid: false,
      reason: `Timestamp is ${secondsInPast} seconds in the past. Check-in timestamps must be within 5 minutes of current time.`,
    };
  }

  return { valid: true };
}
