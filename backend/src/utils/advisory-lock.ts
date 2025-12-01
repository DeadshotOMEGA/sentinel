import { prisma } from '../db/prisma';

/**
 * Execute a function with a PostgreSQL advisory lock.
 * Uses transaction-level locks that auto-release on commit/rollback.
 *
 * Advisory locks are database-level locks that prevent concurrent execution
 * of critical operations. The lock is automatically released when the
 * transaction completes (commits or rolls back).
 *
 * @param lockKey - String identifier for the lock (converted to numeric hash)
 * @param fn - Async function to execute while holding the lock
 * @returns The result of the function execution
 *
 * @example
 * ```typescript
 * await withAdvisoryLock(LOCK_KEYS.MEMBER_IMPORT, async () => {
 *   // Bulk import logic that must not run concurrently
 *   await importMembers(data);
 * });
 * ```
 */
export async function withAdvisoryLock<T>(
  lockKey: string,
  fn: () => Promise<T>
): Promise<T> {
  // Convert string key to numeric hash for pg_advisory_xact_lock
  const lockId = hashStringToNumber(lockKey);

  return prisma.$transaction(async (tx) => {
    // Acquire lock (blocks until available)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

    // Execute the protected operation
    return fn();
  });
}

/**
 * Try to acquire an advisory lock without blocking.
 * Returns immediately with acquisition status.
 *
 * Use this when you want to fail fast rather than wait for lock availability.
 * Useful for operations that should be skipped if already in progress.
 *
 * @param lockKey - String identifier for the lock
 * @param fn - Async function to execute if lock is acquired
 * @returns Object with acquisition status and optional result
 *
 * @example
 * ```typescript
 * const { acquired, result } = await tryAdvisoryLock(
 *   LOCK_KEYS.BULK_CHECKIN,
 *   async () => processBulkCheckins(items)
 * );
 *
 * if (!acquired) {
 *   throw new ConflictError('Bulk check-in already in progress');
 * }
 * ```
 */
export async function tryAdvisoryLock<T>(
  lockKey: string,
  fn: () => Promise<T>
): Promise<{ acquired: boolean; result?: T }> {
  const lockId = hashStringToNumber(lockKey);

  return prisma.$transaction(async (tx) => {
    // Try to acquire lock (non-blocking)
    const result = await tx.$queryRaw<[{ pg_try_advisory_xact_lock: boolean }]>`
      SELECT pg_try_advisory_xact_lock(${lockId})
    `;

    if (!result[0].pg_try_advisory_xact_lock) {
      return { acquired: false };
    }

    return { acquired: true, result: await fn() };
  });
}

/**
 * Convert a string to a consistent numeric hash for advisory locks.
 * Uses a simple hash function (djb2 variant) that produces a 32-bit integer.
 *
 * PostgreSQL advisory locks require numeric IDs. This function ensures
 * the same string always produces the same lock ID.
 *
 * @param str - String to hash
 * @returns 32-bit integer hash
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Pre-defined lock keys for common operations.
 * Use these constants to ensure consistent lock naming across the codebase.
 */
export const LOCK_KEYS = {
  /** Lock for member CSV/Excel import operations */
  MEMBER_IMPORT: 'sentinel:import:members',

  /** Lock for bulk check-in operations (offline sync) */
  BULK_CHECKIN: 'sentinel:checkin:bulk',

  /** Lock for badge assignment operations (per badge) */
  BADGE_ASSIGNMENT: (badgeId: string) => `sentinel:badge:${badgeId}`,

  /** Lock for member data updates (per member) */
  MEMBER_UPDATE: (memberId: string) => `sentinel:member:${memberId}`,

  /** Lock for event creation/modification */
  EVENT_UPDATE: (eventId: string) => `sentinel:event:${eventId}`,

  /** Lock for visitor bulk operations */
  VISITOR_IMPORT: 'sentinel:import:visitors',
} as const;
