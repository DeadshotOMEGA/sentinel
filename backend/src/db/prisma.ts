import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Singleton PrismaClient instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure logging based on environment
const logConfig = process.env.NODE_ENV === 'development'
  ? ['query' as const, 'error' as const, 'warn' as const]
  : ['error' as const, 'warn' as const];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  });

// Log slow queries in development (via stdout, configured above)
if (process.env.NODE_ENV === 'development') {
  logger.debug('Prisma query logging enabled');
}

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Check if the database connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

// Re-export Prisma types for convenience
export type { PrismaClient } from '@prisma/client';
export { Prisma } from '@prisma/client';
