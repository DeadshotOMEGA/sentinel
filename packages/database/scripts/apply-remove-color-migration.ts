import 'dotenv/config'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function applyMigration() {
  const client = await pool.connect()

  try {
    console.log('Applying migration: 20260126_remove_color_field')

    const migrationSQL = readFileSync(
      join(__dirname, '../prisma/migrations/20260126_remove_color_field/migration.sql'),
      'utf-8'
    )

    await client.query(migrationSQL)

    console.log('✓ Migration applied successfully')

    // Record migration in _prisma_migrations table
    await client.query(`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid()::text,
        '',
        NOW(),
        '20260126_remove_color_field',
        NULL,
        NULL,
        NOW(),
        1
      )
      ON CONFLICT (migration_name) DO NOTHING
    `)

    console.log('✓ Migration recorded in _prisma_migrations')
  } catch (error) {
    console.error('Error applying migration:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

applyMigration()
  .then(() => {
    console.log('✓ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to apply migration:', error)
    process.exit(1)
  })
