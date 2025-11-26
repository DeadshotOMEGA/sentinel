import { pool } from '../connection';
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Converts snake_case database row to camelCase TypeScript object
 */
export function toCamelCase<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Converts camelCase object to snake_case for database queries
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase());
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Base repository class with common database operations
 */
export abstract class BaseRepository {
  protected pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Execute a query and return results
   */
  protected async query<T extends QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      return await client.query<T>(text, params);
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query and return a single row
   */
  protected async queryOne<T extends QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  protected async queryAll<T extends QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Begin a transaction
   */
  protected async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a transaction
   */
  protected async commitTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a transaction
   */
  protected async rollbackTransaction(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}
