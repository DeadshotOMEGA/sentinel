import type { PrismaClient } from '@sentinel/database'
import { prisma as defaultPrisma } from '@sentinel/database'
import { dbLogger } from './logger.js'

/**
 * Database Service
 *
 * Provides a mutable Prisma client that can be swapped during tests.
 *
 * Production: Uses singleton from @sentinel/database
 * Tests: Can be replaced with test client via setPrismaClient()
 *
 * Why this exists:
 * - Routes need direct database access (for raw SQL queries)
 * - Global prisma singleton can't be swapped during tests
 * - This service allows test injection without breaking ts-rest patterns
 */

// Mutable reference (can be swapped in tests)
let client: PrismaClient = defaultPrisma

/**
 * Get current Prisma client
 *
 * @returns Active PrismaClient instance
 */
export function getPrismaClient(): PrismaClient {
  if (!client) {
    dbLogger.error('Prisma client not initialized')
    throw new Error('Database client not available')
  }
  return client
}

/**
 * Replace Prisma client (for testing)
 *
 * @param testClient - Test PrismaClient instance
 */
export function setPrismaClient(testClient: PrismaClient): void {
  dbLogger.debug('Replacing Prisma client (test mode)')
  client = testClient
}

/**
 * Reset to default Prisma client (after tests)
 */
export function resetPrismaClient(): void {
  dbLogger.debug('Resetting Prisma client to default')
  client = defaultPrisma
}

/**
 * Convenient alias for database access
 */
export const db = {
  get client() {
    return getPrismaClient()
  },
  set client(c: PrismaClient) {
    setPrismaClient(c)
  },
}
