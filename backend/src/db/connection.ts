import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Track database health status for /health endpoint
let isDatabaseHealthy = true;

function getDbConfig() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host) {
    throw new Error('DB_HOST environment variable is required');
  }
  if (!port) {
    throw new Error('DB_PORT environment variable is required');
  }
  if (!database) {
    throw new Error('DB_NAME environment variable is required');
  }
  if (!user) {
    throw new Error('DB_USER environment variable is required');
  }
  if (!password) {
    throw new Error('DB_PASSWORD environment variable is required');
  }

  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber)) {
    throw new Error('DB_PORT must be a valid number');
  }

  return {
    host,
    port: portNumber,
    database,
    user,
    password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(getDbConfig());

// CRITICAL-7 FIX: Do NOT crash on pool errors - let health checks handle it
pool.on('error', (err) => {
  logger.error('Database pool error (connection will be retried)', {
    error: err.message,
    code: (err as NodeJS.ErrnoException).code,
  });
  isDatabaseHealthy = false;
  // Do NOT process.exit - let the application continue and retry connections
});

pool.on('connect', () => {
  isDatabaseHealthy = true;
});

/**
 * Check if the database connection is healthy
 * Used by /health endpoint
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    isDatabaseHealthy = true;
    return true;
  } catch {
    isDatabaseHealthy = false;
    return false;
  }
}

export function isDatabaseReady(): boolean {
  return isDatabaseHealthy;
}

export { pool };
export type { Pool, PoolClient } from 'pg';
