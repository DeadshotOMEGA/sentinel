/**
 * Validates check-in timestamps according to business rules
 */

interface TimestampValidationResult {
  valid: boolean;
  reason?: string;
}

const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AGE_DAYS = 7;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export function validateCheckinTimestamp(
  timestamp: Date
): TimestampValidationResult {
  if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
    return {
      valid: false,
      reason: 'Invalid timestamp format',
    };
  }

  const now = new Date();
  const timeDiffMs = now.getTime() - timestamp.getTime();

  // Check if timestamp is in the future (allow 5 minutes tolerance for clock skew)
  if (timeDiffMs < -CLOCK_SKEW_TOLERANCE_MS) {
    return {
      valid: false,
      reason: 'Timestamp in the future',
    };
  }

  // Check if timestamp is older than 7 days
  if (timeDiffMs > MAX_AGE_MS) {
    return {
      valid: false,
      reason: 'Timestamp too old (>7 days)',
    };
  }

  return { valid: true };
}
