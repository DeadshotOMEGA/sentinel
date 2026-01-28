#!/usr/bin/env tsx
/**
 * Database initialization and seeding script
 * Creates all tables from scratch and seeds ranks
 */
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://sentinel:sentinel@localhost:5432/sentinel'

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const client = await pool.connect()

  try {
    console.log('🔄 Checking database state...')

    // Check if tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    console.log(`Found ${result.rows.length} existing tables`)

    if (result.rows.length === 0) {
      console.log('⚠️  Database is empty. Please run the initial schema setup first.')
      console.log('   This should create all base tables (members, divisions, etc.)')
      return
    }

    // Check if ranks table exists
    const ranksExists = result.rows.some(r => r.table_name === 'ranks')

    if (ranksExists) {
      console.log('✓ Ranks table already exists')
      const countResult = await client.query('SELECT COUNT(*) FROM ranks')
      console.log(`  Current rank count: ${countResult.rows[0].count}`)

      if (parseInt(countResult.rows[0].count) > 0) {
        console.log('⚠️  Ranks already seeded. Skipping...')
        return
      }
    } else {
      console.log('🔄 Creating ranks table...')

      // Read and execute migration
      const migrationSQL = readFileSync(
        join(__dirname, '../prisma/migrations/add-ranks-table.sql'),
        'utf-8'
      )

      await client.query(migrationSQL)
      console.log('✓ Ranks table created')
    }

    console.log('🌱 Seeding ranks data...')

    // Read seed SQL
    const seedSQL = readFileSync(
      join(__dirname, 'seed-ranks.sql'),
      'utf-8'
    )

    // Execute seed
    await client.query(seedSQL)
    console.log('✓ Ranks seeded successfully')

    // Verify
    const verifyResult = await client.query(`
      SELECT
        branch,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COUNT(*) FILTER (WHERE is_active = false) as deprecated_count
      FROM ranks
      GROUP BY branch
      ORDER BY branch
    `)

    console.log('\n📊 Verification:')
    for (const row of verifyResult.rows) {
      console.log(`  ${row.branch.padEnd(10)}: ${row.active_count} active, ${row.deprecated_count} deprecated`)
    }

    const totalResult = await client.query('SELECT COUNT(*) as count FROM ranks')
    console.log(`  Total: ${totalResult.rows[0].count} ranks\n`)

    console.log('✅ Database initialization complete!')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
