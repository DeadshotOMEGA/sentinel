#!/usr/bin/env tsx
import 'dotenv/config'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { PrismaClient } from '../generated/client/index.js'
import { adapter } from '../src/adapter.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const migrationsDir = join(__dirname, '../prisma/migrations')

function getMigrationFolders(): Array<{ name: string; sqlPath: string; checksum: string }> {
  const entries = readdirSync(migrationsDir)

  return entries
    .filter((name) => /^\d{8,}_/.test(name))
    .filter((name) => {
      const fullPath = join(migrationsDir, name)
      return statSync(fullPath).isDirectory()
    })
    .map((name) => {
      const sqlPath = join(migrationsDir, name, 'migration.sql')
      const sql = readFileSync(sqlPath, 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      return { name, sqlPath, checksum }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function baselinePrismaMigrations(): Promise<{ inserted: number; skipped: number }> {
  const prisma = new PrismaClient({ adapter })
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `)

    const existingRows = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      'SELECT migration_name FROM _prisma_migrations'
    )
    const existing = new Set(existingRows.map((r) => r.migration_name))

    const migrations = getMigrationFolders()
    let inserted = 0
    let skipped = 0

    for (const migration of migrations) {
      if (existing.has(migration.name)) {
        skipped++
        continue
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        randomUUID(),
        migration.checksum,
        migration.name
      )
      inserted++
    }

    return { inserted, skipped }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const result = await baselinePrismaMigrations()
  console.log(`baseline complete: inserted=${result.inserted} skipped=${result.skipped}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error('baseline failed:', error)
    process.exit(1)
  })
}
