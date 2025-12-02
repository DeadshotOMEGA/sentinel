import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Build connection string from env vars
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Create pg pool
const pool = new Pool({ connectionString });

// Create Prisma adapter
const adapter = new PrismaPg(pool);

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
    adapter,
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
  await pool.end();
}

// Re-export Prisma types for convenience
export type { PrismaClient } from '@prisma/client';
export { Prisma } from '@prisma/client';
