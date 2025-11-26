#!/usr/bin/env bun
import { pool } from '../src/db/connection';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface Migration {
  name: string;
  appliedAt: Date;
}

async function createMigrationsTable(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Migrations table ready');
  } finally {
    client.release();
  }
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<Migration>(
    'SELECT name FROM migrations ORDER BY applied_at ASC'
  );

  return new Set(result.rows.map(row => row.name));
}

async function applyMigration(filename: string, sql: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Execute migration SQL
    await client.query(sql);

    // Record migration
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [filename]
    );

    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to apply migration ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...\n');

    // Ensure migrations table exists
    await createMigrationsTable();

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();

    // Read migration files
    const migrationsDir = join(import.meta.dir, 'migrations');
    const files = await readdir(migrationsDir);

    // Filter and sort .sql files
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Apply pending migrations
    let appliedCount = 0;

    for (const filename of sqlFiles) {
      if (appliedMigrations.has(filename)) {
        console.log(`- Skipping (already applied): ${filename}`);
        continue;
      }

      const filepath = join(migrationsDir, filename);
      const sql = await readFile(filepath, 'utf-8');

      await applyMigration(filename, sql);
      appliedCount++;
    }

    console.log(`\n✓ Migration complete! Applied ${appliedCount} migration(s)`);
  } catch (error) {
    console.error('\n✗ Migration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();
